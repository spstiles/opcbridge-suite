#include <atomic>
#include <algorithm>
#include <cerrno>
#include <chrono>
#include <cctype>
#include <condition_variable>
#include <cstdint>
#include <cstdlib>
#include <deque>
#include <filesystem>
#include <fcntl.h>
#include <fstream>
#include <functional>
#include <iostream>
#include <ifaddrs.h>
#include <cstring>
#include <mutex>
#include <net/if.h>
#include <optional>
#include <arpa/inet.h>
#include <random>
#include <string>
#include <sys/select.h>
#include <sys/wait.h>
#include <termios.h>
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

// Version info (wired in via build.sh)
#ifndef OPCBRIDGE_ALARMS_VERSION
#define OPCBRIDGE_ALARMS_VERSION "dev"
#endif
#ifndef OPCBRIDGE_SUITE_VERSION
#define OPCBRIDGE_SUITE_VERSION "dev"
#endif

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

static std::string join_path(const std::string& a, const std::string& b)
{
    if (a.empty()) return b;
    if (b.empty()) return a;
    if (!b.empty() && b.front() == '/') return b;
    if (a.back() == '/') return a + b;
    return a + "/" + b;
}

static std::string shell_quote(const std::string& value)
{
    std::string out = "'";
    for (char ch : value)
    {
        if (ch == '\'') out += "'\\''";
        else out.push_back(ch);
    }
    out += "'";
    return out;
}

static bool command_exists(const std::string& name)
{
    if (name.empty()) return false;
    if (name.find('/') != std::string::npos) return ::access(name.c_str(), X_OK) == 0;
    const char* pathEnv = std::getenv("PATH");
    std::string paths = pathEnv ? pathEnv : "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
    size_t start = 0;
    while (start <= paths.size())
    {
        const size_t end = paths.find(':', start);
        const std::string dir = paths.substr(start, end == std::string::npos ? std::string::npos : end - start);
        if (!dir.empty() && ::access(join_path(dir, name).c_str(), X_OK) == 0) return true;
        if (end == std::string::npos) break;
        start = end + 1;
    }
    return false;
}

static std::string dirname_of(const std::string& path)
{
    const auto slash = path.find_last_of('/');
    if (slash == std::string::npos) return ".";
    if (slash == 0) return "/";
    return path.substr(0, slash);
}

static std::string resolve_audio_path(const std::string& configDir, const std::string& raw)
{
    std::string p = raw;
    if (p.empty()) return "";
    if (p.front() == '/') return p;
    if (p.rfind("audio/", 0) == 0) return join_path(configDir, p);
    return join_path(join_path(configDir, "audio"), p);
}

static std::optional<speed_t> modem_baud_to_speed(int baud)
{
    switch (baud) {
    case 9600: return B9600;
    case 19200: return B19200;
    case 38400: return B38400;
    case 57600: return B57600;
    case 115200: return B115200;
    default: return std::nullopt;
    }
}

class ModemSerialPort
{
public:
    ~ModemSerialPort()
    {
        if (fd_ >= 0) close(fd_);
    }

    bool open_port(const std::string& device, int baud, std::string& err)
    {
        auto speed = modem_baud_to_speed(baud);
        if (!speed) {
            err = "unsupported baud rate";
            return false;
        }

        fd_ = open(device.c_str(), O_RDWR | O_NOCTTY | O_NONBLOCK);
        if (fd_ < 0) {
            err = std::strerror(errno);
            return false;
        }

        termios tio {};
        if (tcgetattr(fd_, &tio) != 0) {
            err = std::strerror(errno);
            return false;
        }

        cfmakeraw(&tio);
        cfsetispeed(&tio, *speed);
        cfsetospeed(&tio, *speed);
        tio.c_cflag |= static_cast<unsigned int>(CLOCAL | CREAD);
        tio.c_cflag &= static_cast<unsigned int>(~PARENB);
        tio.c_cflag &= static_cast<unsigned int>(~CSTOPB);
        tio.c_cflag &= static_cast<unsigned int>(~CSIZE);
        tio.c_cflag |= CS8;
        tio.c_cflag &= static_cast<unsigned int>(~CRTSCTS);
        tio.c_iflag &= static_cast<unsigned int>(~(IXON | IXOFF | IXANY));
        tio.c_cc[VMIN] = 0;
        tio.c_cc[VTIME] = 0;

        if (tcsetattr(fd_, TCSANOW, &tio) != 0) {
            err = std::strerror(errno);
            return false;
        }

        tcflush(fd_, TCIOFLUSH);
        return true;
    }

    bool write_all(const std::string& data, std::string& err)
    {
        size_t off = 0;
        while (off < data.size()) {
            ssize_t n = write(fd_, data.data() + off, data.size() - off);
            if (n > 0) {
                off += static_cast<size_t>(n);
                continue;
            }
            if (n < 0 && (errno == EAGAIN || errno == EWOULDBLOCK)) {
                std::this_thread::sleep_for(std::chrono::milliseconds(10));
                continue;
            }
            err = std::strerror(errno);
            return false;
        }
        tcdrain(fd_);
        return true;
    }

    std::string read_for(int timeout_ms)
    {
        std::string out;
        const auto deadline = std::chrono::steady_clock::now() + std::chrono::milliseconds(timeout_ms);

        while (std::chrono::steady_clock::now() < deadline) {
            auto remain = std::chrono::duration_cast<std::chrono::milliseconds>(
                deadline - std::chrono::steady_clock::now()).count();
            timeval tv {};
            tv.tv_sec = static_cast<int>(remain / 1000);
            tv.tv_usec = static_cast<int>((remain % 1000) * 1000);

            fd_set set;
            FD_ZERO(&set);
            FD_SET(fd_, &set);
            int rc = select(fd_ + 1, &set, nullptr, nullptr, &tv);
            if (rc > 0 && FD_ISSET(fd_, &set)) {
                char buf[512];
                ssize_t n = read(fd_, buf, sizeof(buf));
                if (n > 0) out.append(buf, static_cast<size_t>(n));
            } else if (rc == 0) {
                break;
            } else if (rc < 0 && errno != EINTR) {
                break;
            }
        }
        return out;
    }

private:
    int fd_ = -1;
};

struct AlarmDb
{
    std::mutex mu;
    sqlite3* db = nullptr;
    std::string path;
    std::string last_error;

    bool is_open()
    {
        std::lock_guard<std::mutex> lock(mu);
        return db != nullptr;
    }

    json status_json()
    {
        std::lock_guard<std::mutex> lock(mu);
        json j;
        j["open"] = (db != nullptr);
        j["path"] = path;
        j["error"] = last_error.empty() ? nullptr : json(last_error);
        if (!db) return j;

        // Best-effort stats (do not fail status on SQL errors).
        auto scalar_i64 = [&](const char* sql) -> std::optional<int64_t> {
            sqlite3_stmt* stmt = nullptr;
            if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) return std::nullopt;
            std::optional<int64_t> out;
            int rc = sqlite3_step(stmt);
            if (rc == SQLITE_ROW) out = sqlite3_column_int64(stmt, 0);
            sqlite3_finalize(stmt);
            return out;
        };

