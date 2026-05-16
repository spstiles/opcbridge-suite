#include <algorithm>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <ctime>
#include <fstream>
#include <iostream>
#include <map>
#include <mutex>
#include <sstream>
#include <string>
#include <thread>
#include <unordered_map>
#include <unordered_set>
#include <vector>

#include <curl/curl.h>
#include <mysql/mysql.h>

#include <nlohmann/json.hpp>
#include "httplib.h"

using json = nlohmann::json;

#ifndef OPCBRIDGE_REPORTER_VERSION
#define OPCBRIDGE_REPORTER_VERSION "dev"
#endif
#ifndef OPCBRIDGE_SUITE_VERSION
#define OPCBRIDGE_SUITE_VERSION "dev"
#endif

static const char TAG_KEY_SEP = '\x1F';

struct ServiceConfig {
    std::string listen_host = "127.0.0.1";
    int listen_port = 8095;
    std::string opcbridge_base_url = "http://127.0.0.1:8080";
};

struct DbConfig {
    std::string id;
    std::string type = "mysql";
    std::string opcbridge_base_url;
    std::string mysql_host = "localhost";
    unsigned int mysql_port = 3306;
    std::string mysql_user;
    std::string mysql_password;
    std::string mysql_database;
};

struct Job {
    std::string name;
    std::string database_id;
    std::string table = "tag_log";
    bool enabled = false;
    bool log_all = false;
    std::string on_calendar;
    std::unordered_set<std::string> tag_keys;
    std::unordered_map<std::string, std::vector<std::string>> tag_name_globs_by_conn;
};

struct JobStatus {
    std::string id;
    bool enabled = false;
    bool running = false;
    bool supported_schedule = false;
    long long last_run_ms = 0;
    long long next_run_ms = 0;
    long long runs_total = 0;
    long long failures_total = 0;
    int last_inserted = 0;
    std::string last_error;
};

struct RunResult {
    bool ok = false;
    int inserted = 0;
    std::string error;
};

using TableSqlMap = std::unordered_map<std::string, std::string>;

static std::string make_tag_key(const std::string& conn, const std::string& name) {
    return conn + TAG_KEY_SEP + name;
}

static long long now_ms() {
    using namespace std::chrono;
    return duration_cast<milliseconds>(system_clock::now().time_since_epoch()).count();
}

static bool has_glob_chars(const std::string& s) {
    return (s.find('*') != std::string::npos) || (s.find('?') != std::string::npos);
}

static bool glob_match(const std::string& pattern, const std::string& text) {
    size_t p = 0;
    size_t t = 0;
    size_t star = std::string::npos;
    size_t match = 0;

    while (t < text.size()) {
        if (p < pattern.size() && (pattern[p] == '?' || pattern[p] == text[t])) {
            ++p;
            ++t;
            continue;
        }
        if (p < pattern.size() && pattern[p] == '*') {
            star = p++;
            match = t;
            continue;
        }
        if (star != std::string::npos) {
            p = star + 1;
            ++match;
            t = match;
            continue;
        }
        return false;
    }

    while (p < pattern.size() && pattern[p] == '*') ++p;
    return p == pattern.size();
}

static bool job_includes_tag(const Job& job, const std::string& connection_id, const std::string& tag_name) {
    if (job.log_all) return true;
    if (job.tag_keys.find(make_tag_key(connection_id, tag_name)) != job.tag_keys.end()) return true;

    auto it = job.tag_name_globs_by_conn.find(connection_id);
    if (it == job.tag_name_globs_by_conn.end()) return false;
    for (const auto& pat : it->second) {
        if (glob_match(pat, tag_name)) return true;
    }
    return false;
}

static std::string trim(std::string s) {
    auto not_space = [](unsigned char c) { return !std::isspace(c); };
    s.erase(s.begin(), std::find_if(s.begin(), s.end(), not_space));
    s.erase(std::find_if(s.rbegin(), s.rend(), not_space).base(), s.end());
    return s;
}

static std::string epoch_ms_to_datetime(long long ms) {
    time_t sec = static_cast<time_t>(ms / 1000);
    std::tm tm{};
#if defined(_WIN32)
    localtime_s(&tm, &sec);
#else
    localtime_r(&sec, &tm);
#endif
    char buf[20];
    std::strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &tm);
    return std::string(buf);
}

