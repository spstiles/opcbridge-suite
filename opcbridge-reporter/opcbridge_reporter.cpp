#include <iostream>
#include <fstream>
#include <string>
#include <unordered_set>
#include <unordered_map>
#include <vector>
#include <ctime>

#include <curl/curl.h>
#include <mysql/mysql.h>

#include <nlohmann/json.hpp>

using json = nlohmann::json;

// Version info (wired in via Makefile)
#ifndef OPCBRIDGE_REPORTER_VERSION
#define OPCBRIDGE_REPORTER_VERSION "dev"
#endif
#ifndef OPCBRIDGE_SUITE_VERSION
#define OPCBRIDGE_SUITE_VERSION "dev"
#endif

struct Config {
    std::string opcbridge_base_url;
    std::string mysql_host;
    unsigned int mysql_port = 3306;
    std::string mysql_user;
    std::string mysql_password;
    std::string mysql_database;
};

struct Job {
    std::string name;
    std::string table;
    bool log_all = false;
    std::unordered_set<std::string> tag_keys; // "conn_id\x1Fname"
    std::unordered_map<std::string, std::vector<std::string>> tag_name_globs_by_conn;
};

using TableSqlMap = std::unordered_map<std::string, std::string>;

static const char TAG_KEY_SEP = '\x1F';

static std::string make_tag_key(const std::string& conn, const std::string& name) {
    return conn + TAG_KEY_SEP + name;
}

static bool has_glob_chars(const std::string& s) {
    return (s.find('*') != std::string::npos) || (s.find('?') != std::string::npos);
}

// Simple glob match supporting:
// - '*' any sequence (including empty)
// - '?' any single character
// Case-sensitive. No escaping.
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
    const std::string key = make_tag_key(connection_id, tag_name);
    if (job.tag_keys.find(key) != job.tag_keys.end()) return true;

    auto it = job.tag_name_globs_by_conn.find(connection_id);
    if (it == job.tag_name_globs_by_conn.end()) return false;
    const auto& globs = it->second;
    for (const auto& pat : globs) {
        if (glob_match(pat, tag_name)) return true;
    }
    return false;
}

// ---------------- Epoch ms -> DATETIME string (local time) ----------------
std::string epoch_ms_to_datetime(long long ms) {
    time_t sec = static_cast<time_t>(ms / 1000);
    std::tm tm{};
#if defined(_WIN32)
    localtime_s(&tm, &sec);
#else
    tm = *std::localtime(&sec);
#endif
    char buf[20];
    std::strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &tm);
    return std::string(buf);
}

// ---------------- Comment-stripping loader ----------------
// Allows // and /* */ comments in JSON, but preserves them inside string literals.
std::string load_file_strip_comments(const std::string& path) {
    std::ifstream f(path);
    if (!f) {
        throw std::runtime_error("Failed to open file: " + path);
    }

    std::string input((std::istreambuf_iterator<char>(f)),
                      std::istreambuf_iterator<char>());

    std::string out;
    out.reserve(input.size());

    enum class State {
        Normal,
        Slash,
        LineComment,
        BlockComment,
        BlockCommentStar,
        InString,
        InStringEscape
    };

    State state = State::Normal;

    for (size_t i = 0; i < input.size(); ++i) {
        char c = input[i];

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
            if (c == '/') {
                state = State::LineComment;
            } else if (c == '*') {
                state = State::BlockComment;
            } else {
                // it was just a single '/', not a comment
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
            // else: skip characters in line comment
            break;

        case State::BlockComment:
            if (c == '*') {
                state = State::BlockCommentStar;
            }
            // else: stay in block comment
            break;

        case State::BlockCommentStar:
            if (c == '/') {
                state = State::Normal; // end of block comment
            } else if (c != '*') {
                state = State::BlockComment;
            }
            // consecutive '*' keep us in BlockCommentStar
            break;

        case State::InString:
            out.push_back(c);
            if (c == '\\') {
                state = State::InStringEscape;
            } else if (c == '"') {
                state = State::Normal;
            }
            break;

        case State::InStringEscape:
            out.push_back(c);
            state = State::InString;
            break;
        }
    }

    // If we ended in Slash (a trailing '/'), emit it
    if (state == State::Slash) {
        out.push_back('/');
    }

    return out;
}

// ---------------- CURL write callback ----------------
static size_t curl_write_cb(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t total = size * nmemb;
    std::string* s = static_cast<std::string*>(userp);
    s->append(static_cast<char*>(contents), total);
    return total;
}

