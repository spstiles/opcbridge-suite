#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <ifaddrs.h>
#include <mutex>
#include <net/if.h>
#include <optional>
#include <arpa/inet.h>
#include <random>
#include <string>
#include <thread>
#include <unordered_map>
#include <unordered_set>
#include <unistd.h>
#include <vector>

#include "../httplib.h"
#include <ixwebsocket/IXWebSocket.h>
#include <ixwebsocket/IXWebSocketServer.h>
#include <nlohmann/json.hpp>
#include <sqlite3.h>

extern "C" {
#if defined(__clang__)
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunused-parameter"
#elif defined(__GNUC__)
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-parameter"
#endif
#include "open62541.h"
#if defined(__clang__)
#pragma clang diagnostic pop
#elif defined(__GNUC__)
#pragma GCC diagnostic pop
#endif
}

using json = nlohmann::json;
using ix::WebSocketServer;

static int64_t now_ms()
{
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
}

static std::string random_hex(size_t bytes)
{
    static thread_local std::mt19937_64 rng{std::random_device{}()};
    std::uniform_int_distribution<uint32_t> dist(0, 255);
    static const char* hex = "0123456789abcdef";
    std::string out;
    out.reserve(bytes * 2);
    for (size_t i = 0; i < bytes; i++)
    {
        uint8_t b = static_cast<uint8_t>(dist(rng));
        out.push_back(hex[(b >> 4) & 0x0F]);
        out.push_back(hex[b & 0x0F]);
    }
    return out;
}

static std::string read_file(const std::string &path)
{
    std::ifstream ifs(path);
    if (!ifs) throw std::runtime_error("Failed to open file: " + path);
    return std::string((std::istreambuf_iterator<char>(ifs)),
                       std::istreambuf_iterator<char>());
}

struct AlarmDb
{
    std::mutex mu;
    sqlite3* db = nullptr;
    std::string path;

    bool open_or_create(const std::string& dbPath, std::string& err)
    {
        std::lock_guard<std::mutex> lock(mu);
        path = dbPath;

        int rc = sqlite3_open(dbPath.c_str(), &db);
        if (rc != SQLITE_OK)
        {
            err = sqlite3_errmsg(db);
            sqlite3_close(db);
            db = nullptr;
            return false;
        }

        const char* schema = R"SQL(
            CREATE TABLE IF NOT EXISTS alarm_events (
                event_id      TEXT PRIMARY KEY,
                ts_ms         INTEGER NOT NULL,
                alarm_id      TEXT NOT NULL,
                type          TEXT NOT NULL,
                severity      INTEGER NOT NULL,
                group_name    TEXT,
                site          TEXT,
                connection_id TEXT NOT NULL,
                tag           TEXT NOT NULL,
                value_json    TEXT,
                message       TEXT,
                actor         TEXT,
                note          TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_alarm_events_ts ON alarm_events(ts_ms);
            CREATE INDEX IF NOT EXISTS idx_alarm_events_alarm ON alarm_events(alarm_id, ts_ms);
            CREATE INDEX IF NOT EXISTS idx_alarm_events_tag ON alarm_events(connection_id, tag, ts_ms);
            CREATE INDEX IF NOT EXISTS idx_alarm_events_group_site ON alarm_events(group_name, site, ts_ms);
        )SQL";

        char* errmsg = nullptr;
        rc = sqlite3_exec(db, schema, nullptr, nullptr, &errmsg);
        if (rc != SQLITE_OK)
        {
            err = errmsg ? errmsg : "schema error";
            sqlite3_free(errmsg);
            sqlite3_close(db);
            db = nullptr;
            return false;
        }

        // Backward-compatible migrations (if DB existed before group/site columns).
        // Ignore errors (e.g., "duplicate column name") so we can start cleanly.
        sqlite3_exec(db, "ALTER TABLE alarm_events ADD COLUMN group_name TEXT;", nullptr, nullptr, nullptr);
        sqlite3_exec(db, "ALTER TABLE alarm_events ADD COLUMN site TEXT;", nullptr, nullptr, nullptr);

        return true;
    }

    void close()
    {
        std::lock_guard<std::mutex> lock(mu);
        if (db)
        {
            sqlite3_close(db);
            db = nullptr;
        }
    }

    bool insert_event(const json& event, std::string& err)
    {
        std::lock_guard<std::mutex> lock(mu);
        if (!db)
        {
            err = "DB not open";
            return false;
        }

        auto opt_string = [&](const char* key) -> std::string {
            if (!event.is_object() || !event.contains(key)) return "";
            const auto& v = event.at(key);
            if (v.is_string()) return v.get<std::string>();
            return "";
        };

        static const char* sql = R"SQL(
            INSERT INTO alarm_events (
                event_id, ts_ms, alarm_id, type, severity, group_name, site, connection_id, tag,
                value_json, message, actor, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        )SQL";

        sqlite3_stmt* stmt = nullptr;
        int rc = sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr);
        if (rc != SQLITE_OK)
        {
            err = sqlite3_errmsg(db);
            return false;
        }

        const std::string event_id = event.value("event_id", "");
        const int64_t ts_ms = event.value("ts_ms", 0LL);
        const std::string alarm_id = event.value("alarm_id", "");
        const std::string type = event.value("type", "");
        const int severity = event.value("severity", 0);
        const std::string group_name = opt_string("group");
        const std::string site = opt_string("site");
        const std::string connection_id = event.contains("source") ? event["source"].value("connection_id", "") : "";
        const std::string tag = event.contains("source") ? event["source"].value("tag", "") : "";
        const std::string value_json = event.contains("value") ? event["value"].dump() : "";
        const std::string message = opt_string("message");
        const std::string actor = opt_string("actor");
        const std::string note = opt_string("note");

        int idx = 1;
        sqlite3_bind_text(stmt, idx++, event_id.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int64(stmt, idx++, ts_ms);
        sqlite3_bind_text(stmt, idx++, alarm_id.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, idx++, type.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, idx++, severity);
        if (!group_name.empty()) sqlite3_bind_text(stmt, idx++, group_name.c_str(), -1, SQLITE_TRANSIENT);
        else sqlite3_bind_null(stmt, idx++);
        if (!site.empty()) sqlite3_bind_text(stmt, idx++, site.c_str(), -1, SQLITE_TRANSIENT);
        else sqlite3_bind_null(stmt, idx++);
        sqlite3_bind_text(stmt, idx++, connection_id.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, idx++, tag.c_str(), -1, SQLITE_TRANSIENT);

        if (!value_json.empty()) sqlite3_bind_text(stmt, idx++, value_json.c_str(), -1, SQLITE_TRANSIENT);
        else sqlite3_bind_null(stmt, idx++);

        if (!message.empty()) sqlite3_bind_text(stmt, idx++, message.c_str(), -1, SQLITE_TRANSIENT);
        else sqlite3_bind_null(stmt, idx++);

        if (!actor.empty()) sqlite3_bind_text(stmt, idx++, actor.c_str(), -1, SQLITE_TRANSIENT);
        else sqlite3_bind_null(stmt, idx++);

        if (!note.empty()) sqlite3_bind_text(stmt, idx++, note.c_str(), -1, SQLITE_TRANSIENT);
        else sqlite3_bind_null(stmt, idx++);

        rc = sqlite3_step(stmt);
        if (rc != SQLITE_DONE)
        {
            err = sqlite3_errmsg(db);
            sqlite3_finalize(stmt);
            return false;
        }

        sqlite3_finalize(stmt);
        return true;
    }

    bool fetch_events(const httplib::Request& req, json& out, std::string& err)
    {
        std::lock_guard<std::mutex> lock(mu);
        out = json::array();
        if (!db)
        {
            err = "DB not open";
            return false;
        }

        int limit = 500;
        if (req.has_param("limit"))
        {
            try { limit = std::stoi(req.get_param_value("limit")); } catch (...) {}
        }
        if (limit < 1) limit = 1;
        if (limit > 5000) limit = 5000;

        auto parse_i64_param = [&](const char* name, int64_t& outVal) -> bool {
            if (!req.has_param(name)) return false;
            try {
                outVal = std::stoll(req.get_param_value(name));
                return true;
            } catch (...) {
                outVal = 0;
                return false;
            }
        };

        const bool has_since = req.has_param("since_ms");
        const bool has_until = req.has_param("until_ms");
        const bool has_alarm = req.has_param("alarm_id");
        const bool has_conn  = req.has_param("connection_id");
        const bool has_tag   = req.has_param("tag");
        const bool has_types = req.has_param("types");


std::vector<std::string> typeList;
if (has_types)
{
    std::string s = req.get_param_value("types");
    size_t start = 0;
    while (start < s.size())
    {
        size_t comma = s.find(',', start);
        if (comma == std::string::npos) comma = s.size();
        std::string part = s.substr(start, comma - start);
        if (!part.empty()) typeList.push_back(part);
        start = comma + 1;
    }
}


auto make_sql = [&](bool withGroupSite) -> std::string {
    std::string sql = withGroupSite
        ? "SELECT event_id, ts_ms, alarm_id, type, severity, group_name, site, connection_id, tag, value_json, message, actor, note "
        : "SELECT event_id, ts_ms, alarm_id, type, severity, connection_id, tag, value_json, message, actor, note ";
    sql += "FROM alarm_events WHERE 1=1 ";

    if (has_since) sql += "AND ts_ms >= ? ";
    if (has_until) sql += "AND ts_ms <= ? ";
    if (has_alarm) sql += "AND alarm_id = ? ";
    if (has_conn)  sql += "AND connection_id = ? ";
    if (has_tag)   sql += "AND tag = ? ";

    if (!typeList.empty())
    {
        sql += "AND type IN (";
        for (size_t i = 0; i < typeList.size(); i++)
        {
            sql += (i == 0 ? "?" : ",?");
        }
        sql += ") ";
    }

    sql += "ORDER BY ts_ms DESC LIMIT ?;";
    return sql;
};


        bool withGroupSite = true;
        std::string sql = make_sql(withGroupSite);

        sqlite3_stmt* stmt = nullptr;
        int rc = sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr);