static std::string load_file_strip_comments(const std::string& path) {
    std::ifstream f(path);
    if (!f) {
        throw std::runtime_error("Failed to open file: " + path);
    }

    std::string input((std::istreambuf_iterator<char>(f)), std::istreambuf_iterator<char>());
    std::string out;
    out.reserve(input.size());

    enum class State { Normal, Slash, LineComment, BlockComment, BlockCommentStar, InString, InStringEscape };
    State state = State::Normal;

    for (char c : input) {
        switch (state) {
        case State::Normal:
            if (c == '"') {
                out.push_back(c);
                state = State::InString;
            } else if (c == '/') {
                state = State::Slash;
            } else {
                out.push_back(c);
            }
            break;
        case State::Slash:
            if (c == '/') state = State::LineComment;
            else if (c == '*') state = State::BlockComment;
            else {
                out.push_back('/');
                out.push_back(c);
                state = State::Normal;
            }
            break;
        case State::LineComment:
            if (c == '\n') {
                out.push_back('\n');
                state = State::Normal;
            }
            break;
        case State::BlockComment:
            if (c == '*') state = State::BlockCommentStar;
            break;
        case State::BlockCommentStar:
            if (c == '/') state = State::Normal;
            else if (c != '*') state = State::BlockComment;
            break;
        case State::InString:
            out.push_back(c);
            if (c == '\\') state = State::InStringEscape;
            else if (c == '"') state = State::Normal;
            break;
        case State::InStringEscape:
            out.push_back(c);
            state = State::InString;
            break;
        }
    }

    if (state == State::Slash) out.push_back('/');
    return out;
}

static json read_json_or_object(const std::string& path) {
    try {
        std::string text = load_file_strip_comments(path);
        json parsed = json::parse(text);
        return parsed.is_object() ? parsed : json::object();
    } catch (const std::exception& ex) {
        std::cerr << "Reporter: " << ex.what() << "\n";
        return json::object();
    }
}

static json object_array_or_empty(const json& root, const std::string& key) {
    if (!root.is_object() || !root.contains(key) || !root[key].is_array()) return json::array();
    return root[key];
}

static json object_value_or_empty(const json& root, const std::string& key) {
    if (!root.is_object() || !root.contains(key) || !root[key].is_object()) return json::object();
    return root[key];
}

static size_t curl_write_cb(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t total = size * nmemb;
    std::string* s = static_cast<std::string*>(userp);
    s->append(static_cast<char*>(contents), total);
    return total;
}

static bool fetch_tags_json(const DbConfig& cfg, const ServiceConfig& svc, std::string& out_body, std::string& error) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        error = "curl_easy_init failed";
        return false;
    }

    std::string url = cfg.opcbridge_base_url.empty() ? svc.opcbridge_base_url : cfg.opcbridge_base_url;
    if (!url.empty() && url.back() == '/') url.pop_back();
    url += "/tags";

    out_body.clear();
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curl_write_cb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &out_body);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 20L);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        error = std::string("curl_easy_perform failed: ") + curl_easy_strerror(res);
        curl_easy_cleanup(curl);
        return false;
    }

    long http_code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
    curl_easy_cleanup(curl);

    if (http_code != 200) {
        error = "HTTP /tags returned status " + std::to_string(http_code);
        return false;
    }
    return true;
}

static std::string default_table_sql(const std::string& table) {
    return "CREATE TABLE IF NOT EXISTS `" + table + "` ("
           "id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,"
           "job_name VARCHAR(64) NOT NULL,"
           "timestamp_ms BIGINT NOT NULL,"
           "timestamp_dt DATETIME NOT NULL,"
           "connection_id VARCHAR(64) NOT NULL,"
           "tag_name VARCHAR(128) NOT NULL,"
           "datatype VARCHAR(32) DEFAULT NULL,"
           "value_numeric DOUBLE NULL,"
           "value_string VARCHAR(255) NULL,"
           "quality TINYINT NULL,"
           "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,"
           "INDEX idx_job_time (job_name, timestamp_dt),"
           "INDEX idx_tag_time (tag_name, timestamp_dt),"
           "INDEX idx_conn_time (connection_id, timestamp_dt),"
           "INDEX idx_ts (timestamp_dt)"
           ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
}