        if (auto c = scalar_i64("SELECT COUNT(*) FROM alarm_events;"); c.has_value()) j["row_count"] = c.value();
        if (auto t = scalar_i64("SELECT COALESCE(MAX(ts_ms),0) FROM alarm_events;"); t.has_value()) j["last_ts_ms"] = t.value();
        return j;
    }

    bool open_or_create(const std::string& dbPath, std::string& err)
    {
        std::lock_guard<std::mutex> lock(mu);
        path = dbPath;
        last_error.clear();

        int rc = sqlite3_open(dbPath.c_str(), &db);
        if (rc != SQLITE_OK)
        {
            err = sqlite3_errmsg(db);
            last_error = err;
            sqlite3_close(db);
            db = nullptr;
            return false;
        }

        auto exec_ignore = [&](const char* sql) {
            sqlite3_exec(db, sql, nullptr, nullptr, nullptr);
        };

        // Create base table if needed.
        {
            const char* sql = R"SQL(
                CREATE TABLE IF NOT EXISTS alarm_events (
                    event_id      TEXT PRIMARY KEY,
                    ts_ms         INTEGER NOT NULL,
                    alarm_id      TEXT NOT NULL,
                    type          TEXT NOT NULL,
                    severity      INTEGER NOT NULL,
                    connection_id TEXT NOT NULL,
                    tag           TEXT NOT NULL,
                    value_json    TEXT,
                    message       TEXT,
                    actor         TEXT,
                    note          TEXT
                );
            )SQL";

            char* errmsg = nullptr;
            rc = sqlite3_exec(db, sql, nullptr, nullptr, &errmsg);
            if (rc != SQLITE_OK)
            {
                err = errmsg ? errmsg : "schema error";
                last_error = err;
                sqlite3_free(errmsg);
                sqlite3_close(db);
                db = nullptr;
                return false;
            }
        }

        // Backward-compatible migrations (if DB existed before group/site columns).
        // Ignore errors (e.g., "duplicate column name") so we can start cleanly.
        exec_ignore("ALTER TABLE alarm_events ADD COLUMN group_name TEXT;");
        exec_ignore("ALTER TABLE alarm_events ADD COLUMN site TEXT;");

        // Indexes (best-effort; do not fail DB open if an index can't be created).
        exec_ignore("CREATE INDEX IF NOT EXISTS idx_alarm_events_ts ON alarm_events(ts_ms);");
        exec_ignore("CREATE INDEX IF NOT EXISTS idx_alarm_events_alarm ON alarm_events(alarm_id, ts_ms);");
        exec_ignore("CREATE INDEX IF NOT EXISTS idx_alarm_events_tag ON alarm_events(connection_id, tag, ts_ms);");
        exec_ignore("CREATE INDEX IF NOT EXISTS idx_alarm_events_group_site ON alarm_events(group_name, site, ts_ms);");

        exec_ignore(R"SQL(
            CREATE TABLE IF NOT EXISTS notification_attempts (
                attempt_id   TEXT PRIMARY KEY,
                ts_ms        INTEGER NOT NULL,
                route_name   TEXT NOT NULL,
                route_type   TEXT NOT NULL,
                alarm_id     TEXT NOT NULL,
                severity     INTEGER NOT NULL,
                event_type   TEXT NOT NULL,
                ok           INTEGER NOT NULL,
                result       TEXT,
                command      TEXT
            );
        )SQL");
        exec_ignore("CREATE INDEX IF NOT EXISTS idx_notification_attempts_ts ON notification_attempts(ts_ms);");
        exec_ignore("CREATE INDEX IF NOT EXISTS idx_notification_attempts_alarm ON notification_attempts(alarm_id, ts_ms);");

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
            last_error = err;
            return false;
        }

        auto opt_string = [&](const char* key) -> std::string {
            if (!event.is_object() || !event.contains(key)) return "";
            const auto& v = event.at(key);
            if (v.is_string()) return v.get<std::string>();
            return "";
        };

        const char* sql_with_group_site = R"SQL(
            INSERT INTO alarm_events (
                event_id, ts_ms, alarm_id, type, severity, group_name, site, connection_id, tag,
                value_json, message, actor, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        )SQL";

        const char* sql_legacy = R"SQL(
            INSERT INTO alarm_events (
                event_id, ts_ms, alarm_id, type, severity, connection_id, tag,
                value_json, message, actor, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        )SQL";

        sqlite3_stmt* stmt = nullptr;
        bool useLegacy = false;
        int rc = sqlite3_prepare_v2(db, sql_with_group_site, -1, &stmt, nullptr);
        if (rc != SQLITE_OK)
        {
            const std::string e = sqlite3_errmsg(db);
            if (e.find("group_name") != std::string::npos || e.find("site") != std::string::npos)
            {
                useLegacy = true;
                rc = sqlite3_prepare_v2(db, sql_legacy, -1, &stmt, nullptr);
            }
        }
        if (rc != SQLITE_OK)
        {
            err = sqlite3_errmsg(db);
            last_error = err;
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
        if (!useLegacy)
        {
            if (!group_name.empty()) sqlite3_bind_text(stmt, idx++, group_name.c_str(), -1, SQLITE_TRANSIENT);
            else sqlite3_bind_null(stmt, idx++);
            if (!site.empty()) sqlite3_bind_text(stmt, idx++, site.c_str(), -1, SQLITE_TRANSIENT);
            else sqlite3_bind_null(stmt, idx++);
        }
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
            last_error = err;
            sqlite3_finalize(stmt);
            return false;
        }

        sqlite3_finalize(stmt);
        last_error.clear();
        return true;
    }

    bool insert_notification_attempt(const json& attempt, std::string& err)
    {
        std::lock_guard<std::mutex> lock(mu);
        if (!db)
        {
            err = "DB not open";
            last_error = err;
            return false;
        }

        const char* sql = R"SQL(
            INSERT INTO notification_attempts (
                attempt_id, ts_ms, route_name, route_type, alarm_id, severity, event_type, ok, result, command
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        )SQL";

        sqlite3_stmt* stmt = nullptr;
        int rc = sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr);
        if (rc != SQLITE_OK)
        {
            err = sqlite3_errmsg(db);
            last_error = err;
            return false;
        }

        const std::string attempt_id = attempt.value("attempt_id", "");
        const std::string route_name = attempt.value("route_name", "");
        const std::string route_type = attempt.value("route_type", "");
        const std::string alarm_id = attempt.value("alarm_id", "");
        const std::string event_type = attempt.value("event_type", "");
        const std::string result = attempt.value("result", "");
        const std::string command = attempt.value("command", "");

        int idx = 1;
        sqlite3_bind_text(stmt, idx++, attempt_id.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int64(stmt, idx++, attempt.value("ts_ms", 0LL));
        sqlite3_bind_text(stmt, idx++, route_name.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, idx++, route_type.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, idx++, alarm_id.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, idx++, attempt.value("severity", 0));
        sqlite3_bind_text(stmt, idx++, event_type.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, idx++, attempt.value("ok", false) ? 1 : 0);
        if (!result.empty()) sqlite3_bind_text(stmt, idx++, result.c_str(), -1, SQLITE_TRANSIENT);
        else sqlite3_bind_null(stmt, idx++);
        if (!command.empty()) sqlite3_bind_text(stmt, idx++, command.c_str(), -1, SQLITE_TRANSIENT);
        else sqlite3_bind_null(stmt, idx++);

        rc = sqlite3_step(stmt);
        if (rc != SQLITE_DONE)
        {
            err = sqlite3_errmsg(db);
            last_error = err;
            sqlite3_finalize(stmt);
            return false;
        }

        sqlite3_finalize(stmt);
        last_error.clear();
        return true;
    }

    bool fetch_events(const httplib::Request& req, json& out, std::string& err)
    {
        std::lock_guard<std::mutex> lock(mu);
        out = json::array();
        if (!db)
        {
            err = "DB not open";
            last_error = err;
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
            last_error = err;
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
            last_error = err;
            sqlite3_finalize(stmt);
            return false;
        }

        sqlite3_finalize(stmt);
        last_error.clear();
        return true;
    }

    bool fetch_events_since(int64_t since_ms, int limit, json& out, std::string& err)
    {
        std::lock_guard<std::mutex> lock(mu);
        out = json::array();
        if (!db)
        {
            err = "DB not open";
            return false;
        }

        if (limit < 1) limit = 1;
        if (limit > 50000) limit = 50000;

        auto make_sql = [&](bool withGroupSite) -> std::string {
            std::string sql = withGroupSite
                ? "SELECT event_id, ts_ms, alarm_id, type, severity, group_name, site, connection_id, tag, value_json, message, actor, note "
                : "SELECT event_id, ts_ms, alarm_id, type, severity, connection_id, tag, value_json, message, actor, note ";
            sql += "FROM alarm_events WHERE ts_ms >= ? ORDER BY ts_ms ASC LIMIT ?;";
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
        sqlite3_bind_int64(stmt, idx++, since_ms);
        sqlite3_bind_int(stmt, idx++, limit);

        while ((rc = sqlite3_step(stmt)) == SQLITE_ROW)
        {
            int col = 0;
            const int col_event_id = col++;
            const int col_ts       = col++;
            const int col_alarm_id  = col++;
            const int col_type      = col++;
            const int col_sev       = col++;
            const int col_group     = withGroupSite ? col++ : -1;
            const int col_site      = withGroupSite ? col++ : -1;
            const int col_conn      = col++;
            const int col_tag       = col++;
            const int col_val       = col++;
            const int col_msg       = col++;
            const int col_actor     = col++;
            const int col_note      = col++;

            json ev;
            ev["event_id"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_event_id));
            ev["ts_ms"] = sqlite3_column_int64(stmt, col_ts);
            ev["alarm_id"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_alarm_id));
            ev["type"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_type));
            ev["severity"] = sqlite3_column_int(stmt, col_sev);

            if (withGroupSite)
            {
                if (sqlite3_column_type(stmt, col_group) == SQLITE_NULL) ev["group"] = "";
                else ev["group"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_group));
                if (sqlite3_column_type(stmt, col_site) == SQLITE_NULL) ev["site"] = "";
                else ev["site"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_site));
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
    std::string condition_type; // "equals" | "not_equals" | "high" | "low"
    json condition_value;       // used for equals/not_equals
    double threshold = 0.0;     // used for high/low
    double hysteresis = 0.0;    // used for high/low
    std::string message_on_active;
    std::string message_on_return;
    bool audible_enabled = false;
    std::string audio_file;
    std::string audio_path;
    std::string speech_text;
    std::vector<std::string> audio_files;
    std::vector<std::string> audio_paths;
    std::vector<std::string> speech_texts;
    std::string notification_policy;

    // Repeat behavior for audible notifications.
    // If repeat_override is false, fall back to the notification route default repeat_ms.
    // If true, repeat_ms may be 0 (explicit off) or >0 (repeat interval).
    bool repeat_override = false;
    int64_t repeat_ms = 0;
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
    bool audible_enabled = false;
    std::string audio_file;
    std::string audio_path;
    std::string speech_text;
    std::vector<std::string> audio_files;
    std::vector<std::string> audio_paths;
    std::vector<std::string> speech_texts;
    std::string notification_policy;

    // Repeat behavior for audible notifications.
    // If repeat_override is false, fall back to the notification route default repeat_ms.
    // If true, repeat_ms may be 0 (explicit off) or >0 (repeat interval).
    bool repeat_override = false;
    int64_t repeat_ms = 0;
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
    j["audible_enabled"] = s.audible_enabled;
    j["audio_file"] = s.audio_file.empty() ? nullptr : json(s.audio_file);
    j["audio_path"] = s.audio_path.empty() ? nullptr : json(s.audio_path);
    j["speech_text"] = s.speech_text.empty() ? nullptr : json(s.speech_text);
    j["audio_files"] = s.audio_files;
    j["audio_paths"] = s.audio_paths;
    j["speech_texts"] = s.speech_texts;
    j["notification_policy"] = s.notification_policy.empty() ? nullptr : json(s.notification_policy);
    j["repeat_override"] = s.repeat_override;
    j["repeat_ms"] = s.repeat_ms;
    return j;
}

struct ResolvedAlarmAudio
{
    bool audible_enabled = false;
    std::string audio_file;
    std::string audio_path;
    std::string speech_text;
    std::vector<std::string> audio_files;
    std::vector<std::string> audio_paths;
    std::vector<std::string> speech_texts;
};

struct ResolvedAlarmRepeat
{
    bool repeat_override = false;
    int64_t repeat_ms = 0;
};

static std::string json_string_or_empty(const json& obj, const char* key)
{
    if (!obj.is_object() || !obj.contains(key) || !obj[key].is_string()) return "";
    return obj[key].get<std::string>();
}

static void append_audio_file(std::vector<std::string>& files, const std::string& file)
{
    if (file.empty()) return;
    files.push_back(file);
}

static void append_speech_text(std::vector<std::string>& texts, const std::string& text)
{
    if (text.empty()) return;
    texts.push_back(text);
}

static void apply_audio_scope(const json& scope, bool& audible, std::string& audioFile, std::vector<std::string>& audioFiles, std::string& speechText, std::vector<std::string>& speechTexts)
{
    if (!scope.is_object()) return;
    if (scope.contains("audible_enabled") && scope["audible_enabled"].is_boolean())
    {
        audible = scope["audible_enabled"].get<bool>();
    }
    const std::string file = json_string_or_empty(scope, "audio_file");
    if (!file.empty()) {
        audioFile = file;
        append_audio_file(audioFiles, file);
    }
    const std::string text = json_string_or_empty(scope, "speech_text");
    if (!text.empty()) {
        speechText = text;
        append_speech_text(speechTexts, text);
    }
}

static ResolvedAlarmAudio resolve_alarm_audio(const json& root, const json& rule, const std::string& configDir)
{
    ResolvedAlarmAudio out;
    std::unordered_map<std::string, std::string> audioPaths;

    const json audio = (root.contains("audio") && root["audio"].is_object()) ? root["audio"] : json::object();
    if (audio.contains("audible_enabled") && audio["audible_enabled"].is_boolean())
    {
        out.audible_enabled = audio["audible_enabled"].get<bool>();
    }
    if (audio.contains("default_file") && audio["default_file"].is_string())
    {
        out.audio_file = audio["default_file"].get<std::string>();
        append_audio_file(out.audio_files, out.audio_file);
    }
    if (audio.contains("speech_text") && audio["speech_text"].is_string())
    {
        out.speech_text = audio["speech_text"].get<std::string>();
        append_speech_text(out.speech_texts, out.speech_text);
    }
    if (audio.contains("files") && audio["files"].is_array())
    {
        for (const auto& f : audio["files"])
        {
            if (!f.is_object()) continue;
            const std::string id = json_string_or_empty(f, "id");
            if (id.empty()) continue;
            std::string path = json_string_or_empty(f, "path");
            if (path.empty()) path = id;
            audioPaths[id] = path;
        }
    }

    const std::string groupName = json_string_or_empty(rule, "group");
    const std::string siteName = json_string_or_empty(rule, "site");
    if (root.contains("groups") && root["groups"].is_array())
    {
        for (const auto& g : root["groups"])
        {
            if (!g.is_object() || json_string_or_empty(g, "name") != groupName) continue;
            apply_audio_scope(g, out.audible_enabled, out.audio_file, out.audio_files, out.speech_text, out.speech_texts);
            if (!siteName.empty() && g.contains("sites") && g["sites"].is_array())
            {
                for (const auto& s : g["sites"])
                {
                    if (!s.is_object() || json_string_or_empty(s, "name") != siteName) continue;
                    apply_audio_scope(s, out.audible_enabled, out.audio_file, out.audio_files, out.speech_text, out.speech_texts);
                    break;
                }
            }
            break;
        }
    }

    apply_audio_scope(rule, out.audible_enabled, out.audio_file, out.audio_files, out.speech_text, out.speech_texts);

    if (!out.audio_file.empty())
    {
        const auto it = audioPaths.find(out.audio_file);
        const std::string configuredPath = (it == audioPaths.end()) ? out.audio_file : it->second;
        out.audio_path = resolve_audio_path(configDir, configuredPath);
    }
    for (const auto& file : out.audio_files)
    {
        const auto it = audioPaths.find(file);
        const std::string configuredPath = (it == audioPaths.end()) ? file : it->second;
        out.audio_paths.push_back(resolve_audio_path(configDir, configuredPath));
    }
    return out;
}

