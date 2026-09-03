#include <atomic>
#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <mutex>
#include <optional>
#include <sstream>
#include <string>
#include <thread>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

#include <ixwebsocket/IXWebSocket.h>
#include <libpq-fe.h>
#include <nlohmann/json.hpp>

#include "../opcbridge/httplib.h"

#ifndef OPCBRIDGE_SUITE_VERSION
#define OPCBRIDGE_SUITE_VERSION "dev"
#endif

#ifndef OPCBRIDGE_HISTORIAN_VERSION
#define OPCBRIDGE_HISTORIAN_VERSION "dev"
#endif

using json = nlohmann::json;

namespace
{
struct ChangeOnlyCfg
{
    bool enabled = true;
    double deadband = 0.0;
    int64_t min_interval_ms = 250;
    int64_t max_interval_ms = 60000;
};

struct SnapshotCfg
{
    bool enabled = false;
    int64_t interval_ms = 60000;
};

struct PgCfg
{
    std::string conninfo;
    std::string table = "tag_samples";
    size_t batch_size = 500;
    int64_t flush_interval_ms = 250;
    size_t queue_limit = 50000;
};

struct HistorianTagRule
{
    std::string connection_id;
    std::string tag_name;
    bool enabled = true;
    int64_t interval_ms = 60000;
    std::string mode = "periodic";
    bool include_bad_quality = false;
    double deadband = 0.0;
    bool deadband_override = false;
    int64_t next_due_ms = 0;
};

struct HistorianPolicy
{
    int64_t interval_ms = 60000;
    std::string mode = "periodic";
    bool include_bad_quality = false;
    double deadband = 0.0;
    struct ResolutionTier
    {
        int64_t resolution_ms = 0;
        int64_t retention_ms = 0;
        bool enabled = true;
    };
    std::vector<ResolutionTier> resolution_tiers{
        {10000, 2592000000LL, true},
        {60000, 31536000000LL, true},
        {300000, 157680000000LL, true},
        {3600000, 0, true}
    };
};

struct AppCfg
{
    bool enabled = true;
    uint16_t http_port = 8096;

    std::string opcbridge_host = "127.0.0.1";
    uint16_t opcbridge_http_port = 8080;
    uint16_t opcbridge_ws_port = 8090;
    std::string opcbridge_ws_path = "/";

    std::string subscribe_mode = "all"; // all | list | patterns
    std::vector<std::string> tags;      // exact "conn:tag"
    struct Pattern { std::string connection_id; std::string name_glob; };
    std::vector<Pattern> patterns;

    ChangeOnlyCfg change_only;
    SnapshotCfg snapshot;
    PgCfg pg;
    HistorianPolicy historian_policy;
    std::vector<HistorianTagRule> historian_tags;
};

struct Sample
{
    int64_t ts_ms = 0;
    std::string connection_id;
    std::string tag_name;
    std::optional<std::string> datatype;
    std::optional<int> quality;

    std::optional<double> value_double;
    std::optional<std::string> value_text;
    std::optional<std::string> value_json; // JSON-encoded string

    std::string source; // "ws" | "snapshot"
};

struct SummaryResult
{
    std::string connection_id;
    std::string tag_name;
    std::optional<std::string> datatype;
    int64_t from_ms = 0;
    int64_t to_ms = 0;
    int64_t count = 0;
    std::optional<double> last;
    std::optional<double> min;
    std::optional<double> max;
    std::optional<double> avg;
    std::optional<double> twa;
};

struct QueryPoint
{
    int64_t ts_ms = 0;
    double value = 0.0;
    std::optional<int> quality;
};

struct BucketPoint
{
    int64_t bucket_start_ms = 0;
    int64_t bucket_end_ms = 0;
    int64_t count = 0;
    std::optional<double> min;
    std::optional<double> max;
    std::optional<double> avg;
};

struct HealthState
{
    std::atomic<bool> db_connected{false};
    std::atomic<size_t> queue_depth{0};
    std::atomic<uint64_t> dropped_samples{0};
    std::atomic<uint64_t> inserted_samples{0};
    std::atomic<int64_t> last_insert_ms{0};
    std::atomic<int64_t> last_sample_ms{0};
    std::atomic<int64_t> last_snapshot_ms{0};
    std::mutex error_mutex;
    std::string last_error;

    void set_error(const std::string& err)
    {
        std::lock_guard<std::mutex> lock(error_mutex);
        last_error = err;
    }