static bool ensure_table_exists(MYSQL* conn, const std::string& table, const TableSqlMap& map, std::string& error) {
    std::string create_sql = default_table_sql(table);
    auto it = map.find(table);
    if (it != map.end()) create_sql = it->second;

    if (mysql_query(conn, create_sql.c_str()) != 0) {
        error = std::string("Failed to create/ensure table '") + table + "': " + mysql_error(conn);
        return false;
    }
    return true;
}

static std::string sql_string_literal(MYSQL* conn, const std::string& val) {
    std::string buf;
    buf.resize(val.size() * 2 + 1);
    unsigned long len = mysql_real_escape_string(conn, &buf[0], val.c_str(), val.size());
    buf.resize(len);
    return "'" + buf + "'";
}

static int insert_tags_for_job(MYSQL* conn, const json& tags, const Job& job, std::string& error) {
    if (!tags.is_array()) {
        error = "JSON 'tags' is not an array.";
        return 0;
    }

    int inserted = 0;
    for (const auto& t : tags) {
        try {
            if (!t.contains("connection_id") || !t.contains("name") || !t.contains("timestamp_ms")) continue;

            std::string connection_id = t["connection_id"].get<std::string>();
            std::string tag_name = t["name"].get<std::string>();
            if (!job_includes_tag(job, connection_id, tag_name)) continue;

            long long timestamp_ms = t["timestamp_ms"].get<long long>();
            std::string timestamp_dt = epoch_ms_to_datetime(timestamp_ms);

            std::string datatype;
            if (t.contains("datatype") && !t["datatype"].is_null()) datatype = t["datatype"].get<std::string>();

            int quality_val = 0;
            bool has_quality = false;
            if (t.contains("quality") && !t["quality"].is_null()) {
                quality_val = t["quality"].get<int>();
                has_quality = true;
            }

            double value_numeric = 0.0;
            bool has_numeric = false;
            std::string value_string;
            bool has_string = false;

            if (t.contains("value")) {
                const auto& v = t["value"];
                if (v.is_number()) {
                    value_numeric = v.get<double>();
                    has_numeric = true;
                } else if (v.is_boolean()) {
                    value_numeric = v.get<bool>() ? 1.0 : 0.0;
                    has_numeric = true;
                } else if (v.is_string()) {
                    std::string vs = v.get<std::string>();
                    try {
                        size_t idx = 0;
                        double n = std::stod(vs, &idx);
                        if (idx == vs.size()) {
                            value_numeric = n;
                            has_numeric = true;
                        } else {
                            value_string = vs;
                            has_string = true;
                        }
                    } catch (...) {
                        value_string = vs;
                        has_string = true;
                    }
                } else {
                    value_string = v.dump();
                    has_string = true;
                }
            }

            std::string sql = "INSERT INTO `" + job.table + "` "
                              "(job_name, timestamp_ms, timestamp_dt, connection_id, tag_name, datatype, "
                              "value_numeric, value_string, quality, created_at) VALUES (";
            sql += sql_string_literal(conn, job.name) + ", ";
            sql += std::to_string(timestamp_ms) + ", ";
            sql += sql_string_literal(conn, timestamp_dt) + ", ";
            sql += sql_string_literal(conn, connection_id) + ", ";
            sql += sql_string_literal(conn, tag_name) + ", ";
            sql += datatype.empty() ? "NULL, " : sql_string_literal(conn, datatype) + ", ";
            sql += has_numeric ? std::to_string(value_numeric) + ", " : "NULL, ";
            sql += has_string ? sql_string_literal(conn, value_string) + ", " : "NULL, ";
            sql += has_quality ? std::to_string(quality_val) + ", " : "NULL, ";
            sql += "CURRENT_TIMESTAMP);";

            if (mysql_query(conn, sql.c_str()) != 0) {
                error = std::string("MySQL insert error: ") + mysql_error(conn);
            } else {
                ++inserted;
            }
        } catch (const std::exception& ex) {
            error = std::string("Error processing tag JSON: ") + ex.what();
        }
    }
    return inserted;
}