static ResolvedAlarmRepeat resolve_alarm_repeat(const json& root, const json& rule)
{
    ResolvedAlarmRepeat out;
    const std::string groupName = json_string_or_empty(rule, "group");
    const std::string siteName = json_string_or_empty(rule, "site");

    auto apply = [&](const json& obj) {
        if (!obj.is_object()) return;
        if (!obj.contains("repeat_ms")) return;
        const json& v = obj["repeat_ms"];
        if (!v.is_number()) return;
        out.repeat_override = true;
        if (v.is_number_integer()) out.repeat_ms = v.get<int64_t>();
        else out.repeat_ms = static_cast<int64_t>(v.get<double>());
    };

    if (root.contains("groups") && root["groups"].is_array())
    {
        for (const auto& g : root["groups"])
        {
            if (!g.is_object() || json_string_or_empty(g, "name") != groupName) continue;
            apply(g);
            if (!siteName.empty() && g.contains("sites") && g["sites"].is_array())
            {
                for (const auto& s : g["sites"])
                {
                    if (!s.is_object() || json_string_or_empty(s, "name") != siteName) continue;
                    apply(s);
                    break;
                }
            }
            break;
        }
    }

    apply(rule);
    if (out.repeat_ms < 0) out.repeat_ms = 0;
    return out;
}

