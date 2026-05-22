#include <algorithm>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cctype>
#include <cstring>
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
#include <utility>
#include <vector>

#include <sys/stat.h>

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
    std::string historian_base_url = "http://127.0.0.1:8096";
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
    bool monitor_enabled = false;
    int monitor_interval_sec = 60;
    int monitor_timeout_sec = 10;
    std::string monitor_query = "SELECT 1";
};

struct HistorianField {
    std::string connection_id;
    std::string tag_name;
    std::string range = "1h";
    std::string statistic = "avg";
    std::string field_name;
    std::string description;
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
    std::unordered_map<std::string, std::string> tag_descriptions_by_key;
    std::unordered_map<std::string, std::vector<std::pair<std::string, std::string>>> tag_description_globs_by_conn;
    std::unordered_map<std::string, std::string> tag_output_names_by_key;
    std::unordered_map<std::string, std::vector<std::pair<std::string, std::string>>> tag_output_globs_by_conn;
    std::vector<HistorianField> historian_fields;
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

struct DataCheck {
    std::string id;
    std::string name;
    std::string database_id;
    bool enabled = false;
    std::string on_calendar;
    std::string query;
    int timeout_sec = 30;
    bool has_low_threshold = false;
    bool has_high_threshold = false;
    double low_threshold = 0.0;
    double high_threshold = 0.0;
};

struct DataCheckStatus {
    std::string id;
    bool enabled = false;
    bool running = false;
    bool supported_schedule = false;
    bool ok = false;
    bool below_low = false;
    bool above_high = false;
    long long last_run_ms = 0;
    long long next_run_ms = 0;
    long long runs_total = 0;
    long long failures_total = 0;
    int latency_ms = 0;
    std::string value;
    double numeric_value = 0.0;
    bool has_numeric_value = false;
    std::string last_error;
};

struct RunResult {
    bool ok = false;
    int inserted = 0;
    std::string error;
};

struct DbMonitorStatus {
    std::string id;
    bool enabled = false;
    bool running = false;
    bool ok = false;
    long long last_check_ms = 0;
    long long next_check_ms = 0;
    long long checks_total = 0;
    long long failures_total = 0;
    long long consecutive_failures = 0;
    int latency_ms = 0;
    std::string last_error;
};

struct DbTestResult {
    bool ok = false;
    int latency_ms = 0;
    std::string error;
};

struct DataCheckResult {
    bool ok = false;
    bool below_low = false;
    bool above_high = false;
    int latency_ms = 0;
    std::string value;
    double numeric_value = 0.0;
    bool has_numeric_value = false;
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

static std::string job_tag_description(const Job& job, const std::string& connection_id, const std::string& tag_name) {
    auto exact = job.tag_descriptions_by_key.find(make_tag_key(connection_id, tag_name));
    if (exact != job.tag_descriptions_by_key.end()) return exact->second;

    auto it = job.tag_description_globs_by_conn.find(connection_id);
    if (it == job.tag_description_globs_by_conn.end()) return "";
    for (const auto& pat : it->second) {
        if (glob_match(pat.first, tag_name)) return pat.second;
    }
    return "";
}

static std::string job_tag_output_name(const Job& job, const std::string& connection_id, const std::string& tag_name) {
    auto exact = job.tag_output_names_by_key.find(make_tag_key(connection_id, tag_name));
    if (exact != job.tag_output_names_by_key.end() && !exact->second.empty()) return exact->second;

    auto it = job.tag_output_globs_by_conn.find(connection_id);
    if (it == job.tag_output_globs_by_conn.end()) return tag_name;
    for (const auto& pat : it->second) {
        if (glob_match(pat.first, tag_name) && !pat.second.empty()) return pat.second;
    }
    return tag_name;
}

static bool job_has_live_tag_selection(const Job& job) {
    return job.log_all ||
           !job.tag_keys.empty() ||
           !job.tag_name_globs_by_conn.empty();
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

static void ensure_parent_dir(const std::string& file_path) {
    size_t pos = file_path.find_last_of('/');
    if (pos == std::string::npos || pos == 0) return;
    std::string dir = file_path.substr(0, pos);
    std::string cur;
    if (!dir.empty() && dir[0] == '/') cur = "/";
    std::stringstream ss(dir);
    std::string part;
    while (std::getline(ss, part, '/')) {
        if (part.empty()) continue;
        if (!cur.empty() && cur.back() != '/') cur += "/";
        cur += part;
        mkdir(cur.c_str(), 0750);
    }
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

static std::string curl_escape(CURL* curl, const std::string& value) {
    char* encoded = curl_easy_escape(curl, value.c_str(), static_cast<int>(value.size()));
    if (!encoded) return "";
    std::string out(encoded);
    curl_free(encoded);
    return out;
}

static bool fetch_historian_summary_json(const ServiceConfig& svc,
                                         const HistorianField& field,
                                         std::string& out_body,
                                         std::string& error) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        error = "curl_easy_init failed";
        return false;
    }

    std::string url = svc.historian_base_url;
    if (!url.empty() && url.back() == '/') url.pop_back();
    url += "/summary";
    url += "?connection_id=" + curl_escape(curl, field.connection_id);
    url += "&tag_name=" + curl_escape(curl, field.tag_name);
    url += "&range=" + curl_escape(curl, field.range.empty() ? "1h" : field.range);

    out_body.clear();
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curl_write_cb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &out_body);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        error = std::string("historian summary request failed: ") + curl_easy_strerror(res);
        curl_easy_cleanup(curl);
        return false;
    }