static bool parse_job_tags(const json& tags, Job& job, std::string& error) {
    job.log_all = false;
    job.tag_keys.clear();
    job.tag_name_globs_by_conn.clear();

    if (tags.is_null()) {
        job.log_all = true;
        return true;
    }
    if (tags.is_string()) {
        std::string s = tags.get<std::string>();
        if (s == "ALL" || s == "all") {
            job.log_all = true;
            return true;
        }
        error = "Unknown tags string: " + s;
        return false;
    }
    if (!tags.is_array()) {
        error = "tags must be 'ALL' or an array.";
        return false;
    }

    for (const auto& t : tags) {
        std::string conn;
        std::string name;
        if (t.is_string()) {
            std::string s = t.get<std::string>();
            size_t pos = s.find(':');
            if (pos == std::string::npos) continue;
            conn = s.substr(0, pos);
            name = s.substr(pos + 1);
        } else if (t.is_object()) {
            conn = t.value("connection_id", "");
            name = t.value("name", "");
        }
        if (conn.empty() || name.empty()) continue;
        if (has_glob_chars(name)) job.tag_name_globs_by_conn[conn].push_back(name);
        else job.tag_keys.insert(make_tag_key(conn, name));
    }
    return true;
}

static long long next_from_calendar(const std::string& cal, long long after_ms, bool& supported) {
    supported = false;
    std::string s = trim(cal);
    if (s.empty()) return 0;

    std::time_t after_sec = static_cast<std::time_t>(after_ms / 1000 + 1);
    std::tm tm{};
    localtime_r(&after_sec, &tm);

    int every = 0;
    if (std::sscanf(s.c_str(), "*-*-* *:0/%d:00", &every) == 1 && every > 0 && every <= 1440) {
        supported = true;
        for (int i = 0; i < 1445; ++i) {
            std::tm cand = tm;
            cand.tm_sec = 0;
            cand.tm_min += i;
            std::time_t t = std::mktime(&cand);
            std::tm check{};
            localtime_r(&t, &check);
            if ((check.tm_min % every) == 0 && static_cast<long long>(t) * 1000LL > after_ms) return static_cast<long long>(t) * 1000LL;
        }
        return 0;
    }

    int minute = -1;
    int second = -1;
    if (std::sscanf(s.c_str(), "*-*-* *:%d:%d", &minute, &second) == 2 &&
        minute >= 0 && minute <= 59 && second >= 0 && second <= 59) {
        supported = true;
        for (int i = 0; i < 25; ++i) {
            std::tm cand = tm;
            cand.tm_min = minute;
            cand.tm_sec = second;
            cand.tm_hour += i;
            std::time_t t = std::mktime(&cand);
            if (static_cast<long long>(t) * 1000LL > after_ms) return static_cast<long long>(t) * 1000LL;
        }
        return 0;
    }

    int hour = -1;
    if (std::sscanf(s.c_str(), "*-*-* %d:%d:%d", &hour, &minute, &second) == 3 &&
        hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59) {
        supported = true;
        for (int i = 0; i < 3; ++i) {
            std::tm cand = tm;
            cand.tm_hour = hour;
            cand.tm_min = minute;
            cand.tm_sec = second;
            cand.tm_mday += i;
            std::time_t t = std::mktime(&cand);
            if (static_cast<long long>(t) * 1000LL > after_ms) return static_cast<long long>(t) * 1000LL;
        }
        return 0;
    }

    return 0;
}

class ReporterService {
public:
    ReporterService(std::string config_path, std::string databases_path, std::string reports_path)
        : config_path_(std::move(config_path)), databases_path_(std::move(databases_path)), reports_path_(std::move(reports_path)) {}