// ---------------- Load base config ----------------
bool load_base_config(const json& j, Config& cfg) {
    try {
        cfg.opcbridge_base_url = j.value("opcbridge_base_url", "http://127.0.0.1:8080");
        cfg.mysql_host         = j.value("mysql_host", "localhost");
        cfg.mysql_port         = j.value("mysql_port", 3306u);
        cfg.mysql_user         = j.value("mysql_user", "logger");
        cfg.mysql_password     = j.value("mysql_password", "");
        cfg.mysql_database     = j.value("mysql_database", "telemetry");
        return true;
    } catch (const std::exception& ex) {
        std::cerr << "Error loading base config: " << ex.what() << "\n";
        return false;
    }
}

// ---------------- Load job from config ----------------
bool load_job_config(const json& root, const std::string& job_name, Job& job) {
    if (!root.contains("jobs") || !root["jobs"].is_object()) {
        std::cerr << "Config has no 'jobs' object.\n";
        return false;
    }

    const auto& jobs = root["jobs"];
    if (!jobs.contains(job_name)) {
        std::cerr << "Job '" << job_name << "' not found in config.\n";
        return false;
    }

    const auto& jjob = jobs[job_name];

    job.name  = job_name;
    job.table = jjob.value("table", "tag_log");
    job.log_all = false;
    job.tag_keys.clear();
    job.tag_name_globs_by_conn.clear();

    if (jjob.contains("tags")) {
        const auto& tags = jjob["tags"];
        if (tags.is_string()) {
            std::string s = tags.get<std::string>();
            if (s == "ALL" || s == "all") {
                job.log_all = true;
            } else {
                std::cerr << "Job '" << job_name << "': unknown tags string: " << s << "\n";
                return false;
            }
        } else if (tags.is_array()) {
            for (const auto& t : tags) {
                // Supported forms:
                // - object: { "connection_id": "...", "name": "ExactOrGlob*" }
                // - string: "connection_id:ExactOrGlob*"
                std::string conn;
                std::string name;

                if (t.is_string()) {
                    const std::string s = t.get<std::string>();
                    const size_t pos = s.find(':');
                    if (pos == std::string::npos) {
                        std::cerr << "Job '" << job_name << "': tag string must be 'connection_id:name' (got '" << s << "').\n";
                        continue;
                    }
                    conn = s.substr(0, pos);
                    name = s.substr(pos + 1);
                } else if (t.is_object()) {
                    if (!t.contains("connection_id") || !t.contains("name") ||
                        !t["connection_id"].is_string() || !t["name"].is_string()) {
                        std::cerr << "Job '" << job_name << "': tag missing string connection_id or name.\n";
                        continue;
                    }
                    conn = t["connection_id"].get<std::string>();
                    name = t["name"].get<std::string>();
                } else {
                    std::cerr << "Job '" << job_name << "': tag entries must be objects or strings.\n";
                    continue;
                }

                if (conn.empty() || name.empty()) continue;

                if (has_glob_chars(name)) {
                    job.tag_name_globs_by_conn[conn].push_back(name);
                } else {
                    job.tag_keys.insert(make_tag_key(conn, name));
                }
            }
        } else {
            std::cerr << "Job '" << job_name << "': 'tags' must be 'ALL' or array.\n";
            return false;
        }
    } else {
        std::cerr << "Job '" << job_name << "' has no 'tags' field; defaulting to ALL.\n";
        job.log_all = true;
    }

    return true;
}

// ---------------- Load table CREATE SQL from config ----------------
void load_table_sql_map(const json& root, TableSqlMap& out) {
    out.clear();
    if (!root.contains("tables") || !root["tables"].is_object()) {
        return; // no explicit table definitions, we'll use defaults
    }

    const auto& tables = root["tables"];
    for (auto it = tables.begin(); it != tables.end(); ++it) {
        const std::string table_name = it.key();
        const auto& tdef = it.value();
        if (!tdef.is_object()) {
            std::cerr << "tables['" << table_name << "'] is not an object; skipping.\n";
            continue;
        }
        if (!tdef.contains("create_sql") || !tdef["create_sql"].is_string()) {
            std::cerr << "tables['" << table_name << "'] has no 'create_sql' string; skipping.\n";
            continue;
        }
        out[table_name] = tdef["create_sql"].get<std::string>();
    }
}

// ---------------- Default table schema (if not in config) ----------------
std::string default_table_sql(const std::string& table) {
    // Standard tag_log-like schema, parametrized by table name
    std::string sql = "CREATE TABLE IF NOT EXISTS `" + table + "` ("
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
    return sql;
}

