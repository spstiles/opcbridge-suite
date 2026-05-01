#include <atomic>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <mutex>
#include <optional>
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
};

struct AppCfg
{
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

static int64_t now_ms()
{
    using namespace std::chrono;
    return duration_cast<milliseconds>(system_clock::now().time_since_epoch()).count();
}

static bool has_glob_chars(const std::string& s)
{
    return s.find('*') != std::string::npos || s.find('?') != std::string::npos;
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
    cfg.opcbridge_host = root.value("opcbridge_host", cfg.opcbridge_host);
    cfg.opcbridge_http_port = static_cast<uint16_t>(root.value("opcbridge_http_port", cfg.opcbridge_http_port));
    cfg.opcbridge_ws_port = static_cast<uint16_t>(root.value("opcbridge_ws_port", cfg.opcbridge_ws_port));
    cfg.opcbridge_ws_path = root.value("opcbridge_ws_path", cfg.opcbridge_ws_path);

    cfg.subscribe_mode = root.value("subscribe_mode", cfg.subscribe_mode);
    if (root.contains("tags") && root["tags"].is_array())
    {
        for (const auto& t : root["tags"]) if (t.is_string()) cfg.tags.push_back(t.get<std::string>());
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

    if (cfg.pg.table.empty()) throw std::runtime_error("postgres.table is required.");
    if (cfg.pg.batch_size < 1) cfg.pg.batch_size = 1;
    if (cfg.pg.flush_interval_ms < 1) cfg.pg.flush_interval_ms = 1;

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
        return true;
    }

    void close()
    {
        if (conn_) PQfinish(conn_);
        conn_ = nullptr;
    }

    bool is_connected() const { return conn_ && PQstatus(conn_) == CONNECTION_OK; }

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

private:
    static void free_if_needed(char* p) { if (p) PQfreemem(p); }

    PgCfg cfg_;
    PGconn* conn_ = nullptr;
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

        const std::string key = conn + ":" + name;
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
    }

    std::mutex qMutex;
    std::vector<Sample> queue;
    queue.reserve(cfg.pg.batch_size * 2);

    std::atomic<bool> stop{false};

    std::unordered_map<std::string, TagState> states;
    states.reserve(16384);

    auto enqueue = [&](Sample s) {
        std::lock_guard<std::mutex> lock(qMutex);
        queue.push_back(std::move(s));
    };

    std::thread flushThread([&]() {
        while (!stop.load())
        {
            std::this_thread::sleep_for(std::chrono::milliseconds(cfg.pg.flush_interval_ms));

            std::vector<Sample> batch;
            {
                std::lock_guard<std::mutex> lock(qMutex);
                if (queue.empty()) continue;
                const size_t n = std::min(queue.size(), cfg.pg.batch_size);
                batch.insert(batch.end(),
                             std::make_move_iterator(queue.begin()),
                             std::make_move_iterator(queue.begin() + static_cast<std::ptrdiff_t>(n)));
                queue.erase(queue.begin(), queue.begin() + static_cast<std::ptrdiff_t>(n));
            }

            std::string err;
            if (!writer.insert_batch(batch, err))
            {
                std::cerr << "[historian] insert failed: " << err << "\n";
                writer.close();
                std::this_thread::sleep_for(std::chrono::milliseconds(1000));
                if (!writer.connect(err))
                {
                    std::cerr << "[historian] reconnect failed: " << err << "\n";
                }
            }
        }
    });