    bool reload(std::string& error) {
        ServiceConfig next_svc;
        json svc_json = read_json_or_object(config_path_);
        next_svc.listen_host = svc_json.value("listen_host", next_svc.listen_host);
        next_svc.listen_port = svc_json.value("listen_port", next_svc.listen_port);
        next_svc.opcbridge_base_url = svc_json.value("opcbridge_base_url", next_svc.opcbridge_base_url);

        std::map<std::string, DbConfig> next_dbs;
        json db_root = read_json_or_object(databases_path_);
        for (const auto& d : object_array_or_empty(db_root, "databases")) {
            if (!d.is_object()) continue;
            DbConfig db;
            db.id = d.value("id", "");
            db.type = d.value("type", "mysql");
            db.opcbridge_base_url = d.value("opcbridge_base_url", "");
            db.mysql_host = d.value("mysql_host", "localhost");
            db.mysql_port = d.value("mysql_port", 3306u);
            db.mysql_user = d.value("mysql_user", "");
            db.mysql_password = d.value("mysql_password", "");
            db.mysql_database = d.value("mysql_database", "");
            if (!db.id.empty()) next_dbs[db.id] = db;
        }

        std::map<std::string, Job> next_jobs;
        std::map<std::string, JobStatus> next_status;
        json report_root = read_json_or_object(reports_path_);
        for (const auto& r : object_array_or_empty(report_root, "reports")) {
            if (!r.is_object()) continue;
            Job job;
            job.name = r.value("id", "");
            job.database_id = r.value("database_id", "");
            job.table = r.value("table", "tag_log");
            job.enabled = r.value("enabled", false);
            job.on_calendar = object_value_or_empty(r, "schedule").value("on_calendar", "");
            std::string parse_error;
            if (job.name.empty() || !parse_job_tags(r.value("tags", json::array()), job, parse_error)) continue;

            bool supported = false;
            long long next_run = next_from_calendar(job.on_calendar, now_ms(), supported);
            next_jobs[job.name] = job;

            JobStatus st;
            {
                std::lock_guard<std::mutex> lock(mu_);
                auto old = statuses_.find(job.name);
                if (old != statuses_.end()) st = old->second;
            }
            st.id = job.name;
            st.enabled = job.enabled;
            st.supported_schedule = supported;
            st.next_run_ms = (job.enabled && supported) ? next_run : 0;
            if (job.enabled && !supported) st.last_error = "Unsupported schedule: " + job.on_calendar;
            next_status[job.name] = st;
        }

        {
            std::lock_guard<std::mutex> lock(mu_);
            svc_ = next_svc;
            dbs_ = std::move(next_dbs);
            jobs_ = std::move(next_jobs);
            statuses_ = std::move(next_status);
            last_reload_ms_ = now_ms();
        }
        cv_.notify_all();
        error.clear();
        return true;
    }

    ServiceConfig service_config() const {
        std::lock_guard<std::mutex> lock(mu_);
        return svc_;
    }

    json health_json() const {
        std::lock_guard<std::mutex> lock(mu_);
        return {
            {"ok", true},
            {"version", OPCBRIDGE_REPORTER_VERSION},
            {"suite_version", OPCBRIDGE_SUITE_VERSION},
            {"last_reload_ms", last_reload_ms_},
            {"databases", dbs_.size()},
            {"jobs", jobs_.size()},
            {"statuses", statuses_json_locked()}
        };
    }

    void request_stop() {
        stop_ = true;
        cv_.notify_all();
    }

    void start_scheduler() {
        worker_ = std::thread([this]() { scheduler_loop(); });
    }

    void join_scheduler() {
        if (worker_.joinable()) worker_.join();
    }

    bool run_job_async(const std::string& id, std::string& error) {
        Job job;
        DbConfig db;
        ServiceConfig svc;
        {
            std::lock_guard<std::mutex> lock(mu_);
            auto jit = jobs_.find(id);
            if (jit == jobs_.end()) {
                error = "Report not found: " + id;
                return false;
            }
            auto dit = dbs_.find(jit->second.database_id);
            if (dit == dbs_.end()) {
                error = "Database not found: " + jit->second.database_id;
                return false;
            }
            auto& st = statuses_[id];
            if (st.running) {
                error = "Report is already running: " + id;
                return false;
            }
            st.running = true;
            st.last_error.clear();
            job = jit->second;
            db = dit->second;
            svc = svc_;
        }

        std::thread([this, job, db, svc]() {
            RunResult result = run_job(job, db, svc);
            finish_job(job.name, result);
        }).detach();
        return true;
    }