        if (rc != SQLITE_OK)
        {
            // Backward compatibility: older DBs may not have group_name/site columns.
            const std::string e = sqlite3_errmsg(db);
            if (e.find("no such column") != std::string::npos || e.find("has no column") != std::string::npos)
            {
                withGroupSite = false;
                sql = make_sql(withGroupSite);
                rc = sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr);
            }
        }

        if (rc != SQLITE_OK)
        {
            err = sqlite3_errmsg(db);
            return false;
        }

        int idx = 1;
        if (has_since) {
            int64_t v = 0;
            if (!parse_i64_param("since_ms", v)) { sqlite3_finalize(stmt); err = "Invalid since_ms"; return false; }
            sqlite3_bind_int64(stmt, idx++, v);
        }
        if (has_until) {
            int64_t v = 0;
            if (!parse_i64_param("until_ms", v)) { sqlite3_finalize(stmt); err = "Invalid until_ms"; return false; }
            sqlite3_bind_int64(stmt, idx++, v);
        }
        if (has_alarm) sqlite3_bind_text(stmt, idx++, req.get_param_value("alarm_id").c_str(), -1, SQLITE_TRANSIENT);
        if (has_conn)  sqlite3_bind_text(stmt, idx++, req.get_param_value("connection_id").c_str(), -1, SQLITE_TRANSIENT);
        if (has_tag)   sqlite3_bind_text(stmt, idx++, req.get_param_value("tag").c_str(), -1, SQLITE_TRANSIENT);
        for (const auto& t : typeList)
        {
            sqlite3_bind_text(stmt, idx++, t.c_str(), -1, SQLITE_TRANSIENT);
        }
        sqlite3_bind_int(stmt, idx++, limit);

        while ((rc = sqlite3_step(stmt)) == SQLITE_ROW)
        {
            json ev;
            ev["event_id"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
            ev["ts_ms"] = sqlite3_column_int64(stmt, 1);
            ev["alarm_id"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
            ev["type"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
            ev["severity"] = sqlite3_column_int(stmt, 4);

            const int col_group = withGroupSite ? 5 : -1;
            const int col_site = withGroupSite ? 6 : -1;
            const int col_conn = withGroupSite ? 7 : 5;
            const int col_tag  = withGroupSite ? 8 : 6;
            const int col_val  = withGroupSite ? 9 : 7;
            const int col_msg  = withGroupSite ? 10 : 8;
            const int col_actor= withGroupSite ? 11 : 9;
            const int col_note = withGroupSite ? 12 : 10;

            if (withGroupSite)
            {
                if (sqlite3_column_type(stmt, col_group) == SQLITE_NULL) ev["group"] = "";
                else ev["group"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_group));

                if (sqlite3_column_type(stmt, col_site) == SQLITE_NULL) ev["site"] = "";
                else ev["site"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_site));
            }
            else
            {
                ev["group"] = "";
                ev["site"] = "";
            }

            ev["source"] = {
                {"connection_id", reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_conn))},
                {"tag", reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_tag))}
            };

            if (sqlite3_column_type(stmt, col_val) == SQLITE_NULL) ev["value"] = nullptr;
            else
            {
                const char* v = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_val));
                try { ev["value"] = json::parse(v); } catch (...) { ev["value"] = v; }
            }

            if (sqlite3_column_type(stmt, col_msg) == SQLITE_NULL) ev["message"] = nullptr;
            else ev["message"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_msg));

            if (sqlite3_column_type(stmt, col_actor) == SQLITE_NULL) ev["actor"] = nullptr;
            else ev["actor"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_actor));

            if (sqlite3_column_type(stmt, col_note) == SQLITE_NULL) ev["note"] = nullptr;
            else ev["note"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_note));

            out.push_back(ev);
        }

        if (rc != SQLITE_DONE)
        {
            err = sqlite3_errmsg(db);
            sqlite3_finalize(stmt);
            return false;
        }

        sqlite3_finalize(stmt);
        return true;
    }
};

struct AlarmWs
{
    std::mutex mu;
    std::shared_ptr<WebSocketServer> server;
    std::unordered_map<std::string, std::weak_ptr<ix::WebSocket>> clientsById;
    std::atomic<bool> enabled{false};
    std::atomic<uint64_t> clients{0};

    std::function<json()> build_snapshot;

    bool start(uint16_t port, std::string& err)
    {
        std::lock_guard<std::mutex> lock(mu);
        if (server)
        {
            enabled.store(true);
            return true;
        }

        server = std::make_shared<WebSocketServer>(port, "0.0.0.0");

        server->setOnConnectionCallback([this](std::weak_ptr<ix::WebSocket> wsWeak,
                                               std::shared_ptr<ix::ConnectionState> connectionState)
        {
            if (!connectionState) return;
            auto ws = wsWeak.lock();
            if (!ws) return;
            const std::string id = connectionState->getId();

            {
                std::lock_guard<std::mutex> lock(mu);
                clientsById[id] = wsWeak;
                clients.store(clientsById.size());
            }

            ws->setOnMessageCallback([this, connectionState](const ix::WebSocketMessagePtr& msg) {
                if (!msg) return;
                if (msg->type == ix::WebSocketMessageType::Open)
                {
                    // Send snapshot on connect.
                    if (build_snapshot)
                    {
                        json snap;
                        try { snap = build_snapshot(); } catch (...) { snap = json::object(); }
                        try {
                            ws_broadcast_one(connectionState, snap);
                        } catch (...) {}
                    }
                    return;
                }
                if (msg->type == ix::WebSocketMessageType::Close || msg->type == ix::WebSocketMessageType::Error)
                {
                    const std::string cid = connectionState ? connectionState->getId() : "";
                    if (!cid.empty())
                    {
                        std::lock_guard<std::mutex> lock(mu);
                        clientsById.erase(cid);
                        clients.store(clientsById.size());
                    }
                    return;
                }
                // Ignore messages for now (future: subscribe filters)
            });
        });

        auto res = server->listen();
        if (!res.first)
        {
            err = res.second;
            server.reset();
            enabled.store(false);
            return false;
        }

        server->disablePerMessageDeflate();
        server->start();
        enabled.store(true);
        return true;
    }

    void stop()
    {
        std::lock_guard<std::mutex> lock(mu);
        if (server)
        {
            server->stop();
            server.reset();
        }
        clientsById.clear();
        clients.store(0);
        enabled.store(false);
    }

    void broadcast(const json& msg)
    {
        std::vector<std::shared_ptr<ix::WebSocket>> sockets;
        {
            std::lock_guard<std::mutex> lock(mu);
            sockets.reserve(clientsById.size());
            for (auto it = clientsById.begin(); it != clientsById.end(); )
            {
                auto ws = it->second.lock();
                if (!ws)
                {
                    it = clientsById.erase(it);
                    continue;
                }
                sockets.push_back(ws);
                ++it;
            }
            clients.store(clientsById.size());
        }

        if (sockets.empty()) return;
        const std::string payload = msg.dump();
        for (auto& ws : sockets)
        {
            ws->send(payload);
        }
    }

private:
    void ws_broadcast_one(const std::shared_ptr<ix::ConnectionState>& connectionState, const json& msg)
    {
        if (!connectionState) return;
        std::shared_ptr<ix::WebSocket> ws;
        {
            std::lock_guard<std::mutex> lock(mu);
            auto it = clientsById.find(connectionState->getId());
            if (it == clientsById.end()) return;
            ws = it->second.lock();
        }
        if (!ws) return;
        ws->send(msg.dump());
    }
};

struct AlarmRule
{
    std::string id;
    std::string name;
    std::string group;
    std::string site;
    bool enabled = true;
    int severity = 500;
    std::string connection_id;
    std::string tag;
    std::string condition_type; // "equals" | "high" | "low"
    json condition_value;       // used for equals
    double threshold = 0.0;     // used for high/low
    double hysteresis = 0.0;    // used for high/low
    std::string message_on_active;
    std::string message_on_return;
};

struct AlarmState
{
    std::string alarm_id;
    std::string name;
    std::string group;
    std::string site;
    int severity = 500;
    bool enabled = true;

    bool active = false;
    bool acked = false;
    std::optional<int64_t> shelved_until_ms;

    int64_t active_since_ms = 0;
    int64_t last_change_ms = 0;

    std::string connection_id;
    std::string tag;
    json last_value;
    std::string message;

    // Operator-facing configured messages (copied from rule)
    std::string message_on_active;
    std::string message_on_return;
};

static json alarm_state_to_json(const AlarmState &s)
{
    json j;
    j["alarm_id"] = s.alarm_id;
    j["name"] = s.name;
    j["group"] = s.group;
    j["site"] = s.site;
    j["severity"] = s.severity;
    j["enabled"] = s.enabled;
    j["active"] = s.active;
    j["acked"] = s.acked;
    if (s.shelved_until_ms.has_value())
        j["shelved_until_ms"] = s.shelved_until_ms.value();
    else
        j["shelved_until_ms"] = nullptr;
    j["active_since_ms"] = s.active_since_ms;
    j["last_change_ms"] = s.last_change_ms;
    j["source"] = {{"connection_id", s.connection_id}, {"tag", s.tag}};
    j["last_value"] = s.last_value;
    j["message"] = s.message;
    j["message_on_active"] = s.message_on_active;
    j["message_on_return"] = s.message_on_return;
    return j;
}

static bool json_equalish(const json &a, const json &b)
{
    if (a.type() == b.type()) return a == b;
    if (a.is_number() && b.is_number()) return a.get<double>() == b.get<double>();
    if (a.is_boolean() && b.is_number()) return (a.get<bool>() ? 1.0 : 0.0) == b.get<double>();
    if (a.is_number() && b.is_boolean()) return a.get<double>() == (b.get<bool>() ? 1.0 : 0.0);
    if (a.is_string() && b.is_string()) return a.get<std::string>() == b.get<std::string>();
    return a.dump() == b.dump();
}