    long http_code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
    curl_easy_cleanup(curl);

    if (http_code != 200) {
        error = "HTTP historian /summary returned status " + std::to_string(http_code);
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
           "tag_description VARCHAR(255) NULL,"
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

static std::string sql_string_literal(MYSQL* conn, const std::string& val);

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

static bool ensure_table_column_exists(MYSQL* conn, const std::string& table, const std::string& column, const std::string& definition, std::string& error) {
    std::string query = "SHOW COLUMNS FROM `" + table + "` LIKE " + sql_string_literal(conn, column);
    if (mysql_query(conn, query.c_str()) != 0) {
        error = std::string("Failed to inspect table '") + table + "': " + mysql_error(conn);
        return false;
    }

    MYSQL_RES* res = mysql_store_result(conn);
    if (!res) {
        error = std::string("Failed to read column inspection for table '") + table + "': " + mysql_error(conn);
        return false;
    }
    const bool exists = mysql_num_rows(res) > 0;
    mysql_free_result(res);
    if (exists) return true;

    std::string alter = "ALTER TABLE `" + table + "` ADD COLUMN `" + column + "` " + definition;
    if (mysql_query(conn, alter.c_str()) != 0) {
        error = std::string("Failed to add column '") + column + "' to table '" + table + "': " + mysql_error(conn);
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

static std::string normalize_historian_statistic(std::string s);

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
            std::string tag_description = job_tag_description(job, connection_id, tag_name);
            std::string output_name = job_tag_output_name(job, connection_id, tag_name);

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
                              "(job_name, timestamp_ms, timestamp_dt, connection_id, tag_name, tag_description, datatype, "
                              "value_numeric, value_string, quality, created_at) VALUES (";
            sql += sql_string_literal(conn, job.name) + ", ";
            sql += std::to_string(timestamp_ms) + ", ";
            sql += sql_string_literal(conn, timestamp_dt) + ", ";
            sql += sql_string_literal(conn, connection_id) + ", ";
            sql += sql_string_literal(conn, output_name.empty() ? tag_name : output_name) + ", ";
            sql += tag_description.empty() ? "NULL, " : sql_string_literal(conn, tag_description) + ", ";
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

static int insert_historian_fields_for_job(MYSQL* conn, const ServiceConfig& svc, const Job& job, std::string& error) {
    int inserted = 0;
    const long long timestamp_ms = now_ms();
    const std::string timestamp_dt = epoch_ms_to_datetime(timestamp_ms);

    for (const auto& field : job.historian_fields) {
        std::string body;
        std::string fetch_error;
        if (!fetch_historian_summary_json(svc, field, body, fetch_error)) {
            error = fetch_error;
            continue;
        }

        try {
            json summary = json::parse(body);
            if (!summary.value("ok", false)) {
                error = summary.value("error", "Historian summary failed.");
                continue;
            }
            const std::string datatype = summary.contains("datatype") && summary["datatype"].is_string()
                ? summary["datatype"].get<std::string>()
                : std::string{};

            bool has_numeric = false;
            double value_numeric = 0.0;
            std::string value_string;
            bool has_string = false;

            const std::string stat = normalize_historian_statistic(field.statistic);
            if (summary.contains(stat) && !summary[stat].is_null()) {
                if (summary[stat].is_number()) {
                    value_numeric = summary[stat].get<double>();
                    has_numeric = true;
                } else {
                    value_string = summary[stat].dump();
                    has_string = true;
                }
            } else {
                value_string = "No samples yet";
                has_string = true;
            }

            std::string description = field.description;
            if (description.empty()) {
                description = field.connection_id + ":" + field.tag_name + " " + stat + " over " + field.range;
            }

            std::string sql = "INSERT INTO `" + job.table + "` "
                              "(job_name, timestamp_ms, timestamp_dt, connection_id, tag_name, tag_description, datatype, "
                              "value_numeric, value_string, quality, created_at) VALUES (";
            sql += sql_string_literal(conn, job.name) + ", ";
            sql += std::to_string(timestamp_ms) + ", ";
            sql += sql_string_literal(conn, timestamp_dt) + ", ";
            sql += sql_string_literal(conn, field.connection_id) + ", ";
            sql += sql_string_literal(conn, field.field_name.empty() ? (field.tag_name + "_" + stat) : field.field_name) + ", ";
            sql += sql_string_literal(conn, description) + ", ";
            sql += datatype.empty() ? "NULL, " : sql_string_literal(conn, datatype) + ", ";
            sql += has_numeric ? std::to_string(value_numeric) + ", " : "NULL, ";
            sql += has_string ? sql_string_literal(conn, value_string) + ", " : "NULL, ";
            sql += has_numeric ? "1, " : "0, ";
            sql += "CURRENT_TIMESTAMP);";

            if (mysql_query(conn, sql.c_str()) != 0) {
                error = std::string("MySQL insert error: ") + mysql_error(conn);
            } else {
                ++inserted;
            }
        } catch (const std::exception& ex) {
            error = std::string("Error processing historian summary JSON: ") + ex.what();
        }
    }

    return inserted;
}

static bool parse_job_tags(const json& tags, Job& job, std::string& error) {
    job.log_all = false;
    job.tag_keys.clear();
    job.tag_name_globs_by_conn.clear();
    job.tag_descriptions_by_key.clear();
    job.tag_description_globs_by_conn.clear();
    job.tag_output_names_by_key.clear();
    job.tag_output_globs_by_conn.clear();

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
        std::string description;
        std::string output_name;
        if (t.is_string()) {
            std::string s = t.get<std::string>();
            size_t pos = s.find(':');
            if (pos == std::string::npos) continue;
            conn = s.substr(0, pos);
            name = s.substr(pos + 1);
        } else if (t.is_object()) {
            conn = t.value("connection_id", "");
            name = t.value("name", "");
            description = t.value("description", "");
            output_name = t.value("field_name", t.value("output_field", t.value("output_name", "")));
        }
        if (conn.empty() || name.empty()) continue;
        if (has_glob_chars(name)) {
            job.tag_name_globs_by_conn[conn].push_back(name);
            if (!description.empty()) job.tag_description_globs_by_conn[conn].push_back({ name, description });
            if (!output_name.empty()) job.tag_output_globs_by_conn[conn].push_back({ name, output_name });
        } else {
            const std::string key = make_tag_key(conn, name);
            job.tag_keys.insert(key);
            if (!description.empty()) job.tag_descriptions_by_key[key] = description;
            if (!output_name.empty()) job.tag_output_names_by_key[key] = output_name;
        }
    }
    return true;
}

static std::string normalize_historian_statistic(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    if (s == "last" || s == "min" || s == "max" || s == "avg" || s == "twa" || s == "count") return s;
    return "avg";
}

static bool parse_historian_fields(const json& fields, Job& job, std::string& error) {
    job.historian_fields.clear();
    if (fields.is_null()) return true;
    if (!fields.is_array()) {
        error = "historian_fields must be an array.";
        return false;
    }
    for (const auto& f : fields) {
        if (!f.is_object()) continue;
        HistorianField field;
        field.connection_id = f.value("connection_id", "");
        field.tag_name = f.value("tag_name", f.value("name", ""));
        field.range = f.value("range", field.range);
        field.statistic = normalize_historian_statistic(f.value("statistic", field.statistic));
        field.field_name = f.value("field_name", f.value("output_field", f.value("output_name", "")));
        field.description = f.value("description", "");
        if (field.field_name.empty()) {
            field.field_name = field.tag_name + "_" + field.statistic + "_" + field.range;
        }
        if (field.connection_id.empty() || field.tag_name.empty() || field.range.empty()) continue;
        job.historian_fields.push_back(std::move(field));
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
    ReporterService(std::string config_path,
                    std::string databases_path,
                    std::string reports_path,
                    std::string data_checks_path,
                    std::string state_path)
        : config_path_(std::move(config_path)),
          databases_path_(std::move(databases_path)),
          reports_path_(std::move(reports_path)),
          data_checks_path_(std::move(data_checks_path)),
          state_path_(std::move(state_path)) {}

    void load_runtime_state() {
        if (state_path_.empty()) return;
        json root = read_json_or_object(state_path_);
        std::map<std::string, JobStatus> loaded;
        for (const auto& s : object_array_or_empty(root, "statuses")) {
            if (!s.is_object()) continue;
            JobStatus st;
            st.id = s.value("id", "");
            if (st.id.empty()) continue;
            st.enabled = s.value("enabled", false);
            st.running = false;
            st.supported_schedule = s.value("supported_schedule", false);
            st.last_run_ms = s.value("last_run_ms", 0LL);
            st.next_run_ms = 0;
            st.runs_total = s.value("runs_total", 0LL);
            st.failures_total = s.value("failures_total", 0LL);
            st.last_inserted = s.value("last_inserted", 0);
            st.last_error = s.value("last_error", "");
            loaded[st.id] = st;
        }
        std::lock_guard<std::mutex> lock(mu_);
        statuses_ = std::move(loaded);
        last_state_load_ms_ = now_ms();
    }

    bool reload(std::string& error) {
        ServiceConfig next_svc;
        json svc_json = read_json_or_object(config_path_);
        next_svc.listen_host = svc_json.value("listen_host", next_svc.listen_host);
        next_svc.listen_port = svc_json.value("listen_port", next_svc.listen_port);
        std::string svc_opcbridge_base_url = trim(svc_json.value("opcbridge_base_url", next_svc.opcbridge_base_url));
        if (!svc_opcbridge_base_url.empty()) {
            next_svc.opcbridge_base_url = svc_opcbridge_base_url;
        }
        std::string svc_historian_base_url = trim(svc_json.value("historian_base_url", next_svc.historian_base_url));
        if (!svc_historian_base_url.empty()) {
            next_svc.historian_base_url = svc_historian_base_url;
        }

        std::map<std::string, DbConfig> next_dbs;
        json db_root = read_json_or_object(databases_path_);
        for (const auto& d : object_array_or_empty(db_root, "databases")) {
            if (!d.is_object()) continue;
            DbConfig db;
            db.id = d.value("id", "");
            db.type = d.value("type", "mysql");
            db.opcbridge_base_url = trim(d.value("opcbridge_base_url", ""));
            db.mysql_host = d.value("mysql_host", "localhost");
            db.mysql_port = d.value("mysql_port", 3306u);
            db.mysql_user = d.value("mysql_user", "");
            db.mysql_password = d.value("mysql_password", "");
            db.mysql_database = d.value("mysql_database", "");
            db.monitor_enabled = d.value("monitor_enabled", false);
            db.monitor_interval_sec = std::max(5, d.value("monitor_interval_sec", 60));
            db.monitor_timeout_sec = std::max(1, d.value("monitor_timeout_sec", 10));
            db.monitor_query = d.value("monitor_query", "SELECT 1");
            if (db.monitor_query.empty()) db.monitor_query = "SELECT 1";
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
            if (job.name.empty() ||
                !parse_job_tags(r.value("tags", json::array()), job, parse_error) ||
                !parse_historian_fields(r.value("historian_fields", json::array()), job, parse_error)) continue;

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

        std::map<std::string, DataCheck> next_checks;
        std::map<std::string, DataCheckStatus> next_check_status;
        json check_root = read_json_or_object(data_checks_path_);
        for (const auto& c : object_array_or_empty(check_root, "data_checks")) {
            if (!c.is_object()) continue;
            DataCheck check;
            check.id = c.value("id", "");
            check.name = c.value("name", "");
            check.database_id = c.value("database_id", "");
            check.enabled = c.value("enabled", false);
            check.on_calendar = object_value_or_empty(c, "schedule").value("on_calendar", "");
            check.query = c.value("query", "");
            check.timeout_sec = std::max(1, c.value("timeout_sec", 30));
            if (c.contains("low_threshold") && c["low_threshold"].is_number()) {
                check.has_low_threshold = true;
                check.low_threshold = c["low_threshold"].get<double>();
            }
            if (c.contains("high_threshold") && c["high_threshold"].is_number()) {
                check.has_high_threshold = true;
                check.high_threshold = c["high_threshold"].get<double>();
            }
            if (check.id.empty() || check.database_id.empty() || check.query.empty()) continue;

            bool supported = false;
            long long next_run = next_from_calendar(check.on_calendar, now_ms(), supported);
            next_checks[check.id] = check;

            DataCheckStatus st;
            {
                std::lock_guard<std::mutex> lock(mu_);
                auto old = data_check_statuses_.find(check.id);
                if (old != data_check_statuses_.end()) st = old->second;
            }
            st.id = check.id;
            st.enabled = check.enabled;
            st.supported_schedule = supported;
            st.next_run_ms = (check.enabled && supported) ? next_run : 0;
            if (check.enabled && !supported) st.last_error = "Unsupported schedule: " + check.on_calendar;
            next_check_status[check.id] = st;
        }

        {
            std::lock_guard<std::mutex> lock(mu_);
            svc_ = next_svc;
            dbs_ = std::move(next_dbs);
            jobs_ = std::move(next_jobs);
            statuses_ = std::move(next_status);
            data_checks_ = std::move(next_checks);
            data_check_statuses_ = std::move(next_check_status);
            reconcile_monitor_statuses_locked();
            last_reload_ms_ = now_ms();
        }
        save_runtime_state();
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
            {"last_state_load_ms", last_state_load_ms_},
            {"state_path", state_path_},
            {"databases", dbs_.size()},
            {"jobs", jobs_.size()},
            {"data_checks", data_checks_.size()},
            {"statuses", statuses_json_locked()},
            {"database_statuses", database_statuses_json_locked()},
            {"data_check_statuses", data_check_statuses_json_locked()}
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
            finish_job_with_save(job.name, result);
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

        DbTestResult result = test_database_config(db);
        return {
            {"ok", result.ok},
            {"id", id},
            {"type", db.type},
            {"latency_ms", result.latency_ms},
            {"error", result.error}
        };
    }

    json test_database_config_json(const json& d) {
        if (!d.is_object()) {
            return {{"ok", false}, {"error", "Invalid JSON body; expected database object"}};
        }
        DbConfig db;
        db.id = d.value("id", "");
        db.type = d.value("type", "mysql");
        db.opcbridge_base_url = trim(d.value("opcbridge_base_url", ""));
        db.mysql_host = d.value("mysql_host", "localhost");
        db.mysql_port = d.value("mysql_port", 3306u);
        db.mysql_user = d.value("mysql_user", "");
        db.mysql_password = d.value("mysql_password", "");
        db.mysql_database = d.value("mysql_database", "");
        db.monitor_enabled = d.value("monitor_enabled", false);
        db.monitor_interval_sec = std::max(5, d.value("monitor_interval_sec", 60));
        db.monitor_timeout_sec = std::max(1, d.value("monitor_timeout_sec", 10));
        db.monitor_query = d.value("monitor_query", "SELECT 1");
        if (db.monitor_query.empty()) db.monitor_query = "SELECT 1";

        DbTestResult result = test_database_config(db);
        return {
            {"ok", result.ok},
            {"id", db.id},
            {"type", db.type},
            {"latency_ms", result.latency_ms},
            {"error", result.error}
        };
    }

    bool run_data_check_async(const std::string& id, std::string& error) {
        DataCheck check;
        DbConfig db;
        {
            std::lock_guard<std::mutex> lock(mu_);
            auto cit = data_checks_.find(id);
            if (cit == data_checks_.end()) {
                error = "Data check not found: " + id;
                return false;
            }
            auto dit = dbs_.find(cit->second.database_id);
            if (dit == dbs_.end()) {
                error = "Database not found: " + cit->second.database_id;
                return false;
            }
            auto& st = data_check_statuses_[id];
            if (st.running) {
                error = "Data check is already running: " + id;
                return false;
            }
            st.running = true;
            st.last_error.clear();
            check = cit->second;
            db = dit->second;
        }

        std::thread([this, check, db]() {
            DataCheckResult result = run_data_check(check, db);
            finish_data_check(check.id, result);
        }).detach();
        return true;
    }

    json test_data_check(const std::string& id) {
        DataCheck check;
        DbConfig db;
        {
            std::lock_guard<std::mutex> lock(mu_);
            auto cit = data_checks_.find(id);
            if (cit == data_checks_.end()) {
                return {{"ok", false}, {"id", id}, {"error", "Data check not found: " + id}};
            }
            auto dit = dbs_.find(cit->second.database_id);
            if (dit == dbs_.end()) {
                return {{"ok", false}, {"id", id}, {"error", "Database not found: " + cit->second.database_id}};
            }
            check = cit->second;
            db = dit->second;
        }

        DataCheckResult result = run_data_check(check, db);
        return data_check_result_json(id, result);
    }

private:
    void reconcile_monitor_statuses_locked() {
        std::map<std::string, DbMonitorStatus> next;
        const long long n = now_ms();
        for (const auto& kv : dbs_) {
            const DbConfig& db = kv.second;
            DbMonitorStatus st;
            auto old = db_statuses_.find(db.id);
            if (old != db_statuses_.end()) st = old->second;
            st.id = db.id;
            st.enabled = db.monitor_enabled;
            if (!db.monitor_enabled) {
                st.running = false;
                st.next_check_ms = 0;
            } else if (st.next_check_ms <= 0) {
                st.next_check_ms = n + 1000;
            }
            next[db.id] = st;
        }
        db_statuses_ = std::move(next);
    }

    DbTestResult test_database_config(const DbConfig& db) const {
        DbTestResult result;
        const long long started = now_ms();
        if (db.type != "mysql") {
            result.error = "Database type not supported by reporter service yet: " + db.type;
            result.latency_ms = static_cast<int>(now_ms() - started);
            return result;
        }

        MYSQL* conn = mysql_init(nullptr);
        if (!conn) {
            result.error = "mysql_init failed";
            result.latency_ms = static_cast<int>(now_ms() - started);
            return result;
        }

        unsigned int timeout = static_cast<unsigned int>(std::max(1, db.monitor_timeout_sec));
        mysql_options(conn, MYSQL_OPT_CONNECT_TIMEOUT, &timeout);
        mysql_options(conn, MYSQL_OPT_READ_TIMEOUT, &timeout);
        mysql_options(conn, MYSQL_OPT_WRITE_TIMEOUT, &timeout);

        if (!mysql_real_connect(conn, db.mysql_host.c_str(), db.mysql_user.c_str(), db.mysql_password.c_str(),
                                db.mysql_database.c_str(), db.mysql_port, nullptr, 0)) {
            result.error = std::string("mysql_real_connect failed: ") + mysql_error(conn);
        } else if (mysql_query(conn, db.monitor_query.c_str()) != 0) {
            result.error = std::string("monitor query failed: ") + mysql_error(conn);
        } else {
            result.ok = true;
        }
        mysql_close(conn);
        result.latency_ms = static_cast<int>(now_ms() - started);
        return result;
    }

    void save_runtime_state() {
        if (state_path_.empty()) return;
        json root;
        {
            std::lock_guard<std::mutex> lock(mu_);
            json statuses = json::array();
            for (const auto& kv : statuses_) {
                JobStatus st = kv.second;
                st.running = false;
                statuses.push_back({
                    {"id", st.id},
                    {"enabled", st.enabled},
                    {"supported_schedule", st.supported_schedule},
                    {"last_run_ms", st.last_run_ms},
                    {"runs_total", st.runs_total},
                    {"failures_total", st.failures_total},
                    {"last_inserted", st.last_inserted},
                    {"last_error", st.last_error}
                });
            }
            root = {
                {"version", 1},
                {"updated_ms", now_ms()},
                {"statuses", statuses}
            };
        }

        try {
            ensure_parent_dir(state_path_);
            std::ofstream f(state_path_, std::ios::trunc);
            if (f) f << root.dump(2) << "\n";
        } catch (const std::exception& ex) {
            std::cerr << "Reporter: failed to save runtime state: " << ex.what() << "\n";
        }
    }

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

    json database_statuses_json_locked() const {
        json arr = json::array();
        for (const auto& kv : db_statuses_) {
            const auto& st = kv.second;
            arr.push_back({
                {"id", st.id},
                {"enabled", st.enabled},
                {"running", st.running},
                {"ok", st.ok},
                {"last_check_ms", st.last_check_ms},
                {"next_check_ms", st.next_check_ms},
                {"checks_total", st.checks_total},
                {"failures_total", st.failures_total},
                {"consecutive_failures", st.consecutive_failures},
                {"latency_ms", st.latency_ms},
                {"last_error", st.last_error}
            });
        }
        return arr;
    }

    json data_check_statuses_json_locked() const {
        json arr = json::array();
        for (const auto& kv : data_check_statuses_) {
            const auto& st = kv.second;
            arr.push_back({
                {"id", st.id},
                {"enabled", st.enabled},
                {"running", st.running},
                {"supported_schedule", st.supported_schedule},
                {"ok", st.ok},
                {"below_low", st.below_low},
                {"above_high", st.above_high},
                {"last_run_ms", st.last_run_ms},
                {"next_run_ms", st.next_run_ms},
                {"runs_total", st.runs_total},
                {"failures_total", st.failures_total},
                {"latency_ms", st.latency_ms},
                {"value", st.value},
                {"numeric_value", st.numeric_value},
                {"has_numeric_value", st.has_numeric_value},
                {"last_error", st.last_error}
            });
        }
        return arr;
    }

    json data_check_result_json(const std::string& id, const DataCheckResult& result) const {
        const bool alarm = !result.ok || result.below_low || result.above_high;
        std::string error = result.error;
        if (error.empty() && result.below_low) error = "Value is below low threshold";
        if (error.empty() && result.above_high) error = "Value is above high threshold";
        return {
            {"ok", result.ok},
            {"query_ok", result.ok},
            {"alarm", alarm},
            {"within_threshold", result.ok && !alarm},
            {"id", id},
            {"below_low", result.below_low},
            {"above_high", result.above_high},
            {"latency_ms", result.latency_ms},
            {"value", result.value},
            {"numeric_value", result.numeric_value},
            {"has_numeric_value", result.has_numeric_value},
            {"error", error}
        };
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
        if (!ensure_table_column_exists(conn, job.table, "tag_description", "VARCHAR(255) NULL AFTER `tag_name`", result.error)) {
            mysql_close(conn);
            return result;
        }

        if (job_has_live_tag_selection(job)) {
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
                    result.inserted += insert_tags_for_job(conn, resp["tags"], job, result.error);
                }
            } catch (const std::exception& ex) {
                result.error = std::string("Error parsing /tags JSON: ") + ex.what();
            }
        }

        if (result.error.empty() && !job.historian_fields.empty()) {
            result.inserted += insert_historian_fields_for_job(conn, svc, job, result.error);
        }
        result.ok = result.error.empty();

        mysql_close(conn);
        return result;
    }

    DataCheckResult run_data_check(const DataCheck& check, const DbConfig& db) {
        DataCheckResult result;
        const long long started = now_ms();
        if (db.type != "mysql") {
            result.error = "Database type not supported by reporter service yet: " + db.type;
            result.latency_ms = static_cast<int>(now_ms() - started);
            return result;
        }

        MYSQL* conn = mysql_init(nullptr);
        if (!conn) {
            result.error = "mysql_init failed";
            result.latency_ms = static_cast<int>(now_ms() - started);
            return result;
        }

        unsigned int timeout = static_cast<unsigned int>(std::max(1, check.timeout_sec));
        mysql_options(conn, MYSQL_OPT_CONNECT_TIMEOUT, &timeout);
        mysql_options(conn, MYSQL_OPT_READ_TIMEOUT, &timeout);
        mysql_options(conn, MYSQL_OPT_WRITE_TIMEOUT, &timeout);

        if (!mysql_real_connect(conn, db.mysql_host.c_str(), db.mysql_user.c_str(), db.mysql_password.c_str(),
                                db.mysql_database.c_str(), db.mysql_port, nullptr, 0)) {
            result.error = std::string("mysql_real_connect failed: ") + mysql_error(conn);
            mysql_close(conn);
            result.latency_ms = static_cast<int>(now_ms() - started);
            return result;
        }

        if (mysql_query(conn, check.query.c_str()) != 0) {
            result.error = std::string("data check query failed: ") + mysql_error(conn);
            mysql_close(conn);
            result.latency_ms = static_cast<int>(now_ms() - started);
            return result;
        }

        MYSQL_RES* res = mysql_store_result(conn);
        if (!res) {
            if (mysql_field_count(conn) == 0) {
                result.error = "data check query did not return a result set";
            } else {
                result.error = std::string("mysql_store_result failed: ") + mysql_error(conn);
            }
            mysql_close(conn);
            result.latency_ms = static_cast<int>(now_ms() - started);
            return result;
        }

        MYSQL_ROW row = mysql_fetch_row(res);
        if (!row || mysql_num_fields(res) < 1) {
            result.error = "data check query returned no rows";
            mysql_free_result(res);
            mysql_close(conn);
            result.latency_ms = static_cast<int>(now_ms() - started);
            return result;
        }

        unsigned long* lengths = mysql_fetch_lengths(res);
        if (row[0]) {
            result.value.assign(row[0], lengths ? lengths[0] : std::strlen(row[0]));
        } else {
            result.value.clear();
        }
        try {
            size_t idx = 0;
            double numeric = std::stod(result.value, &idx);
            if (idx == result.value.size()) {
                result.numeric_value = numeric;
                result.has_numeric_value = true;
                if (check.has_low_threshold && numeric < check.low_threshold) result.below_low = true;
                if (check.has_high_threshold && numeric > check.high_threshold) result.above_high = true;
            }
        } catch (...) {
            result.has_numeric_value = false;
        }

        mysql_free_result(res);
        mysql_close(conn);
        result.ok = true;
        result.latency_ms = static_cast<int>(now_ms() - started);
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

    void finish_job_with_save(const std::string& id, const RunResult& result) {
        finish_job(id, result);
        save_runtime_state();
    }

    void finish_data_check(const std::string& id, const DataCheckResult& result) {
        std::lock_guard<std::mutex> lock(mu_);
        auto& st = data_check_statuses_[id];
        st.id = id;
        st.running = false;
        st.last_run_ms = now_ms();
        st.runs_total++;
        st.ok = result.ok && !result.below_low && !result.above_high;
        st.below_low = result.below_low;
        st.above_high = result.above_high;
        st.latency_ms = result.latency_ms;
        if (result.ok) {
            st.value = result.value;
            st.has_numeric_value = result.has_numeric_value;
            if (result.has_numeric_value) {
                st.numeric_value = result.numeric_value;
            }
        }
        if (!result.ok) {
            st.failures_total++;
            st.last_error = result.error;
        } else if (result.below_low) {
            st.failures_total++;
            st.last_error = "Value is below low threshold";
        } else if (result.above_high) {
            st.failures_total++;
            st.last_error = "Value is above high threshold";
        } else {
            st.last_error.clear();
        }

        auto cit = data_checks_.find(id);
        if (cit != data_checks_.end()) {
            bool supported = false;
            long long next = next_from_calendar(cit->second.on_calendar, st.last_run_ms, supported);
            st.enabled = cit->second.enabled;
            st.supported_schedule = supported;
            st.next_run_ms = (cit->second.enabled && supported) ? next : 0;
        }
    }

    void finish_database_monitor(const std::string& id, const DbTestResult& result) {
        std::lock_guard<std::mutex> lock(mu_);
        auto dbIt = dbs_.find(id);
        auto& st = db_statuses_[id];
        st.id = id;
        st.enabled = (dbIt != dbs_.end()) ? dbIt->second.monitor_enabled : false;
        st.running = false;
        st.ok = result.ok;
        st.last_check_ms = now_ms();
        st.checks_total++;
        st.latency_ms = result.latency_ms;
        if (result.ok) {
            st.consecutive_failures = 0;
            st.last_error.clear();
        } else {
            st.failures_total++;
            st.consecutive_failures++;
            st.last_error = result.error;
        }
        if (dbIt != dbs_.end() && dbIt->second.monitor_enabled) {
            st.next_check_ms = st.last_check_ms + static_cast<long long>(std::max(5, dbIt->second.monitor_interval_sec)) * 1000LL;
        } else {
            st.next_check_ms = 0;
        }
    }

    bool run_database_monitor_async(const std::string& id) {
        DbConfig db;
        {
            std::lock_guard<std::mutex> lock(mu_);
            auto it = dbs_.find(id);
            if (it == dbs_.end() || !it->second.monitor_enabled) return false;
            auto& st = db_statuses_[id];
            if (st.running) return false;
            st.id = id;
            st.enabled = true;
            st.running = true;
            db = it->second;
        }
        std::thread([this, id, db]() {
            DbTestResult result = test_database_config(db);
            finish_database_monitor(id, result);
        }).detach();
        return true;
    }

    void scheduler_loop() {
        while (!stop_) {
            std::vector<std::string> due;
            std::vector<std::string> monitor_due;
            std::vector<std::string> data_check_due;
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
                for (auto& kv : dbs_) {
                    const DbConfig& db = kv.second;
                    auto& st = db_statuses_[db.id];
                    st.id = db.id;
                    st.enabled = db.monitor_enabled;
                    if (!db.monitor_enabled || st.running) continue;
                    if (st.next_check_ms <= 0) st.next_check_ms = n + 1000;
                    if (st.next_check_ms <= n) monitor_due.push_back(db.id);
                }
                for (auto& kv : data_checks_) {
                    auto& st = data_check_statuses_[kv.first];
                    st.id = kv.first;
                    st.enabled = kv.second.enabled;
                    if (!kv.second.enabled || st.running) continue;
                    if (st.next_run_ms <= 0) {
                        bool supported = false;
                        st.next_run_ms = next_from_calendar(kv.second.on_calendar, n, supported);
                        st.supported_schedule = supported;
                    }
                    if (st.supported_schedule && st.next_run_ms > 0 && st.next_run_ms <= n) data_check_due.push_back(kv.first);
                }
            }

            for (const auto& id : due) {
                std::string ignored;
                run_job_async(id, ignored);
            }
            for (const auto& id : monitor_due) {
                run_database_monitor_async(id);
            }
            for (const auto& id : data_check_due) {
                std::string ignored;
                run_data_check_async(id, ignored);
            }

            std::unique_lock<std::mutex> lock(wait_mu_);
            cv_.wait_for(lock, std::chrono::milliseconds(500), [this]() { return stop_.load(); });
        }
    }

    std::string config_path_;
    std::string databases_path_;
    std::string reports_path_;
    std::string data_checks_path_;
    std::string state_path_;

    mutable std::mutex mu_;
    ServiceConfig svc_;
    std::map<std::string, DbConfig> dbs_;
    std::map<std::string, Job> jobs_;
    std::map<std::string, JobStatus> statuses_;
    std::map<std::string, DataCheck> data_checks_;
    std::map<std::string, DataCheckStatus> data_check_statuses_;
    std::map<std::string, DbMonitorStatus> db_statuses_;
    long long last_reload_ms_ = 0;
    long long last_state_load_ms_ = 0;

    std::atomic<bool> stop_{false};
    std::condition_variable cv_;
    std::mutex wait_mu_;
    std::thread worker_;
};

static void print_usage(const char* argv0) {
    std::cout << "Usage: " << argv0 << " [--service] [--config path] [--databases path] [--reports path] [--data-checks path] [--state path] [--version]\n";
}

int main(int argc, char* argv[]) {
    std::string config_path = "/etc/opcbridge/reporter/config.json";
    std::string databases_path = "/etc/opcbridge/reporter/databases.json";
    std::string reports_path = "/etc/opcbridge/reporter/reports.json";
    std::string data_checks_path = "/etc/opcbridge/reporter/data_checks.json";
    std::string state_path = "/var/lib/opcbridge/reporter/runtime_state.json";

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
        else if (arg == "--data-checks" && i + 1 < argc) data_checks_path = argv[++i];
        else if (arg == "--state" && i + 1 < argc) state_path = argv[++i];
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

    ReporterService service(config_path, databases_path, reports_path, data_checks_path, state_path);
    std::string error;
    service.load_runtime_state();
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
    server.Get("/databases/status", [&service](const httplib::Request&, httplib::Response& res) {
        json h = service.health_json();
        res.set_content(json{{"ok", true}, {"databases", h["database_statuses"]}}.dump(2), "application/json");
    });
    server.Get("/data-checks/status", [&service](const httplib::Request&, httplib::Response& res) {
        json h = service.health_json();
        res.set_content(json{{"ok", true}, {"data_checks", h["data_check_statuses"]}}.dump(2), "application/json");
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
    server.Post("/databases/test-config", [&service](const httplib::Request& req, httplib::Response& res) {
        json body = json::object();
        try {
            body = json::parse(req.body.empty() ? "{}" : req.body);
        } catch (const std::exception& ex) {
            res.status = 400;
            res.set_content(json{{"ok", false}, {"error", std::string("Invalid JSON: ") + ex.what()}}.dump(2), "application/json");
            return;
        }
        json incoming = body.contains("database") ? body["database"] : body;
        json result = service.test_database_config_json(incoming);
        res.status = result.value("ok", false) ? 200 : 400;
        res.set_content(result.dump(2), "application/json");
    });
    server.Post(R"(/data-checks/([^/]+)/run)", [&service](const httplib::Request& req, httplib::Response& res) {
        std::string id = req.matches[1];
        std::string run_error;
        bool ok = service.run_data_check_async(id, run_error);
        res.status = ok ? 202 : 400;
        res.set_content(json{{"ok", ok}, {"id", id}, {"error", run_error}}.dump(2), "application/json");
    });
    server.Post(R"(/data-checks/([^/]+)/test)", [&service](const httplib::Request& req, httplib::Response& res) {
        std::string id = req.matches[1];
        json result = service.test_data_check(id);
        res.status = result.value("query_ok", false) ? 200 : 400;
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