    json test_database(const std::string& id) {
        DbConfig db;
        {
            std::lock_guard<std::mutex> lock(mu_);
            auto it = dbs_.find(id);
            if (it == dbs_.end()) {
                return {{"ok", false}, {"id", id}, {"error", "Database not found: " + id}};
            }
            db = it->second;
        }

        const long long started = now_ms();
        if (db.type != "mysql") {
            return {
                {"ok", false},
                {"id", id},
                {"type", db.type},
                {"latency_ms", now_ms() - started},
                {"error", "Database type not supported by reporter service yet: " + db.type}
            };
        }

        MYSQL* conn = mysql_init(nullptr);
        if (!conn) {
            return {{"ok", false}, {"id", id}, {"type", db.type}, {"error", "mysql_init failed"}};
        }

        bool ok = true;
        std::string error;
        if (!mysql_real_connect(conn, db.mysql_host.c_str(), db.mysql_user.c_str(), db.mysql_password.c_str(),
                                db.mysql_database.c_str(), db.mysql_port, nullptr, 0)) {
            ok = false;
            error = std::string("mysql_real_connect failed: ") + mysql_error(conn);
        } else if (mysql_query(conn, "SELECT 1") != 0) {
            ok = false;
            error = std::string("SELECT 1 failed: ") + mysql_error(conn);
        }
        mysql_close(conn);

        return {
            {"ok", ok},
            {"id", id},
            {"type", db.type},
            {"latency_ms", now_ms() - started},
            {"error", error}
        };
    }

private:
    json statuses_json_locked() const {
        json arr = json::array();
        for (const auto& kv : statuses_) {
            const auto& st = kv.second;
            arr.push_back({
                {"id", st.id},
                {"enabled", st.enabled},
                {"running", st.running},
                {"supported_schedule", st.supported_schedule},
                {"last_run_ms", st.last_run_ms},
                {"next_run_ms", st.next_run_ms},
                {"runs_total", st.runs_total},
                {"failures_total", st.failures_total},
                {"last_inserted", st.last_inserted},
                {"last_error", st.last_error}
            });
        }
        return arr;
    }

    RunResult run_job(const Job& job, const DbConfig& db, const ServiceConfig& svc) {
        RunResult result;
        if (db.type != "mysql") {
            result.error = "Database type not supported by reporter service yet: " + db.type;
            return result;
        }

        MYSQL* conn = mysql_init(nullptr);
        if (!conn) {
            result.error = "mysql_init failed";
            return result;
        }

        if (!mysql_real_connect(conn, db.mysql_host.c_str(), db.mysql_user.c_str(), db.mysql_password.c_str(),
                                db.mysql_database.c_str(), db.mysql_port, nullptr, 0)) {
            result.error = std::string("mysql_real_connect failed: ") + mysql_error(conn);
            mysql_close(conn);
            return result;
        }

        TableSqlMap table_sql_map;
        if (!ensure_table_exists(conn, job.table, table_sql_map, result.error)) {
            mysql_close(conn);
            return result;
        }

        std::string body;
        if (!fetch_tags_json(db, svc, body, result.error)) {
            mysql_close(conn);
            return result;
        }

        try {
            json resp = json::parse(body);
            if (!resp.contains("tags") || !resp["tags"].is_array()) {
                result.error = "Response JSON has no 'tags' array.";
            } else {
                result.inserted = insert_tags_for_job(conn, resp["tags"], job, result.error);
                result.ok = result.error.empty();
            }
        } catch (const std::exception& ex) {
            result.error = std::string("Error parsing /tags JSON: ") + ex.what();
        }

        mysql_close(conn);
        return result;
    }

    void finish_job(const std::string& id, const RunResult& result) {
        std::lock_guard<std::mutex> lock(mu_);
        auto& st = statuses_[id];
        st.id = id;
        st.running = false;
        st.last_run_ms = now_ms();
        st.runs_total++;
        st.last_inserted = result.inserted;
        if (!result.ok) {
            st.failures_total++;
            st.last_error = result.error;
        } else {
            st.last_error.clear();
        }

        auto jit = jobs_.find(id);
        if (jit != jobs_.end()) {
            bool supported = false;
            long long next = next_from_calendar(jit->second.on_calendar, st.last_run_ms, supported);
            st.supported_schedule = supported;
            st.next_run_ms = (jit->second.enabled && supported) ? next : 0;
        }
    }