static std::optional<double> coerce_number(const json &v)
{
    try {
        if (v.is_number_float()) return v.get<double>();
        if (v.is_number_integer()) return static_cast<double>(v.get<int64_t>());
        if (v.is_number_unsigned()) return static_cast<double>(v.get<uint64_t>());
        if (v.is_boolean()) return v.get<bool>() ? 1.0 : 0.0;
        if (v.is_string()) {
            const std::string s = v.get<std::string>();
            size_t idx = 0;
            double d = std::stod(s, &idx);
            if (idx == 0) return std::nullopt;
            return d;
        }
    } catch (...) {
        return std::nullopt;
    }
    return std::nullopt;
}

struct AlarmEngine;

struct AlarmUa
{
    std::atomic<bool> enabled{false};
    uint16_t port = 4841;

    bool start(uint16_t portIn, AlarmEngine* engineIn, std::string& err);
    void stop();

    void sync_alarms(const std::vector<AlarmState>& states);
    void upsert_alarm(const AlarmState& state);

private:
    struct AlarmNodes
    {
        UA_NodeId objectId{UA_NODEID_NULL};
        UA_NodeId id{UA_NODEID_NULL};
        UA_NodeId name{UA_NODEID_NULL};
        UA_NodeId message{UA_NODEID_NULL};
        UA_NodeId severity{UA_NODEID_NULL};
        UA_NodeId enabledVar{UA_NODEID_NULL};
        UA_NodeId active{UA_NODEID_NULL};
        UA_NodeId acked{UA_NODEID_NULL};
        UA_NodeId shelvedUntil{UA_NODEID_NULL};
        UA_NodeId activeSince{UA_NODEID_NULL};
        UA_NodeId lastChange{UA_NODEID_NULL};
        UA_NodeId connectionId{UA_NODEID_NULL};
        UA_NodeId tag{UA_NODEID_NULL};
        UA_NodeId lastValue{UA_NODEID_NULL};
    };

    enum class MethodAction { Ack, Shelve, Unshelve };

    struct MethodContext
    {
        AlarmUa* ua = nullptr;
        AlarmEngine* engine = nullptr;
        std::string alarm_id;
        MethodAction action{MethodAction::Ack};
    };

    std::mutex mu;
    std::condition_variable cv;
    bool stopFlag = false;
    std::vector<AlarmState> pending;

    AlarmEngine* engine = nullptr;
    UA_Server* server = nullptr;
    UA_UInt16 ns = 0;
    UA_NodeId alarmsFolderId{UA_NODEID_NULL};
    std::unordered_map<std::string, AlarmNodes> nodesById;
    std::vector<std::unique_ptr<MethodContext>> methodContexts;
    std::thread thread;

    static UA_StatusCode method_callback(UA_Server* server,
                                         const UA_NodeId* sessionId, void* sessionContext,
                                         const UA_NodeId* methodId, void* methodContext,
                                         const UA_NodeId* objectId, void* objectContext,
                                         size_t inputSize, const UA_Variant* input,
                                         size_t outputSize, UA_Variant* output);

    void ua_thread_main();
    void ensure_server_locked();
    void ensure_alarm_nodes_locked(const AlarmState& s);
    void write_alarm_locked(const AlarmState& s);
};

struct AlarmEngine
{
    mutable std::mutex mu;
    std::unordered_map<std::string, AlarmRule> rules;      // by alarm_id
    std::unordered_map<std::string, AlarmState> states;    // by alarm_id
    std::unordered_map<std::string, std::vector<std::string>> rulesByTagKey; // "conn:tag" -> alarm_ids

    std::atomic<int64_t> last_tag_update_ms{0};
    std::atomic<int64_t> last_alarm_change_ms{0};

    std::atomic<int64_t> last_config_mtime_ms{-1};
    AlarmDb* db = nullptr;
    AlarmWs* ws = nullptr;
    AlarmUa* ua = nullptr;

    void set_db(AlarmDb* ptr) { db = ptr; }
    void set_ws(AlarmWs* ptr) { ws = ptr; }
    void set_ua(AlarmUa* ptr) { ua = ptr; }

	    void log_event(const AlarmState& s,
	                   const std::string& type,
	                   const json& value,
	                   const std::string& actor = "",
	                   const std::string& note = "")
	    {
	        json ev;
	        ev["event_id"] = "evt_" + random_hex(16);
        ev["ts_ms"] = now_ms();
        ev["alarm_id"] = s.alarm_id;
        ev["type"] = type;
        ev["severity"] = s.severity;
        ev["group"] = s.group;
        ev["site"] = s.site;
        ev["source"] = {{"connection_id", s.connection_id}, {"tag", s.tag}};
        ev["value"] = value;
        ev["message"] = s.message.empty() ? nullptr : json(s.message);
	        if (!actor.empty()) ev["actor"] = actor;
	        if (!note.empty()) ev["note"] = note;
	        if (db)
	        {
	            std::string err;
	            if (!db->insert_event(ev, err))
	            {
                std::cerr << "[alarms] DB insert failed: " << err << "\n";
            }
        }

        if (ws && ws->enabled.load())
        {
            json msg;
            msg["type"] = "alarm_event";
            msg["event"] = ev;
            ws->broadcast(msg);
        }
    }

    void load_rules_from_file(const std::string &path)
    {
        json root = json::parse(read_file(path));
        if (!root.is_object())
        {
            throw std::runtime_error("Invalid alarms.json; expected a JSON object.");
        }

        std::unordered_map<std::string, AlarmRule> nextRules;
        std::unordered_map<std::string, AlarmState> nextStates;
        std::unordered_map<std::string, std::vector<std::string>> nextByKey;

        json rulesArr = json::array();
        if (root.contains("rules") && root["rules"].is_array())
        {
            rulesArr = root["rules"];
        }
        else if (root.contains("alarms") && root["alarms"].is_array())
        {
            // Backward-compatible: accept opcbridge's alarms.json schema:
            // { "alarms": [ { id, connection_id, tag_name, type, threshold, hysteresis, enabled }, ... ] }
            rulesArr = json::array();
            for (const auto &a : root["alarms"])
            {
                if (!a.is_object()) continue;
                const std::string type = a.value("type", "");
                json r;
                r["id"] = a.value("id", "");
                r["name"] = a.value("name", a.value("description", a.value("id", "")));
                r["enabled"] = a.value("enabled", true);
                r["severity"] = a.value("severity", 500);
                r["message_on_active"] = a.value("message_on_active", a.value("message", ""));
                r["message_on_return"] = a.value("message_on_return", "");
                r["group"] = a.value("group", "");
                r["site"] = a.value("site", "");
                r["source"] = {
                    {"connection_id", a.value("connection_id", "")},
                    {"tag", a.value("tag_name", "")}
                };
                r["condition"] = {{"type", type}};
                if (type == "equals")
                {
                    if (a.contains("value")) r["condition"]["value"] = a["value"];
                    else if (a.contains("equals_value")) r["condition"]["value"] = a["equals_value"];
                }
                else if (type == "high" || type == "low")
                {
                    if (a.contains("threshold")) r["condition"]["threshold"] = a["threshold"];
                    if (a.contains("hysteresis")) r["condition"]["hysteresis"] = a["hysteresis"];
                }
                rulesArr.push_back(r);
            }
        }
        else
        {
            throw std::runtime_error("Invalid alarms.json; expected {\"rules\":[...]} or {\"alarms\":[...]}");
        }

        for (const auto &it : rulesArr)
        {
            if (!it.is_object()) continue;
            AlarmRule r;
            r.id = it.value("id", "");
            r.name = it.value("name", r.id);
            r.group = it.value("group", "");
            r.site = it.value("site", "");
            r.enabled = it.value("enabled", true);
            r.severity = it.value("severity", 500);
            if (it.contains("source") && it["source"].is_object())
            {
                r.connection_id = it["source"].value("connection_id", "");
                r.tag = it["source"].value("tag", "");
            }
            if (it.contains("condition") && it["condition"].is_object())
            {
                r.condition_type = it["condition"].value("type", "equals");
                if (r.condition_type == "equals")
                {
                    r.condition_value = it["condition"].contains("value") ? it["condition"]["value"] : json();
                }
                else if (r.condition_type == "high" || r.condition_type == "low")
                {
                    r.threshold = it["condition"].value("threshold", 0.0);
                    r.hysteresis = it["condition"].value("hysteresis", 0.0);
                }
            }
            r.message_on_active = it.value("message_on_active", "");
            r.message_on_return = it.value("message_on_return", "");

            if (r.id.empty() || r.connection_id.empty() || r.tag.empty()) continue;

            nextRules[r.id] = r;

            AlarmState s;
            s.alarm_id = r.id;
            s.name = r.name;
            s.group = r.group;
            s.site = r.site;
            s.severity = r.severity;
            s.enabled = r.enabled;
            s.connection_id = r.connection_id;
            s.tag = r.tag;
            s.active = false;
            s.acked = false;
            s.active_since_ms = 0;
            s.last_change_ms = 0;
            s.last_value = nullptr;
            s.message = "";
            s.message_on_active = r.message_on_active;
            s.message_on_return = r.message_on_return;
            nextStates[r.id] = s;

            const std::string key = r.connection_id + ":" + r.tag;
            nextByKey[key].push_back(r.id);
        }

        {
            std::lock_guard<std::mutex> lock(mu);
            rules.swap(nextRules);
            states.swap(nextStates);
            rulesByTagKey.swap(nextByKey);
        }

        if (ua)
        {
            std::vector<AlarmState> snap;
            {
                std::lock_guard<std::mutex> lock(mu);
                snap.reserve(states.size());
                for (const auto& kv : states) snap.push_back(kv.second);
            }
            ua->sync_alarms(snap);
        }
    }

    std::vector<std::string> subscription_keys() const
    {
        std::lock_guard<std::mutex> lock(mu);
        std::vector<std::string> keys;
        keys.reserve(rulesByTagKey.size());
        for (const auto &kv : rulesByTagKey) keys.push_back(kv.first);
        return keys;
    }