    std::string get_error()
    {
        std::lock_guard<std::mutex> lock(error_mutex);
        return last_error;
    }
};

static int64_t now_ms()
{
    using namespace std::chrono;
    return duration_cast<milliseconds>(system_clock::now().time_since_epoch()).count();
}

static std::string tag_key(const std::string& conn, const std::string& name)
{
    return conn + ":" + name;
}

static std::optional<std::pair<std::string, std::string>> split_tag_key(const std::string& key)
{
    const auto pos = key.find(':');
    if (pos == std::string::npos || pos == 0 || pos + 1 >= key.size()) return std::nullopt;
    return std::make_pair(key.substr(0, pos), key.substr(pos + 1));
}

static bool parse_int64(const std::string& s, int64_t& out)
{
    try
    {
        size_t idx = 0;
        const long long v = std::stoll(s, &idx);
        if (idx != s.size()) return false;
        out = static_cast<int64_t>(v);
        return true;
    }
    catch (...)
    {
        return false;
    }
}

static bool parse_range_ms(const std::string& range, int64_t now, int64_t& fromMs, int64_t& toMs)
{
    toMs = now;
    const std::string r = range.empty() ? "1h" : range;
    int64_t mul = 0;
    std::string n;
    if (r == "hour") { fromMs = now - 60LL * 60 * 1000; return true; }
    if (r == "day") { fromMs = now - 24LL * 60 * 60 * 1000; return true; }
    if (r == "month") { fromMs = now - 30LL * 24 * 60 * 60 * 1000; return true; }
    if (r == "year") { fromMs = now - 365LL * 24 * 60 * 60 * 1000; return true; }
    if (r.size() < 2) return false;
    const char unit = r.back();
    n = r.substr(0, r.size() - 1);
    int64_t qty = 0;
    if (!parse_int64(n, qty) || qty <= 0) return false;
    if (unit == 'm') mul = 60LL * 1000;
    else if (unit == 'h') mul = 60LL * 60 * 1000;
    else if (unit == 'd') mul = 24LL * 60 * 60 * 1000;
    else return false;
    fromMs = now - qty * mul;
    return true;
}

static bool parse_duration_ms(const std::string& value, int64_t& outMs)
{
    const std::string s = value.empty() ? "" : value;
    if (s.empty() || s == "raw") return false;
    if (s == "auto") { outMs = 0; return true; }
    if (s.size() < 2) return false;
    const char unit = s.back();
    int64_t qty = 0;
    if (!parse_int64(s.substr(0, s.size() - 1), qty) || qty <= 0) return false;
    int64_t mul = 0;
    if (unit == 's') mul = 1000;
    else if (unit == 'm') mul = 60LL * 1000;
    else if (unit == 'h') mul = 60LL * 60 * 1000;
    else if (unit == 'd') mul = 24LL * 60 * 60 * 1000;
    else return false;
    outMs = qty * mul;
    return outMs > 0;
}

static int64_t choose_auto_bucket_ms(int64_t fromMs, int64_t toMs)
{
    const int64_t span = std::max<int64_t>(1, toMs - fromMs);
    const int64_t target = span / 300;
    const std::vector<int64_t> choices = {
        1000,
        5000,
        10000,
        30000,
        60LL * 1000,
        5LL * 60 * 1000,
        15LL * 60 * 1000,
        60LL * 60 * 1000,
        6LL * 60 * 60 * 1000,
        24LL * 60 * 60 * 1000
    };
    for (const auto c : choices) {
        if (c >= target) return c;
    }
    return choices.back();
}

static json optional_double_json(const std::optional<double>& v)
{
    if (!v.has_value() || !std::isfinite(v.value())) return nullptr;
    return v.value();
}

static bool glob_match(const std::string& pattern, const std::string& text)
{
    size_t p = 0;
    size_t t = 0;
    size_t star = std::string::npos;
    size_t match = 0;

    while (t < text.size())
    {
        if (p < pattern.size() && (pattern[p] == '?' || pattern[p] == text[t]))
        {
            ++p;
            ++t;
            continue;
        }
        if (p < pattern.size() && pattern[p] == '*')
        {
            star = p++;
            match = t;
            continue;
        }
        if (star != std::string::npos)
        {
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

static std::string load_file_strip_comments(const std::string& path)
{
    std::ifstream f(path);
    if (!f) throw std::runtime_error("Failed to open file: " + path);
    std::string input((std::istreambuf_iterator<char>(f)), std::istreambuf_iterator<char>());

    std::string out;
    out.reserve(input.size());

    enum class State { Normal, Slash, LineComment, BlockComment, BlockCommentStar, InString, InStringEscape };
    State state = State::Normal;

    for (size_t i = 0; i < input.size(); ++i)
    {
        const char c = input[i];
        switch (state)
        {
        case State::Normal:
            if (c == '"') { out.push_back(c); state = State::InString; }
            else if (c == '/') { state = State::Slash; }
            else { out.push_back(c); }
            break;
        case State::Slash:
            if (c == '/') state = State::LineComment;
            else if (c == '*') state = State::BlockComment;
            else { out.push_back('/'); out.push_back(c); state = State::Normal; }
            break;
        case State::LineComment:
            if (c == '\n') { out.push_back('\n'); state = State::Normal; }
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

static AppCfg load_config(const std::string& path)
{
    const std::string cfg_text = load_file_strip_comments(path);
    json root = json::parse(cfg_text);

    AppCfg cfg;
    cfg.enabled = root.value("enabled", cfg.enabled);
    cfg.http_port = static_cast<uint16_t>(root.value("http_port", cfg.http_port));

    if (root.contains("opcbridge_base_url") && root["opcbridge_base_url"].is_string())
    {
        const std::string base = root["opcbridge_base_url"].get<std::string>();
        const std::string prefix = "http://";
        if (base.rfind(prefix, 0) == 0)
        {
            std::string rest = base.substr(prefix.size());
            while (!rest.empty() && rest.back() == '/') rest.pop_back();
            const auto colon = rest.rfind(':');
            if (colon != std::string::npos && colon + 1 < rest.size())
            {
                cfg.opcbridge_host = rest.substr(0, colon);
                cfg.opcbridge_http_port = static_cast<uint16_t>(std::stoi(rest.substr(colon + 1)));
            }
            else if (!rest.empty())
            {
                cfg.opcbridge_host = rest;
            }
        }
    }
    cfg.opcbridge_host = root.value("opcbridge_host", cfg.opcbridge_host);
    cfg.opcbridge_http_port = static_cast<uint16_t>(root.value("opcbridge_http_port", cfg.opcbridge_http_port));
    cfg.opcbridge_ws_port = static_cast<uint16_t>(root.value("opcbridge_ws_port", cfg.opcbridge_ws_port));
    cfg.opcbridge_ws_path = root.value("opcbridge_ws_path", cfg.opcbridge_ws_path);

    if (root.contains("historian_policy") && root["historian_policy"].is_object())
    {
        const auto& policy = root["historian_policy"];
        cfg.historian_policy.interval_ms = policy.value("interval_ms", cfg.historian_policy.interval_ms);
        cfg.historian_policy.mode = policy.value("mode", cfg.historian_policy.mode);
        cfg.historian_policy.include_bad_quality = policy.value("include_bad_quality", cfg.historian_policy.include_bad_quality);
        cfg.historian_policy.deadband = std::max(0.0, policy.value("deadband", cfg.historian_policy.deadband));
        if (policy.contains("resolution_tiers") && policy["resolution_tiers"].is_array())
        {
            cfg.historian_policy.resolution_tiers.clear();
            for (const auto& item : policy["resolution_tiers"])
            {
                if (!item.is_object()) continue;
                HistorianPolicy::ResolutionTier tier;
                tier.resolution_ms = std::max<int64_t>(1000, item.value("resolution_ms", 0LL));
                tier.retention_ms = std::max<int64_t>(0, item.value("retention_ms", 0LL));
                tier.enabled = item.value("enabled", true);
                if (tier.enabled && tier.resolution_ms > 0)
                    cfg.historian_policy.resolution_tiers.push_back(tier);
            }
            std::sort(cfg.historian_policy.resolution_tiers.begin(), cfg.historian_policy.resolution_tiers.end(),
                      [](const auto& a, const auto& b) { return a.resolution_ms < b.resolution_ms; });
        }
        if (cfg.historian_policy.interval_ms < 1000) cfg.historian_policy.interval_ms = 1000;
        if (cfg.historian_policy.mode != "periodic") cfg.historian_policy.mode = "periodic";
    }

    cfg.subscribe_mode = root.value("subscribe_mode", cfg.subscribe_mode);
    if (root.contains("tags") && root["tags"].is_array())
    {
        for (const auto& t : root["tags"])
        {
            if (t.is_string())
            {
                const std::string key = t.get<std::string>();
                cfg.tags.push_back(key);
                auto parts = split_tag_key(key);
                if (parts.has_value())
                {
                    HistorianTagRule rule;
                    rule.connection_id = parts->first;
                    rule.tag_name = parts->second;
                    rule.interval_ms = cfg.historian_policy.interval_ms;
                    rule.mode = cfg.historian_policy.mode;
                    rule.include_bad_quality = cfg.historian_policy.include_bad_quality;
                    rule.deadband = cfg.historian_policy.deadband;
                    cfg.historian_tags.push_back(std::move(rule));
                }
                continue;
            }
            if (!t.is_object()) continue;
            HistorianTagRule rule;
            rule.connection_id = t.value("connection_id", "");
            rule.tag_name = t.value("tag_name", t.value("name", ""));
            rule.enabled = t.value("enabled", rule.enabled);
            rule.interval_ms = cfg.historian_policy.interval_ms;
            rule.mode = cfg.historian_policy.mode;
            rule.include_bad_quality = cfg.historian_policy.include_bad_quality;
            rule.deadband_override = t.value("deadband_override", false);
            rule.deadband = std::max(0.0, rule.deadband_override ? t.value("deadband", cfg.historian_policy.deadband) : cfg.historian_policy.deadband);
            if (rule.interval_ms < 1000) rule.interval_ms = 1000;
            if (!rule.connection_id.empty() && !rule.tag_name.empty())
            {
                cfg.tags.push_back(tag_key(rule.connection_id, rule.tag_name));
                cfg.historian_tags.push_back(std::move(rule));
            }
        }
    }
    if (root.contains("historian_tags") && root["historian_tags"].is_array())
    {
        for (const auto& t : root["historian_tags"])
        {
            if (!t.is_object()) continue;
            HistorianTagRule rule;
            rule.connection_id = t.value("connection_id", "");
            rule.tag_name = t.value("tag_name", t.value("name", ""));
            rule.enabled = t.value("enabled", rule.enabled);
            rule.interval_ms = cfg.historian_policy.interval_ms;
            rule.mode = cfg.historian_policy.mode;
            rule.include_bad_quality = cfg.historian_policy.include_bad_quality;
            rule.deadband_override = t.value("deadband_override", false);
            rule.deadband = std::max(0.0, rule.deadband_override ? t.value("deadband", cfg.historian_policy.deadband) : cfg.historian_policy.deadband);
            if (rule.interval_ms < 1000) rule.interval_ms = 1000;
            if (!rule.connection_id.empty() && !rule.tag_name.empty())
            {
                cfg.tags.push_back(tag_key(rule.connection_id, rule.tag_name));
                cfg.historian_tags.push_back(std::move(rule));
            }
        }
    }
    if (root.contains("patterns") && root["patterns"].is_array())
    {
        for (const auto& p : root["patterns"])
        {
            if (!p.is_object()) continue;
            AppCfg::Pattern pat;
            pat.connection_id = p.value("connection_id", "");
            pat.name_glob = p.value("name", p.value("tag_name", ""));
            if (pat.connection_id.empty() || pat.name_glob.empty()) continue;
            cfg.patterns.push_back(std::move(pat));
        }
    }

    if (root.contains("change_only") && root["change_only"].is_object())
    {
        const auto& c = root["change_only"];
        cfg.change_only.enabled = c.value("enabled", cfg.change_only.enabled);
        cfg.change_only.deadband = c.value("deadband", cfg.change_only.deadband);
        cfg.change_only.min_interval_ms = c.value("min_interval_ms", cfg.change_only.min_interval_ms);
        cfg.change_only.max_interval_ms = c.value("max_interval_ms", cfg.change_only.max_interval_ms);
    }

    if (root.contains("snapshot") && root["snapshot"].is_object())
    {
        const auto& s = root["snapshot"];
        cfg.snapshot.enabled = s.value("enabled", cfg.snapshot.enabled);
        cfg.snapshot.interval_ms = s.value("interval_ms", cfg.snapshot.interval_ms);
    }

    if (!root.contains("postgres") || !root["postgres"].is_object())
    {
        throw std::runtime_error("Missing required 'postgres' object in config.");
    }
    const auto& pg = root["postgres"];
    cfg.pg.conninfo = pg.value("conninfo", "");
    cfg.pg.table = pg.value("table", cfg.pg.table);
    cfg.pg.batch_size = static_cast<size_t>(pg.value("batch_size", static_cast<int>(cfg.pg.batch_size)));
    cfg.pg.flush_interval_ms = pg.value("flush_interval_ms", cfg.pg.flush_interval_ms);
    cfg.pg.queue_limit = static_cast<size_t>(pg.value("queue_limit", static_cast<int>(cfg.pg.queue_limit)));

    if (cfg.pg.table.empty()) throw std::runtime_error("postgres.table is required.");
    if (cfg.pg.batch_size < 1) cfg.pg.batch_size = 1;
    if (cfg.pg.flush_interval_ms < 1) cfg.pg.flush_interval_ms = 1;
    if (cfg.pg.queue_limit < cfg.pg.batch_size) cfg.pg.queue_limit = cfg.pg.batch_size;

    return cfg;
}

static char* pq_escape_literal(PGconn* conn, const std::string& s)
{
    return PQescapeLiteral(conn, s.c_str(), s.size());
}

static std::string sql_ident_quoted(const std::string& ident)
{
    std::string out;
    out.reserve(ident.size() + 2);
    out.push_back('"');
    for (char c : ident)
    {
        if (c == '"') out.push_back('"');
        out.push_back(c);
    }
    out.push_back('"');
    return out;
}

static std::string sql_identifier_safe_name(std::string value)
{
    for (char& c : value)
    {
        const bool ok =
            (c >= 'a' && c <= 'z') ||
            (c >= 'A' && c <= 'Z') ||
            (c >= '0' && c <= '9') ||
            c == '_';
        if (!ok) c = '_';
    }
    if (value.empty()) value = "tag_samples";
    return value;
}

class PgWriter
{
public:
    explicit PgWriter(PgCfg cfg) : cfg_(std::move(cfg)) {}

    bool connect(std::string& err)
    {
        conn_ = PQconnectdb(cfg_.conninfo.c_str());
        if (!conn_) { err = "PQconnectdb returned null"; return false; }
        if (PQstatus(conn_) != CONNECTION_OK)
        {
            err = PQerrorMessage(conn_);
            PQfinish(conn_);
            conn_ = nullptr;
            return false;
        }
        if (!ensure_schema(err))
        {
            PQfinish(conn_);
            conn_ = nullptr;
            return false;
        }
        return true;
    }

    void close()
    {
        if (conn_) PQfinish(conn_);
        conn_ = nullptr;
    }

    bool is_connected() const { return conn_ && PQstatus(conn_) == CONNECTION_OK; }
    const std::string& timescaledb_version() const { return timescaledb_version_; }

    bool configure_timescale(const std::vector<HistorianPolicy::ResolutionTier>& tiers, std::string& err)
    {
        if (!is_connected()) { err = "Not connected"; return false; }
        {
            PGresult* version = PQexec(conn_, "SELECT extversion FROM pg_extension WHERE extname='timescaledb';");
            if (!version || PQresultStatus(version) != PGRES_TUPLES_OK || PQntuples(version) < 1)
            {
                err = "TimescaleDB extension is not active in the historian database";
                if (version) PQclear(version);
                return false;
            }
            timescaledb_version_ = PQgetvalue(version, 0, 0);
            PQclear(version);
        }
        resolution_tiers_ = tiers;
        const std::string raw = sql_ident_quoted(cfg_.table);
        const int64_t rawRefreshWindow = (!tiers.empty() && tiers.front().retention_ms > 0)
            ? tiers.front().retention_ms : 3153600000000LL;
        for (const auto& tier : tiers)
        {
            const std::string legacyViewName = sql_identifier_safe_name(cfg_.table + "_cagg_" + std::to_string(tier.resolution_ms));
            if (!exec_command("DROP MATERIALIZED VIEW IF EXISTS " + sql_ident_quoted(legacyViewName) + " CASCADE;", err)) return false;
            const std::string viewName = sql_identifier_safe_name(cfg_.table + "_cagg_v1_" + std::to_string(tier.resolution_ms));
            const std::string view = sql_ident_quoted(viewName);
            bool viewAlreadyExists = false;
            {
                PGresult* exists = PQexec(conn_, ("SELECT to_regclass('" + viewName + "') IS NOT NULL;").c_str());
                if (!exists || PQresultStatus(exists) != PGRES_TUPLES_OK || PQntuples(exists) < 1)
                {
                    err = exists ? PQresultErrorMessage(exists) : "PQexec returned null";
                    if (exists) PQclear(exists);
                    return false;
                }
                viewAlreadyExists = std::string(PQgetvalue(exists, 0, 0)) == "t";
                PQclear(exists);
            }
            std::ostringstream create;
            create << "CREATE MATERIALIZED VIEW IF NOT EXISTS " << view << " WITH (timescaledb.continuous) AS SELECT "
                   << "time_bucket(INTERVAL '" << tier.resolution_ms << " milliseconds',ts) AS bucket,"
                   << "connection_id,tag_name,count(value_double)::bigint AS sample_count,"
                   << "min(value_double) AS min_value,max(value_double) AS max_value,avg(value_double) AS avg_value,"
                   << "first(value_double,ts) AS first_value,last(value_double,ts) AS last_value "
                   << "FROM " << raw << " WHERE value_double IS NOT NULL GROUP BY bucket,connection_id,tag_name WITH NO DATA;";
            if (!exec_command(create.str(), err)) return false;
            if (!exec_command("ALTER MATERIALIZED VIEW " + view + " SET (timescaledb.materialized_only=false);", err)) return false;
            if (!viewAlreadyExists)
            {
                std::ostringstream refresh;
                refresh << "CALL refresh_continuous_aggregate('" << viewName << "',NULL,now()-INTERVAL '"
                        << tier.resolution_ms << " milliseconds');";
                if (!exec_command(refresh.str(), err)) return false;
            }
            if (!exec_query_command("SELECT remove_continuous_aggregate_policy('" + viewName + "',if_exists=>TRUE);", err)) return false;
            std::ostringstream policy;
            policy << "SELECT add_continuous_aggregate_policy('" << viewName << "',"
                   << "start_offset=>INTERVAL '" << rawRefreshWindow << " milliseconds',"
                   << "end_offset=>INTERVAL '" << tier.resolution_ms << " milliseconds',"
                   << "schedule_interval=>INTERVAL '15 minutes',if_not_exists=>TRUE);";
            if (!exec_query_command(policy.str(), err)) return false;
            if (!exec_query_command("SELECT remove_retention_policy('" + viewName + "',if_exists=>TRUE);", err)) return false;
            if (tier.retention_ms > 0)
            {
                std::ostringstream retention;
                retention << "SELECT add_retention_policy('" << viewName << "',INTERVAL '" << tier.retention_ms
                          << " milliseconds',if_not_exists=>TRUE);";
                if (!exec_query_command(retention.str(), err)) return false;
            }
        }
        if (!exec_query_command("SELECT remove_retention_policy('" + cfg_.table + "',if_exists=>TRUE);", err)) return false;
        if (!tiers.empty() && tiers.front().retention_ms > 0)
        {
            std::ostringstream retention;
            retention << "SELECT add_retention_policy('" << cfg_.table << "',INTERVAL '" << tiers.front().retention_ms
                      << " milliseconds',if_not_exists=>TRUE);";
            if (!exec_query_command(retention.str(), err)) return false;
        }
        return true;
    }

    bool insert_batch(const std::vector<Sample>& batch, std::string& err)
    {
        if (batch.empty()) return true;
        if (!is_connected()) { err = "Not connected"; return false; }

        const std::string tableIdent = sql_ident_quoted(cfg_.table);
        std::string sql;
        sql.reserve(batch.size() * 256);
        sql += "INSERT INTO ";
        sql += tableIdent;
        sql += " (ts, ts_ms, connection_id, tag_name, datatype, quality, value_double, value_text, value_json, source) VALUES ";

        bool first = true;
        for (const auto& s : batch)
        {
            if (!first) sql += ",";
            first = false;

            sql += "(";
            sql += "to_timestamp(" + std::to_string(static_cast<double>(s.ts_ms) / 1000.0) + "),";
            sql += std::to_string(s.ts_ms) + ",";

            char* connLit = pq_escape_literal(conn_, s.connection_id);
            char* tagLit = pq_escape_literal(conn_, s.tag_name);
            if (!connLit || !tagLit) { err = "PQescapeLiteral failed"; free_if_needed(connLit); free_if_needed(tagLit); return false; }
            sql += connLit; sql += ","; sql += tagLit; sql += ",";
            free_if_needed(connLit); free_if_needed(tagLit);

            if (s.datatype.has_value())
            {
                char* dtLit = pq_escape_literal(conn_, s.datatype.value());
                if (!dtLit) { err = "PQescapeLiteral failed"; return false; }
                sql += dtLit;
                free_if_needed(dtLit);
            }
            else sql += "NULL";
            sql += ",";

            if (s.quality.has_value()) sql += std::to_string(s.quality.value());
            else sql += "NULL";
            sql += ",";

            if (s.value_double.has_value())
            {
                if (std::isfinite(s.value_double.value())) sql += std::to_string(s.value_double.value());
                else sql += "NULL";
            }
            else sql += "NULL";
            sql += ",";

            if (s.value_text.has_value())
            {
                char* vLit = pq_escape_literal(conn_, s.value_text.value());
                if (!vLit) { err = "PQescapeLiteral failed"; return false; }
                sql += vLit;
                free_if_needed(vLit);
            }
            else sql += "NULL";
            sql += ",";

            if (s.value_json.has_value())
            {
                char* jLit = pq_escape_literal(conn_, s.value_json.value());
                if (!jLit) { err = "PQescapeLiteral failed"; return false; }
                sql += jLit;
                sql += "::jsonb";
                free_if_needed(jLit);
            }
            else sql += "NULL";
            sql += ",";

            char* srcLit = pq_escape_literal(conn_, s.source);
            if (!srcLit) { err = "PQescapeLiteral failed"; return false; }
            sql += srcLit;
            free_if_needed(srcLit);
            sql += ")";
        }
        sql += ";";

        PGresult* res = PQexec(conn_, sql.c_str());
        if (!res)
        {
            err = "PQexec returned null";
            return false;
        }
        const auto status = PQresultStatus(res);
        if (status != PGRES_COMMAND_OK)
        {
            err = PQresultErrorMessage(res);
            PQclear(res);
            return false;
        }
        PQclear(res);
        return true;
    }

    bool query_summary(const std::string& connectionId,
                       const std::string& tagName,
                       int64_t fromMs,
                       int64_t toMs,
                       bool goodOnly,
                       SummaryResult& out,
                       std::string& err)
    {
        out = SummaryResult{};
        out.connection_id = connectionId;
        out.tag_name = tagName;
        out.from_ms = fromMs;
        out.to_ms = toMs;

        if (!is_connected()) { err = "Not connected"; return false; }

        char* connLit = pq_escape_literal(conn_, connectionId);
        char* tagLit = pq_escape_literal(conn_, tagName);
        if (!connLit || !tagLit)
        {
            err = "PQescapeLiteral failed";
            free_if_needed(connLit);
            free_if_needed(tagLit);
            return false;
        }

        const std::string qualityClause = goodOnly ? " AND (quality IS NULL OR quality = 1)" : "";
        const auto tier = choose_resolution_tier(fromMs, std::numeric_limits<int64_t>::max());
        std::ostringstream sql;
        if (tier.has_value())
        {
            const std::string view = sql_ident_quoted(cfg_.table + "_cagg_v1_" + std::to_string(tier->resolution_ms));
            sql << "WITH filtered AS (SELECT (extract(epoch from bucket)*1000)::bigint AS ts_ms,NULL::text AS datatype,sample_count AS n,min_value AS min_v,max_value AS max_v,"
                << "avg_value*sample_count AS weighted,last_value AS last_v FROM " << view
                << " WHERE connection_id=" << connLit << " AND tag_name=" << tagLit
                << " AND bucket >= to_timestamp(" << (static_cast<double>(fromMs) / 1000.0) << ") AND bucket <= to_timestamp(" << (static_cast<double>(toMs) / 1000.0) << ")),last_row AS (";
        }
        else
        {
            sql << "WITH filtered AS (SELECT ts_ms,datatype,1::bigint AS n,value_double AS min_v,value_double AS max_v,"
                << "value_double AS weighted,value_double AS last_v FROM " << sql_ident_quoted(cfg_.table)
                << " WHERE connection_id=" << connLit << " AND tag_name=" << tagLit
                << " AND ts_ms >= " << fromMs << " AND ts_ms <= " << toMs << " AND value_double IS NOT NULL" << qualityClause
                << "),last_row AS (";
        }
        sql << " SELECT last_v AS last_value, datatype AS last_datatype FROM filtered ORDER BY ts_ms DESC LIMIT 1"
            << ") SELECT coalesce(sum(n),0)::bigint, min(min_v), max(max_v), sum(weighted)/NULLIF(sum(n),0),"
            << " (SELECT last_value FROM last_row), (SELECT last_datatype FROM last_row) FROM filtered;";

        free_if_needed(connLit);
        free_if_needed(tagLit);

        PGresult* res = PQexec(conn_, sql.str().c_str());
        if (!res)
        {
            err = "PQexec returned null";
            return false;
        }
        if (PQresultStatus(res) != PGRES_TUPLES_OK)
        {
            err = PQresultErrorMessage(res);
            PQclear(res);
            return false;
        }
        if (PQntuples(res) < 1)
        {
            PQclear(res);
            return true;
        }

        auto getOptDouble = [&](int col) -> std::optional<double> {
            if (PQgetisnull(res, 0, col)) return std::nullopt;
            try { return std::stod(PQgetvalue(res, 0, col)); }
            catch (...) { return std::nullopt; }
        };

        try
        {
            if (!PQgetisnull(res, 0, 0)) out.count = std::stoll(PQgetvalue(res, 0, 0));
        }
        catch (...)
        {
            out.count = 0;
        }
        out.min = getOptDouble(1);
        out.max = getOptDouble(2);
        out.avg = getOptDouble(3);
        out.last = getOptDouble(4);
        if (!PQgetisnull(res, 0, 5))
        {
            std::string dt = PQgetvalue(res, 0, 5);
            if (!dt.empty()) out.datatype = dt;
        }
        PQclear(res);

        std::string twaErr;
        std::optional<double> twa = query_twa(connectionId, tagName, fromMs, toMs, goodOnly, twaErr);
        if (!twaErr.empty())
        {
            err = twaErr;
            return false;
        }
        out.twa = twa;
        return true;
    }

    bool query_points(const std::string& connectionId,
                      const std::string& tagName,
                      int64_t fromMs,
                      int64_t toMs,
                      bool goodOnly,
                      int limit,
                      std::vector<QueryPoint>& out,
                      std::string& err)
    {
        out.clear();
        if (!is_connected()) { err = "Not connected"; return false; }
        if (limit < 1) limit = 1000;
        if (limit > 100000) limit = 100000;

        char* connLit = pq_escape_literal(conn_, connectionId);
        char* tagLit = pq_escape_literal(conn_, tagName);
        if (!connLit || !tagLit)
        {
            err = "PQescapeLiteral failed";
            free_if_needed(connLit);
            free_if_needed(tagLit);
            return false;
        }

        const std::string qualityClause = goodOnly ? " AND (quality IS NULL OR quality = 1)" : "";
        std::ostringstream sql;
        sql << "SELECT ts_ms, value_double, quality FROM " << sql_ident_quoted(cfg_.table)
            << " WHERE connection_id = " << connLit
            << " AND tag_name = " << tagLit
            << " AND ts_ms >= " << fromMs
            << " AND ts_ms <= " << toMs
            << " AND value_double IS NOT NULL"
            << qualityClause
            << " ORDER BY ts_ms ASC"
            << " LIMIT " << limit << ";";

        free_if_needed(connLit);
        free_if_needed(tagLit);

        PGresult* res = PQexec(conn_, sql.str().c_str());
        if (!res)
        {
            err = "PQexec returned null";
            return false;
        }
        if (PQresultStatus(res) != PGRES_TUPLES_OK)
        {
            err = PQresultErrorMessage(res);
            PQclear(res);
            return false;
        }

        out.reserve(static_cast<size_t>(std::max(0, PQntuples(res))));
        for (int row = 0; row < PQntuples(res); ++row)
        {
            if (PQgetisnull(res, row, 0) || PQgetisnull(res, row, 1)) continue;
            try
            {
                QueryPoint p;
                p.ts_ms = std::stoll(PQgetvalue(res, row, 0));
                p.value = std::stod(PQgetvalue(res, row, 1));
                if (!std::isfinite(p.value)) continue;
                if (!PQgetisnull(res, row, 2)) p.quality = std::stoi(PQgetvalue(res, row, 2));
                out.push_back(p);
            }
            catch (...)
            {
            }
        }
        PQclear(res);
        return true;
    }

    bool query_buckets(const std::string& connectionId,
                       const std::string& tagName,
                       int64_t fromMs,
                       int64_t toMs,
                       bool goodOnly,
                       int64_t bucketMs,
                       int limit,
                       std::vector<BucketPoint>& out,
                       std::string& err)
    {
        out.clear();
        if (!is_connected()) { err = "Not connected"; return false; }
        if (bucketMs <= 0) { err = "bucketMs must be greater than zero"; return false; }
        if (limit < 1) limit = 1000;
        if (limit > 100000) limit = 100000;

        char* connLit = pq_escape_literal(conn_, connectionId);
        char* tagLit = pq_escape_literal(conn_, tagName);
        if (!connLit || !tagLit)
        {
            err = "PQescapeLiteral failed";
            free_if_needed(connLit);
            free_if_needed(tagLit);
            return false;
        }

        const std::string qualityClause = goodOnly ? " AND (quality IS NULL OR quality = 1)" : "";
        const auto tier = choose_resolution_tier(fromMs, bucketMs);
        std::ostringstream sql;
        sql << "WITH combined AS (";
        if (tier.has_value())
        {
            const std::string view = sql_ident_quoted(cfg_.table + "_cagg_v1_" + std::to_string(tier->resolution_ms));
            sql << "SELECT (extract(epoch from bucket)*1000)::bigint AS ts_ms,sample_count AS n,min_value AS min_v,max_value AS max_v,avg_value*sample_count AS weighted FROM " << view
                << " WHERE connection_id=" << connLit << " AND tag_name=" << tagLit
                << " AND bucket >= to_timestamp(" << (static_cast<double>(fromMs) / 1000.0) << ") AND bucket <= to_timestamp(" << (static_cast<double>(toMs) / 1000.0) << ")";
        }
        else
        {
            sql << "SELECT ts_ms,1::bigint AS n,value_double AS min_v,value_double AS max_v,value_double AS weighted FROM "
                << sql_ident_quoted(cfg_.table) << " WHERE connection_id=" << connLit << " AND tag_name=" << tagLit
                << " AND ts_ms >= " << fromMs << " AND ts_ms <= " << toMs << " AND value_double IS NOT NULL" << qualityClause;
        }
        sql << "), grouped AS (SELECT ((ts_ms-" << fromMs << ")/" << bucketMs << ")::bigint AS bucket_idx,"
            << " sum(n)::bigint AS n,min(min_v) AS min_v,max(max_v) AS max_v,sum(weighted)/NULLIF(sum(n),0) AS avg_v"
            << " FROM combined GROUP BY ((ts_ms-" << fromMs << ")/" << bucketMs << ")::bigint)"
            << " SELECT bucket_idx,n,min_v,max_v,avg_v FROM grouped ORDER BY bucket_idx ASC LIMIT " << limit << ";";

        free_if_needed(connLit);
        free_if_needed(tagLit);

        PGresult* res = PQexec(conn_, sql.str().c_str());
        if (!res)
        {
            err = "PQexec returned null";
            return false;
        }
        if (PQresultStatus(res) != PGRES_TUPLES_OK)
        {
            err = PQresultErrorMessage(res);
            PQclear(res);
            return false;
        }

        auto getOptDouble = [&](int row, int col) -> std::optional<double> {
            if (PQgetisnull(res, row, col)) return std::nullopt;
            try { return std::stod(PQgetvalue(res, row, col)); }
            catch (...) { return std::nullopt; }
        };

        out.reserve(static_cast<size_t>(std::max(0, PQntuples(res))));
        for (int row = 0; row < PQntuples(res); ++row)
        {
            try
            {
                if (PQgetisnull(res, row, 0)) continue;
                const int64_t idx = std::stoll(PQgetvalue(res, row, 0));
                BucketPoint p;
                p.bucket_start_ms = fromMs + idx * bucketMs;
                p.bucket_end_ms = std::min(toMs, p.bucket_start_ms + bucketMs);
                if (!PQgetisnull(res, row, 1)) p.count = std::stoll(PQgetvalue(res, row, 1));
                p.min = getOptDouble(row, 2);
                p.max = getOptDouble(row, 3);
                p.avg = getOptDouble(row, 4);
                out.push_back(p);
            }
            catch (...)
            {
            }
        }
        PQclear(res);
        return true;
    }

private:
    std::optional<HistorianPolicy::ResolutionTier> choose_resolution_tier(int64_t fromMs, int64_t maxResolutionMs) const
    {
        const int64_t age = std::max<int64_t>(0, now_ms() - fromMs);
        for (const auto& tier : resolution_tiers_)
            if (tier.resolution_ms <= maxResolutionMs && (tier.retention_ms == 0 || tier.retention_ms >= age)) return tier;
        for (const auto& tier : resolution_tiers_)
            if (tier.retention_ms == 0 || tier.retention_ms >= age) return tier;
        return std::nullopt;
    }

    bool exec_query_command(const std::string& sql, std::string& err)
    {
        PGresult* res = PQexec(conn_, sql.c_str());
        if (!res) { err = "PQexec returned null"; return false; }
        if (PQresultStatus(res) != PGRES_TUPLES_OK)
        {
            err = PQresultErrorMessage(res);
            PQclear(res);
            return false;
        }
        PQclear(res);
        return true;
    }

    static void free_if_needed(char* p) { if (p) PQfreemem(p); }

    bool exec_command(const std::string& sql, std::string& err)
    {
        PGresult* res = PQexec(conn_, sql.c_str());
        if (!res)
        {
            err = "PQexec returned null";
            return false;
        }
        if (PQresultStatus(res) != PGRES_COMMAND_OK)
        {
            err = PQresultErrorMessage(res);
            PQclear(res);
            return false;
        }
        PQclear(res);
        return true;
    }

    bool ensure_schema(std::string& err)
    {
        if (!is_connected()) { err = "Not connected"; return false; }
        if (!exec_command("CREATE EXTENSION IF NOT EXISTS timescaledb;", err)) return false;
        const std::string tableIdent = sql_ident_quoted(cfg_.table);
        const std::string tableSafe = sql_identifier_safe_name(cfg_.table);

        std::ostringstream create;
        create << "CREATE TABLE IF NOT EXISTS " << tableIdent << " ("
               << "ts TIMESTAMPTZ NOT NULL,"
               << "ts_ms BIGINT NOT NULL,"
               << "connection_id TEXT NOT NULL,"
               << "tag_name TEXT NOT NULL,"
               << "\"key\" TEXT GENERATED ALWAYS AS (connection_id || ':' || tag_name) STORED,"
               << "datatype TEXT NULL,"
               << "quality INTEGER NULL,"
               << "value_double DOUBLE PRECISION NULL,"
               << "value_text TEXT NULL,"
               << "value_json JSONB NULL,"
               << "source TEXT NULL,"
               << "ingest_ts TIMESTAMPTZ NOT NULL DEFAULT now()"
               << ");";
        if (!exec_command(create.str(), err)) return false;

        const std::string keyIdx = sql_ident_quoted("idx_" + tableSafe + "_key_ts");
        std::ostringstream keyIndex;
        keyIndex << "CREATE INDEX IF NOT EXISTS " << keyIdx
                 << " ON " << tableIdent << " (\"key\", ts DESC);";
        if (!exec_command(keyIndex.str(), err)) return false;

        const std::string brinIdx = sql_ident_quoted("idx_" + tableSafe + "_ts_brin");
        std::ostringstream brinIndex;
        brinIndex << "CREATE INDEX IF NOT EXISTS " << brinIdx
                  << " ON " << tableIdent << " USING BRIN (ts);";
        if (!exec_command(brinIndex.str(), err)) return false;

        std::ostringstream hypertable;
        hypertable << "SELECT create_hypertable('" << cfg_.table << "','ts',if_not_exists=>TRUE,migrate_data=>TRUE);";
        if (!exec_query_command(hypertable.str(), err)) return false;

        return true;
    }

    std::vector<HistorianPolicy::ResolutionTier> resolution_tiers_;

    std::optional<double> query_twa(const std::string& connectionId,
                                    const std::string& tagName,
                                    int64_t fromMs,
                                    int64_t toMs,
                                    bool goodOnly,
                                    std::string& err)
    {
        err.clear();
        if (toMs <= fromMs) return std::nullopt;
        if (!is_connected()) { err = "Not connected"; return std::nullopt; }

        char* connLit = pq_escape_literal(conn_, connectionId);
        char* tagLit = pq_escape_literal(conn_, tagName);
        if (!connLit || !tagLit)
        {
            err = "PQescapeLiteral failed";
            free_if_needed(connLit);
            free_if_needed(tagLit);
            return std::nullopt;
        }

        const std::string qualityClause = goodOnly ? " AND (quality IS NULL OR quality = 1)" : "";
        const auto tier = choose_resolution_tier(fromMs, std::numeric_limits<int64_t>::max());
        std::ostringstream sql;
        if (tier.has_value())
        {
            const std::string view = sql_ident_quoted(cfg_.table + "_cagg_v1_" + std::to_string(tier->resolution_ms));
            sql << "WITH points AS (SELECT (extract(epoch from bucket)*1000)::bigint AS ts_ms,last_value AS value_double FROM " << view
                << " WHERE connection_id=" << connLit << " AND tag_name=" << tagLit
                << " AND bucket >= to_timestamp(" << (static_cast<double>(fromMs) / 1000.0) << ") AND bucket <= to_timestamp(" << (static_cast<double>(toMs) / 1000.0) << ")"
                << ") SELECT ts_ms,value_double FROM points ORDER BY ts_ms ASC;";
        }
        else
        {
            sql << "WITH points AS ("
            << " (SELECT ts_ms, value_double FROM " << sql_ident_quoted(cfg_.table)
            << " WHERE connection_id = " << connLit
            << " AND tag_name = " << tagLit
            << " AND ts_ms < " << fromMs
            << " AND value_double IS NOT NULL"
            << qualityClause
            << " ORDER BY ts_ms DESC LIMIT 1)"
            << " UNION ALL "
            << " (SELECT ts_ms, value_double FROM " << sql_ident_quoted(cfg_.table)
            << " WHERE connection_id = " << connLit
            << " AND tag_name = " << tagLit
            << " AND ts_ms >= " << fromMs
            << " AND ts_ms <= " << toMs
            << " AND value_double IS NOT NULL"
            << qualityClause
            << ")"
            << ") SELECT ts_ms, value_double FROM points ORDER BY ts_ms ASC;";
        }

        free_if_needed(connLit);
        free_if_needed(tagLit);

        PGresult* res = PQexec(conn_, sql.str().c_str());
        if (!res)
        {
            err = "PQexec returned null";
            return std::nullopt;
        }
        if (PQresultStatus(res) != PGRES_TUPLES_OK)
        {
            err = PQresultErrorMessage(res);
            PQclear(res);
            return std::nullopt;
        }

        struct Point { int64_t ts_ms; double value; };
        std::vector<Point> points;
        points.reserve(static_cast<size_t>(std::max(0, PQntuples(res))));
        for (int row = 0; row < PQntuples(res); ++row)
        {
            if (PQgetisnull(res, row, 0) || PQgetisnull(res, row, 1)) continue;
            try
            {
                Point p;
                p.ts_ms = std::stoll(PQgetvalue(res, row, 0));
                p.value = std::stod(PQgetvalue(res, row, 1));
                if (std::isfinite(p.value)) points.push_back(p);
            }
            catch (...)
            {
            }
        }
        PQclear(res);

        if (points.empty()) return std::nullopt;

        double weighted = 0.0;
        int64_t coveredMs = 0;
        for (size_t i = 0; i < points.size(); ++i)
        {
            const int64_t segStart = std::max(fromMs, points[i].ts_ms);
            const int64_t nextTs = (i + 1 < points.size()) ? points[i + 1].ts_ms : toMs;
            const int64_t segEnd = std::min(toMs, nextTs);
            if (segEnd <= segStart) continue;
            const int64_t dur = segEnd - segStart;
            weighted += points[i].value * static_cast<double>(dur);
            coveredMs += dur;
        }
        if (coveredMs <= 0) return std::nullopt;
        return weighted / static_cast<double>(coveredMs);
    }

    PgCfg cfg_;
    PGconn* conn_ = nullptr;
    std::string timescaledb_version_;
};

struct TagState
{
    int64_t last_logged_ms = 0;
    std::optional<double> last_logged_double;
    std::optional<std::string> last_logged_json;
    std::optional<int> last_logged_quality;
};

static bool value_to_fields(const json& v, std::optional<double>& outDouble, std::optional<std::string>& outText, std::optional<std::string>& outJson)
{
    outDouble.reset();
    outText.reset();
    outJson.reset();

    try
    {
        outJson = v.is_null() ? std::optional<std::string>{} : std::optional<std::string>{v.dump()};
    }
    catch (...)
    {
        outJson.reset();
    }

    if (v.is_number())
    {
        outDouble = v.get<double>();
        return true;
    }
    if (v.is_boolean())
    {
        outDouble = v.get<bool>() ? 1.0 : 0.0;
        return true;
    }
    if (v.is_string())
    {
        outText = v.get<std::string>();
        // opportunistically parse numeric
        try
        {
            size_t idx = 0;
            const double n = std::stod(outText.value(), &idx);
            if (idx == outText.value().size()) outDouble = n;
        }
        catch (...)
        {
        }
        return true;
    }

    // objects/arrays -> json only
    return true;
}

static bool should_log_sample(const ChangeOnlyCfg& cfg,
                              int64_t ts_ms,
                              const std::optional<double>& valueDouble,
                              const std::optional<std::string>& valueJson,
                              const std::optional<int>& quality,
                              TagState& st)
{
    if (!cfg.enabled)
    {
        st.last_logged_ms = ts_ms;
        st.last_logged_double = valueDouble;
        st.last_logged_json = valueJson;
        st.last_logged_quality = quality;
        return true;
    }

    const int64_t since = ts_ms - st.last_logged_ms;
    const bool maxElapsed = (st.last_logged_ms == 0) || (since >= cfg.max_interval_ms);
    const bool minElapsed = (st.last_logged_ms == 0) || (since >= cfg.min_interval_ms);

    bool changed = false;

    if (quality.has_value() != st.last_logged_quality.has_value() ||
        (quality.has_value() && quality.value() != st.last_logged_quality.value()))
    {
        changed = true;
    }

    if (!changed)
    {
        if (valueDouble.has_value() && st.last_logged_double.has_value())
        {
            const double delta = std::fabs(valueDouble.value() - st.last_logged_double.value());
            if (delta > cfg.deadband) changed = true;
        }
        else if (valueDouble.has_value() != st.last_logged_double.has_value())
        {
            changed = true;
        }
        else
        {
            const std::string cur = valueJson.value_or("");
            const std::string prev = st.last_logged_json.value_or("");
            if (cur != prev) changed = true;
        }
    }

    if ((changed && minElapsed) || maxElapsed)
    {
        st.last_logged_ms = ts_ms;
        st.last_logged_double = valueDouble;
        st.last_logged_json = valueJson;
        st.last_logged_quality = quality;
        return true;
    }

    return false;
}

static bool sample_from_tag_json(const json& t, const std::string& source, Sample& out)
{
    if (!t.is_object()) return false;
    const std::string conn = t.value("connection_id", "");
    const std::string name = t.value("name", "");
    if (conn.empty() || name.empty()) return false;

    out = Sample{};
    out.ts_ms = t.contains("timestamp_ms") && t["timestamp_ms"].is_number_integer()
        ? t["timestamp_ms"].get<int64_t>()
        : now_ms();
    out.connection_id = conn;
    out.tag_name = name;
    if (t.contains("datatype") && t["datatype"].is_string()) out.datatype = t["datatype"].get<std::string>();
    if (t.contains("quality") && t["quality"].is_number_integer()) out.quality = t["quality"].get<int>();
    if (t.contains("value")) value_to_fields(t["value"], out.value_double, out.value_text, out.value_json);
    out.source = source;
    return true;
}

static std::vector<std::string> resolve_subscribe_tags_from_patterns(const AppCfg& cfg)
{
    std::vector<std::string> out;
    httplib::Client cli(cfg.opcbridge_host, cfg.opcbridge_http_port);
    cli.set_read_timeout(10, 0);
    cli.set_connection_timeout(5, 0);

    auto res = cli.Get("/tags");
    if (!res || res->status != 200) return out;

    json body;
    try { body = json::parse(res->body); }
    catch (...) { return out; }

    if (!body.is_object() || !body.contains("tags") || !body["tags"].is_array()) return out;

    std::unordered_set<std::string> seen;
    for (const auto& t : body["tags"])
    {
        if (!t.is_object()) continue;
        const std::string conn = t.value("connection_id", "");
        const std::string name = t.value("name", "");
        if (conn.empty() || name.empty()) continue;

        bool matchAny = false;
        for (const auto& p : cfg.patterns)
        {
            if (p.connection_id != conn) continue;
            if (glob_match(p.name_glob, name)) { matchAny = true; break; }
        }
        if (!matchAny) continue;

        const std::string key = tag_key(conn, name);
        if (seen.insert(key).second) out.push_back(key);
    }

    std::sort(out.begin(), out.end());
    return out;
}

} // namespace

int main(int argc, char* argv[])
{
    std::string config_path = "config.json";
    std::string pg_conninfo_override;
    std::optional<std::string> pg_table_override;
    std::optional<std::string> opcbridge_host_override;
    std::optional<uint16_t> opcbridge_http_port_override;
    std::optional<uint16_t> opcbridge_ws_port_override;
    std::optional<std::string> opcbridge_ws_path_override;

    for (int i = 1; i < argc; ++i)
    {
        const std::string arg = argv[i];
        if (arg == "--config" && i + 1 < argc) config_path = argv[++i];
        else if (arg == "--pg-conninfo" && i + 1 < argc) pg_conninfo_override = argv[++i];
        else if (arg == "--pg-table" && i + 1 < argc) pg_table_override = std::string(argv[++i]);
        else if (arg == "--opcbridge-host" && i + 1 < argc) opcbridge_host_override = std::string(argv[++i]);
        else if (arg == "--opcbridge-http-port" && i + 1 < argc) opcbridge_http_port_override = static_cast<uint16_t>(std::stoi(argv[++i]));
        else if (arg == "--opcbridge-ws-port" && i + 1 < argc) opcbridge_ws_port_override = static_cast<uint16_t>(std::stoi(argv[++i]));
        else if (arg == "--opcbridge-ws-path" && i + 1 < argc) opcbridge_ws_path_override = std::string(argv[++i]);
        else if (arg == "--version" || arg == "-V")
        {
            std::cout << "opcbridge-historian version " << OPCBRIDGE_HISTORIAN_VERSION
                      << " (suite " << OPCBRIDGE_SUITE_VERSION << ")\n";
            return 0;
        }
        else if (arg == "--help" || arg == "-h")
        {
            std::cout << "Usage: " << argv[0]
                      << " [--config path]"
                      << " [--pg-conninfo conninfo]"
                      << " [--pg-table name]"
                      << " [--opcbridge-host host]"
                      << " [--opcbridge-http-port port]"
                      << " [--opcbridge-ws-port port]"
                      << " [--opcbridge-ws-path path]"
                      << " [--version]"
                      << "\n";
            return 0;
        }
    }

    AppCfg cfg;
    try { cfg = load_config(config_path); }
    catch (const std::exception& ex)
    {
        std::cerr << "[historian] config error: " << ex.what() << "\n";
        return 1;
    }

    if (!pg_conninfo_override.empty()) cfg.pg.conninfo = pg_conninfo_override;
    if (pg_table_override.has_value()) cfg.pg.table = pg_table_override.value();
    if (opcbridge_host_override.has_value()) cfg.opcbridge_host = opcbridge_host_override.value();
    if (opcbridge_http_port_override.has_value()) cfg.opcbridge_http_port = opcbridge_http_port_override.value();
    if (opcbridge_ws_port_override.has_value()) cfg.opcbridge_ws_port = opcbridge_ws_port_override.value();
    if (opcbridge_ws_path_override.has_value()) cfg.opcbridge_ws_path = opcbridge_ws_path_override.value();

    if (cfg.pg.conninfo.empty())
    {
        std::cerr << "[historian] config error: postgres.conninfo is required (or pass --pg-conninfo)\n";
        return 1;
    }

    PgWriter writer(cfg.pg);
    {
        std::string err;
        if (!writer.connect(err))
        {
            std::cerr << "[historian] postgres connect failed: " << err << "\n";
            std::cerr << "[historian] Hint: create schema via psql -f ./schema.sql\n";
            return 1;
        }
        if (!writer.configure_timescale(cfg.historian_policy.resolution_tiers, err))
        {
            std::cerr << "[historian] TimescaleDB configuration failed: " << err << "\n";
            return 1;
        }
    }

    std::mutex qMutex;
    std::mutex pgMutex;
    std::mutex cfgMutex;
    std::vector<Sample> queue;
    queue.reserve(cfg.pg.batch_size * 2);

    std::atomic<bool> stop{false};
    HealthState health;
    health.db_connected.store(writer.is_connected());

    std::unordered_map<std::string, TagState> states;
    states.reserve(16384);

    auto enqueue = [&](Sample s) {
        std::lock_guard<std::mutex> lock(qMutex);
        size_t queueLimit = cfg.pg.queue_limit;
        {
            std::lock_guard<std::mutex> cfgLock(cfgMutex);
            queueLimit = cfg.pg.queue_limit;
        }
        if (queue.size() >= queueLimit)
        {
            health.dropped_samples.fetch_add(1);
            return;
        }
        queue.push_back(std::move(s));
        health.queue_depth.store(queue.size());
        health.last_sample_ms.store(now_ms());
    };

    httplib::Server healthServer;
    healthServer.Get("/health", [&](const httplib::Request&, httplib::Response& res) {
        AppCfg cfgCopy;
        {
            std::lock_guard<std::mutex> cfgLock(cfgMutex);
            cfgCopy = cfg;
        }
        json j;
        j["ok"] = cfgCopy.enabled && health.db_connected.load() && health.get_error().empty();
        j["version"] = OPCBRIDGE_HISTORIAN_VERSION;
        j["suite_version"] = OPCBRIDGE_SUITE_VERSION;
        j["enabled"] = cfgCopy.enabled;
        j["db_connected"] = health.db_connected.load();
        j["enabled_tags"] = std::count_if(cfgCopy.historian_tags.begin(), cfgCopy.historian_tags.end(), [](const auto& r) { return r.enabled; });
        j["queue_depth"] = health.queue_depth.load();
        j["queue_limit"] = cfgCopy.pg.queue_limit;
        j["dropped_samples"] = health.dropped_samples.load();
        j["inserted_samples"] = health.inserted_samples.load();
        j["last_insert_ms"] = health.last_insert_ms.load();
        j["last_sample_ms"] = health.last_sample_ms.load();
        j["last_snapshot_ms"] = health.last_snapshot_ms.load();
        j["timescaledb"] = true;
        j["timescaledb_version"] = writer.timescaledb_version();
        j["resolution_tiers"] = json::array();
        for (const auto& tier : cfgCopy.historian_policy.resolution_tiers)
            j["resolution_tiers"].push_back({{"resolution_ms", tier.resolution_ms}, {"retention_ms", tier.retention_ms}});
        j["last_error"] = health.get_error();
        res.set_content(j.dump(2), "application/json");
    });
    healthServer.Get("/tags", [&](const httplib::Request&, httplib::Response& res) {
        std::vector<HistorianTagRule> rules;
        {
            std::lock_guard<std::mutex> cfgLock(cfgMutex);
            rules = cfg.historian_tags;
        }
        json tags = json::array();
        for (const auto& rule : rules)
        {
            json r;
            r["connection_id"] = rule.connection_id;
            r["tag_name"] = rule.tag_name;
            r["enabled"] = rule.enabled;
            r["interval_ms"] = rule.interval_ms;
            r["mode"] = rule.mode;
            r["include_bad_quality"] = rule.include_bad_quality;
            r["deadband"] = rule.deadband;
            r["deadband_override"] = rule.deadband_override;
            tags.push_back(std::move(r));
        }
        json j;
        j["ok"] = true;
        j["tags"] = std::move(tags);
        res.set_content(j.dump(2), "application/json");
    });
    healthServer.Post("/reload", [&](const httplib::Request&, httplib::Response& res) {
        try
        {
            AppCfg next = load_config(config_path);
            if (!pg_conninfo_override.empty()) next.pg.conninfo = pg_conninfo_override;
            if (pg_table_override.has_value()) next.pg.table = pg_table_override.value();
            if (opcbridge_host_override.has_value()) next.opcbridge_host = opcbridge_host_override.value();
            if (opcbridge_http_port_override.has_value()) next.opcbridge_http_port = opcbridge_http_port_override.value();
            if (opcbridge_ws_port_override.has_value()) next.opcbridge_ws_port = opcbridge_ws_port_override.value();
            if (opcbridge_ws_path_override.has_value()) next.opcbridge_ws_path = opcbridge_ws_path_override.value();

            bool pg_changed = false;
            {
                std::lock_guard<std::mutex> cfgLock(cfgMutex);
                pg_changed =
                    next.pg.conninfo != cfg.pg.conninfo ||
                    next.pg.table != cfg.pg.table ||
                    next.pg.batch_size != cfg.pg.batch_size ||
                    next.pg.flush_interval_ms != cfg.pg.flush_interval_ms;

                cfg.enabled = next.enabled;
                cfg.opcbridge_host = next.opcbridge_host;
                cfg.opcbridge_http_port = next.opcbridge_http_port;
                cfg.opcbridge_ws_port = next.opcbridge_ws_port;
                cfg.opcbridge_ws_path = next.opcbridge_ws_path;
                cfg.subscribe_mode = next.subscribe_mode;
                cfg.tags = next.tags;
                cfg.patterns = next.patterns;
                cfg.change_only = next.change_only;
                cfg.snapshot = next.snapshot;
                cfg.historian_policy = next.historian_policy;
                cfg.pg.queue_limit = next.pg.queue_limit;
                cfg.historian_tags = next.historian_tags;
            }
            health.set_error("");
            if (!pg_changed)
            {
                std::string timescaleErr;
                std::lock_guard<std::mutex> pgLock(pgMutex);
                if (!writer.configure_timescale(next.historian_policy.resolution_tiers, timescaleErr))
                    throw std::runtime_error("TimescaleDB policy update failed: " + timescaleErr);
            }
            json j;
            j["ok"] = true;
            j["reloaded"] = true;
            j["enabled_tags"] = std::count_if(next.historian_tags.begin(), next.historian_tags.end(), [](const auto& r) { return r.enabled; });
            j["postgres_restart_required"] = pg_changed;
            if (pg_changed) {
                j["warning"] = "Postgres connection/table/batch settings changed and require service restart.";
            }
            res.set_content(j.dump(2), "application/json");
        }
        catch (const std::exception& ex)
        {
            health.set_error(std::string("reload failed: ") + ex.what());
            res.status = 400;
            res.set_content(json{{"ok", false}, {"error", std::string(ex.what())}}.dump(2), "application/json");
        }
    });
    healthServer.Get("/summary", [&](const httplib::Request& req, httplib::Response& res) {
        const std::string connectionId = req.has_param("connection_id") ? req.get_param_value("connection_id") : "";
        const std::string tagName = req.has_param("tag_name") ? req.get_param_value("tag_name") : "";
        if (connectionId.empty() || tagName.empty())
        {
            res.status = 400;
            res.set_content(json{{"ok", false}, {"error", "connection_id and tag_name are required"}}.dump(2), "application/json");
            return;
        }

        int64_t toMs = now_ms();
        int64_t fromMs = 0;
        if (req.has_param("to_ms") && !parse_int64(req.get_param_value("to_ms"), toMs))
        {
            res.status = 400;
            res.set_content(json{{"ok", false}, {"error", "Invalid to_ms"}}.dump(2), "application/json");
            return;
        }
        if (req.has_param("from_ms"))
        {
            if (!parse_int64(req.get_param_value("from_ms"), fromMs))
            {
                res.status = 400;
                res.set_content(json{{"ok", false}, {"error", "Invalid from_ms"}}.dump(2), "application/json");
                return;
            }
        }
        else
        {
            const std::string range = req.has_param("range") ? req.get_param_value("range") : "1h";
            if (!parse_range_ms(range, toMs, fromMs, toMs))
            {
                res.status = 400;
                res.set_content(json{{"ok", false}, {"error", "Invalid range. Use 15m, 1h, 1d, hour, day, month, or year."}}.dump(2), "application/json");
                return;
            }
        }
        if (fromMs > toMs) std::swap(fromMs, toMs);

        const bool goodOnly = !(req.has_param("include_bad_quality") && req.get_param_value("include_bad_quality") == "1");
        SummaryResult summary;
        std::string err;
        bool ok = false;
        {
            std::lock_guard<std::mutex> pgLock(pgMutex);
            ok = writer.query_summary(connectionId, tagName, fromMs, toMs, goodOnly, summary, err);
        }
        if (!ok)
        {
            health.set_error(err);
            health.db_connected.store(false);
            res.status = 500;
            res.set_content(json{{"ok", false}, {"error", err}}.dump(2), "application/json");
            return;
        }
        health.db_connected.store(true);

        json j;
        j["ok"] = true;
        j["connection_id"] = summary.connection_id;
        j["tag_name"] = summary.tag_name;
        if (summary.datatype.has_value()) j["datatype"] = summary.datatype.value();
        j["from_ms"] = summary.from_ms;
        j["to_ms"] = summary.to_ms;
        j["count"] = summary.count;
        j["last"] = optional_double_json(summary.last);
        j["min"] = optional_double_json(summary.min);
        j["max"] = optional_double_json(summary.max);
        j["avg"] = optional_double_json(summary.avg);
        j["twa"] = optional_double_json(summary.twa);
        j["include_bad_quality"] = !goodOnly;
        res.set_content(j.dump(2), "application/json");
    });
    healthServer.Get("/query", [&](const httplib::Request& req, httplib::Response& res) {
        const std::string connectionId = req.has_param("connection_id") ? req.get_param_value("connection_id") : "";
        const std::string tagName = req.has_param("tag_name") ? req.get_param_value("tag_name") : "";
        if (connectionId.empty() || tagName.empty())
        {
            res.status = 400;
            res.set_content(json{{"ok", false}, {"error", "connection_id and tag_name are required"}}.dump(2), "application/json");
            return;
        }

        int64_t toMs = now_ms();
        int64_t fromMs = 0;
        if (req.has_param("to_ms") && !parse_int64(req.get_param_value("to_ms"), toMs))
        {
            res.status = 400;
            res.set_content(json{{"ok", false}, {"error", "Invalid to_ms"}}.dump(2), "application/json");
            return;
        }
        if (req.has_param("from_ms"))
        {
            if (!parse_int64(req.get_param_value("from_ms"), fromMs))
            {
                res.status = 400;
                res.set_content(json{{"ok", false}, {"error", "Invalid from_ms"}}.dump(2), "application/json");
                return;
            }
        }
        else
        {
            const std::string range = req.has_param("range") ? req.get_param_value("range") : "1h";
            if (!parse_range_ms(range, toMs, fromMs, toMs))
            {
                res.status = 400;
                res.set_content(json{{"ok", false}, {"error", "Invalid range. Use 15m, 1h, 1d, hour, day, month, or year."}}.dump(2), "application/json");
                return;
            }
        }
        if (fromMs > toMs) std::swap(fromMs, toMs);

        int64_t limitRaw = 1000;
        if (req.has_param("limit") && !parse_int64(req.get_param_value("limit"), limitRaw))
        {
            res.status = 400;
            res.set_content(json{{"ok", false}, {"error", "Invalid limit"}}.dump(2), "application/json");
            return;
        }
        const int limit = static_cast<int>(std::max<int64_t>(1, std::min<int64_t>(100000, limitRaw)));
        const bool goodOnly = !(req.has_param("include_bad_quality") && req.get_param_value("include_bad_quality") == "1");
        std::string bucketParam = req.has_param("bucket") ? req.get_param_value("bucket") : "";
        int64_t bucketMs = -1;
        if (!bucketParam.empty() && bucketParam != "raw")
        {
            if (!parse_duration_ms(bucketParam, bucketMs))
            {
                res.status = 400;
                res.set_content(json{{"ok", false}, {"error", "Invalid bucket. Use raw, auto, 1m, 5m, 15m, 1h, or similar."}}.dump(2), "application/json");
                return;
            }
            if (bucketMs == 0) bucketMs = choose_auto_bucket_ms(fromMs, toMs);
        }

        if (bucketMs > 0)
        {
            std::vector<BucketPoint> buckets;
            std::string err;
            bool ok = false;
            {
                std::lock_guard<std::mutex> pgLock(pgMutex);
                ok = writer.query_buckets(connectionId, tagName, fromMs, toMs, goodOnly, bucketMs, limit, buckets, err);
            }
            if (!ok)
            {
                health.set_error(err);
                health.db_connected.store(false);
                res.status = 500;
                res.set_content(json{{"ok", false}, {"error", err}}.dump(2), "application/json");
                return;
            }
            health.db_connected.store(true);

            json arr = json::array();
            for (const auto& p : buckets)
            {
                json row;
                row["bucket_start_ms"] = p.bucket_start_ms;
                row["bucket_end_ms"] = p.bucket_end_ms;
                row["count"] = p.count;
                row["min"] = optional_double_json(p.min);
                row["max"] = optional_double_json(p.max);
                row["avg"] = optional_double_json(p.avg);
                arr.push_back(std::move(row));
            }

            json j;
            j["ok"] = true;
            j["connection_id"] = connectionId;
            j["tag_name"] = tagName;
            j["from_ms"] = fromMs;
            j["to_ms"] = toMs;
            j["limit"] = limit;
            j["bucket"] = bucketParam;
            j["bucket_ms"] = bucketMs;
            j["count"] = buckets.size();
            j["include_bad_quality"] = !goodOnly;
            j["buckets"] = std::move(arr);
            res.set_content(j.dump(2), "application/json");
            return;
        }

        std::vector<QueryPoint> points;
        std::string err;
        bool ok = false;
        {
            std::lock_guard<std::mutex> pgLock(pgMutex);
            ok = writer.query_points(connectionId, tagName, fromMs, toMs, goodOnly, limit, points, err);
        }
        if (!ok)
        {
            health.set_error(err);
            health.db_connected.store(false);
            res.status = 500;
            res.set_content(json{{"ok", false}, {"error", err}}.dump(2), "application/json");
            return;
        }
        health.db_connected.store(true);

        json arr = json::array();
        for (const auto& p : points)
        {
            json row;
            row["ts_ms"] = p.ts_ms;
            row["value"] = p.value;
            row["quality"] = p.quality.has_value() ? json(p.quality.value()) : json(nullptr);
            arr.push_back(std::move(row));
        }

        json j;
        j["ok"] = true;
        j["connection_id"] = connectionId;
        j["tag_name"] = tagName;
        j["from_ms"] = fromMs;
        j["to_ms"] = toMs;
        j["limit"] = limit;
        j["count"] = points.size();
        j["include_bad_quality"] = !goodOnly;
        j["points"] = std::move(arr);
        res.set_content(j.dump(2), "application/json");
    });
    std::thread healthThread([&]() {
        std::cout << "[historian] health API listening on 127.0.0.1:" << cfg.http_port << "\n";
        if (!healthServer.listen("127.0.0.1", cfg.http_port))
        {
            health.set_error("health API failed to listen on port " + std::to_string(cfg.http_port));
        }
    });

    std::thread flushThread([&]() {
        while (!stop.load())
        {
            int64_t flushIntervalMs = cfg.pg.flush_interval_ms;
            size_t batchSize = cfg.pg.batch_size;
            {
                std::lock_guard<std::mutex> cfgLock(cfgMutex);
                flushIntervalMs = cfg.pg.flush_interval_ms;
                batchSize = cfg.pg.batch_size;
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(flushIntervalMs));

            std::vector<Sample> batch;
            {
                std::lock_guard<std::mutex> lock(qMutex);
                if (queue.empty()) continue;
                const size_t n = std::min(queue.size(), batchSize);
                batch.insert(batch.end(),
                             std::make_move_iterator(queue.begin()),
                             std::make_move_iterator(queue.begin() + static_cast<std::ptrdiff_t>(n)));
                queue.erase(queue.begin(), queue.begin() + static_cast<std::ptrdiff_t>(n));
                health.queue_depth.store(queue.size());
            }

            std::string err;
            bool inserted = false;
            {
                std::lock_guard<std::mutex> pgLock(pgMutex);
                inserted = writer.insert_batch(batch, err);
            }
            if (!inserted)
            {
                std::cerr << "[historian] insert failed: " << err << "\n";
                health.db_connected.store(false);
                health.set_error(err);
                {
                    std::lock_guard<std::mutex> pgLock(pgMutex);
                    writer.close();
                }
                std::this_thread::sleep_for(std::chrono::milliseconds(1000));
                bool reconnected = false;
                {
                    std::lock_guard<std::mutex> pgLock(pgMutex);
                    reconnected = writer.connect(err);
                }
                if (!reconnected)
                {
                    std::cerr << "[historian] reconnect failed: " << err << "\n";
                    health.db_connected.store(false);
                    health.set_error(err);
                }
                else
                {
                    health.db_connected.store(true);
                }
            }
            else
            {
                health.db_connected.store(true);
                health.inserted_samples.fetch_add(batch.size());
                health.last_insert_ms.store(now_ms());
                health.set_error("");
            }
        }
    });

    std::thread snapshotThread;
    snapshotThread = std::thread([&]() {
            std::unordered_map<std::string, int64_t> nextDueByKey;
            std::unordered_map<std::string, double> lastValueByKey;
            while (!stop.load())
            {
                const int64_t started = now_ms();
                std::unordered_map<std::string, HistorianTagRule> dueRules;
                AppCfg cfgCopy;
                {
                    std::lock_guard<std::mutex> cfgLock(cfgMutex);
                    cfgCopy = cfg;
                }
                if (!cfgCopy.enabled || (cfgCopy.historian_tags.empty() && !cfgCopy.snapshot.enabled))
                {
                    std::this_thread::sleep_for(std::chrono::milliseconds(500));
                    continue;
                }
                std::vector<HistorianTagRule> rules = cfgCopy.historian_tags;
                for (auto& rule : rules)
                {
                    const std::string k = tag_key(rule.connection_id, rule.tag_name);
                    auto it = nextDueByKey.find(k);
                    rule.next_due_ms = (it == nextDueByKey.end()) ? started : it->second;
                }

                if (!rules.empty())
                {
                    for (auto& rule : rules)
                    {
                        if (!rule.enabled || rule.mode != "periodic") continue;
                        if (started < rule.next_due_ms) continue;
                        dueRules[tag_key(rule.connection_id, rule.tag_name)] = rule;
                        nextDueByKey[tag_key(rule.connection_id, rule.tag_name)] = started + std::max<int64_t>(1000, rule.interval_ms);
                    }
                    if (dueRules.empty())
                    {
                        std::this_thread::sleep_for(std::chrono::milliseconds(250));
                        continue;
                    }
                }

                httplib::Client cli(cfgCopy.opcbridge_host, cfgCopy.opcbridge_http_port);
                cli.set_read_timeout(20, 0);
                cli.set_connection_timeout(5, 0);
                auto res = cli.Get("/tags");
                if (res && res->status == 200)
                {
                    health.last_snapshot_ms.store(now_ms());
                    json body;
                    try { body = json::parse(res->body); } catch (...) { body = json(); }
                    if (body.is_object() && body.contains("tags") && body["tags"].is_array())
                    {
                        std::vector<std::string> keys;
                        if (rules.empty())
                        {
                            if (cfgCopy.subscribe_mode == "list") keys = cfgCopy.tags;
                            else if (cfgCopy.subscribe_mode == "patterns") keys = resolve_subscribe_tags_from_patterns(cfgCopy);
                        }

                        std::unordered_set<std::string> want;
                        if (!keys.empty())
                        {
                            want.reserve(keys.size());
                            for (const auto& k : keys) want.insert(k);
                        }

                        for (const auto& t : body["tags"])
                        {
                            Sample s;
                            if (!sample_from_tag_json(t, "snapshot", s)) continue;
                            const std::string k = tag_key(s.connection_id, s.tag_name);
                            if (!dueRules.empty())
                            {
                                auto it = dueRules.find(k);
                                if (it == dueRules.end()) continue;
                                if (!it->second.include_bad_quality && s.quality.has_value() && s.quality.value() != 1) continue;
                                if (!s.value_double.has_value()) continue;
                                const double deadband = std::max(0.0, it->second.deadband);
                                const auto previous = lastValueByKey.find(k);
                                if (deadband > 0.0 && previous != lastValueByKey.end()
                                    && std::abs(s.value_double.value() - previous->second) <= deadband) continue;
                                lastValueByKey[k] = s.value_double.value();
                            }
                            else if (!want.empty() && want.find(k) == want.end()) continue;
                            enqueue(std::move(s));
                        }
                    }
                }
                else
                {
                    health.set_error("snapshot fetch failed");
                }

                const int64_t elapsed = now_ms() - started;
                const int64_t sleepMs = rules.empty()
                    ? std::max<int64_t>(100, cfgCopy.snapshot.interval_ms - elapsed)
                    : 250;
                for (int64_t remaining = sleepMs; remaining > 0 && !stop.load(); remaining -= 100)
                {
                    std::this_thread::sleep_for(std::chrono::milliseconds(std::min<int64_t>(100, remaining)));
                }
            }
        });

    // Resolve subscription list if needed.
    std::vector<std::string> subscribeKeys;
    if (cfg.subscribe_mode == "list") subscribeKeys = cfg.tags;
    else if (cfg.subscribe_mode == "patterns") subscribeKeys = resolve_subscribe_tags_from_patterns(cfg);

    const std::string wsUrl =
        "ws://" + cfg.opcbridge_host + ":" + std::to_string(cfg.opcbridge_ws_port) +
        (cfg.opcbridge_ws_path.empty() ? "/" : cfg.opcbridge_ws_path) +
        ((cfg.opcbridge_ws_path.find('?') == std::string::npos) ? "?client=opcbridge-historian" : "&client=opcbridge-historian");

    ix::WebSocket ws;
    ws.setUrl(wsUrl);
    ws.disablePerMessageDeflate();

    ws.setOnMessageCallback([&](const ix::WebSocketMessagePtr& msg) {
        if (!msg) return;
        if (msg->type == ix::WebSocketMessageType::Open)
        {
            std::cout << "[historian] opcbridge WS connected: " << wsUrl << "\n";

            std::string subscribeMode;
            {
                std::lock_guard<std::mutex> cfgLock(cfgMutex);
                subscribeMode = cfg.subscribe_mode;
            }
            if (subscribeMode == "all")
            {
                // Server default is subscribe_all; message keeps intent explicit.
                json j; j["type"] = "subscribe_all";
                ws.send(j.dump());
                std::cout << "[historian] subscribe_mode=all\n";
            }
            else
            {
                json j;
                j["type"] = "subscribe";
                j["tags"] = subscribeKeys;
                ws.send(j.dump());
                std::cout << "[historian] subscribe_mode=" << subscribeMode
                          << " keys=" << subscribeKeys.size() << "\n";
            }
            return;
        }
        if (msg->type == ix::WebSocketMessageType::Close)
        {
            std::cout << "[historian] opcbridge WS closed: " << msg->closeInfo.code
                      << " " << msg->closeInfo.reason << "\n";
            return;
        }
        if (msg->type == ix::WebSocketMessageType::Error)
        {
            std::cerr << "[historian] opcbridge WS error: " << msg->errorInfo.reason << "\n";
            return;
        }
        if (msg->type != ix::WebSocketMessageType::Message) return;

        json payload;
        try { payload = json::parse(msg->str); }
        catch (...) { return; }

        if (!payload.is_object()) return;
        if (payload.value("type", "") != "tag_update") return;

        const std::string conn = payload.value("connection_id", "");
        const std::string name = payload.value("name", "");
        if (conn.empty() || name.empty()) return;

        HistorianTagRule selectedRule;
        bool selected = false;
        {
            std::lock_guard<std::mutex> cfgLock(cfgMutex);
            const auto it = std::find_if(cfg.historian_tags.begin(), cfg.historian_tags.end(), [&](const auto& rule) {
                return rule.enabled && rule.connection_id == conn && rule.tag_name == name;
            });
            if (it != cfg.historian_tags.end())
            {
                selectedRule = *it;
                selected = true;
            }
        }
        if (!selected) return;
        // Periodic selected tags are sampled by the independent snapshot
        // worker. Do not duplicate them from the live update stream.
        if (selectedRule.mode == "periodic") return;

        const int64_t ts = payload.value("timestamp_ms", now_ms());

        Sample s;
        s.ts_ms = ts;
        s.connection_id = conn;
        s.tag_name = name;
        if (payload.contains("datatype") && payload["datatype"].is_string()) s.datatype = payload["datatype"].get<std::string>();
        if (payload.contains("quality") && payload["quality"].is_number_integer()) s.quality = payload["quality"].get<int>();
        if (payload.contains("value")) value_to_fields(payload["value"], s.value_double, s.value_text, s.value_json);
        s.source = "ws";

        const std::string key = tag_key(conn, name);
        TagState& st = states[key]; // default init ok
        ChangeOnlyCfg changeOnly;
        {
            std::lock_guard<std::mutex> cfgLock(cfgMutex);
            changeOnly = cfg.change_only;
        }
        if (should_log_sample(changeOnly, ts, s.value_double, s.value_json, s.quality, st))
        {
            enqueue(std::move(s));
        }
    });

    ws.start();

    // Run until SIGINT (simple: wait on stdin EOF).
    std::cout << "[historian] running; press Ctrl+C to stop\n";
    while (std::cin.good())
    {
        std::this_thread::sleep_for(std::chrono::milliseconds(250));
    }

    stop.store(true);
    ws.stop();
    healthServer.stop();

    if (snapshotThread.joinable()) snapshotThread.join();
    if (flushThread.joinable()) flushThread.join();
    if (healthThread.joinable()) healthThread.join();

    writer.close();
    return 0;
}