static json notification_config_from_root(const json& root)
{
    if (root.contains("notifications") && root["notifications"].is_object())
    {
        json cfg = root["notifications"];
        // Voice-modem test calls need the top-level audio file map so a selected
        // audio ID resolves exactly like a real alarm's audio_file setting.
        if (root.contains("audio") && root["audio"].is_object() && !cfg.contains("audio"))
        {
            cfg["audio"] = root["audio"];
        }
        return cfg;
    }

    const json audio = (root.contains("audio") && root["audio"].is_object()) ? root["audio"] : json::object();
    const bool hasAudioFiles = audio.contains("files") && audio["files"].is_array() && !audio["files"].empty();
    if (!hasAudioFiles) return json::object();

    return {
        {"enabled", true},
        {"routes", json::array({
            {
                {"name", "default_audio"},
                {"type", "audio_command"},
                {"enabled", true},
                {"min_severity", 0},
                {"on", json::array({"active"})},
                {"command", "/usr/bin/aplay"},
                {"args", json::array({"{audio_path}"})},
                // Default to no repeat; individual alarms can opt-in with repeat_ms.
                {"repeat_ms", 0},
                {"until", "acked_or_returned"}
            }
        })}
    };
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

class NotificationManager
{
public:
    struct Route
    {
        std::string name;
        std::string type;
        bool enabled = true;
        int min_severity = 0;
        std::vector<std::string> on{"active"};
        std::string command;
        std::vector<std::string> args;
        int64_t repeat_ms = 0;
        std::string until = "acked_or_returned";
    };

    struct VoiceModemConfig
    {
        bool enabled = false;
        std::string device;
        int baud = 115200;
        bool voice_init = false;
        int voice_line = 1;
        int dial_seconds = 30;
        int audio_delay_seconds = 8;
        int audio_gap_ms = 50;
        int command_timeout_ms = 3000;
        std::string tts_engine = "auto";
    };

    struct Contact
    {
        std::string id;
        std::string name;
        std::string phone;
        bool enabled = true;
    };

    struct TestCallRequest
    {
        std::string contact_id = "test";
        std::string contact_name = "Test Call";
        std::string phone;
        std::string audio_file;
        std::string tts_text;
    };

    struct ContactGroup
    {
        std::string id;
        std::string name;
        bool enabled = true;
        std::vector<std::string> contacts;
    };

    struct PolicyTarget
    {
        std::string type;
        std::string id;
    };

    struct Policy
    {
        std::string id;
        std::string name;
        bool enabled = true;
        int min_severity = 0;
        std::vector<std::string> on{"active"};
        std::vector<PolicyTarget> targets;
        std::vector<std::string> contacts;
        std::vector<std::string> contact_groups;
        int64_t repeat_ms = 0;
        std::string until = "acked_or_returned";
    };

    struct Job
    {
        Route route;
        AlarmState alarm;
        std::string event_type;
        int64_t due_ms = 0;
        std::string phone;
        std::string contact_id;
        std::string contact_name;
        std::string policy_id;
    };

    struct TtsPart
    {
        bool pause = false;
        std::string text;
        int pause_ms = 0;
    };

    enum class JobQueue
    {
        Audio,
        Modem
    };

    void set_db(AlarmDb* ptr)
    {
        std::lock_guard<std::mutex> lock(mu_);
        db_ = ptr;
    }

    void set_should_continue(std::function<bool(const std::string&, const std::string&)> fn)
    {
        std::lock_guard<std::mutex> lock(mu_);
        should_continue_ = std::move(fn);
    }

    void set_config_dir(std::string dir)
    {
        std::lock_guard<std::mutex> lock(mu_);
        config_dir_ = std::move(dir);
    }

    void configure(const json& cfg)
    {
        std::lock_guard<std::mutex> lock(mu_);
        enabled_ = cfg.is_object() ? cfg.value("enabled", false) : false;
        routes_.clear();
        voice_modem_ = VoiceModemConfig{};
        contacts_.clear();
        contact_groups_.clear();
        policies_.clear();
        audio_paths_.clear();
        audio_jobs_.clear();
        modem_jobs_.clear();
        if (!cfg.is_object())
        {
            audio_cv_.notify_all();
            modem_cv_.notify_all();
            return;
        }

        if (cfg.contains("voice_modem") && cfg["voice_modem"].is_object())
        {
            const auto& vm = cfg["voice_modem"];
            voice_modem_.enabled = vm.value("enabled", false);
            voice_modem_.device = vm.value("device", "");
            voice_modem_.baud = vm.value("baud", 115200);
            voice_modem_.voice_init = vm.value("voice_init", false);
            voice_modem_.voice_line = vm.value("voice_line", 1);
            voice_modem_.dial_seconds = vm.value("dial_seconds", 30);
            voice_modem_.audio_delay_seconds = vm.value("audio_delay_seconds", 8);
            voice_modem_.audio_gap_ms = vm.value("audio_gap_ms", 50);
            voice_modem_.command_timeout_ms = vm.value("command_timeout_ms", 3000);
            voice_modem_.tts_engine = vm.value("tts_engine", "auto");
        }

        if (cfg.contains("audio") && cfg["audio"].is_object() && cfg["audio"].contains("files") && cfg["audio"]["files"].is_array())
        {
            for (const auto& f : cfg["audio"]["files"])
            {
                if (!f.is_object()) continue;
                const std::string id = json_string_or_empty(f, "id");
                if (id.empty()) continue;
                std::string path = json_string_or_empty(f, "path");
                if (path.empty()) path = id;
                audio_paths_[id] = resolve_audio_path(config_dir_, path);
            }
        }

        if (cfg.contains("contacts") && cfg["contacts"].is_array())
        {
            for (const auto& item : cfg["contacts"])
            {
                if (!item.is_object()) continue;
                Contact c;
                c.id = item.value("id", "");
                c.name = item.value("name", c.id);
                c.phone = item.value("phone", "");
                c.enabled = item.value("enabled", true);
                if (!c.id.empty()) contacts_[c.id] = std::move(c);
            }
        }

        if (cfg.contains("contact_groups") && cfg["contact_groups"].is_array())
        {
            for (const auto& item : cfg["contact_groups"])
            {
                if (!item.is_object()) continue;
                ContactGroup g;
                g.id = item.value("id", "");
                g.name = item.value("name", g.id);
                g.enabled = item.value("enabled", true);
                if (item.contains("contacts") && item["contacts"].is_array())
                {
                    for (const auto& cid : item["contacts"])
                    {
                        if (cid.is_string()) g.contacts.push_back(cid.get<std::string>());
                    }
                }
                if (!g.id.empty()) contact_groups_[g.id] = std::move(g);
            }
        }

        if (cfg.contains("policies") && cfg["policies"].is_array())
        {
            for (const auto& item : cfg["policies"])
            {
                if (!item.is_object()) continue;
                Policy p;
                p.id = item.value("id", "");
                p.name = item.value("name", p.id);
                p.enabled = item.value("enabled", true);
                p.min_severity = item.value("min_severity", 0);
                p.repeat_ms = item.value("repeat_ms", 0LL);
                p.until = item.value("until", p.until);
                if (item.contains("on") && item["on"].is_array())
                {
                    p.on.clear();
                    for (const auto& ev : item["on"])
                    {
                        if (ev.is_string()) p.on.push_back(ev.get<std::string>());
                    }
                }
                if (item.contains("contacts") && item["contacts"].is_array())
                {
                    for (const auto& cid : item["contacts"])
                    {
                        if (cid.is_string()) p.contacts.push_back(cid.get<std::string>());
                    }
                }
                if (item.contains("contact_groups") && item["contact_groups"].is_array())
                {
                    for (const auto& gid : item["contact_groups"])
                    {
                        if (gid.is_string()) p.contact_groups.push_back(gid.get<std::string>());
                    }
                }
                if (item.contains("targets") && item["targets"].is_array())
                {
                    for (const auto& target : item["targets"])
                    {
                        if (!target.is_object()) continue;
                        PolicyTarget t;
                        t.type = target.value("type", "");
                        t.id = target.value("id", "");
                        if ((t.type == "contact" || t.type == "group") && !t.id.empty()) p.targets.push_back(std::move(t));
                    }
                }
                if (p.targets.empty())
                {
                    for (const auto& cid : p.contacts) p.targets.push_back({"contact", cid});
                    for (const auto& gid : p.contact_groups) p.targets.push_back({"group", gid});
                }
                if (!p.id.empty()) policies_[p.id] = std::move(p);
            }
        }

        if (!enabled_ || !cfg.contains("routes") || !cfg["routes"].is_array())
        {
            audio_cv_.notify_all();
            modem_cv_.notify_all();
            return;
        }

        for (const auto& item : cfg["routes"])
        {
            if (!item.is_object()) continue;
            Route r;
            r.name = item.value("name", "");
            r.type = item.value("type", "");
            r.enabled = item.value("enabled", true);
            r.min_severity = item.value("min_severity", 0);
            r.command = item.value("command", "");
            r.repeat_ms = item.value("repeat_ms", 0LL);
            r.until = item.value("until", r.until);

            if (item.contains("on") && item["on"].is_array())
            {
                r.on.clear();
                for (const auto& ev : item["on"])
                {
                    if (ev.is_string()) r.on.push_back(ev.get<std::string>());
                }
            }

            if (item.contains("args") && item["args"].is_array())
            {
                for (const auto& arg : item["args"])
                {
                    if (arg.is_string()) r.args.push_back(arg.get<std::string>());
                }
            }

            if (r.name.empty()) r.name = r.type.empty() ? "notification" : r.type;
            if (r.type == "audio_command" && !r.command.empty()) routes_.push_back(std::move(r));
        }

        audio_cv_.notify_all();
        modem_cv_.notify_all();
    }

    void start()
    {
        std::lock_guard<std::mutex> lock(mu_);
        if (running_) return;
        stop_ = false;
        running_ = true;
        audio_worker_ = std::thread([this]() { worker_loop(JobQueue::Audio); });
        modem_worker_ = std::thread([this]() { worker_loop(JobQueue::Modem); });
    }

    void stop()
    {
        {
            std::lock_guard<std::mutex> lock(mu_);
            stop_ = true;
            audio_cv_.notify_all();
            modem_cv_.notify_all();
        }
        if (audio_worker_.joinable()) audio_worker_.join();
        if (modem_worker_.joinable()) modem_worker_.join();
        {
            std::lock_guard<std::mutex> lock(mu_);
            running_ = false;
        }
    }

    void notify_event(const AlarmState& alarm, const std::string& event_type)
    {
        std::lock_guard<std::mutex> lock(mu_);
        if (!enabled_) return;
        AlarmState alarmWithAudio = alarm;
        add_tts_audio_paths_locked(alarmWithAudio);
        enqueue_voice_modem_jobs_locked(alarmWithAudio, event_type);
        for (const auto& route : routes_)
        {
            if (!route.enabled) continue;
            if (alarmWithAudio.severity < route.min_severity) continue;
            bool eventMatch = false;
            for (const auto& ev : route.on)
            {
                if (ev == event_type) { eventMatch = true; break; }
            }
            if (!eventMatch) continue;
            if (route.type == "audio_command")
            {
                if (!alarmWithAudio.audible_enabled) continue;
                if (route_needs_audio_path(route) && alarmWithAudio.audio_path.empty()) continue;
            }

            Job job;
            job.route = route;
            job.alarm = alarmWithAudio;
            job.event_type = event_type;
            job.due_ms = now_ms();
            // Allow alarm/group/site repeat settings to override the route default (audible-only).
            // repeat_ms may be 0 (explicit off) or >0 (repeat interval).
            if (job.route.type == "audio_command" && job.event_type == "active" && alarmWithAudio.repeat_override) {
                job.route.repeat_ms = alarmWithAudio.repeat_ms;
            }
            apply_audio_default_arg(job);
            audio_jobs_.push_back(std::move(job));
        }
        audio_cv_.notify_all();
        modem_cv_.notify_all();
    }

    json status_json() const
    {
        std::lock_guard<std::mutex> lock(mu_);
        json routes = json::array();
        for (const auto& r : routes_)
        {
            routes.push_back({
                {"name", r.name},
                {"type", r.type},
                {"enabled", r.enabled},
                {"min_severity", r.min_severity},
                {"repeat_ms", r.repeat_ms},
                {"until", r.until}
            });
        }
        return {
            {"enabled", enabled_},
            {"running", running_},
            {"queued", static_cast<int>(audio_jobs_.size() + modem_jobs_.size())},
            {"queued_audio", static_cast<int>(audio_jobs_.size())},
            {"queued_voice_modem", static_cast<int>(modem_jobs_.size())},
            {"attempts", attempts_},
            {"successes", successes_},
            {"failures", failures_},
            {"last_attempt_ms", last_attempt_ms_},
            {"last_route_type", last_route_type_},
            {"last_route_name", last_route_name_},
            {"last_result", last_result_},
            {"voice_modem", {
                {"enabled", voice_modem_.enabled},
                {"configured", !voice_modem_.device.empty()},
                {"device", voice_modem_.device},
                {"baud", voice_modem_.baud},
                {"voice_line", voice_modem_.voice_line},
                {"audio_delay_seconds", voice_modem_.audio_delay_seconds},
                {"audio_gap_ms", voice_modem_.audio_gap_ms},
                {"contacts", static_cast<int>(contacts_.size())},
                {"contact_groups", static_cast<int>(contact_groups_.size())},
                {"policies", static_cast<int>(policies_.size())}
            }},
            {"routes", routes}
        };
    }

    bool test_voice_modem_call(const TestCallRequest& request, std::string& result)
    {
        Job job;
        job.route.name = "voice_modem:test";
        job.route.type = "voice_modem";
        job.event_type = "test";
        job.due_ms = now_ms();
        job.phone = request.phone;
        job.contact_id = request.contact_id.empty() ? "test" : request.contact_id;
        job.contact_name = request.contact_name.empty() ? job.contact_id : request.contact_name;
        job.policy_id = "test";
        job.alarm.alarm_id = "voice_modem_test";
        job.alarm.name = "Voice Modem Test";
        job.alarm.message = "Voice modem test call";
        job.alarm.severity = 0;

        if (!request.audio_file.empty())
        {
            std::lock_guard<std::mutex> lock(mu_);
            job.alarm.audio_file = request.audio_file;
            const auto it = audio_paths_.find(request.audio_file);
            job.alarm.audio_path = (it == audio_paths_.end())
                ? resolve_audio_path(config_dir_, request.audio_file)
                : it->second;
        }
        else if (!request.tts_text.empty())
        {
            std::lock_guard<std::mutex> lock(mu_);
            std::string err;
            if (!append_tts_audio_paths_locked(job.alarm, request.tts_text, err))
            {
                result = err;
                return false;
            }
        }

        return run_voice_modem_call(job, result);
    }

private:
    static bool vector_contains(const std::vector<std::string>& values, const std::string& needle)
    {
        for (const auto& v : values)
        {
            if (v == needle) return true;
        }
        return false;
    }

    static std::string sanitize_phone_number(const std::string& raw)
    {
        std::string out;
        out.reserve(raw.size());
        for (char ch : raw)
        {
            const unsigned char c = static_cast<unsigned char>(ch);
            if (c >= '0' && c <= '9') out.push_back(static_cast<char>(c));
            else if (ch == '*' || ch == '#' || ch == ',' || ch == '+') out.push_back(ch);
            else if (ch == 'p' || ch == 'P') out.push_back('P');
            else if (ch == 'w' || ch == 'W') out.push_back('W');
            else if (ch == 't' || ch == 'T') out.push_back('T');
        }
        return out;
    }

    static std::string trim_tts_text(const std::string& raw)
    {
        std::string out;
        out.reserve(raw.size());
        bool lastSpace = false;
        for (char ch : raw)
        {
            const unsigned char c = static_cast<unsigned char>(ch);
            if (c == '\r' || c == '\n' || c == '\t' || c == ' ')
            {
                if (!lastSpace && !out.empty()) out.push_back(' ');
                lastSpace = true;
                continue;
            }
            if (c < 32) continue;
            out.push_back(ch);
            lastSpace = false;
            if (out.size() >= 500) break;
        }
        while (!out.empty() && out.back() == ' ') out.pop_back();
        return out;
    }

    static std::vector<TtsPart> parse_tts_parts(const std::string& raw)
    {
        std::vector<TtsPart> parts;
        std::string text;
        const std::string input = raw;
        size_t pos = 0;
        auto flush_text = [&]() {
            const std::string clean = trim_tts_text(text);
            if (!clean.empty()) parts.push_back(TtsPart{false, clean, 0});
            text.clear();
        };

        while (pos < input.size())
        {
            if (input[pos] != '[')
            {
                text.push_back(input[pos++]);
                continue;
            }

            const size_t close = input.find(']', pos + 1);
            if (close == std::string::npos)
            {
                text.push_back(input[pos++]);
                continue;
            }

            std::string token = input.substr(pos + 1, close - pos - 1);
            std::string lowered;
            lowered.reserve(token.size());
            for (char ch : token) lowered.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(ch))));

            const std::string prefix = "pause:";
            if (lowered.rfind(prefix, 0) != 0)
            {
                text.append(input.substr(pos, close - pos + 1));
                pos = close + 1;
                continue;
            }

            std::string value = lowered.substr(prefix.size());
            value.erase(0, value.find_first_not_of(" \t"));
            value.erase(value.find_last_not_of(" \t") == std::string::npos ? 0 : value.find_last_not_of(" \t") + 1);
            char* end = nullptr;
            const long parsed = std::strtol(value.c_str(), &end, 10);
            if (end == value.c_str())
            {
                text.append(input.substr(pos, close - pos + 1));
                pos = close + 1;
                continue;
            }

            flush_text();
            const int ms = std::max(0, std::min(60000, static_cast<int>(parsed)));
            if (ms > 0) parts.push_back(TtsPart{true, "", ms});
            pos = close + 1;
        }

        flush_text();
        return parts;
    }

    static void append_le16(std::string& out, uint16_t value)
    {
        out.push_back(static_cast<char>(value & 0xff));
        out.push_back(static_cast<char>((value >> 8) & 0xff));
    }

    static void append_le32(std::string& out, uint32_t value)
    {
        out.push_back(static_cast<char>(value & 0xff));
        out.push_back(static_cast<char>((value >> 8) & 0xff));
        out.push_back(static_cast<char>((value >> 16) & 0xff));
        out.push_back(static_cast<char>((value >> 24) & 0xff));
    }

    bool generate_silence_wav_locked(int pause_ms, std::string& path, std::string& err) const
    {
        const int ms = std::max(1, std::min(60000, pause_ms));
        const std::filesystem::path dir = std::filesystem::path(config_dir_) / "tts-cache";
        std::error_code ec;
        std::filesystem::create_directories(dir, ec);
        if (ec)
        {
            err = "Failed to create TTS cache directory: " + ec.message();
            return false;
        }

        const uint32_t sampleRate = 8000;
        const uint16_t channels = 1;
        const uint16_t bitsPerSample = 16;
        const uint32_t frames = std::max<uint32_t>(1, static_cast<uint32_t>((static_cast<uint64_t>(ms) * sampleRate) / 1000));
        const uint32_t dataBytes = frames * channels * (bitsPerSample / 8);
        const std::filesystem::path wav = dir / ("pause_" + std::to_string(ms) + "_" + random_hex(8) + ".wav");

        std::string data;
        data.reserve(44 + dataBytes);
        data.append("RIFF", 4);
        append_le32(data, 36 + dataBytes);
        data.append("WAVE", 4);
        data.append("fmt ", 4);
        append_le32(data, 16);
        append_le16(data, 1);
        append_le16(data, channels);
        append_le32(data, sampleRate);
        append_le32(data, sampleRate * channels * (bitsPerSample / 8));
        append_le16(data, channels * (bitsPerSample / 8));
        append_le16(data, bitsPerSample);
        data.append("data", 4);
        append_le32(data, dataBytes);
        data.append(dataBytes, '\0');

        std::ofstream out(wav, std::ios::binary);
        if (!out)
        {
            err = "Failed to create pause WAV file.";
            return false;
        }
        out.write(data.data(), static_cast<std::streamsize>(data.size()));
        out.close();
        if (!out)
        {
            err = "Failed to write pause WAV file.";
            return false;
        }

        path = wav.string();
        return true;
    }

    bool generate_tts_wav_locked(const std::string& rawText, std::string& path, std::string& err) const
    {
        const std::string text = trim_tts_text(rawText);
        if (text.empty())
        {
            err = "TTS text is empty.";
            return false;
        }

        std::string engine = voice_modem_.tts_engine;
        if (engine.empty() || engine == "auto")
        {
            if (command_exists("espeak-ng")) engine = "espeak-ng";
            else if (command_exists("espeak")) engine = "espeak";
            else if (command_exists("flite")) engine = "flite";
            else
            {
                err = "No TTS engine found. Install espeak-ng, espeak, or flite.";
                return false;
            }
        }
        else if (!command_exists(engine))
        {
            err = "Configured TTS engine is not executable: " + engine;
            return false;
        }

        const std::filesystem::path dir = std::filesystem::path(config_dir_) / "tts-cache";
        std::error_code ec;
        std::filesystem::create_directories(dir, ec);
        if (ec)
        {
            err = "Failed to create TTS cache directory: " + ec.message();
            return false;
        }

        const std::filesystem::path wav = dir / ("tts_" + random_hex(8) + ".wav");
        std::string cmd;
        if (engine.find("flite") != std::string::npos)
        {
            cmd = shell_quote(engine) + " -t " + shell_quote(text) + " -o " + shell_quote(wav.string());
        }
        else
        {
            cmd = shell_quote(engine) + " -w " + shell_quote(wav.string()) + " " + shell_quote(text);
        }

        const int rc = std::system(cmd.c_str());
        if (rc != 0)
        {
            const int exitCode = (rc == -1) ? -1 : (WIFEXITED(rc) ? WEXITSTATUS(rc) : rc);
            err = "TTS command failed with exit code " + std::to_string(exitCode) + ": " + cmd;
            return false;
        }
        if (!std::filesystem::exists(wav, ec) || std::filesystem::file_size(wav, ec) == 0)
        {
            err = "TTS command did not create a WAV file.";
            return false;
        }

        path = wav.string();
        return true;
    }

    bool append_tts_audio_paths_locked(AlarmState& alarm, const std::string& text, std::string& err) const
    {
        const std::vector<TtsPart> parts = parse_tts_parts(text);
        if (parts.empty())
        {
            err = "TTS text is empty.";
            return false;
        }

        bool added = false;
        for (const auto& part : parts)
        {
            std::string path;
            if (part.pause)
            {
                if (!generate_silence_wav_locked(part.pause_ms, path, err)) return false;
                alarm.audio_files.push_back("pause");
            }
            else
            {
                if (!generate_tts_wav_locked(part.text, path, err)) return false;
                alarm.audio_files.push_back("tts");
            }

            alarm.audio_paths.push_back(path);
            if (alarm.audio_file.empty()) alarm.audio_file = part.pause ? "pause" : "tts";
            if (alarm.audio_path.empty()) alarm.audio_path = path;
            added = true;
        }

        if (!added) err = "TTS text is empty.";
        return added;
    }

    void add_tts_audio_paths_locked(AlarmState& alarm) const
    {
        if (alarm.speech_texts.empty()) return;
        for (const auto& text : alarm.speech_texts)
        {
            std::string err;
            if (!append_tts_audio_paths_locked(alarm, text, err))
            {
                std::cerr << "[alarms] TTS generation failed for alarm " << alarm.alarm_id << ": " << err << "\n";
                continue;
            }
        }
    }

    void add_voice_contact_job_locked(const Policy& policy, const Contact& contact, const AlarmState& alarm, const std::string& event_type, std::unordered_set<std::string>& seen)
    {
        if (!contact.enabled) return;
        if (contact.phone.empty()) return;
        if (!seen.insert(contact.id).second) return;

        Route r;
        r.name = policy.name.empty() ? ("voice_modem:" + policy.id) : ("voice_modem:" + policy.name);
        r.type = "voice_modem";
        r.enabled = true;
        r.min_severity = policy.min_severity;
        r.on = policy.on;
        r.repeat_ms = policy.repeat_ms;
        r.until = policy.until;

        Job job;
        job.route = std::move(r);
        job.alarm = alarm;
        job.event_type = event_type;
        job.due_ms = now_ms();
        job.phone = contact.phone;
        job.contact_id = contact.id;
        job.contact_name = contact.name;
        job.policy_id = policy.id;
        modem_jobs_.push_back(std::move(job));
    }

    void enqueue_voice_modem_jobs_locked(const AlarmState& alarm, const std::string& event_type)
    {
        if (!voice_modem_.enabled || voice_modem_.device.empty()) return;
        if (alarm.notification_policy.empty()) return;

        auto pit = policies_.find(alarm.notification_policy);
        if (pit == policies_.end()) return;
        const Policy& policy = pit->second;
        if (!policy.enabled) return;
        if (alarm.severity < policy.min_severity) return;
        if (!vector_contains(policy.on, event_type)) return;

        std::unordered_set<std::string> seen;
        for (const auto& target : policy.targets)
        {
            if (target.type == "contact")
            {
                auto it = contacts_.find(target.id);
                if (it != contacts_.end()) add_voice_contact_job_locked(policy, it->second, alarm, event_type, seen);
            }
            else if (target.type == "group")
            {
                auto git = contact_groups_.find(target.id);
                if (git == contact_groups_.end() || !git->second.enabled) continue;
                for (const auto& cid : git->second.contacts)
                {
                    auto it = contacts_.find(cid);
                    if (it != contacts_.end()) add_voice_contact_job_locked(policy, it->second, alarm, event_type, seen);
                }
            }
        }
    }

    static std::string format_arg(std::string value, const AlarmState& alarm)
    {
        auto replace_all = [&](const std::string& from, const std::string& to) {
            size_t pos = 0;
            while ((pos = value.find(from, pos)) != std::string::npos)
            {
                value.replace(pos, from.size(), to);
                pos += to.size();
            }
        };
        replace_all("{alarm_id}", alarm.alarm_id);
        replace_all("{name}", alarm.name);
        replace_all("{group}", alarm.group);
        replace_all("{site}", alarm.site);
        replace_all("{message}", alarm.message);
        replace_all("{connection_id}", alarm.connection_id);
        replace_all("{tag}", alarm.tag);
        replace_all("{severity}", std::to_string(alarm.severity));
        replace_all("{audio_file}", alarm.audio_file);
        replace_all("{audio_path}", alarm.audio_path);
        return value;
    }

    static std::string basename_for_summary(const std::string& path)
    {
        const auto slash = path.find_last_of('/');
        return slash == std::string::npos ? path : path.substr(slash + 1);
    }

    static std::string audio_sequence_summary(const AlarmState& alarm)
    {
        const std::vector<std::string> paths = !alarm.audio_paths.empty()
            ? alarm.audio_paths
            : (alarm.audio_path.empty() ? std::vector<std::string>{} : std::vector<std::string>{alarm.audio_path});
        if (paths.empty()) return "none";

        std::string out;
        for (const auto& path : paths)
        {
            if (path.empty()) continue;
            if (!out.empty()) out += " -> ";
            out += basename_for_summary(path);
        }
        return out.empty() ? "none" : out;
    }

    static AlarmState alarm_with_audio_path(const AlarmState& alarm, size_t index)
    {
        AlarmState copy = alarm;
        if (index < alarm.audio_files.size()) copy.audio_file = alarm.audio_files[index];
        if (index < alarm.audio_paths.size()) copy.audio_path = alarm.audio_paths[index];
        return copy;
    }

    void apply_audio_default_arg(Job& job) const
    {
        if (job.route.type != "audio_command") return;
        if (!job.route.args.empty()) return;
        if (!job.alarm.audible_enabled) return;
        const std::string path = !job.alarm.audio_paths.empty() ? job.alarm.audio_paths.front() : job.alarm.audio_path;
        if (path.empty()) return;
        job.route.args.push_back(path);
    }

    static bool route_needs_audio_path(const Route& route)
    {
        if (route.args.empty()) return true;
        for (const auto& arg : route.args)
        {
            if (arg.find("{audio_path}") != std::string::npos || arg.find("{audio_file}") != std::string::npos) return true;
        }
        return false;
    }

    static std::string command_string(const Job& job)
    {
        if (job.route.type == "voice_modem")
        {
            return "voice_modem contact=" + job.contact_id + " phone=" + job.phone + " policy=" + job.policy_id + " audio=" + audio_sequence_summary(job.alarm);
        }
        std::string out = job.route.command;
        for (const auto& arg : job.route.args)
        {
            out += " ";
            out += format_arg(arg, job.alarm);
        }
        return out;
    }

    static int run_command(const Job& job)
    {
        std::vector<std::string> args;
        args.push_back(job.route.command);
        for (const auto& arg : job.route.args) args.push_back(format_arg(arg, job.alarm));

        std::vector<char*> argv;
        argv.reserve(args.size() + 1);
        for (auto& arg : args) argv.push_back(arg.data());
        argv.push_back(nullptr);

        pid_t pid = fork();
        if (pid < 0) return -1;
        if (pid == 0)
        {
            execvp(argv[0], argv.data());
            _exit(127);
        }

        int status = 0;
        if (waitpid(pid, &status, 0) < 0) return -1;
        if (WIFEXITED(status)) return WEXITSTATUS(status);
        if (WIFSIGNALED(status)) return 128 + WTERMSIG(status);
        return -1;
    }

    static int run_audio_command_sequence(const Job& job)
    {
        if (!job.alarm.audible_enabled) return 0;
        if (job.alarm.audio_paths.size() <= 1) return run_command(job);

        int lastRc = 0;
        for (size_t i = 0; i < job.alarm.audio_paths.size(); ++i)
        {
            Job part = job;
            part.alarm = alarm_with_audio_path(job.alarm, i);
            if (part.alarm.audio_path.empty()) continue;
            lastRc = run_command(part);
            if (lastRc != 0) return lastRc;
        }
        return lastRc;
    }

    static bool modem_response_ok(const std::string& response)
    {
        return response.find("OK") != std::string::npos ||
               response.find("CONNECT") != std::string::npos ||
               response.find("VCON") != std::string::npos;
    }

    static bool modem_response_error(const std::string& response)
    {
        return response.find("ERROR") != std::string::npos ||
               response.find("NO CARRIER") != std::string::npos ||
               response.find("NO DIALTONE") != std::string::npos ||
               response.find("BUSY") != std::string::npos;
    }

    static bool send_modem_command(ModemSerialPort& port, const std::string& command, int timeout_ms, std::string& response, std::string& err)
    {
        if (!port.write_all(command + "\r", err)) return false;
        response = port.read_for(timeout_ms);
        if (response.empty()) {
            err = "no modem response";
            return false;
        }
        if (modem_response_error(response)) {
            err = response;
            return false;
        }
        return modem_response_ok(response);
    }

    static uint16_t read_le16(const std::vector<uint8_t>& data, size_t off)
    {
        if (off + 2 > data.size()) return 0;
        return static_cast<uint16_t>(data[off]) | (static_cast<uint16_t>(data[off + 1]) << 8);
    }

    static uint32_t read_le32(const std::vector<uint8_t>& data, size_t off)
    {
        if (off + 4 > data.size()) return 0;
        return static_cast<uint32_t>(data[off]) |
               (static_cast<uint32_t>(data[off + 1]) << 8) |
               (static_cast<uint32_t>(data[off + 2]) << 16) |
               (static_cast<uint32_t>(data[off + 3]) << 24);
    }

    static bool load_wav_for_modem(const std::string& path, std::string& pcm, std::string& err)
    {
        std::ifstream in(path, std::ios::binary);
        if (!in) {
            err = "failed to open WAV file: " + path + " (" + std::strerror(errno) + ")";
            return false;
        }
        std::vector<uint8_t> data((std::istreambuf_iterator<char>(in)), std::istreambuf_iterator<char>());
        if (data.size() < 44 || std::string(reinterpret_cast<const char*>(data.data()), 4) != "RIFF" ||
            std::string(reinterpret_cast<const char*>(data.data() + 8), 4) != "WAVE") {
            err = "not a RIFF/WAVE file: " + path;
            return false;
        }

        uint16_t audioFormat = 0;
        uint16_t channels = 0;
        uint32_t sampleRate = 0;
        uint16_t bitsPerSample = 0;
        size_t audioOff = 0;
        size_t audioSize = 0;

        size_t pos = 12;
        while (pos + 8 <= data.size()) {
            const std::string id(reinterpret_cast<const char*>(data.data() + pos), 4);
            const uint32_t size = read_le32(data, pos + 4);
            const size_t chunkData = pos + 8;
            if (chunkData + size > data.size()) break;

            if (id == "fmt ") {
                if (size < 16) {
                    err = "invalid WAV fmt chunk";
                    return false;
                }
                audioFormat = read_le16(data, chunkData);
                channels = read_le16(data, chunkData + 2);
                sampleRate = read_le32(data, chunkData + 4);
                bitsPerSample = read_le16(data, chunkData + 14);
            } else if (id == "data") {
                audioOff = chunkData;
                audioSize = size;
            }

            pos = chunkData + size + (size % 2);
        }

        if (audioFormat != 1) {
            err = "only PCM WAV files are supported";
            return false;
        }
        if (channels < 1 || channels > 2) {
            err = "only mono/stereo WAV files are supported";
            return false;
        }
        if (bitsPerSample != 8 && bitsPerSample != 16) {
            err = "voice modem playback requires 8-bit or 16-bit PCM WAV audio";
            return false;
        }
        if (!audioOff || !audioSize) {
            err = "WAV data chunk not found";
            return false;
        }

        const size_t frameBytes = static_cast<size_t>(channels) * (bitsPerSample / 8);
        const size_t frames = audioSize / frameBytes;
        if (!frames || !sampleRate) {
            err = "WAV file contains no playable samples";
            return false;
        }

        std::vector<int32_t> mono;
        mono.reserve(frames);
        if (bitsPerSample == 8) {
            for (size_t i = 0; i < frames; ++i) {
                int32_t sum = 0;
                for (uint16_t ch = 0; ch < channels; ++ch) {
                    const uint8_t sample = data[audioOff + (i * frameBytes) + ch];
                    sum += (static_cast<int32_t>(sample) - 128) << 8;
                }
                mono.push_back(sum / static_cast<int32_t>(channels));
            }
        } else {
            for (size_t i = 0; i < frames; ++i) {
                int32_t sum = 0;
                for (uint16_t ch = 0; ch < channels; ++ch) {
                    const size_t off = audioOff + (i * frameBytes) + (static_cast<size_t>(ch) * 2);
                    const int16_t sample = static_cast<int16_t>(read_le16(data, off));
                    sum += sample;
                }
                mono.push_back(sum / static_cast<int32_t>(channels));
            }
        }

        if (mono.empty()) {
            err = "WAV file contains no playable samples";
            return false;
        }

        const uint32_t targetRate = 8000;
        const size_t outFrames = std::max<size_t>(1, static_cast<size_t>((static_cast<uint64_t>(mono.size()) * targetRate) / sampleRate));
        pcm.clear();
        pcm.reserve(outFrames);
        for (size_t outIdx = 0; outIdx < outFrames; ++outIdx) {
            const double srcPos = static_cast<double>(outIdx) * static_cast<double>(sampleRate) / static_cast<double>(targetRate);
            const size_t i0 = std::min(static_cast<size_t>(srcPos), mono.size() - 1);
            const size_t i1 = std::min(i0 + 1, mono.size() - 1);
            const double frac = srcPos - static_cast<double>(i0);
            const double sample = static_cast<double>(mono[i0]) + (static_cast<double>(mono[i1] - mono[i0]) * frac);
            const int32_t clamped = std::max<int32_t>(-32768, std::min<int32_t>(32767, static_cast<int32_t>(sample)));
            const uint8_t u8 = static_cast<uint8_t>((clamped + 32768) >> 8);
            pcm.push_back(static_cast<char>(u8));
        }
        return true;
    }

    static std::string dle_escape_voice_data(const std::string& pcm)
    {
        std::string out;
        out.reserve(pcm.size() + 16);
        for (unsigned char ch : pcm) {
            out.push_back(static_cast<char>(ch));
            if (ch == 0x10) out.push_back(static_cast<char>(0x10));
        }
        out.push_back(static_cast<char>(0x10));
        out.push_back(static_cast<char>(0x03));
        return out;
    }

    static bool play_wav_over_modem(ModemSerialPort& port, const std::string& path, int voice_line, int timeout_ms, int post_playback_drain_ms, std::string& result)
    {
        std::string pcm;
        std::string err;
        if (!load_wav_for_modem(path, pcm, err)) {
            result = err;
            return false;
        }

        std::string response;
        // Select normal telephone-line voice path before entering transmit mode.
        send_modem_command(port, "AT+VLS=" + std::to_string(voice_line), timeout_ms, response, err);

        if (!send_modem_command(port, "AT+VSM=1", timeout_ms, response, err)) {
            result = "AT+VSM=1 failed: " + err;
            return false;
        }
        if (!send_modem_command(port, "AT+VTX", timeout_ms, response, err)) {
            result = "AT+VTX failed: " + err;
            return false;
        }
        if (response.find("CONNECT") == std::string::npos) {
            result = "AT+VTX did not enter transmit mode";
            return false;
        }

        const std::string payload = dle_escape_voice_data(pcm);
        if (!port.write_all(payload, err)) {
            result = "voice audio write failed: " + err;
            return false;
        }
        if (post_playback_drain_ms > 0) port.read_for(post_playback_drain_ms);
        result = "played " + std::to_string(pcm.size()) + " samples from " + path;
        return true;
    }

    bool run_voice_modem_call(const Job& job, std::string& result)
    {
        VoiceModemConfig vm;
        {
            std::lock_guard<std::mutex> lock(mu_);
            vm = voice_modem_;
        }

        if (!vm.enabled) {
            result = "voice modem disabled";
            return false;
        }
        if (vm.device.empty()) {
            result = "voice modem device not configured";
            return false;
        }

        const std::string number = sanitize_phone_number(job.phone);
        if (number.empty()) {
            result = "contact has no dialable phone number";
            return false;
        }

        ModemSerialPort port;
        std::string err;
        if (!port.open_port(vm.device, vm.baud, err)) {
            result = "open " + vm.device + " failed: " + err;
            return false;
        }

        std::string response;
        if (!send_modem_command(port, "AT", vm.command_timeout_ms, response, err)) {
            result = "AT failed: " + err;
            return false;
        }

        // Disable echo when supported. A failure here should not block dialing.
        send_modem_command(port, "ATE0", vm.command_timeout_ms, response, err);

        const std::vector<std::string> playbackPaths = !job.alarm.audio_paths.empty()
            ? job.alarm.audio_paths
            : (job.alarm.audio_path.empty() ? std::vector<std::string>{} : std::vector<std::string>{job.alarm.audio_path});
        const bool needsAudioPlayback = !playbackPaths.empty();
        if ((vm.voice_init || needsAudioPlayback) && !send_modem_command(port, "AT+FCLASS=8", vm.command_timeout_ms, response, err)) {
            result = "voice init failed: " + err;
            return false;
        }
        const int voiceLine = std::max(0, std::min(255, vm.voice_line));
        if (needsAudioPlayback && !send_modem_command(port, "AT+VLS=" + std::to_string(voiceLine), vm.command_timeout_ms, response, err)) {
            result = "voice line select failed before dial: " + err;
            return false;
        }

        response.clear();
        err.clear();
        const std::string dialCommand = needsAudioPlayback ? ("ATD" + number) : ("ATD" + number + ";");
        if (!port.write_all(dialCommand + "\r", err)) {
            result = "dial write failed: " + err;
            return false;
        }
        response = port.read_for(vm.command_timeout_ms);
        if (modem_response_error(response)) {
            result = "dial failed: " + response;
            return false;
        }

        const int dialSeconds = std::max(1, std::min(300, vm.dial_seconds));
        const int audioDelaySeconds = std::max(0, std::min(120, vm.audio_delay_seconds));
        const int audioGapMs = std::max(0, std::min(5000, vm.audio_gap_ms));
        std::string playResult;
        int playedCount = 0;
        bool playFailed = false;
        const auto callStarted = std::chrono::steady_clock::now();
        if (needsAudioPlayback) {
            std::this_thread::sleep_for(std::chrono::seconds(audioDelaySeconds));
            // Drain any late dial/answer responses before requesting transmit mode.
            port.read_for(500);
            for (const auto& path : playbackPaths)
            {
                if (path.empty()) continue;
                bool played = play_wav_over_modem(port, path, voiceLine, vm.command_timeout_ms, audioGapMs, playResult);
                if (!played) {
                    playFailed = true;
                    break;
                }
                playedCount++;
            }
        }

        const auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::steady_clock::now() - callStarted).count();
        if (elapsed < dialSeconds) {
            std::this_thread::sleep_for(std::chrono::seconds(dialSeconds - elapsed));
        }

        std::string hangupErr;
        std::string hangupResponse;
        send_modem_command(port, "ATH", vm.command_timeout_ms, hangupResponse, hangupErr);

        result = "called contact=" + job.contact_id + " name=" + job.contact_name + " seconds=" + std::to_string(dialSeconds);
        if (needsAudioPlayback) {
            result += !playFailed
                ? (" audio=played count=" + std::to_string(playedCount) + " files=" + audio_sequence_summary(job.alarm) + " delay=" + std::to_string(audioDelaySeconds) + " gap_ms=" + std::to_string(audioGapMs) + " vls=" + std::to_string(voiceLine))
                : " audio_failed=" + playResult + " files=" + audio_sequence_summary(job.alarm) + " gap_ms=" + std::to_string(audioGapMs) + " vls=" + std::to_string(voiceLine);
        }
        if (playFailed) return false;
        return true;
    }

    bool should_continue_job(const Job& job)
    {
        std::function<bool(const std::string&, const std::string&)> fn;
        {
            std::lock_guard<std::mutex> lock(mu_);
            fn = should_continue_;
        }
        if (!fn) return false;
        return fn(job.alarm.alarm_id, job.route.until);
    }

    void record_attempt(const Job& job, bool ok, const std::string& result)
    {
        AlarmDb* db = nullptr;
        {
            std::lock_guard<std::mutex> lock(mu_);
            attempts_++;
            if (ok) successes_++;
            else failures_++;
            last_attempt_ms_ = now_ms();
            last_route_type_ = job.route.type;
            last_route_name_ = job.route.name;
            last_result_ = result;
            db = db_;
        }
        if (!db) return;

        json attempt;
        attempt["attempt_id"] = "ntf_" + random_hex(16);
        attempt["ts_ms"] = now_ms();
        attempt["route_name"] = job.route.name;
        attempt["route_type"] = job.route.type;
        attempt["alarm_id"] = job.alarm.alarm_id;
        attempt["severity"] = job.alarm.severity;
        attempt["event_type"] = job.event_type;
        attempt["ok"] = ok;
        attempt["result"] = result;
        attempt["command"] = command_string(job);

        std::string err;
        if (!db->insert_notification_attempt(attempt, err))
        {
            std::cerr << "[alarms] notification attempt DB insert failed: " << err << "\n";
        }
    }

    std::deque<Job>& queue_for_locked(JobQueue queue)
    {
        return queue == JobQueue::Audio ? audio_jobs_ : modem_jobs_;
    }

    std::condition_variable& cv_for_locked(JobQueue queue)
    {
        return queue == JobQueue::Audio ? audio_cv_ : modem_cv_;
    }

    void worker_loop(JobQueue queue)
    {
        while (true)
        {
            Job job;
            {
                std::unique_lock<std::mutex> lock(mu_);
                auto& jobs = queue_for_locked(queue);
                auto& cv = cv_for_locked(queue);
                cv.wait(lock, [&]() { return stop_ || !jobs.empty(); });
                if (stop_) return;

                auto best = jobs.begin();
                for (auto it = jobs.begin(); it != jobs.end(); ++it)
                {
                    if (it->due_ms < best->due_ms) best = it;
                }

                const int64_t delay = best->due_ms - now_ms();
                if (delay > 0)
                {
                    cv.wait_for(lock, std::chrono::milliseconds(delay));
                    continue;
                }

                job = std::move(*best);
                jobs.erase(best);
            }

            if (job.event_type == "active" && !should_continue_job(job)) continue;

            bool ok = false;
            std::string result;
            if (job.route.type == "audio_command")
            {
                const int rc = run_audio_command_sequence(job);
                ok = (rc == 0);
                result = "exit_code=" + std::to_string(rc);
            }
            else if (job.route.type == "voice_modem")
            {
                ok = run_voice_modem_call(job, result);
            }
            else
            {
                result = "unsupported route type";
            }
            record_attempt(job, ok, result);

            if (job.event_type == "active" && job.route.repeat_ms > 0 && should_continue_job(job))
            {
                job.due_ms = now_ms() + job.route.repeat_ms;
                std::lock_guard<std::mutex> lock(mu_);
                queue_for_locked(queue).push_back(std::move(job));
                cv_for_locked(queue).notify_all();
            }
        }
    }

    mutable std::mutex mu_;
    std::condition_variable audio_cv_;
    std::condition_variable modem_cv_;
    bool enabled_ = false;
    bool running_ = false;
    bool stop_ = false;
    std::vector<Route> routes_;
    std::deque<Job> audio_jobs_;
    std::deque<Job> modem_jobs_;
    VoiceModemConfig voice_modem_;
    std::unordered_map<std::string, Contact> contacts_;
    std::unordered_map<std::string, ContactGroup> contact_groups_;
    std::unordered_map<std::string, Policy> policies_;
    std::unordered_map<std::string, std::string> audio_paths_;
    AlarmDb* db_ = nullptr;
    std::function<bool(const std::string&, const std::string&)> should_continue_;
    std::string config_dir_;
    std::thread audio_worker_;
    std::thread modem_worker_;
    int64_t attempts_ = 0;
    int64_t successes_ = 0;
    int64_t failures_ = 0;
    int64_t last_attempt_ms_ = 0;
    std::string last_route_type_;
    std::string last_route_name_;
    std::string last_result_;
};

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
    NotificationManager* notifications = nullptr;

    void set_db(AlarmDb* ptr) { db = ptr; }
    void set_ws(AlarmWs* ptr) { ws = ptr; }
    void set_ua(AlarmUa* ptr) { ua = ptr; }
    void set_notifications(NotificationManager* ptr) { notifications = ptr; }

    bool should_continue_notification(const std::string& alarm_id, const std::string& until) const
    {
        std::lock_guard<std::mutex> lock(mu);
        auto it = states.find(alarm_id);
        if (it == states.end()) return false;

        const AlarmState& s = it->second;
        const int64_t t = now_ms();
        const bool shelved = s.shelved_until_ms.has_value() && t < s.shelved_until_ms.value();
        if (!s.enabled || shelved) return false;

        if (until == "returned") return s.active;
        if (until == "acked") return s.active && !s.acked;
        if (until == "manual") return s.active;
        return s.active && !s.acked;
    }

    void restore_state_from_db(int64_t since_ms)
    {
        if (!db) return;
        json events = json::array();
        std::string err;
        if (!db->fetch_events_since(since_ms, 50000, events, err))
        {
            std::cerr << "[alarms] DB restore skipped: " << err << "\n";
            return;
        }
        if (!events.is_array() || events.empty()) return;

        int64_t lastChange = last_alarm_change_ms.load();
        {
            std::lock_guard<std::mutex> lock(mu);
            for (const auto& ev : events)
            {
                if (!ev.is_object()) continue;
                const std::string alarmId = ev.value("alarm_id", "");
                const std::string type = ev.value("type", "");
                const int64_t ts = ev.value("ts_ms", 0LL);
                if (alarmId.empty() || type.empty() || ts <= 0) continue;

                auto it = states.find(alarmId);
                if (it == states.end()) continue;
                AlarmState& s = it->second;

                s.last_change_ms = ts;
                if (ts > lastChange) lastChange = ts;
                if (ev.contains("value")) s.last_value = ev["value"];
                if (ev.contains("message") && ev["message"].is_string()) s.message = ev["message"].get<std::string>();

                if (type == "active")
                {
                    s.active = true;
                    s.acked = false;
                    s.active_since_ms = ts;
                }
                else if (type == "return" || type == "reset" || type == "clear")
                {
                    s.active = false;
                }
                else if (type == "ack")
                {
                    s.acked = true;
                }
                else if (type == "unack")
                {
                    s.acked = false;
                }
                else if (type == "shelve")
                {
                    int64_t until = 0;
                    if (ev.contains("value") && ev["value"].is_object())
                    {
                        until = ev["value"].value("until_ms", 0LL);
                    }
                    if (until > 0) s.shelved_until_ms = until;
                }
                else if (type == "unshelve")
                {
                    s.shelved_until_ms.reset();
                }
            }
        }

        last_alarm_change_ms.store(lastChange);

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
        const bool hasRulesArr = root.contains("rules") && root["rules"].is_array();
        const bool hasAlarmsArr = root.contains("alarms") && root["alarms"].is_array();
        if (hasRulesArr && !root["rules"].empty())
        {
            rulesArr = root["rules"];
        }
        else if (hasAlarmsArr)
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
                if (a.contains("repeat_ms")) r["repeat_ms"] = a["repeat_ms"];
                if (a.contains("audible_enabled")) r["audible_enabled"] = a["audible_enabled"];
                if (a.contains("audio_file")) r["audio_file"] = a["audio_file"];
                if (a.contains("speech_text")) r["speech_text"] = a["speech_text"];
                r["source"] = {
                    {"connection_id", a.value("connection_id", "")},
                    {"tag", a.value("tag_name", a.value("tag", ""))}
                };
                r["condition"] = {{"type", type}};
                if (type == "equals" || type == "not_equals")
                {
                    if (a.contains("value")) r["condition"]["value"] = a["value"];
                    else if (a.contains("equals_value")) r["condition"]["value"] = a["equals_value"];
                    // Backward-compat / UI convenience: allow type=equals to use "threshold" as the target value.
                    else if (a.contains("threshold")) r["condition"]["value"] = a["threshold"];
                }
                else if (type == "high" || type == "low")
                {
                    if (a.contains("threshold")) r["condition"]["threshold"] = a["threshold"];
                    if (a.contains("hysteresis")) r["condition"]["hysteresis"] = a["hysteresis"];
                }
                rulesArr.push_back(r);
            }
        }
        else if (hasRulesArr)
        {
            // Accept an empty {"rules": []} config (no alarms configured).
            rulesArr = root["rules"];
        }
        else
        {
            throw std::runtime_error("Invalid alarms.json; expected {\"rules\":[...]} or {\"alarms\":[...]}");
        }

        if (notifications)
        {
            notifications->configure(notification_config_from_root(root));
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
                if (r.condition_type == "equals" || r.condition_type == "not_equals")
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
            r.notification_policy = it.value("notification_policy", "");
            const ResolvedAlarmAudio audio = resolve_alarm_audio(root, it, dirname_of(path));
            r.audible_enabled = audio.audible_enabled;
            r.audio_file = audio.audio_file;
            r.audio_path = audio.audio_path;
            r.speech_text = audio.speech_text;
            r.audio_files = audio.audio_files;
            r.audio_paths = audio.audio_paths;
            r.speech_texts = audio.speech_texts;
            const ResolvedAlarmRepeat rep = resolve_alarm_repeat(root, it);
            r.repeat_override = rep.repeat_override;
            r.repeat_ms = rep.repeat_ms;

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
            s.audible_enabled = r.audible_enabled;
            s.audio_file = r.audio_file;
            s.audio_path = r.audio_path;
            s.speech_text = r.speech_text;
            s.audio_files = r.audio_files;
            s.audio_paths = r.audio_paths;
            s.speech_texts = r.speech_texts;
            s.notification_policy = r.notification_policy;
            s.repeat_override = r.repeat_override;
            s.repeat_ms = r.repeat_ms;
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
        apply_tag_update(connection_id, tag, value, true);
    }

    void apply_tag_update(const std::string &connection_id, const std::string &tag, const json &value, bool recordEvent)
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
                    if (r.condition_type == "equals" || r.condition_type == "not_equals")
                    {
                        if (!r.condition_value.is_null())
                        {
                            const bool match = json_equalish(value, r.condition_value);
                            should_be_active = (r.condition_type == "equals") ? match : !match;
                        }
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
                    if (recordEvent)
                    {
                        std::cout << "[alarms] ACTIVE " << s.alarm_id
                                  << " (" << s.connection_id << ":" << s.tag << ")"
                                  << " value=" << s.last_value.dump()
                                  << " severity=" << s.severity << "\n";
                        log_event(s, "active", s.last_value);
                        if (notifications) notifications->notify_event(s, "active");
                    }
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
                    if (recordEvent)
                    {
                        std::cout << "[alarms] RETURN " << s.alarm_id
                                  << " (" << s.connection_id << ":" << s.tag << ")"
                                  << " value=" << s.last_value.dump() << "\n";
                        log_event(s, "return", s.last_value);
                        if (notifications) notifications->notify_event(s, "return");
                    }
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
            if (notifications) notifications->notify_event(it->second, "ack");
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
            if (notifications) notifications->notify_event(it->second, "shelve");
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
            if (notifications) notifications->notify_event(it->second, "unshelve");
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
                           const std::string &opcbridgeHost,
                           uint16_t opcbridgeHttpPort,
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

    auto seed_subscriptions_from_http = [&]() {
        const auto keys = engine.subscription_keys();
        if (keys.empty()) return;

        std::unordered_set<std::string> want;
        want.reserve(keys.size());
        for (const auto& k : keys) want.insert(k);

        httplib::Client cli(opcbridgeHost, opcbridgeHttpPort);
        cli.set_read_timeout(5, 0);
        cli.set_connection_timeout(5, 0);

        auto res = cli.Get("/tags");
        if (!res || res->status != 200) return;

        json body;
        try
        {
            body = json::parse(res->body);
        }
        catch (...)
        {
            return;
        }

        if (!body.is_object() || !body.contains("tags") || !body["tags"].is_array()) return;
        for (const auto& t : body["tags"])
        {
            if (!t.is_object()) continue;
            const std::string conn = t.value("connection_id", "");
            const std::string name = t.value("name", "");
            if (conn.empty() || name.empty()) continue;
            const std::string k = conn + ":" + name;
            if (want.find(k) == want.end()) continue;
            if (!t.contains("value")) continue;
            // Seed current values from HTTP so alarms that are already active at boot can
            // immediately generate an ACTIVE event and be visible in history/panels.
            // This will not duplicate events after restarts because restore_state_from_db()
            // is run before WS connect, so already-active alarms will be active here too.
            engine.apply_tag_update(conn, name, t["value"], true);
        }
    };

    ws.setOnMessageCallback([&](const ix::WebSocketMessagePtr &msg) {
        if (!msg) return;

        if (msg->type == ix::WebSocketMessageType::Open)
        {
            connected.store(true);
            std::cout << "[alarms] opcbridge WS connected\n";
            lastSentGeneration = subscriptionGeneration.load();
            send_subscribe();
            seed_subscriptions_from_http();
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
            seed_subscriptions_from_http();
        }
    }

    ws.stop();
}

static bool fetch_rules_from_opcbridge(AlarmEngine &engine,
                                      const std::string &host,
                                      uint16_t port,
                                      const std::string &adminToken,
                                      const std::string &configDir,
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

    // Defensive: some tooling may accidentally save the /config/alarms HTTP response body
    // (which includes {"json":{...}}) directly into alarms.json. If so, unwrap it.
    if (rulesRoot.contains("json") && rulesRoot["json"].is_object() &&
        (!rulesRoot.contains("rules") && !rulesRoot.contains("alarms")))
    {
        rulesRoot = rulesRoot["json"];
    }

    // Accept either schema:
    // - {"rules":[...]} (alarm-server style)
    // - {"alarms":[...]} (opcbridge style)
    if (!rulesRoot.contains("rules") && !rulesRoot.contains("alarms")) {
        // default empty
        rulesRoot["rules"] = json::array();
    }

    if (engine.notifications)
    {
        engine.notifications->set_config_dir(dirname_of(configDir));
        engine.notifications->configure(notification_config_from_root(rulesRoot));
    }

    // Serialize to reuse existing loader/parser.
    const std::string tmp = rulesRoot.dump(2);
    try {
        std::unordered_map<std::string, AlarmRule> nextRules;
        std::unordered_map<std::string, AlarmState> nextStates;
        std::unordered_map<std::string, std::vector<std::string>> nextByKey;

        // Normalize into an array of rule objects.
        json rulesArr = json::array();
        const bool hasRulesArr = rulesRoot.contains("rules") && rulesRoot["rules"].is_array();
        const bool hasAlarmsArr = rulesRoot.contains("alarms") && rulesRoot["alarms"].is_array();
        if (hasRulesArr && !rulesRoot["rules"].empty())
        {
            rulesArr = rulesRoot["rules"];
        }
        else if (hasAlarmsArr)
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
                if (a.contains("repeat_ms")) r["repeat_ms"] = a["repeat_ms"];
                if (a.contains("audible_enabled")) r["audible_enabled"] = a["audible_enabled"];
                if (a.contains("audio_file")) r["audio_file"] = a["audio_file"];
                if (a.contains("speech_text")) r["speech_text"] = a["speech_text"];
                r["source"] = {
                    {"connection_id", a.value("connection_id", "")},
                    {"tag", a.value("tag_name", a.value("tag", ""))}
                };
                r["condition"] = {{"type", type}};
                if (type == "equals" || type == "not_equals")
                {
                    if (a.contains("value")) r["condition"]["value"] = a["value"];
                    else if (a.contains("equals_value")) r["condition"]["value"] = a["equals_value"];
                    // Backward-compat / UI convenience: allow type=equals to use "threshold" as the target value.
                    else if (a.contains("threshold")) r["condition"]["value"] = a["threshold"];
                }
                else if (type == "high" || type == "low")
                {
                    if (a.contains("threshold")) r["condition"]["threshold"] = a["threshold"];
                    if (a.contains("hysteresis")) r["condition"]["hysteresis"] = a["hysteresis"];
                }
                rulesArr.push_back(r);
            }
        }
        else if (hasRulesArr)
        {
            rulesArr = rulesRoot["rules"];
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
                if (r.condition_type == "equals" || r.condition_type == "not_equals")
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
            r.notification_policy = it.value("notification_policy", "");
            const ResolvedAlarmAudio audio = resolve_alarm_audio(rulesRoot, it, dirname_of(configDir));
            r.audible_enabled = audio.audible_enabled;
            r.audio_file = audio.audio_file;
            r.audio_path = audio.audio_path;
            r.speech_text = audio.speech_text;
            r.audio_files = audio.audio_files;
            r.audio_paths = audio.audio_paths;
            r.speech_texts = audio.speech_texts;
            const ResolvedAlarmRepeat rep = resolve_alarm_repeat(rulesRoot, it);
            r.repeat_override = rep.repeat_override;
            r.repeat_ms = rep.repeat_ms;

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
            s.audible_enabled = r.audible_enabled;
            s.audio_file = r.audio_file;
            s.audio_path = r.audio_path;
            s.speech_text = r.speech_text;
            s.audio_files = r.audio_files;
            s.audio_paths = r.audio_paths;
            s.speech_texts = r.speech_texts;
            s.notification_policy = r.notification_policy;
            s.repeat_override = r.repeat_override;
            s.repeat_ms = r.repeat_ms;
            nextStates[r.id] = s;

            const std::string key = r.connection_id + ":" + r.tag;
            nextByKey[key].push_back(r.id);
        }

        std::lock_guard<std::mutex> lock(engine.mu);
        // Preserve runtime state across config reloads to avoid re-annunciating alarms
        // simply because alarms.json changed. Do this at swap time so we don't race
        // ongoing tag updates.
        for (auto &kv : nextStates)
        {
            const std::string &id = kv.first;
            AlarmState &s = kv.second;
            auto it = engine.states.find(id);
            if (it == engine.states.end()) continue;
            const AlarmState &prev = it->second;

            // Carry over live state; keep rule-derived fields from the new config.
            s.active = prev.active;
            s.acked = prev.acked;
            s.active_since_ms = prev.active_since_ms;
            s.last_change_ms = prev.last_change_ms;
            s.last_value = prev.last_value;
            s.message = prev.message;
            s.shelved_until_ms = prev.shelved_until_ms;
        }
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
                      << " (suite " << OPCBRIDGE_SUITE_VERSION << ")"
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
    NotificationManager notifications;
    engine.set_notifications(&notifications);
    notifications.set_config_dir(configDir);
    notifications.set_should_continue([&engine](const std::string& alarm_id, const std::string& until) {
        return engine.should_continue_notification(alarm_id, until);
    });
    try
    {
        const char* env = std::getenv("OPCBRIDGE_ADMIN_SERVICE_TOKEN");
        if (adminToken.empty() && env && *env) adminToken = std::string(env);

        std::string err;
        bool loadedFromOpcbridge = false;
        if (!adminToken.empty())
        {
            loadedFromOpcbridge = fetch_rules_from_opcbridge(engine, opcbridgeHost, opcbridgeHttpPort, adminToken, configDir, err);
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
        notifications.set_db(&db);
        notifications.start();
    }

    // Restore last-known alarm state from history (so /alarm/api/alarms/all is populated after restart).
    {
        const int64_t since = now_ms() - (14LL * 24LL * 60LL * 60LL * 1000LL);
        engine.restore_state_from_db(since);
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
    std::thread wsThread([&]() { ws_client_loop(stop, engine, wsUrl, opcbridgeHost, opcbridgeHttpPort, subscriptionGeneration); });

    std::thread configThread([&]() {
        if (adminToken.empty()) return;
        while (!stop.load())
        {
            std::this_thread::sleep_for(std::chrono::seconds(5));
            std::string err;
            const int64_t prev = engine.last_config_mtime_ms.load();
            if (!fetch_rules_from_opcbridge(engine, opcbridgeHost, opcbridgeHttpPort, adminToken, configDir, err)) {
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
                const int64_t since = now_ms() - (14LL * 24LL * 60LL * 60LL * 1000LL);
                engine.restore_state_from_db(since);
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
	        j["version"] = OPCBRIDGE_ALARMS_VERSION; // backward compat
	        j["component_version"] = OPCBRIDGE_ALARMS_VERSION;
	        j["suite_version"] = OPCBRIDGE_SUITE_VERSION;
	        j["uptime_ms"] = now_ms() - startMs;
        j["db"] = db.status_json();
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
        j["notifications"] = notifications.status_json();
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
        // Always include current active alarms as synthetic snapshot entries so an alarm
        // that is already active at boot appears in UIs even if there has been no DB event yet.
        {
            json active = engine.get_active(false);
            if (active.is_array() && !active.empty()) {
                if (!j["events"].is_array()) j["events"] = json::array();

                std::unordered_set<std::string> existing;
                for (const auto &ev : j["events"]) {
                    if (ev.is_object() && ev.contains("alarm_id") && ev["alarm_id"].is_string()) {
                        existing.insert(ev["alarm_id"].get<std::string>());
                    }
                }

                for (const auto &a : active) {
                    const std::string alarm_id = a.value("alarm_id", a.value("id", ""));
                    if (alarm_id.empty()) continue;
                    if (existing.count(alarm_id)) continue;

                    json ev;
                    ev["synthetic"] = true;
                    // Treat as an "active" event so UIs can show an alarm that is
                    // already active at boot even if the DB has no transition yet.
                    ev["type"] = "active";
                    ev["event_id"] = std::string("snap_") + random_hex(16);
                    ev["alarm_id"] = alarm_id;
                    ev["severity"] = a.value("severity", 0);
                    ev["group"] = a.value("group", "");
                    ev["site"] = a.value("site", "");
                    ev["actor"] = nullptr;
                    ev["note"] = nullptr;
                    ev["message"] = a.value("message", "");
                    const int64_t ts =
                        a.contains("active_since_ms") && a["active_since_ms"].is_number_integer()
                            ? a["active_since_ms"].get<int64_t>()
                            : (a.contains("last_change_ms") && a["last_change_ms"].is_number_integer()
                                   ? a["last_change_ms"].get<int64_t>()
                                   : now_ms());
                    ev["ts_ms"] = ts;
                    ev["source"] = (a.contains("source") && a["source"].is_object()) ? a["source"] : json::object();
                    ev["value"] = a.contains("last_value") ? a["last_value"] : nullptr;
                    j["events"].push_back(ev);
                }
            }
        }
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

    svr.Post("/alarm/api/voice-modem/test", [&](const httplib::Request &req, httplib::Response &res) {
        json body;
        try { body = json::parse(req.body); } catch (...) { body = json::object(); }

        NotificationManager::TestCallRequest test;
        test.contact_id = body.value("contact_id", "test");
        test.contact_name = body.value("contact_name", "Test Call");
        test.phone = body.value("phone", "");
        test.audio_file = body.value("audio_file", "");
        test.tts_text = body.value("tts_text", "");

        json j;
        if (test.phone.empty())
        {
            res.status = 400;
            j["ok"] = false;
            j["error"] = "Phone number is required.";
            res.set_content(j.dump(2), "application/json");
            return;
        }

        std::string result;
        const bool ok = notifications.test_voice_modem_call(test, result);
        res.status = ok ? 200 : 500;
        j["ok"] = ok;
        j["result"] = result;
        if (!ok) j["error"] = result.empty() ? "Voice modem test call failed." : result;
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
    notifications.stop();
    wsServer.stop();
    uaServer.stop();
    db.close();
    return 0;
}