    void apply_tag_update(const std::string &connection_id, const std::string &tag, const json &value)
    {
        last_tag_update_ms.store(now_ms());
        const std::string key = connection_id + ":" + tag;

        std::vector<AlarmState> changed;
        {
            std::lock_guard<std::mutex> lock(mu);
            auto it = rulesByTagKey.find(key);
            if (it == rulesByTagKey.end()) return;

            for (const auto &alarmId : it->second)
            {
                auto rit = rules.find(alarmId);
                auto sit = states.find(alarmId);
                if (rit == rules.end() || sit == states.end()) continue;

                const AlarmRule &r = rit->second;
                AlarmState &s = sit->second;
                s.last_value = value;

                const int64_t t = now_ms();
                const bool shelved = s.shelved_until_ms.has_value() && t < s.shelved_until_ms.value();
                const bool can_eval = r.enabled && !shelved;

                bool should_be_active = false;
                if (can_eval)
                {
                    if (r.condition_type == "equals")
                    {
                        should_be_active = json_equalish(value, r.condition_value);
                    }
                    else if (r.condition_type == "high" || r.condition_type == "low")
                    {
                        auto num = coerce_number(value);
                        if (num.has_value())
                        {
                            const double x = num.value();
                            const double h = r.hysteresis;
                            if (r.condition_type == "high")
                            {
                                if (!s.active) should_be_active = (x >= r.threshold);
                                else should_be_active = !(x <= (r.threshold - h));
                            }
                            else
                            {
                                if (!s.active) should_be_active = (x <= r.threshold);
                                else should_be_active = !(x >= (r.threshold + h));
                            }
                        }
                    }
                }

                if (should_be_active && !s.active)
                {
                    s.active = true;
                    s.acked = false;
                    s.active_since_ms = t;
                    s.last_change_ms = t;
                    s.message = r.message_on_active.empty() ? s.name : r.message_on_active;
                    last_alarm_change_ms.store(t);
                    std::cout << "[alarms] ACTIVE " << s.alarm_id
                              << " (" << s.connection_id << ":" << s.tag << ")"
                              << " value=" << s.last_value.dump()
                              << " severity=" << s.severity << "\n";
                    log_event(s, "active", s.last_value);
                    if (ws && ws->enabled.load()) {
                        json msg;
                        msg["type"] = "alarm_state";
                        msg["ts_ms"] = t;
                        msg["alarm"] = alarm_state_to_json(s);
                        ws->broadcast(msg);
                    }
                    changed.push_back(s);
                }
                else if (!should_be_active && s.active)
                {
                    s.active = false;
                    s.last_change_ms = t;
                    s.message = r.message_on_return.empty() ? "" : r.message_on_return;
                    last_alarm_change_ms.store(t);
                    std::cout << "[alarms] RETURN " << s.alarm_id
                              << " (" << s.connection_id << ":" << s.tag << ")"
                              << " value=" << s.last_value.dump() << "\n";
                    log_event(s, "return", s.last_value);
                    if (ws && ws->enabled.load()) {
                        json msg;
                        msg["type"] = "alarm_state";
                        msg["ts_ms"] = t;
                        msg["alarm"] = alarm_state_to_json(s);
                        ws->broadcast(msg);
                    }
                    changed.push_back(s);
                }
            }
        }

        if (ua)
        {
            for (const auto& s : changed) ua->upsert_alarm(s);
        }
    }

    bool ack(const std::string &alarm_id, const std::string& actor = "", const std::string& note = "")
    {
        AlarmState snapshot;
        {
            std::lock_guard<std::mutex> lock(mu);
            auto it = states.find(alarm_id);
            if (it == states.end()) return false;
            it->second.acked = true;
            it->second.last_change_ms = now_ms();
            last_alarm_change_ms.store(it->second.last_change_ms);
            log_event(it->second, "ack", it->second.last_value, actor, note);
            if (ws && ws->enabled.load()) {
                json msg;
                msg["type"] = "alarm_state";
                msg["ts_ms"] = it->second.last_change_ms;
                msg["alarm"] = alarm_state_to_json(it->second);
                ws->broadcast(msg);
            }
            snapshot = it->second;
        }
        if (ua) ua->upsert_alarm(snapshot);
        return true;
    }

    bool shelve(const std::string &alarm_id, int64_t until_ms, const std::string& actor = "", const std::string& note = "")
    {
        AlarmState snapshot;
        {
            std::lock_guard<std::mutex> lock(mu);
            auto it = states.find(alarm_id);
            if (it == states.end()) return false;
            it->second.shelved_until_ms = until_ms;
            it->second.last_change_ms = now_ms();
            last_alarm_change_ms.store(it->second.last_change_ms);
            json v;
            v["until_ms"] = until_ms;
            log_event(it->second, "shelve", v, actor, note);
            if (ws && ws->enabled.load()) {
                json msg;
                msg["type"] = "alarm_state";
                msg["ts_ms"] = it->second.last_change_ms;
                msg["alarm"] = alarm_state_to_json(it->second);
                ws->broadcast(msg);
            }
            snapshot = it->second;
        }
        if (ua) ua->upsert_alarm(snapshot);
        return true;
    }

    bool unshelve(const std::string &alarm_id, const std::string& actor = "", const std::string& note = "")
    {
        AlarmState snapshot;
        {
            std::lock_guard<std::mutex> lock(mu);
            auto it = states.find(alarm_id);
            if (it == states.end()) return false;
            it->second.shelved_until_ms.reset();
            it->second.last_change_ms = now_ms();
            last_alarm_change_ms.store(it->second.last_change_ms);
            log_event(it->second, "unshelve", it->second.last_value, actor, note);
            if (ws && ws->enabled.load()) {
                json msg;
                msg["type"] = "alarm_state";
                msg["ts_ms"] = it->second.last_change_ms;
                msg["alarm"] = alarm_state_to_json(it->second);
                ws->broadcast(msg);
            }
            snapshot = it->second;
        }
        if (ua) ua->upsert_alarm(snapshot);
        return true;
    }

    json get_active(bool only_unacked) const
    {
        std::lock_guard<std::mutex> lock(mu);
        json out = json::array();
        for (const auto &kv : states)
        {
            const AlarmState &s = kv.second;
            if (!s.enabled) continue;
            if (!s.active) continue;
            if (only_unacked && s.acked) continue;
            out.push_back(alarm_state_to_json(s));
        }
        return out;
    }

    void counts(int &active, int &unacked, int &shelved, int &disabled) const
    {
        std::lock_guard<std::mutex> lock(mu);
        active = unacked = shelved = disabled = 0;
        const int64_t t = now_ms();
        for (const auto &kv : states)
        {
            const AlarmState &s = kv.second;
            if (!s.enabled) disabled++;
            if (s.shelved_until_ms.has_value() && t < s.shelved_until_ms.value()) shelved++;
            if (s.active) active++;
            if (s.active && !s.acked) unacked++;
        }
    }
};

// -----------------------------
// OPC UA (open62541) server for alarms
// -----------------------------

static std::string ua_string_to_std(const UA_String& s)
{
    if (!s.data || s.length == 0) return "";
    return std::string(reinterpret_cast<const char*>(s.data), s.length);
}

static void ua_write_scalar(UA_Server* server, const UA_NodeId& nodeId, const void* data, const UA_DataType* type)
{
    UA_Variant v;
    UA_Variant_init(&v);
    UA_Variant_setScalarCopy(&v, data, type);
    (void)UA_Server_writeValue(server, nodeId, v);
    UA_Variant_clear(&v);
}

static void ua_write_string(UA_Server* server, const UA_NodeId& nodeId, const std::string& value)
{
    UA_String s = UA_STRING(const_cast<char*>(value.c_str()));
    UA_Variant v;
    UA_Variant_init(&v);
    UA_Variant_setScalarCopy(&v, &s, &UA_TYPES[UA_TYPES_STRING]);
    (void)UA_Server_writeValue(server, nodeId, v);
    UA_Variant_clear(&v);
}

static std::string get_hostname()
{
    char buf[256];
    buf[0] = '\0';
    if (gethostname(buf, sizeof(buf) - 1) != 0) return "opcbridge-alarms";
    buf[sizeof(buf) - 1] = '\0';
    std::string out(buf);
    if (out.empty()) out = "opcbridge-alarms";
    return out;
}

static std::string get_primary_ipv4()
{
    struct ifaddrs* ifaddr = nullptr;
    if (getifaddrs(&ifaddr) != 0 || !ifaddr) return "127.0.0.1";

    std::string best = "127.0.0.1";
    for (auto* it = ifaddr; it; it = it->ifa_next)
    {
        if (!it->ifa_addr) continue;
        if (it->ifa_addr->sa_family != AF_INET) continue;
        if (!(it->ifa_flags & IFF_UP)) continue;
        if (it->ifa_flags & IFF_LOOPBACK) continue;

        char addr[INET_ADDRSTRLEN];
        const auto* sa = reinterpret_cast<const sockaddr_in*>(it->ifa_addr);
        if (!inet_ntop(AF_INET, &sa->sin_addr, addr, sizeof(addr))) continue;
        best = addr;
        break;
    }

    freeifaddrs(ifaddr);
    return best;
}

bool AlarmUa::start(uint16_t portIn, AlarmEngine* engineIn, std::string& err)
{
    std::lock_guard<std::mutex> lock(mu);
    if (enabled.load()) return true;
    if (!engineIn)
    {
        err = "missing engine";
        return false;
    }
    port = portIn;
    engine = engineIn;
    stopFlag = false;
    pending.clear();
    methodContexts.clear();
    nodesById.clear();
    enabled.store(true);
    thread = std::thread([this]() { ua_thread_main(); });
    return true;
}

void AlarmUa::stop()
{
    {
        std::lock_guard<std::mutex> lock(mu);
        if (!enabled.load()) return;
        stopFlag = true;
        cv.notify_all();
    }
    if (thread.joinable()) thread.join();
    enabled.store(false);
}

void AlarmUa::sync_alarms(const std::vector<AlarmState>& states)
{
    if (!enabled.load()) return;
    {
        std::lock_guard<std::mutex> lock(mu);
        for (const auto& s : states) pending.push_back(s);
    }
    cv.notify_all();
}