// ---------------- Ensure table exists ----------------
bool ensure_table_exists(MYSQL* conn, const std::string& table, const TableSqlMap& map) {
    std::string create_sql;
    auto it = map.find(table);
    if (it != map.end()) {
        create_sql = it->second;
    } else {
        create_sql = default_table_sql(table);
    }

    if (mysql_query(conn, create_sql.c_str()) != 0) {
        std::cerr << "Failed to create/ensure table '" << table
                  << "': " << mysql_error(conn) << "\n";
        return false;
    }
    return true;
}

// ---------------- MySQL helpers ----------------
std::string sql_string_literal(MYSQL* conn, const std::string& val) {
    std::string buf;
    buf.resize(val.size() * 2 + 1);
    unsigned long len = mysql_real_escape_string(conn, &buf[0], val.c_str(), val.size());
    buf.resize(len);
    return "'" + buf + "'";
}

std::string sql_string_literal_or_null(MYSQL* conn, const std::string* val) {
    if (!val) return "NULL";
    return sql_string_literal(conn, *val);
}

// ---------------- Fetch /tags JSON from opcbridge ----------------
bool fetch_tags_json(const Config& cfg, std::string& out_body) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        std::cerr << "curl_easy_init failed\n";
        return false;
    }

    std::string url = cfg.opcbridge_base_url;
    if (!url.empty() && url.back() == '/') {
        url.pop_back();
    }
    url += "/tags";

    out_body.clear();

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curl_write_cb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &out_body);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        std::cerr << "curl_easy_perform failed: " << curl_easy_strerror(res) << "\n";
        curl_easy_cleanup(curl);
        return false;
    }

    long http_code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
    curl_easy_cleanup(curl);

    if (http_code != 200) {
        std::cerr << "HTTP /tags returned status " << http_code << "\n";
        return false;
    }

    return true;
}

// ---------------- Insert filtered tags into MySQL ----------------
void insert_tags_for_job(MYSQL* conn, const json& tags, const Job& job) {
    if (!tags.is_array()) {
        std::cerr << "JSON 'tags' is not an array.\n";
        return;
    }

    for (const auto& t : tags) {
        try {
            if (!t.contains("connection_id") || !t.contains("name") || !t.contains("timestamp_ms")) {
                continue;
            }

            std::string connection_id = t["connection_id"].get<std::string>();
            std::string tag_name      = t["name"].get<std::string>();

            // Filter by job tags if not logging ALL
            if (!job_includes_tag(job, connection_id, tag_name)) continue;

            long long timestamp_ms    = t["timestamp_ms"].get<long long>();
            std::string timestamp_dt  = epoch_ms_to_datetime(timestamp_ms);

            std::string datatype;
            if (t.contains("datatype") && !t["datatype"].is_null()) {
                datatype = t["datatype"].get<std::string>();
            }

            int quality_val = 0;
            bool has_quality = false;
            if (t.contains("quality") && !t["quality"].is_null()) {
                quality_val  = t["quality"].get<int>();
                has_quality  = true;
            }

            // Decide numeric vs string
            double value_numeric = 0.0;
            bool has_numeric = false;
            std::string value_string;
            bool has_string = false;

            if (t.contains("value")) {
                const auto& v = t["value"];
                if (v.is_number()) {
                    value_numeric = v.get<double>();
                    has_numeric   = true;
                } else if (v.is_boolean()) {
                    value_numeric = v.get<bool>() ? 1.0 : 0.0;
                    has_numeric   = true;
                } else if (v.is_string()) {
                    std::string vs = v.get<std::string>();
                    // Try numeric parse first
                    try {
                        size_t idx = 0;
                        double n = std::stod(vs, &idx);
                        if (idx == vs.size()) {
                            value_numeric = n;
                            has_numeric   = true;
                        } else {
                            value_string = vs;
                            has_string   = true;
                        }
                    } catch (...) {
                        value_string = vs;
                        has_string   = true;
                    }
                } else {
                    value_string = v.dump();
                    has_string   = true;
                }
            }

            // Build SQL
            // Expecting table: (job_name, timestamp_ms, timestamp_dt, connection_id, tag_name, datatype,
            //                   value_numeric, value_string, quality, created_at)
            std::string sql = "INSERT INTO " + job.table +
                              " (job_name, timestamp_ms, timestamp_dt, connection_id, tag_name, datatype, "
                              "value_numeric, value_string, quality, created_at) VALUES (";

            sql += sql_string_literal(conn, job.name) + ", ";
            sql += std::to_string(timestamp_ms) + ", ";
            sql += sql_string_literal(conn, timestamp_dt) + ", ";
            sql += sql_string_literal(conn, connection_id) + ", ";
            sql += sql_string_literal(conn, tag_name) + ", ";

            if (!datatype.empty()) {
                sql += sql_string_literal(conn, datatype) + ", ";
            } else {
                sql += "NULL, ";
            }

            if (has_numeric) {
                sql += std::to_string(value_numeric) + ", ";
            } else {
                sql += "NULL, ";
            }

            if (has_string) {
                sql += sql_string_literal(conn, value_string) + ", ";
            } else {
                sql += "NULL, ";
            }

            if (has_quality) {
                sql += std::to_string(quality_val) + ", ";
            } else {
                sql += "NULL, ";
            }

            sql += "CURRENT_TIMESTAMP);";

            if (mysql_query(conn, sql.c_str()) != 0) {
                std::cerr << "MySQL insert error: " << mysql_error(conn) << "\n";
            }
        } catch (const std::exception& ex) {
            std::cerr << "Error processing tag JSON: " << ex.what() << "\n";
        }
    }
}