    void scheduler_loop() {
        while (!stop_) {
            std::vector<std::string> due;
            long long n = now_ms();
            {
                std::lock_guard<std::mutex> lock(mu_);
                for (auto& kv : jobs_) {
                    auto& st = statuses_[kv.first];
                    st.id = kv.first;
                    st.enabled = kv.second.enabled;
                    if (!kv.second.enabled || st.running) continue;
                    if (st.next_run_ms <= 0) {
                        bool supported = false;
                        st.next_run_ms = next_from_calendar(kv.second.on_calendar, n, supported);
                        st.supported_schedule = supported;
                    }
                    if (st.supported_schedule && st.next_run_ms > 0 && st.next_run_ms <= n) due.push_back(kv.first);
                }
            }

            for (const auto& id : due) {
                std::string ignored;
                run_job_async(id, ignored);
            }

            std::unique_lock<std::mutex> lock(wait_mu_);
            cv_.wait_for(lock, std::chrono::milliseconds(500), [this]() { return stop_.load(); });
        }
    }

    std::string config_path_;
    std::string databases_path_;
    std::string reports_path_;

    mutable std::mutex mu_;
    ServiceConfig svc_;
    std::map<std::string, DbConfig> dbs_;
    std::map<std::string, Job> jobs_;
    std::map<std::string, JobStatus> statuses_;
    long long last_reload_ms_ = 0;

    std::atomic<bool> stop_{false};
    std::condition_variable cv_;
    std::mutex wait_mu_;
    std::thread worker_;
};

static void print_usage(const char* argv0) {
    std::cout << "Usage: " << argv0 << " [--service] [--config path] [--databases path] [--reports path] [--version]\n";
}

int main(int argc, char* argv[]) {
    std::string config_path = "/etc/opcbridge/reporter/config.json";
    std::string databases_path = "/etc/opcbridge/reporter/databases.json";
    std::string reports_path = "/etc/opcbridge/reporter/reports.json";

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--version" || arg == "-V") {
            std::cout << "opcbridge-reporter version " << OPCBRIDGE_REPORTER_VERSION
                      << " (suite " << OPCBRIDGE_SUITE_VERSION << ")"
                      << " (" << __DATE__ << " " << __TIME__ << ")\n";
            return 0;
        }
        if (arg == "--config" && i + 1 < argc) config_path = argv[++i];
        else if (arg == "--databases" && i + 1 < argc) databases_path = argv[++i];
        else if (arg == "--reports" && i + 1 < argc) reports_path = argv[++i];
        else if (arg == "--service") {}
        else if (arg == "--help" || arg == "-h") {
            print_usage(argv[0]);
            return 0;
        } else {
            std::cerr << "Unknown argument: " << arg << "\n";
            print_usage(argv[0]);
            return 1;
        }
    }

    curl_global_init(CURL_GLOBAL_DEFAULT);

    ReporterService service(config_path, databases_path, reports_path);
    std::string error;
    service.reload(error);
    ServiceConfig svc = service.service_config();

    httplib::Server server;
    server.Get("/health", [&service](const httplib::Request&, httplib::Response& res) {
        res.set_content(service.health_json().dump(2), "application/json");
    });
    server.Get("/jobs", [&service](const httplib::Request&, httplib::Response& res) {
        json h = service.health_json();
        res.set_content(json{{"ok", true}, {"jobs", h["statuses"]}}.dump(2), "application/json");
    });
    server.Post("/reload", [&service](const httplib::Request&, httplib::Response& res) {
        std::string reload_error;
        bool ok = service.reload(reload_error);
        res.status = ok ? 200 : 500;
        res.set_content(json{{"ok", ok}, {"error", reload_error}, {"health", service.health_json()}}.dump(2), "application/json");
    });
    server.Post(R"(/jobs/([^/]+)/run)", [&service](const httplib::Request& req, httplib::Response& res) {
        std::string id = req.matches[1];
        std::string run_error;
        bool ok = service.run_job_async(id, run_error);
        res.status = ok ? 202 : 400;
        res.set_content(json{{"ok", ok}, {"id", id}, {"error", run_error}}.dump(2), "application/json");
    });
    server.Post(R"(/databases/([^/]+)/test)", [&service](const httplib::Request& req, httplib::Response& res) {
        std::string id = req.matches[1];
        json result = service.test_database(id);
        res.status = result.value("ok", false) ? 200 : 400;
        res.set_content(result.dump(2), "application/json");
    });

    service.start_scheduler();
    std::cout << "opcbridge-reporter listening on " << svc.listen_host << ":" << svc.listen_port << "\n";
    bool listened = server.listen(svc.listen_host.c_str(), svc.listen_port);
    service.request_stop();
    service.join_scheduler();
    curl_global_cleanup();
    return listened ? 0 : 1;
}