void AlarmUa::upsert_alarm(const AlarmState& state)
{
    if (!enabled.load()) return;
    {
        std::lock_guard<std::mutex> lock(mu);
        pending.push_back(state);
        if (pending.size() > 10000) pending.erase(pending.begin(), pending.begin() + 5000);
    }
    cv.notify_all();
}

UA_StatusCode AlarmUa::method_callback(UA_Server* /*server*/,
                                      const UA_NodeId* /*sessionId*/, void* /*sessionContext*/,
                                      const UA_NodeId* /*methodId*/, void* methodContext,
                                      const UA_NodeId* /*objectId*/, void* /*objectContext*/,
                                      size_t inputSize, const UA_Variant* input,
                                      size_t outputSize, UA_Variant* output)
{
    auto* ctx = static_cast<MethodContext*>(methodContext);
    if (!ctx || !ctx->engine)
        return UA_STATUSCODE_BADINTERNALERROR;

    auto read_string = [&](size_t i) -> std::string {
        if (!input || i >= inputSize) return "";
        if (!UA_Variant_hasScalarType(&input[i], &UA_TYPES[UA_TYPES_STRING])) return "";
        const UA_String* s = static_cast<const UA_String*>(input[i].data);
        return s ? ua_string_to_std(*s) : "";
    };

    auto read_i64 = [&](size_t i) -> int64_t {
        if (!input || i >= inputSize) return 0;
        if (UA_Variant_hasScalarType(&input[i], &UA_TYPES[UA_TYPES_INT64]))
        {
            return *static_cast<const UA_Int64*>(input[i].data);
        }
        if (UA_Variant_hasScalarType(&input[i], &UA_TYPES[UA_TYPES_UINT64]))
        {
            return static_cast<int64_t>(*static_cast<const UA_UInt64*>(input[i].data));
        }
        if (UA_Variant_hasScalarType(&input[i], &UA_TYPES[UA_TYPES_INT32]))
        {
            return static_cast<int64_t>(*static_cast<const UA_Int32*>(input[i].data));
        }
        if (UA_Variant_hasScalarType(&input[i], &UA_TYPES[UA_TYPES_UINT32]))
        {
            return static_cast<int64_t>(*static_cast<const UA_UInt32*>(input[i].data));
        }
        return 0;
    };

    bool ok = false;
    if (ctx->action == MethodAction::Ack)
    {
        const std::string actor = read_string(0);
        const std::string note = read_string(1);
        ok = ctx->engine->ack(ctx->alarm_id, actor, note);
    }
    else if (ctx->action == MethodAction::Unshelve)
    {
        const std::string actor = read_string(0);
        const std::string note = read_string(1);
        ok = ctx->engine->unshelve(ctx->alarm_id, actor, note);
    }
    else if (ctx->action == MethodAction::Shelve)
    {
        const int64_t duration_ms = read_i64(0);
        const std::string actor = read_string(1);
        const std::string note = read_string(2);
        if (duration_ms > 0)
        {
            const int64_t until_ms = now_ms() + duration_ms;
            ok = ctx->engine->shelve(ctx->alarm_id, until_ms, actor, note);
        }
    }

    if (output && outputSize >= 1)
    {
        UA_Boolean outOk = ok ? UA_TRUE : UA_FALSE;
        UA_Variant_setScalarCopy(&output[0], &outOk, &UA_TYPES[UA_TYPES_BOOLEAN]);
    }

    return UA_STATUSCODE_GOOD;
}

void AlarmUa::ua_thread_main()
{
    server = UA_Server_new();
    if (!server)
    {
        std::cerr << "[alarms] OPC UA: UA_Server_new failed\n";
        enabled.store(false);
        return;
    }

    UA_ServerConfig* config = UA_Server_getConfig(server);
    UA_ServerConfig_setMinimal(config, port, nullptr);
    ns = UA_Server_addNamespace(server, "opcbridge-alarms");

    // Replace open62541's default application name ("open62541-based ...") with something human-friendly.
    const std::string appName = get_hostname() + "@" + get_primary_ipv4();
    UA_LocalizedText_clear(&config->applicationDescription.applicationName);
    config->applicationDescription.applicationName = UA_LOCALIZEDTEXT_ALLOC("en-US", appName.c_str());

    // Keep these stable and non-default to avoid confusing UA clients.
    UA_String_clear(&config->applicationDescription.applicationUri);
    UA_String_clear(&config->applicationDescription.productUri);
    config->applicationDescription.applicationUri = UA_STRING_ALLOC(("urn:" + appName).c_str());
    config->applicationDescription.productUri = UA_STRING_ALLOC("urn:opcbridge-alarms");

    // Create root folder: Objects/Alarms
    {
        UA_ObjectAttributes attr = UA_ObjectAttributes_default;
        attr.displayName = UA_LOCALIZEDTEXT_ALLOC("en-US", "Alarms");

        UA_Server_addObjectNode(
            server,
            UA_NODEID_NULL,
            UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER),
            UA_NODEID_NUMERIC(0, UA_NS0ID_ORGANIZES),
            UA_QUALIFIEDNAME(ns, (char*)"Alarms"),
            UA_NODEID_NUMERIC(0, UA_NS0ID_FOLDERTYPE),
            attr,
            nullptr,
            &alarmsFolderId
        );
        UA_LocalizedText_clear(&attr.displayName);
    }

    const UA_StatusCode startupRc = UA_Server_run_startup(server);
    if (startupRc != UA_STATUSCODE_GOOD)
    {
        std::cerr << "[alarms] OPC UA: startup failed (status 0x" << std::hex << startupRc << std::dec << ")\n";
        UA_Server_delete(server);
        server = nullptr;
        enabled.store(false);
        return;
    }

    while (true)
    {
        std::vector<AlarmState> batch;
        {
            std::unique_lock<std::mutex> lock(mu);
            cv.wait_for(lock, std::chrono::milliseconds(250), [&]() { return stopFlag || !pending.empty(); });
            if (stopFlag) break;
            batch.swap(pending);
        }

        // Coalesce by alarm_id (last writer wins)
        std::unordered_map<std::string, AlarmState> latest;
        latest.reserve(batch.size());
        for (auto& s : batch) latest[s.alarm_id] = std::move(s);

        for (const auto& kv : latest)
        {
            ensure_alarm_nodes_locked(kv.second);
            write_alarm_locked(kv.second);
        }

        UA_Server_run_iterate(server, false);
    }

    (void)UA_Server_run_shutdown(server);
    UA_Server_delete(server);
    server = nullptr;
}

void AlarmUa::ensure_server_locked()
{
    // No-op: server is created in ua_thread_main; writes happen only there.
}