// ---------------- Main ----------------
int main(int argc, char* argv[]) {
    std::string job_name;
    std::string config_path = "config.json";

    // Simple arg parsing
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--version" || arg == "-V") {
            std::cout << "opcbridge-reporter version " << OPCBRIDGE_REPORTER_VERSION
                      << " (suite " << OPCBRIDGE_SUITE_VERSION << ")"
                      << " (" << __DATE__ << " " << __TIME__ << ")\n";
            return 0;
        }
        if (arg == "--job" && i + 1 < argc) {
            job_name = argv[++i];
        } else if (arg == "--config" && i + 1 < argc) {
            config_path = argv[++i];
        } else if (arg == "--help" || arg == "-h") {
            std::cout << "Usage: " << argv[0] << " --job <name> [--config path] [--version]\n";
            return 0;
        }
    }

    if (job_name.empty()) {
        std::cerr << "Error: --job <name> is required.\n";
        std::cerr << "Usage: " << argv[0] << " --job <name> [--config path]\n";
        return 1;
    }

    // Load JSON config with comment support
    json root;
    try {
        std::string cfg_text = load_file_strip_comments(config_path);
        root = json::parse(cfg_text);
    } catch (const std::exception& ex) {
        std::cerr << "Error reading config: " << ex.what() << "\n";
        return 1;
    }

    Config cfg;
    if (!load_base_config(root, cfg)) {
        return 1;
    }

    Job job;
    if (!load_job_config(root, job_name, job)) {
        return 1;
    }

    TableSqlMap table_sql_map;
    load_table_sql_map(root, table_sql_map);

    // Init curl
    curl_global_init(CURL_GLOBAL_DEFAULT);

    // Init MySQL
    MYSQL* conn = mysql_init(nullptr);
    if (!conn) {
        std::cerr << "mysql_init failed\n";
        curl_global_cleanup();
        return 1;
    }

    if (!mysql_real_connect(conn,
                            cfg.mysql_host.c_str(),
                            cfg.mysql_user.c_str(),
                            cfg.mysql_password.c_str(),
                            cfg.mysql_database.c_str(),
                            cfg.mysql_port,
                            nullptr,
                            0)) {
        std::cerr << "mysql_real_connect failed: " << mysql_error(conn) << "\n";
        mysql_close(conn);
        curl_global_cleanup();
        return 1;
    }

    // Ensure the job's table exists (create if needed)
    if (!ensure_table_exists(conn, job.table, table_sql_map)) {
        std::cerr << "Failed to ensure table for job '" << job.name << "'.\n";
        mysql_close(conn);
        curl_global_cleanup();
        return 1;
    }

    std::cout << "Running job '" << job.name << "' using table '" << job.table << "'...\n";

    // Fetch /tags
    std::string body;
    if (!fetch_tags_json(cfg, body)) {
        std::cerr << "Failed to fetch /tags from opcbridge.\n";
        mysql_close(conn);
        curl_global_cleanup();
        return 1;
    }

    try {
        json resp = json::parse(body);
        if (!resp.contains("tags") || !resp["tags"].is_array()) {
            std::cerr << "Response JSON has no 'tags' array.\n";
        } else {
            insert_tags_for_job(conn, resp["tags"], job);
        }
    } catch (const std::exception& ex) {
        std::cerr << "Error parsing /tags JSON: " << ex.what() << "\n";
        mysql_close(conn);
        curl_global_cleanup();
        return 1;
    }

    mysql_close(conn);
    curl_global_cleanup();
    return 0;
}