    std::thread snapshotThread;
    if (cfg.snapshot.enabled)
    {
        snapshotThread = std::thread([&]() {
            while (!stop.load())
            {
                const int64_t started = now_ms();

                std::vector<std::string> keys;
                if (cfg.subscribe_mode == "list") keys = cfg.tags;
                else if (cfg.subscribe_mode == "patterns") keys = resolve_subscribe_tags_from_patterns(cfg);

                std::unordered_set<std::string> want;
                if (!keys.empty())
                {
                    want.reserve(keys.size());
                    for (const auto& k : keys) want.insert(k);
                }

                httplib::Client cli(cfg.opcbridge_host, cfg.opcbridge_http_port);
                cli.set_read_timeout(20, 0);
                cli.set_connection_timeout(5, 0);
                auto res = cli.Get("/tags");
                if (res && res->status == 200)
                {
                    json body;
                    try { body = json::parse(res->body); } catch (...) { body = json(); }
                    if (body.is_object() && body.contains("tags") && body["tags"].is_array())
                    {
                        for (const auto& t : body["tags"])
                        {
                            if (!t.is_object()) continue;
                            const std::string conn = t.value("connection_id", "");
                            const std::string name = t.value("name", "");
                            if (conn.empty() || name.empty()) continue;
                            const std::string k = conn + ":" + name;
                            if (!want.empty() && want.find(k) == want.end()) continue;

                            if (!t.contains("timestamp_ms")) continue;
                            const int64_t ts = t["timestamp_ms"].get<int64_t>();

                            Sample s;
                            s.ts_ms = ts;
                            s.connection_id = conn;
                            s.tag_name = name;
                            if (t.contains("datatype") && t["datatype"].is_string()) s.datatype = t["datatype"].get<std::string>();
                            if (t.contains("quality") && t["quality"].is_number_integer()) s.quality = t["quality"].get<int>();
                            if (t.contains("value")) value_to_fields(t["value"], s.value_double, s.value_text, s.value_json);
                            s.source = "snapshot";
                            enqueue(std::move(s));
                        }
                    }
                }

                const int64_t elapsed = now_ms() - started;
                const int64_t sleepMs = std::max<int64_t>(100, cfg.snapshot.interval_ms - elapsed);
                for (int64_t remaining = sleepMs; remaining > 0 && !stop.load(); remaining -= 100)
                {
                    std::this_thread::sleep_for(std::chrono::milliseconds(std::min<int64_t>(100, remaining)));
                }
            }
        });
    }

    // Resolve subscription list if needed.
    std::vector<std::string> subscribeKeys;
    if (cfg.subscribe_mode == "list") subscribeKeys = cfg.tags;
    else if (cfg.subscribe_mode == "patterns") subscribeKeys = resolve_subscribe_tags_from_patterns(cfg);

    const std::string wsUrl =
        "ws://" + cfg.opcbridge_host + ":" + std::to_string(cfg.opcbridge_ws_port) +
        (cfg.opcbridge_ws_path.empty() ? "/" : cfg.opcbridge_ws_path);

    ix::WebSocket ws;
    ws.setUrl(wsUrl);
    ws.disablePerMessageDeflate();

    ws.setOnMessageCallback([&](const ix::WebSocketMessagePtr& msg) {
        if (!msg) return;
        if (msg->type == ix::WebSocketMessageType::Open)
        {
            std::cout << "[historian] opcbridge WS connected: " << wsUrl << "\n";

            if (cfg.subscribe_mode == "all")
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
                std::cout << "[historian] subscribe_mode=" << cfg.subscribe_mode
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

        const int64_t ts = payload.value("timestamp_ms", now_ms());

        Sample s;
        s.ts_ms = ts;
        s.connection_id = conn;
        s.tag_name = name;
        if (payload.contains("datatype") && payload["datatype"].is_string()) s.datatype = payload["datatype"].get<std::string>();
        if (payload.contains("quality") && payload["quality"].is_number_integer()) s.quality = payload["quality"].get<int>();
        if (payload.contains("value")) value_to_fields(payload["value"], s.value_double, s.value_text, s.value_json);
        s.source = "ws";

        const std::string key = conn + ":" + name;
        TagState& st = states[key]; // default init ok
        if (should_log_sample(cfg.change_only, ts, s.value_double, s.value_json, s.quality, st))
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

    if (snapshotThread.joinable()) snapshotThread.join();
    if (flushThread.joinable()) flushThread.join();

    writer.close();
    return 0;
}