void AlarmUa::ensure_alarm_nodes_locked(const AlarmState& s)
{
    if (!server) return;
    if (s.alarm_id.empty()) return;
    if (nodesById.find(s.alarm_id) != nodesById.end()) return;

    AlarmNodes nodes;

    // Alarm object under Alarms folder
    {
        const std::string displayName = s.name.empty() ? s.alarm_id : s.name;
        UA_ObjectAttributes attr = UA_ObjectAttributes_default;
        attr.displayName = UA_LOCALIZEDTEXT_ALLOC("en-US", displayName.c_str());

        UA_Server_addObjectNode(
            server,
            UA_NODEID_NULL,
            alarmsFolderId,
            UA_NODEID_NUMERIC(0, UA_NS0ID_ORGANIZES),
            UA_QUALIFIEDNAME(ns, (char*)s.alarm_id.c_str()),
            UA_NODEID_NUMERIC(0, UA_NS0ID_BASEOBJECTTYPE),
            attr,
            nullptr,
            &nodes.objectId
        );
        UA_LocalizedText_clear(&attr.displayName);
    }

    auto add_bool = [&](const char* browse, UA_NodeId& outId) {
        UA_VariableAttributes attr = UA_VariableAttributes_default;
        UA_Boolean init = UA_FALSE;
        UA_Variant_setScalarCopy(&attr.value, &init, &UA_TYPES[UA_TYPES_BOOLEAN]);
        attr.displayName = UA_LOCALIZEDTEXT_ALLOC("en-US", browse);
        UA_Server_addVariableNode(
            server, UA_NODEID_NULL, nodes.objectId,
            UA_NODEID_NUMERIC(0, UA_NS0ID_HASCOMPONENT),
            UA_QUALIFIEDNAME(ns, (char*)browse),
            UA_NODEID_NUMERIC(0, UA_NS0ID_BASEDATAVARIABLETYPE),
            attr, nullptr, &outId);
        UA_LocalizedText_clear(&attr.displayName);
    };

    auto add_i32 = [&](const char* browse, UA_NodeId& outId) {
        UA_VariableAttributes attr = UA_VariableAttributes_default;
        UA_Int32 init = 0;
        UA_Variant_setScalarCopy(&attr.value, &init, &UA_TYPES[UA_TYPES_INT32]);
        attr.displayName = UA_LOCALIZEDTEXT_ALLOC("en-US", browse);
        UA_Server_addVariableNode(
            server, UA_NODEID_NULL, nodes.objectId,
            UA_NODEID_NUMERIC(0, UA_NS0ID_HASCOMPONENT),
            UA_QUALIFIEDNAME(ns, (char*)browse),
            UA_NODEID_NUMERIC(0, UA_NS0ID_BASEDATAVARIABLETYPE),
            attr, nullptr, &outId);
        UA_LocalizedText_clear(&attr.displayName);
    };

    auto add_i64 = [&](const char* browse, UA_NodeId& outId) {
        UA_VariableAttributes attr = UA_VariableAttributes_default;
        UA_Int64 init = 0;
        UA_Variant_setScalarCopy(&attr.value, &init, &UA_TYPES[UA_TYPES_INT64]);
        attr.displayName = UA_LOCALIZEDTEXT_ALLOC("en-US", browse);
        UA_Server_addVariableNode(
            server, UA_NODEID_NULL, nodes.objectId,
            UA_NODEID_NUMERIC(0, UA_NS0ID_HASCOMPONENT),
            UA_QUALIFIEDNAME(ns, (char*)browse),
            UA_NODEID_NUMERIC(0, UA_NS0ID_BASEDATAVARIABLETYPE),
            attr, nullptr, &outId);
        UA_LocalizedText_clear(&attr.displayName);
    };

    auto add_string = [&](const char* browse, UA_NodeId& outId) {
        UA_VariableAttributes attr = UA_VariableAttributes_default;
        UA_String init = UA_STRING(const_cast<char*>(""));
        UA_Variant_setScalarCopy(&attr.value, &init, &UA_TYPES[UA_TYPES_STRING]);
        attr.displayName = UA_LOCALIZEDTEXT_ALLOC("en-US", browse);
        UA_Server_addVariableNode(
            server, UA_NODEID_NULL, nodes.objectId,
            UA_NODEID_NUMERIC(0, UA_NS0ID_HASCOMPONENT),
            UA_QUALIFIEDNAME(ns, (char*)browse),
            UA_NODEID_NUMERIC(0, UA_NS0ID_BASEDATAVARIABLETYPE),
            attr, nullptr, &outId);
        UA_LocalizedText_clear(&attr.displayName);
    };

    add_string("AlarmId", nodes.id);
    add_string("Name", nodes.name);
    add_string("Message", nodes.message);
    add_i32("Severity", nodes.severity);
    add_bool("Enabled", nodes.enabledVar);
    add_bool("Active", nodes.active);
    add_bool("Acked", nodes.acked);
    add_i64("ShelvedUntilMs", nodes.shelvedUntil);
    add_i64("ActiveSinceMs", nodes.activeSince);
    add_i64("LastChangeMs", nodes.lastChange);
    add_string("ConnectionId", nodes.connectionId);
    add_string("Tag", nodes.tag);
    add_string("LastValue", nodes.lastValue);

    auto add_method = [&](const char* browse,
                          MethodAction action,
                          const std::vector<std::pair<std::string, UA_UInt32>>& inputs,
                          const std::vector<std::pair<std::string, UA_UInt32>>& outputs)
    {
        UA_MethodAttributes attr = UA_MethodAttributes_default;
        attr.displayName = UA_LOCALIZEDTEXT_ALLOC("en-US", browse);
        attr.executable = true;
        attr.userExecutable = true;

        std::vector<UA_Argument> inArgs;
        inArgs.resize(inputs.size());
        for (size_t i = 0; i < inputs.size(); i++)
        {
            UA_Argument_init(&inArgs[i]);
            inArgs[i].name = UA_STRING_ALLOC(inputs[i].first.c_str());
            inArgs[i].description = UA_LOCALIZEDTEXT_ALLOC("en-US", inputs[i].first.c_str());
            inArgs[i].dataType = UA_TYPES[inputs[i].second].typeId;
            inArgs[i].valueRank = -1;
        }

        std::vector<UA_Argument> outArgs;
        outArgs.resize(outputs.size());
        for (size_t i = 0; i < outputs.size(); i++)
        {
            UA_Argument_init(&outArgs[i]);
            outArgs[i].name = UA_STRING_ALLOC(outputs[i].first.c_str());
            outArgs[i].description = UA_LOCALIZEDTEXT_ALLOC("en-US", outputs[i].first.c_str());
            outArgs[i].dataType = UA_TYPES[outputs[i].second].typeId;
            outArgs[i].valueRank = -1;
        }

        auto ctx = std::make_unique<MethodContext>();
        ctx->ua = this;
        ctx->engine = engine;
        ctx->alarm_id = s.alarm_id;
        ctx->action = action;
        MethodContext* ctxRaw = ctx.get();
        methodContexts.push_back(std::move(ctx));

        UA_NodeId methodId = UA_NODEID_NULL;
        UA_Server_addMethodNode(
            server,
            UA_NODEID_NULL,
            nodes.objectId,
            UA_NODEID_NUMERIC(0, UA_NS0ID_HASCOMPONENT),
            UA_QUALIFIEDNAME(ns, (char*)browse),
            attr,
            &AlarmUa::method_callback,
            inArgs.size(), inArgs.data(),
            outArgs.size(), outArgs.data(),
            ctxRaw,
            &methodId
        );

        UA_LocalizedText_clear(&attr.displayName);
        for (auto& a : inArgs) { UA_LocalizedText_clear(&a.description); UA_String_clear(&a.name); }
        for (auto& a : outArgs) { UA_LocalizedText_clear(&a.description); UA_String_clear(&a.name); }
    };

    add_method(
        "Ack",
        MethodAction::Ack,
        {{"actor", UA_TYPES_STRING}, {"note", UA_TYPES_STRING}},
        {{"ok", UA_TYPES_BOOLEAN}}
    );
    add_method(
        "Shelve",
        MethodAction::Shelve,
        {{"duration_ms", UA_TYPES_INT64}, {"actor", UA_TYPES_STRING}, {"note", UA_TYPES_STRING}},
        {{"ok", UA_TYPES_BOOLEAN}}
    );
    add_method(
        "Unshelve",
        MethodAction::Unshelve,
        {{"actor", UA_TYPES_STRING}, {"note", UA_TYPES_STRING}},
        {{"ok", UA_TYPES_BOOLEAN}}
    );

    nodesById[s.alarm_id] = nodes;
}

void AlarmUa::write_alarm_locked(const AlarmState& s)
{
    if (!server) return;
    const auto it = nodesById.find(s.alarm_id);
    if (it == nodesById.end()) return;
    const AlarmNodes& n = it->second;

    ua_write_string(server, n.id, s.alarm_id);
    ua_write_string(server, n.name, s.name.empty() ? s.alarm_id : s.name);
    ua_write_string(server, n.message, s.message);

    UA_Int32 sev = static_cast<UA_Int32>(s.severity);
    UA_Boolean en = s.enabled ? UA_TRUE : UA_FALSE;
    UA_Boolean act = s.active ? UA_TRUE : UA_FALSE;
    UA_Boolean ack = s.acked ? UA_TRUE : UA_FALSE;
    UA_Int64 shelveUntil = s.shelved_until_ms.has_value() ? static_cast<UA_Int64>(s.shelved_until_ms.value()) : 0;
    UA_Int64 activeSince = static_cast<UA_Int64>(s.active_since_ms);
    UA_Int64 lastChange = static_cast<UA_Int64>(s.last_change_ms);

    ua_write_scalar(server, n.severity, &sev, &UA_TYPES[UA_TYPES_INT32]);
    ua_write_scalar(server, n.enabledVar, &en, &UA_TYPES[UA_TYPES_BOOLEAN]);
    ua_write_scalar(server, n.active, &act, &UA_TYPES[UA_TYPES_BOOLEAN]);
    ua_write_scalar(server, n.acked, &ack, &UA_TYPES[UA_TYPES_BOOLEAN]);
    ua_write_scalar(server, n.shelvedUntil, &shelveUntil, &UA_TYPES[UA_TYPES_INT64]);
    ua_write_scalar(server, n.activeSince, &activeSince, &UA_TYPES[UA_TYPES_INT64]);
    ua_write_scalar(server, n.lastChange, &lastChange, &UA_TYPES[UA_TYPES_INT64]);

    ua_write_string(server, n.connectionId, s.connection_id);
    ua_write_string(server, n.tag, s.tag);
    ua_write_string(server, n.lastValue, s.last_value.is_null() ? "" : s.last_value.dump());
}

static void ws_client_loop(std::atomic<bool> &stop,
                           AlarmEngine &engine,
                           const std::string &wsUrl,
                           std::atomic<uint64_t> &subscriptionGeneration)
{
    ix::WebSocket ws;
    ws.setUrl(wsUrl);
    ws.disablePerMessageDeflate();

    std::atomic<bool> connected{false};
    uint64_t lastSentGeneration = 0;

    auto send_subscribe = [&]() {
        json sub;
        sub["type"] = "subscribe";
        sub["tags"] = engine.subscription_keys();
        ws.send(sub.dump());
        std::cout << "[alarms] Sent opcbridge subscribe (" << sub["tags"].size() << " tag(s))\n";
    };

    ws.setOnMessageCallback([&](const ix::WebSocketMessagePtr &msg) {
        if (!msg) return;

        if (msg->type == ix::WebSocketMessageType::Open)
        {
            connected.store(true);
            std::cout << "[alarms] opcbridge WS connected\n";
            lastSentGeneration = subscriptionGeneration.load();
            send_subscribe();
            return;
        }
        if (msg->type == ix::WebSocketMessageType::Close)
        {
            connected.store(false);
            std::cout << "[alarms] opcbridge WS closed: "
                      << msg->closeInfo.code << " " << msg->closeInfo.reason << "\n";
            return;
        }
        if (msg->type == ix::WebSocketMessageType::Error)
        {
            connected.store(false);
            std::cerr << "[alarms] opcbridge WS error: " << msg->errorInfo.reason << "\n";
            return;
        }
        if (msg->type != ix::WebSocketMessageType::Message) return;

        json payload;
        try {
            payload = json::parse(msg->str);
        } catch (...) {
            return;
        }

        if (!payload.is_object()) return;
        if (payload.value("type", "") != "tag_update") return;

        const std::string conn = payload.value("connection_id", "");
        const std::string tag = payload.value("name", "");
        if (conn.empty() || tag.empty()) return;
        engine.apply_tag_update(conn, tag, payload.contains("value") ? payload["value"] : json());
    });

    ws.start();

    while (!stop.load())
    {
        std::this_thread::sleep_for(std::chrono::milliseconds(250));
        if (!connected.load()) continue;
        const uint64_t gen = subscriptionGeneration.load();
        if (gen != lastSentGeneration)
        {
            lastSentGeneration = gen;
            send_subscribe();
        }
    }

    ws.stop();
}

static bool fetch_rules_from_opcbridge(AlarmEngine &engine,
                                      const std::string &host,
                                      uint16_t port,
                                      const std::string &adminToken,
                                      std::string &err)
{
    httplib::Client cli(host, port);
    cli.set_read_timeout(5, 0);
    cli.set_connection_timeout(5, 0);

    httplib::Headers headers;
    if (!adminToken.empty()) {
        headers.emplace("X-Admin-Token", adminToken);
    }

    auto res = cli.Get("/config/alarms", headers);
    if (!res) {
        err = "Failed to connect to opcbridge HTTP.";
        return false;
    }
    if (res->status != 200) {
        err = "opcbridge returned HTTP " + std::to_string(res->status);
        return false;
    }

    json body;
    try {
        body = json::parse(res->body);
    } catch (...) {
        err = "Invalid JSON from /config/alarms";
        return false;
    }

    if (!body.is_object() || !body.value("ok", false)) {
        err = body.value("error", "opcbridge returned ok=false");
        return false;
    }
    if (!body.contains("json")) {
        err = "Missing json field in /config/alarms response";
        return false;
    }

    const int64_t mtime = body.contains("mtime_ms") && body["mtime_ms"].is_number_integer()
        ? body["mtime_ms"].get<int64_t>()
        : -1;

    const int64_t currentMtime = engine.last_config_mtime_ms.load();
    if (currentMtime != -1 && mtime != -1 && mtime == currentMtime)
    {
        // No config change; do not reset runtime state.
        return true;
    }

    json rulesRoot = body["json"];
    if (!rulesRoot.is_object()) {
        err = "alarms.json must be an object";
        return false;
    }

    // Accept either schema:
    // - {"rules":[...]} (alarm-server style)
    // - {"alarms":[...]} (opcbridge style)
    if (!rulesRoot.contains("rules") && !rulesRoot.contains("alarms")) {
        // default empty
        rulesRoot["rules"] = json::array();
    }

    // Serialize to reuse existing loader/parser.
    const std::string tmp = rulesRoot.dump(2);
    try {
        std::unordered_map<std::string, AlarmRule> nextRules;
        std::unordered_map<std::string, AlarmState> nextStates;
        std::unordered_map<std::string, std::vector<std::string>> nextByKey;

        // Normalize into an array of rule objects.
        json rulesArr = json::array();
        if (rulesRoot.contains("rules") && rulesRoot["rules"].is_array())
        {
            rulesArr = rulesRoot["rules"];
        }
        else if (rulesRoot.contains("alarms") && rulesRoot["alarms"].is_array())
        {
            rulesArr = json::array();
            for (const auto &a : rulesRoot["alarms"])
            {
                if (!a.is_object()) continue;
                const std::string type = a.value("type", "");

                json r;
                r["id"] = a.value("id", "");
                r["name"] = a.value("name", a.value("id", ""));
                r["enabled"] = a.value("enabled", true);
                r["severity"] = a.value("severity", 500);
                r["message_on_active"] = a.value("message_on_active", a.value("message", ""));
                r["message_on_return"] = a.value("message_on_return", "");
                r["group"] = a.value("group", "");
                r["site"] = a.value("site", "");
                r["source"] = {
                    {"connection_id", a.value("connection_id", "")},
                    {"tag", a.value("tag_name", "")}
                };
                r["condition"] = {{"type", type}};
                if (type == "equals")
                {
                    if (a.contains("value")) r["condition"]["value"] = a["value"];
                    else if (a.contains("equals_value")) r["condition"]["value"] = a["equals_value"];
                }
                else if (type == "high" || type == "low")
                {
                    if (a.contains("threshold")) r["condition"]["threshold"] = a["threshold"];
                    if (a.contains("hysteresis")) r["condition"]["hysteresis"] = a["hysteresis"];
                }
                rulesArr.push_back(r);
            }
        }

        if (!rulesArr.is_array()) throw std::runtime_error("rules must be an array");
        for (const auto &it : rulesArr)
        {
            if (!it.is_object()) continue;
            AlarmRule r;
            r.id = it.value("id", "");
            r.name = it.value("name", r.id);
            r.group = it.value("group", "");
            r.site = it.value("site", "");
            r.enabled = it.value("enabled", true);
            r.severity = it.value("severity", 500);
            if (it.contains("source") && it["source"].is_object())
            {
                r.connection_id = it["source"].value("connection_id", "");
                r.tag = it["source"].value("tag", "");
            }
            if (it.contains("condition") && it["condition"].is_object())
            {
                r.condition_type = it["condition"].value("type", "equals");
                if (r.condition_type == "equals")
                {
                    r.condition_value = it["condition"].contains("value") ? it["condition"]["value"] : json();
                }
                else if (r.condition_type == "high" || r.condition_type == "low")
                {
                    r.threshold = it["condition"].value("threshold", 0.0);
                    r.hysteresis = it["condition"].value("hysteresis", 0.0);
                }
            }
            r.message_on_active = it.value("message_on_active", "");
            r.message_on_return = it.value("message_on_return", "");

            if (r.id.empty() || r.connection_id.empty() || r.tag.empty()) continue;
            nextRules[r.id] = r;

            AlarmState s;
            s.alarm_id = r.id;
            s.name = r.name;
            s.group = r.group;
            s.site = r.site;
            s.severity = r.severity;
            s.enabled = r.enabled;
            s.connection_id = r.connection_id;
            s.tag = r.tag;
            s.active = false;
            s.acked = false;
            s.active_since_ms = 0;
            s.last_change_ms = 0;
            s.last_value = nullptr;
            s.message = "";
            s.message_on_active = r.message_on_active;
            s.message_on_return = r.message_on_return;
            nextStates[r.id] = s;

            const std::string key = r.connection_id + ":" + r.tag;
            nextByKey[key].push_back(r.id);
        }

        std::lock_guard<std::mutex> lock(engine.mu);
        engine.rules.swap(nextRules);
        engine.states.swap(nextStates);
        engine.rulesByTagKey.swap(nextByKey);
        engine.last_config_mtime_ms.store(mtime);
    } catch (const std::exception &ex) {
        err = std::string("Failed to apply rules: ") + ex.what();
        return false;
    }

    if (engine.ua)
    {
        std::vector<AlarmState> snap;
        {
            std::lock_guard<std::mutex> lock(engine.mu);
            snap.reserve(engine.states.size());
            for (const auto& kv : engine.states) snap.push_back(kv.second);
        }
        engine.ua->sync_alarms(snap);
    }

    (void)tmp;
    return true;
}

int main(int argc, char **argv)
{
    std::cout.setf(std::ios::unitbuf);
    std::cerr.setf(std::ios::unitbuf);

    std::string configDir = "config";
    std::string opcbridgeHost = "127.0.0.1";
    uint16_t opcbridgeWsPort = 8090;
    uint16_t opcbridgeHttpPort = 8080;
    uint16_t httpPort = 8085;
    bool wsMode = false;
    uint16_t wsPort = 8086;
    bool opcuaMode = false;
    uint16_t opcuaPort = 4841;
    std::string adminToken;
    std::atomic<bool> rulesFromOpcbridge{false};

    for (int i = 1; i < argc; ++i)
    {
        std::string arg = argv[i];
        if (arg == "--config" && i + 1 < argc) configDir = argv[++i];
        else if (arg == "--opcbridge-host" && i + 1 < argc) opcbridgeHost = argv[++i];
        else if (arg == "--opcbridge-ws-port" && i + 1 < argc) opcbridgeWsPort = static_cast<uint16_t>(std::stoi(argv[++i]));
        else if (arg == "--opcbridge-http-port" && i + 1 < argc) opcbridgeHttpPort = static_cast<uint16_t>(std::stoi(argv[++i]));
        else if (arg == "--http-port" && i + 1 < argc) httpPort = static_cast<uint16_t>(std::stoi(argv[++i]));
        else if (arg == "--ws") wsMode = true;
        else if (arg == "--ws-port" && i + 1 < argc) { wsPort = static_cast<uint16_t>(std::stoi(argv[++i])); wsMode = true; }
        else if (arg == "--opcua") opcuaMode = true;
        else if (arg == "--opcua-port" && i + 1 < argc) { opcuaPort = static_cast<uint16_t>(std::stoi(argv[++i])); opcuaMode = true; }
        else if (arg == "--admin-token" && i + 1 < argc) adminToken = argv[++i];
        else if (arg == "--version" || arg == "-V")
        {
            std::cout << "opcbridge-alarms version " << OPCBRIDGE_ALARMS_VERSION
                      << " (" << __DATE__ << " " << __TIME__ << ")\n";
            return 0;
        }
    }

    const std::string alarmsPath = configDir + "/alarms.json";
    const std::string alarmsExamplePath = configDir + "/alarms.json.example";

    AlarmEngine engine;
    AlarmDb db;
    AlarmWs wsServer;
    AlarmUa uaServer;
    try
    {
        const char* env = std::getenv("OPCBRIDGE_ADMIN_SERVICE_TOKEN");
        if (adminToken.empty() && env && *env) adminToken = std::string(env);

        std::string err;
        bool loadedFromOpcbridge = false;
        if (!adminToken.empty())
        {
            loadedFromOpcbridge = fetch_rules_from_opcbridge(engine, opcbridgeHost, opcbridgeHttpPort, adminToken, err);
            if (!loadedFromOpcbridge) {
                std::cerr << "[alarms] Failed to load alarms from opcbridge: " << err << "\n";
            }
        }

        if (!loadedFromOpcbridge)
        {
            try {
                engine.load_rules_from_file(alarmsPath);
            } catch (...) {
                engine.load_rules_from_file(alarmsExamplePath);
            }
        }

        rulesFromOpcbridge.store(loadedFromOpcbridge);
    }
    catch (const std::exception &ex)
    {
        std::cerr << "[alarms] Failed to load rules: " << ex.what() << "\n";
        return 1;
    }

    // Open history DB in <configDir>/data/alarms.db
    {
        const std::string dataDir = configDir + "/data";
        std::error_code ec;
        std::filesystem::create_directories(dataDir, ec);
        std::string err;
        if (!db.open_or_create(dataDir + "/alarms.db", err)) {
            std::cerr << "[alarms] DB open failed: " << err << "\n";
        } else {
            std::cout << "[alarms] DB: " << db.path << "\n";
        }
        engine.set_db(&db);
    }
    engine.set_ws(&wsServer);
    engine.set_ua(&uaServer);

    if (opcuaMode)
    {
        std::string err;
        if (!uaServer.start(opcuaPort, &engine, err))
        {
            std::cerr << "[alarms] OPC UA start failed on port " << opcuaPort << ": " << err << "\n";
        }
        else
        {
            std::vector<AlarmState> snap;
            {
                std::lock_guard<std::mutex> lock(engine.mu);
                snap.reserve(engine.states.size());
                for (const auto& kv : engine.states) snap.push_back(kv.second);
            }
            uaServer.sync_alarms(snap);
            std::cout << "[alarms] OPC UA listening on opc.tcp://0.0.0.0:" << opcuaPort << "\n";
        }
    }

    if (wsMode)
    {
        wsServer.build_snapshot = [&engine]() -> json {
            json arr = json::array();
            {
                std::lock_guard<std::mutex> lock(engine.mu);
                for (const auto& kv : engine.states) arr.push_back(alarm_state_to_json(kv.second));
            }
            json snap;
            snap["type"] = "snapshot";
            snap["ts_ms"] = now_ms();
            snap["alarms"] = arr;
            return snap;
        };

        std::string err;
        if (!wsServer.start(wsPort, err))
        {
            std::cerr << "[alarms] WS start failed on port " << wsPort << ": " << err << "\n";
        }
        else
        {
            std::cout << "[alarms] WS listening on ws://0.0.0.0:" << wsPort << "\n";
        }
    }

    const std::string wsUrl = "ws://" + opcbridgeHost + ":" + std::to_string(opcbridgeWsPort);
    std::cout << "[alarms] opcbridge WS: " << wsUrl << "\n";
    std::cout << "[alarms] opcbridge HTTP: http://" << opcbridgeHost << ":" << opcbridgeHttpPort << "\n";
    {
        const auto keys = engine.subscription_keys();
        std::cout << "[alarms] Rules loaded from " << (rulesFromOpcbridge.load() ? "opcbridge" : "local file/example")
                  << " (" << keys.size() << " subscription key(s))\n";
    }

    const int64_t startMs = now_ms();
    std::atomic<bool> stop{false};
    std::atomic<uint64_t> subscriptionGeneration{1};
    std::thread wsThread([&]() { ws_client_loop(stop, engine, wsUrl, subscriptionGeneration); });

    std::thread configThread([&]() {
        if (adminToken.empty()) return;
        while (!stop.load())
        {
            std::this_thread::sleep_for(std::chrono::seconds(5));
            std::string err;
            const int64_t prev = engine.last_config_mtime_ms.load();
            if (!fetch_rules_from_opcbridge(engine, opcbridgeHost, opcbridgeHttpPort, adminToken, err)) {
                continue;
            }
            if (!rulesFromOpcbridge.load()) {
                rulesFromOpcbridge.store(true);
                std::cout << "[alarms] Now loading rules from opcbridge\n";
            }
            const int64_t next = engine.last_config_mtime_ms.load();
            if (next != prev) {
                subscriptionGeneration.fetch_add(1);
                std::cout << "[alarms] Reloaded alarms.json from opcbridge (mtime change)\n";
            }
        }
    });

    httplib::Server svr;

    svr.Get("/alarm/api/status", [&](const httplib::Request &, httplib::Response &res) {
        int active = 0, unacked = 0, shelved = 0, disabled = 0;
        engine.counts(active, unacked, shelved, disabled);
        const auto keys = engine.subscription_keys();

        json j;
        j["ok"] = true;
        j["service"] = "opcbridge-alarms";
        j["version"] = OPCBRIDGE_ALARMS_VERSION;
        j["uptime_ms"] = now_ms() - startMs;
        j["opcbridge"] = {
            {"connected", true},
            {"base_url", "http://" + opcbridgeHost + ":" + std::to_string(opcbridgeHttpPort)},
            {"ws_connected", true},
            {"last_tag_update_ms", engine.last_tag_update_ms.load()}
        };
        j["config"] = {
            {"rules_source", rulesFromOpcbridge.load() ? "opcbridge" : "local"},
            {"opcbridge_alarms_mtime_ms", engine.last_config_mtime_ms.load()},
            {"subscription_key_count", static_cast<int>(keys.size())}
        };
        {
            json sample = json::array();
            for (size_t i = 0; i < keys.size() && i < 10; i++) sample.push_back(keys[i]);
            j["config"]["subscription_keys_sample"] = sample;
        }
        j["last_alarm_change_ms"] = engine.last_alarm_change_ms.load();
        j["ws"] = {
            {"enabled", wsServer.enabled.load()},
            {"port", static_cast<int>(wsPort)},
            {"clients", static_cast<int>(wsServer.clients.load())}
        };
        j["opcua"] = {
            {"enabled", uaServer.enabled.load()},
            {"port", static_cast<int>(opcuaPort)},
            {"endpoint", std::string("opc.tcp://0.0.0.0:") + std::to_string(opcuaPort)}
        };
        j["counts"] = {
            {"active", active},
            {"unacked", unacked},
            {"shelved", shelved},
            {"disabled", disabled}
        };
        res.set_content(j.dump(2), "application/json");
    });

    svr.Get("/alarm/api/alarms/active", [&](const httplib::Request &req, httplib::Response &res) {
        const bool only_unacked = req.has_param("only_unacked") && req.get_param_value("only_unacked") == "true";
        json j;
        j["ok"] = true;
        j["alarms"] = engine.get_active(only_unacked);
        res.set_content(j.dump(2), "application/json");
    });

    svr.Get("/alarm/api/alarms/all", [&](const httplib::Request &, httplib::Response &res) {
        json out = json::array();
        {
            std::lock_guard<std::mutex> lock(engine.mu);
            for (const auto &kv : engine.states)
            {
                out.push_back(alarm_state_to_json(kv.second));
            }
        }
        json j;
        j["ok"] = true;
        j["alarms"] = out;
        res.set_content(j.dump(2), "application/json");
    });

    svr.Get("/alarm/api/alarms/history", [&](const httplib::Request &req, httplib::Response &res) {
        json events;
        std::string err;
        bool ok = db.fetch_events(req, events, err);
        json j;
        j["ok"] = ok;
        if (!ok) j["error"] = err;
        j["events"] = events;
        if (ok && events.is_array() && !events.empty()) {
            // For paging backwards (older events), request again with until_ms=next_until_ms.
            try {
                int64_t oldest = events[0]["ts_ms"].get<int64_t>();
                for (const auto& ev : events) {
                    if (ev.contains("ts_ms") && ev["ts_ms"].is_number_integer()) {
                        int64_t t = ev["ts_ms"].get<int64_t>();
                        if (t < oldest) oldest = t;
                    }
                }
                j["next_until_ms"] = oldest - 1;
            } catch (...) {}
        }
        res.status = ok ? 200 : 500;
        res.set_content(j.dump(2), "application/json");
    });

    svr.Post(R"(/alarm/api/alarms/([A-Za-z0-9_.:-]+)/ack)", [&](const httplib::Request &req, httplib::Response &res) {
        const std::string alarm_id = req.matches.size() > 1 ? req.matches[1].str() : "";
        json body;
        try { body = json::parse(req.body); } catch (...) { body = json::object(); }
        const std::string actor = body.value("actor", "");
        const std::string note = body.value("note", "");
        json j;
        if (alarm_id.empty() || !engine.ack(alarm_id, actor, note))
        {
            res.status = 404;
            j["ok"] = false;
            j["error"] = "Unknown alarm id.";
            res.set_content(j.dump(2), "application/json");
            return;
        }
        j["ok"] = true;
        res.set_content(j.dump(2), "application/json");
    });

    svr.Post(R"(/alarm/api/alarms/([A-Za-z0-9_.:-]+)/shelve)", [&](const httplib::Request &req, httplib::Response &res) {
        const std::string alarm_id = req.matches.size() > 1 ? req.matches[1].str() : "";
        json body;
        try { body = json::parse(req.body); } catch (...) { body = json::object(); }
        const std::string actor = body.value("actor", "");
        const std::string note = body.value("note", "");
        int64_t until = 0;
        if (body.contains("until_ms") && body["until_ms"].is_number_integer())
            until = body["until_ms"].get<int64_t>();
        else if (body.contains("duration_ms") && body["duration_ms"].is_number_integer())
            until = now_ms() + body["duration_ms"].get<int64_t>();

        json j;
        if (alarm_id.empty() || until <= 0 || !engine.shelve(alarm_id, until, actor, note))
        {
            res.status = 400;
            j["ok"] = false;
            j["error"] = "Invalid alarm id or duration.";
            res.set_content(j.dump(2), "application/json");
            return;
        }
        j["ok"] = true;
        j["shelved_until_ms"] = until;
        res.set_content(j.dump(2), "application/json");
    });

    svr.Post(R"(/alarm/api/alarms/([A-Za-z0-9_.:-]+)/unshelve)", [&](const httplib::Request &req, httplib::Response &res) {
        const std::string alarm_id = req.matches.size() > 1 ? req.matches[1].str() : "";
        json body;
        try { body = json::parse(req.body); } catch (...) { body = json::object(); }
        const std::string actor = body.value("actor", "");
        const std::string note = body.value("note", "");
        json j;
        if (alarm_id.empty() || !engine.unshelve(alarm_id, actor, note))
        {
            res.status = 404;
            j["ok"] = false;
            j["error"] = "Unknown alarm id.";
            res.set_content(j.dump(2), "application/json");
            return;
        }
        j["ok"] = true;
        res.set_content(j.dump(2), "application/json");
    });

    std::cout << "[alarms] HTTP listening on http://0.0.0.0:" << httpPort << "\n";
    svr.listen("0.0.0.0", httpPort);

    stop.store(true);
    if (wsThread.joinable()) wsThread.join();
    if (configThread.joinable()) configThread.join();
    wsServer.stop();
    uaServer.stop();
    db.close();
    return 0;
}
