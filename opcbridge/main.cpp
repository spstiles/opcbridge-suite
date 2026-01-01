// main.cpp - AB/libplctag "OPC bridge core" with:
//   - JSON-with-comments config for connections/tags
//   - Multi-connection EtherNet/IP via libplctag
//   - Tag table snapshots, read/write
//   - Modes: poll, write, dump, dump-json, http, opcua, version
//   - HTTP dashboard + REST API
//   - Simple OPC UA server (DemoVar) using open62541
//
// Build example (from /projects/opcbridge):
//   ./build.sh
//
// Where build.sh does something like:
//   g++ -std=c++17 main.cpp open62541.c -o opcbridge
//       -DOPCBRIDGE_VERSION=\"0.1.0\" -lplctag -pthread

#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <map>
#include <variant>
#include <chrono>
#include <thread>
#include <stdexcept>
#include <cctype>
#include <mutex>
#include <shared_mutex>
#include <deque>
#include <condition_variable>
#include <random>
#include <sstream>
#include <iomanip>
#include <cstdlib>
#include <atomic>
#include <queue>

// Version info (wired in via build.sh)
#ifndef OPCBRIDGE_VERSION
#define OPCBRIDGE_VERSION "dev"
#endif
#ifndef OPCBRIDGE_SUITE_VERSION
#define OPCBRIDGE_SUITE_VERSION "dev"
#endif

#include <unistd.h>
#include <limits.h>
#include <libgen.h>
#include <sys/stat.h>

#include <filesystem>

#include <libplctag.h>      // IMPORTANT: libplctag header
#include <nlohmann/json.hpp>
#include "httplib.h"
#include <unordered_map>
#include <unordered_set>
#include <sqlite3.h>
#include "ws.h"
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/crypto.h>
#include <unordered_map>
#include <cmath>

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
#include <mosquitto.h>
}

#ifndef OPCBRIDGE_VERSION
#define OPCBRIDGE_VERSION "dev"
#endif

using json = nlohmann::json;
namespace fs = std::filesystem;

// -----------------------------
// Config & runtime structures
// -----------------------------

struct AdminAuthInfo {
    std::string salt_hex;
    std::string hash_hex;
};

static AdminAuthInfo g_adminAuth;
static bool g_legacyAdminConfigured = false;
static bool g_adminAuthFilePresent = false;
static std::string g_adminAuthLoadError;

static bool g_userStoreConfigured = false;
static int g_authTimeoutMinutes = 0; // idle timeout; 0 disables
struct AuthRoleRecord {
    std::string id;          // machine id, used by users.role
    std::string label;       // human label
    std::string description; // optional
    int rank = 0;            // 0..3 (viewer..admin)
};
static std::vector<AuthRoleRecord> g_authRoles;
struct AuthUserRecord {
    std::string username;
    std::string role; // role id (default: viewer|operator|editor|admin)
    int iterations = 150000;
    std::string salt_b64;
    std::string hash_b64;
};
static std::vector<AuthUserRecord> g_authUsers;

struct AdminSessionInfo {
    std::chrono::system_clock::time_point expires_at;
    std::chrono::system_clock::time_point last_activity_at;
    std::string username;
    std::string role; // viewer|operator|editor|admin
};

static std::unordered_map<std::string, AdminSessionInfo> g_adminSessions;
static std::mutex g_adminMutex;

// Incremented when configuration (drivers/tags) is replaced so the poll loop can
// safely skip stale work-in-flight.
static std::atomic<uint64_t> g_configGeneration{1};

struct ConnectionConfig {
    std::string id;
    std::string driver;      // "ab_eip" for now
    std::string gateway;     // IP/host of PLC or ENxT
    std::string path;        // CIP path ("1,0"), built from slot if empty
    std::string plc_type;    // "lgx", "mlgx", "plc5", "slc"
    int slot = 0;
    int default_timeout_ms = 1000;
    int default_read_ms    = 1000;
    int default_write_ms   = 1000;
    int debug              = 0;
};

struct TagConfig {
    std::string logical_name;
    std::string plc_tag_name;
    std::string datatype;
    int scan_ms = 1000;
    bool enabled = true; // legacy configs default to enabled
    bool writable = false;

    // MQTT command and event logging
    bool mqtt_command_allowed = false;
    bool log_event_on_change  = false;

    // Periodic logging options (all optional)
    bool log_periodic = false;                 // master enable
    std::string log_periodic_mode;             // "interval", "hourly", "daily"

    // interval mode
    int log_periodic_interval_sec = 0;         // e.g. 900 for 15 minutes

    // (future) hourly mode: log at HH:<minute> each hour
    int log_hourly_minute = 0;                 // 0–59

    // (future) daily mode: log at HH:MM once per day
    int log_daily_hour   = 0;                 // 0–23
    int log_daily_minute = 0;                 // 0–59
};

struct TagRuntime {
    TagConfig cfg;
    int32_t handle = PLCTAG_ERR_NOT_FOUND;
    std::chrono::steady_clock::time_point next_poll;

    // Periodic logging runtime state
    bool periodic_enabled = false;
    std::chrono::system_clock::time_point next_periodic_log;
};

struct TagFile {
    std::string connection_id;
    std::vector<TagConfig> tags;
};

struct DriverContext {
    ConnectionConfig conn;
    std::vector<TagRuntime> tags;
};

// Tag table structures
using TagValue = std::variant<bool, int16_t, int32_t, uint16_t, uint32_t, float, double>;

struct TagSnapshot {
    std::string connection_id;
    std::string logical_name;
    std::string datatype;
    TagValue value;
    std::chrono::system_clock::time_point timestamp;
    int quality; // 0=bad, 1=good
};

// Forward declaration so write_single_tag can use it
bool snapshot_values_equal(const TagSnapshot &a, const TagSnapshot &b);

// Forward declaration so we can call this from the poll loop
bool sqlite_log_event(const std::string &connection_id,
                      const std::string &tag_name,
                      const std::string &old_value,
                      const std::string &new_value,
                      int old_quality,
                      int new_quality,
                      int64_t timestamp_ms,
                      const std::string &extra_json);

// Forward declaration for JSON comment stripping
std::string strip_json_comments(const std::string &input);

// -----------------------------
// Alarm structures
// -----------------------------

struct AlarmConfig {
    std::string id;
    std::string name;  // human-readable label for operators
    std::string group; // Group -> Site (operator location hierarchy)
    std::string site;
    std::string connection_id;
    std::string tag_name;   // logical_name
    std::string type;       // "high", "low", "change", "equals", "not_equals"
    double threshold = 0.0;
    double hysteresis = 0.0;
    bool enabled = true;
    int severity = 500; // 0..1000 (higher = more severe)
    std::string message_on_active;
    std::string message_on_return; // for "cleared"/"return"
    json equals_value = nullptr;   // used for "equals"
    double equals_tolerance = 0.0; // used for numeric equals comparisons
};

struct AlarmRuntime {
    AlarmConfig cfg;
    bool active = false;    // for high/low; ignored for "change"
    TagValue lastValue{};   // for "change" detection
    bool hasLastValue = false;
};

// Global alarm list and tag→alarm index
static std::vector<AlarmRuntime> g_alarms;
static std::unordered_map<std::string, std::vector<size_t>> g_alarmIndexByTag;


// -----------------------------
// MQTT structures & globals
// -----------------------------

struct MqttConfig {
    bool enabled = false;
    std::string host = "127.0.0.1";
    int port = 1883;
    std::string client_id = "opcbridge";
    std::string base_topic = "opcbridge/tags";
    int qos = 0;
    bool retain = false;
    int reconnect_interval_sec = 5;
    int keepalive = 60;
    std::string username;
    std::string password;
    bool publish_only_on_change = true;
    std::string payload_format = "json";

    // Subscribe → write
    bool subscribe_enabled = false;       // if true, we subscribe for commands
    std::string command_topic;            // e.g. "opcbridge/cmd"

    // Existing publish patterns / heartbeat
    int  heartbeat_sec      = 30;
    bool publish_per_field  = true;
    bool publish_tag_json   = true;
    bool publish_conn_json  = false;

    // ACK topic
    std::string ack_topic_prefix = "opcbridge/ack";

    // Simple shared-secret protection for MQTT commands
    bool        require_write_token = false;
    std::string write_token;

    // ---------- NEW: TLS options ----------
    bool        use_tls     = false;   // enable TLS
    std::string cafile;               // path to CA file (PEM)
    std::string capath;               // optional directory of CAs
    std::string certfile;             // client cert (optional)
    std::string keyfile;              // client key (optional)
    std::string tls_version;          // e.g. "tlsv1.2" or "" for default
    bool        tls_insecure = false; // allow self-signed / hostname mismatch (not recommended in prod)
};

struct MqttTagState {
    bool hasValue = false;
    TagValue lastValue{};
    std::chrono::system_clock::time_point lastPublish{};
};

struct MqttConnState {
    bool hasPublish = false;
    std::chrono::system_clock::time_point lastPublish{};
};

static MqttConfig g_mqttCfg;
static mosquitto *g_mqtt = nullptr;
static std::unordered_map<std::string, MqttTagState> g_mqttTagState;
static std::unordered_map<std::string, MqttConnState> g_mqttConnState;
static std::mutex g_mqttMutex;

// -----------------------------
// MQTT telemetry input mappings
// -----------------------------
struct MqttInputMapping {
    std::string id;              // friendly name
    std::string topic;           // exact MQTT topic to match

    std::string connection_id;   // PLC connection id (or virtual)
    std::string tag_name;        // logical tag name
    std::string datatype;        // "int32", "float32", "bool", etc.

    bool write_to_plc = true;    // write into PLC tag via libplctag
    std::string payload_format;  // "raw" or "json_field"
    std::string json_field;      // if payload_format == "json_field"
};

// All loaded mappings (owned here)
static std::vector<MqttInputMapping> g_mqttInputs;

// Fast lookup: topic -> indices into g_mqttInputs
static std::unordered_map<std::string, std::vector<size_t>> g_mqttInputsByTopic;


struct UaTagBinding {
    int32_t handle;   // libplctag handle
    std::string datatype;
    UA_NodeId nodeId; // UA node id for this variable
    ConnectionConfig *conn; // pointer into drivers (lifetime = whole run_opcua_server)
    std::string logical_name;
//    int scan_ms;
//    std::chrono::steady_clock::time_point next_poll;
    bool writable;    // NEW: whether UA writes should go to PLC
};

//extern struct UaTagBinding; // if needed, or keep where it is

// OPC UA global state
static UA_Server *g_uaServer = nullptr;
static std::vector<UaTagBinding> g_uaBindings;
static std::unordered_map<std::string, size_t> g_uaBindingIndex;

// helper to key bindings by connection + logical tag name
static std::string ua_key(const std::string &connId,
                          const std::string &logicalName) {
    return connId + "::" + logicalName;
}

static sqlite3 *g_alarmDb = nullptr;
static std::mutex g_alarmDbMutex;
bool sqlite_init(const std::string &configDir);

using TagTable = std::map<std::string, TagSnapshot>; // key "conn:tag"

// Forward declaration so MQTT callbacks can call this:
bool write_tag_by_name(std::vector<DriverContext> &drivers,
                       const std::string &conn_id,
                       const std::string &logical_name,
                       const std::string &value_str,
                       TagTable &table,
                       std::mutex &driverMutex);

// MQTT write-back context (used by callbacks)
static std::vector<DriverContext> *g_mqttDrivers      = nullptr;
static TagTable                   *g_mqttTagTable     = nullptr;
static std::mutex                 *g_mqttDriverMutex  = nullptr;
static std::shared_mutex          *g_plcMutex         = nullptr;

// Polling performance metrics (updated by poller threads; exposed via GET /metrics).
struct ConnPollMetrics {
    std::atomic<uint64_t> reads_total{0};
    std::atomic<uint64_t> reads_ok{0};
    std::atomic<uint64_t> reads_err{0};

    std::atomic<uint64_t> read_us_total{0};
    std::atomic<uint64_t> read_us_max{0};
    std::atomic<uint64_t> read_us_last{0};

    std::atomic<int64_t> last_ok_ts_ms{-1};
    std::atomic<int64_t> last_err_ts_ms{-1};
};

static std::mutex g_metricsMutex;
static std::unordered_map<std::string, std::shared_ptr<ConnPollMetrics>> g_connPollMetrics;

// Used to coordinate /reload with the poller threads so we don't destroy handles
// while pollers are still running.
static std::atomic<uint64_t> g_pollers_running_gen{0};

struct ReloadState {
    bool requested = false;
    bool in_progress = false;
    bool done = false;
    bool ok = false;
    uint64_t gen = 0;
    std::string error;
};

static std::mutex g_reloadMutex;
static std::condition_variable g_reloadCv;
static ReloadState g_reloadState;

// Forward declaration so mqtt_on_message can publish results
void mqtt_publish_raw(const std::string &topic,
                      const std::string &payload);

std::string mqtt_sanitize(const std::string &s);

static void mqtt_on_connect(struct mosquitto *mosq, void *, int rc);
static void mqtt_on_disconnect(struct mosquitto *, void *, int rc);
static void mqtt_on_message(struct mosquitto *mosq, void *userdata, const struct mosquitto_message *msg);
void mqtt_publish_command_ack(const std::string &conn_id,
                              const std::string &tag_name,
                              const std::string &value_str,
                              bool ok,
                              const std::string &error_msg,
                              const std::string &topic_suffix,
                              int64_t ts_ms,
                              const std::string &source_topic);

static inline void atomic_update_max(std::atomic<uint64_t> &a, uint64_t v)
{
    uint64_t cur = a.load(std::memory_order_relaxed);
    while (cur < v && !a.compare_exchange_weak(cur, v, std::memory_order_relaxed)) {
        // loop
    }
}

// -----------------------------
// Forward declarations (MQTT telemetry helpers)
// -----------------------------
bool handle_mqtt_telemetry_message(const std::string &topic,
                                   const std::string &payload);

bool parse_string_to_tagvalue(const std::string &s,
                              const std::string &dt,
                              TagValue &out);

std::string make_tag_key(const std::string &conn_id,
                         const std::string &logical_name);

static std::string snapshot_value_to_string(const TagSnapshot &snap);

// Forward declarations for file helpers used by admin auth.
// These must match the actual definitions later in the file.
static std::string read_file_to_string(const std::string &path);
static void write_string_to_file(const std::string &path, const std::string &contents);


// ================================================================
// MQTT CALLBACK: On Connect
// ================================================================
static void mqtt_on_connect(struct mosquitto *mosq, void *, int rc) {
    if (rc == 0) {
        std::cout << "[mqtt] Connected successfully.\n";

        // Subscribe to command topic if enabled
        if (g_mqttCfg.subscribe_enabled && !g_mqttCfg.command_topic.empty()) {
            std::string sub = g_mqttCfg.command_topic + "/#";
            int sRC = mosquitto_subscribe(mosq, nullptr, sub.c_str(), g_mqttCfg.qos);

            if (sRC == MOSQ_ERR_SUCCESS) {
                std::cout << "[mqtt] Subscribed to MQTT command topic: " << sub << "\n";
            } else {
                std::cerr << "[mqtt] Failed to subscribe to " << sub
                          << ": " << mosquitto_strerror(sRC) << "\n";
            }
        }

        // Subscribe to telemetry topics from mqtt_inputs.json
        if (!g_mqttInputs.empty()) {
            std::cout << "[mqtt-inputs] Subscribing to " << g_mqttInputs.size()
                      << " telemetry topic(s)...\n";

            for (const auto &m : g_mqttInputs) {
                if (m.topic.empty()) continue;

                int sRC = mosquitto_subscribe(mosq, nullptr, m.topic.c_str(), g_mqttCfg.qos);
                if (sRC == MOSQ_ERR_SUCCESS) {
                    std::cout << "[mqtt-inputs] Subscribed to telemetry topic: "
                              << m.topic << " (id=" << m.id << ")\n";
                } else {
                    std::cerr << "[mqtt-inputs] Failed to subscribe telemetry topic "
                              << m.topic << " (id=" << m.id << "): "
                              << mosquitto_strerror(sRC) << "\n";
                }
            }
        } else {
            std::cout << "[mqtt-inputs] No telemetry inputs configured; nothing to subscribe.\n";
        }
    } else {
        std::cerr << "[mqtt] Connect failed with code: " << rc << "\n";
    }
}

// ================================================================
// MQTT CALLBACK: On Disconnect
// ================================================================
static void mqtt_on_disconnect(struct mosquitto *, void *, int rc) {
    std::cerr << "[mqtt] Disconnected (rc=" << rc << ").\n";
}

// ================================================================
// MQTT CALLBACK: On Message (MQTT → PLC write-back)
// Enhanced command schema + structured ACK
// ================================================================
static void mqtt_on_message(struct mosquitto *mosq,
                            void *userdata,
                            const struct mosquitto_message *msg)
{
    (void)mosq;
    (void)userdata;

    if (!msg || !msg->topic) return;
    if (!g_mqttCfg.subscribe_enabled) return;

    std::string topic(msg->topic);
    const std::string &cmdPrefix = g_mqttCfg.command_topic;
    const std::string &ackPrefix = g_mqttCfg.ack_topic_prefix;

    // 1) Ignore anything on the ACK topic prefix to avoid loops
    if (!ackPrefix.empty() && topic.rfind(ackPrefix, 0) == 0) {
        // std::cout << "[mqtt] Ignoring ACK topic: " << topic << "\n";
        return;
    }

    // 2) Extract payload once
    std::string payload;
    if (msg->payload && msg->payloadlen > 0) {
        payload.assign(static_cast<char*>(msg->payload), msg->payloadlen);
    }

    // 3) Decide if this is a command topic or telemetry topic
    bool isCommand = false;
    if (!cmdPrefix.empty() && topic.rfind(cmdPrefix, 0) == 0) {
        isCommand = true;
    }

    if (!isCommand) {
        // Not a command → try telemetry mapping
        handle_mqtt_telemetry_message(topic, payload);
        return;
    }

    // ======================
    // COMMAND HANDLING BELOW
    // ======================

    // Command topic format: <cmdPrefix>/<conn>/<tag>
    // Example: opcbridge/cmd/microplc03/ML1100.RunCommand
    std::string suffix = topic.substr(cmdPrefix.size());
    if (!suffix.empty() && suffix[0] == '/')
        suffix.erase(0, 1);

    auto slash = suffix.find('/');
    if (slash == std::string::npos) {
        std::cerr << "[mqtt] Invalid command topic: " << topic << "\n";
        return;
    }

    std::string conn_id  = suffix.substr(0, slash);
    std::string tag_name = suffix.substr(slash + 1);

    auto now = std::chrono::system_clock::now();
    int64_t ts_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()
    ).count();

    // 4) Check payload non-empty
    if (payload.empty()) {
        std::cerr << "[mqtt] Empty payload for MQTT command.\n";
        mqtt_publish_command_ack(
            conn_id,
            tag_name,
            "",
            false,
            "Empty payload",
            "",          // topic_suffix → default "<conn>/<tag>"
            ts_ms,
            topic       // source_topic → the original MQTT command topic
        );
        return;
    }

    // 5) Parse JSON (if JSON) to extract value + optional token
    std::string valueStr;
    std::string tokenFromMsg;

    try {
        auto j = json::parse(payload);

        if (j.contains("value")) {
            if (j["value"].is_string())
                valueStr = j["value"].get<std::string>();
            else
                valueStr = j["value"].dump();
        } else {
            // if no "value" field, just treat the whole JSON as the value
            valueStr = payload;
        }

        if (j.contains("token") && j["token"].is_string()) {
            tokenFromMsg = j["token"].get<std::string>();
        }
    } catch (...) {
        // Not JSON → treat payload as raw value
        valueStr = payload;
    }

    // 6) Enforce token if required by config
    if (g_mqttCfg.require_write_token) {
        if (g_mqttCfg.write_token.empty()) {
            std::cerr << "[mqtt] Command received but write_token is empty; refusing.\n";
            mqtt_publish_command_ack(
                conn_id,
                tag_name,
                valueStr,
                false,
                "Empty write token",
                "",          // topic_suffix → default "<conn>/<tag>"
                ts_ms,
                topic       // source_topic → the original MQTT command topic
            );
            return;
        }
        if (tokenFromMsg != g_mqttCfg.write_token) {
            std::cerr << "[mqtt] Command token mismatch for ["
                      << conn_id << "]." << tag_name << "\n";
            mqtt_publish_command_ack(
                conn_id,
                tag_name,
                valueStr,
                false,
                "Write token mismatch",
                "",          // topic_suffix → default "<conn>/<tag>"
                ts_ms,
                topic       // source_topic → the original MQTT command topic
            );
            return;
        }
    }

    // 7) We need PLC context
    if (!g_mqttDrivers || !g_mqttTagTable || !g_mqttDriverMutex) {
        std::cerr << "[mqtt] No driver context for MQTT write.\n";
        mqtt_publish_command_ack(
            conn_id,
            tag_name,
            valueStr,
            false,
            "No driver context for MQTT write",
            "",          // topic_suffix → default "<conn>/<tag>"
            ts_ms,
            topic       // source_topic → the original MQTT command topic
        );
        return;
    }

    // 8) Do the write with per-tag checks
    {
        std::lock_guard<std::mutex> lock(*g_mqttDriverMutex);

        // Find the tag runtime for extra checks
        TagRuntime *tagRt = nullptr;
        for (auto &drv : *g_mqttDrivers) {
            if (drv.conn.id != conn_id) continue;

            for (auto &t : drv.tags) {
                if (t.cfg.logical_name == tag_name) {
                    tagRt = &t;
                    break;
                }
            }
            break;
        }

        if (!tagRt) {
            std::cerr << "[mqtt] Tag not found for ["
                      << conn_id << "]." << tag_name << "\n";
            mqtt_publish_command_ack(
                conn_id,
                tag_name,
                valueStr,
                false,
                "Tag not found",
                "",          // topic_suffix → default "<conn>/<tag>"
                ts_ms,
                topic       // source_topic → the original MQTT command topic
            );
            return;
        }

        if (!tagRt->cfg.writable) {
            std::cerr << "[mqtt] Tag not writable for ["
                      << conn_id << "]." << tag_name << "\n";
            mqtt_publish_command_ack(
                conn_id,
                tag_name,
                valueStr,
                false,
                "Tag not writable",
                "",          // topic_suffix → default "<conn>/<tag>"
                ts_ms,
                topic       // source_topic → the original MQTT command topic
            );
            return;
        }

        if (!tagRt->cfg.mqtt_command_allowed) {
            std::cerr << "[mqtt] MQTT command not allowed for ["
                      << conn_id << "]." << tag_name << "\n";
            mqtt_publish_command_ack(
                conn_id,
                tag_name,
                valueStr,
                false,
                "Tag does not allow MQTT commands",
                "",          // topic_suffix → default "<conn>/<tag>"
                ts_ms,
                topic       // source_topic → the original MQTT command topic
            );
            return;
        }
    }

    // Avoid holding the driver mutex while waiting on PLC I/O.
    bool ok = write_tag_by_name(
        *g_mqttDrivers,
        conn_id,
        tag_name,
        valueStr,
        *g_mqttTagTable,
        *g_mqttDriverMutex
    );

    if (!ok) {
        std::cerr << "[mqtt] WRITE FAILED via MQTT for ["
                  << conn_id << "]." << tag_name
                  << " := " << valueStr << "\n";

        mqtt_publish_command_ack(
            conn_id,
            tag_name,
            valueStr,
            false,
            "PLC write failed (see server log)",
            "",          // default suffix
            ts_ms,
            topic
        );
    } else {
        std::cout << "[mqtt] WRITE OK via MQTT for ["
                  << conn_id << "]." << tag_name
                  << " := " << valueStr << "\n";

        mqtt_publish_command_ack(
            conn_id,
            tag_name,
            valueStr,
            true,
            "",          // no error
            "",          // default suffix
            ts_ms,
            topic
        );
    }
}

// Handle MQTT telemetry (non-command) topics using mqtt_inputs.json mappings.
//
// Returns true if the topic was handled as telemetry, false if no mapping matched.
bool handle_mqtt_telemetry_message(const std::string &topic,
                                   const std::string &payload)
{
    std::cout << "[mqtt-inputs] telemetry handler called for topic '"
              << topic << "' payload='" << payload << "'\n";

    if (g_mqttInputsByTopic.empty()) {
        return false;
    }

    auto it = g_mqttInputsByTopic.find(topic);
    if (it == g_mqttInputsByTopic.end()) {
        return false; // not a telemetry topic we know about
    }

    // We may have multiple mappings for the same topicwrite_to_plc
    for (size_t idx : it->second) {
        if (idx >= g_mqttInputs.size()) continue;
        const MqttInputMapping &m = g_mqttInputs[idx];

        // Step 1: extract value string from payload according to payload_format
        std::string valueStr;

        if (m.payload_format == "raw") {
            valueStr = payload;
        } else if (m.payload_format == "json_field") {
            try {
                auto j = json::parse(payload);
                if (!j.contains(m.json_field)) {
                    std::cerr << "[mqtt-inputs] Input '" << m.id
                              << "': JSON payload missing field '" << m.json_field
                              << "' for topic '" << topic << "'.\n";
                    continue;
                }
                const auto &jf = j[m.json_field];
                if (jf.is_string()) {
                    valueStr = jf.get<std::string>();
                } else {
                    valueStr = jf.dump();
                }
            } catch (const std::exception &ex) {
                std::cerr << "[mqtt-inputs] Input '" << m.id
                          << "': JSON parse error for topic '" << topic
                          << "': " << ex.what() << "\n";
                continue;
            }
        } else {
            // should never happen; skip
            continue;
        }

        auto now = std::chrono::system_clock::now();
        int64_t ts_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()).count();

        if (m.write_to_plc) {
            // Use the existing PLC write path so we get:
            //  - PLC write
            //  - TagTable update
            //  - event logging (if configured)
            //  - alarms, MQTT publish, WS, etc.
            if (!g_mqttDrivers || !g_mqttTagTable || !g_mqttDriverMutex) {
                std::cerr << "[mqtt-inputs] Input '" << m.id
                          << "': no driver context available for PLC write ("
                          << m.connection_id << "." << m.tag_name << ").\n";
                continue;
            }

            std::cout << "[mqtt-inputs] Input '" << m.id
                      << "': attempting PLC write ["
                      << m.connection_id << "]." << m.tag_name
                      << " := '" << valueStr << "'\n";

            bool ok = write_tag_by_name(
                *g_mqttDrivers,
                m.connection_id,
                m.tag_name,
                valueStr,
                *g_mqttTagTable,
                *g_mqttDriverMutex
            );

            if (!ok) {
                std::cerr << "[mqtt-inputs] Input '" << m.id
                          << "': PLC write failed for ["
                          << m.connection_id << "]." << m.tag_name
                          << " := " << valueStr << "\n";
            } else {
                std::cout << "[mqtt-inputs] Input '" << m.id
                          << "': wrote PLC tag ["
                          << m.connection_id << "]." << m.tag_name
                          << " := " << valueStr << " from topic '" << topic << "'\n";
            }
        } else {
            // HMI-only / virtual tag: update TagTable snapshot only, no PLC write.
            if (!g_mqttTagTable || !g_mqttDriverMutex) {
                std::cerr << "[mqtt-inputs] Input '" << m.id
                          << "': no tag table context available.\n";
                continue;
            }

            TagValue tv;
            if (!parse_string_to_tagvalue(valueStr, m.datatype, tv)) {
                std::cerr << "[mqtt-inputs] Input '" << m.id
                          << "': cannot parse '" << valueStr
                          << "' as datatype '" << m.datatype << "'.\n";
                continue;
            }

            std::lock_guard<std::mutex> lock(*g_mqttDriverMutex);

            std::string key = make_tag_key(m.connection_id, m.tag_name);
            TagSnapshot prev;
            bool hadPrev = false;

            auto itSnap = g_mqttTagTable->find(key);
            if (itSnap != g_mqttTagTable->end()) {
                prev = itSnap->second;
                hadPrev = true;
            }

            TagSnapshot snap;
            snap.connection_id = m.connection_id;
            snap.logical_name  = m.tag_name;
            snap.datatype      = m.datatype;
            snap.timestamp     = now;
            snap.quality       = 1;
            snap.value         = tv;

            (*g_mqttTagTable)[key] = snap;

            if (hadPrev && !snapshot_values_equal(snap, prev)) {
                // Basic event logging for virtual tags (no TagConfig, so always log on change)
                sqlite_log_event(
                    m.connection_id,
                    m.tag_name,
                    snapshot_value_to_string(prev),
                    snapshot_value_to_string(snap),
                    prev.quality,
                    snap.quality,
                    ts_ms,
                    R"({"source":"mqtt_telemetry"})"
                );
            }

            // If WS is added later, this snapshot update is what we’ll push.
        }
    }

    return true;
}

std::string make_tag_key(const std::string &conn_id,
                         const std::string &logical_name)
{
    return conn_id + ":" + logical_name;
}

/// Suppress OPC UA write callback when we update from our own poll loop
static thread_local bool g_suppressOpcUaWriteCallback = false;

// -----------------------------
// Token generator
// -----------------------------

std::string generate_write_token() {
    std::random_device rd;
    std::mt19937_64 gen(rd());
    std::uniform_int_distribution<uint64_t> dist;

    std::ostringstream oss;
    for (int i = 0; i < 2; ++i) {
        uint64_t v = dist(gen);
        oss << std::hex << std::setw(16) << std::setfill('0') << v;
    }
    return oss.str();
}

// Decide the write token: from env if set, else auto-generate.
// fromEnv = true if token came from OPCBRIDGE_WRITE_TOKEN.
std::string init_write_token(bool &fromEnv) {
    const char *env = std::getenv("OPCBRIDGE_WRITE_TOKEN");
    if (env && *env) {
        fromEnv = true;
        std::cout << "Write auth token (from env OPCBRIDGE_WRITE_TOKEN).\n";
        return std::string(env);
    } else {
        fromEnv = false;
        std::string tok = generate_write_token();
        std::cout << "Write auth token (auto-generated): " << tok << "\n";
        std::cout << "  (Set OPCBRIDGE_WRITE_TOKEN env var to control this value.)\n";
        return tok;
    }
}

// -----------------------------
// Path & filesystem helpers
// -----------------------------
enum class ConfigFileKind {
    CONNECTION,
    TAGS,
    MQTT,
    MQTT_INPUTS,
    ALARMS,
    TLS_CERT,   // ca.crt for MQTT TLS
    UNKNOWN
};

// Ensure the relative path is safe and classify it.
ConfigFileKind classify_config_path(const std::string &relPath) {
    fs::path p(relPath);
    std::string parent = p.parent_path().string();
    std::string name   = p.filename().string();

    if (parent == ".") parent.clear();

    // connections/*.json
    if (parent == "connections" && p.extension() == ".json") {
        return ConfigFileKind::CONNECTION;
    }

    // tags/*.json
    if (parent == "tags" && p.extension() == ".json") {
        return ConfigFileKind::TAGS;
    }

    // mqtt.json (root)
    if (parent.empty() && name == "mqtt.json") {
        return ConfigFileKind::MQTT;
    }

    // mqtt_inputs.json (root)
    if (parent.empty() && name == "mqtt_inputs.json") {
        return ConfigFileKind::MQTT_INPUTS;
    }

    // alarms.json (root)
    if (parent.empty() && name == "alarms.json") {
        return ConfigFileKind::ALARMS;
    }

    // ca.crt (root) – MQTT CA certificate
    if (parent.empty() && name == "ca.crt") {
        return ConfigFileKind::TLS_CERT;
    }

    return ConfigFileKind::UNKNOWN;
}

bool validate_config_text(const std::string &text,
                          ConfigFileKind kind,
                          std::string &errorOut)
{
    try {
        std::string stripped = strip_json_comments(text);
        json j = json::parse(stripped);

        switch (kind) {
        case ConfigFileKind::CONNECTION:
            if (!j.is_object() || !j.contains("id")) {
                errorOut = "Connection file must be a JSON object with 'id'.";
                return false;
            }
            return true;

        case ConfigFileKind::TAGS:
            if (!j.is_object() || !j.contains("connection_id") || !j.contains("tags")) {
                errorOut = "Tag file must have 'connection_id' and 'tags' array.";
                return false;
            }
            if (!j["tags"].is_array()) {
                errorOut = "'tags' must be an array.";
                return false;
            }
            return true;

        case ConfigFileKind::ALARMS:
            if (!j.is_object() || !j.contains("alarms") || !j["alarms"].is_array()) {
                errorOut = "alarms.json must have an 'alarms' array.";
                return false;
            }
            return true;

        case ConfigFileKind::MQTT:
            if (!j.is_object()) {
                errorOut = "mqtt.json must be a JSON object.";
                return false;
            }
            return true;

        case ConfigFileKind::MQTT_INPUTS:
            if (!j.is_object() || !j.contains("inputs") || !j["inputs"].is_array()) {
                errorOut = "mqtt_inputs.json must have an 'inputs' array.";
                return false;
            }
            return true;

        case ConfigFileKind::UNKNOWN:
        default:
            errorOut = "Unsupported config file kind.";
            return false;
        }
    } catch (const std::exception &ex) {
        errorOut = std::string("JSON parse/validation error: ") + ex.what();
        return false;
    }
}

std::string joinPath(const std::string &a, const std::string &b) {
    if (a.empty()) return b;
    if (a.back() == '/') return a + b;
    return a + "/" + b;
}

bool pathExists(const std::string &p) {
    struct stat st{};
    return (stat(p.c_str(), &st) == 0);
}

// Get directory where the executable lives (Linux-specific)
std::string getExecutableDir() {
    char path[PATH_MAX] = {0};
    ssize_t len = readlink("/proc/self/exe", path, sizeof(path)-1);
    if (len <= 0) {
        throw std::runtime_error("Unable to resolve /proc/self/exe");
    }
    path[len] = '\0';
    char *dir = dirname(path);
    return std::string(dir);
}

// If exe is in .../opcbridge/build/opcbridge
// we will check:
//   1) .../opcbridge/build/config
//   2) .../opcbridge/config
std::string findConfigDir() {
    std::string exeDir = getExecutableDir();

    std::string cfg1 = joinPath(exeDir, "config");
    if (pathExists(cfg1)) {
        return cfg1;
    }

    auto pos = exeDir.find_last_of('/');
    if (pos != std::string::npos) {
        std::string parentDir = exeDir.substr(0, pos);
        std::string cfg2 = joinPath(parentDir, "config");
        if (pathExists(cfg2)) {
            return cfg2;
        }
    }

    // Fallback
    return cfg1;
}

static std::string to_hex(const uint8_t *data, size_t len) {
    static const char *hex = "0123456789abcdef";
    std::string out;
    out.reserve(len * 2);
    for (size_t i = 0; i < len; ++i) {
        out.push_back(hex[(data[i] >> 4) & 0xF]);
        out.push_back(hex[data[i] & 0xF]);
    }
    return out;
}

static bool pbkdf2_sha256_hex(const std::string &password,
                              const std::string &salt,
                              int iterations,
                              std::string &out_hex)
{
    const int key_len = 32;
    uint8_t key[key_len];

    int rc = PKCS5_PBKDF2_HMAC(
        password.c_str(),
        static_cast<int>(password.size()),
        reinterpret_cast<const unsigned char*>(salt.data()),
        static_cast<int>(salt.size()),
        iterations,
        EVP_sha256(),
        key_len,
        key
    );
    if (rc != 1) {
        return false;
    }
    out_hex = to_hex(key, key_len);
    return true;
}

static std::string b64_encode(const std::string &bytes) {
    if (bytes.empty()) return "";
    const int out_len = 4 * static_cast<int>((bytes.size() + 2) / 3);
    std::string out;
    out.resize(out_len);
    const int actual = EVP_EncodeBlock(reinterpret_cast<unsigned char*>(&out[0]),
                                       reinterpret_cast<const unsigned char*>(bytes.data()),
                                       static_cast<int>(bytes.size()));
    if (actual <= 0) return "";
    out.resize(actual);
    return out;
}

static bool b64_decode(const std::string &b64, std::string &out_bytes) {
    out_bytes.clear();
    if (b64.empty()) return true;

    std::string in = b64;
    // strip whitespace
    in.erase(std::remove_if(in.begin(), in.end(), [](unsigned char c){ return std::isspace(c); }), in.end());
    if (in.empty()) return true;

    // EVP_DecodeBlock output is at most 3/4 of input.
    std::string buf;
    buf.resize((in.size() * 3) / 4 + 4);
    const int n = EVP_DecodeBlock(reinterpret_cast<unsigned char*>(&buf[0]),
                                  reinterpret_cast<const unsigned char*>(in.data()),
                                  static_cast<int>(in.size()));
    if (n < 0) return false;

    int actual = n;
    // Adjust for '=' padding.
    if (!in.empty() && in.back() == '=') actual--;
    if (in.size() >= 2 && in[in.size() - 2] == '=') actual--;
    if (actual < 0) actual = 0;
    buf.resize(static_cast<size_t>(actual));
    out_bytes = buf;
    return true;
}

static bool pbkdf2_sha256_b64(const std::string &password,
                              const std::string &salt_bytes,
                              int iterations,
                              std::string &out_b64)
{
    const int key_len = 32;
    uint8_t key[key_len];
    const int rc = PKCS5_PBKDF2_HMAC(
        password.c_str(),
        static_cast<int>(password.size()),
        reinterpret_cast<const unsigned char*>(salt_bytes.data()),
        static_cast<int>(salt_bytes.size()),
        iterations,
        EVP_sha256(),
        key_len,
        key
    );
    if (rc != 1) return false;
    out_b64 = b64_encode(std::string(reinterpret_cast<const char*>(key), key_len));
    return !out_b64.empty();
}

static std::string random_token_hex(size_t bytes = 32) {
    std::vector<uint8_t> buf(bytes);
    if (RAND_bytes(buf.data(), static_cast<int>(bytes)) != 1) {
        // Fallback to std::random_device if OpenSSL RNG fails
        std::random_device rd;
        for (size_t i = 0; i < bytes; ++i) {
            buf[i] = static_cast<uint8_t>(rd());
        }
    }
    return to_hex(buf.data(), buf.size());
}

static bool load_admin_auth(const std::string &path) {
    try {
        g_adminAuthFilePresent = fs::exists(path);
        g_adminAuthLoadError.clear();

        if (!g_adminAuthFilePresent) {
            g_legacyAdminConfigured = false;
            g_adminAuth = AdminAuthInfo{};
            return true;
        }

        std::string txt = read_file_to_string(path);
        auto j = json::parse(txt);

        g_adminAuth.salt_hex = j.value("salt_hex", std::string{});
        g_adminAuth.hash_hex = j.value("hash_hex", std::string{});

        if (g_adminAuth.salt_hex.empty() || g_adminAuth.hash_hex.empty()) {
            std::cerr << "[auth] admin_auth.json missing salt/hash; treating as not configured.\n";
            g_legacyAdminConfigured = false;
            g_adminAuth = AdminAuthInfo{};
        } else {
            g_legacyAdminConfigured = true;
        }
        return true;
    } catch (const std::exception &ex) {
        g_adminAuthFilePresent = fs::exists(path);
        g_adminAuthLoadError = ex.what();
        std::cerr << "[auth] Failed to load admin_auth.json: " << ex.what() << "\n";
        g_legacyAdminConfigured = false;
        g_adminAuth = AdminAuthInfo{};
        return false;
    }
}

static bool verify_legacy_admin_password(const std::string &password) {
    if (!g_adminAuthFilePresent) return false;
    if (!g_legacyAdminConfigured) return false;
    if (password.empty()) return false;
    if (g_adminAuth.salt_hex.size() % 2 != 0) return false;

    std::string salt_bytes;
    salt_bytes.resize(g_adminAuth.salt_hex.size() / 2);
    for (size_t i = 0; i < salt_bytes.size(); ++i) {
        std::string byteStr = g_adminAuth.salt_hex.substr(i * 2, 2);
        salt_bytes[i] = static_cast<char>(std::stoi(byteStr, nullptr, 16));
    }

    std::string hash_hex;
    if (!pbkdf2_sha256_hex(password, salt_bytes, 100000, hash_hex)) return false;
    if (hash_hex.size() != g_adminAuth.hash_hex.size()) return false;
    return (CRYPTO_memcmp(hash_hex.data(), g_adminAuth.hash_hex.data(), hash_hex.size()) == 0);
}

static std::string normalize_auth_username(const std::string &value) {
    std::string raw = value;
    // trim
    while (!raw.empty() && std::isspace(static_cast<unsigned char>(raw.front()))) raw.erase(raw.begin());
    while (!raw.empty() && std::isspace(static_cast<unsigned char>(raw.back()))) raw.pop_back();
    if (raw.empty()) return "";
    if (raw.size() > 64) return "";
    // allow A-Z a-z 0-9 space _ . -
    for (char c : raw) {
        if (std::isalnum(static_cast<unsigned char>(c))) continue;
        if (c == ' ' || c == '_' || c == '.' || c == '-') continue;
        return "";
    }
    // collapse runs of spaces
    std::string cleaned;
    cleaned.reserve(raw.size());
    bool prevSpace = false;
    for (char c : raw) {
        if (c == ' ') {
            if (prevSpace) continue;
            prevSpace = true;
            cleaned.push_back(' ');
            continue;
        }
        prevSpace = false;
        cleaned.push_back(c);
    }
    return cleaned;
}

static std::string normalize_auth_role_id(const std::string &raw) {
    std::string s = raw;
    for (auto &c : s) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    if (s.empty()) return "";
    // allow a-z 0-9 _ -
    for (char c : s) {
        if (c >= 'a' && c <= 'z') continue;
        if (c >= '0' && c <= '9') continue;
        if (c == '_' || c == '-') continue;
        return "";
    }
    return s;
}

static std::string normalize_auth_role(const std::string &value) {
    const std::string id = normalize_auth_role_id(value);
    if (id.empty()) return "viewer";
    // If roles are loaded, only allow defined ids.
    if (!g_authRoles.empty()) {
        for (const auto &r : g_authRoles) {
            if (r.id == id) return id;
        }
        return "viewer";
    }
    // Backward-compat default set.
    if (id == "admin" || id == "editor" || id == "operator" || id == "viewer") return id;
    return "viewer";
}

static int role_rank(const std::string &role) {
    const std::string id = normalize_auth_role(role);
    for (const auto &r : g_authRoles) {
        if (r.id == id) return r.rank;
    }
    if (id == "admin") return 3;
    if (id == "editor") return 2;
    if (id == "operator") return 1;
    return 0;
}

static bool role_exists(const std::string &role) {
    const std::string id = normalize_auth_role_id(role);
    if (id.empty()) return false;
    for (const auto &r : g_authRoles) {
        if (r.id == id) return true;
    }
    // If no roles loaded yet, allow default set.
    if (g_authRoles.empty()) {
        return (id == "admin" || id == "editor" || id == "operator" || id == "viewer");
    }
    return false;
}

static void ensure_default_roles() {
    if (!g_authRoles.empty()) return;
    g_authRoles = {
        {"viewer", "Viewer", "Read-only access.", 0},
        {"operator", "Operator", "Runtime operation (no edits).", 1},
        {"editor", "Editor", "Can edit configuration and screens.", 2},
        {"admin", "Admin", "Full access.", 3}
    };
}

static bool load_passwords_store(const std::string &path) {
    try {
        g_userStoreConfigured = false;
        g_authTimeoutMinutes = 0;
        g_authRoles.clear();
        g_authUsers.clear();

        if (!fs::exists(path)) return true;

        std::string txt = read_file_to_string(path);
        std::string stripped = strip_json_comments(txt);
        auto j = json::parse(stripped);
        if (!j.is_object()) return false;

        g_authTimeoutMinutes = std::max(0, j.value("timeoutMinutes", 0));

        // roles (optional)
        auto roles = j.value("roles", json::array());
        if (roles.is_array()) {
            for (const auto &rj : roles) {
                if (!rj.is_object()) continue;
                AuthRoleRecord r;
                r.id = normalize_auth_role_id(rj.value("id", std::string{}));
                r.label = rj.value("label", std::string{});
                r.description = rj.value("description", std::string{});
                r.rank = std::max(0, std::min(3, rj.value("rank", 0)));
                if (r.id.empty()) continue;
                if (r.label.empty()) r.label = r.id;
                // prevent duplicates
                bool dup = false;
                for (const auto &existing : g_authRoles) {
                    if (existing.id == r.id) { dup = true; break; }
                }
                if (dup) continue;
                g_authRoles.push_back(r);
            }
        }
        ensure_default_roles();

        auto users = j.value("users", json::array());
        if (!users.is_array()) users = json::array();

        for (const auto &u : users) {
            if (!u.is_object()) continue;
            AuthUserRecord r;
            r.username = normalize_auth_username(u.value("username", std::string{}));
            r.role = normalize_auth_role(u.value("role", std::string{"viewer"}));

            auto kdf = u.value("kdf", json::object());
            r.iterations = std::max(10'000, std::min(5'000'000, kdf.value("iterations", 150000)));
            r.salt_b64 = kdf.value("saltB64", std::string{});
            r.hash_b64 = kdf.value("hashB64", std::string{});

            if (r.username.empty()) continue;
            if (r.salt_b64.empty() || r.hash_b64.empty()) continue;
            g_authUsers.push_back(r);
        }

        if (!g_authUsers.empty()) {
            g_userStoreConfigured = true;
        }

        return true;
    } catch (const std::exception &ex) {
        std::cerr << "[auth] Failed to load passwords.jsonc: " << ex.what() << "\n";
        g_userStoreConfigured = false;
        g_authUsers.clear();
        return false;
    }
}

static bool save_passwords_store(const std::string &path) {
    try {
        json out;
        out["timeoutMinutes"] = g_authTimeoutMinutes;
        ensure_default_roles();
        out["roles"] = json::array();
        for (const auto &r : g_authRoles) {
            json rec;
            rec["id"] = r.id;
            rec["label"] = r.label;
            rec["description"] = r.description.empty() ? json(nullptr) : json(r.description);
            rec["rank"] = r.rank;
            out["roles"].push_back(rec);
        }
        out["users"] = json::array();
        for (const auto &u : g_authUsers) {
            json rec;
            rec["username"] = u.username;
            rec["role"] = normalize_auth_role(u.role);
            rec["kdf"] = {
                {"algo", "pbkdf2-sha256"},
                {"iterations", u.iterations},
                {"saltB64", u.salt_b64},
                {"hashB64", u.hash_b64}
            };
            out["users"].push_back(rec);
        }
        write_string_to_file(path, out.dump(2));
        fs::permissions(path,
                        fs::perms::owner_read | fs::perms::owner_write,
                        fs::perm_options::replace);
        return true;
    } catch (const std::exception &ex) {
        std::cerr << "[auth] Failed to save passwords.jsonc: " << ex.what() << "\n";
        return false;
    }
}

static void cleanup_expired_admin_sessions() {
    std::lock_guard<std::mutex> lock(g_adminMutex);
    auto now = std::chrono::system_clock::now();
    for (auto it = g_adminSessions.begin(); it != g_adminSessions.end(); ) {
        const bool expired = (it->second.expires_at <= now);
        const bool idleExpired = (g_authTimeoutMinutes > 0 &&
                                 it->second.last_activity_at.time_since_epoch().count() > 0 &&
                                 (now - it->second.last_activity_at) > std::chrono::minutes(g_authTimeoutMinutes));
        if (expired || idleExpired) {
            it = g_adminSessions.erase(it);
        } else {
            ++it;
        }
    }
}

static std::string g_adminServiceToken;

static void init_admin_service_token_from_env()
{
    const char* env = std::getenv("OPCBRIDGE_ADMIN_SERVICE_TOKEN");
    if (env && *env) {
        g_adminServiceToken = std::string(env);
        std::cout << "[auth] Admin service token enabled via OPCBRIDGE_ADMIN_SERVICE_TOKEN"
                  << " (len=" << g_adminServiceToken.size() << ")\n";
    }
}

static std::string get_cookie_value(const httplib::Request &req, const std::string &name) {
    const auto cookie = req.get_header_value("Cookie");
    if (cookie.empty() || name.empty()) return "";

    // Minimal cookie parser ("a=b; c=d"). Does not decode; cookie values we use are hex.
    size_t i = 0;
    while (i < cookie.size()) {
        while (i < cookie.size() && (cookie[i] == ' ' || cookie[i] == ';')) i++;
        if (i >= cookie.size()) break;

        const size_t key_start = i;
        while (i < cookie.size() && cookie[i] != '=' && cookie[i] != ';') i++;
        const size_t key_end = i;
        if (i >= cookie.size() || cookie[i] != '=') {
            while (i < cookie.size() && cookie[i] != ';') i++;
            continue;
        }
        i++; // '='
        const size_t val_start = i;
        while (i < cookie.size() && cookie[i] != ';') i++;
        const size_t val_end = i;

        std::string key = cookie.substr(key_start, key_end - key_start);
        while (!key.empty() && key.front() == ' ') key.erase(key.begin());
        while (!key.empty() && key.back() == ' ') key.pop_back();

        if (key == name) {
            std::string val = cookie.substr(val_start, val_end - val_start);
            while (!val.empty() && val.front() == ' ') val.erase(val.begin());
            while (!val.empty() && val.back() == ' ') val.pop_back();
            return val;
        }
    }

    return "";
}

static bool get_session_from_request(const httplib::Request &req, AdminSessionInfo &out) {
    std::string token = req.get_header_value("X-Admin-Token");
    if (token.empty()) token = get_cookie_value(req, "OPCBRIDGE_ADMIN_TOKEN");
    if (token.empty()) return false;

    // Service token always maps to admin.
    if (!g_adminServiceToken.empty() && token == g_adminServiceToken) {
        out = AdminSessionInfo{};
        out.role = "admin";
        out.username = "service";
        out.expires_at = std::chrono::system_clock::now() + std::chrono::hours(24 * 365 * 10);
        out.last_activity_at = std::chrono::system_clock::now();
        return true;
    }

    cleanup_expired_admin_sessions();
    std::lock_guard<std::mutex> lock(g_adminMutex);
    auto it = g_adminSessions.find(token);
    if (it == g_adminSessions.end()) return false;

    auto now = std::chrono::system_clock::now();
    if (it->second.expires_at <= now) {
        g_adminSessions.erase(it);
        return false;
    }

    if (g_authTimeoutMinutes > 0 &&
        it->second.last_activity_at.time_since_epoch().count() > 0 &&
        (now - it->second.last_activity_at) > std::chrono::minutes(g_authTimeoutMinutes)) {
        g_adminSessions.erase(it);
        return false;
    }

    // Rolling activity
    it->second.last_activity_at = now;
    out = it->second;
    return true;
}

static bool is_admin_request(const httplib::Request &req) {
    AdminSessionInfo s;
    if (!get_session_from_request(req, s)) return false;
    // "admin request" (for existing admin-gated endpoints) means editor+.
    return role_rank(s.role) >= role_rank("editor");
}

static bool is_user_logged_in(const httplib::Request &req, AdminSessionInfo &out) {
    AdminSessionInfo s;
    if (!get_session_from_request(req, s)) return false;
    // Do not treat the service token as an interactive user session.
    if (s.username == "service") return false;
    out = s;
    return true;
}

static bool is_admin_user_request(const httplib::Request &req, AdminSessionInfo &out) {
    AdminSessionInfo s;
    if (!get_session_from_request(req, s)) return false;
    if (normalize_auth_role(s.role) != "admin") return false;
    out = s;
    return true;
}

// Very light validation – just prove it's at least a JSON object.
// You can tighten this later if you want.
bool validate_mqtt_json(const std::string &content, std::string &errMsg) {
    try {
        std::string stripped = strip_json_comments(content);
        auto j = json::parse(stripped);

        if (!j.is_object()) {
            errMsg = "mqtt.json must be a JSON object.";
            return false;
        }
        // Optional: check for some typical fields
        // e.g. j.value("enabled", false); etc.

        return true;
    } catch (const std::exception &ex) {
        errMsg = std::string("Invalid JSON in mqtt.json: ") + ex.what();
        return false;
    }
}

bool validate_mqtt_inputs_json(const std::string &content, std::string &errMsg) {
    try {
        std::string stripped = strip_json_comments(content);
        auto j = json::parse(stripped);

        if (!j.is_object()) {
            errMsg = "mqtt_inputs.json must be a JSON object.";
            return false;
        }
        if (!j.contains("inputs") || !j["inputs"].is_array()) {
            errMsg = "mqtt_inputs.json must contain an 'inputs' array.";
            return false;
        }
        return true;
    } catch (const std::exception &ex) {
        errMsg = std::string("Invalid JSON in mqtt_inputs.json: ") + ex.what();
        return false;
    }
}

bool validate_alarms_json(const std::string &content, std::string &errMsg) {
    try {
        std::string stripped = strip_json_comments(content);
        auto j = json::parse(stripped);

        if (!j.is_object()) {
            errMsg = "alarms.json must be a JSON object.";
            return false;
        }
        if (!j.contains("alarms") || !j["alarms"].is_array()) {
            errMsg = "alarms.json must contain an 'alarms' array.";
            return false;
        }
        return true;
    } catch (const std::exception &ex) {
        errMsg = std::string("Invalid JSON in alarms.json: ") + ex.what();
        return false;
    }
}

// -----------------------------
// Validators (lightweight)
// -----------------------------

bool validate_connection_json(const std::string &content, std::string &errMsg) {
    try {
        std::string stripped = strip_json_comments(content);
        auto j = json::parse(stripped);

        if (!j.is_object()) {
            errMsg = "Connection config must be a JSON object.";
            return false;
        }
        if (!j.contains("id") || !j["id"].is_string()) {
            errMsg = "Connection config must contain string field 'id'.";
            return false;
        }
        return true;
    } catch (const std::exception &ex) {
        errMsg = std::string("Invalid JSON in connection config: ") + ex.what();
        return false;
    }
}

bool validate_tags_json(const std::string &content, std::string &errMsg) {
    try {
        std::string stripped = strip_json_comments(content);
        auto j = json::parse(stripped);

        if (!j.is_object()) {
            errMsg = "Tag file must be a JSON object.";
            return false;
        }
        if (!j.contains("connection_id") || !j["connection_id"].is_string()) {
            errMsg = "Tag file must contain string 'connection_id'.";
            return false;
        }
        if (!j.contains("tags") || !j["tags"].is_array()) {
            errMsg = "Tag file must contain array 'tags'.";
            return false;
        }
        return true;
    } catch (const std::exception &ex) {
        errMsg = std::string("Invalid JSON in tag file: ") + ex.what();
        return false;
    }
}

// -----------------------------
// JSON-with-comments loader
// -----------------------------

static std::string read_file_to_string(const std::string &path) {
    std::ifstream ifs(path, std::ios::in | std::ios::binary);
    if (!ifs) {
        throw std::runtime_error("Failed to open file for reading: " + path);
    }

    std::ostringstream oss;
    oss << ifs.rdbuf();
    return oss.str();
}

static void write_string_to_file(const std::string &path,
                                 const std::string &contents) {
    // Make sure parent directory exists (for things like /etc/opcbridge/...)
    fs::path p(path);
    if (!p.parent_path().empty()) {
        std::error_code ec;
        fs::create_directories(p.parent_path(), ec);
        if (ec) {
            throw std::runtime_error(
                "Failed to create directory for file: " + p.parent_path().string()
            );
        }
    }

    std::ofstream ofs(path, std::ios::out | std::ios::binary | std::ios::trunc);
    if (!ofs) {
        throw std::runtime_error("Failed to open file for writing: " + path);
    }

    ofs.write(contents.data(),
              static_cast<std::streamsize>(contents.size()));
    if (!ofs) {
        throw std::runtime_error("Error writing file: " + path);
    }
}

// Strip // and /* */ comments while preserving string literals
std::string strip_json_comments(const std::string &input) {
    enum class State {
        Normal,
        InString,
        InStringEscape,
        LineComment,
        BlockComment
    };

    State state = State::Normal;
    std::string out;
    out.reserve(input.size());

    const size_t n = input.size();
    for (size_t i = 0; i < n; ++i) {
        char c = input[i];

        switch (state) {
        case State::Normal:
            if (c == '"') {
                state = State::InString;
                out.push_back(c);
            } else if (c == '/' && i + 1 < n) {
                char c2 = input[i + 1];
                if (c2 == '/') {
                    state = State::LineComment;
                    ++i;
                } else if (c2 == '*') {
                    state = State::BlockComment;
                    ++i;
                } else {
                    out.push_back(c);
                }
            } else {
                out.push_back(c);
            }
            break;

        case State::InString:
            if (c == '\\') {
                state = State::InStringEscape;
                out.push_back(c);
            } else if (c == '"') {
                state = State::Normal;
                out.push_back(c);
            } else {
                out.push_back(c);
            }
            break;

        case State::InStringEscape:
            out.push_back(c);
            state = State::InString;
            break;

        case State::LineComment:
            if (c == '\n') {
                out.push_back('\n');
                state = State::Normal;
            }
            break;

        case State::BlockComment:
            if (c == '*' && i + 1 < n && input[i + 1] == '/') {
                ++i;
                state = State::Normal;
            } else {
                if (c == '\n') {
                    out.push_back('\n');
                }
            }
            break;
        }
    }

    return out;
}

json load_json_with_comments(const std::string &path) {
    std::string content = read_file_to_string(path);
    std::string stripped = strip_json_comments(content);
    return json::parse(stripped);
}

// -----------------------------
// Config loading
// -----------------------------

ConnectionConfig load_connection_config(const std::string &path) {
    json j = load_json_with_comments(path);

    ConnectionConfig c;
    c.id       = j.at("id").get<std::string>();
    c.driver   = j.value("driver", std::string("ab_eip"));
    c.gateway  = j.value("gateway", std::string{});
    std::string raw_path = j.value("path", std::string{});
    c.slot     = j.value("slot", 0);
    c.plc_type = j.value("plc_type", std::string("lgx"));
    c.default_timeout_ms = j.value("default_timeout_ms", 1000);
    c.default_read_ms    = j.value("default_read_ms", 1000);
    c.default_write_ms   = j.value("default_write_ms", 1000);
    c.debug              = j.value("debug", 0);

    if (c.driver == "ab_eip") {
        if (!raw_path.empty()) {
            c.path = raw_path;
        } else {
            // For ControlLogix/CompactLogix; MicroLogix ignores path
            c.path = "1," + std::to_string(c.slot);
        }
    } else {
        throw std::runtime_error("Unsupported driver: " + c.driver +
                                 " (expected 'ab_eip' for now)");
    }

    return c;
}

TagFile load_tag_file(const std::string &path) {
    json j = load_json_with_comments(path);

    TagFile tf;
    tf.connection_id = j.at("connection_id").get<std::string>();

	for (const auto &jt : j.at("tags")) {
        TagConfig t;
        t.logical_name         = jt.at("name").get<std::string>();
        t.plc_tag_name         = jt.at("plc_tag_name").get<std::string>();
        t.datatype             = jt.at("datatype").get<std::string>();
        t.scan_ms              = jt.value("scan_ms", 1000);
        // Legacy tag JSON did not have "enabled"; default to true so old configs keep working.
        t.enabled              = jt.value("enabled", true);
        t.writable             = jt.value("writable", false);
        t.mqtt_command_allowed = jt.value("mqtt_command_allowed", false);
        t.log_event_on_change  = jt.value("log_event_on_change", false);

        // Periodic logging config (all optional)
        t.log_periodic        = jt.value("log_periodic", false);
        t.log_periodic_mode   = jt.value("log_periodic_mode", std::string{});

        // Accept either "log_periodic_interval_sec" or legacy "log_periodic_interval"
        int interval1 = jt.value("log_periodic_interval_sec", 0);
        int interval2 = jt.value("log_periodic_interval", 0); // so your existing JSON still works
        t.log_periodic_interval_sec = (interval1 > 0) ? interval1 : interval2;

        t.log_hourly_minute   = jt.value("log_hourly_minute", 0);
        t.log_daily_hour      = jt.value("log_daily_hour", 0);
        t.log_daily_minute    = jt.value("log_daily_minute", 0);

		tf.tags.push_back(t);
	}
    
    return tf;
}

// -----------------------------
// Libplctag helpers
// -----------------------------

size_t datatype_size_bytes(const std::string &dt) {
    if (dt == "bool")                       return 1;
    if (dt == "int16" || dt == "uint16")   return 2;
    if (dt == "int32" || dt == "uint32")   return 4;
    if (dt == "float32")                   return 4;
    if (dt == "float64")                   return 8;
    throw std::runtime_error("Unsupported datatype: " + dt);
}

std::string build_base_conn_str(const ConnectionConfig &c) {
    std::string s = "protocol=ab_eip";
    s += "&gateway=" + c.gateway;
    s += "&path=" + c.path;
    s += "&cpu=" + c.plc_type;
    if (c.debug > 0) {
        s += "&debug=" + std::to_string(c.debug);
    }
    return s;
}

std::string build_tag_conn_str(const ConnectionConfig &c,
                               const TagConfig &t)
{
    std::string s = build_base_conn_str(c);
    s += "&name=" + t.plc_tag_name;
    s += "&elem_size=" + std::to_string(datatype_size_bytes(t.datatype));
    s += "&elem_count=1";
    return s;
}

static void opcua_onWrite(UA_Server *server,
                          const UA_NodeId *sessionId,
                          void *sessionContext,
                          const UA_NodeId *nodeId,
                          void *nodeContext,
                          const UA_NumericRange *range,
                          const UA_DataValue *data) {
    (void)server;
    (void)sessionContext;
    (void)nodeId;
    (void)range;

    // Ignore writes coming from our own internal UA_Server_writeValue calls
    if (g_suppressOpcUaWriteCallback) {
        return;
    }

    // (Optional, keep this too if you added it)
    // Ignore server-internal writes (just in case)
    if (!sessionId || UA_NodeId_isNull(sessionId)) {
        return;
    }

    auto *binding = static_cast<UaTagBinding*>(nodeContext);
    if (!binding) {
        std::cerr << "OPC UA write: nodeContext is null, ignoring\n";
        return;
    }
    if (!binding->writable) {
        std::cerr << "OPC UA write: tag [" << binding->conn->id << "]."
                  << binding->logical_name << " is not writable, ignoring\n";
        return;
    }

    std::unique_lock<std::shared_mutex> plcLock;
    if (g_plcMutex) {
        plcLock = std::unique_lock<std::shared_mutex>(*g_plcMutex);
    }

    const UA_Variant &var = data->value;
    const std::string &dt = binding->datatype;
    int32_t st = PLCTAG_STATUS_OK;

    // Decode UA value and push into libplctag buffer
    if (dt == "bool" || dt == "BOOL" || dt == "Bool") {
        if (!UA_Variant_hasScalarType(&var, &UA_TYPES[UA_TYPES_BOOLEAN])) {
            std::cerr << "OPC UA write: type mismatch for BOOL tag ["
                      << binding->conn->id << "]." << binding->logical_name << "\n";
            return;
        }
        UA_Boolean v = *(UA_Boolean*)var.data;
        st = plc_tag_set_int8(binding->handle, 0, v ? 1 : 0);

    } else if (dt == "int16" || dt == "INT" || dt == "Int16") {
        if (!UA_Variant_hasScalarType(&var, &UA_TYPES[UA_TYPES_INT16])) {
            std::cerr << "OPC UA write: type mismatch for INT16 tag ["
                      << binding->conn->id << "]." << binding->logical_name << "\n";
            return;
        }
        UA_Int16 v = *(UA_Int16*)var.data;
        st = plc_tag_set_int16(binding->handle, 0, v);

    } else if (dt == "uint16" || dt == "WORD" || dt == "Word") {
        if (!UA_Variant_hasScalarType(&var, &UA_TYPES[UA_TYPES_UINT16])) {
            std::cerr << "OPC UA write: type mismatch for UINT16 tag ["
                      << binding->conn->id << "]." << binding->logical_name << "\n";
            return;
        }
        UA_UInt16 v = *(UA_UInt16*)var.data;
        st = plc_tag_set_uint16(binding->handle, 0, v);

    } else if (dt == "int32" || dt == "DINT" || dt == "Int32") {
        if (!UA_Variant_hasScalarType(&var, &UA_TYPES[UA_TYPES_INT32])) {
            std::cerr << "OPC UA write: type mismatch for INT32 tag ["
                      << binding->conn->id << "]." << binding->logical_name << "\n";
            return;
        }
        UA_Int32 v = *(UA_Int32*)var.data;
        st = plc_tag_set_int32(binding->handle, 0, v);

    } else if (dt == "uint32" || dt == "DWORD" || dt == "DWord") {
        if (!UA_Variant_hasScalarType(&var, &UA_TYPES[UA_TYPES_UINT32])) {
            std::cerr << "OPC UA write: type mismatch for UINT32 tag ["
                      << binding->conn->id << "]." << binding->logical_name << "\n";
            return;
        }
        UA_UInt32 v = *(UA_UInt32*)var.data;
        st = plc_tag_set_uint32(binding->handle, 0, v);

    } else if (dt == "float32" || dt == "REAL" || dt == "Real") {
        if (!UA_Variant_hasScalarType(&var, &UA_TYPES[UA_TYPES_FLOAT])) {
            std::cerr << "OPC UA write: type mismatch for FLOAT32 tag ["
                      << binding->conn->id << "]." << binding->logical_name << "\n";
            return;
        }
        UA_Float v = *(UA_Float*)var.data;
        st = plc_tag_set_float32(binding->handle, 0, v);

    } else if (dt == "float64" || dt == "LREAL" || dt == "LReal") {
        if (!UA_Variant_hasScalarType(&var, &UA_TYPES[UA_TYPES_DOUBLE])) {
            std::cerr << "OPC UA write: type mismatch for FLOAT64 tag ["
                      << binding->conn->id << "]." << binding->logical_name << "\n";
            return;
        }
        UA_Double v = *(UA_Double*)var.data;
        st = plc_tag_set_float64(binding->handle, 0, v);

    } else {
        std::cerr << "OPC UA write: unsupported datatype '" << dt
                  << "' for tag [" << binding->conn->id << "]."
                  << binding->logical_name << "\n";
        return;
    }

    if (st != PLCTAG_STATUS_OK) {
        std::cerr << "OPC UA write: plc_tag_set_* failed for ["
                  << binding->conn->id << "]." << binding->logical_name
                  << ": " << plc_tag_decode_error(st) << "\n";
        return;
    }

    // Commit the buffer to the PLC
    st = plc_tag_write(binding->handle, binding->conn->default_read_ms);
    if (st != PLCTAG_STATUS_OK) {
        std::cerr << "OPC UA write: plc_tag_write failed for ["
                  << binding->conn->id << "]." << binding->logical_name
                  << ": " << plc_tag_decode_error(st) << "\n";
        return;
    }

    std::cout << "OPC UA write: wrote tag ["
              << binding->conn->id << "]." << binding->logical_name
              << " via OPC UA\n";
}

void update_snapshot_from_plc(TagSnapshot &snap,
                              const ConnectionConfig &conn,
                              const TagRuntime &tag)
{
    snap.connection_id = conn.id;
    snap.logical_name  = tag.cfg.logical_name;
    snap.datatype      = tag.cfg.datatype;
    snap.timestamp     = std::chrono::system_clock::now();
    snap.quality       = 1;

    const std::string &dt = tag.cfg.datatype;
    int32_t handle = tag.handle;

    if (dt == "float32") {
        float v = plc_tag_get_float32(handle, 0);
        snap.value = v;
    } else if (dt == "float64") {
        double v = plc_tag_get_float64(handle, 0);
        snap.value = v;
    } else if (dt == "int32") {
        int32_t v = plc_tag_get_int32(handle, 0);
        snap.value = v;
    } else if (dt == "uint32") {
        uint32_t v = static_cast<uint32_t>(plc_tag_get_uint32(handle, 0));
        snap.value = v;
    } else if (dt == "int16") {
        int16_t v = plc_tag_get_int16(handle, 0);
        snap.value = v;
    } else if (dt == "uint16") {
        uint16_t v = static_cast<uint16_t>(plc_tag_get_uint16(handle, 0));
        snap.value = v;
    } else if (dt == "bool") {
        int8_t v = plc_tag_get_int8(handle, 0);
        snap.value = (v != 0);
    } else {
        snap.quality = 0;
    }
}

void print_snapshot(const TagSnapshot &snap) {
    std::cout << "[" << snap.connection_id << "] "
              << snap.logical_name << " = ";
    std::visit([](auto &&arg) { std::cout << arg; }, snap.value);
    std::cout << " (" << snap.datatype << ")\n";
}

std::string tag_value_to_string(const TagValue &v) {
    std::ostringstream oss;
    std::visit([&oss](auto &&arg) { oss << arg; }, v);
    return oss.str();
}

// -----------------------------
// Write helpers
// -----------------------------

bool parse_bool(const std::string &s, bool &out) {
    std::string v;
    v.reserve(s.size());
    for (char c : s) v.push_back(std::tolower(static_cast<unsigned char>(c)));

    if (v == "1" || v == "true" || v == "on" || v == "yes") {
        out = true; return true;
    }
    if (v == "0" || v == "false" || v == "off" || v == "no") {
        out = false; return true;
    }
    return false;
}

bool parse_string_to_tagvalue(const std::string &s,
                              const std::string &dt,
                              TagValue &out)
{
    try {
        if (dt == "bool") {
            bool b;
            if (!parse_bool(s, b)) {
                return false;
            }
            out = b;
            return true;
        } else if (dt == "int16") {
            int16_t v = static_cast<int16_t>(std::stoi(s));
            out = v;
            return true;
        } else if (dt == "uint16") {
            uint16_t v = static_cast<uint16_t>(std::stoul(s));
            out = v;
            return true;
        } else if (dt == "int32") {
            int32_t v = static_cast<int32_t>(std::stol(s));
            out = v;
            return true;
        } else if (dt == "uint32") {
            uint32_t v = static_cast<uint32_t>(std::stoul(s));
            out = v;
            return true;
        } else if (dt == "float32") {
            float v = std::stof(s);
            out = v;
            return true;
        } else if (dt == "float64") {
            double v = std::stod(s);
            out = v;
            return true;
        }
    } catch (...) {
        return false;
    }
    return false;
}

// Helper: convert TagValue -> string for logging
static std::string snapshot_value_to_string(const TagSnapshot &snap) {
    std::ostringstream oss;
    std::visit([&oss](auto &&arg) { oss << arg; }, snap.value);
    return oss.str();
}

// =========================
// WebSocket JSON notifiers
// =========================

void ws_notify_tag_update(const TagSnapshot &snap,
                          const TagConfig &cfg)
{
    if (!ws_is_enabled()) return;

	    json j;
	    j["type"]          = "tag_update";
	    j["connection_id"] = snap.connection_id;
	    j["name"]          = snap.logical_name;
	    j["key"]           = snap.connection_id + ":" + snap.logical_name;
	    j["datatype"]      = snap.datatype;
	    j["quality"]       = snap.quality;

    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        snap.timestamp.time_since_epoch()
    ).count();
	    j["timestamp_ms"] = ms;

	    std::visit([&j](auto &&arg) {
	        j["value"] = arg;
	    }, snap.value);

	    j["enabled"]               = cfg.enabled;
	    j["writable"]              = cfg.writable;
	    j["mqtt_command_allowed"]  = cfg.mqtt_command_allowed;
	    j["log_event_on_change"]   = cfg.log_event_on_change;
	    j["log_periodic_mode"]     = cfg.log_periodic_mode;
	    j["log_periodic_interval_sec"] = cfg.log_periodic_interval_sec;

    ws_send_json(j);
}

void ws_notify_alarm_event(const AlarmRuntime &alarm,
                           const TagSnapshot &snap,
                           const std::string &state)
{
    if (!ws_is_enabled()) return;

    const std::string displayName = alarm.cfg.name.empty() ? alarm.cfg.id : alarm.cfg.name;
    std::string message;
    if (state == "active") {
        message = alarm.cfg.message_on_active.empty() ? displayName : alarm.cfg.message_on_active;
    } else if (state == "cleared") {
        message = alarm.cfg.message_on_return;
    } else {
        message = displayName;
    }

    json j;
    j["type"]          = "alarm_event";
    j["alarm_id"]      = alarm.cfg.id;
    j["name"]          = displayName;
    j["connection_id"] = alarm.cfg.connection_id;
    j["tag_name"]      = alarm.cfg.tag_name;
    j["alarm_type"]    = alarm.cfg.type;
    j["enabled"]       = alarm.cfg.enabled;
    j["severity"]      = alarm.cfg.severity;
    j["active"]        = alarm.active;
    j["state"]         = state;   // "active", "cleared", "change"
    j["message"]       = message.empty() ? nullptr : json(message);

    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        snap.timestamp.time_since_epoch()
    ).count();
    j["timestamp_ms"] = ms;

    std::visit([&j](auto &&arg) {
        j["value"] = arg;
    }, snap.value);

    if (alarm.cfg.type == "high" || alarm.cfg.type == "low") {
        j["threshold"]  = alarm.cfg.threshold;
        j["hysteresis"] = alarm.cfg.hysteresis;
    }
    if (alarm.cfg.type == "equals" || alarm.cfg.type == "not_equals") {
        j["equals_value"] = alarm.cfg.equals_value;
        j["tolerance"] = alarm.cfg.equals_tolerance;
    }

    ws_send_json(j);
}

void ws_notify_event_log_row(const TagSnapshot *prevSnap,
                             const TagSnapshot &snap)
{
    if (!ws_is_enabled()) return;

    json j;
    j["type"]          = "event_log";
    j["connection_id"] = snap.connection_id;
    j["tag_name"]      = snap.logical_name;

    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        snap.timestamp.time_since_epoch()
    ).count();
    j["timestamp_ms"] = ms;

    // new side
    j["new_quality"] = snap.quality;
    std::visit([&j](auto &&arg) {
        j["new_value"] = arg;
    }, snap.value);

    // old side
    if (prevSnap) {
        j["old_quality"] = prevSnap->quality;
        std::visit([&j](auto &&arg) {
            j["old_value"] = arg;
        }, prevSnap->value);
    } else {
        j["old_quality"] = nullptr;
        j["old_value"]   = nullptr;
    }

    ws_send_json(j);
}

static bool plc_set_value_from_string(const std::string &datatype,
                                      int32_t handle,
                                      const std::string &value_str,
                                      TagValue &outValue,
                                      std::string &outError)
{
    try {
        int status = PLCTAG_STATUS_OK;

        if (datatype == "float32") {
            float v = std::stof(value_str);
            status = plc_tag_set_float32(handle, 0, v);
            outValue = v;
        } else if (datatype == "float64") {
            double v = std::stod(value_str);
            status = plc_tag_set_float64(handle, 0, v);
            outValue = v;
        } else if (datatype == "int32") {
            int32_t v = static_cast<int32_t>(std::stol(value_str));
            status = plc_tag_set_int32(handle, 0, v);
            outValue = v;
        } else if (datatype == "uint32") {
            uint32_t v = static_cast<uint32_t>(std::stoul(value_str));
            status = plc_tag_set_uint32(handle, 0, v);
            outValue = v;
        } else if (datatype == "int16") {
            int16_t v = static_cast<int16_t>(std::stoi(value_str));
            status = plc_tag_set_int16(handle, 0, v);
            outValue = v;
        } else if (datatype == "uint16") {
            uint16_t v = static_cast<uint16_t>(std::stoul(value_str));
            status = plc_tag_set_uint16(handle, 0, v);
            outValue = v;
        } else if (datatype == "bool") {
            bool bv;
            if (!parse_bool(value_str, bv)) {
                outError = "Cannot parse value as bool";
                return false;
            }
            int8_t raw = bv ? 1 : 0;
            status = plc_tag_set_int8(handle, 0, raw);
            outValue = bv;
        } else {
            outError = "Unsupported datatype '" + datatype + "'";
            return false;
        }

        if (status != PLCTAG_STATUS_OK) {
            outError = plc_tag_decode_error(status);
            return false;
        }

        return true;
    } catch (const std::exception &ex) {
        outError = std::string("Error parsing value: ") + ex.what();
        return false;
    }
}

bool write_tag_by_name(std::vector<DriverContext> &drivers,
                       const std::string &conn_id,
                       const std::string &logical_name,
                       const std::string &value_str,
                       TagTable &table,
                       std::mutex &driverMutex)
{
    // Serialize libplctag access across poll loop / HTTP / MQTT / OPC UA.
    std::unique_lock<std::shared_mutex> plcLock;
    if (g_plcMutex) {
        plcLock = std::unique_lock<std::shared_mutex>(*g_plcMutex);
    }

    ConnectionConfig conn;
    TagConfig cfg;
    int32_t handle = PLCTAG_ERR_NOT_FOUND;
    TagSnapshot prevSnap;
    bool hadPrev = false;
    bool found = false;

    const std::string key = make_tag_key(conn_id, logical_name);

    {
        std::lock_guard<std::mutex> lock(driverMutex);

        for (auto &driver : drivers) {
            if (driver.conn.id != conn_id) continue;
            conn = driver.conn;
            for (auto &t : driver.tags) {
                if (t.cfg.logical_name == logical_name) {
                    cfg = t.cfg;
                    handle = t.handle;
                    found = true;
                    break;
                }
            }
            break;
        }

        if (found) {
            auto itPrev = table.find(key);
            if (itPrev != table.end()) {
                prevSnap = itPrev->second;
                hadPrev = true;
            }
        }
    }

    if (!found) {
        std::cerr << "Connection/tag not found for write: ["
                  << conn_id << "]." << logical_name << "\n";
        return false;
    }
    if (!cfg.writable) {
        std::cerr << "Tag '" << logical_name
                  << "' is not marked writable in config.\n";
        return false;
    }
    if (handle < 0) {
        std::cerr << "Tag '" << logical_name
                  << "' has invalid handle; cannot write.\n";
        return false;
    }

    TagValue value{};
    std::string parseErr;
    if (!plc_set_value_from_string(cfg.datatype, handle, value_str, value, parseErr)) {
        std::cerr << "Write parse/set failed for ["
                  << conn_id << "]." << logical_name
                  << ": " << parseErr << "\n";
        return false;
    }

    int status = plc_tag_write(handle, conn.default_write_ms);
    if (status != PLCTAG_STATUS_OK) {
        std::cerr << "plc_tag_write failed for ["
                  << conn_id << "]." << logical_name
                  << ": " << plc_tag_decode_error(status) << "\n";
        return false;
    }

    TagSnapshot snap;
    snap.connection_id = conn.id;
    snap.logical_name  = logical_name;
    snap.datatype      = cfg.datatype;
    snap.timestamp     = std::chrono::system_clock::now();
    snap.quality       = 1;
    snap.value         = value;

    {
        std::lock_guard<std::mutex> lock(driverMutex);
        table[key] = snap;
    }

    std::cout << "Write OK: [" << conn.id << "] "
              << logical_name << " := " << value_str << "\n";

    if (cfg.log_event_on_change) {
        bool valueChanged = !hadPrev || !snapshot_values_equal(snap, prevSnap);
        if (valueChanged) {
            int64_t ts_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
                snap.timestamp.time_since_epoch()
            ).count();

            std::string oldVal = hadPrev ? snapshot_value_to_string(prevSnap) : std::string{};
            std::string newVal = snapshot_value_to_string(snap);
            int oldQ = hadPrev ? prevSnap.quality : -1;
            int newQ = snap.quality;

            std::string extra = R"({"source":"write"})";

            sqlite_log_event(
                conn.id,
                logical_name,
                oldVal,
                newVal,
                oldQ,
                newQ,
                ts_ms,
                extra
            );
        }
    }

    return true;
}

// -----------------------------
// Read helpers / dump
// -----------------------------

	bool read_all_tags_once(std::vector<DriverContext> &drivers, TagTable &tagTable) {
	    bool all_ok = true;

	    // Serialize libplctag access (read + get) with the poll loop / HTTP endpoints.
	    std::shared_lock<std::shared_mutex> plcLock;
	    if (g_plcMutex) {
	        plcLock = std::shared_lock<std::shared_mutex>(*g_plcMutex);
	    }

    for (auto &driver : drivers) {
        for (auto &t : driver.tags) {
            if (t.handle < 0) {
                std::cerr << "Skipping tag '" << t.cfg.logical_name
                          << "' on connection '" << driver.conn.id
                          << "' because handle is invalid.\n";
                all_ok = false;
                continue;
            }

            int32_t status = plc_tag_read(t.handle,
                                          driver.conn.default_read_ms);

            std::string key = make_tag_key(driver.conn.id, t.cfg.logical_name);

            if (status != PLCTAG_STATUS_OK) {
                std::cerr << "Read error for ["
                          << driver.conn.id << "]."
                          << t.cfg.logical_name << ": "
                          << plc_tag_decode_error(status) << std::endl;

                TagSnapshot &snap = tagTable[key];
                snap.connection_id = driver.conn.id;
                snap.logical_name  = t.cfg.logical_name;
                snap.datatype      = t.cfg.datatype;
                snap.timestamp     = std::chrono::system_clock::now();
                snap.quality       = 0;

                all_ok = false;
            } else {
                TagSnapshot &snap = tagTable[key];
                update_snapshot_from_plc(snap, driver.conn, t);
            }
        }
    }

    return all_ok;
}

bool dump_tag_table_once(std::vector<DriverContext> &drivers, TagTable &tagTable) {
    bool ok = read_all_tags_once(drivers, tagTable);
    for (const auto &kv : tagTable) {
        print_snapshot(kv.second);
    }
    return ok;
}

void dump_tag_table_as_json(const TagTable &tagTable) {
    json root;
    root["tags"] = json::array();

    for (const auto &kv : tagTable) {
        const TagSnapshot &snap = kv.second;
        json jt;
        jt["connection_id"] = snap.connection_id;
        jt["name"]          = snap.logical_name;
        jt["datatype"]      = snap.datatype;
        jt["quality"]       = snap.quality;

        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            snap.timestamp.time_since_epoch()
        ).count();
        jt["timestamp_ms"] = ms;

        std::visit([&jt](auto &&arg) {
            jt["value"] = arg;
        }, snap.value);

        root["tags"].push_back(jt);
    }

    std::cout << root.dump(2) << std::endl;
}

void schedule_next_periodic(TagRuntime &tagRt);

// -----------------------------
// Driver loading / reload
// -----------------------------

	void destroy_all_handles(std::vector<DriverContext> &drivers, bool plcAlreadyLocked = false) {
	    std::unique_lock<std::shared_mutex> plcLock;
	    if (!plcAlreadyLocked && g_plcMutex) {
	        plcLock = std::unique_lock<std::shared_mutex>(*g_plcMutex);
	    }

	    for (auto &driver : drivers) {
	        for (auto &t : driver.tags) {
	            if (t.handle >= 0) {
                plc_tag_destroy(t.handle);
                t.handle = PLCTAG_ERR_NOT_FOUND;
            }
        }
    }
}

bool load_mqtt_config(const std::string &configDir) {
    std::string path = joinPath(configDir, "mqtt.json");
    MqttConfig cfg; // starts with defaults

    if (!fs::exists(path)) {
        std::cout << "[mqtt] mqtt.json not found, using defaults: "
                  << cfg.host << ":" << cfg.port
                  << " base_topic='" << cfg.base_topic << "'\n";
        g_mqttCfg = cfg;
        return true;
    }

    try {
        json j = load_json_with_comments(path);

        cfg.enabled       = j.value("enabled", cfg.enabled);
        cfg.host          = j.value("host", cfg.host);
        cfg.port          = j.value("port", cfg.port);
        cfg.client_id     = j.value("client_id", cfg.client_id);
        cfg.base_topic    = j.value("base_topic", cfg.base_topic);
        cfg.qos           = j.value("qos", cfg.qos);
        cfg.retain        = j.value("retain", cfg.retain);
        cfg.keepalive     = j.value("keepalive", cfg.keepalive);
        cfg.username      = j.value("username", cfg.username);
        cfg.password      = j.value("password", cfg.password);
        cfg.publish_only_on_change = j.value("publish_only_on_change",
                                             cfg.publish_only_on_change);
        cfg.payload_format = j.value("payload_format", cfg.payload_format);

        cfg.subscribe_enabled = j.value("subscribe_enabled", false);
        cfg.command_topic     = j.value("command_topic", std::string{});

        // NEW: ack_base_topic from config (optional)
        cfg.ack_topic_prefix  = j.value("ack_topic_prefix", cfg.ack_topic_prefix);

        // If not explicitly set, derive command/ack topics from base_topic
        if (cfg.command_topic.empty()) {
            cfg.command_topic = cfg.base_topic + "/cmd";
        }
        if (cfg.ack_topic_prefix.empty()) {
            cfg.ack_topic_prefix = cfg.base_topic + "/ack";
        }

        // Optional patterns section (if you’re using it)
        if (j.contains("patterns") && j["patterns"].is_object()) {
            const auto &p = j["patterns"];
            cfg.publish_per_field   = p.value("per_field",   cfg.publish_per_field);
            cfg.publish_tag_json    = p.value("tag_json",    cfg.publish_tag_json);
            cfg.publish_conn_json   = p.value("connection_json",
                                              cfg.publish_conn_json);
        }

        // NEW: token-based auth for MQTT writes
        cfg.require_write_token = j.value("require_write_token", cfg.require_write_token);
        cfg.write_token         = j.value("write_token",         cfg.write_token);

        // NEW: TLS configuration
        cfg.use_tls     = j.value("use_tls", cfg.use_tls);
        cfg.cafile      = j.value("cafile", cfg.cafile);
        cfg.capath      = j.value("capath", cfg.capath);
        cfg.certfile    = j.value("certfile", cfg.certfile);
        cfg.keyfile     = j.value("keyfile", cfg.keyfile);
        cfg.tls_version = j.value("tls_version", cfg.tls_version);
        cfg.tls_insecure= j.value("tls_insecure", cfg.tls_insecure);



        g_mqttCfg = cfg;
        std::cout << "[mqtt] Loaded config from " << path << "\n";
        std::cout << "[mqtt]  base_topic:      " << g_mqttCfg.base_topic << "\n";
        std::cout << "[mqtt]  command_topic:   " << g_mqttCfg.command_topic << "\n";
        std::cout << "[mqtt]  ack_topic_prefix: " << g_mqttCfg.ack_topic_prefix << "\n";
        std::cout << "[mqtt]  use_tls:          " << (g_mqttCfg.use_tls ? "true" : "false") << "\n";
        if (g_mqttCfg.use_tls) {
            std::cout << "[mqtt]   cafile:      " << g_mqttCfg.cafile << "\n";
            std::cout << "[mqtt]   capath:      " << g_mqttCfg.capath << "\n";
            std::cout << "[mqtt]   certfile:    " << g_mqttCfg.certfile << "\n";
            std::cout << "[mqtt]   keyfile:     " << g_mqttCfg.keyfile << "\n";
            std::cout << "[mqtt]   tls_version: " << g_mqttCfg.tls_version << "\n";
            std::cout << "[mqtt]   tls_insecure:" << (g_mqttCfg.tls_insecure ? "true" : "false") << "\n";
        }        return true;
    } catch (const std::exception &ex) {
        std::cerr << "[mqtt] Error loading mqtt.json: " << ex.what() << "\n";
        return false;
    }
}

bool load_mqtt_inputs(const std::string &configDir) {
    g_mqttInputs.clear();
    g_mqttInputsByTopic.clear();

    std::string path = joinPath(configDir, "mqtt_inputs.json");
    std::cout << "[mqtt-inputs] init: looking for " << path << "\n";
    if (!fs::exists(path)) {
        std::cout << "[mqtt-inputs] mqtt_inputs.json not found; no MQTT telemetry inputs configured.\n";
        return true; // not an error, just none
    }

    try {
        json j = load_json_with_comments(path);

        if (!j.contains("inputs") || !j["inputs"].is_array()) {
            std::cerr << "[mqtt-inputs] '" << path
                      << "' must contain an 'inputs' array.\n";
            return false;
        }

        size_t idx = 0;
        for (const auto &ji : j["inputs"]) {
            MqttInputMapping m;

            m.id            = ji.value("id", std::string{});
            m.topic         = ji.value("topic", std::string{});
            m.connection_id = ji.value("connection_id", std::string{});
            m.tag_name      = ji.value("tag_name", std::string{});
            m.datatype      = ji.value("datatype", std::string{});

            m.write_to_plc   = ji.value("write_to_plc", true);
            m.payload_format = ji.value("payload_format", std::string("raw"));
            m.json_field     = ji.value("json_field", std::string{});

            if (m.id.empty()) {
                m.id = "input_" + std::to_string(idx);
            }

            bool ok = true;
            if (m.topic.empty()) {
                std::cerr << "[mqtt-inputs] Skipping input '" << m.id
                          << "': missing 'topic'.\n";
                ok = false;
            }
            if (m.connection_id.empty()) {
                std::cerr << "[mqtt-inputs] Skipping input '" << m.id
                          << "': missing 'connection_id'.\n";
                ok = false;
            }
            if (m.tag_name.empty()) {
                std::cerr << "[mqtt-inputs] Skipping input '" << m.id
                          << "': missing 'tag_name'.\n";
                ok = false;
            }
            if (m.datatype.empty()) {
                std::cerr << "[mqtt-inputs] Skipping input '" << m.id
                          << "': missing 'datatype'.\n";
                ok = false;
            }

            if (m.payload_format != "raw" && m.payload_format != "json_field") {
                std::cerr << "[mqtt-inputs] Input '" << m.id
                          << "' has invalid payload_format '" << m.payload_format
                          << "'. Expected 'raw' or 'json_field'.\n";
                ok = false;
            }

            if (m.payload_format == "json_field" && m.json_field.empty()) {
                std::cerr << "[mqtt-inputs] Input '" << m.id
                          << "' has payload_format='json_field' but no 'json_field' name.\n";
                ok = false;
            }

            if (!ok) {
                continue;
            }

            size_t newIdx = g_mqttInputs.size();
            g_mqttInputs.push_back(std::move(m));
            g_mqttInputsByTopic[g_mqttInputs.back().topic].push_back(newIdx);
            ++idx;
        }

        std::cout << "[mqtt-inputs] Loaded " << g_mqttInputs.size()
                  << " MQTT telemetry input mapping(s) from " << path << "\n";
        return true;
    } catch (const std::exception &ex) {
        std::cerr << "[mqtt-inputs] Error loading '" << path << "': "
                  << ex.what() << "\n";
        return false;
    }
}

bool load_all_drivers(std::vector<DriverContext> &outDrivers,
                      const std::string &configDir)
{
    std::string connDir = joinPath(configDir, "connections");
    std::string tagDir  = joinPath(configDir, "tags");

    std::cout << "[load] Using configDir:  " << configDir << "\n";
    std::cout << "[load] Connections dir:  " << connDir << "\n";
    std::cout << "[load] Tags dir:         " << tagDir << "\n";

    std::map<std::string, ConnectionConfig> connection_map;

    if (!fs::exists(connDir)) {
        std::cerr << "[load] ERROR: Connections directory does not exist: "
                  << connDir << "\n";
        return false;
    }

    // Load connections
    for (const auto &entry : fs::directory_iterator(connDir)) {
        if (!entry.is_regular_file()) continue;
        if (entry.path().extension() != ".json") continue;

        std::string path = entry.path().string();
        try {
            ConnectionConfig c = load_connection_config(path);
            std::cout << "[load] Loaded connection '" << c.id
                      << "' (driver=" << c.driver
                      << ", gateway=" << c.gateway
                      << ", path=" << c.path
                      << ", slot=" << c.slot
                      << ", plc_type=" << c.plc_type
                      << ") from " << path << "\n";
            if (connection_map.count(c.id)) {
                std::cerr << "[load] Warning: duplicate connection id '"
                          << c.id << "'; overwriting previous.\n";
            }
            connection_map[c.id] = c;
        } catch (const std::exception &ex) {
            std::cerr << "[load] Error in connection file " << path
                      << ": " << ex.what() << "\n";
        }
    }

    if (connection_map.empty()) {
        std::cerr << "[load] No connection configs loaded; starting with empty configuration.\n";
        outDrivers.clear();
        return true;
    }

    // Load tag files
    // Prefer one canonical tag file per connection_id (tags/<id>.json). If present, ignore other files
    // that claim the same connection_id (e.g. legacy .jsonc or alternate filenames).
    std::map<std::string, std::vector<TagConfig>> tags_by_conn;

    if (!fs::exists(tagDir)) {
        std::cerr << "[load] Warning: tags directory does not exist: "
                  << tagDir << "\n";
    } else {
        struct TagFileChoice {
            std::string cid;
            std::string path;
            std::string filename;
        };

        std::vector<TagFileChoice> candidates;
        for (const auto &entry : fs::directory_iterator(tagDir)) {
            if (!entry.is_regular_file()) continue;
            const std::string ext = entry.path().extension().string();
            if (ext != ".json" && ext != ".jsonc") continue;

            const std::string path = entry.path().string();
            try {
                TagFile tf = load_tag_file(path);
                if (tf.connection_id.empty()) continue;
                candidates.push_back({tf.connection_id, path, entry.path().filename().string()});
            } catch (const std::exception &ex) {
                std::cerr << "[load] Error in tag file " << path
                          << ": " << ex.what() << "\n";
            }
        }

        std::map<std::string, TagFileChoice> chosen;
        std::unordered_map<std::string, std::vector<TagFileChoice>> byCid;
        for (const auto &c : candidates) byCid[c.cid].push_back(c);

        for (auto &kv : byCid) {
            const std::string &cid = kv.first;
            auto &arr = kv.second;

            auto is_canonical_json = [&](const TagFileChoice &x) {
                return x.filename == (cid + ".json");
            };
            auto is_canonical_jsonc = [&](const TagFileChoice &x) {
                return x.filename == (cid + ".jsonc");
            };

            auto it = std::find_if(arr.begin(), arr.end(), is_canonical_json);
            if (it == arr.end()) it = std::find_if(arr.begin(), arr.end(), is_canonical_jsonc);
            if (it == arr.end()) {
                std::sort(arr.begin(), arr.end(), [](const TagFileChoice &a, const TagFileChoice &b) {
                    return a.filename < b.filename;
                });
                it = arr.begin();
            }

            chosen[cid] = *it;

            if (arr.size() > 1) {
                std::cerr << "[load] Info: multiple tag files for connection_id '" << cid
                          << "'. Using " << it->filename << " and ignoring others.\n";
            }
        }

        for (const auto &kv : chosen) {
            const auto &pick = kv.second;
            try {
                TagFile tf = load_tag_file(pick.path);
                std::cout << "[load] Loaded tag file for connection_id '"
                          << tf.connection_id << "' from " << pick.path << "\n";
                auto &vec = tags_by_conn[tf.connection_id];
                vec.insert(vec.end(), tf.tags.begin(), tf.tags.end());
            } catch (const std::exception &ex) {
                std::cerr << "[load] Error in tag file " << pick.path
                          << ": " << ex.what() << "\n";
            }
        }
    }

    for (const auto &kv : tags_by_conn) {
        const auto &conn_id = kv.first;
        if (!connection_map.count(conn_id)) {
            std::cerr << "[load] Warning: tags configured for connection_id '"
                      << conn_id << "' but no such connection exists.\n";
        }
    }

    std::vector<DriverContext> driversLocal;

    for (const auto &kv : connection_map) {
        const std::string &conn_id = kv.first;
        const ConnectionConfig &conn_cfg = kv.second;

        auto tags_it = tags_by_conn.find(conn_id);
        if (tags_it == tags_by_conn.end()) {
            std::cerr << "[load] Info: no tags defined for connection '"
                      << conn_id << "'. Skipping.\n";
            continue;
        }

	        DriverContext ctx;
	        ctx.conn = conn_cfg;

	        // Guard against duplicated tag definitions (e.g., multiple tag files or accidental repeats).
	        // Duplicates waste poll time and can make the UI appear "slower" because the same tag is read multiple times.
	        std::unordered_set<std::string> seen_logical_names;

		                for (const auto &tc : tags_it->second) {
		                    const std::string logical = tc.logical_name;
		                    if (!logical.empty()) {
		                        if (!seen_logical_names.insert(logical).second) {
		                            std::cerr << "[load] Warning: duplicate tag logical_name '" << logical
		                                      << "' for connection '" << conn_id << "'. Skipping duplicate.\n";
		                            continue;
		                        }
		                    }

		                    TagRuntime rt;
		                    rt.cfg = tc;

		                    // Disabled tags stay visible in /tags, but we don't create handles or poll them.
		                    if (!tc.enabled) {
			                    rt.handle = PLCTAG_ERR_NOT_FOUND;
			                    ctx.tags.push_back(std::move(rt));
			                    continue;
		                    }

	            std::string tag_str = build_tag_conn_str(conn_cfg, tc);
	            std::cout << "[load] Creating tag handle: " << tag_str << std::endl;

            int32_t handle = plc_tag_create(tag_str.c_str(),
                                            conn_cfg.default_timeout_ms);
            int32_t status = plc_tag_status(handle);

            if (status != PLCTAG_STATUS_OK) {
                std::cerr << "[load] Error creating tag "
                          << tc.logical_name << " on connection '"
                          << conn_id << "': "
                          << plc_tag_decode_error(status) << std::endl;
                plc_tag_destroy(handle);
                rt.handle = PLCTAG_ERR_NOT_FOUND;
            } else {
                rt.handle    = handle;
                rt.next_poll = std::chrono::steady_clock::now();
                // NEW: initialize periodic schedule if enabled
                schedule_next_periodic(rt);
            }
            ctx.tags.push_back(rt);
        }

        driversLocal.push_back(std::move(ctx));
    }

    if (driversLocal.empty()) {
        std::cerr << "[load] No drivers with tags configured; starting with empty tag set.\n";
        outDrivers.clear();
        return true;
    }

    std::cout << "[load] Driver summary:\n";
    for (const auto &d : driversLocal) {
        std::cout << "  Connection '" << d.conn.id
                  << "' has " << d.tags.size() << " tag(s).\n";
    }

    outDrivers = std::move(driversLocal);
    return true;
}

bool load_alarms(const std::string &configDir,
                 std::vector<AlarmRuntime> &outAlarms)
{
    std::string path = joinPath(configDir, "alarms.json");

    if (!fs::exists(path)) {
        std::cout << "[alarms] alarms.json not found, no alarms configured.\n";
        outAlarms.clear();
        return true;
    }

    try {
        json j = load_json_with_comments(path);
        if (!j.contains("alarms") || !j["alarms"].is_array()) {
            std::cerr << "[alarms] alarms.json must contain an 'alarms' array.\n";
            return false;
        }

        std::vector<AlarmRuntime> tmp;

	        for (const auto &ja : j["alarms"]) {
	            AlarmConfig cfg;

            cfg.id             = ja.value("id", std::string{});
            cfg.name           = ja.value("name", ja.value("description", cfg.id));
            cfg.connection_id  = ja.value("connection_id", std::string{});
            cfg.tag_name       = ja.value("tag_name", std::string{});
            cfg.type           = ja.value("type", std::string{});
            cfg.threshold      = ja.value("threshold", cfg.threshold);
            cfg.hysteresis     = ja.value("hysteresis", cfg.hysteresis);
            cfg.enabled        = ja.value("enabled", cfg.enabled);
            cfg.severity       = ja.value("severity", cfg.severity);
            cfg.message_on_active = ja.value("message_on_active", ja.value("message", std::string{}));
            cfg.message_on_return = ja.value("message_on_return", std::string{});
	            cfg.group          = ja.value("group", std::string{});
	            cfg.site           = ja.value("site", std::string{});
	            if (ja.contains("value")) cfg.equals_value = ja["value"];
	            else if (ja.contains("equals_value")) cfg.equals_value = ja["equals_value"];
	            // Backward-compat / UI convenience: allow type=equals to use "threshold" as the target value.
	            else if (ja.contains("threshold")) cfg.equals_value = ja["threshold"];
	            cfg.equals_tolerance = ja.value("tolerance", ja.value("equals_tolerance", cfg.equals_tolerance));

            if (cfg.id.empty() || cfg.connection_id.empty() ||
                cfg.tag_name.empty() || cfg.type.empty())
            {
                std::cerr << "[alarms] Skipping alarm with missing fields (id/connection_id/tag_name/type).\n";
                continue;
            }

            // normalize type to lowercase
            for (auto &c : cfg.type) {
                c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
            }

	            if (cfg.type != "high" &&
	                cfg.type != "low" &&
	                cfg.type != "change" &&
	                cfg.type != "equals" &&
	                cfg.type != "not_equals")
	            {
	                std::cerr << "[alarms] Alarm '" << cfg.id
	                          << "' has unsupported type '" << cfg.type
	                          << "'. Skipping.\n";
	                continue;
	            }

		            if ((cfg.type == "equals" || cfg.type == "not_equals") && cfg.equals_value.is_null()) {
		                std::cerr << "[alarms] Alarm '" << cfg.id << "' type=" << cfg.type << " requires field 'value' (or 'threshold'). Skipping.\n";
		                continue;
		            }

            AlarmRuntime rt;
            rt.cfg = cfg;
            rt.active = false;
            rt.hasLastValue = false;
            tmp.push_back(rt);
        }

        outAlarms = std::move(tmp);

        std::cout << "[alarms] Loaded " << outAlarms.size()
                  << " alarm(s) from " << path << "\n";
        return true;
    } catch (const std::exception &ex) {
        std::cerr << "[alarms] Error loading alarms.json: " << ex.what() << "\n";
        return false;
    }
}

// Build map from "<conn>:<tag>" → alarm indices
void build_alarm_index(const std::vector<AlarmRuntime> &alarms) {
    g_alarmIndexByTag.clear();
    for (size_t i = 0; i < alarms.size(); ++i) {
        const auto &a = alarms[i];
        if (!a.cfg.enabled) continue;
        std::string key = make_tag_key(a.cfg.connection_id, a.cfg.tag_name);
        g_alarmIndexByTag[key].push_back(i);
    }

    std::cout << "[alarms] Index built for "
              << g_alarmIndexByTag.size() << " tag(s).\n";
}


// Resolve the CA certificate path based on mqtt.json (if present) or default.
static std::string resolve_ca_cert_path(const std::string &configDir) {
    // Default fallback: <configDir>/ca.crt
    std::string defaultPath = joinPath(configDir, "ca.crt");

    // Try to read mqtt.json to see if a cafile is configured
    std::string mqttPath = joinPath(configDir, "mqtt.json");
    if (!fs::exists(mqttPath)) {
        return defaultPath;
    }

    try {
        std::string txt = read_file_to_string(mqttPath);
        nlohmann::json j = nlohmann::json::parse(strip_json_comments(txt));

        std::string cafile = j.value("cafile", "");
        if (cafile.empty()) {
            return defaultPath;
        }

        fs::path p(cafile);
        if (p.is_absolute()) {
            return p.string();
        } else {
            return joinPath(configDir, cafile);
        }
    } catch (...) {
        // If anything goes wrong, just fall back.
        return defaultPath;
    }
}

std::string mqtt_sanitize(const std::string &s) {
    std::string out;
    out.reserve(s.size());
    for (char c : s) {
        if (std::isalnum(static_cast<unsigned char>(c)) ||
            c == '_' || c == '-' || c == '.') {
            out.push_back(c);
        } else {
            out.push_back('_');
        }
    }
    if (out.empty()) out = "_";
    return out;
}

void mqtt_publish_raw(const std::string &topic,
                      const std::string &payload)
{
    if (!g_mqtt) return;

    std::lock_guard<std::mutex> lock(g_mqttMutex);

    int rc = mosquitto_publish(
        g_mqtt,
        nullptr, // message id (we don't track)
        topic.c_str(),
        static_cast<int>(payload.size()),
        payload.data(),
        g_mqttCfg.qos,
        g_mqttCfg.retain
    );

    if (rc != MOSQ_ERR_SUCCESS) {
        std::cerr << "[mqtt] publish to '" << topic << "' failed: "
                  << mosquitto_strerror(rc) << "\n";
    }
}

// Helper: publish structured ACK for an MQTT command
void mqtt_publish_command_ack(const std::string &conn_id,
                              const std::string &tag_name,
                              const std::string &value_str,
                              bool ok,
                              const std::string &error_msg,
                              const std::string &topic_suffix,
                              int64_t ts_ms,
                              const std::string &source_topic)
{
    if (!g_mqtt || !g_mqttCfg.enabled) {
        return;
    }

    json j;
    j["connection_id"]         = conn_id;
    j["tag"]                   = tag_name;
    j["requested_value"]       = value_str;
    j["ok"]                    = ok;
    j["response_timestamp_ms"] = ts_ms;

    if (!error_msg.empty()) {
        j["error"] = error_msg;
    }
    if (!source_topic.empty()) {
        j["source_topic"] = source_topic;
    }

    const std::string connSafe = mqtt_sanitize(conn_id);
    const std::string tagSafe  = mqtt_sanitize(tag_name);

    // Build final topic:
    //   ack_topic_prefix/<topic_suffix>   (if topic_suffix not empty)
    //   ack_topic_prefix/<conn>/<tag>     (otherwise)
    std::string topic = g_mqttCfg.ack_topic_prefix;
    if (!topic.empty() && topic.back() != '/') {
        topic.push_back('/');
    }

    if (!topic_suffix.empty()) {
        topic += topic_suffix;  // e.g. "microplc03/ML1100.RunCommand"
    } else {
        topic += connSafe + "/" + tagSafe;
    }

    mqtt_publish_raw(topic, j.dump());
}

bool mqtt_publish_snapshot(const TagSnapshot &snap,
                           const TagSnapshot *prev)
{
    if (!g_mqtt || !g_mqttCfg.enabled) {
        return false;
    }

    const std::string key = make_tag_key(snap.connection_id, snap.logical_name);

    auto now = snap.timestamp;
    if (now.time_since_epoch().count() == 0) {
        now = std::chrono::system_clock::now();
    }

    MqttTagState &state = g_mqttTagState[key];

    bool changed = false;

    if (!state.hasValue) {
        changed = true;
    } else {
        // value change
        changed = (snap.value != state.lastValue);
        // you can also include quality changes if you like
        if (!changed && prev && prev->quality != snap.quality) {
            changed = true;
        }
    }

    bool heartbeatDue = false;
    if (state.hasValue) {
        auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(
            now - state.lastPublish
        ).count();
        heartbeatDue = (elapsed >= g_mqttCfg.heartbeat_sec);
    } else {
        heartbeatDue = true; // first publish
    }

    if (!changed && !heartbeatDue) {
        return false; // hybrid: nothing to send
    }

    // Update state
    state.hasValue    = true;
    state.lastPublish = now;
    state.lastValue   = snap.value;

    const std::string base = g_mqttCfg.base_topic.empty()
                           ? std::string("opcbridge")
                           : g_mqttCfg.base_topic;

    const std::string connSafe = mqtt_sanitize(snap.connection_id);
    const std::string tagSafe  = mqtt_sanitize(snap.logical_name);

    // stringify value
    std::string valueStr;
    {
        std::ostringstream oss;
        std::visit([&oss](auto &&arg) { oss << arg; }, snap.value);
        valueStr = oss.str();
    }

    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()
    ).count();

    // Pattern 1: per-field topics
    if (g_mqttCfg.publish_per_field) {
        std::string t_val = base + "/" + connSafe + "/" + tagSafe + "/value";
        std::string t_qlt = base + "/" + connSafe + "/" + tagSafe + "/quality";
        std::string t_ts  = base + "/" + connSafe + "/" + tagSafe + "/timestamp";

        mqtt_publish_raw(t_val, valueStr);

        {
            std::ostringstream oss;
            oss << snap.quality;
            mqtt_publish_raw(t_qlt, oss.str());
        }

        {
            std::ostringstream oss;
            oss << ms;
            mqtt_publish_raw(t_ts, oss.str());
        }
    }

    // Pattern 2: JSON per tag
    if (g_mqttCfg.publish_tag_json) {
        json jt;
        jt["connection_id"] = snap.connection_id;
        jt["name"]          = snap.logical_name;
        jt["datatype"]      = snap.datatype;
        jt["quality"]       = snap.quality;
        jt["timestamp_ms"]  = ms;

        std::visit([&jt](auto &&arg) {
            jt["value"] = arg;
        }, snap.value);

        std::string topic = base + "/" + connSafe + "/" + tagSafe;
        mqtt_publish_raw(topic, jt.dump());
    }

    return true;
}

bool mqtt_publish_connection_snapshot(const std::string &connId,
                                      const TagTable &table,
                                      bool anyTagChanged)
{
    if (!g_mqtt || !g_mqttCfg.enabled || !g_mqttCfg.publish_conn_json) {
        return false;
    }

    auto now = std::chrono::system_clock::now();
    MqttConnState &st = g_mqttConnState[connId];

    bool heartbeatDue = false;
    if (st.hasPublish) {
        auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(
            now - st.lastPublish
        ).count();
        heartbeatDue = (elapsed >= g_mqttCfg.heartbeat_sec);
    } else {
        heartbeatDue = true;
    }

    if (!anyTagChanged && !heartbeatDue) {
        return false;
    }

    json root;
    root["connection_id"] = connId;
    root["ts"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()
    ).count();
    root["tags"] = json::array();

    for (const auto &kv : table) {
        const TagSnapshot &snap = kv.second;
        if (snap.connection_id != connId) continue;

        json jt;
        jt["connection_id"] = snap.connection_id;
        jt["name"]          = snap.logical_name;
        jt["datatype"]      = snap.datatype;
        jt["quality"]       = snap.quality;
        jt["timestamp_ms"]  = std::chrono::duration_cast<std::chrono::milliseconds>(
            snap.timestamp.time_since_epoch()
        ).count();

        std::visit([&jt](auto &&arg) {
            jt["value"] = arg;
        }, snap.value);

        root["tags"].push_back(jt);
    }

    const std::string base = g_mqttCfg.base_topic.empty()
                           ? std::string("opcbridge")
                           : g_mqttCfg.base_topic;
    std::string topic = base + "/" + mqtt_sanitize(connId) + "/all";

    mqtt_publish_raw(topic, root.dump());

    st.hasPublish = true;
    st.lastPublish = now;
    return true;
}

// ----------------------------------------------------------
// MQTT config summary / validation (startup diagnostics)
// ----------------------------------------------------------
void mqtt_log_config_summary(const std::string &configDir) {
    std::cout << "[mqtt] ================= MQTT CONFIG SUMMARY =================\n";

    std::cout << "[mqtt] enabled:            " << (g_mqttCfg.enabled ? "true" : "false") << "\n";
    std::cout << "[mqtt] host:               " << g_mqttCfg.host << ":" << g_mqttCfg.port << "\n";
    std::cout << "[mqtt] client_id:          " << g_mqttCfg.client_id << "\n";
    std::cout << "[mqtt] base_topic:         " << g_mqttCfg.base_topic << "\n";
    std::cout << "[mqtt] qos:                " << g_mqttCfg.qos << "\n";
    std::cout << "[mqtt] retain:             " << (g_mqttCfg.retain ? "true" : "false") << "\n";
    std::cout << "[mqtt] keepalive:          " << g_mqttCfg.keepalive << "s\n";

    // Commands / ACKs
    std::cout << "[mqtt] subscribe_enabled:  " << (g_mqttCfg.subscribe_enabled ? "true" : "false") << "\n";
    std::cout << "[mqtt] command_topic:      " << (g_mqttCfg.command_topic.empty()
                                                ? "<empty>"
                                                : g_mqttCfg.command_topic) << "\n";
    std::cout << "[mqtt] ack_topic_prefix:   " << (g_mqttCfg.ack_topic_prefix.empty()
                                                ? "<empty>"
                                                : g_mqttCfg.ack_topic_prefix) << "\n";

    // Publish patterns
    std::cout << "[mqtt] publish_per_field:  " << (g_mqttCfg.publish_per_field ? "true" : "false") << "\n";
    std::cout << "[mqtt] publish_tag_json:   " << (g_mqttCfg.publish_tag_json ? "true" : "false") << "\n";
    std::cout << "[mqtt] publish_conn_json:  " << (g_mqttCfg.publish_conn_json ? "true" : "false") << "\n";

    // Write auth
    std::cout << "[mqtt] require_write_token:" << (g_mqttCfg.require_write_token ? "true" : "false") << "\n";

    if (g_mqttCfg.subscribe_enabled) {
        std::cout << "[mqtt] INFO: MQTT commands are ENABLED. Subscribing to: "
                  << g_mqttCfg.command_topic << "/#\n";
    } else {
        std::cout << "[mqtt] WARNING: subscribe_enabled=false; MQTT commands are DISABLED.\n";
        std::cout << "[mqtt]          No writes from MQTT will be processed.\n";
    }

    if (g_mqttCfg.command_topic.empty()) {
        std::cout << "[mqtt] WARNING: command_topic is empty; MQTT commands cannot be matched.\n";
    }

    if (g_mqttCfg.ack_topic_prefix.empty()) {
        std::cout << "[mqtt] WARNING: ack_topic_prefix is empty; ACK topics will be malformed.\n";
    }

    // TLS summary / validation
    std::cout << "[mqtt] use_tls:            " << (g_mqttCfg.use_tls ? "true" : "false") << "\n";

    if (g_mqttCfg.use_tls) {
        auto resolvePath = [&](const std::string &p) -> std::string {
            if (p.empty()) return {};
            // absolute path? just return
            if (!p.empty() && p[0] == '/')
                return p;
            // otherwise treat as relative to configDir
            return joinPath(configDir, p);
        };

        std::string cafile   = resolvePath(g_mqttCfg.cafile);
        std::string certfile = resolvePath(g_mqttCfg.certfile);
        std::string keyfile  = resolvePath(g_mqttCfg.keyfile);

        std::cout << "[mqtt]   cafile:          " << (cafile.empty() ? "<none>" : cafile) << "\n";
        std::cout << "[mqtt]   certfile:        " << (certfile.empty() ? "<none>" : certfile) << "\n";
        std::cout << "[mqtt]   keyfile:         " << (keyfile.empty() ? "<none>" : keyfile) << "\n";
        std::cout << "[mqtt]   tls_version:     "
                  << (g_mqttCfg.tls_version.empty() ? "<default>" : g_mqttCfg.tls_version) << "\n";
        std::cout << "[mqtt]   tls_insecure:    " << (g_mqttCfg.tls_insecure ? "true" : "false") << "\n";

        // Basic existence checks (warn only)
        if (!cafile.empty() && !fs::exists(cafile)) {
            std::cout << "[mqtt] WARNING: cafile does not exist on disk: " << cafile << "\n";
        }

        if (!certfile.empty() && !fs::exists(certfile)) {
            std::cout << "[mqtt] WARNING: certfile does not exist on disk: " << certfile << "\n";
        }

        if (!keyfile.empty() && !fs::exists(keyfile)) {
            std::cout << "[mqtt] WARNING: keyfile does not exist on disk: " << keyfile << "\n";
        }

        if (g_mqttCfg.cafile.empty() && g_mqttCfg.capath.empty()) {
            std::cout << "[mqtt] WARNING: TLS enabled but no cafile/capath configured.\n";
            std::cout << "[mqtt]          TLS handshake may fail if the broker cert is not in the system trust store.\n";
        }
    }

    std::cout << "[mqtt] =======================================================\n";
}

bool mqtt_init(const std::string &configDir) {
    if (!load_mqtt_config(configDir)) {
        return false;
    }

    // Log a summary of the loaded configuration (for humans)
    mqtt_log_config_summary(configDir);

    if (!g_mqttCfg.enabled) {
        std::cerr << "[mqtt] Config sets enabled=false; MQTT will not start.\n";
        return false;
    }

    mosquitto_lib_init();

    std::string cid = g_mqttCfg.client_id.empty()
                      ? std::string("opcbridge")
                      : g_mqttCfg.client_id;

    g_mqtt = mosquitto_new(cid.c_str(), true, nullptr);
    if (!g_mqtt) {
        std::cerr << "[mqtt] mosquitto_new failed.\n";
        mosquitto_lib_cleanup();
        return false;
    }

    // Optional auth
    if (!g_mqttCfg.username.empty()) {
        mosquitto_username_pw_set(
            g_mqtt,
            g_mqttCfg.username.c_str(),
            g_mqttCfg.password.empty() ? nullptr : g_mqttCfg.password.c_str()
        );
    }

    // Set callbacks
    mosquitto_connect_callback_set(g_mqtt,    mqtt_on_connect);
    mosquitto_disconnect_callback_set(g_mqtt, mqtt_on_disconnect);
    mosquitto_message_callback_set(g_mqtt,    mqtt_on_message);

    // ---------- TLS setup ----------
    if (g_mqttCfg.use_tls) {
        std::cout << "[mqtt] TLS enabled; configuring libmosquitto...\n";

        // Resolve cafile relative to configDir if it's not an absolute path
        std::string cafilePath;
        if (!g_mqttCfg.cafile.empty()) {
            cafilePath = resolve_ca_cert_path(configDir);
        }

        const char *cafile   = cafilePath.empty()           ? nullptr : cafilePath.c_str();
        const char *capath   = g_mqttCfg.capath.empty()     ? nullptr : g_mqttCfg.capath.c_str();
        const char *certfile = g_mqttCfg.certfile.empty()   ? nullptr : g_mqttCfg.certfile.c_str();
        const char *keyfile  = g_mqttCfg.keyfile.empty()    ? nullptr : g_mqttCfg.keyfile.c_str();

        std::cout << "[mqtt]   cafile:      " << (cafile   ? cafile   : "<none>") << "\n";
        std::cout << "[mqtt]   capath:      " << (capath   ? capath   : "<none>") << "\n";
        std::cout << "[mqtt]   certfile:    " << (certfile ? certfile : "<none>") << "\n";
        std::cout << "[mqtt]   keyfile:     " << (keyfile  ? keyfile  : "<none>") << "\n";
        std::cout << "[mqtt]   tls_version: "
                  << (g_mqttCfg.tls_version.empty() ? "<default>" : g_mqttCfg.tls_version)
                  << "\n";
        std::cout << "[mqtt]   tls_insecure:" << (g_mqttCfg.tls_insecure ? "true" : "false") << "\n";

        int rc = mosquitto_tls_set(
            g_mqtt,
            cafile,
            capath,
            certfile,
            keyfile,
            nullptr // pw_callback
        );
        if (rc != MOSQ_ERR_SUCCESS) {
            std::cerr << "[mqtt] mosquitto_tls_set failed: "
                      << mosquitto_strerror(rc) << "\n";
            mosquitto_destroy(g_mqtt);
            g_mqtt = nullptr;
            mosquitto_lib_cleanup();
            return false;
        }

        // Insecure mode (skip hostname / cert checks)
        if (g_mqttCfg.tls_insecure) {
            rc = mosquitto_tls_insecure_set(g_mqtt, true);
            if (rc != MOSQ_ERR_SUCCESS) {
                std::cerr << "[mqtt] tls_insecure_set error: "
                          << mosquitto_strerror(rc) << "\n";
            }
        }

        // Force a specific TLS version if requested
        if (!g_mqttCfg.tls_version.empty()) {
            rc = mosquitto_tls_opts_set(
                g_mqtt,
                1, // SSL_VERIFY_PEER
                g_mqttCfg.tls_version.c_str(), // <-- CORRECT SLOT
                nullptr                        // ciphers (default)
            );
            if (rc != MOSQ_ERR_SUCCESS) {
                std::cerr << "[mqtt] tls_opts_set error: "
                          << mosquitto_strerror(rc) << "\n";
            }
        }
    }

    int rc = mosquitto_connect_async(
        g_mqtt,
        g_mqttCfg.host.c_str(),
        g_mqttCfg.port,
        g_mqttCfg.keepalive
    );
    if (rc != MOSQ_ERR_SUCCESS) {
        std::cerr << "[mqtt] connect_async failed: "
                  << mosquitto_strerror(rc) << "\n";
        mosquitto_destroy(g_mqtt);
        g_mqtt = nullptr;
        mosquitto_lib_cleanup();
        return false;
    }

    std::cout << "[mqtt] Started: " << g_mqttCfg.host << ":" << g_mqttCfg.port
              << " base_topic='" << g_mqttCfg.base_topic << "'";
    if (g_mqttCfg.subscribe_enabled) {
        std::cout << " (subscribe enabled on '"
                  << g_mqttCfg.command_topic << "/#')";
    }
    std::cout << "\n";

    return true;
}

void mqtt_shutdown() {
    std::lock_guard<std::mutex> lock(g_mqttMutex);

    if (g_mqtt) {
        mosquitto_disconnect(g_mqtt);
        mosquitto_destroy(g_mqtt);
        g_mqtt = nullptr;
        mosquitto_lib_cleanup();
    }
    g_mqttTagState.clear();
    g_mqttConnState.clear();
}

double snapshot_value_as_double(const TagSnapshot &snap, bool &ok) {
    ok = true;
    double v = 0.0;

    std::visit([&](auto &&arg) {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, bool>) {
            v = arg ? 1.0 : 0.0;
        } else if constexpr (std::is_same_v<T, int16_t> ||
                             std::is_same_v<T, int32_t> ||
                             std::is_same_v<T, uint16_t> ||
                             std::is_same_v<T, uint32_t> ||
                             std::is_same_v<T, float> ||
                             std::is_same_v<T, double>) {
            v = static_cast<double>(arg);
        } else {
            ok = false;
        }
    }, snap.value);

    return v;
}

void publish_alarm_event(const AlarmRuntime &alarm,
                         const TagSnapshot &snap,
                         const std::string &state)
{
    const std::string displayName = alarm.cfg.name.empty() ? alarm.cfg.id : alarm.cfg.name;
    std::string message;
    if (state == "active") {
        message = alarm.cfg.message_on_active.empty() ? displayName : alarm.cfg.message_on_active;
    } else if (state == "cleared") {
        message = alarm.cfg.message_on_return;
    } else {
        message = displayName;
    }

    // 1) MQTT alarm publish (unchanged)
    if (g_mqtt && g_mqttCfg.enabled) {
        const std::string base = g_mqttCfg.base_topic.empty()
                               ? std::string("opcbridge")
                               : g_mqttCfg.base_topic;

        std::string topic = base + "/alarm/" + mqtt_sanitize(alarm.cfg.id);

        auto now_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            snap.timestamp.time_since_epoch()
        ).count();

        json j;
        j["alarm_id"]       = alarm.cfg.id;
        j["name"]           = displayName;
        j["connection_id"]  = alarm.cfg.connection_id;
        j["tag_name"]       = alarm.cfg.tag_name;
        j["type"]           = alarm.cfg.type;
        j["state"]          = state;  // "active", "cleared", "change"
        j["severity"]       = alarm.cfg.severity;
        j["message"]        = message.empty() ? nullptr : json(message);
        j["timestamp_ms"]   = now_ms;

        bool okNum = false;
        double v = snapshot_value_as_double(snap, okNum);
        if (okNum) {
            j["value"]      = v;
            j["threshold"]  = alarm.cfg.threshold;
            j["hysteresis"] = alarm.cfg.hysteresis;
        } else {
            std::visit([&](auto &&arg) {
                j["value"] = arg;
            }, snap.value);
        }

        if (alarm.cfg.type == "equals" || alarm.cfg.type == "not_equals") {
            j["equals_value"] = alarm.cfg.equals_value;
            j["tolerance"] = alarm.cfg.equals_tolerance;
        }

        mqtt_publish_raw(topic, j.dump());

		if (ws_is_enabled()) {
			ws_notify_alarm_event(alarm, snap, state);
		}

        // 2) SQLite event log for alarm state change
        //    We’ll store the process value as new_value and the full alarm
        //    payload as extra_json for later troubleshooting.
        std::string newVal = snapshot_value_to_string(snap);
        std::string oldVal;        // unknown / not tracked → leave empty
        int oldQ = -1;             // will be stored as NULL
        int newQ = snap.quality;   // typically 1 = good

        sqlite_log_event(
            alarm.cfg.connection_id,   // connection_id
            alarm.cfg.tag_name,        // tag_name
            oldVal,                    // old_value
            newVal,                    // new_value
            oldQ,                      // old_quality (NULL)
            newQ,                      // new_quality
            now_ms,                    // timestamp_ms
            j.dump()                   // extra_json (full alarm details)
        );

        // Optional: console line so you can see alarm transitions in the log
        std::cout << "[alarm] " << alarm.cfg.id << " state=" << state
                  << " [" << alarm.cfg.connection_id << "]."
                  << alarm.cfg.tag_name << " value=" << newVal << "\n";
    } else {
        // Even if MQTT is disabled, we still want to log the alarm to SQLite
        auto now_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            snap.timestamp.time_since_epoch()
        ).count();

        std::string newVal = snapshot_value_to_string(snap);
        std::string oldVal;
        int oldQ = -1;
        int newQ = snap.quality;

        json j;
        j["alarm_id"]      = alarm.cfg.id;
        j["name"]          = displayName;
        j["connection_id"] = alarm.cfg.connection_id;
        j["tag_name"]      = alarm.cfg.tag_name;
        j["type"]          = alarm.cfg.type;
        j["state"]         = state;
        j["severity"]      = alarm.cfg.severity;
        j["message"]       = message.empty() ? nullptr : json(message);
        j["timestamp_ms"]  = now_ms;

        if (alarm.cfg.type == "equals" || alarm.cfg.type == "not_equals") {
            j["equals_value"] = alarm.cfg.equals_value;
            j["tolerance"] = alarm.cfg.equals_tolerance;
        }

        sqlite_log_event(
            alarm.cfg.connection_id,
            alarm.cfg.tag_name,
            oldVal,
            newVal,
            oldQ,
            newQ,
            now_ms,
            j.dump()
        );

        std::cout << "[alarm] " << alarm.cfg.id << " state=" << state
                  << " [" << alarm.cfg.connection_id << "]."
                  << alarm.cfg.tag_name << " value=" << newVal
                  << " (MQTT disabled)\n";
    }
}

void evaluate_tag_alarms(const std::string &conn_id,
                         const std::string &logical_name,
                         const TagSnapshot &snap)
{
    // bad quality? You can choose to ignore or raise a "comm" alarm later.
    if (snap.quality != 1) {
        return;
    }

    std::string key = make_tag_key(conn_id, logical_name);
    auto it = g_alarmIndexByTag.find(key);
    if (it == g_alarmIndexByTag.end()) return;

    bool okNum = false;
    double val = snapshot_value_as_double(snap, okNum);

    for (size_t idx : it->second) {
        AlarmRuntime &a = g_alarms[idx];
        if (!a.cfg.enabled) continue;

        const std::string &type = a.cfg.type;

        if (type == "change") {
            // fire on any change
            bool changed = false;
            if (!a.hasLastValue) {
                changed = true;
            } else {
                changed = (snap.value != a.lastValue);
            }

            if (changed) {
                publish_alarm_event(a, snap, "change");
            }
            a.lastValue = snap.value;
            a.hasLastValue = true;
        }
        else if (type == "equals" || type == "not_equals") {
            bool matchKnown = false;
            bool match = false;

            // Bool targets
            if (a.cfg.equals_value.is_boolean()) {
                const bool target = a.cfg.equals_value.get<bool>();
                bool curOk = false;
                bool cur = false;
                std::visit([&](auto&& arg) {
                    using T = std::decay_t<decltype(arg)>;
                    if constexpr (std::is_same_v<T, bool>) { cur = arg; curOk = true; }
                }, snap.value);
                if (curOk) { matchKnown = true; match = (cur == target); }
            }
            // Numeric targets (support analog + integer tags)
            else if (a.cfg.equals_value.is_number() || a.cfg.equals_value.is_string()) {
                bool targetOk = false;
                double target = 0.0;
                try {
                    if (a.cfg.equals_value.is_number()) { target = a.cfg.equals_value.get<double>(); targetOk = true; }
                    else if (a.cfg.equals_value.is_string()) {
                        target = std::stod(a.cfg.equals_value.get<std::string>());
                        targetOk = true;
                    }
                } catch (...) { targetOk = false; }

                if (targetOk && okNum) {
                    matchKnown = true;
                    const double tol = std::max(0.0, a.cfg.equals_tolerance);
                    match = std::fabs(val - target) <= tol;
                }
            }

            const bool shouldBeActive = matchKnown && (type == "equals" ? match : !match);

            if (shouldBeActive && !a.active) {
                a.active = true;
                publish_alarm_event(a, snap, "active");
            } else if (!shouldBeActive && a.active) {
                a.active = false;
                publish_alarm_event(a, snap, "cleared");
            }

            a.lastValue = snap.value;
            a.hasLastValue = true;
        }
        else if ((type == "high" || type == "low") && okNum) {
            const double thr  = a.cfg.threshold;
            const double hyst = a.cfg.hysteresis;

            if (type == "high") {
                if (!a.active && val >= thr) {
                    a.active = true;
                    publish_alarm_event(a, snap, "active");
                } else if (a.active && val <= (thr - hyst)) {
                    a.active = false;
                    publish_alarm_event(a, snap, "cleared");
                }
            } else if (type == "low") {
                if (!a.active && val <= thr) {
                    a.active = true;
                    publish_alarm_event(a, snap, "active");
                } else if (a.active && val >= (thr + hyst)) {
                    a.active = false;
                    publish_alarm_event(a, snap, "cleared");
                }
            }

            // Track last value for UI/debugging (so /alarms shows the current PV).
            a.lastValue = snap.value;
            a.hasLastValue = true;
        }
        // Other types (rising_edge, falling_edge) could be added later.
    }
}

// -----------------------------
// OPC UA helper (Demo server)
// -----------------------------

// Map our datatype string to open62541 UA type index
UA_UInt16 uaTypeIndexForDatatype(const std::string &dt) {
    // Booleans
    if (dt == "bool" || dt == "BOOL" || dt == "Bool")
        return UA_TYPES_BOOLEAN;

    // 16-bit ints
    if (dt == "int16"   || dt == "INT"   || dt == "Int16")
        return UA_TYPES_INT16;
    if (dt == "uint16"  || dt == "WORD"  || dt == "Word")
        return UA_TYPES_UINT16;

    // 32-bit ints
    if (dt == "int32"   || dt == "DINT"  || dt == "Int32")
        return UA_TYPES_INT32;
    if (dt == "uint32"  || dt == "DWORD" || dt == "DWord")
        return UA_TYPES_UINT32;

    // Floats
    if (dt == "float32" || dt == "REAL"  || dt == "Real")
        return UA_TYPES_FLOAT;
    if (dt == "float64" || dt == "LREAL" || dt == "LReal")
        return UA_TYPES_DOUBLE;

    // Unsupported → log loudly
    std::cerr << "OPC UA: unsupported datatype string '" << dt
              << "' (no UA type mapping)\n";
    return 0;
}

bool init_opcua_server(uint16_t port, std::vector<DriverContext> &drivers) {
    if (g_uaServer) {
        std::cerr << "OPC UA: server already initialized.\n";
        return true;
    }

    std::cout << "OPC UA: starting server on opc.tcp://0.0.0.0:" << port
              << " (integrated with poll loop)\n";

    UA_Server *server = UA_Server_new();
    if (!server) {
        std::cerr << "OPC UA: Failed to create server\n";
        return false;
    }

    UA_ServerConfig *config = UA_Server_getConfig(server);
    if (!config) {
        std::cerr << "OPC UA: Failed to get server config\n";
        UA_Server_delete(server);
        return false;
    }

    UA_StatusCode rc = UA_ServerConfig_setMinimal(config, port, nullptr);
    if (rc != UA_STATUSCODE_GOOD) {
        std::cerr << "OPC UA: UA_ServerConfig_setMinimal failed: "
                  << UA_StatusCode_name(rc) << "\n";
        UA_Server_delete(server);
        return false;
    }

    // UA_ServerConfig_setMinimal allocates strings inside applicationDescription.
    // If we replace them, we must also allocate (and clear old) to avoid invalid frees on shutdown.
    UA_LocalizedText_clear(&config->applicationDescription.applicationName);
    config->applicationDescription.applicationName =
        UA_LOCALIZEDTEXT_ALLOC(const_cast<char*>("en-US"),
                               const_cast<char*>("opcbridge"));

    // Root OPCBridge object under Objects
    UA_NodeId bridgeId;
    {
        UA_ObjectAttributes oAttr = UA_ObjectAttributes_default;
        oAttr.displayName = UA_LOCALIZEDTEXT_ALLOC(
            const_cast<char*>("en-US"),
            const_cast<char*>("OPCBridge")
        );

        UA_StatusCode st = UA_Server_addObjectNode(
            server,
            UA_NODEID_NULL,
            UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER),
            UA_NODEID_NUMERIC(0, UA_NS0ID_ORGANIZES),
            UA_QUALIFIEDNAME(1, const_cast<char*>("OPCBridge")),
            UA_NODEID_NUMERIC(0, UA_NS0ID_BASEOBJECTTYPE),
            oAttr, nullptr, &bridgeId
        );
        UA_ObjectAttributes_clear(&oAttr);
        if (st != UA_STATUSCODE_GOOD) {
            std::cerr << "OPC UA: Failed to add OPCBridge object: "
                      << UA_StatusCode_name(st) << "\n";
        }
    }

    // Build bindings and namespace
    std::vector<UaTagBinding> bindings;
    bindings.reserve(drivers.size() * 16); // heuristic

    for (auto &driver : drivers) {
        ConnectionConfig &conn = driver.conn;

        UA_NodeId connNodeId;
        {
            UA_ObjectAttributes cAttr = UA_ObjectAttributes_default;
            cAttr.displayName = UA_LOCALIZEDTEXT_ALLOC(
                const_cast<char*>("en-US"),
                const_cast<char*>(conn.id.c_str())
            );

            UA_StatusCode st = UA_Server_addObjectNode(
                server,
                UA_NODEID_NULL,
                bridgeId,
                UA_NODEID_NUMERIC(0, UA_NS0ID_HASCOMPONENT),
                UA_QUALIFIEDNAME(1, const_cast<char*>(conn.id.c_str())),
                UA_NODEID_NUMERIC(0, UA_NS0ID_BASEOBJECTTYPE),
                cAttr, nullptr, &connNodeId
            );
            UA_ObjectAttributes_clear(&cAttr);
            if (st != UA_STATUSCODE_GOOD) {
                std::cerr << "OPC UA: Failed to add connection object '"
                          << conn.id << "': " << UA_StatusCode_name(st) << "\n";
                continue;
            }
        }

        for (auto &tag : driver.tags) {
            const TagConfig &cfg = tag.cfg;

            if (tag.handle < 0) {
                std::cerr << "OPC UA: skipping tag '" << cfg.logical_name
                          << "' on connection '" << conn.id
                          << "' (invalid handle)\n";
                continue;
            }

            // We can try one read to seed initial value
            int32_t rs = plc_tag_read(tag.handle, conn.default_read_ms);
            if (rs != PLCTAG_STATUS_OK) {
                std::cerr << "OPC UA: read error for [" << conn.id << "]."
                          << cfg.logical_name << ": "
                          << plc_tag_decode_error(rs) << "\n";
                // still create node with a default value
            }

            std::cout << "OPC UA: building node for [" << conn.id << "]."
                      << cfg.logical_name << " (datatype='"
                      << cfg.datatype << "')\n";

            UA_VariableAttributes vAttr = UA_VariableAttributes_default;
            vAttr.displayName = UA_LOCALIZEDTEXT_ALLOC(
                const_cast<char*>("en-US"),
                const_cast<char*>(cfg.logical_name.c_str())
            );
            vAttr.accessLevel = UA_ACCESSLEVELMASK_READ;
            if (cfg.writable) {
                vAttr.accessLevel |= UA_ACCESSLEVELMASK_WRITE;
            }

            bool supported = true;
            const std::string &dt = cfg.datatype;

            // Seed initial UA value based on datatype (from libplctag buffer)
            if (dt == "bool" || dt == "BOOL" || dt == "Bool") {
                UA_Boolean v = (plc_tag_get_int8(tag.handle, 0) != 0);
                vAttr.dataType  = UA_TYPES[UA_TYPES_BOOLEAN].typeId;
                vAttr.valueRank = UA_VALUERANK_SCALAR;
                UA_Variant_setScalarCopy(&vAttr.value, &v, &UA_TYPES[UA_TYPES_BOOLEAN]);
                std::cout << "OPC UA: [" << conn.id << "]." << cfg.logical_name
                          << " initial BOOL value = " << (int)v << "\n";

            } else if (dt == "int16" || dt == "INT" || dt == "Int16") {
                UA_Int16 v = plc_tag_get_int16(tag.handle, 0);
                UA_Variant_setScalarCopy(&vAttr.value, &v, &UA_TYPES[UA_TYPES_INT16]);

            } else if (dt == "uint16" || dt == "WORD" || dt == "Word") {
                UA_UInt16 v = static_cast<UA_UInt16>(plc_tag_get_uint16(tag.handle, 0));
                UA_Variant_setScalarCopy(&vAttr.value, &v, &UA_TYPES[UA_TYPES_UINT16]);

            } else if (dt == "int32" || dt == "DINT" || dt == "Int32") {
                UA_Int32 v = plc_tag_get_int32(tag.handle, 0);
                UA_Variant_setScalarCopy(&vAttr.value, &v, &UA_TYPES[UA_TYPES_INT32]);

            } else if (dt == "uint32" || dt == "DWORD" || dt == "DWord") {
                UA_UInt32 v = static_cast<UA_UInt32>(plc_tag_get_uint32(tag.handle, 0));
                UA_Variant_setScalarCopy(&vAttr.value, &v, &UA_TYPES[UA_TYPES_UINT32]);

            } else if (dt == "float32" || dt == "REAL" || dt == "Real") {
                UA_Float v = plc_tag_get_float32(tag.handle, 0);
                UA_Variant_setScalarCopy(&vAttr.value, &v, &UA_TYPES[UA_TYPES_FLOAT]);

            } else if (dt == "float64" || dt == "LREAL" || dt == "LReal") {
                UA_Double v = plc_tag_get_float64(tag.handle, 0);
                UA_Variant_setScalarCopy(&vAttr.value, &v, &UA_TYPES[UA_TYPES_DOUBLE]);

            } else {
                std::cerr << "OPC UA: unsupported datatype '" << dt
                          << "' for tag '" << cfg.logical_name << "'. Skipping.\n";
                supported = false;
            }

            if (!supported) {
                continue;
            }

            UA_NodeId varId;
            UA_StatusCode st = UA_Server_addVariableNode(
                server,
                UA_NODEID_NULL,
                connNodeId,
                UA_NODEID_NUMERIC(0, UA_NS0ID_HASCOMPONENT),
                UA_QUALIFIEDNAME(1, const_cast<char*>(cfg.logical_name.c_str())),
                UA_NODEID_NUMERIC(0, UA_NS0ID_BASEDATAVARIABLETYPE),
                vAttr, nullptr, &varId
            );
            UA_VariableAttributes_clear(&vAttr);
            if (st != UA_STATUSCODE_GOOD) {
                std::cerr << "OPC UA: Failed to add Variable node for tag '"
                          << cfg.logical_name << "' on connection '"
                          << conn.id << "': " << UA_StatusCode_name(st) << "\n";
                continue;
            }

            UaTagBinding b;
            b.handle       = tag.handle;
            b.datatype     = cfg.datatype;
            b.nodeId       = varId;
            b.conn         = &conn;
            b.logical_name = cfg.logical_name;
            b.writable     = cfg.writable;

            bindings.push_back(std::move(b));
            UaTagBinding *bindingPtr = &bindings.back();

            if (bindingPtr->writable) {
                UA_Server_setNodeContext(server, varId, bindingPtr);
                UA_ValueCallback cb;
                cb.onRead  = nullptr;
                cb.onWrite = opcua_onWrite;
                UA_Server_setVariableNode_valueCallback(server, varId, cb);
            }

            // Build lookup key
            std::string key = ua_key(conn.id, cfg.logical_name);
            // We'll fill g_uaBindingIndex after we move bindings into global
            (void)key;
        }
    }

    std::cout << "OPC UA: built " << bindings.size()
              << " variable bindings.\n";

    UA_StatusCode status = UA_Server_run_startup(server);
    if (status != UA_STATUSCODE_GOOD) {
        std::cerr << "OPC UA: UA_Server_run_startup failed: "
                  << UA_StatusCode_name(status) << "\n";
        UA_Server_delete(server);
        return false;
    }

    // Move into globals and build index
    g_uaServer = server;
    g_uaBindings = std::move(bindings);
    g_uaBindingIndex.clear();
    for (size_t i = 0; i < g_uaBindings.size(); ++i) {
        const auto &b = g_uaBindings[i];
        g_uaBindingIndex[ua_key(b.conn->id, b.logical_name)] = i;
    }

    return true;
}

void shutdown_opcua_server() {
    if (g_uaServer) {
        UA_Server_run_shutdown(g_uaServer);
        UA_Server_delete(g_uaServer);
        g_uaServer = nullptr;
        g_uaBindings.clear();
        g_uaBindingIndex.clear();
    }
}

// For change detection, we can reuse TagTable or keep another map.
// Easiest: we already store latest in tagTable; we'll compare to previous
// *before* overwriting, so we optionally publish only on change.

bool snapshot_values_equal(const TagSnapshot &a, const TagSnapshot &b) {
    if (a.datatype != b.datatype || a.connection_id != b.connection_id || a.logical_name != b.logical_name)
        return false;
    if (a.value.index() != b.value.index())
        return false;
    return a.value == b.value; // std::variant supports operator==
}

// Schedule the next periodic log time in wall-clock time based on tag config.
// Uses system local time (e.g., America/Chicago).
void schedule_next_periodic(TagRuntime &tagRt) {
    tagRt.periodic_enabled = false;

    if (!tagRt.cfg.log_periodic) {
        return;
    }

    const std::string &mode = tagRt.cfg.log_periodic_mode;

    if (mode == "interval") {
        // Simple: log every N seconds
        if (tagRt.cfg.log_periodic_interval_sec <= 0) {
            std::cerr << "[periodic] Tag '" << tagRt.cfg.logical_name
                      << "' has interval mode but non-positive interval_sec; disabling.\n";
            return;
        }
        tagRt.periodic_enabled = true;
        tagRt.next_periodic_log =
            std::chrono::system_clock::now() +
            std::chrono::seconds(tagRt.cfg.log_periodic_interval_sec);
    } else if (!mode.empty()) {
        // Hourly/daily not implemented yet (we can add later)
        std::cerr << "[periodic] Tag '" << tagRt.cfg.logical_name
                  << "' has unsupported log_periodic_mode='" << mode
                  << "'. Only 'interval' is implemented.\n";
    }
}

// ================================================================
// SQLite event logging (Option D: general tag change history)
// DB path: <configDir>/data/alarms.db
// Table: tag_events
// ================================================================

bool sqlite_alarm_init(const std::string &dbPath) {
    try {
        // Ensure parent directory exists
        fs::path p(dbPath);
        fs::path dir = p.parent_path();
        if (!dir.empty()) {
            std::error_code ec;
            fs::create_directories(dir, ec);
            if (ec) {
                std::cerr << "[sqlite] Failed to create directory '"
                          << dir.string() << "': " << ec.message() << "\n";
                return false;
            }
        }
    } catch (const std::exception &ex) {
        std::cerr << "[sqlite] Exception while creating data directory: "
                  << ex.what() << "\n";
        return false;
    }

    int rc = sqlite3_open(dbPath.c_str(), &g_alarmDb);
    if (rc != SQLITE_OK) {
        std::cerr << "[sqlite] sqlite3_open('" << dbPath
                  << "') failed: " << sqlite3_errmsg(g_alarmDb) << "\n";
        if (g_alarmDb) {
            sqlite3_close(g_alarmDb);
            g_alarmDb = nullptr;
        }
        return false;
    }

    const char *createSql =
        "CREATE TABLE IF NOT EXISTS tag_events ("
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "  timestamp_ms INTEGER NOT NULL,"
        "  connection_id TEXT NOT NULL,"
        "  tag_name TEXT NOT NULL,"
        "  old_value TEXT,"
        "  new_value TEXT,"
        "  old_quality INTEGER,"
        "  new_quality INTEGER"
        ");"
        "CREATE INDEX IF NOT EXISTS idx_tag_events_ts "
        "  ON tag_events(timestamp_ms);";

    char *errmsg = nullptr;
    rc = sqlite3_exec(g_alarmDb, createSql, nullptr, nullptr, &errmsg);
    if (rc != SQLITE_OK) {
        std::cerr << "[sqlite] CREATE TABLE failed: "
                  << (errmsg ? errmsg : "unknown") << "\n";
        if (errmsg) sqlite3_free(errmsg);
        sqlite3_close(g_alarmDb);
        g_alarmDb = nullptr;
        return false;
    }

    std::cout << "[sqlite] Event DB initialised at " << dbPath << "\n";
    return true;
}

void sqlite_alarm_shutdown() {
    std::lock_guard<std::mutex> lock(g_alarmDbMutex);
    if (g_alarmDb) {
        sqlite3_close(g_alarmDb);
        g_alarmDb = nullptr;
        std::cout << "[sqlite] Event DB closed.\n";
    }
}

// Log a tag change event (value and/or quality change)
void sqlite_log_tag_change(const TagSnapshot *prevSnapOrNull,
                           const TagSnapshot &snap)
{
    if (!g_alarmDb) return;

    int64_t ts_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        snap.timestamp.time_since_epoch()
    ).count();

    std::string old_val;
    int old_q = -1;

    if (prevSnapOrNull) {
        old_val = tag_value_to_string(prevSnapOrNull->value);
        old_q   = prevSnapOrNull->quality;
    }

    std::string new_val = tag_value_to_string(snap.value);
    int new_q = snap.quality;

    std::lock_guard<std::mutex> lock(g_alarmDbMutex);

    const char *sql =
        "INSERT INTO tag_events (timestamp_ms, connection_id, tag_name,"
        "                        old_value, new_value, old_quality, new_quality)"
        " VALUES (?, ?, ?, ?, ?, ?, ?);";

    sqlite3_stmt *stmt = nullptr;
    int rc = sqlite3_prepare_v2(g_alarmDb, sql, -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "[sqlite] prepare failed: " << sqlite3_errmsg(g_alarmDb) << "\n";
        return;
    }

    sqlite3_bind_int64(stmt, 1, ts_ms);
    sqlite3_bind_text(stmt, 2, snap.connection_id.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, snap.logical_name.c_str(), -1, SQLITE_TRANSIENT);

    if (!old_val.empty()) {
        sqlite3_bind_text(stmt, 4, old_val.c_str(), -1, SQLITE_TRANSIENT);
    } else {
        sqlite3_bind_null(stmt, 4);
    }

    sqlite3_bind_text(stmt, 5, new_val.c_str(), -1, SQLITE_TRANSIENT);

    if (old_q >= 0) {
        sqlite3_bind_int(stmt, 6, old_q);
    } else {
        sqlite3_bind_null(stmt, 6);
    }

    sqlite3_bind_int(stmt, 7, new_q);

    rc = sqlite3_step(stmt);
    if (rc != SQLITE_DONE) {
        std::cerr << "[sqlite] insert failed: " << sqlite3_errmsg(g_alarmDb) << "\n";
    }

    sqlite3_finalize(stmt);
}

bool sqlite_init(const std::string &configDir) {
    if (g_alarmDb) {
        return true; // already open
    }

    // Build data directory and DB path: <configDir>/data/alarms.db
    std::string dataDir = joinPath(configDir, "data");
    fs::create_directories(dataDir);

    std::string dbPath = joinPath(dataDir, "alarms.db");
    std::cout << "[sqlite] Opening DB at: " << dbPath << "\n";

    int rc = sqlite3_open(dbPath.c_str(), &g_alarmDb);
    if (rc != SQLITE_OK) {
        std::cerr << "[sqlite] Failed to open DB '" << dbPath << "': "
                  << sqlite3_errmsg(g_alarmDb) << "\n";
        sqlite3_close(g_alarmDb);
        g_alarmDb = nullptr;
        return false;
    }

    const char *SQL_CREATE = R"SQL(
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp_ms  INTEGER NOT NULL,
            connection_id TEXT    NOT NULL,
            tag_name      TEXT    NOT NULL,
            old_value     TEXT,
            new_value     TEXT,
            old_quality   INTEGER,
            new_quality   INTEGER,
            extra_json    TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_events_ts ON events(timestamp_ms);
        CREATE INDEX IF NOT EXISTS idx_events_tag ON events(connection_id, tag_name);
    )SQL";

    char *errmsg = nullptr;
    rc = sqlite3_exec(g_alarmDb, SQL_CREATE, nullptr, nullptr, &errmsg);
    if (rc != SQLITE_OK) {
        std::cerr << "[sqlite] schema error: " << (errmsg ? errmsg : "") << "\n";
        sqlite3_free(errmsg);
        sqlite3_close(g_alarmDb);
        g_alarmDb = nullptr;
        return false;
    }

    std::cout << "[sqlite] opened " << dbPath << "\n";
    return true;
}

void sqlite_shutdown() {
    if (g_alarmDb) {
        sqlite3_close(g_alarmDb);
        g_alarmDb = nullptr;
    }
}

// Fetch recent events for HTTP /alarm-history
bool sqlite_fetch_recent_events(int limit, json &outArray) {
    outArray = json::array();
    if (!g_alarmDb) return false;

    if (limit < 1) limit = 1;
    if (limit > 1000) limit = 1000;

    std::string sql =
        "SELECT timestamp_ms, connection_id, tag_name,"
        "       old_value, new_value, old_quality, new_quality"
        "  FROM events"
        " ORDER BY timestamp_ms DESC"
        " LIMIT " + std::to_string(limit) + ";";

    std::lock_guard<std::mutex> lock(g_alarmDbMutex);

    sqlite3_stmt *stmt = nullptr;
    int rc = sqlite3_prepare_v2(g_alarmDb, sql.c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "[sqlite] select prepare failed: "
                  << sqlite3_errmsg(g_alarmDb) << "\n";
        return false;
    }

	while ((rc = sqlite3_step(stmt)) == SQLITE_ROW) {
		json ev;

		// Fixed columns
		ev["timestamp_ms"]  = sqlite3_column_int64(stmt, 0);
		ev["connection_id"] =
			reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
		ev["tag_name"]      =
			reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));

		// old_value (column 3)
		{
			const unsigned char *ov = sqlite3_column_text(stmt, 3);
			if (ov) {
				ev["old_value"] = reinterpret_cast<const char*>(ov);
			} else {
				ev["old_value"] = nullptr;
			}
		}

		// new_value (column 4)
		{
			const unsigned char *nv = sqlite3_column_text(stmt, 4);
			if (nv) {
				ev["new_value"] = reinterpret_cast<const char*>(nv);
			} else {
				ev["new_value"] = nullptr;
			}
		}

		// old_quality (column 5, may be NULL)
		if (sqlite3_column_type(stmt, 5) == SQLITE_NULL) {
			ev["old_quality"] = nullptr;
		} else {
			ev["old_quality"] = sqlite3_column_int(stmt, 5);
		}

		// new_quality (column 6, may be NULL)
		if (sqlite3_column_type(stmt, 6) == SQLITE_NULL) {
			ev["new_quality"] = nullptr;
		} else {
			ev["new_quality"] = sqlite3_column_int(stmt, 6);
		}

		// If/when you add an extra_json TEXT column as column 7 in the SELECT:
		// if (sqlite3_column_type(stmt, 7) == SQLITE_NULL) {
		//     ev["extra_json"] = nullptr;
		// } else {
		//     const unsigned char *ej = sqlite3_column_text(stmt, 7);
		//     ev["extra_json"] = ej ? reinterpret_cast<const char*>(ej) : nullptr;
		// }

		outArray.push_back(ev);
	}

    if (rc != SQLITE_DONE) {
        std::cerr << "[sqlite] select step error: "
                  << sqlite3_errmsg(g_alarmDb) << "\n";
        sqlite3_finalize(stmt);
        return false;
    }

    sqlite3_finalize(stmt);
    return true;
}

// Simple event-logging helper: one row per change
bool sqlite_log_event(const std::string &connection_id,
                      const std::string &tag_name,
                      const std::string &old_value,
                      const std::string &new_value,
                      int old_quality,
                      int new_quality,
                      int64_t timestamp_ms,
                      const std::string &extra_json)
{
    if (!g_alarmDb) {
        // Optional debug:
        // std::cerr << "[sqlite] log_event: DB not initialised\n";
        return false;
    }

    static const char *SQL_INSERT = R"SQL(
        INSERT INTO events (
            timestamp_ms,
            connection_id,
            tag_name,
            old_value,
            new_value,
            old_quality,
            new_quality,
            extra_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    )SQL";

    sqlite3_stmt *stmt = nullptr;
    int rc = sqlite3_prepare_v2(g_alarmDb, SQL_INSERT, -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "[sqlite] insert prepare error: "
                  << sqlite3_errmsg(g_alarmDb) << "\n";
        return false;
    }

    int idx = 1;
    sqlite3_bind_int64(stmt, idx++, timestamp_ms);
    sqlite3_bind_text (stmt, idx++, connection_id.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text (stmt, idx++, tag_name.c_str(),      -1, SQLITE_TRANSIENT);
    sqlite3_bind_text (stmt, idx++, old_value.c_str(),     -1, SQLITE_TRANSIENT);
    sqlite3_bind_text (stmt, idx++, new_value.c_str(),     -1, SQLITE_TRANSIENT);
    sqlite3_bind_int  (stmt, idx++, old_quality);
    sqlite3_bind_int  (stmt, idx++, new_quality);

    if (!extra_json.empty()) {
        sqlite3_bind_text(stmt, idx++, extra_json.c_str(), -1, SQLITE_TRANSIENT);
    } else {
        sqlite3_bind_null(stmt, idx++);
    }

    rc = sqlite3_step(stmt);
    if (rc != SQLITE_DONE) {
        std::cerr << "[sqlite] insert step error: "
                  << sqlite3_errmsg(g_alarmDb) << "\n";
        sqlite3_finalize(stmt);
        return false;
    }

    sqlite3_finalize(stmt);
    return true;
}

// ================================================================
// Config bundle backup/restore
//   - GET  /config/bundle   -> JSON with all config files
//   - POST /config/bundle   -> apply bundle (overwrite files)
// ================================================================

// Enumerate "known" config files relative to configDir.
// We only include:
//   - connections/*.json
//   - tags/*.json
//   - alarms.json
//   - mqtt.json
//   - mqtt_inputs.json
//   - ca.crt
static std::vector<std::string> list_config_files_for_bundle(const std::string &configDir) {
    std::vector<std::string> relPaths;

    namespace fs = std::filesystem;

    // connections/*.json
    {
        fs::path d = fs::path(configDir) / "connections";
        if (fs::exists(d) && fs::is_directory(d)) {
            for (auto &entry : fs::directory_iterator(d)) {
                if (!entry.is_regular_file()) continue;
                auto p = entry.path();
                if (p.extension() == ".json") {
                    relPaths.push_back("connections/" + p.filename().string());
                }
            }
        }
    }

    // tags/*.json
    {
        fs::path d = fs::path(configDir) / "tags";
        if (fs::exists(d) && fs::is_directory(d)) {
            for (auto &entry : fs::directory_iterator(d)) {
                if (!entry.is_regular_file()) continue;
                auto p = entry.path();
                if (p.extension() == ".json") {
                    relPaths.push_back("tags/" + p.filename().string());
                }
            }
        }
    }

    // Single-file configs at root
    const char *rootFiles[] = {
        "alarms.json",
        "mqtt.json",
        "mqtt_inputs.json",
        "ca.crt"
    };
    for (auto *name : rootFiles) {
        fs::path p = fs::path(configDir) / name;
        if (fs::exists(p) && fs::is_regular_file(p)) {
            relPaths.push_back(name);
        }
    }

    std::sort(relPaths.begin(), relPaths.end());
    relPaths.erase(std::unique(relPaths.begin(), relPaths.end()), relPaths.end());
    return relPaths;
}

// Build a JSON bundle of all config files.
//   bundle["version"]          = 1
//   bundle["generated_ms_utc"] = <int64>
//   bundle["files"] = [ { "path": "...", "contents": "..." }, ... ]
static bool build_config_bundle_json(const std::string &configDir, json &bundleOut, std::string &err) {
    try {
        auto files = list_config_files_for_bundle(configDir);

        bundleOut = json::object();
        bundleOut["version"] = 1;

        auto now = std::chrono::system_clock::now();
        int64_t ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()
        ).count();
        bundleOut["generated_ms_utc"] = ms;

        json jfiles = json::array();

        for (const auto &rel : files) {
            std::string fullPath = joinPath(configDir, rel);
            try {
                std::string txt = read_file_to_string(fullPath);
                json jf;
                jf["path"]     = rel;
                jf["contents"] = txt;
                jfiles.push_back(jf);
            } catch (const std::exception &ex) {
                std::cerr << "[bundle] Failed to read '" << fullPath
                          << "': " << ex.what() << "\n";
                // We continue; missing file is not fatal, but we log it.
            }
        }

        bundleOut["files"] = jfiles;
        return true;
    } catch (const std::exception &ex) {
        err = ex.what();
        return false;
    }
}

// Apply (restore) a config bundle JSON.
// This overwrites the known config files listed in the bundle.
static bool apply_config_bundle_json(const std::string &configDir,
                                     const json &bundle,
                                     std::string &err)
{
    try {
        if (!bundle.is_object()) {
            err = "Bundle root must be a JSON object.";
            return false;
        }

        int version = bundle.value("version", 0);
        if (version != 1) {
            err = "Unsupported bundle version (expected 1).";
            return false;
        }

        if (!bundle.contains("files") || !bundle["files"].is_array()) {
            err = "Bundle is missing 'files' array.";
            return false;
        }

        namespace fs = std::filesystem;

        const auto &jfiles = bundle["files"];
        int applied = 0;

        for (const auto &jf : jfiles) {
            if (!jf.is_object()) continue;
            if (!jf.contains("path") || !jf.contains("contents")) continue;

            std::string relPath = jf["path"].get<std::string>();
            std::string contents= jf["contents"].get<std::string>();

            // Reject weird paths (no "..", no absolute paths)
            if (relPath.empty() || relPath[0] == '/' ||
                relPath.find("..") != std::string::npos) {
                std::cerr << "[bundle] Skipping unsafe path '" << relPath << "'\n";
                continue;
            }

            // Only allow known config kinds
            ConfigFileKind kind = classify_config_path(relPath);
            if (kind == ConfigFileKind::UNKNOWN) {
                std::cerr << "[bundle] Skipping unsupported config path '" << relPath << "'\n";
                continue;
            }

            fs::path dest = fs::path(configDir) / relPath;
            fs::create_directories(dest.parent_path());

            try {
                std::ofstream ofs(dest, std::ios::binary | std::ios::trunc);
                if (!ofs) {
                    std::cerr << "[bundle] Failed to open '" << dest.string()
                              << "' for writing.\n";
                    continue;
                }
                ofs.write(contents.data(), static_cast<std::streamsize>(contents.size()));
                ofs.close();
                ++applied;
            } catch (const std::exception &ex) {
                std::cerr << "[bundle] Exception writing '" << dest.string()
                          << "': " << ex.what() << "\n";
            }
        }

        if (applied == 0) {
            err = "No files from the bundle were applied.";
            return false;
        }

        std::cout << "[bundle] Applied " << applied << " config file(s) from bundle.\n";
        return true;
    } catch (const std::exception &ex) {
        err = ex.what();
        return false;
    }
}

// -----------------------------
// main()
// -----------------------------

int main(int argc, char **argv) {
    try {
        auto processStartTime = std::chrono::system_clock::now();

        bool writeMode    = false;
        bool dumpMode     = false;
        bool dumpJsonMode = false;
        bool httpMode     = false;
        bool opcuaMode    = false;
        bool versionMode  = false;
        bool mqttMode    = false;
		bool wsMode = false;

		uint16_t wsPort = 8090;

        uint16_t opcuaPort = 4840;

        std::string configDirOverride;

        std::string writeConnId;
        std::string writeTagName;
        std::string writeValue;

        // ----------------- CLI parse -----------------
        for (int i = 1; i < argc; ++i) {
            std::string arg = argv[i];

            if (arg == "--write") {
                if (i + 3 >= argc) {
                    std::cerr << "Error: --write requires 3 arguments: "
                              << "--write <conn_id> <logical_tag_name> <value>\n";
                    return 1;
                }
                writeMode   = true;
                writeConnId = argv[i + 1];
                writeTagName= argv[i + 2];
                writeValue  = argv[i + 3];
                i += 3;
            } else if (arg == "--dump-json") {
                dumpJsonMode = true;
            } else if (arg == "--dump") {
                dumpMode = true;
            } else if (arg == "--config" || arg == "--config-dir") {
                if (i + 1 >= argc) {
                    std::cerr << "Error: --config requires a directory path.\n";
                    return 1;
                }
                configDirOverride = argv[i + 1];
                i += 1;
            } else if (arg == "--mqtt") {
                mqttMode = true;
            } else if (arg == "--http") {
                httpMode = true;
            } else if (arg == "--opcua") {
                opcuaMode = true;
            } else if (arg == "--opcua-port") {
                if (i + 1 >= argc) {
                    std::cerr << "Error: --opcua-port requires a port number.\n";
                    return 1;
                }
                int port = std::stoi(argv[i+1]);
                if (port <= 0 || port > 65535) {
                    std::cerr << "Error: invalid OPC UA port.\n";
                    return 1;
                }
                opcuaPort = static_cast<uint16_t>(port);
                opcuaMode = true;
                i += 1;
            } else if (arg == "--version" || arg == "-V") {
                versionMode = true;
            } else if (arg == "--mqtt") {
                mqttMode = true;
			} else if (arg == "--ws") {
				wsMode = true;
			} else if (arg == "--ws-port") {
				if (i + 1 >= argc) {
					std::cerr << "Error: --ws-port requires a port number.\n";
					return 1;
				}
				wsPort = static_cast<uint16_t>(std::stoi(argv[++i]));
				wsMode = true;
			}
        }

        if (versionMode) {
            std::cout << "opcbridge version " << OPCBRIDGE_VERSION
                      << " (suite " << OPCBRIDGE_SUITE_VERSION << ")"
                      << " (" << __DATE__ << " " << __TIME__ << ")\n";
            return 0;
        }

        // Priority: write > dump-json > dump, then combinations of http/opcua/mqtt + poll
        if (writeMode) {
            dumpMode = dumpJsonMode = httpMode = opcuaMode = mqttMode = false;
        } else if (dumpJsonMode) {
            dumpMode = httpMode = opcuaMode = mqttMode = false;
        } else if (dumpMode) {
            httpMode = opcuaMode = mqttMode = false;
        }

        std::cout << "Mode: ";
        if (writeMode) {
            std::cout << "write\n";
        } else if (dumpJsonMode) {
            std::cout << "dump-json\n";
        } else if (dumpMode) {
            std::cout << "dump\n";
        } else {
            // poll is always active here
            std::cout << "poll";
            if (httpMode)  std::cout << " + http";
            if (opcuaMode) std::cout << " + opcua";
            if (mqttMode)  std::cout << " + mqtt";
            std::cout << "\n";
        }

        // ----------------- Config & drivers -----------------
        std::string configDir = configDirOverride.empty() ? findConfigDir() : configDirOverride;
        std::string connDir = joinPath(configDir, "connections");
        std::string tagDir  = joinPath(configDir, "tags");

	        std::string adminAuthPath = joinPath(configDir, "admin_auth.json");
	        load_admin_auth(adminAuthPath);
	        init_admin_service_token_from_env();
	        std::string passwordsPath = joinPath(configDir, "passwords.jsonc");
	        load_passwords_store(passwordsPath);

        std::cout << "Executable directory: " << getExecutableDir() << "\n";
        std::cout << "Using configDir:      " << configDir << "\n";
        std::cout << "Connections dir:      " << connDir << "\n";
        std::cout << "Tags dir:             " << tagDir << "\n";

		// After load_all_drivers(...)
		if (!sqlite_init(configDir)) {
			std::cerr << "[sqlite] Alarm DB init failed; continuing without DB.\n";
		}

        std::vector<DriverContext> drivers;
        if (!load_all_drivers(drivers, configDir)) {
            std::cerr << "Initial config load failed. Exiting.\n";
            return 1;
        }

        std::cout << "Driver summary:\n";
        for (const auto &d : drivers) {
            std::cout << "  Connection '" << d.conn.id
                      << "' has " << d.tags.size() << " tag(s).\n";
        }

        TagTable tagTable;

        // Load alarms
        if (!load_alarms(configDir, g_alarms)) {
            std::cerr << "Alarm config load failed. Continuing without alarms.\n";
            g_alarms.clear();
        }
        build_alarm_index(g_alarms);

		        // Mutexes shared between poll loop and REST handlers
		        // - `plcMutex` protects libplctag operations (shared for reads, exclusive for writes/handle lifecycle).
		        // - `driverMutex` protects in-memory state (drivers vector, tagTable, alarms, etc).
		        std::shared_mutex plcMutex;
		        std::mutex driverMutex;
		        httplib::Server svr;
        
	        // Make these available to MQTT callbacks
	        g_mqttDrivers     = &drivers;
	        g_mqttTagTable    = &tagTable;
	        g_mqttDriverMutex = &driverMutex;
	        g_plcMutex        = &plcMutex;
        bool writeTokenFromEnv = false;
        std::string writeToken;

        // NEW: load MQTT telemetry input mappings from config/mqtt_inputs.json
        if (!load_mqtt_inputs(configDir)) {
            std::cerr << "[mqtt-inputs] Failed to load MQTT telemetry inputs; "
                         "continuing without them.\n";
        }

        if (mqttMode) {
            std::cout << "[mqtt] Initialising MQTT...\n";
            if (!mqtt_init(configDir)) {
                std::cerr << "[mqtt] Initialization failed. Disabling MQTT mode.\n";
                mqttMode = false;
            }
        }

        if (opcuaMode) {
            std::cout << "OPC UA: initializing server on port " << opcuaPort << "...\n";
            if (!init_opcua_server(opcuaPort, drivers)) {
                std::cerr << "Failed to initialize OPC UA server.\n";
                destroy_all_handles(drivers);
                return 1;
            }
            std::cout << "OPC UA: server initialized.\n";
        }

        // ====================================================
        // MODE DISPATCH
        // write > dump-json > dump > opcua > http > poll
        // ====================================================

        // 1) WRITE MODE
        if (writeMode) {
            bool ok = write_tag_by_name(drivers, writeConnId, writeTagName, writeValue, tagTable, driverMutex);
            destroy_all_handles(drivers);
            return ok ? 0 : 1;
        }

        // 2) DUMP-JSON MODE
        if (dumpJsonMode) {
            bool ok = read_all_tags_once(drivers, tagTable);
            (void)ok;
            dump_tag_table_as_json(tagTable);
            destroy_all_handles(drivers);
            return ok ? 0 : 1;
        }

        // 3) DUMP MODE
        if (dumpMode) {
            bool ok = dump_tag_table_once(drivers, tagTable);
            destroy_all_handles(drivers);
            return ok ? 0 : 1;
        }

	        // 4) WEBSOCKETS MODE
			if (wsMode) {
				if (!ws_init(wsPort)) {
					std::cerr << "WS init failed. Continuing without WebSocket support.\n";
					wsMode = false;
				}
			}

        // 5) HTTP MODE (DASHBOARD + REST API)
        if (httpMode) {
            using namespace httplib;

            writeTokenFromEnv = false;
            writeToken = init_write_token(writeTokenFromEnv);

            // Dashboard HTML (unchanged)
            std::string dashboard_html = R"HTML(
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OPC Bridge Dashboard</title>
<style>
    body {
        font-family: sans-serif;
        background: #111;
        color: #eee;
        margin: 0;
        padding: 0;
    }
    header {
        background: #222;
        padding: 10px 20px;
        border-bottom: 1px solid #444;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    #admin-panel {
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    header h1 {
        margin: 0;
        font-size: 20px;
    }
    main {
        padding: 15px 20px 40px 20px;
        font-size: 12px;        /* smaller overall UI (header/title row stays unchanged) */
		flex-wrap: wrap;      /* Allows cards to flow onto next row */
		gap: 20px;            /* Space between items */
    }
    .flex {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin-bottom: 15px;
    }
	.card {
		background: #1b1b1b;
		border: 1px solid #333;
		border-radius: 6px;
		padding: 10px 12px;
		min-width: 260px;
		box-shadow: 0 2px 4px rgba(0,0,0,0.4);
		margin-bottom: 15px; /* vertical spacing between stacked cards */
	}
    .card h2 {
        margin: 0 0 8px 0;
        font-size: 14px;
        border-bottom: 1px solid #333;
        padding-bottom: 4px;
    }
	.card-narrow {
		max-width: 420px;      /* Prevents stretching */
		flex: 0 0 auto;        /* Card size stays based on content */
		margin-right: 20px;    /* Space between cards */
	}
	.card-full {
		flex: 1 0 100%;
		min-width: 100%;
		max-width: 100%;
		box-sizing: border-box;
	}
    .status-ok {
        color: #4caf50;
        font-weight: bold;
    }
    .status-degraded {
        color: #ff9800;
        font-weight: bold;
    }
    .status-error {
        color: #f44336;
        font-weight: bold;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
        font-size: 12px;
    }
    th, td {
        border-bottom: 1px solid #333;
        padding: 4px 6px;
        text-align: left;
        white-space: nowrap;
    }
    th {
        background: #222;
        position: sticky;
        top: 0;
        z-index: 1;
    }
    tbody tr:nth-child(even) {
        background: #151515;
    }
    tbody tr:nth-child(odd) {
        background: #101010;
    }
    .small {
        font-size: 10px;
        color: #aaa;
    }
    .tag-table-container {
        max-height: 60vh;
        overflow: auto;
        border: 1px solid #333;
        border-radius: 6px;
    }
    .btn-write,
    .btn-reload {
        padding: 2px 6px;
        font-size: 11px;
        border-radius: 4px;
        border: 1px solid #555;
        background: #333;
        color: #eee;
        cursor: pointer;
    }
    .btn-write:hover,
    .btn-reload:hover {
        background: #444;
    }
    .btn-reload {
        margin-top: 6px;
    }
    #write-status {
        margin-top: 6px;
        font-size: 11px;
    }
	.modal {
		position: fixed;
		left: 0; top: 0;
		width: 100%; height: 100%;
		background: rgba(0,0,0,0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
	}
	.modal-content {
		background: #222;
		color: #fff;
		padding: 20px;
		border-radius: 8px;
		min-width: 300px;
	}
	.field { margin: 10px 0; }
	.field input { width: 100%; padding: 6px; }
	.error { color: #f66; margin-top: 10px; }
	.modal-actions { margin-top: 15px; text-align: right; }
	.modal-actions button { margin-left: 10px; }
	.admin-password-toggle {
		margin: 0.5rem 0;
		font-size: 0.9rem;
	}

	.admin-password-toggle label {
		cursor: pointer;
		user-select: none;
	}
	/* Backdrop */
	.admin-modal-backdrop {
	  position: fixed;
	  inset: 0;
	  background: rgba(0, 0, 0, 0.45);
	  display: none; /* JS sets to flex in openAdminModal */
	  align-items: center;
	  justify-content: center;
	  z-index: 2000;
	}

	/* Card container */
	.admin-modal-card {
	  background: #1e1e24;           /* match dark dashboard card */
	  border-radius: 10px;
	  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.7);
	  padding: 1.5rem 1.8rem;
	  width: 100%;
	  max-width: 420px;
	  display: flex;
	  flex-direction: column;
	  gap: 1rem;
	}

	/* Header row */
	.admin-modal-header {
	  display: flex;
	  align-items: center;
	  gap: 0.75rem;
	}

	.admin-modal-icon {
	  width: 40px;
	  height: 40px;
	  border-radius: 999px;
	  display: flex;
	  align-items: center;
	  justify-content: center;
	  background: rgba(255, 255, 255, 0.06);
	  font-size: 1.25rem;
	}

	.admin-modal-title {
	  margin: 0;
	  font-size: 1.15rem;
	}

	.admin-modal-subtitle {
	  font-size: 0.85rem;
	  color: #b0b0c0;
	}

	/* Error text */
	.admin-modal-error {
	  min-height: 1.1em;
	  font-size: 0.85rem;
	  color: #ff7b7b;
	}

	/* Form body */
	.admin-modal-body {
	  display: flex;
	  flex-direction: column;
	  gap: 0.8rem;
	}

	.admin-field-row {
	  display: flex;
	  flex-direction: column;
	  gap: 0.25rem;
	}

	.admin-field-label {
	  font-size: 0.85rem;
	  color: #d0d0e0;
	}

	/* Input + eye button group */
	.admin-field-input-wrap {
	  display: flex;
	  align-items: center;
	  border-radius: 6px;
	  border: 1px solid #3a3a45;
	  background: #101018;
	  overflow: hidden;
	}

	.admin-input {
	  flex: 1;
	  border: none;
	  background: transparent;
	  color: #f5f5f5;
	  padding: 0.4rem 0.55rem;
	  font-size: 0.95rem;
	}

	.admin-input:focus {
	  outline: none;
	}

	/* Show/hide password button */
	.admin-icon-button {
	  border: none;
	  background: transparent;
	  cursor: pointer;
	  padding: 0.35rem 0.55rem;
	  font-size: 0.9rem;
	  color: #d0d0e0;
	}

	.admin-icon-button:hover {
	  background: rgba(255, 255, 255, 0.06);
	}

	/* Footer buttons */
	.admin-modal-footer {
	  display: flex;
	  justify-content: flex-end;
	  gap: 0.5rem;
	}

	/* If you already have .btn-primary / .btn-secondary, these can be skipped or tweaked */
	.btn-primary,
	.btn-secondary {
	  border-radius: 6px;
	  border: none;
	  padding: 0.4rem 0.85rem;
	  font-size: 0.9rem;
	  cursor: pointer;
	}

	.btn-primary {
	  background: #3b82f6;
	  color: #fff;
	}

	.btn-primary:hover {
	  background: #2563eb;
	}

	.btn-secondary {
	  background: #2b2b35;
	  color: #e0e0f0;
	}

	.btn-secondary:hover {
	  background: #3a3a45;
	}
		.admin-chip {
		  display: inline-block;
		  background: linear-gradient(135deg, #eab308, #facc15);
		  color: #000;
	  font-weight: bold;
	  padding: 3px 10px;
	  border-radius: 12px;
	  font-size: 0.75rem;
	  margin-left: 10px;
	  vertical-align: middle;
		  box-shadow: 0 0 6px rgba(0,0,0,0.4);
		}

		/* Tag editor (config/tags/*.json) */
		.tag-editor-toolbar {
		  display: flex;
		  flex-wrap: wrap;
		  gap: 8px;
		  align-items: center;
		  margin-bottom: 8px;
		}
		.tag-editor-wrap {
		  display: flex;
		  gap: 10px;
		  align-items: stretch;
		}
		.tag-editor-col {
		  flex: 1;
		  min-width: 260px;
		}
			.tag-editor-list {
			  border: 1px solid #333;
			  border-radius: 6px;
			  overflow: auto;
			  max-height: 45vh;
			  background: #101010;
			}
		.tag-editor-list table {
		  margin-top: 0;
		}
		.tag-editor-list tbody tr {
		  cursor: pointer;
		}
		.tag-editor-list tbody tr.selected {
		  outline: 1px solid #3b82f6;
		  background: rgba(59, 130, 246, 0.15);
		}
		.tag-editor-form label {
		  display: inline-block;
		  margin: 4px 10px 4px 0;
		  font-size: 11px;
		  color: #aaa;
		}
		.tag-editor-form input,
		.tag-editor-form select,
		.tag-editor-form textarea {
		  background: #0b0b0b;
		  color: #eee;
		  border: 1px solid #333;
		  border-radius: 4px;
		  padding: 4px 6px;
		  font-size: 12px;
		}
			.tag-editor-form textarea {
			  width: 100%;
			  min-height: 220px;
			  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
			}

					/* Workspace (SCADA-style, match opcbridge-scada layout) */
					.workspace-page {
					  width: 100%;
					  min-width: 520px;
					  margin-bottom: 0;
					  padding: 0;
					  background: transparent;
					  border: 0;
					  box-shadow: none;
					}
						.workspace-page h2 {
						  margin: 6px 0 10px 0;
						  font-size: 16px;
						  border-bottom: 0;
						  padding-bottom: 0;
						}
					.workspace-savebar {
					  display: flex;
					  align-items: center;
					  gap: 6px;
				  flex-wrap: wrap;
				  margin-bottom: 10px;
				}
				.workspace-savebar .btn-reload,
				.workspace-savebar .btn-write {
				  margin-top: 0;
				}
				.ws-workspace {
				  display: grid;
				  grid-template-columns: 320px 1fr;
				  grid-template-rows: 1fr 1fr;
				  gap: 12px;
				  height: min(72vh, 900px);
				  min-height: 560px;
				}
				.ws-sidebar {
				  grid-column: 1;
				  grid-row: 1;
				  min-height: 0;
				  border: 1px solid #333;
				  border-radius: 6px;
				  background: #0f0f0f;
				  overflow: hidden;
				  display: flex;
				  flex-direction: column;
				}
				.ws-sidebar-title {
				  padding: 8px 10px;
				  border-bottom: 1px solid #333;
				  background: #111;
				  color: #aaa;
				  font-size: 12px;
				}
				.ws-sidebar-note {
				  padding: 8px 10px;
				  border-top: 1px solid #333;
				  color: #aaa;
				  font-size: 11px;
				}
				.ws-tree {
				  user-select: none;
				  overflow: auto;
				  flex: 1 1 auto;
				  min-height: 0;
				  padding: 6px;
				  margin-top: 0;
				}
				.ws-editor {
				  min-height: 0;
				  border: 1px solid #333;
				  border-radius: 6px;
				  background: #0f0f0f;
				  overflow: hidden;
				  display: flex;
				  flex-direction: column;
				}
				.ws-editor-toolbar {
				  display: flex;
				  align-items: center;
				  justify-content: space-between;
				  gap: 10px;
				  padding: 8px 10px;
				  border-bottom: 1px solid #333;
				  background: #111;
				}
					.ws-editor-title {
					  font-size: 11px;
					  color: #aaa;
					  font-weight: bold;
					}
				.ws-editor-body {
				  flex: 1 1 auto;
				  min-height: 0;
				  padding: 8px;
				}
				.ws-workspace-right {
				  grid-column: 2;
				  grid-row: 1;
				}
				.ws-workspace-bottom {
				  grid-column: 1 / -1;
				  grid-row: 2;
				}
					.ws-workspace-bottom .ws-editor-body {
					  display: flex;
					  flex-direction: column;
					  gap: 6px;
					  overflow: hidden;
					}
					.ws-workspace-bottom #workspace-live-tags-host {
					  flex: 1 1 auto;
					  min-height: 0;
					  display: flex;
					  flex-direction: column;
					  overflow: hidden;
					}
					#live-tags-panel {
					  display: flex;
					  flex-direction: column;
					  min-height: 0;
					}
				#live-tags-panel .tag-table-container {
				  flex: 1 1 auto;
				  min-height: 0;
				}
					.ws-workspace-bottom .tag-table-container {
					  flex: 1 1 auto;
					  min-height: 0;
					  max-height: none;
					  overflow: auto;
					}
				.ws-table-wrap {
				  border: 1px solid #333;
				  border-radius: 6px;
				  overflow: auto;
				  height: 100%;
				}
				@media (max-width: 1100px) {
				  .ws-workspace {
				    grid-template-columns: 1fr;
				    grid-template-rows: auto auto auto;
				    height: auto;
				  }
				  .ws-sidebar,
				  .ws-workspace-right,
				  .ws-workspace-bottom {
				    grid-column: auto;
				    grid-row: auto;
				  }
				}
				.ws-tree-row {
				  display: flex;
				  align-items: center;
				  gap: 6px;
			  padding: 2px 4px;
			  cursor: pointer;
			  border-radius: 4px;
			}
			.ws-tree-row:hover {
			  background: rgba(255,255,255,0.06);
			}
			.ws-tree-row.is-selected {
			  background: rgba(59,130,246,0.20);
			  outline: 1px solid rgba(59,130,246,0.55);
			}
			.ws-expander {
			  width: 14px;
			  height: 14px;
			  display: inline-flex;
			  align-items: center;
			  justify-content: center;
			  border: 1px solid #444;
			  background: #111;
			  font-size: 11px;
			  line-height: 1;
			}
			.ws-expander.is-empty {
			  border-color: transparent;
			  background: transparent;
			}
			.ws-label {
			  font-size: 13px;
			  color: #eee;
			}
			.ws-indent {
			  width: 14px;
			  flex: 0 0 14px;
			}
				#ws-children-table tbody tr {
				  cursor: default;
				}
			#ws-children-table tbody tr:hover td {
			  background: rgba(255,255,255,0.05);
			}
				#ws-children-table tbody tr.is-selected td {
				  background: rgba(59,130,246,0.18);
				}
				#ws-children-table thead th.is-sortable {
				  cursor: pointer;
				  user-select: none;
				}
				#ws-children-table thead th.is-sortable:hover {
				  text-decoration: underline;
				}
				.ws-context-menu {
				  position: fixed;
				  z-index: 3000;
				  min-width: 180px;
			  background: #151515;
			  border: 1px solid #333;
			  border-radius: 6px;
			  box-shadow: 0 10px 22px rgba(0,0,0,0.55);
			  padding: 4px;
			}
			.ws-menu-item {
			  padding: 6px 8px;
			  border-radius: 4px;
			  cursor: pointer;
			  font-size: 12px;
			  color: #eee;
			}
			.ws-menu-item:hover {
			  background: rgba(255,255,255,0.07);
			}
			.ws-modal {
			  position: fixed;
			  inset: 0;
			  background: rgba(0,0,0,0.55);
			  z-index: 2500;
			  display: flex;
			  align-items: center;
			  justify-content: center;
			}
				.ws-modal-card {
				  width: 100%;
				  max-width: 720px;
				  background: #1b1b1b;
				  border: 1px solid #333;
				  border-radius: 10px;
				  box-shadow: 0 10px 24px rgba(0,0,0,0.65);
				  padding: 12px;
				  user-select: text;
				  -webkit-user-select: text;
				}
				.ws-modal-title {
				  font-size: 14px;
				  font-weight: bold;
				  margin-bottom: 10px;
				  border-bottom: 1px solid #333;
				  padding-bottom: 6px;
				  user-select: text;
				  -webkit-user-select: text;
				}
					.ws-form {
					  display: grid;
					  grid-template-columns: 1fr;
					  gap: 10px;
					}
					.ws-form label {
					  display: flex;
					  flex-direction: column;
					  gap: 4px;
					  font-size: 11px;
					  color: #aaa;
					  user-select: text;
					  -webkit-user-select: text;
					}
					.ws-form label.ws-inline {
					  flex-direction: row;
					  align-items: center;
					  gap: 8px;
					}
					.ws-inline-row {
					  display: flex;
					  align-items: center;
					  gap: 14px;
					  flex-wrap: wrap;
					}
					.ws-inline-row .ws-inline {
					  margin: 0;
					}
					.ws-form-two {
					  display: grid;
					  grid-template-columns: 1fr 1fr;
					  gap: 10px;
					}
				@media (max-width: 720px) {
				  .ws-form-two {
				    grid-template-columns: 1fr;
				  }
				}
				.ws-form input,
				.ws-form select {
				  background: #0b0b0b;
				  color: #eee;
				  border: 1px solid #333;
				  border-radius: 4px;
				  padding: 6px 8px;
				  font-size: 12px;
				  user-select: text;
				  -webkit-user-select: text;
				}
				.ws-modal-actions {
				  display: flex;
				  justify-content: flex-end;
				  gap: 6px;
				  margin-top: 10px;
				}
				.ws-modal-actions button {
				  min-width: 120px;
				  margin-top: 0;
				  padding: 6px 12px;
				  line-height: 1;
				  height: 30px;
				}
	</style>
</head>
<body>
	<header>
	    <h1>OPC Bridge Dashboard</h1>
		<div id="admin-chip" class="admin-chip" style="display:none;">
			👑 ADMIN
		</div>
			<div style="display:flex; gap:6px; margin-left:10px;">
				<a class="btn-reload" href="/dashboard">Dashboard</a>
					<a class="btn-reload" href="/workspace">Workspace</a>
			</div>
	    <div id="admin-panel">
	        <span id="admin-status-text">Checking admin status...</span>
	        <button id="admin-login-button" class="btn-reload" onclick="showAdminLogin()">Admin login</button>
	        <button id="admin-logout-button" class="btn-reload" style="display:none" onclick="adminLogout()">Logout</button>
	    </div>
	</header>
	<main>
	    <div id="dashboard-section" class="flex">
	        <div class="card">
	            <h2>Health</h2>
	            <div id="health-overall">Loading...</div>
	            <div id="health-connections" class="small"></div>
	        </div>
		<div class="card">
			<h2>Info</h2>
			<div id="info-name-version">Loading...</div>
			<div id="info-build" class="small"></div>
			<div id="info-uptime" class="small"></div>
			<div id="info-connections" class="small"></div>
			<div id="info-tags" class="small"></div>
			<div id="info-write-auth" class="small"></div>

			<!-- MQTT / TLS / CA cert status -->
			<div id="info-mqtt-tls" class="small"></div>

			<!-- NEW: CA certificate upload/download controls -->
			<div id="mqtt-ca-panel" class="small" style="margin-top:6px;">
				<div id="mqtt-ca-status" class="small"></div>
				<input type="file" id="mqtt-ca-file"
					   accept=".crt,.pem"
					   style="margin-top:4px; font-size:11px;">
				<div style="margin-top:4px;">
					<button class="btn-reload" id="mqtt-ca-upload-btn"
							onclick="uploadCaCert()">Upload CA cert</button>
					<button class="btn-reload"
							onclick="downloadCaCert()">Download current</button>
				</div>
			</div>

				<button id="reload-button" class="btn-reload" onclick="reloadConfig()">Reload config</button>
				<div id="reload-status" class="small"></div>
				<div id="reload-last" class="small"></div>
			</div>
        <div class="card">
            <h2>Connections</h2>
            <div id="conn-summary-meta" class="small"></div>
            <div id="conn-summary-body" class="small"></div>
        </div>
		<div class="card card-narrow">
			<h2>Config Backup / Restore</h2>
			<div class="small">
				<p>You can back up all configuration files (connections, tags, alarms,
				MQTT, mqtt_inputs, CA certificate) into one JSON bundle, and later
				restore it on this or another system.</p>
			</div>

			<div class="small" id="bundle-status"></div>

			<button class="btn-reload" onclick="downloadConfigBundle()">
				Download Bundle
			</button>

			<div style="margin-top:8px;">
				<input type="file" id="bundle-file" style="display:none"
					   accept="application/json,.json">
				<button class="btn-reload" onclick="document.getElementById('bundle-file').click();">
					Choose Bundle File…
				</button>
				<button class="btn-reload" onclick="uploadConfigBundle()">
					Upload & Apply Bundle
				</button>
				<div class="small" id="bundle-file-name"></div>
			</div>
			</div>

				<div class="card card-full">
					<h2>Config Files</h2>
					<div id="config-meta" class="small">Loading...</div>
					<div class="tag-table-container">
						<table id="config-table">
						<thead>
							<tr>
								<th>Path</th>
								<th>Kind</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody id="config-tbody">
						</tbody>
					</table>
				</div>
				<div class="small" style="margin-top:8px;">
					<div>Upload new config file:</div>
					<label>
						Kind:
						<select id="config-new-kind">
							<option value="connection">connection (connections/*.json)</option>
							<option value="tags">tags (tags/*.json)</option>
							<option value="mqtt">mqtt (mqtt.json)</option>
							<option value="mqtt_inputs">mqtt inputs (mqtt_inputs.json)</option>
							<option value="alarms">alarms (alarms.json)</option>
						</select>
					</label>
					<label style="margin-left:8px;">
						Filename:
						<input type="text"
							   id="config-new-name"
							   placeholder="(no file selected)"
							   style="width:180px;"
							   readonly />
					</label>
					<button class="btn-write" style="margin-left:8px;"
							onclick="chooseNewConfigFile()">
						Find File
					</button>
					<button class="btn-write" style="margin-left:4px;"
							onclick="uploadNewConfigFile()">
						Upload
					</button>
				</div>

				<!-- Hidden file input just for "new" configs -->
				<input type="file" id="config-new-file-input" style="display:none" />

				<!-- Existing hidden input for editing existing files -->
				<input type="file" id="config-upload-input" style="display:none" />

				<div id="config-status" class="small"></div>

				<!-- Simple modal for viewing raw config text -->
				<div id="config-viewer"
					 style="display:none; position:fixed; left:10%; top:10%; width:80%; height:80%;
							background:#111; border:1px solid #444; z-index:1000;
							box-shadow:0 4px 10px rgba(0,0,0,0.8); padding:8px;">
					<div class="small" style="margin-bottom:6px; overflow:auto;">
						<span id="config-viewer-title"></span>
						<button class="btn-write" style="float:right;"
								onclick="closeConfigViewer()">Close</button>
					</div>
					<pre id="config-viewer-body"
						 style="white-space:pre; overflow:auto; max-height:90%;
								background:#000; border:1px solid #333; padding:8px;"></pre>
					</div>
				</div>

				<div class="card card-full">
					<h2>Tags</h2>
					<div id="dashboard-live-tags-host">
						<div id="live-tags-panel">
							<div class="small" id="tags-meta">Loading...</div>
						<div class="tag-table-container">
							<table id="tags-table">
								<thead>
									<tr>
										<th>Connection</th>
										<th>Name</th>
										<th>Datatype</th>
										<th>Quality</th>
										<th>Value</th>
										<th>Writable</th>
										<th>Action</th>
										<th>Timestamp</th>
									</tr>
								</thead>
								<tbody id="tags-tbody">
								</tbody>
							</table>
						</div>
						<div id="write-status" class="small"></div>
						</div>
					</div>
				</div>

				<div class="card card-full">
					<h2>Alarms / Events</h2>
					<div id="alarms-meta" class="small">Loading...</div>
					<div id="alarms-body" class="small"></div>
				</div>
		    </div>
						<div id="editors-section" style="display:none;">
							<div class="workspace-page">
								<h2>Workspace</h2>
								<div class="workspace-savebar">
									<button class="btn-reload" id="ws-save-btn">Save</button>
									<button class="btn-reload" id="ws-save-reload-btn">Save + Reload</button>
									<button class="btn-write" id="ws-discard-btn">Discard</button>
								<div class="small" id="ws-save-status" style="margin-left:10px;"></div>
							</div>

							<div class="ws-workspace">
								<aside class="ws-sidebar">
									<div class="ws-sidebar-title">Project</div>
									<div class="ws-tree" id="ws-tree"></div>
									<div class="ws-sidebar-note" id="ws-tree-status">Loading…</div>
								</aside>

								<section class="ws-editor ws-workspace-right">
									<div class="ws-editor-toolbar">
										<div class="ws-editor-title">Properties</div>
									</div>
									<div class="ws-editor-body">
										<div class="ws-table-wrap">
											<table id="ws-children-table">
												<thead id="ws-children-thead"></thead>
												<tbody id="ws-children-tbody"></tbody>
											</table>
										</div>
									</div>
								</section>

										<section class="ws-editor ws-workspace-bottom">
											<div class="ws-editor-toolbar">
												<div class="ws-editor-title">Tags</div>
											</div>
											<div class="ws-editor-body">
												<div id="workspace-live-tags-host"></div>
											</div>
										</section>
							</div>
						</div>

					<!-- Context menu -->
					<div id="ws-context-menu" class="ws-context-menu" style="display:none;"></div>

					<!-- Device properties modal -->
					<div id="ws-device-modal" class="ws-modal" style="display:none;">
						<div class="ws-modal-card">
							<div class="ws-modal-title" id="ws-device-title">Device</div>
							<div class="ws-form">
								<label>Device ID <input id="ws-device-id" type="text" /></label>
								<label>Description <input id="ws-device-desc" type="text" /></label>
								<label>Driver <select id="ws-device-driver"></select></label>
								<label>PLC Type <select id="ws-device-plc-type"></select></label>
								<label>Gateway <input id="ws-device-gateway" type="text" /></label>
								<label>Path <input id="ws-device-path" type="text" placeholder="1,0" /></label>
								<label>Slot <input id="ws-device-slot" type="number" min="0" step="1" /></label>
								<label>Default timeout (ms) <input id="ws-device-timeout" type="number" min="0" step="1" /></label>
								<label>Default read (ms) <input id="ws-device-read" type="number" min="0" step="1" /></label>
								<label>Default write (ms) <input id="ws-device-write" type="number" min="0" step="1" /></label>
								<label>Debug <input id="ws-device-debug" type="number" min="0" step="1" /></label>
							</div>
							<div class="small" id="ws-device-status"></div>
							<div class="ws-modal-actions">
								<button class="btn-write" id="ws-device-cancel-btn">Cancel</button>
								<button class="btn-reload" id="ws-device-save-btn">Save</button>
							</div>
						</div>
					</div>

							<!-- Tag properties modal -->
							<div id="ws-tag-modal" class="ws-modal" style="display:none;">
								<div class="ws-modal-card">
									<div class="ws-modal-title" id="ws-tag-title">Tag</div>
									<div class="ws-form">
										<label>Device <select id="ws-tag-conn"></select></label>
										<label>Name <input id="ws-tag-name" type="text" /></label>
										<label>PLC Tag <input id="ws-tag-plc" type="text" /></label>
										<label>Datatype <select id="ws-tag-dt"></select></label>
										<label>Scan (ms) <input id="ws-tag-scan" type="number" min="0" step="1" /></label>
										<div class="ws-inline-row">
											<label class="ws-inline"><input id="ws-tag-enabled" type="checkbox" /> Enabled</label>
											<label class="ws-inline"><input id="ws-tag-writable" type="checkbox" /> Writable</label>
											<label class="ws-inline"><input id="ws-tag-mqtt-allowed" type="checkbox" /> MQTT Command Allowed</label>
										</div>
									</div>
									<div class="small" id="ws-tag-status"></div>
									<div class="ws-modal-actions">
										<button class="btn-write" id="ws-tag-cancel-btn">Cancel</button>
									<button class="btn-reload" id="ws-tag-save-btn">Save</button>
								</div>
							</div>
						</div>

						<!-- Alarm properties modal -->
						<div id="ws-alarm-modal" class="ws-modal" style="display:none;">
							<div class="ws-modal-card">
								<div class="ws-modal-title" id="ws-alarm-title">Alarm</div>
								<div class="ws-form">
									<label>Alarm ID <input id="ws-alarm-id" type="text" /></label>
									<label>Name <input id="ws-alarm-name" type="text" /></label>
									<label>Group <input id="ws-alarm-group" type="text" /></label>
									<label>Site <input id="ws-alarm-site" type="text" /></label>
									<label>Connection <select id="ws-alarm-conn"></select></label>
									<label>Tag <select id="ws-alarm-tag"></select></label>
									<label>Type <select id="ws-alarm-type"></select></label>
									<label class="ws-inline"><input id="ws-alarm-enabled" type="checkbox" /> Enabled</label>
									<div class="ws-form-two">
										<label>Severity (0-1000) <input id="ws-alarm-severity" type="number" min="0" max="1000" step="1" value="500" /></label>
										<label>Threshold <input id="ws-alarm-threshold" type="number" step="any" /></label>
										<label>Hysteresis <input id="ws-alarm-hysteresis" type="number" step="any" /></label>
										<label>Message on active <input id="ws-alarm-msg-on" type="text" /></label>
										<label>Message on return <input id="ws-alarm-msg-off" type="text" /></label>
									</div>
								</div>
								<div class="small" id="ws-alarm-status"></div>
								<div class="ws-modal-actions">
									<button class="btn-write" id="ws-alarm-cancel-btn">Cancel</button>
									<button class="btn-reload" id="ws-alarm-save-btn">Save</button>
								</div>
							</div>
						</div>
					</div>
			<!-- Admin login / setup modal -->
		<div id="admin-modal" class="admin-modal-backdrop" style="display:none;">
		  <div class="admin-modal-card">
		<div class="admin-modal-header">
		  <div class="admin-modal-icon">🔐</div>
		  <div>
			<h2 id="admin-modal-title" class="admin-modal-title">Admin Login</h2>
				<div id="admin-modal-subtitle" class="admin-modal-subtitle">
				  Initialize creates the first user (admin role). Login grants elevated access for config changes and writes.
				</div>
		  </div>
		</div>

		<div id="admin-modal-error" class="admin-modal-error"></div>

		<div class="admin-modal-body">
			  <div class="admin-field-row">
				<label for="admin-username" class="admin-field-label">Username</label>
				<input id="admin-username"
					   type="text"
					   autocomplete="username"
					   placeholder="e.g. steve"
					   class="admin-input" />
			  </div>
			  <div class="admin-field-row">
				<label for="admin-password" class="admin-field-label">Password</label>
				<div class="admin-field-input-wrap">
				  <input id="admin-password"
						 type="password"
						 autocomplete="current-password"
						 class="admin-input" />
				  <button type="button"
						  id="admin-toggle-password"
						  class="admin-icon-button"
						  title="Show / hide password">
					👁
				  </button>
				</div>
			  </div>
	
			  <div id="admin-legacy-container" class="admin-field-row" style="display:none;">
				<label for="admin-legacy-password" class="admin-field-label">
				  Current password (legacy)
				</label>
				<div class="admin-field-input-wrap">
				  <input id="admin-legacy-password"
						 type="password"
						 autocomplete="current-password"
						 class="admin-input" />
				</div>
				<div class="small" style="margin-top:4px; color:#aaa;">
				  Legacy `admin_auth.json` detected. Enter the current password to migrate to the unified user store.
				</div>
			  </div>

			  <div id="admin-confirm-container" class="admin-field-row" style="display:none;">
				<label for="admin-password-confirm" class="admin-field-label">
				  Confirm password
				</label>
				<div class="admin-field-input-wrap">
				  <input id="admin-password-confirm"
						 type="password"
						 autocomplete="new-password"
						 class="admin-input" />
				</div>
			  </div>
		</div>

		<div class="admin-modal-footer">
		  <button id="admin-modal-cancel"
				  type="button"
				  class="btn-secondary"
				  onclick="closeAdminModal()">
			Cancel
		  </button>
		  <button id="admin-modal-ok"
				  type="button"
				  class="btn-primary"
				  onclick="submitAdminModal()">
			Continue
		  </button>
		</div>
	  </div>
	</div>
</main>
<script>
// Use a placeholder here – we’ll replace it from C++
const WRITE_TOKEN = "WRITE_TOKEN_PLACEHOLDER";

	let ADMIN_TOKEN = null;
	let ADMIN_CONFIGURED = false;
	let ADMIN_LOGGED_IN = false;
	let USER_LOGGED_IN = false;
	let USERNAME = "";
	let USER_ROLE = "viewer";
	let LEGACY_AUTH_PRESENT = false;
	let LEGACY_AUTH_CONFIGURED = false;

function normalizeUserRole(role) {
    const r = String(role || "").trim().toLowerCase();
    if (r === "admin" || r === "editor" || r === "operator" || r === "viewer") return r;
    return "viewer";
}

function canEditWorkspace() {
    return !!(USER_LOGGED_IN && (USER_ROLE === "admin" || USER_ROLE === "editor"));
}

function canWriteTags() {
    return !!(USER_LOGGED_IN && (USER_ROLE === "admin" || USER_ROLE === "editor" || USER_ROLE === "operator"));
}

// --- WebSocket (optional, for high-scale tag updates) ---
let WS_ENABLED = false;
let WS_CONNECTED = false;
let WS_PORT = 8090;
let g_ws = null;
let g_wsReconnectTimer = null;

// Tag table indexing for incremental updates
let g_tagCellsByKey = new Map(); // key: "conn:name" -> { qualEl, valueEl, tsEl }
let g_tagsFetchInFlight = false;
let g_tagsMissingRefreshTimer = null;

// Tag editor state (config/tags/*.json)
let TAG_EDITOR_OPEN = false;
let g_tagEditorLoaded = false;
let g_tagEditorFiles = [];        // from /config/tagfiles
let g_tagEditorFileIndex = -1;    // index into g_tagEditorFiles
let g_tagEditorTagIndex = -1;     // index into current file's content.tags

// Connection editor state (config/connections/*.json)
let CONN_EDITOR_OPEN = false;
let g_connEditorLoaded = false;
let g_connEditorPaths = [];       // "connections/*.json"

// --- NEW: persistent admin token (per browser session) ---
const ADMIN_TOKEN_KEY = "opcbridge_admin_token_v1";

function restoreAdminTokenFromStorage() {
    try {
        const stored = window.localStorage.getItem(ADMIN_TOKEN_KEY);
        if (stored && typeof stored === "string") {
            ADMIN_TOKEN = stored;
        }
    } catch (e) {
        console.warn("Failed to restore admin token from storage:", e);
    }
}

function persistAdminToken() {
    try {
        if (ADMIN_TOKEN) {
            window.localStorage.setItem(ADMIN_TOKEN_KEY, ADMIN_TOKEN);
        } else {
            window.localStorage.removeItem(ADMIN_TOKEN_KEY);
        }
    } catch (e) {
        console.warn("Failed to persist admin token:", e);
    }
}

	let adminModalMode = "login";
	// "login" or "init"

	function openAdminModal(mode) {
	    adminModalMode = mode;  // <– keep this, submit logic needs it

	    const modal = document.getElementById("admin-modal");
	    const title = document.getElementById("admin-modal-title");
	    const err   = document.getElementById("admin-modal-error");
	    const user  = document.getElementById("admin-username");
	    const pw    = document.getElementById("admin-password");
	    const legacyContainer = document.getElementById("admin-legacy-container");
	    const legacyPw = document.getElementById("admin-legacy-password");
	    const conf  = document.getElementById("admin-confirm-container");
	    const pw2   = document.getElementById("admin-password-confirm");
	    const toggleBtn = document.getElementById("admin-toggle-password");

    if (!modal || !title || !err || !user || !pw || !conf || !pw2) {
        console.error("Admin modal elements missing");
        return;
    }

	    // Clear previous state
	    err.textContent = "";
	    user.value = user.value || "";
	    pw.value = "";
	    if (legacyPw) legacyPw.value = "";
	    pw2.value = "";

	    if (mode === "init") {
	        title.textContent = "Initialize Users";
	        conf.style.display = "";
	        if (legacyContainer) {
	            legacyContainer.style.display = LEGACY_AUTH_PRESENT ? "" : "none";
	        }
	    } else {
	        title.textContent = "Admin Login";
	        conf.style.display = "none";
	        if (legacyContainer) legacyContainer.style.display = "none";
	    }

	    // Reset show-password state
	    pw.type  = "password";
	    if (legacyPw) legacyPw.type = "password";
	    pw2.type = "password";
	    if (toggleBtn) toggleBtn.textContent = "👁";

    modal.style.display = "flex";
    (user.value ? pw : user).focus();
}

	function closeAdminModal() {
	    document.getElementById("admin-modal").style.display = "none";
	}

	async function submitAdminModal() {
	    const userEl  = document.getElementById("admin-username");
	    const pwEl    = document.getElementById("admin-password");
	    const legacyPwEl = document.getElementById("admin-legacy-password");
	    const pw2El   = document.getElementById("admin-password-confirm");
	    const errEl   = document.getElementById("admin-modal-error");
	    const modalEl = document.getElementById("admin-modal");

    if (!userEl || !pwEl || !errEl || !modalEl) {
        console.error("Admin modal elements missing");
        return;
    }

	    const username = String(userEl.value || "").trim();
	    const pw  = pwEl.value;
	    const pw2 = pw2El ? pw2El.value : "";
	    const legacyPw = legacyPwEl ? legacyPwEl.value : "";

    errEl.textContent = "";

    if (!pw) {
        errEl.textContent = "Password cannot be empty.";
        return;
    }

	    try {
	        if (adminModalMode === "init") {
	            // First-time init (creates the centralized user store: config/passwords.jsonc)
	            if (!username) {
	                errEl.textContent = "Username cannot be empty.";
	                return;
	            }
	            if (!pw2) {
	                errEl.textContent = "Please confirm the password.";
	                return;
	            }
	            if (pw !== pw2) {
	                errEl.textContent = "Passwords do not match.";
	                return;
	            }
	            if (LEGACY_AUTH_PRESENT && !legacyPw) {
	                errEl.textContent = "Legacy password is required to migrate.";
	                return;
	            }

	            const resp = await fetch("/auth/init", {
	                method: "POST",
	                headers: { "Content-Type": "application/json" },
	                body: JSON.stringify({
	                    username,
	                    password: pw,
	                    confirm: pw2,
	                    legacy_password: LEGACY_AUTH_PRESENT ? legacyPw : "",
	                    timeoutMinutes: 0
	                })
	            });
	            const data = await resp.json();

            if (!data.ok) {
                errEl.textContent = data.error || "Admin setup failed.";
                return;
            }

            // Auto-login after init so the user can continue without re-entering creds.
            try {
                const loginResp = await fetch("/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password: pw })
                });
                const loginData = await loginResp.json();
                if (loginData && loginData.ok && loginData.admin_token) {
                    ADMIN_TOKEN = loginData.admin_token;
                    persistAdminToken();
                }
            } catch (_) {
                // ignore
            }

            modalEl.style.display = "none";
            await refreshAdminStatus();
            updateAdminUi();
        } else {
            // Normal login
            const resp = await fetch("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(username ? { username, password: pw } : { password: pw })
            });
            const data = await resp.json();

            if (!data.ok) {
                errEl.textContent = data.error || "Admin login failed.";
                return;
            }

            if (data.admin_token) {
                ADMIN_TOKEN = data.admin_token;
                persistAdminToken();
            }

            modalEl.style.display = "none";

	            // Refresh status from server & update UI
	            await refreshAdminStatus();
	            updateAdminUi();
	            if (isEditorPage()) {
	                wsInit();
	            }
	        }
	    } catch (e) {
	        console.error("Admin modal submit error:", e);
	        errEl.textContent = "Error: " + e.toString();
    }
}
	let g_adminPwVisible = false;
	function toggleAdminPasswordVisibility() {
	    g_adminPwVisible = !g_adminPwVisible;
	    const pw  = document.getElementById("admin-password");
	    const legacy = document.getElementById("admin-legacy-password");
	    const pw2 = document.getElementById("admin-password-confirm");
	    const btn = document.getElementById("admin-toggle-password");
	    const t = g_adminPwVisible ? "text" : "password";
	    if (pw) pw.type = t;
	    if (legacy) legacy.type = t;
	    if (pw2) pw2.type = t;
	    if (btn) btn.textContent = g_adminPwVisible ? "🙈" : "👁";
	}

function setupAdminModalKeys() {
    const modal = document.getElementById("admin-modal");
    if (!modal) return;

    // Avoid attaching multiple times
    if (modal.dataset.keysAttached === "1") return;
    modal.dataset.keysAttached = "1";

    const btn = document.getElementById("admin-toggle-password");
    if (btn) btn.addEventListener("click", toggleAdminPasswordVisibility);

    modal.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            submitAdminModal();
        } else if (e.key === "Escape") {
            e.preventDefault();
            closeAdminModal();
        }
    });
}

// --- Config file editor state ---
let g_configUploadPath = null;

let g_newConfigFile = null; // holds File object for the "Upload new" flow

function withAdminHeaders(baseHeaders = {}) {
    const h = Object.assign({}, baseHeaders);
    if (ADMIN_TOKEN) {
        h["X-Admin-Token"] = ADMIN_TOKEN;
    }
    return h;
}

// ---------------------------
// Workspace (SCADA-style, using opcbridge endpoints)
// ---------------------------
const WS_DRIVER_LABELS = {
    ab_eip: "Allen-Bradley Ethernet/IP"
};

const WS_PLC_TYPE_LABELS = {
    lgx: "Allen-Bradley Logix (ControlLogix / CompactLogix)",
    mlgx: "Allen-Bradley MicroLogix",
    micro800: "Allen-Bradley Micro800 (Micro8xx)",
    slc: "Allen-Bradley SLC 500",
    plc5: "Allen-Bradley PLC-5",
    "lgx-pccc": "Logix (PCCC gateway mode)",
    "omron-njnx": "OMRON NJ/NX"
};

const WS_TAG_DATATYPES = ["bool", "int16", "uint16", "int32", "uint32", "float32", "float64"];

const wsLabelForDriver = (code) => {
    const k = String(code || "").trim();
    return WS_DRIVER_LABELS[k] || k;
};

const wsLabelForPlcType = (code) => {
    const k = String(code || "").trim();
    return WS_PLC_TYPE_LABELS[k] || k;
};

	const wsStripJsonComments = (raw) => {
	    // Minimal JSONC support for configs; handles // and /* */ comments and trailing commas.
	    const s = String(raw || "");
	    const noBlock = s.replace(/\/\*[\s\S]*?\*\//g, "");
	    const noLine = noBlock.replace(/(^|[^:])\/\/.*$/gm, "$1");
	
	    // Strip trailing commas outside of strings.
	    let out = "";
	    let inString = false;
	    let escaped = false;
	    for (let i = 0; i < noLine.length; i++) {
	        const c = noLine[i];
	        if (inString) {
	            out += c;
	            if (escaped) {
	                escaped = false;
	            } else if (c === "\\") {
	                escaped = true;
	            } else if (c === "\"") {
	                inString = false;
	            }
	            continue;
	        }
	
	        if (c === "\"") {
	            inString = true;
	            out += c;
	            continue;
	        }
	
	        if (c === ",") {
	            let j = i + 1;
	            while (j < noLine.length && /\s/.test(noLine[j])) j++;
	            const next = noLine[j];
	            if (next === "}" || next === "]") {
	                continue; // drop trailing comma
	            }
	        }
	
	        out += c;
	    }
	
	    return out;
	};

const wsDeepClone = (obj) => JSON.parse(JSON.stringify(obj || null));

	let wsLoadedOnce = false;
		let wsBase = { connections: [], tags: [], alarms: [] };
		let wsDraft = { connections: [], tags: [], alarms: [] };
	let wsDirty = false;
	let wsSelectedId = "ws:root";
	let wsChildrenSelRoot = "";
	let wsChildrenSel = new Set(); // keys like "connection_id::tag_name"
	let wsChildrenLastIndex = -1;
	let wsChildrenSort = { key: "name", dir: "asc" };
	let wsExpanded = new Set(["ws:root", "ws:connectivity"]);
	let wsPendingDeletes = []; // { path: "connections/x.json" }
	let wsNodeById = new Map();

	const wsEls = () => ({
    treeStatus: document.getElementById("ws-tree-status"),
    tree: document.getElementById("ws-tree"),
    thead: document.getElementById("ws-children-thead"),
    tbody: document.getElementById("ws-children-tbody"),
    saveBtn: document.getElementById("ws-save-btn"),
    saveReloadBtn: document.getElementById("ws-save-reload-btn"),
    discardBtn: document.getElementById("ws-discard-btn"),
    saveStatus: document.getElementById("ws-save-status"),
    contextMenu: document.getElementById("ws-context-menu"),

    deviceModal: document.getElementById("ws-device-modal"),
    deviceTitle: document.getElementById("ws-device-title"),
    deviceId: document.getElementById("ws-device-id"),
    deviceDesc: document.getElementById("ws-device-desc"),
    deviceDriver: document.getElementById("ws-device-driver"),
    devicePlcType: document.getElementById("ws-device-plc-type"),
    deviceGateway: document.getElementById("ws-device-gateway"),
    devicePath: document.getElementById("ws-device-path"),
    deviceSlot: document.getElementById("ws-device-slot"),
    deviceTimeout: document.getElementById("ws-device-timeout"),
    deviceRead: document.getElementById("ws-device-read"),
    deviceWrite: document.getElementById("ws-device-write"),
    deviceDebug: document.getElementById("ws-device-debug"),
    deviceStatus: document.getElementById("ws-device-status"),
    deviceCancelBtn: document.getElementById("ws-device-cancel-btn"),
    deviceSaveBtn: document.getElementById("ws-device-save-btn"),

    tagModal: document.getElementById("ws-tag-modal"),
    tagTitle: document.getElementById("ws-tag-title"),
	    tagConn: document.getElementById("ws-tag-conn"),
	    tagName: document.getElementById("ws-tag-name"),
	    tagPlc: document.getElementById("ws-tag-plc"),
	    tagDt: document.getElementById("ws-tag-dt"),
	    tagScan: document.getElementById("ws-tag-scan"),
	    tagEnabled: document.getElementById("ws-tag-enabled"),
	    tagWritable: document.getElementById("ws-tag-writable"),
	    tagMqttAllowed: document.getElementById("ws-tag-mqtt-allowed"),
		    tagStatus: document.getElementById("ws-tag-status"),
		    tagCancelBtn: document.getElementById("ws-tag-cancel-btn"),
		    tagSaveBtn: document.getElementById("ws-tag-save-btn"),

	    alarmModal: document.getElementById("ws-alarm-modal"),
	    alarmTitle: document.getElementById("ws-alarm-title"),
	    alarmId: document.getElementById("ws-alarm-id"),
	    alarmName: document.getElementById("ws-alarm-name"),
	    alarmGroup: document.getElementById("ws-alarm-group"),
	    alarmSite: document.getElementById("ws-alarm-site"),
	    alarmType: document.getElementById("ws-alarm-type"),
	    alarmConn: document.getElementById("ws-alarm-conn"),
	    alarmTag: document.getElementById("ws-alarm-tag"),
	    alarmEnabled: document.getElementById("ws-alarm-enabled"),
	    alarmSeverity: document.getElementById("ws-alarm-severity"),
	    alarmThreshold: document.getElementById("ws-alarm-threshold"),
	    alarmHysteresis: document.getElementById("ws-alarm-hysteresis"),
	    alarmMsgOn: document.getElementById("ws-alarm-msg-on"),
	    alarmMsgOff: document.getElementById("ws-alarm-msg-off"),
	    alarmStatus: document.getElementById("ws-alarm-status"),
	    alarmCancelBtn: document.getElementById("ws-alarm-cancel-btn"),
	    alarmSaveBtn: document.getElementById("ws-alarm-save-btn")
	});

const wsSetDirty = (dirty) => {
    wsDirty = Boolean(dirty);
    const el = wsEls();
    if (el.saveBtn) el.saveBtn.disabled = !wsDirty;
    if (el.saveReloadBtn) el.saveReloadBtn.disabled = false; // allow reload path
    if (el.discardBtn) el.discardBtn.disabled = !wsDirty;
};

const wsSetStatus = (msg, cls) => {
    const el = wsEls();
    if (!el.saveStatus) return;
    el.saveStatus.textContent = String(msg || "");
    el.saveStatus.className = "small " + (cls || "");
};

const wsApiJson = async (url, opts = {}) => {
    const resp = await fetch(url, Object.assign({}, opts, { headers: withAdminHeaders(opts.headers || {}) }));
    const text = await resp.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = { ok: false, error: text }; }
    if (!resp.ok) throw new Error((data && data.error) ? data.error : ("HTTP " + resp.status));
    return data;
};

	const wsApiText = async (url, opts = {}) => {
	    const resp = await fetch(url, Object.assign({}, opts, { headers: withAdminHeaders(opts.headers || {}) }));
	    const text = await resp.text();
	    if (!resp.ok) throw new Error(text || ("HTTP " + resp.status));
	    return text;
	};

	const wsIsEditable = () => {
	    return !!(ADMIN_CONFIGURED && ADMIN_LOGGED_IN);
	};

	const wsApplyEditability = () => {
	    const el = wsEls();
	    const canEdit = wsIsEditable();
	    if (el.saveBtn) el.saveBtn.disabled = !canEdit || !wsDirty;
	    if (el.saveReloadBtn) el.saveReloadBtn.disabled = !canEdit;
	    if (el.discardBtn) el.discardBtn.disabled = !canEdit || !wsDirty;
	};

			const wsLoadWorkspaceFromServer = async () => {
			    if (!wsIsEditable()) {
			        throw new Error("Admin login required to view workspace config.");
			    }

			    const files = await wsApiJson("/config/files");
			    const connPaths = (Array.isArray(files?.files) ? files.files : [])
			        .filter((f) => f && f.kind === "connection" && typeof f.path === "string")
			        .map((f) => f.path)
			        .sort();
			
			    const connections = [];
			    for (const relPath of connPaths) {
			        try {
			            const raw = await wsApiText("/config/file?path=" + encodeURIComponent(relPath));
			            const parsed = JSON.parse(wsStripJsonComments(raw));
			            if (!parsed || typeof parsed !== "object") continue;
			            const id = String(parsed.id || "").trim();
			            if (!id) continue;
			            parsed.__path = relPath;
			            connections.push(parsed);
			        } catch (e) {
			            console.warn("Failed to load connection:", relPath, e);
			        }
			    }
			
			    const tagsResp = await wsApiJson("/config/tags");
			    const tags = Array.isArray(tagsResp?.tags) ? tagsResp.tags : [];

			    let alarms = [];
			    try {
			        const ar = await wsApiJson("/config/alarms");
			        const cfg = ar && typeof ar === "object" ? (ar.json || {}) : {};
			        if (Array.isArray(cfg?.alarms)) alarms = cfg.alarms;
			        else if (Array.isArray(cfg?.rules)) alarms = cfg.rules; // legacy naming
			    } catch (_) {
			        alarms = [];
			    }
			
			    return { connections, tags, alarms };
			};

const wsBuildNodeIndex = (root) => {
    wsNodeById = new Map();
    const walk = (node, parentId) => {
        wsNodeById.set(node.id, Object.assign({ parentId }, node));
        (node.children || []).forEach((c) => walk(c, node.id));
    };
    walk(root, null);
};

	const wsBuildTree = () => {
	    const root = { id: "ws:root", type: "root", label: "opcbridge", children: [] };
	    const connectivity = { id: "ws:connectivity", type: "connectivity", label: "Connectivity", children: [] };
	    const alarmsRoot = { id: "ws:alarms", type: "alarms", label: "Alarms & Events", children: [] };
	    root.children.push(connectivity);
	    root.children.push(alarmsRoot);

    const conns = Array.isArray(wsDraft.connections) ? wsDraft.connections.slice() : [];
    conns.sort((a, b) => String(a?.id || "").localeCompare(String(b?.id || ""), undefined, { numeric: true, sensitivity: "base" }));

    const tags = Array.isArray(wsDraft.tags) ? wsDraft.tags : [];
    const tagsByConn = new Map();
    tags.forEach((t) => {
        const cid = String(t?.connection_id || "").trim();
        const name = String(t?.name || "").trim();
        if (!cid || !name) return;
        if (!tagsByConn.has(cid)) tagsByConn.set(cid, []);
        tagsByConn.get(cid).push(t);
    });
    tagsByConn.forEach((arr) => {
        arr.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""), undefined, { numeric: true, sensitivity: "base" }));
    });

	    conns.forEach((c) => {
	        const cid = String(c?.id || "").trim();
	        if (!cid) return;
	        const node = { id: `ws:device:${encodeURIComponent(cid)}`, type: "device", label: cid, connection_id: cid, children: [] };
        const tagList = tagsByConn.get(cid) || [];
        tagList.forEach((t) => {
            const name = String(t?.name || "").trim();
            if (!name) return;
            node.children.push({
                id: `ws:tag:${encodeURIComponent(cid)}:${encodeURIComponent(name)}`,
                type: "tag",
                label: name,
                connection_id: cid,
                name,
                children: []
            });
        });
	        connectivity.children.push(node);
	    });

	    const alarms = Array.isArray(wsDraft.alarms) ? wsDraft.alarms.slice() : [];
	    alarms.sort((a, b) => String(a?.id || "").localeCompare(String(b?.id || ""), undefined, { numeric: true, sensitivity: "base" }));
	    alarms.forEach((a) => {
	        const id = String(a?.id || "").trim();
	        if (!id) return;
	        alarmsRoot.children.push({
	            id: `ws:alarm:${encodeURIComponent(id)}`,
	            type: "alarm",
	            label: id,
	            alarm_id: id,
	            connection_id: String(a?.connection_id || ""),
	            tag_name: String(a?.tag_name || ""),
	            children: []
	        });
	    });

	    wsBuildNodeIndex(root);
	    return root;
	};

const wsHideContextMenu = () => {
    const el = wsEls();
    if (!el.contextMenu) return;
    el.contextMenu.style.display = "none";
    el.contextMenu.textContent = "";
};

const wsCloseModal = (modal) => {
    if (!modal) return;
    modal.style.display = "none";
};

const wsFillSelect = (sel, opts, selectedValue) => {
    if (!sel) return;
    sel.textContent = "";
    opts.forEach((o) => {
        const opt = document.createElement("option");
        opt.value = o.value;
        opt.textContent = o.label;
        sel.appendChild(opt);
    });
    if (selectedValue != null) sel.value = String(selectedValue);
};

const wsFillDatatypeSelect = (sel, selected) => {
    if (!sel) return;
    sel.textContent = "";
    WS_TAG_DATATYPES.forEach((dt) => {
        const opt = document.createElement("option");
        opt.value = dt;
        opt.textContent = dt;
        sel.appendChild(opt);
    });
    sel.value = selected && WS_TAG_DATATYPES.includes(selected) ? selected : "bool";
};

	let wsDeviceModalMode = "new";
	let wsDeviceEditingId = "";
	let wsTagModalMode = "new";
	let wsTagEditingConn = "";
	let wsTagEditingName = "";
	let wsAlarmModalMode = "new";
	let wsAlarmEditingId = "";

		const WS_ALARM_TYPES = ["high", "low", "change", "equals", "not_equals"];

const wsOpenDeviceModal = ({ mode, connection_id }) => {
    const el = wsEls();
    if (!el.deviceModal) return;

    wsDeviceModalMode = mode === "edit" ? "edit" : "new";
    wsDeviceEditingId = "";

    wsFillSelect(el.deviceDriver, Object.entries(WS_DRIVER_LABELS).map(([v, label]) => ({ value: v, label })), "ab_eip");
    wsFillSelect(el.devicePlcType, Object.entries(WS_PLC_TYPE_LABELS).map(([v, label]) => ({ value: v, label })), "lgx");

    let obj = {};
    if (wsDeviceModalMode === "edit") {
        const cid = String(connection_id || "").trim();
        obj = (Array.isArray(wsDraft.connections) ? wsDraft.connections : []).find((c) => String(c?.id || "") === cid) || {};
        wsDeviceEditingId = cid;
    }

    if (el.deviceTitle) el.deviceTitle.textContent = wsDeviceModalMode === "edit" ? `Device Properties: ${wsDeviceEditingId}` : "New Device";
    if (el.deviceStatus) el.deviceStatus.textContent = "";

    if (el.deviceId) {
        el.deviceId.value = wsDeviceModalMode === "edit" ? wsDeviceEditingId : "";
        el.deviceId.disabled = wsDeviceModalMode === "edit";
    }
    if (el.deviceDesc) el.deviceDesc.value = String(obj?.description || "");
    if (el.deviceDriver) el.deviceDriver.value = String(obj?.driver || "ab_eip");
    if (el.devicePlcType) el.devicePlcType.value = String(obj?.plc_type || "lgx");
    if (el.deviceGateway) el.deviceGateway.value = String(obj?.gateway || "");
    if (el.devicePath) el.devicePath.value = String(obj?.path || "");
    if (el.deviceSlot) el.deviceSlot.value = obj?.slot == null ? "" : String(obj.slot);
    if (el.deviceTimeout) el.deviceTimeout.value = obj?.default_timeout_ms == null ? "" : String(obj.default_timeout_ms);
    if (el.deviceRead) el.deviceRead.value = obj?.default_read_ms == null ? "" : String(obj.default_read_ms);
    if (el.deviceWrite) el.deviceWrite.value = obj?.default_write_ms == null ? "" : String(obj.default_write_ms);
    if (el.deviceDebug) el.deviceDebug.value = obj?.debug == null ? "" : String(obj.debug);

    el.deviceModal.style.display = "flex";
    el.deviceId?.focus?.();
};

		const wsOpenTagModal = ({ mode, connection_id, name }) => {
	    const el = wsEls();
	    if (!el.tagModal) return;
	    wsTagModalMode = mode === "edit" ? "edit" : "new";
	    wsTagEditingConn = String(connection_id || "").trim();
	    wsTagEditingName = String(name || "").trim();

	    const conns = Array.isArray(wsDraft.connections) ? wsDraft.connections : [];
	    const connIds = conns
	        .map((c) => String(c?.id || ""))
	        .filter(Boolean)
	        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
	    wsFillSelect(el.tagConn, connIds.map((id) => ({ value: id, label: id })), wsTagEditingConn || (connIds[0] || ""));

	    const tags = Array.isArray(wsDraft.tags) ? wsDraft.tags : [];
	    const existing = wsTagModalMode === "edit"
	        ? tags.find((t) => String(t?.connection_id || "") === wsTagEditingConn && String(t?.name || "") === wsTagEditingName)
	        : null;

	    if (el.tagTitle) {
	        const curConn = String(el.tagConn?.value || wsTagEditingConn || "").trim();
	        el.tagTitle.textContent = wsTagModalMode === "edit"
	            ? `Tag Properties: ${wsTagEditingConn}:${wsTagEditingName}`
	            : `New Tag: ${curConn}`;
	    }
	    if (el.tagStatus) el.tagStatus.textContent = "";

	    if (el.tagConn) {
	        el.tagConn.value = wsTagEditingConn || String(el.tagConn.value || "");
	        el.tagConn.onchange = () => {
	            if (!el.tagTitle) return;
	            if (wsTagModalMode !== "new") return;
	            const curConn = String(el.tagConn?.value || "").trim();
	            el.tagTitle.textContent = `New Tag: ${curConn}`;
	        };
	    }
	    if (el.tagName) {
	        el.tagName.value = wsTagModalMode === "edit" ? wsTagEditingName : "";
	        el.tagName.disabled = wsTagModalMode === "edit";
	    }
	    if (el.tagPlc) el.tagPlc.value = existing ? String(existing?.plc_tag_name || "") : "";
	    wsFillDatatypeSelect(el.tagDt, existing ? String(existing?.datatype || "bool") : "bool");
	    if (el.tagScan) el.tagScan.value = existing && existing?.scan_ms != null ? String(existing.scan_ms) : "";
	    if (el.tagEnabled) el.tagEnabled.checked = existing ? (existing?.enabled !== false) : true;
	    if (el.tagWritable) el.tagWritable.checked = existing ? (existing?.writable === true) : false;
	    if (el.tagMqttAllowed) el.tagMqttAllowed.checked = existing ? (existing?.mqtt_command_allowed === true) : false;

    el.tagModal.style.display = "flex";
    el.tagName?.focus?.();
};

	const wsOpenPropertiesForNode = (nodeId) => {
	    const node = wsNodeById.get(nodeId);
	    if (!node) return;
	    if (node.type === "device") return wsOpenDeviceModal({ mode: "edit", connection_id: node.connection_id });
	    if (node.type === "tag") return wsOpenTagModal({ mode: "edit", connection_id: node.connection_id, name: node.name });
	    if (node.type === "alarm") return wsOpenAlarmModal({ mode: "edit", alarm_id: node.alarm_id });
	};

	const wsOpenAlarmModal = ({ mode, alarm_id }) => {
	    const el = wsEls();
	    if (!el.alarmModal) return;
	    wsAlarmModalMode = mode === "edit" ? "edit" : "new";
	    wsAlarmEditingId = String(alarm_id || "").trim();

	    const conns = Array.isArray(wsDraft.connections) ? wsDraft.connections : [];
	    const connIds = conns.map((c) => String(c?.id || "")).filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
	    wsFillSelect(el.alarmConn, connIds.map((id) => ({ value: id, label: id })), connIds[0] || "");

	    wsFillSelect(el.alarmType, WS_ALARM_TYPES.map((t) => ({ value: t, label: t })), "high");

	    const alarms = Array.isArray(wsDraft.alarms) ? wsDraft.alarms : [];
	    const existing = wsAlarmModalMode === "edit"
	        ? alarms.find((a) => String(a?.id || "") === wsAlarmEditingId)
	        : null;

	    if (el.alarmTitle) el.alarmTitle.textContent = wsAlarmModalMode === "edit" ? `Alarm Properties: ${wsAlarmEditingId}` : "New Alarm";
	    if (el.alarmStatus) el.alarmStatus.textContent = "";

	    if (el.alarmId) {
	        el.alarmId.value = wsAlarmModalMode === "edit" ? wsAlarmEditingId : "";
	        el.alarmId.disabled = wsAlarmModalMode === "edit";
	    }
	    if (el.alarmName) el.alarmName.value = existing ? String(existing?.name || "") : "";
	    if (el.alarmGroup) el.alarmGroup.value = existing ? String(existing?.group || "") : "";
	    if (el.alarmSite) el.alarmSite.value = existing ? String(existing?.site || "") : "";
	    if (el.alarmType) el.alarmType.value = existing ? String(existing?.type || "high") : "high";
	    if (el.alarmConn) el.alarmConn.value = existing ? String(existing?.connection_id || "") : (connIds[0] || "");
	    if (el.alarmTag) el.alarmTag.value = existing ? String(existing?.tag_name || "") : "";
	    if (el.alarmEnabled) el.alarmEnabled.checked = existing ? (existing?.enabled !== false) : true;
	    if (el.alarmSeverity) el.alarmSeverity.value = existing && existing?.severity != null ? String(existing.severity) : "500";
	    if (el.alarmThreshold) el.alarmThreshold.value = existing && existing?.threshold != null ? String(existing.threshold) : "";
	    if (el.alarmHysteresis) el.alarmHysteresis.value = existing && existing?.hysteresis != null ? String(existing.hysteresis) : "";
	    if (el.alarmMsgOn) el.alarmMsgOn.value = existing ? String(existing?.message_on_active || "") : "";
	    if (el.alarmMsgOff) el.alarmMsgOff.value = existing ? String(existing?.message_on_return || "") : "";

	    const refreshTagOptions = () => {
	        const cid = String(el.alarmConn?.value || "").trim();
	        const tags = (Array.isArray(wsDraft.tags) ? wsDraft.tags : []).filter((t) => String(t?.connection_id || "") === cid);
	        tags.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""), undefined, { numeric: true, sensitivity: "base" }));
	        wsFillSelect(el.alarmTag, tags.map((t) => ({ value: String(t?.name || ""), label: String(t?.name || "") })), String(existing?.tag_name || ""));
	        if (!existing && el.alarmTag && tags.length && !el.alarmTag.value) el.alarmTag.value = String(tags[0]?.name || "");
	    };
	    if (el.alarmConn) el.alarmConn.onchange = refreshTagOptions;
	    refreshTagOptions();

	    el.alarmModal.style.display = "flex";
	    el.alarmId?.focus?.();
	};

	const wsShowContextMenu = (nodeId, x, y) => {
	    const el = wsEls();
	    if (!el.contextMenu) return;
	    if (!wsIsEditable()) return;
	    const node = wsNodeById.get(nodeId);
	    if (!node) return;

    const items = [];
    const addItem = (label, action) => items.push({ label, action });

	    if (node.type === "connectivity") {
	        addItem("Add Device…", "add-device");
	    } else if (node.type === "alarms") {
	        addItem("Add Alarm…", "add-alarm");
	    } else if (node.type === "device") {
	        addItem("Add Tag…", "add-tag");
	        addItem("Properties…", "edit-device");
	        addItem("Delete Device", "delete-device");
		    } else if (node.type === "alarm") {
		        addItem("Properties…", "edit-alarm");
		        addItem("Delete Alarm", "delete-alarm");
		    } else if (node.type === "tag") {
		        addItem("Properties…", "edit-tag");
		        addItem("Delete Tag", "delete-tag");
		    } else {
		        return;
		    }

    el.contextMenu.textContent = "";
    items.forEach((it) => {
        const div = document.createElement("div");
        div.className = "ws-menu-item";
        div.textContent = it.label;
        div.addEventListener("click", () => {
            wsHideContextMenu();
            wsHandleContextAction(it.action, nodeId);
        });
        el.contextMenu.appendChild(div);
    });

	    el.contextMenu.style.left = `${Math.max(4, x)}px`;
	    el.contextMenu.style.top = `${Math.max(4, y)}px`;
	    el.contextMenu.style.display = "block";
	};

	// Show a custom context menu (used by the right-pane multi-select table).
	const wsShowCustomContextMenu = (items, x, y, onAction) => {
	    const el = wsEls();
	    if (!el.contextMenu) return;
	    if (!wsIsEditable()) return;
	    if (!Array.isArray(items) || !items.length) return;

	    el.contextMenu.textContent = "";
	    items.forEach((it) => {
	        const div = document.createElement("div");
	        div.className = "ws-menu-item";
	        div.textContent = String(it?.label || "");
	        div.addEventListener("click", () => {
	            wsHideContextMenu();
	            try { onAction && onAction(String(it?.action || "")); } catch { /* ignore */ }
	        });
	        el.contextMenu.appendChild(div);
	    });

	    el.contextMenu.style.left = `${Math.max(4, x)}px`;
	    el.contextMenu.style.top = `${Math.max(4, y)}px`;
	    el.contextMenu.style.display = "block";
	};

	const wsHandleContextAction = (action, nodeId) => {
	    const node = wsNodeById.get(nodeId);
	    if (!node) return;
	    if (action === "add-device") return wsOpenDeviceModal({ mode: "new" });
	    if (action === "add-alarm") return wsOpenAlarmModal({ mode: "new" });
		    if (action === "edit-device") return wsOpenDeviceModal({ mode: "edit", connection_id: node.connection_id });
		    if (action === "edit-alarm") return wsOpenAlarmModal({ mode: "edit", alarm_id: node.alarm_id });
		    if (action === "delete-device") return wsDeleteDevice(node.connection_id);
		    if (action === "delete-alarm") return wsDeleteAlarm(node.alarm_id);
		    if (action === "add-tag") return wsOpenTagModal({ mode: "new", connection_id: node.connection_id });
		    if (action === "edit-tag") return wsOpenTagModal({ mode: "edit", connection_id: node.connection_id, name: node.name });
		    if (action === "delete-tag") return wsDeleteTag(node.connection_id, node.name);
		};

const wsSelectNode = (nodeId) => {
    wsSelectedId = nodeId;
    wsRenderTree();
    wsRenderChildrenTable();
    wsApplyLiveTagsFilterFromSelection();
};

const wsToggleNode = (nodeId) => {
    if (wsExpanded.has(nodeId)) wsExpanded.delete(nodeId);
    else wsExpanded.add(nodeId);
    wsRenderTree();
};

const wsRenderTree = () => {
    const el = wsEls();
    if (!el.tree) return;

    const root = wsBuildTree();

    const rows = [];
    const renderNode = (node, depth) => {
        const row = document.createElement("div");
        row.className = "ws-tree-row" + (node.id === wsSelectedId ? " is-selected" : "");
        row.dataset.id = node.id;

        for (let i = 0; i < depth; i++) {
            const ind = document.createElement("span");
            ind.className = "ws-indent";
            row.appendChild(ind);
        }

        const hasKids = Array.isArray(node.children) && node.children.length > 0;
        const exp = document.createElement("span");
        exp.className = "ws-expander" + (hasKids ? "" : " is-empty");
        exp.textContent = hasKids ? (wsExpanded.has(node.id) ? "−" : "+") : "";
        if (hasKids) {
            exp.addEventListener("click", (e) => {
                e.stopPropagation();
                wsToggleNode(node.id);
            });
        }
        row.appendChild(exp);

        const label = document.createElement("span");
        label.className = "ws-label";
        label.textContent = node.label;
        row.appendChild(label);

        row.addEventListener("click", () => wsSelectNode(node.id));
        row.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            wsSelectNode(node.id);
            wsShowContextMenu(node.id, e.clientX, e.clientY);
        });

        rows.push(row);

        if (hasKids && wsExpanded.has(node.id)) {
            node.children.forEach((c) => renderNode(c, depth + 1));
        }
    };

    renderNode(root, 0);
    el.tree.textContent = "";
    rows.forEach((r) => el.tree.appendChild(r));
};

		const wsRenderChildrenTable = () => {
		    const el = wsEls();
		    if (!el.thead || !el.tbody) return;
		    const node = wsNodeById.get(wsSelectedId);
		    if (!node) return;

	    const setHeaderSimple = (cols) => {
	        const tr = document.createElement("tr");
	        cols.forEach((c) => {
	            const th = document.createElement("th");
	            th.textContent = c;
	            tr.appendChild(th);
	        });
	        el.thead.textContent = "";
	        el.thead.appendChild(tr);
	    };

	    const setHeaderSortable = (cols) => {
	        const tr = document.createElement("tr");
	        cols.forEach((c) => {
	            const th = document.createElement("th");
	            th.textContent = c.label;
	            if (c.sortable) {
	                th.classList.add("is-sortable");
	                th.title = "Sort";
	                th.addEventListener("click", () => {
	                    const key = String(c.key || "name");
	                    const cur = wsChildrenSort || { key: "name", dir: "asc" };
	                    const dir = (cur.key === key && cur.dir === "asc") ? "desc" : "asc";
	                    wsChildrenSort = { key, dir };
	                    wsRenderChildrenTable();
	                });
	            }
	            tr.appendChild(th);
	        });
	        el.thead.textContent = "";
	        el.thead.appendChild(tr);
	    };

			    const addRowSimple = (cells, nodeId) => {
			        const tr = document.createElement("tr");
			        cells.forEach((txt) => {
			            const td = document.createElement("td");
			            td.textContent = txt;
			            tr.appendChild(td);
			        });
			        if (nodeId) {
			            tr.dataset.nodeId = nodeId;
			            tr.addEventListener("click", () => wsSelectNode(nodeId));
			            tr.addEventListener("contextmenu", (e) => {
			                e.preventDefault();
			                wsSelectNode(nodeId);
			                wsShowContextMenu(nodeId, e.clientX, e.clientY);
			            });
			            if (wsIsEditable()) {
			                tr.addEventListener("dblclick", () => wsOpenPropertiesForNode(nodeId));
			            }
			        }
			        el.tbody.appendChild(tr);
			    };

	    el.tbody.textContent = "";

		    if (node.type === "root") {
		        setHeaderSimple(["Name"]);
		        addRowSimple(["Connectivity"], "ws:connectivity");
		        addRowSimple(["Alarms & Events"], "ws:alarms");
		        return;
		    }

	    if (node.type === "connectivity") {
	        setHeaderSimple(["Name", "Description", "Driver", "PLC Type", "Gateway", "Path", "Slot"]);
	        const conns = Array.isArray(wsDraft.connections) ? wsDraft.connections.slice() : [];
	        conns.sort((a, b) => String(a?.id || "").localeCompare(String(b?.id || ""), undefined, { numeric: true, sensitivity: "base" }));
	        conns.forEach((c) => {
	            const cid = String(c?.id || "").trim();
	            if (!cid) return;
	            addRowSimple([
	                cid,
	                String(c?.description || ""),
	                wsLabelForDriver(c?.driver),
	                wsLabelForPlcType(c?.plc_type),
	                String(c?.gateway || ""),
	                String(c?.path || ""),
	                String(c?.slot ?? "")
	            ], `ws:device:${encodeURIComponent(cid)}`);
	        });
	        return;
	    }

	    if (node.type === "device" || node.type === "tag") {
	        const cid = String(node.connection_id || "").trim();
	        const rootKey = `tags:${cid}`;
	        if (wsChildrenSelRoot !== rootKey) {
	            wsChildrenSelRoot = rootKey;
	            wsChildrenSel = new Set();
	            wsChildrenLastIndex = -1;
	            wsChildrenSort = { key: "name", dir: "asc" };
	        }

	        const cols = [
	            { key: "name", label: "Name", sortable: true },
	            { key: "plc_tag_name", label: "PLC Tag", sortable: true },
	            { key: "datatype", label: "Datatype", sortable: true },
	            { key: "scan_ms", label: "Scan (ms)", sortable: true },
	            { key: "enabled", label: "Enabled", sortable: true },
	            { key: "writable", label: "Writable", sortable: true }
	        ];
	        setHeaderSortable(cols);

	        const allTags = (Array.isArray(wsDraft.tags) ? wsDraft.tags : []).filter((t) => String(t?.connection_id || "") === cid);
	        const getVal = (t, key) => {
	            if (key === "name") return String(t?.name || "");
	            if (key === "plc_tag_name") return String(t?.plc_tag_name || "");
	            if (key === "datatype") return String(t?.datatype || "");
	            if (key === "scan_ms") return t?.scan_ms == null ? -1 : Number(t.scan_ms);
	            if (key === "enabled") return t?.enabled === false ? 0 : 1;
	            if (key === "writable") return t?.writable === true ? 1 : 0;
	            return "";
	        };

	        const sortKey = String(wsChildrenSort?.key || "name");
	        const dir = (wsChildrenSort?.dir === "desc") ? -1 : 1;
	        allTags.sort((a, b) => {
	            const va = getVal(a, sortKey);
	            const vb = getVal(b, sortKey);
	            if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
	            return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" }) * dir;
	        });

	        const applySelectionClass = () => {
	            const trs = Array.from(el.tbody.querySelectorAll("tr[data-row-key]"));
	            trs.forEach((r) => r.classList.toggle("is-selected", wsChildrenSel.has(String(r.dataset.rowKey || ""))));
	        };

	        const handleRowClick = (e, idx, key) => {
	            if (!wsIsEditable()) {
	                wsChildrenSel = new Set([key]);
	                wsChildrenLastIndex = idx;
	                applySelectionClass();
	                return;
	            }

	            const multi = e.ctrlKey || e.metaKey;
	            const range = e.shiftKey && wsChildrenLastIndex >= 0;

	            if (range) {
	                const start = Math.min(wsChildrenLastIndex, idx);
	                const end = Math.max(wsChildrenLastIndex, idx);
	                const trs = Array.from(el.tbody.querySelectorAll("tr[data-row-key]"));
	                const keys = [];
	                for (let i = start; i <= end; i++) {
	                    const k = String(trs[i]?.dataset?.rowKey || "");
	                    if (k) keys.push(k);
	                }
	                if (!multi) wsChildrenSel = new Set();
	                keys.forEach((k) => wsChildrenSel.add(k));
	            } else if (multi) {
	                if (wsChildrenSel.has(key)) wsChildrenSel.delete(key);
	                else wsChildrenSel.add(key);
	                wsChildrenLastIndex = idx;
	            } else {
	                wsChildrenSel = new Set([key]);
	                wsChildrenLastIndex = idx;
	            }
	            applySelectionClass();
	        };

	        const deleteSelected = () => {
	            const keys = Array.from(wsChildrenSel.values());
	            if (!keys.length) return;
	            if (!confirm(`Delete ${keys.length} tag(s)? (Applied on Save.)`)) return;
	            const del = new Set(keys);
	            wsDraft.tags = (Array.isArray(wsDraft.tags) ? wsDraft.tags : []).filter((t) => !del.has(`${String(t?.connection_id || "")}::${String(t?.name || "")}`));
	            wsChildrenSel = new Set();
	            wsChildrenLastIndex = -1;
	            wsSetDirty(true);
	            wsRenderTree();
	            wsRenderChildrenTable();
	        };

	        el.tbody.textContent = "";
	        if (!allTags.length) {
	            const tr = document.createElement("tr");
	            tr.innerHTML = `<td>(no tags)</td><td></td><td></td><td></td><td></td><td></td>`;
	            el.tbody.appendChild(tr);
	            return;
	        }

	        allTags.forEach((t, idx) => {
	            const name = String(t?.name || "").trim();
	            const rowKey = `${cid}::${name}`;
	            const tr = document.createElement("tr");
	            tr.dataset.rowKey = rowKey;
	            const cells = [
	                name,
	                String(t?.plc_tag_name || ""),
	                String(t?.datatype || ""),
	                t?.scan_ms == null ? "" : String(t.scan_ms),
	                t?.enabled === false ? "no" : "yes",
	                t?.writable === true ? "yes" : "no"
	            ];
	            cells.forEach((txt) => {
	                const td = document.createElement("td");
	                td.textContent = txt;
	                tr.appendChild(td);
	            });

	            tr.addEventListener("click", (e) => handleRowClick(e, idx, rowKey));
	            tr.addEventListener("dblclick", () => {
	                if (!wsIsEditable()) return;
	                wsOpenPropertiesForNode(`ws:tag:${encodeURIComponent(cid)}:${encodeURIComponent(name)}`);
	            });
	            tr.addEventListener("contextmenu", (e) => {
	                e.preventDefault();
	                if (!wsIsEditable()) return;
	                if (!wsChildrenSel.has(rowKey)) {
	                    wsChildrenSel = new Set([rowKey]);
	                    wsChildrenLastIndex = idx;
	                    applySelectionClass();
	                }
	                wsShowCustomContextMenu([
	                    { label: `Delete selected tag(s) (${wsChildrenSel.size})`, action: "bulk-delete-tags" }
	                ], e.clientX, e.clientY, (action) => {
	                    if (action === "bulk-delete-tags") deleteSelected();
	                });
	            });

	            el.tbody.appendChild(tr);
	        });

	        applySelectionClass();
	        return;
	    }

		    if (node.type === "alarms") {
		        setHeaderSimple(["ID", "Name", "Group", "Site", "Type", "Connection", "Tag", "Enabled", "Severity"]);
		        const alarms = Array.isArray(wsDraft.alarms) ? wsDraft.alarms.slice() : [];
		        alarms.sort((a, b) => String(a?.id || "").localeCompare(String(b?.id || ""), undefined, { numeric: true, sensitivity: "base" }));
		        if (!alarms.length) {
		            addRowSimple(["(no alarms)", "", "", "", "", "", "", "", ""], null);
		            return;
		        }
		        alarms.forEach((a) => {
		            const id = String(a?.id || "").trim();
		            if (!id) return;
		            addRowSimple([
		                id,
		                String(a?.name || ""),
		                String(a?.group || ""),
		                String(a?.site || ""),
		                String(a?.type || ""),
		                String(a?.connection_id || ""),
		                String(a?.tag_name || ""),
		                a?.enabled === false ? "no" : "yes",
		                String(a?.severity ?? "")
		            ], `ws:alarm:${encodeURIComponent(id)}`);
		        });
		        return;
		    }

		    if (node.type === "alarm") {
		        setHeaderSimple(["Field", "Value"]);
		        const id = String(node.alarm_id || "").trim();
		        const a = (Array.isArray(wsDraft.alarms) ? wsDraft.alarms : []).find((x) => String(x?.id || "") === id);
		        if (!a) {
		            addRowSimple(["(missing)", ""], null);
		            return;
		        }
		        const kv = [
		            ["id", String(a?.id || "")],
	            ["name", String(a?.name || "")],
	            ["group", String(a?.group || "")],
	            ["site", String(a?.site || "")],
	            ["type", String(a?.type || "")],
	            ["connection_id", String(a?.connection_id || "")],
	            ["tag_name", String(a?.tag_name || "")],
	            ["enabled", a?.enabled === false ? "no" : "yes"],
	            ["severity", String(a?.severity ?? "")],
	            ["threshold", String(a?.threshold ?? "")],
	            ["hysteresis", String(a?.hysteresis ?? "")],
		            ["message_on_active", String(a?.message_on_active || "")],
		            ["message_on_return", String(a?.message_on_return || "")],
		        ];
		        kv.forEach(([k, v]) => addRowSimple([k, v], null));
		        return;
		    }
		};

const wsSaveDeviceFromModal = () => {
    const el = wsEls();
    const id = String(el.deviceId?.value || "").trim();
    if (!id) {
        if (el.deviceStatus) el.deviceStatus.textContent = "Device ID is required.";
        return;
    }

    const base = wsDeviceModalMode === "edit"
        ? ((Array.isArray(wsDraft.connections) ? wsDraft.connections : []).find((c) => String(c?.id || "") === wsDeviceEditingId) || {})
        : {};

    const next = Object.assign({}, base);
    next.id = id;
    next.description = String(el.deviceDesc?.value || "");
    next.driver = String(el.deviceDriver?.value || "ab_eip");
    next.plc_type = String(el.devicePlcType?.value || "lgx");
    next.gateway = String(el.deviceGateway?.value || "");
    next.path = String(el.devicePath?.value || "");
    next.slot = Math.max(0, Math.floor(Number(el.deviceSlot?.value) || 0));
    if (String(el.deviceTimeout?.value || "").trim() !== "") next.default_timeout_ms = Math.max(0, Math.floor(Number(el.deviceTimeout.value) || 0));
    if (String(el.deviceRead?.value || "").trim() !== "") next.default_read_ms = Math.max(0, Math.floor(Number(el.deviceRead.value) || 0));
    if (String(el.deviceWrite?.value || "").trim() !== "") next.default_write_ms = Math.max(0, Math.floor(Number(el.deviceWrite.value) || 0));
    if (String(el.deviceDebug?.value || "").trim() !== "") next.debug = Math.max(0, Math.floor(Number(el.deviceDebug.value) || 0));

    const conns = Array.isArray(wsDraft.connections) ? wsDraft.connections.slice() : [];

    if (wsDeviceModalMode === "new") {
        if (conns.some((c) => String(c?.id || "") === id)) {
            if (el.deviceStatus) el.deviceStatus.textContent = "Device ID already exists.";
            return;
        }
        conns.push(next);
    } else {
        const idx = conns.findIndex((c) => String(c?.id || "") === wsDeviceEditingId);
        if (idx >= 0) conns[idx] = next;
    }

    wsDraft.connections = conns;
    wsSetDirty(true);
    wsCloseModal(el.deviceModal);

    wsSelectNode("ws:connectivity");
};

const wsSaveTagFromModal = () => {
    const el = wsEls();
    const cid = String(el.tagConn?.value || "").trim();
    const name = String(el.tagName?.value || "").trim();
    const plc_tag_name = String(el.tagPlc?.value || "").trim();
    const datatype = String(el.tagDt?.value || "").trim();
	    const scanRaw = String(el.tagScan?.value || "").trim();
	    const enabled = Boolean(el.tagEnabled?.checked);
	    const writable = Boolean(el.tagWritable?.checked);
	    const mqtt_command_allowed = Boolean(el.tagMqttAllowed?.checked);

    if (!cid) {
        if (el.tagStatus) el.tagStatus.textContent = "Device is required.";
        return;
    }
    if (!name) {
        if (el.tagStatus) el.tagStatus.textContent = "Tag name is required.";
        return;
    }
    if (!plc_tag_name) {
        if (el.tagStatus) el.tagStatus.textContent = "PLC Tag is required.";
        return;
    }
    if (!datatype) {
        if (el.tagStatus) el.tagStatus.textContent = "Datatype is required.";
        return;
    }

	    let tags = Array.isArray(wsDraft.tags) ? wsDraft.tags.slice() : [];

	    if (wsTagModalMode === "new") {
	        if (tags.some((t) => String(t?.connection_id || "") === cid && String(t?.name || "") === name)) {
	            if (el.tagStatus) el.tagStatus.textContent = "Tag name already exists for this device.";
	            return;
	        }
	        const next = { connection_id: cid, name };
	        next.plc_tag_name = plc_tag_name;
	        next.datatype = datatype;
	        if (scanRaw !== "") next.scan_ms = Math.max(0, Math.floor(Number(scanRaw) || 0));
	        next.enabled = enabled;
	        next.writable = writable;
	        next.mqtt_command_allowed = mqtt_command_allowed;
	        tags.push(next);
	    } else {
	        const idx = tags.findIndex((t) => String(t?.connection_id || "") === wsTagEditingConn && String(t?.name || "") === wsTagEditingName);
	        if (idx < 0) {
	            if (el.tagStatus) el.tagStatus.textContent = "Tag not found.";
	            return;
	        }
	        if (cid !== wsTagEditingConn) {
	            if (tags.some((t, i) => i !== idx && String(t?.connection_id || "") === cid && String(t?.name || "") === wsTagEditingName)) {
	                if (el.tagStatus) el.tagStatus.textContent = "A tag with this name already exists for the selected device.";
	                return;
	            }
	        }
	        const next = Object.assign({}, tags[idx]);
	        next.connection_id = cid;
	        next.plc_tag_name = plc_tag_name;
	        next.datatype = datatype;
	        if (scanRaw === "") delete next.scan_ms;
	        else next.scan_ms = Math.max(0, Math.floor(Number(scanRaw) || 0));
	        next.enabled = enabled;
	        next.writable = writable;
	        next.mqtt_command_allowed = mqtt_command_allowed;
	        tags[idx] = next;

	        // If the user changed the Device, fully move the tag: remove any remaining copies
	        // of the old (connection_id,name) from the draft list (helps with legacy duplicates).
	        if (cid !== wsTagEditingConn) {
	            const oldConn = wsTagEditingConn;
	            const oldName = wsTagEditingName;
	            tags = tags.filter((t) => !(String(t?.connection_id || "") === oldConn && String(t?.name || "") === oldName));
	        }
	    }

	    wsDraft.tags = tags;
	    wsSetDirty(true);
	    wsCloseModal(el.tagModal);
	    wsSelectNode(`ws:device:${encodeURIComponent(cid)}`);
	};

const wsDeleteDevice = (connection_id) => {
    const cid = String(connection_id || "").trim();
    if (!cid) return;
    if (!confirm(`Delete device '${cid}'? (Will delete config files on Save.)`)) return;

    wsDraft.connections = (Array.isArray(wsDraft.connections) ? wsDraft.connections : []).filter((c) => String(c?.id || "") !== cid);
    wsDraft.tags = (Array.isArray(wsDraft.tags) ? wsDraft.tags : []).filter((t) => String(t?.connection_id || "") !== cid);

    wsPendingDeletes.push({ path: `connections/${cid}.json` });
    wsPendingDeletes.push({ path: `tags/${cid}.json` });
    wsSetDirty(true);
    wsSelectNode("ws:connectivity");
};

		const wsDeleteTag = (connection_id, name) => {
		    const cid = String(connection_id || "").trim();
		    const tn = String(name || "").trim();
		    if (!cid || !tn) return;
		    if (!confirm(`Delete tag '${cid}:${tn}'? (Applied on Save.)`)) return;
		    wsDraft.tags = (Array.isArray(wsDraft.tags) ? wsDraft.tags : []).filter((t) => !(String(t?.connection_id || "") === cid && String(t?.name || "") === tn));
		    wsSetDirty(true);
		    wsSelectNode(`ws:device:${encodeURIComponent(cid)}`);
		};

	const wsSaveAlarmFromModal = () => {
	    const el = wsEls();
	    const id = String(el.alarmId?.value || "").trim();
	    if (!id) {
	        if (el.alarmStatus) el.alarmStatus.textContent = "Alarm ID is required.";
	        return;
	    }

	    const base = wsAlarmModalMode === "edit"
	        ? ((Array.isArray(wsDraft.alarms) ? wsDraft.alarms : []).find((a) => String(a?.id || "") === wsAlarmEditingId) || {})
	        : {};

	    const next = Object.assign({}, base);
	    next.id = id;
	    next.name = String(el.alarmName?.value || "");
	    next.group = String(el.alarmGroup?.value || "");
	    next.site = String(el.alarmSite?.value || "");
	    next.type = String(el.alarmType?.value || "high");
	    next.connection_id = String(el.alarmConn?.value || "");
	    next.tag_name = String(el.alarmTag?.value || "");
	    next.enabled = !!el.alarmEnabled?.checked;
	    next.severity = Math.max(0, Math.min(1000, Math.floor(Number(el.alarmSeverity?.value) || 0)));
	    const thRaw = String(el.alarmThreshold?.value || "").trim();
	    const hyRaw = String(el.alarmHysteresis?.value || "").trim();
		    if ((next.type === "equals" || next.type === "not_equals") && thRaw === "") {
		        if (el.alarmStatus) el.alarmStatus.textContent = "Threshold is required for type=equals/not_equals (use 0/1 for boolean tags).";
		        return;
		    }
	    if (thRaw !== "") next.threshold = Number(thRaw) || 0;
	    else delete next.threshold;
	    if (hyRaw !== "") next.hysteresis = Number(hyRaw) || 0;
	    else delete next.hysteresis;
	    next.message_on_active = String(el.alarmMsgOn?.value || "");
	    next.message_on_return = String(el.alarmMsgOff?.value || "");

	    if (!next.connection_id || !next.tag_name || !next.type) {
	        if (el.alarmStatus) el.alarmStatus.textContent = "connection_id, tag_name, and type are required.";
	        return;
	    }

	    const alarms = Array.isArray(wsDraft.alarms) ? wsDraft.alarms.slice() : [];
	    if (wsAlarmModalMode === "new") {
	        if (alarms.some((a) => String(a?.id || "") === id)) {
	            if (el.alarmStatus) el.alarmStatus.textContent = "Alarm ID already exists.";
	            return;
	        }
	        alarms.push(next);
	    } else {
	        const idx = alarms.findIndex((a) => String(a?.id || "") === wsAlarmEditingId);
	        if (idx >= 0) alarms[idx] = next;
	    }

	    wsDraft.alarms = alarms;
	    wsSetDirty(true);
	    wsCloseModal(el.alarmModal);
	    wsSelectNode("ws:alarms");
	};

	const wsDeleteAlarm = (alarm_id) => {
	    const id = String(alarm_id || "").trim();
	    if (!id) return;
	    if (!confirm(`Delete alarm '${id}'? (Applied on Save.)`)) return;
	    wsDraft.alarms = (Array.isArray(wsDraft.alarms) ? wsDraft.alarms : []).filter((a) => String(a?.id || "") !== id);
	    wsSetDirty(true);
	    wsSelectNode("ws:alarms");
	};

	const wsSaveAll = async ({ reloadAfter }) => {
	    if (!wsDirty && !wsPendingDeletes.length) {
	        wsSetStatus("No changes to save.", "");
	        if (reloadAfter) await reloadConfig();
	        return;
    }

    const el = wsEls();
    wsSetStatus("Saving…", "");
    if (el.saveBtn) el.saveBtn.disabled = true;
    if (el.saveReloadBtn) el.saveReloadBtn.disabled = true;
    if (el.discardBtn) el.discardBtn.disabled = true;

    try {
        // 1) Connections: write each connection to connections/<id>.json (and optionally delete old path)
        const conns = Array.isArray(wsDraft.connections) ? wsDraft.connections : [];
        for (const c of conns) {
            const cid = String(c?.id || "").trim();
            if (!cid) continue;
            const targetPath = `connections/${cid}.json`;
            const prevPath = String(c?.__path || "").trim();
            if (prevPath && prevPath !== targetPath) {
                wsPendingDeletes.push({ path: prevPath });
            }
            const out = Object.assign({}, c);
            delete out.__path;
            const content = JSON.stringify(out, null, 2) + "\n";
            await wsApiJson("/config/file", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: WRITE_TOKEN, path: targetPath, content })
            });
        }

	        // 2) Tags: send flat list (strip source_file so it doesn't get written back into config).
	        // If a connection ends up with zero tags, write an empty canonical tags/<connection_id>.json
	        // so legacy/non-canonical tag files won't reintroduce old tags after reload.
	        const rawDraftTags = Array.isArray(wsDraft.tags) ? wsDraft.tags : [];
	        const draftTagConns = new Set(
	            rawDraftTags
	                .map((t) => String(t?.connection_id || "").trim())
	                .filter(Boolean)
	        );
	        const baseTagConns = new Set(
	            (Array.isArray(wsBase.tags) ? wsBase.tags : [])
	                .map((t) => String(t?.connection_id || "").trim())
	                .filter(Boolean)
	        );
	        const emptied = [];
	        baseTagConns.forEach((cid) => {
	            if (cid && !draftTagConns.has(cid)) emptied.push(cid);
	        });

	        const tags = rawDraftTags.map((t) => {
	            const next = Object.assign({}, t);
	            delete next.source_file;
	            return next;
	        });
	        if (tags.length > 0) {
	            await wsApiJson("/config/tags", {
	                method: "POST",
	                headers: { "Content-Type": "application/json" },
	                body: JSON.stringify({ token: WRITE_TOKEN, tags })
	            });
	        }
	        for (const cid of emptied) {
	            const content = JSON.stringify({ connection_id: cid, tags: [] }, null, 2) + "\n";
	            await wsApiJson("/config/file", {
	                method: "POST",
	                headers: { "Content-Type": "application/json" },
	                body: JSON.stringify({ token: WRITE_TOKEN, path: `tags/${cid}.json`, content })
	            });
	        }

	        // 3) Alarms: write alarms.json (root-level)
	        {
	            const alarms = Array.isArray(wsDraft.alarms) ? wsDraft.alarms.slice() : [];
	            alarms.sort((a, b) => String(a?.id || "").localeCompare(String(b?.id || ""), undefined, { numeric: true, sensitivity: "base" }));
	            const out = { alarms };
	            const content = JSON.stringify(out, null, 2) + "\n";
	            await wsApiJson("/config/file", {
	                method: "POST",
	                headers: { "Content-Type": "application/json" },
	                body: JSON.stringify({ token: WRITE_TOKEN, path: "alarms.json", content })
	            });
	        }

	        // 4) Deletes
	        const uniqueDeletes = [];
	        const seen = new Set();
	        wsPendingDeletes.forEach((d) => {
	            const p = String(d?.path || "").trim();
            if (!p) return;
            if (seen.has(p)) return;
            seen.add(p);
            uniqueDeletes.push(p);
        });
        for (const p of uniqueDeletes) {
            await wsApiJson("/config/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: WRITE_TOKEN, path: p })
            });
        }

	        wsPendingDeletes = [];
	        wsBase = wsDeepClone(wsDraft);
	        wsSetDirty(false);

	        if (reloadAfter) {
	            const ok = await reloadConfig();
	            if (ok) {
	                wsSetStatus("Saved + reloaded.", "status-ok");
	            } else {
	                wsSetStatus("Saved, but reload failed (see status).", "status-error");
	            }
	        } else {
	            wsSetStatus("Saved. Reload to apply changes.", "status-ok");
	        }
	    } catch (e) {
	        wsSetStatus("Save failed: " + e.toString(), "status-error");
	    } finally {
	        if (el.saveBtn) el.saveBtn.disabled = !wsDirty;
        if (el.saveReloadBtn) el.saveReloadBtn.disabled = false;
        if (el.discardBtn) el.discardBtn.disabled = !wsDirty;
    }
};

const wsDiscardChanges = async () => {
    if (!wsDirty) return;
    if (!confirm("Discard all unsaved changes?")) return;
    wsDraft = wsDeepClone(wsBase);
    wsPendingDeletes = [];
    wsSetDirty(false);
    wsSetStatus("Discarded changes.", "");
    wsSelectNode("ws:root");
};

// Live tags filtering (bottom table) — implemented by toggling <tr> visibility.
function filterLiveTagsByConnection(connectionId) {
    const tbody = document.getElementById("tags-tbody");
    const metaEl = document.getElementById("tags-meta");
    if (!tbody) return;
    const cid = String(connectionId || "").trim();
    const rows = Array.from(tbody.querySelectorAll("tr"));
    let shown = 0;
    rows.forEach((tr) => {
        const rowCid = tr.getAttribute("data-conn") || "";
        const show = !cid || rowCid === cid;
        tr.style.display = show ? "" : "none";
        if (show) shown += 1;
    });
    if (metaEl && cid) {
        metaEl.textContent = (metaEl.textContent || "").replace(/\s+\|\s+Filter:.*$/, "") + ` | Filter: ${cid} (${shown} shown)`;
    } else if (metaEl) {
        metaEl.textContent = (metaEl.textContent || "").replace(/\s+\|\s+Filter:.*$/, "");
    }
}

		const wsApplyLiveTagsFilterFromSelection = () => {
		    const node = wsNodeById.get(wsSelectedId);
		    let filterConn = "";
		    if (node && node.type === "device") filterConn = String(node.connection_id || "");
		    if (node && node.type === "tag") filterConn = String(node.connection_id || "");
		    if (node && node.type === "alarm") filterConn = String(node.connection_id || "");
		    filterLiveTagsByConnection(filterConn);
		};

	const wsWireUi = () => {
	    const el = wsEls();
	    if (el.saveBtn) el.saveBtn.addEventListener("click", () => {
	        if (!wsIsEditable()) return;
	        wsSaveAll({ reloadAfter: false });
	    });
	    if (el.saveReloadBtn) el.saveReloadBtn.addEventListener("click", () => {
	        if (!wsIsEditable()) return;
	        wsSaveAll({ reloadAfter: true });
	    });
	    if (el.discardBtn) el.discardBtn.addEventListener("click", () => {
	        if (!wsIsEditable()) return;
	        wsDiscardChanges();
	    });

    if (el.contextMenu) {
        document.addEventListener("click", () => wsHideContextMenu());
        window.addEventListener("blur", () => wsHideContextMenu());
        window.addEventListener("scroll", () => wsHideContextMenu(), true);
    }

    if (el.deviceCancelBtn) el.deviceCancelBtn.addEventListener("click", () => wsCloseModal(el.deviceModal));
    if (el.deviceSaveBtn) el.deviceSaveBtn.addEventListener("click", wsSaveDeviceFromModal);
    if (el.deviceModal) el.deviceModal.addEventListener("click", (e) => { if (e.target === el.deviceModal) wsCloseModal(el.deviceModal); });

	    if (el.tagCancelBtn) el.tagCancelBtn.addEventListener("click", () => wsCloseModal(el.tagModal));
	    if (el.tagSaveBtn) el.tagSaveBtn.addEventListener("click", wsSaveTagFromModal);
	    if (el.tagModal) el.tagModal.addEventListener("click", (e) => { if (e.target === el.tagModal) wsCloseModal(el.tagModal); });

	    if (el.alarmCancelBtn) el.alarmCancelBtn.addEventListener("click", () => wsCloseModal(el.alarmModal));
	    if (el.alarmSaveBtn) el.alarmSaveBtn.addEventListener("click", wsSaveAlarmFromModal);
	    if (el.alarmModal) el.alarmModal.addEventListener("click", (e) => { if (e.target === el.alarmModal) wsCloseModal(el.alarmModal); });
	};

		const wsInit = async () => {
		    const el = wsEls();
		    if (!el.tree || !el.tbody) return;

	    if (!wsLoadedOnce) {
	        wsWireUi();
	        wsLoadedOnce = true;
	    }

		    // If not logged in, keep the live tags panel but hide workspace config tree/details.
		    if (!wsIsEditable()) {
		        wsBase = { connections: [], tags: [], alarms: [] };
		        wsDraft = { connections: [], tags: [], alarms: [] };
		        wsPendingDeletes = [];
		        wsNodeById = new Map();
		        wsSetDirty(false);

		        if (el.treeStatus) el.treeStatus.textContent = "Admin login required to view workspace.";
		        if (el.tree) el.tree.textContent = "";
		        if (el.thead) el.thead.textContent = "";
		        if (el.tbody) el.tbody.textContent = "";
		        wsApplyEditability();
		        wsSetStatus("Read-only (admin login required to view/edit workspace).", "status-degraded");
		        return;
		    }

		    if (el.treeStatus) el.treeStatus.textContent = "Loading…";
		    wsSetStatus("", "");

		    try {
		        const data = await wsLoadWorkspaceFromServer();
	        wsBase = wsDeepClone(data);
	        wsDraft = wsDeepClone(data);
	        wsPendingDeletes = [];
	        wsSetDirty(false);
	        if (el.treeStatus) el.treeStatus.textContent = "";
	        wsSelectNode(wsSelectedId || "ws:root");
	        wsApplyEditability();
	        if (!wsIsEditable()) {
	            wsSetStatus("Read-only (admin login required to edit).", "status-degraded");
	        }
	    } catch (e) {
	        if (el.treeStatus) el.treeStatus.textContent = "Workspace unavailable: " + e.toString();
	        wsApplyEditability();
	        wsSetStatus("Workspace unavailable.", "status-error");
	    }
	};

function classForStatus(status) {
    if (!status) return "";
    if (status === "ok") return "status-ok";
    if (status === "degraded") return "status-degraded";
    return "status-error";
}

function formatTs(ms) {
    if (typeof ms !== "number") return "";
    try {
        const d = new Date(ms);
        return d.toLocaleString();
    } catch (e) {
        return "" + ms;
    }
}

function formatUptime(sec) {
    if (typeof sec !== "number") return "";
    const s = Math.floor(sec);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    const parts = [];
    if (d) parts.push(d + "d");
    if (h) parts.push(h + "h");
    if (m) parts.push(m + "m");
    parts.push(r + "s");
    return parts.join(" ");
}

async function refreshAdminStatus() {
    try {
        const wasEditable = !!(ADMIN_CONFIGURED && ADMIN_LOGGED_IN);
        const resp = await fetch("/auth/status", {
            method: "GET",
            headers: withAdminHeaders()
        });
	        const data = await resp.json();
	        ADMIN_CONFIGURED = !!(data.initialized ?? data.configured);
	        LEGACY_AUTH_PRESENT = !!data.legacy_admin_auth_present;
	        LEGACY_AUTH_CONFIGURED = !!data.legacy_admin_auth_configured;
	        USER_LOGGED_IN = !!(data.user_logged_in ?? data.logged_in);
	        USERNAME = USER_LOGGED_IN ? String(data?.user?.username || "admin").trim() : "";
	        USER_ROLE = USER_LOGGED_IN ? normalizeUserRole(data?.user?.role || (data.logged_in ? "admin" : "viewer")) : "viewer";
	        ADMIN_LOGGED_IN = !!(ADMIN_CONFIGURED && canEditWorkspace());

        // If server says "not logged in", drop any stale token we might have
        if (!USER_LOGGED_IN && !data.logged_in) {
            ADMIN_TOKEN = null;
            try {
                window.localStorage.removeItem(ADMIN_TOKEN_KEY);
            } catch (e) {
                console.warn("Unable to clear stale admin token from storage:", e);
            }
        }

        updateAdminUi();

        const isEditableNow = !!(ADMIN_CONFIGURED && ADMIN_LOGGED_IN);
        // If we're on /workspace and admin status just became editable, load the workspace tree now.
        if (isEditorPage() && !wasEditable && isEditableNow) {
            if (!wsDirty) {
                wsInit();
            } else {
                wsSetStatus("Admin login restored. Save/Discard to reload workspace.", "status-degraded");
                wsApplyEditability();
            }
        }
    } catch (e) {
        const s = document.getElementById("admin-status-text");
        if (s) s.textContent = "Admin status: error";
    }
}

	function updateAdminUi() {
    const statusEl = document.getElementById("admin-status-text");
    const loginBtn = document.getElementById("admin-login-button");
    const logoutBtn= document.getElementById("admin-logout-button");
    const chip     = document.getElementById("admin-chip");   // NEW

    if (!statusEl || !loginBtn || !logoutBtn) return;

		    if (!ADMIN_CONFIGURED) {
	        statusEl.textContent = LEGACY_AUTH_PRESENT
	          ? "Users not initialized (legacy password detected – migration required)."
	          : "Users not initialized (first-time setup required).";
	        loginBtn.textContent = LEGACY_AUTH_PRESENT ? "Migrate & initialize users" : "Initialize users";
	        loginBtn.style.display = "";
	        logoutBtn.style.display = "none";
	        chip.style.display = "none";   // NEW
	        disableAdminFeatures();

        // Hide config files when not configured
        const metaEl  = document.getElementById("config-meta");
        const tbodyEl = document.getElementById("config-tbody");
		        if (metaEl)  metaEl.textContent = "User initialization required.";
		        if (tbodyEl) tbodyEl.innerHTML  = "";

	        // Tag editor
	        {
	            const te = tagEditorEls();
	            TAG_EDITOR_OPEN = false;
	            if (te.wrapEl) te.wrapEl.style.display = "none";
	            if (te.toggleBtn) te.toggleBtn.textContent = "Open editor";
		            if (te.statusEl) {
		                te.statusEl.textContent = "User initialization required to edit tag config files.";
		                te.statusEl.className = "small";
		            }
	            tagEditorSetEnabled(false);
	        }

	        // Connection editor
	        {
	            const ce = connEditorEls();
	            CONN_EDITOR_OPEN = false;
	            if (ce.wrapEl) ce.wrapEl.style.display = "none";
	            if (ce.toggleBtn) ce.toggleBtn.textContent = "Open editor";
		            if (ce.statusEl) {
		                ce.statusEl.textContent = "User initialization required to edit connection config files.";
		                ce.statusEl.className = "small";
		            }
	            connEditorSetEnabled(false);
	        }
	    } else if (USER_LOGGED_IN) {
        statusEl.textContent = `Logged in as ${USERNAME || "?"} (${USER_ROLE}).`;
        loginBtn.style.display = "none";
        logoutBtn.style.display = "";
        chip.style.display = "inline-block";
        chip.textContent = `${USERNAME || "?"} (${USER_ROLE})`;

        if (canEditWorkspace()) {
            enableAdminFeatures();
            refreshConfigFiles();
        } else {
            disableAdminFeatures();
            const metaEl  = document.getElementById("config-meta");
            const tbodyEl = document.getElementById("config-tbody");
            if (metaEl) metaEl.textContent = "Editor+ login required to view/edit config files.";
            if (tbodyEl) tbodyEl.innerHTML = "";
        }

        // Tag editor
        {
            const te = tagEditorEls();
            TAG_EDITOR_OPEN = false;
            if (te.wrapEl) te.wrapEl.style.display = "none";
            if (te.toggleBtn) te.toggleBtn.textContent = "Open editor";
            if (te.statusEl) {
                te.statusEl.textContent = canEditWorkspace()
                  ? "Ready. Click 'Open editor' to load tag files."
                  : "Editor+ login required to edit tag config files.";
                te.statusEl.className = "small";
            }
            tagEditorSetEnabled(canEditWorkspace());
        }

        // Connection editor
        {
            const ce = connEditorEls();
            CONN_EDITOR_OPEN = false;
            if (ce.wrapEl) ce.wrapEl.style.display = "none";
            if (ce.toggleBtn) ce.toggleBtn.textContent = "Open editor";
            if (ce.statusEl) {
                ce.statusEl.textContent = canEditWorkspace()
                  ? "Ready. Click 'Open editor' to load connection files."
                  : "Editor+ login required to edit connection config files.";
                ce.statusEl.className = "small";
            }
            connEditorSetEnabled(canEditWorkspace());
        }
	    } else {
        statusEl.textContent = "Not logged in. (Tip: use the same hostname in all apps for cookie SSO.)";
        loginBtn.textContent = "Admin login";
        loginBtn.style.display = "";
        logoutBtn.style.display = "none";
        chip.style.display = "none";   // NEW
        disableAdminFeatures();

        const metaEl  = document.getElementById("config-meta");
        const tbodyEl = document.getElementById("config-tbody");
	        if (metaEl)  metaEl.textContent = "Admin login required to view config files.";
	        if (tbodyEl) tbodyEl.innerHTML  = "";

	        // Tag editor
	        {
	            const te = tagEditorEls();
	            TAG_EDITOR_OPEN = false;
	            if (te.wrapEl) te.wrapEl.style.display = "none";
	            if (te.toggleBtn) te.toggleBtn.textContent = "Open editor";
	            if (te.statusEl) {
	                te.statusEl.textContent = "Admin login required to edit tag config files.";
	                te.statusEl.className = "small";
	            }
	            tagEditorSetEnabled(false);
	        }

	        // Connection editor
	        {
	            const ce = connEditorEls();
	            CONN_EDITOR_OPEN = false;
	            if (ce.wrapEl) ce.wrapEl.style.display = "none";
	            if (ce.toggleBtn) ce.toggleBtn.textContent = "Open editor";
	            if (ce.statusEl) {
	                ce.statusEl.textContent = "Admin login required to edit connection config files.";
	                ce.statusEl.className = "small";
	            }
	            connEditorSetEnabled(false);
	        }
	    }
	}

function disableAdminFeatures() {
    const reloadBtn = document.getElementById("reload-button");
    if (reloadBtn) reloadBtn.disabled = true;
    // You can also disable config upload buttons, CA upload, backup buttons, etc.
}

function enableAdminFeatures() {
    const reloadBtn = document.getElementById("reload-button");
    if (reloadBtn && !reloadBtn.dataset.reloading) reloadBtn.disabled = false;
}

	function showAdminLogin() {
	    if (!ADMIN_CONFIGURED) {
	        openAdminModal("init");
	    } else {
	        openAdminModal("login");
	    }
	}

async function adminLogout() {
    try {
        await fetch("/auth/logout", {
            method: "POST",
            headers: withAdminHeaders(),
            body: "{}"
        });
    } catch (e) {
        // ignore
    }
    ADMIN_TOKEN = null;
    ADMIN_LOGGED_IN = false;
    USER_LOGGED_IN = false;
    USERNAME = "";
    USER_ROLE = "viewer";
    persistAdminToken();   // <-- clear localStorage
    await refreshAdminStatus();
    updateAdminUi();
}

async function viewConfigFile(path) {
    const viewer    = document.getElementById("config-viewer");
    const titleEl   = document.getElementById("config-viewer-title");
    const bodyEl    = document.getElementById("config-viewer-body");
    const statusEl  = document.getElementById("config-status");

    if (!viewer || !titleEl || !bodyEl) {
        if (statusEl) statusEl.textContent = "Viewer elements not found.";
        return;
    }

	    try {
	        const resp = await fetch("/config/file?path=" + encodeURIComponent(path), {
	            method: "GET",
	            headers: withAdminHeaders()
	        });
	        if (!resp.ok) {
	            const text = await resp.text();
	            if (statusEl) {
	                statusEl.textContent = "View failed (" + resp.status + "): " + text;
	            }
            return;
        }

        const txt = await resp.text();
        titleEl.textContent = "Viewing: " + path;
        bodyEl.textContent  = txt;
        viewer.style.display = "block";
    } catch (e) {
        if (statusEl) {
            statusEl.textContent = "View exception: " + e.toString();
        }
    }
}

function closeConfigViewer() {
    const viewer = document.getElementById("config-viewer");
    if (viewer) viewer.style.display = "none";
}

async function deleteConfigFile(path) {
    const statusEl      = document.getElementById("config-status");
    const reloadStatus  = document.getElementById("reload-status");

    if (!confirm("Delete config file '" + path + "'? This only removes it from disk; " +
                 "you must click Reload to apply changes.")) {
        return;
    }

    if (statusEl) {
        statusEl.textContent = "Deleting " + path + " ...";
    }

	    try {
	        const headers = withAdminHeaders({ "Content-Type": "application/json" });
	        const resp = await fetch("/config/delete", {
	            method: "POST",
	            headers,
	            body: JSON.stringify({
	                token: WRITE_TOKEN,
	                path:  path
	            })
        });

        const data = await resp.json();

        if (!resp.ok || !data.ok) {
            if (statusEl) {
                statusEl.textContent =
                    "Delete failed: " + (data.error || ("HTTP " + resp.status));
            }
            return;
        }

        if (statusEl) {
            statusEl.textContent = "Deleted " + path + ".";
        }

        // Nudge user to reload
        if (reloadStatus) {
            reloadStatus.textContent =
                "Config changed (file deleted). Click 'Reload config' when ready.";
            reloadStatus.className = "small status-degraded";
        }

        // Refresh the list to remove it from the table
        refreshConfigFiles();
    } catch (e) {
        if (statusEl) {
            statusEl.textContent = "Delete exception: " + e.toString();
        }
    }
}

// ------------------------------
// Config bundle backup/restore
// ------------------------------
	async function downloadConfigBundle() {
	    const statusEl = document.getElementById("bundle-status");
	    statusEl.textContent = "Building bundle...";
	    try {
	        const resp = await fetch("/config/bundle", {
	            method: "GET",
	            headers: withAdminHeaders()
	        });
	        const data = await resp.json();
	        if (!data.ok) {
	            statusEl.textContent = "Bundle download failed: " + (data.error || "unknown error");
	            statusEl.className = "small status-error";
	            return;
        }

        const bundleJson = JSON.stringify(data.bundle, null, 2);
        const blob = new Blob([bundleJson], { type: "application/json" });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const now = new Date();
        const stamp = now.toISOString().replace(/[:.]/g, "-");
        a.href = url;
        a.download = "opcbridge-config-bundle-" + stamp + ".json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        statusEl.textContent = "Bundle downloaded.";
        statusEl.className = "small status-ok";
    } catch (e) {
        statusEl.textContent = "Bundle download error: " + e.toString();
        statusEl.className = "small status-error";
    }
}

let g_bundleFile = null;

document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("bundle-file");
    if (fileInput) {
        fileInput.addEventListener("change", () => {
            const statusEl = document.getElementById("bundle-status");
            const nameEl   = document.getElementById("bundle-file-name");
            if (fileInput.files && fileInput.files.length > 0) {
                g_bundleFile = fileInput.files[0];
                nameEl.textContent = "Selected: " + g_bundleFile.name;
                statusEl.textContent = "";
                statusEl.className = "small";
            } else {
                g_bundleFile = null;
                nameEl.textContent = "No file selected.";
            }
        });
    }
});

	async function uploadConfigBundle() {
    const statusEl = document.getElementById("bundle-status");
    const nameEl   = document.getElementById("bundle-file-name");

    if (!g_bundleFile) {
        statusEl.textContent = "No bundle file selected.";
        statusEl.className = "small status-error";
        return;
    }

    statusEl.textContent = "Uploading and applying bundle...";
    statusEl.className   = "small";

    try {
        const text = await g_bundleFile.text();
        let bundle;
        try {
            bundle = JSON.parse(text);
        } catch (e) {
            statusEl.textContent = "Selected file is not valid JSON: " + e.toString();
            statusEl.className = "small status-error";
            return;
        }

	        const headers = withAdminHeaders({ "Content-Type": "application/json" });
	        const resp = await fetch("/config/bundle", {
	            method: "POST",
	            headers,
	            body: JSON.stringify({ bundle: bundle })
	        });

        const data = await resp.json();
        if (!data.ok) {
            statusEl.textContent = "Bundle apply failed: " + (data.error || "unknown error");
            statusEl.className = "small status-error";
            return;
        }

        statusEl.textContent = data.message || "Bundle applied successfully. Remember to click Reload.";
        statusEl.className   = "small status-ok";

        // Optionally refresh info so counts etc. update after user reloads.
    } catch (e) {
        statusEl.textContent = "Bundle upload error: " + e.toString();
        statusEl.className   = "small status-error";
    }
}

function makeTagKey(connId, tagName) {
    return (connId || "") + ":" + (tagName || "");
}

	function indexTagRows() {
	    const tbody = document.getElementById("tags-tbody");
	    g_tagCellsByKey = new Map();
	    if (!tbody) return;

	    const rows = tbody.querySelectorAll("tr");
	    for (const tr of rows) {
	        const tds = tr.querySelectorAll("td");
	        // Columns: Connection, Name, Datatype, Quality, Value, Writable, Action, Timestamp
	        if (tds.length < 8) continue;
	        const connId = tds[0].textContent || "";
	        const tagName = tds[1].textContent || "";
	        const key = makeTagKey(connId, tagName);
	        g_tagCellsByKey.set(key, {
	            qualEl: tds[3],
	            valueEl: tds[4],
	            tsEl: tds[7]
	        });
	    }
	}

function wsUrl() {
    const proto = (window.location.protocol === "https:") ? "wss" : "ws";
    const host = window.location.hostname;
    return proto + "://" + host + ":" + WS_PORT + "/";
}

	function scheduleWsReconnect() {
	    if (!WS_ENABLED || WS_CONNECTED) return;
	    if (document.hidden) return;
	    if (g_wsReconnectTimer) return;
	    g_wsReconnectTimer = setTimeout(() => {
	        g_wsReconnectTimer = null;
	        connectWs();
	    }, 5000);
	}

	function wsSubscribeCurrentTags() {
	    if (!WS_ENABLED || !WS_CONNECTED) return;
	    if (!g_ws || g_ws.readyState !== WebSocket.OPEN) return;
	    if (!g_tagCellsByKey || g_tagCellsByKey.size === 0) return;
	    try {
	        const tags = Array.from(g_tagCellsByKey.keys());
	        g_ws.send(JSON.stringify({ type: "subscribe", tags }));
	    } catch (_) {
	        // ignore
	    }
	}

	function connectWs() {
	    if (!WS_ENABLED || WS_CONNECTED) return;
	    if (g_ws && (g_ws.readyState === WebSocket.OPEN || g_ws.readyState === WebSocket.CONNECTING)) {
	        return;
	    }

    const url = wsUrl();
    try {
        g_ws = new WebSocket(url);
    } catch (e) {
        scheduleWsReconnect();
        return;
    }

	    g_ws.onopen = () => {
	        WS_CONNECTED = true;
	        const metaEl = document.getElementById("tags-meta");
	        if (metaEl) metaEl.textContent = (metaEl.textContent || "") + " | WS: connected";
	        wsSubscribeCurrentTags();
	    };

    g_ws.onclose = () => {
        WS_CONNECTED = false;
        scheduleWsReconnect();
    };

    g_ws.onerror = () => {
        // onclose will typically follow
    };

    g_ws.onmessage = (ev) => {
        let msg = null;
        try {
            msg = JSON.parse(ev.data);
        } catch (_) {
            return;
        }

        if (!msg || msg.type !== "tag_update") return;

        const key = makeTagKey(msg.connection_id, msg.name);
        const rec = g_tagCellsByKey.get(key);
        if (!rec) return;

        const qual = (msg.quality === 1 || msg.quality === "good") ? "good" : "bad";
        const qCls = qual === "good" ? "status-ok" : "status-error";
        rec.qualEl.className = qCls;
        rec.qualEl.textContent = qual.toUpperCase();

        const val = (msg.value === null || typeof msg.value === "undefined") ? "" : msg.value;
        rec.valueEl.textContent = "" + val;

        rec.tsEl.textContent = formatTs(msg.timestamp_ms);
    };
}

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        connectWs();
    }
});

		function isEditorPage() {
		    return window.location.pathname === "/workspace";
		}

	function applyPageMode() {
	    const dash = document.getElementById("dashboard-section");
	    const editors = document.getElementById("editors-section");
	    if (!dash || !editors) return;

	    const moveLiveTagsPanel = () => {
	        const panel = document.getElementById("live-tags-panel");
	        if (!panel) return;
	        const host = isEditorPage()
	            ? document.getElementById("workspace-live-tags-host")
	            : document.getElementById("dashboard-live-tags-host");
	        if (!host) return;
	        if (panel.parentElement !== host) host.appendChild(panel);
	    };

	    if (isEditorPage()) {
	        document.body.classList.add("is-editor-page");
	        dash.style.display = "none";
	        editors.style.display = "";
	        moveLiveTagsPanel();
	    } else {
	        document.body.classList.remove("is-editor-page");
	        dash.style.display = "";
	        editors.style.display = "none";
	        moveLiveTagsPanel();
	    }
	}

async function refreshInfo() {
    const nameVerEl      = document.getElementById("info-name-version");
    const buildEl        = document.getElementById("info-build");
    const uptimeEl       = document.getElementById("info-uptime");
    const authEl         = document.getElementById("info-write-auth");
    const tlsEl          = document.getElementById("info-mqtt-tls");  // NEW
    const reloadBtn      = document.getElementById("reload-button");
    const reloadStatusEl = document.getElementById("reload-status");
    const infoConnEl     = document.getElementById("info-connections");
    const infoTagsEl     = document.getElementById("info-tags");
    const connMetaEl     = document.getElementById("conn-summary-meta");
    const connBodyEl     = document.getElementById("conn-summary-body");

	    try {
	        const resp = await fetch("/info");
	        const data = await resp.json();

        const name    = data.name    || "opcbridge";
        const version = data.version || "unknown";
        const suiteVersion = data.suite_version || "";
        const bdate   = data.build_date || "";
        const btime   = data.build_time || "";
        const wa      = data.write_auth || {};
        const up      = data.uptime_seconds;
        const numConn   = (typeof data.num_connections === "number") ? data.num_connections : 0;
        const totalTags = (typeof data.total_tags === "number") ? data.total_tags : 0;
	        const connSummary = data.connections_summary || [];
	        const ws = data.ws || {};

		        nameVerEl.textContent = name + " v" + version + ((suiteVersion && suiteVersion !== version) ? (" (suite " + suiteVersion + ")") : "");
        buildEl.textContent   = "Built: " + bdate + " " + btime;
        uptimeEl.textContent  = "Uptime: " + (typeof up === "number" ? formatUptime(up) : "n/a");

        infoConnEl.textContent = "Connections: " + numConn;
        infoTagsEl.textContent = "Total tags: " + totalTags;

        connMetaEl.textContent = "Connections: " + numConn + " | Tags: " + totalTags;
        const lines = [];
        for (const c of connSummary) {
            const id  = c.id || "(unnamed)";
            const tct = (typeof c.tag_count === "number") ? c.tag_count : 0;
            lines.push(id + ": " + tct + " tag" + (tct === 1 ? "" : "s"));
        }
        connBodyEl.innerHTML = lines.join("<br>");

        const source = wa.source || "auto";
        const envVar = wa.env_var || "OPCBRIDGE_WRITE_TOKEN";
        const hasTok = (wa.has_token === true);

	        authEl.textContent =
	            "Writes: " +
	            (hasTok ? "enabled (" + source + ", " + envVar + ")" : "disabled (no token)");

	        // WS settings (if enabled)
	        WS_ENABLED = !!ws.enabled;
	        if (typeof ws.port === "number") {
	            WS_PORT = ws.port;
	        }
	        connectWs();

        // --- NEW: MQTT / TLS / CA cert status ---
        if (tlsEl) {
            const mtls          = data.mqtt_tls || {};
            const mqttEnabled   = !!mtls.mqtt_enabled;
            const tlsEnabled    = !!mtls.tls_enabled;
            const cafile        = mtls.cafile || "";
            const cafileResolved= mtls.cafile_resolved || cafile;
            const cafilePresent = (mtls.cafile_present === true);
            const mtimeMs       = (typeof mtls.cafile_mtime_ms === "number")
                                  ? mtls.cafile_mtime_ms
                                  : null;

            let text = "MQTT TLS: ";
            let cls  = "small";

            if (!mqttEnabled) {
                text += "disabled (MQTT disabled)";
            } else if (!tlsEnabled) {
                text += "disabled";
            } else {
                text += "enabled";
                if (cafileResolved) {
                    text += " • CA: " + cafileResolved;
                    if (cafilePresent) {
                        text += " (present)";
                    } else {
                        text += " (MISSING)";
                        cls += " status-error";
                    }
                } else {
                    text += " • CA: (none configured)";
                    cls += " status-error";
                }

                if (mtimeMs) {
                    text += " • updated " + formatTs(mtimeMs);
                }
            }

            tlsEl.textContent = text;
            tlsEl.className   = cls;
        }

        if (!hasTok) {
            reloadBtn.disabled = true;
            reloadStatusEl.textContent = "Reload disabled: no write token configured.";
            reloadStatusEl.className = "small status-error";
        } else {
            if (!reloadBtn.dataset.reloading) {
                reloadBtn.disabled = false;
            }
            if (!reloadStatusEl.textContent) {
                reloadStatusEl.textContent = "Reload is available.";
                reloadStatusEl.className = "small";
            }
        }
    } catch (e) {
        nameVerEl.textContent      = "Error loading /info";
        buildEl.textContent        = e.toString();
        uptimeEl.textContent       = "";
        infoConnEl.textContent     = "";
        infoTagsEl.textContent     = "";
        authEl.textContent         = "";
        if (tlsEl) {
            tlsEl.textContent   = "";
            tlsEl.className     = "small";
        }
        connMetaEl.textContent     = "Connections: n/a";
        connBodyEl.textContent     = "";
        reloadBtn.disabled         = true;
        reloadStatusEl.textContent = "Reload disabled due to /info error.";
        reloadStatusEl.className   = "small status-error";
    }
}

async function refreshHealth() {
    const overallEl = document.getElementById("health-overall");
    const connEl    = document.getElementById("health-connections");
    try {
        const resp = await fetch("/health");
        const data = await resp.json();

        const status = data.status || "error";
        overallEl.textContent = "Status: " + status.toUpperCase();
        overallEl.className   = classForStatus(status);

        const conns = data.connections || {};
        const lines = [];
	        for (const [cid, info] of Object.entries(conns)) {
	            const st = info.status || "unknown";
	            const reason = info.reason ? (" - " + info.reason) : "";
	            const ratio = (typeof info.stale_ratio === "number")
	                ? (" (" + Math.round(info.stale_ratio * 100) + "% stale/bad)")
	                : "";
	            const seen = (typeof info.tags_seen === "number") ? info.tags_seen : null;
	            const good = (typeof info.good_recent === "number") ? info.good_recent : null;
	            const age  = (typeof info.newest_age_ms === "number") ? info.newest_age_ms : null;
	            let details = "";
	            if (seen !== null && good !== null) {
	                details += " • " + good + "/" + seen + " good recent";
	            }
	            if (age !== null) {
	                details += " • newest " + age + " ms";
	            }
	            const cls = classForStatus(st);
	            lines.push(
	                "<div class='" + cls + "'>" +
	                cid + ": " + st.toUpperCase() + reason + ratio + details +
	                "</div>"
	            );
	        }
        connEl.innerHTML = lines.join("");
    } catch (e) {
        overallEl.textContent = "Status: ERROR (exception)";
        overallEl.className   = "status-error";
        connEl.textContent    = e.toString();
    }
}

// Upload MQTT CA certificate (uses /config/cert/upload?token=WRITE_TOKEN)
async function uploadCaCert() {
    const fileInput  = document.getElementById("mqtt-ca-file");
    const statusEl   = document.getElementById("mqtt-ca-status");
    const uploadBtn  = document.getElementById("mqtt-ca-upload-btn");

    if (!fileInput || !statusEl || !uploadBtn) return;

    if (!fileInput.files || fileInput.files.length === 0) {
        statusEl.textContent = "Please choose a certificate file first.";
        statusEl.className   = "small status-error";
        return;
    }

    const file = fileInput.files[0];

    statusEl.textContent = "Uploading CA certificate...";
    statusEl.className   = "small";
    uploadBtn.disabled   = true;

    try {
        const url = "/config/cert/upload?token=" +
                    encodeURIComponent(WRITE_TOKEN);

	        const resp = await fetch(url, {
	            method: "POST",
	            headers: withAdminHeaders(),
	            body: file
	        });

        let data = {};
        try {
            data = await resp.json();
        } catch (_) {
            // If server ever returns plain text instead of JSON, don't crash
            data = {};
        }

        if (!resp.ok || data.ok === false) {
            const errMsg = (data && data.error) ? data.error : resp.statusText;
            statusEl.textContent = "Upload failed: " + errMsg;
            statusEl.className   = "small status-error";
        } else {
            statusEl.textContent = data.message || "CA certificate uploaded successfully.";
            statusEl.className   = "small status-ok";
            // Refresh top-level TLS info / mtime, etc.
            await refreshInfo();
        }
    } catch (e) {
        statusEl.textContent = "Upload exception: " + e.toString();
        statusEl.className   = "small status-error";
    } finally {
        uploadBtn.disabled = false;
    }
}

	// Download current MQTT CA certificate (if present)
	async function downloadCaCert() {
	    const statusEl = document.getElementById("mqtt-ca-status");
	    try {
	        const resp = await fetch("/config/cert/download", {
	            method: "GET",
	            headers: withAdminHeaders()
	        });
	        if (!resp.ok) {
	            const text = await resp.text();
	            if (statusEl) {
	                statusEl.textContent = "Download failed (" + resp.status + "): " + text;
	                statusEl.className   = "small status-error";
	            }
	            return;
	        }

	        const blob = await resp.blob();
	        const url = URL.createObjectURL(blob);
	        const a = document.createElement("a");
	        a.href = url;
	        a.download = "ca.crt";
	        document.body.appendChild(a);
	        a.click();
	        document.body.removeChild(a);
	        URL.revokeObjectURL(url);
	    } catch (e) {
	        if (statusEl) {
	            statusEl.textContent = "Download exception: " + e.toString();
	            statusEl.className   = "small status-error";
	        }
	    }
	}

async function doWrite(connectionId, tagName) {
    const writeStatus = document.getElementById("write-status");

    if (!canWriteTags()) {
        writeStatus.textContent = "Write blocked: login required (operator+).";
        writeStatus.className   = "small status-error";
        return;
    }

    const value = window.prompt("Enter new value for " + connectionId + " / " + tagName + ":");
    if (value === null) {
        return;
    }
    writeStatus.textContent = "Writing " + connectionId + " / " + tagName + " ...";
    writeStatus.className   = "small";
    try {
        const headers = withAdminHeaders({ "Content-Type": "application/json" });
        const resp = await fetch("/write", {
            method: "POST",
            headers,
            body: JSON.stringify({
                connection_id: connectionId,
                name: tagName,
                value: value,
                token: WRITE_TOKEN   // still there for legacy
            })
        });
        const data = await resp.json();
        if (data.ok) {
            writeStatus.textContent = "Write OK: " + connectionId + " / " + tagName + " := " + value;
        } else {
            writeStatus.textContent = "Write FAILED: " + (data.error || "unknown error");
        }
    } catch (e) {
        writeStatus.textContent = "Write exception: " + e.toString();
    }
    refreshTags();
}

		async function refreshTags(force = false) {
		    const metaEl = document.getElementById("tags-meta");
		    const tbody  = document.getElementById("tags-tbody");
		    if (document.hidden) return;
		    if (!force && WS_CONNECTED && g_tagCellsByKey && g_tagCellsByKey.size > 0) {
		        return; // WS will deliver incremental updates
		    }
		    if (g_tagsFetchInFlight) return;
		    try {
	        g_tagsFetchInFlight = true;
	        const t0 = performance.now();
	        const resp = await fetch("/tags");
	        const data = await resp.json();
	        const t1 = performance.now();

		        const tags = data.tags || [];
		        const missing = tags.filter(t => t && t.has_snapshot === false).length;
		        const badHandles = tags.filter(t => t && t.handle_ok === false).length;
		        metaEl.textContent = "Count: " + tags.length +
		            " | Missing: " + missing +
		            " | Bad handles: " + badHandles +
		            " | Last fetch: " + (t1 - t0).toFixed(1) + " ms";

	        const rows = [];
	        for (const t of tags) {
	            const hasSnap = (t.has_snapshot !== false);
	            const handleOk = (t.handle_ok !== false);

	            let qual = "bad";
	            let qCls = "status-error";
	            if (!handleOk) {
	                qual = "bad_handle";
	            } else if (!hasSnap) {
	                qual = "missing";
	            } else if (t.quality === 1 || t.quality === "good") {
	                qual = "good";
	                qCls = "status-ok";
	            }

	            const ts   = (hasSnap && t.timestamp_ms !== null && typeof t.timestamp_ms !== "undefined")
	                ? formatTs(t.timestamp_ms)
	                : "n/a";
	            const val  = (t.value === null || typeof t.value === "undefined") ? "" : t.value;
	            const writable = !!t.writable;
	            const writeBtn = writable
	                ? ("<button class='btn-write' onclick=\"doWrite('" +
                   (t.connection_id || "") + "','" +
                   (t.name || "") + "')\">Write</button>")
                : "";

		            const connId = (t.connection_id || "");
		            rows.push(
		                "<tr data-conn=\"" + connId + "\">" +
		                "<td>" + (t.connection_id || "") + "</td>" +
		                "<td>" + (t.name || "") + "</td>" +
		                "<td>" + (t.datatype || "") + "</td>" +
		                "<td class='" + qCls + "'>" + qual.toUpperCase() + "</td>" +
		                "<td>" + val + "</td>" +
		                "<td>" + (writable ? "yes" : "no") + "</td>" +
		                "<td>" + writeBtn + "</td>" +
		                "<td>" + ts + "</td>" +
		                "</tr>"
		            );
	        }
			        tbody.innerHTML = rows.join("");
			        indexTagRows();
			        wsSubscribeCurrentTags();
			        if (isEditorPage()) {
			            wsApplyLiveTagsFilterFromSelection();
			        }
			        return { count: tags.length, missing, badHandles };
			    } catch (e) {
			        metaEl.textContent = "Error fetching tags: " + e.toString();
			        tbody.innerHTML = "";
			        g_tagCellsByKey = new Map();
			        return null;
		    } finally {
	        g_tagsFetchInFlight = false;
	    }
	}

	function scheduleTagsRefreshUntilNoMissing({ maxTries = 6, delayMs = 750 } = {}) {
	    if (g_tagsMissingRefreshTimer) return;
	    let tries = 0;

	    const tick = async () => {
	        g_tagsMissingRefreshTimer = null;
	        if (document.hidden) return;
	        tries += 1;
	        const r = await refreshTags(true);
	        if (!r) return;
	        if (r.missing <= 0) return;
	        if (tries >= maxTries) return;
	        g_tagsMissingRefreshTimer = setTimeout(tick, delayMs);
	    };

	    g_tagsMissingRefreshTimer = setTimeout(tick, delayMs);
	}

	async function reloadConfig() {
    const btn      = document.getElementById("reload-button");
    const statusEl = document.getElementById("reload-status");
    const lastEl   = document.getElementById("reload-last");

    const setStatus = (msg, cls) => {
        if (statusEl) {
            statusEl.textContent = msg;
            statusEl.className = "small" + (cls ? (" " + cls) : "");
        } else if (isEditorPage()) {
            wsSetStatus(msg, cls || "");
        }
    };

    setStatus("Reloading config...", "");
    if (btn) {
        btn.disabled = true;
        btn.dataset.reloading = "1";
    }

    try {
        const resp = await fetch("/reload", {
            method: "POST",
            headers: withAdminHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ token: WRITE_TOKEN })
        });
        const data = await resp.json();
        if (data.ok) {
            setStatus("Reload OK: " + (data.message || ""), "status-ok");
            const now = new Date();
            if (lastEl) {
                lastEl.textContent = "Last successful reload: " + now.toLocaleString();
                lastEl.className   = "small";
            }
            await refreshInfo();
            await refreshHealth();
            const tagCounts = await refreshTags(true);
            if (tagCounts && tagCounts.missing > 0) {
                scheduleTagsRefreshUntilNoMissing();
            }
            await refreshAlarms();
            if (isEditorPage()) {
                // Refresh workspace config view after reload so the tree/properties reflect what's on disk.
                wsInit();
            }
            return true;
        } else {
            setStatus("Reload FAILED: " + (data.error || "unknown error"), "status-error");
            return false;
        }
    } catch (e) {
        setStatus("Reload exception: " + e.toString(), "status-error");
        return false;
    } finally {
        if (btn) {
            btn.disabled = false;
            delete btn.dataset.reloading;
        }
    }
}

// NEW: alarms/event log
async function refreshAlarms() {
    const metaEl = document.getElementById("alarms-meta");
    const bodyEl = document.getElementById("alarms-body");
    if (!metaEl || !bodyEl) return; // card not on this page

    try {
        const resp = await fetch("/alarms/events?limit=50");
        const data = await resp.json();
        const events = Array.isArray(data.events) ? data.events : [];

        metaEl.textContent = "Recent events: " + events.length;

        if (!events.length) {
            bodyEl.textContent = "No recent events.";
            return;
        }

        const lines = [];
        for (const ev of events) {
            const ts   = formatTs(ev.timestamp_ms);
            const conn = ev.connection_id || "";
            const tag  = ev.tag_name || "";
            const nv   = (ev.new_value === null || typeof ev.new_value === "undefined") ? "" : ev.new_value;
            const ov   = (ev.old_value === null || typeof ev.old_value === "undefined") ? "" : ev.old_value;

            const oq   = (typeof ev.old_quality === "number") ? ev.old_quality : null;
            const nq   = (typeof ev.new_quality === "number") ? ev.new_quality : null;
            const qStr =
                (oq === null ? "-" : oq) + " → " +
                (nq === null ? "-" : nq);

            lines.push(
                ts + " — [" + conn + "." + tag + "] " +
                ov + " → " + nv + " (q: " + qStr + ")"
            );
        }

        bodyEl.innerHTML = lines.join("<br>");
    } catch (e) {
        metaEl.textContent = "Error loading alarms: " + e.toString();
        bodyEl.textContent = "";
    }
}

// ---------------------------
// Alarms editor (alarms.json)
// ---------------------------
let g_alarmsEditorOpen = false;

function toggleAlarmsEditor() {
    const wrap = document.getElementById("alarms-editor-wrap");
    const btn  = document.getElementById("alarms-editor-toggle-btn");
    const statusEl = document.getElementById("alarms-editor-status");
    if (!wrap || !btn) return;

    if (!ADMIN_CONFIGURED || !ADMIN_LOGGED_IN) {
        if (statusEl) {
            statusEl.textContent = "Admin login required to edit alarms.json.";
            statusEl.className   = "small status-error";
        }
        return;
    }

    g_alarmsEditorOpen = !g_alarmsEditorOpen;
    wrap.style.display = g_alarmsEditorOpen ? "" : "none";
    btn.textContent = g_alarmsEditorOpen ? "Close editor" : "Open editor";

    if (g_alarmsEditorOpen) {
        alarmsEditorLoad();
    }
}

async function alarmsEditorLoad() {
    const statusEl = document.getElementById("alarms-editor-status");
    const metaEl   = document.getElementById("alarms-editor-meta");
    const ta       = document.getElementById("alarms-edit-json");
    if (!statusEl || !metaEl || !ta) return;

    if (!ADMIN_CONFIGURED || !ADMIN_LOGGED_IN) {
        statusEl.textContent = "Admin login required to load alarms.json.";
        statusEl.className   = "small status-error";
        return;
    }

    statusEl.textContent = "Loading alarms.json...";
    statusEl.className   = "small";

    try {
        const resp = await fetch("/config/alarms", {
            method: "GET",
            headers: withAdminHeaders()
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
            throw new Error((data && data.error) ? data.error : ("HTTP " + resp.status));
        }

        const cfg = data.json || { rules: [] };
        const rules = Array.isArray(cfg.rules) ? cfg.rules : [];
        const mtime = (typeof data.mtime_ms === "number") ? formatTs(data.mtime_ms) : "(missing)";
        metaEl.textContent = "File: alarms.json • Rules: " + rules.length + " • Modified: " + mtime;

        ta.value = JSON.stringify(cfg, null, 2) + "\n";
        statusEl.textContent = "Loaded alarms.json.";
        statusEl.className   = "small status-ok";
    } catch (e) {
        statusEl.textContent = "Load failed: " + e.toString();
        statusEl.className   = "small status-error";
    }
}

async function alarmsEditorSave(reloadAfter) {
    const statusEl = document.getElementById("alarms-editor-status");
    const ta       = document.getElementById("alarms-edit-json");
    if (!statusEl || !ta) return;

    if (!ADMIN_CONFIGURED || !ADMIN_LOGGED_IN) {
        statusEl.textContent = "Admin login required to save alarms.json.";
        statusEl.className   = "small status-error";
        return;
    }
    if (!WRITE_TOKEN) {
        statusEl.textContent = "Save blocked: write token missing.";
        statusEl.className   = "small status-error";
        return;
    }

    statusEl.textContent = "Saving alarms.json...";
    statusEl.className   = "small";

    try {
        const parsed = JSON.parse(ta.value);
        const out = JSON.stringify(parsed, null, 2) + "\n";

        const headers = withAdminHeaders({ "Content-Type": "application/json" });
        const resp = await fetch("/config/file", {
            method: "POST",
            headers,
            body: JSON.stringify({
                token: WRITE_TOKEN,
                path: "alarms.json",
                content: out
            })
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
            throw new Error((data && data.error) ? data.error : ("HTTP " + resp.status));
        }

        statusEl.textContent = "Saved alarms.json.";
        statusEl.className   = "small status-ok";
        refreshConfigFiles();
        if (reloadAfter) {
            await reloadConfig();
        }
    } catch (e) {
        statusEl.textContent = "Save failed: " + e.toString();
        statusEl.className   = "small status-error";
    }
}

// ---------------------------
// "New config file" helpers
// ---------------------------

// User clicks "Find File"
function chooseNewConfigFile() {
    const input = document.getElementById("config-new-file-input");
    const statusEl = document.getElementById("config-status");

    if (!input) {
        if (statusEl) statusEl.textContent = "Internal error: new-file input missing.";
        return;
    }

    // Clear any old file selection
    g_newConfigFile = null;
    input.value = "";
    input.click();
}

// Called when user picks a file in the "Find File" dialog
function onNewConfigFileSelected(evt) {
    const file = evt.target.files && evt.target.files[0];
    const statusEl = document.getElementById("config-status");
    const nameInput = document.getElementById("config-new-name");

    if (!file) {
        if (statusEl) statusEl.textContent = "No file selected.";
        return;
    }

    g_newConfigFile = file;

    if (nameInput) {
        nameInput.value = file.name;
    }

    if (statusEl) {
        statusEl.textContent = "Selected file: " + file.name +
            ". Click 'Upload' to send it.";
    }
}

// User clicks "Upload" after selecting a new file
async function uploadNewConfigFile() {
    const kindSelect = document.getElementById("config-new-kind");
    const nameInput  = document.getElementById("config-new-name");
    const statusEl   = document.getElementById("config-status");

    if (!kindSelect || !nameInput) {
        if (statusEl) statusEl.textContent = "Config upload controls not found.";
        return;
    }

    const kind = kindSelect.value;         // "connection" | "tags" | "mqtt" | "mqtt_inputs" | "alarms"
    let   name = nameInput.value.trim();   // user-visible name/path

    if (!g_newConfigFile) {
        if (statusEl) statusEl.textContent = "No file selected.";
        return;
    }

    // If user clicked "Upload" on an existing row, we set name = path (e.g. "connections/microplc03.json")
    // If user is creating a new file, name will usually be something like "microplc03.json".
    let relPath = "";

    if (kind === "connection") {
        // For connections, we always store under connections/
        if (name.indexOf("/") >= 0) {
            // If they already gave "connections/xyz.json", use it as-is
            relPath = name;
        } else if (name.length > 0) {
            // Just a bare filename -> put it under connections/
            relPath = "connections/" + name;
        } else {
            // No name given: default based on uploaded file name
            relPath = "connections/" + g_newConfigFile.name;
            nameInput.value = relPath;
        }

    } else if (kind === "tags") {
        // For tag files, always under tags/
        if (name.indexOf("/") >= 0) {
            relPath = name;
        } else if (name.length > 0) {
            relPath = "tags/" + name;
        } else {
            relPath = "tags/" + g_newConfigFile.name;
            nameInput.value = relPath;
        }

    } else if (kind === "mqtt") {
        // Always the root-level mqtt.json
        relPath = "mqtt.json";
        nameInput.value = "mqtt.json";

    } else if (kind === "mqtt_inputs") {
        // Always the root-level mqtt_inputs.json
        relPath = "mqtt_inputs.json";
        nameInput.value = "mqtt_inputs.json";

    } else if (kind === "alarms") {
        // Always the root-level alarms.json
        relPath = "alarms.json";
        nameInput.value = "alarms.json";

    } else {
        if (statusEl) statusEl.textContent = "Unsupported config kind: " + kind;
        return;
    }

    // Actually read the file contents and send to backend
    const file = g_newConfigFile;
    g_newConfigFile = null;  // reset after use

    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        if (statusEl) statusEl.textContent = "Uploading " + relPath + " ...";

        try {
            const headers = withAdminHeaders({ "Content-Type": "application/json" });
            const resp = await fetch("/config/file", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    token:   WRITE_TOKEN,
                    path:    relPath,
                    content: text
                })
            });

            const data = await resp.json();

            if (!resp.ok || !data.ok) {
                if (statusEl) {
                    statusEl.textContent =
                        "Upload failed: " + (data.error || ("HTTP " + resp.status));
                }
                return;
            }

            if (statusEl) {
                statusEl.textContent = "Upload OK: " + relPath + ". Don't forget to Reload.";
            }

            // Refresh file list so the new/updated file shows correctly
            refreshConfigFiles();

            // Mark reload hint
            const reloadStatus = document.getElementById("reload-status");
            if (reloadStatus) {
                reloadStatus.textContent =
                    "Config changed. Click 'Reload config' when ready.";
                reloadStatus.className = "small status-degraded";
            }

        } catch (err) {
            if (statusEl) {
                statusEl.textContent = "Upload exception: " + err.toString();
            }
        }
    };

    reader.onerror = function(err) {
        if (statusEl) statusEl.textContent =
            "File read error: " + (err.target && err.target.error
                                   ? err.target.error.toString()
                                   : "unknown");
    };

    reader.readAsText(file);
}

// ---------------------------
// Config files (download/upload)
// ---------------------------
async function refreshConfigFiles() {
    const metaEl  = document.getElementById("config-meta");
    const tbodyEl = document.getElementById("config-tbody");

    if (!metaEl || !tbodyEl) {
        return; // card not present
    }

    // Only show file list to editor/admin users.
    if (!ADMIN_CONFIGURED || !ADMIN_LOGGED_IN) {
        metaEl.textContent = "Admin login required to view config files.";
        tbodyEl.innerHTML  = "";
        return;
    }

    try {
        metaEl.textContent = "Loading config file list...";

        const resp = await fetch("/config/files", {
            method: "GET",
            headers: withAdminHeaders()
        });

        if (!resp.ok) {
            const text = await resp.text();
            metaEl.textContent =
                "Error loading config files (" + resp.status + "): " + text;
            tbodyEl.innerHTML = "";
            return;
        }

        const data = await resp.json();

        const files = Array.isArray(data.files) ? data.files : [];
        metaEl.textContent = "Files: " + files.length;

        const rows = [];
        for (const f of files) {
            const path = f.path || "";
            const kind = f.kind || "";

            const dlBtn =
                "<button class='btn-write' onclick=\"downloadConfigFile('" +
                path + "')\">Download</button>";

            const viewBtn =
                "<button class='btn-write' onclick=\"viewConfigFile('" +
                path + "')\">View</button>";

            const upBtn =
                "<button class='btn-write' onclick=\"startConfigUpload('" +
                path + "')\">Upload</button>";

            const delBtn =
                "<button class='btn-write' onclick=\"deleteConfigFile('" +
                path + "')\">Delete</button>";

            rows.push(
                "<tr>" +
                "<td>" + path + "</td>" +
                "<td>" + kind + "</td>" +
                "<td>" + dlBtn + " " + viewBtn + " " + upBtn + " " + delBtn + "</td>" +
                "</tr>"
            );
        }

        tbodyEl.innerHTML = rows.join("");
    } catch (e) {
        metaEl.textContent = "Error loading config files: " + e.toString();
        tbodyEl.innerHTML  = "";
    }
}

	async function downloadConfigFile(path) {
	    const statusEl = document.getElementById("config-status");

	    // Get just "microplc03.json" from "connections/microplc03.json"
	    const parts    = path.split("/");
	    const filename = parts[parts.length - 1] || "config.txt";

	    try {
	        const resp = await fetch("/config/file?path=" + encodeURIComponent(path), {
	            method: "GET",
	            headers: withAdminHeaders()
	        });
	        if (!resp.ok) {
	            const text = await resp.text();
	            if (statusEl) statusEl.textContent = "Download failed (" + resp.status + "): " + text;
	            return;
	        }

	        const blob = await resp.blob();
	        const url = URL.createObjectURL(blob);
	        const a = document.createElement("a");
	        a.href = url;
	        a.download = filename;
	        document.body.appendChild(a);
	        a.click();
	        document.body.removeChild(a);
	        URL.revokeObjectURL(url);
	    } catch (e) {
	        if (statusEl) statusEl.textContent = "Download exception: " + e.toString();
	    }
	}

function startConfigUpload(path) {
    const input = document.getElementById("config-upload-input");
    const statusEl = document.getElementById("config-status");
    if (!input) {
        if (statusEl) statusEl.textContent = "Upload input not found in DOM.";
        return;
    }
    g_configUploadPath = path;
    input.value = ""; // reset so same file can be selected again
    input.click();
}

function onConfigFileSelected(evt) {
    const input = evt.target;
    const statusEl = document.getElementById("config-status");

    if (!g_configUploadPath) {
        if (statusEl) statusEl.textContent = "No target path selected for upload.";
        input.value = "";
        return;
    }

    if (!input.files || !input.files.length) {
        if (statusEl) statusEl.textContent = "No file selected.";
        return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const text = e.target.result;
        uploadConfigText(g_configUploadPath, text);
    };

    reader.onerror = function() {
        if (statusEl) statusEl.textContent = "Error reading file.";
    };

    reader.readAsText(file);
}

async function uploadConfigText(path, content) {
    const statusEl = document.getElementById("config-status");
    if (statusEl) {
        statusEl.textContent = "Uploading " + path + " ...";
    }

    try {
        const headers = withAdminHeaders({ "Content-Type": "application/json" });
        const resp = await fetch("/config/file", {
            method: "POST",
            headers,
            body: JSON.stringify({
                token:   WRITE_TOKEN,
                path:    path,
                content: content
            })
        });

        const data = await resp.json();

        if (!resp.ok || !data.ok) {
            if (statusEl) {
                statusEl.textContent =
                    "Upload failed: " + (data.error || ("HTTP " + resp.status));
            }
            return;
        }

        if (statusEl) {
            statusEl.textContent =
                "Upload OK for " + path + ". Reload config to apply changes.";
        }

        // Refresh file list so user sees it's still valid
        refreshConfigFiles();
    } catch (e) {
        if (statusEl) {
            statusEl.textContent = "Upload exception: " + e.toString();
        }
    }
}

function startNewConfigUpload() {
    const kindSel  = document.getElementById("config-new-kind");
    const nameInput = document.getElementById("config-new-name");
    const statusEl  = document.getElementById("config-status");

    if (!kindSel || !nameInput) {
        if (statusEl) statusEl.textContent = "Config new-file controls not found in DOM.";
        return;
    }

    let name = (nameInput.value || "").trim();
    if (!name) {
        if (statusEl) statusEl.textContent = "Please enter a filename (e.g. plc01.json).";
        return;
    }

    // Ensure .json extension
    if (!name.toLowerCase().endsWith(".json")) {
        name += ".json";
    }

    let relPath = "";
    const kind = kindSel.value;

    if (kind === "connection") {
        // If user already typed a subdirectory, respect it; otherwise prefix.
        if (name.indexOf("/") >= 0) {
            relPath = name;
        } else {
            relPath = "connections/" + name;
        }
    } else if (kind === "tags") {
        if (name.indexOf("/") >= 0) {
            relPath = name;
        } else {
            relPath = "tags/" + name;
        }
    } else {
        if (statusEl) statusEl.textContent = "Unsupported config kind: " + kind;
        return;
    }

    // Kick off the same upload flow we use for existing files.
    startConfigUpload(relPath);
}

// ---------------------------
// Tag editor (tags/*.json)
// ---------------------------
function tagEditorEls() {
    return {
        statusEl: document.getElementById("tag-editor-status"),
        wrapEl: document.getElementById("tag-editor-wrap"),
        toggleBtn: document.getElementById("tag-editor-toggle-btn"),
        fileSel: document.getElementById("tag-editor-file"),
        filterEl: document.getElementById("tag-editor-filter"),
        metaEl: document.getElementById("tag-editor-meta"),
        tbody: document.getElementById("tag-editor-tbody"),
        nameEl: document.getElementById("tag-edit-name"),
        plcEl: document.getElementById("tag-edit-plc"),
        dtEl: document.getElementById("tag-edit-dt"),
        scanEl: document.getElementById("tag-edit-scan"),
        writableEl: document.getElementById("tag-edit-writable"),
        jsonEl: document.getElementById("tag-edit-json"),
        addBtn: document.getElementById("tag-editor-add-btn"),
        delBtn: document.getElementById("tag-editor-del-btn"),
        saveBtn: document.getElementById("tag-editor-save-btn"),
        saveReloadBtn: document.getElementById("tag-editor-save-reload-btn")
    };
}

// ---------------------------
// Connection editor (connections/*.json)
// ---------------------------
function connEditorEls() {
    return {
        statusEl: document.getElementById("conn-editor-status"),
        wrapEl: document.getElementById("conn-editor-wrap"),
        toggleBtn: document.getElementById("conn-editor-toggle-btn"),
        fileSel: document.getElementById("conn-editor-file"),
        jsonEl: document.getElementById("conn-edit-json"),
        newBtn: document.getElementById("conn-editor-new-btn"),
        delBtn: document.getElementById("conn-editor-del-btn"),
        saveBtn: document.getElementById("conn-editor-save-btn"),
        saveReloadBtn: document.getElementById("conn-editor-save-reload-btn")
    };
}

function connEditorSetEnabled(enabled) {
    const el = connEditorEls();
    const controls = [
        el.toggleBtn, el.fileSel, el.jsonEl, el.newBtn, el.delBtn, el.saveBtn, el.saveReloadBtn
    ];
    for (const c of controls) {
        if (c) c.disabled = !enabled;
    }
}

function connEditorSelectedPath() {
    const el = connEditorEls();
    if (!el.fileSel) return "";
    return el.fileSel.value || "";
}

function toggleConnEditor() {
    const el = connEditorEls();
    if (!el.wrapEl || !el.toggleBtn) return;

    if (!ADMIN_LOGGED_IN) {
        if (el.statusEl) {
            el.statusEl.textContent = "Admin login required to edit connection config files.";
            el.statusEl.className = "small status-error";
        }
        return;
    }

    CONN_EDITOR_OPEN = !CONN_EDITOR_OPEN;
    el.wrapEl.style.display = CONN_EDITOR_OPEN ? "" : "none";
    el.toggleBtn.textContent = CONN_EDITOR_OPEN ? "Close editor" : "Open editor";

    if (CONN_EDITOR_OPEN && !g_connEditorLoaded) {
        loadConnectionEditorFiles();
    }
}

async function loadConnectionEditorFiles() {
    const el = connEditorEls();
    if (!ADMIN_LOGGED_IN) return;

    if (el.statusEl) {
        el.statusEl.textContent = "Loading connection files...";
        el.statusEl.className = "small";
    }
    connEditorSetEnabled(false);

    try {
        const resp = await fetch("/config/files", {
            method: "GET",
            headers: withAdminHeaders()
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
            throw new Error((data && data.error) ? data.error : ("HTTP " + resp.status));
        }

        const files = Array.isArray(data.files) ? data.files : [];
        g_connEditorPaths = files
            .filter(f => f && f.kind === "connection" && typeof f.path === "string")
            .map(f => f.path)
            .sort();
        g_connEditorLoaded = true;

        if (el.fileSel) {
            const opts = ["<option value=''>-- select --</option>"];
            for (const p of g_connEditorPaths) {
                opts.push("<option value='" + p + "'>" + p + "</option>");
            }
            el.fileSel.innerHTML = opts.join("");
            el.fileSel.onchange = () => {
                connEditorLoad();
            };
        }

        if (el.statusEl) {
            el.statusEl.textContent = "Connection editor ready.";
            el.statusEl.className = "small status-ok";
        }
        connEditorSetEnabled(true);
    } catch (e) {
        if (el.statusEl) {
            el.statusEl.textContent = "Failed to load connection files: " + e.toString();
            el.statusEl.className = "small status-error";
        }
        connEditorSetEnabled(true);
    }
}

async function connEditorLoad() {
    const el = connEditorEls();
    const path = connEditorSelectedPath();
    if (!path) {
        if (el.jsonEl) el.jsonEl.value = "";
        return;
    }

    if (el.statusEl) {
        el.statusEl.textContent = "Loading " + path + " ...";
        el.statusEl.className = "small";
    }
    connEditorSetEnabled(false);

    try {
        const resp = await fetch("/config/file?path=" + encodeURIComponent(path), {
            method: "GET",
            headers: withAdminHeaders()
        });
        const text = await resp.text();
        if (!resp.ok) {
            throw new Error(text || ("HTTP " + resp.status));
        }

        // Prefer parsed+pretty JSON (drops comments) but fall back to raw text
        let out = text;
        try {
            out = JSON.stringify(JSON.parse(text), null, 2) + "\n";
        } catch (_) {}

        if (el.jsonEl) el.jsonEl.value = out;
        if (el.statusEl) {
            el.statusEl.textContent = "Loaded " + path + ".";
            el.statusEl.className = "small status-ok";
        }
    } catch (e) {
        if (el.statusEl) {
            el.statusEl.textContent = "Load failed: " + e.toString();
            el.statusEl.className = "small status-error";
        }
    } finally {
        connEditorSetEnabled(true);
    }
}

function connEditorNew() {
    const el = connEditorEls();
    if (!ADMIN_LOGGED_IN) return;

    const id = window.prompt("New connection id (required):", "");
    if (!id) return;

    const filenameDefault = "connections/" + id + ".json";
    let path = window.prompt("Config file path:", filenameDefault);
    if (!path) return;

    if (!path.startsWith("connections/")) {
        path = "connections/" + path.replace(/^\/+/, "");
    }
    if (!path.toLowerCase().endsWith(".json")) {
        path += ".json";
    }

    const template = {
        id: id,
        driver: "ab_eip",
        gateway: "192.0.2.10",
        path: "1,0",
        slot: 0,
        plc_type: "lgx",
        default_timeout_ms: 1000,
        default_read_ms: 1000,
        default_write_ms: 1000,
        debug: 0
    };

    if (el.fileSel) {
        // Add option if not present
        const exists = g_connEditorPaths.indexOf(path) >= 0;
        if (!exists) {
            g_connEditorPaths.push(path);
            g_connEditorPaths.sort();
            const opts = ["<option value=''>-- select --</option>"];
            for (const p of g_connEditorPaths) {
                opts.push("<option value='" + p + "'>" + p + "</option>");
            }
            el.fileSel.innerHTML = opts.join("");
        }
        el.fileSel.value = path;
    }

    if (el.jsonEl) el.jsonEl.value = JSON.stringify(template, null, 2) + "\n";
    if (el.statusEl) {
        el.statusEl.textContent = "New connection staged. Click Save file to create it.";
        el.statusEl.className = "small status-degraded";
    }
}

async function connEditorDelete() {
    const el = connEditorEls();
    if (!ADMIN_LOGGED_IN) return;
    const path = connEditorSelectedPath();
    if (!path) return;

    if (!confirm("Delete connection config '" + path + "'? You must Reload to apply changes.")) {
        return;
    }

    if (el.statusEl) {
        el.statusEl.textContent = "Deleting " + path + " ...";
        el.statusEl.className = "small";
    }
    connEditorSetEnabled(false);

    try {
        const headers = withAdminHeaders({ "Content-Type": "application/json" });
        const resp = await fetch("/config/delete", {
            method: "POST",
            headers,
            body: JSON.stringify({
                token: WRITE_TOKEN,
                path: path
            })
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
            throw new Error((data && data.error) ? data.error : ("HTTP " + resp.status));
        }

        // Remove from list and clear editor
        g_connEditorPaths = g_connEditorPaths.filter(p => p !== path);
        if (el.fileSel) {
            const opts = ["<option value=''>-- select --</option>"];
            for (const p of g_connEditorPaths) opts.push("<option value='" + p + "'>" + p + "</option>");
            el.fileSel.innerHTML = opts.join("");
            el.fileSel.value = "";
        }
        if (el.jsonEl) el.jsonEl.value = "";

        if (el.statusEl) {
            el.statusEl.textContent = "Deleted " + path + ".";
            el.statusEl.className = "small status-ok";
        }

        refreshConfigFiles();
    } catch (e) {
        if (el.statusEl) {
            el.statusEl.textContent = "Delete failed: " + e.toString();
            el.statusEl.className = "small status-error";
        }
    } finally {
        connEditorSetEnabled(true);
    }
}

async function connEditorSave(reloadAfter) {
    const el = connEditorEls();
    if (!ADMIN_LOGGED_IN) return;
    const path = connEditorSelectedPath();
    if (!path) return;
    if (!el.jsonEl) return;

    let obj = null;
    try {
        obj = JSON.parse(el.jsonEl.value || "{}");
    } catch (e) {
        if (el.statusEl) {
            el.statusEl.textContent = "Invalid JSON: " + e.toString();
            el.statusEl.className = "small status-error";
        }
        return;
    }

    if (!obj || typeof obj !== "object") return;
    if (!obj.id || typeof obj.id !== "string") {
        if (el.statusEl) {
            el.statusEl.textContent = "Connection JSON must contain string field 'id'.";
            el.statusEl.className = "small status-error";
        }
        return;
    }

    const text = JSON.stringify(obj, null, 2) + "\n";

    if (el.statusEl) {
        el.statusEl.textContent = "Saving " + path + " ...";
        el.statusEl.className = "small";
    }
    connEditorSetEnabled(false);

    try {
        const headers = withAdminHeaders({ "Content-Type": "application/json" });
        const resp = await fetch("/config/file", {
            method: "POST",
            headers,
            body: JSON.stringify({
                token: WRITE_TOKEN,
                path: path,
                content: text
            })
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
            throw new Error((data && data.error) ? data.error : ("HTTP " + resp.status));
        }

        if (el.statusEl) {
            el.statusEl.textContent = "Saved " + path + ".";
            el.statusEl.className = "small status-ok";
        }

        refreshConfigFiles();
        if (reloadAfter) {
            await reloadConfig();
        }
    } catch (e) {
        if (el.statusEl) {
            el.statusEl.textContent = "Save failed: " + e.toString();
            el.statusEl.className = "small status-error";
        }
    } finally {
        connEditorSetEnabled(true);
    }
}

function tagEditorSetEnabled(enabled) {
    const el = tagEditorEls();
    const controls = [
        el.toggleBtn, el.fileSel, el.filterEl, el.addBtn, el.delBtn,
        el.saveBtn, el.saveReloadBtn,
        el.nameEl, el.plcEl, el.dtEl, el.scanEl, el.writableEl, el.jsonEl
    ];
    for (const c of controls) {
        if (c) c.disabled = !enabled;
    }
}

function tagEditorCurrentFile() {
    if (g_tagEditorFileIndex < 0 || g_tagEditorFileIndex >= g_tagEditorFiles.length) return null;
    return g_tagEditorFiles[g_tagEditorFileIndex];
}

function tagEditorCurrentTags() {
    const f = tagEditorCurrentFile();
    if (!f || !f.content || !Array.isArray(f.content.tags)) return [];
    return f.content.tags;
}

function toggleTagEditor() {
    const el = tagEditorEls();
    if (!el.wrapEl || !el.toggleBtn) return;

    if (!ADMIN_LOGGED_IN) {
        if (el.statusEl) {
            el.statusEl.textContent = "Admin login required to edit tag config files.";
            el.statusEl.className = "small status-error";
        }
        return;
    }

    TAG_EDITOR_OPEN = !TAG_EDITOR_OPEN;
    el.wrapEl.style.display = TAG_EDITOR_OPEN ? "" : "none";
    el.toggleBtn.textContent = TAG_EDITOR_OPEN ? "Close editor" : "Open editor";

    if (TAG_EDITOR_OPEN && !g_tagEditorLoaded) {
        loadTagEditorFiles();
    }
}

async function loadTagEditorFiles() {
    const el = tagEditorEls();
    if (!ADMIN_LOGGED_IN) return;

    if (el.statusEl) {
        el.statusEl.textContent = "Loading tag files...";
        el.statusEl.className = "small";
    }
    tagEditorSetEnabled(false);

    try {
        const resp = await fetch("/config/tagfiles", {
            method: "GET",
            headers: withAdminHeaders()
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
            throw new Error((data && data.error) ? data.error : ("HTTP " + resp.status));
        }

        const files = Array.isArray(data.files) ? data.files : [];
        g_tagEditorFiles = files.filter(f => f && typeof f.file === "string" && f.content);
        g_tagEditorFileIndex = (g_tagEditorFiles.length > 0) ? 0 : -1;
        g_tagEditorTagIndex = -1;
        g_tagEditorLoaded = true;

        // Populate file select
        if (el.fileSel) {
            const opts = [];
            for (let i = 0; i < g_tagEditorFiles.length; i++) {
                const f = g_tagEditorFiles[i];
                const cid = (typeof f.connection_id === "string") ? f.connection_id : "";
                const label = f.file + (cid ? (" (" + cid + ")") : "");
                opts.push("<option value='" + i + "'>" + label + "</option>");
            }
            el.fileSel.innerHTML = opts.join("");
            el.fileSel.value = "" + g_tagEditorFileIndex;
            el.fileSel.onchange = () => {
                g_tagEditorFileIndex = parseInt(el.fileSel.value, 10);
                g_tagEditorTagIndex = -1;
                tagEditorRenderList();
                tagEditorFillFields(null);
            };
        }

        // Filter input
        if (el.filterEl) {
            el.filterEl.oninput = () => tagEditorRenderList();
        }

        // Click-to-select row (event delegation)
        if (el.tbody) {
            el.tbody.onclick = (ev) => {
                const tr = ev.target && ev.target.closest ? ev.target.closest("tr") : null;
                if (!tr) return;
                const idxStr = tr.getAttribute("data-idx");
                if (!idxStr) return;
                const idx = parseInt(idxStr, 10);
                if (!Number.isFinite(idx)) return;
                tagEditorSelectTag(idx);
            };
        }

        if (el.statusEl) {
            el.statusEl.textContent = "Tag editor ready.";
            el.statusEl.className = "small status-ok";
        }

        tagEditorSetEnabled(true);
        tagEditorRenderList();
        tagEditorFillFields(null);
    } catch (e) {
        if (el.statusEl) {
            el.statusEl.textContent = "Failed to load tag files: " + e.toString();
            el.statusEl.className = "small status-error";
        }
        tagEditorSetEnabled(true);
    }
}

function tagEditorRenderList() {
    const el = tagEditorEls();
    const f = tagEditorCurrentFile();
    const tags = tagEditorCurrentTags();

    if (!el.tbody || !el.metaEl) return;
    if (!f) {
        el.metaEl.textContent = "No tag files found.";
        el.tbody.innerHTML = "";
        return;
    }

    const filter = (el.filterEl && el.filterEl.value) ? el.filterEl.value.trim().toLowerCase() : "";
    const rows = [];
    let shown = 0;
    const limit = 500;

    for (let i = 0; i < tags.length; i++) {
        const t = tags[i] || {};
        const name = (t.name || "");
        const plc = (t.plc_tag_name || "");
        const dt = (t.datatype || "");
        const scan = (typeof t.scan_ms === "number") ? t.scan_ms : (t.scan_ms || "");

        if (filter) {
            const hay = (name + " " + plc + " " + dt).toLowerCase();
            if (hay.indexOf(filter) < 0) continue;
        }

        const selected = (i === g_tagEditorTagIndex) ? " selected" : "";
        rows.push(
            "<tr class='" + selected + "' data-idx='" + i + "'>" +
            "<td>" + name + "</td>" +
            "<td>" + plc + "</td>" +
            "<td>" + dt + "</td>" +
            "<td>" + scan + "</td>" +
            "</tr>"
        );
        shown++;
        if (shown >= limit) break;
    }

    const cid = (f.content && typeof f.content.connection_id === "string") ? f.content.connection_id : "";
    el.metaEl.textContent =
        "File: tags/" + f.file +
        (cid ? (" | connection_id: " + cid) : "") +
        " | tags: " + tags.length +
        (filter ? (" | matches: " + shown + (shown >= limit ? " (showing first " + limit + ")" : "")) : "");

    el.tbody.innerHTML = rows.join("");
}

function tagEditorSelectTag(idx) {
    const tags = tagEditorCurrentTags();
    if (idx < 0 || idx >= tags.length) return;
    g_tagEditorTagIndex = idx;
    tagEditorRenderList();
    tagEditorFillFields(tags[idx]);
}

function tagEditorFillFields(tagObj) {
    const el = tagEditorEls();
    if (!el.nameEl || !el.plcEl || !el.dtEl || !el.scanEl || !el.writableEl || !el.jsonEl) return;

    if (!tagObj) {
        el.nameEl.value = "";
        el.plcEl.value = "";
        el.dtEl.value = "int32";
        el.scanEl.value = "";
        el.writableEl.checked = false;
        el.jsonEl.value = "";
        return;
    }

    el.nameEl.value = (tagObj.name || "");
    el.plcEl.value = (tagObj.plc_tag_name || "");
    el.dtEl.value = (tagObj.datatype || "int32");
    el.scanEl.value = (typeof tagObj.scan_ms === "number") ? tagObj.scan_ms : (tagObj.scan_ms || "");
    el.writableEl.checked = !!tagObj.writable;
    el.jsonEl.value = JSON.stringify(tagObj, null, 2);
}

function tagEditorApplyFieldsToJson() {
    const tags = tagEditorCurrentTags();
    if (g_tagEditorTagIndex < 0 || g_tagEditorTagIndex >= tags.length) return;

    const el = tagEditorEls();
    const t = Object.assign({}, tags[g_tagEditorTagIndex] || {});

    t.name = (el.nameEl && el.nameEl.value) ? el.nameEl.value.trim() : t.name;
    t.plc_tag_name = (el.plcEl && el.plcEl.value) ? el.plcEl.value.trim() : t.plc_tag_name;
    if (el.dtEl && el.dtEl.value) t.datatype = el.dtEl.value;
    if (el.scanEl && el.scanEl.value !== "") {
        const n = parseInt(el.scanEl.value, 10);
        if (Number.isFinite(n)) t.scan_ms = n;
    }
    if (el.writableEl) t.writable = !!el.writableEl.checked;

    tags[g_tagEditorTagIndex] = t;
    if (el.jsonEl) el.jsonEl.value = JSON.stringify(t, null, 2);
    tagEditorRenderList();
}

function tagEditorApplyJsonToFields() {
    const tags = tagEditorCurrentTags();
    if (g_tagEditorTagIndex < 0 || g_tagEditorTagIndex >= tags.length) return;
    const el = tagEditorEls();
    if (!el.jsonEl) return;

    let obj = null;
    try {
        obj = JSON.parse(el.jsonEl.value || "{}");
    } catch (e) {
        if (el.statusEl) {
            el.statusEl.textContent = "Invalid JSON: " + e.toString();
            el.statusEl.className = "small status-error";
        }
        return;
    }

    if (!obj || typeof obj !== "object") return;
    tags[g_tagEditorTagIndex] = obj;
    tagEditorFillFields(obj);
    tagEditorRenderList();
}

function tagEditorAddTag() {
    const f = tagEditorCurrentFile();
    if (!f || !f.content) return;
    if (!Array.isArray(f.content.tags)) f.content.tags = [];

    const base = {
        name: "NewTag",
        plc_tag_name: "",
        datatype: "int32",
        scan_ms: 1000,
        writable: false
    };
    f.content.tags.push(base);
    g_tagEditorTagIndex = f.content.tags.length - 1;
    tagEditorRenderList();
    tagEditorFillFields(base);
}

function tagEditorDeleteTag() {
    const f = tagEditorCurrentFile();
    if (!f || !f.content || !Array.isArray(f.content.tags)) return;
    if (g_tagEditorTagIndex < 0 || g_tagEditorTagIndex >= f.content.tags.length) return;

    if (!confirm("Delete selected tag?")) return;

    f.content.tags.splice(g_tagEditorTagIndex, 1);
    g_tagEditorTagIndex = -1;
    tagEditorRenderList();
    tagEditorFillFields(null);
}

async function tagEditorSave(reloadAfter) {
    const el = tagEditorEls();
    const f = tagEditorCurrentFile();
    if (!ADMIN_LOGGED_IN) return;
    if (!f || !f.content) return;

    // If user edited JSON textarea, ensure it's applied to the tag object.
    if (g_tagEditorTagIndex >= 0) {
        tagEditorApplyJsonToFields();
    }

    const content = f.content;
    if (!content || typeof content !== "object") return;
    if (!Array.isArray(content.tags)) {
        if (el.statusEl) {
            el.statusEl.textContent = "Current file content has no 'tags' array.";
            el.statusEl.className = "small status-error";
        }
        return;
    }
    if (!content.connection_id || typeof content.connection_id !== "string") {
        if (el.statusEl) {
            el.statusEl.textContent = "Current file is missing 'connection_id'.";
            el.statusEl.className = "small status-error";
        }
        return;
    }

    const relPath = "tags/" + f.file;
    const text = JSON.stringify(content, null, 2) + "\n";

    if (el.statusEl) {
        el.statusEl.textContent = "Saving " + relPath + " ...";
        el.statusEl.className = "small";
    }
    tagEditorSetEnabled(false);

    try {
        const headers = withAdminHeaders({ "Content-Type": "application/json" });
        const resp = await fetch("/config/file", {
            method: "POST",
            headers,
            body: JSON.stringify({
                token: WRITE_TOKEN,
                path: relPath,
                content: text
            })
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
            throw new Error((data && data.error) ? data.error : ("HTTP " + resp.status));
        }

        if (el.statusEl) {
            el.statusEl.textContent = "Saved " + relPath + ".";
            el.statusEl.className = "small status-ok";
        }

        // Refresh config file list (mtime, etc.)
        refreshConfigFiles();

        if (reloadAfter) {
            await reloadConfig();
        }
    } catch (e) {
        if (el.statusEl) {
            el.statusEl.textContent = "Save failed: " + e.toString();
            el.statusEl.className = "small status-error";
        }
    } finally {
        tagEditorSetEnabled(true);
    }
}

				function startAutoRefresh() {
					restoreAdminTokenFromStorage();
					applyPageMode();
					if (isEditorPage()) {
					    wsInit();
					}

		    // NEW: wire up modal key handling
		    setupAdminModalKeys();

		    // Existing: upload/edit existing config files
		    const cfgInput = document.getElementById("config-upload-input");
		    if (cfgInput && !cfgInput.dataset.bound) {
		        cfgInput.addEventListener("change", onConfigFileSelected);
		        cfgInput.dataset.bound = "1";
		    }

		    // Upload new config files
		    const newCfgInput = document.getElementById("config-new-file-input");
		    if (newCfgInput && !newCfgInput.dataset.bound) {
		        newCfgInput.addEventListener("change", onNewConfigFileSelected);
		        newCfgInput.dataset.bound = "1";
		    }

			    refreshAdminStatus();
			    refreshInfo();
			    refreshConfigFiles();
			    if (!isEditorPage()) {
			        refreshHealth();
			    }
			    refreshTags();
			    refreshAlarms();

			    // Keep auth status fresh so SSO logins (from scada/hmi) show up quickly.
			    setInterval(refreshAdminStatus, 2000);
			    window.addEventListener("focus", () => refreshAdminStatus());
			    document.addEventListener("visibilitychange", () => {
			        if (!document.hidden) refreshAdminStatus();
			    });
			    setInterval(refreshInfo,   15000);
			    setInterval(refreshConfigFiles, 60000); // e.g. once a minute
			    if (!isEditorPage()) {
			        setInterval(refreshHealth,  5000);
			    }
			    setInterval(refreshTags,    5000);
		    setInterval(refreshAlarms,  5000);

	}

window.addEventListener("load", startAutoRefresh);
</script>
</body>
</html>
)HTML";

			// Replace placeholder with the actual writeToken
			{
				const std::string placeholder = "WRITE_TOKEN_PLACEHOLDER";
				auto pos = dashboard_html.find(placeholder);
				if (pos != std::string::npos) {
					dashboard_html.replace(pos, placeholder.size(), writeToken);
				}
			}
			
            // All your existing svr.Get/ Post handlers follow here, unchanged:

            svr.Get("/", [dashboard_html](const httplib::Request &, httplib::Response &res) {
                res.set_content(dashboard_html, "text/html");
            });

	            svr.Get("/dashboard", [dashboard_html](const httplib::Request &, httplib::Response &res) {
	                res.set_content(dashboard_html, "text/html");
	            });

	            svr.Get("/workspace", [dashboard_html](const httplib::Request &, httplib::Response &res) {
	                res.set_content(dashboard_html, "text/html");
	            });

				// /info
				svr.Get("/info", [&](const httplib::Request &, httplib::Response &res) {
					std::lock_guard<std::mutex> lock(driverMutex);
					json root;

					root["name"]              = "opcbridge";
					root["version"]           = OPCBRIDGE_VERSION; // backward compat
					root["component_version"] = OPCBRIDGE_VERSION;
					root["suite_version"]     = OPCBRIDGE_SUITE_VERSION;
					root["build_date"]        = __DATE__;
					root["build_time"]        = __TIME__;

				auto now = std::chrono::system_clock::now();
				auto uptime_sec = std::chrono::duration_cast<std::chrono::seconds>(
					now - processStartTime
				).count();
				root["uptime_seconds"] = uptime_sec;

				// Write-token / reload auth
				json wa;
				wa["env_var"]   = "OPCBRIDGE_WRITE_TOKEN";
				wa["source"]    = writeTokenFromEnv ? "env" : "auto";
				wa["has_token"] = !writeToken.empty();
					root["write_auth"] = wa;

					// WebSocket server status (if enabled)
					{
						json ws;
						ws["enabled"] = ws_is_enabled();
						ws["port"]    = static_cast<int>(wsPort);
						root["ws"] = ws;
					}

					// Connection summary
					int num_connections = static_cast<int>(drivers.size());
					int total_tags = 0;
					json conn_summary = json::array();

				for (const auto &d : drivers) {
					total_tags += static_cast<int>(d.tags.size());
					json c;
					c["id"]        = d.conn.id;
					c["tag_count"] = static_cast<int>(d.tags.size());
					conn_summary.push_back(c);
				}

				root["num_connections"]     = num_connections;
				root["total_tags"]          = total_tags;
				root["connections_summary"] = conn_summary;

				// --- NEW: MQTT / TLS / CA certificate status ---
				{
					json mtls;

					bool mqttEnabled   = g_mqttCfg.enabled;
					bool tlsEnabled    = mqttEnabled && g_mqttCfg.use_tls;
					std::string cafile = g_mqttCfg.cafile;

					mtls["mqtt_enabled"] = mqttEnabled;
					mtls["tls_enabled"]  = tlsEnabled;
					mtls["cafile"]       = cafile;

					bool cafilePresent = false;
					int64_t cafileMtimeMs = 0;

					if (!cafile.empty()) {
						std::error_code ec;
						fs::path p(cafile);
						if (!p.is_absolute()) {
							// If config uses a relative path, resolve relative to configDir
							p = fs::path(configDir) / p;
						}

						cafilePresent = fs::exists(p, ec);
						mtls["cafile_resolved"] = p.string();

						if (cafilePresent && !ec) {
							std::error_code ec2;
			#ifdef __cpp_lib_filesystem
							auto ftime = fs::last_write_time(p, ec2);
							if (!ec2) {
								// Convert filesystem::file_time_type -> system_clock::time_point
								using namespace std::chrono;
								auto sctp = time_point_cast<system_clock::duration>(
									ftime - fs::file_time_type::clock::now()
									+ system_clock::now()
								);
								cafileMtimeMs = duration_cast<milliseconds>(
									sctp.time_since_epoch()).count();
							}
			#else
							(void)ec2;
			#endif
						}
					}

					mtls["cafile_present"]     = cafilePresent;
					if (cafileMtimeMs != 0) {
						mtls["cafile_mtime_ms"] = cafileMtimeMs;
					}

					root["mqtt_tls"] = mtls;
				}

					res.set_content(root.dump(), "application/json");
				});

		            // /metadata
		            svr.Get("/metadata", [&](const httplib::Request &, httplib::Response &res) {
		                std::lock_guard<std::mutex> lock(driverMutex);
		                json root;
		                root["connections"] = json::array();
                root["tags"]        = json::array();

                for (const auto &d : drivers) {
                    const auto &c = d.conn;
                    json jc;
                    jc["id"]                 = c.id;
                    jc["driver"]             = c.driver;
                    jc["gateway"]            = c.gateway;
                    jc["path"]               = c.path;
                    jc["slot"]               = c.slot;
                    jc["plc_type"]           = c.plc_type;
                    jc["default_timeout_ms"] = c.default_timeout_ms;
                    jc["default_read_ms"]    = c.default_read_ms;
                    jc["default_write_ms"]   = c.default_write_ms;
                    jc["debug"]              = c.debug;
                    root["connections"].push_back(jc);
                }

                for (const auto &d : drivers) {
                    for (const auto &t : d.tags) {
                        const auto &cfg = t.cfg;
                        json jt;
                        jt["connection_id"] = d.conn.id;
                        jt["name"]          = cfg.logical_name;
                        jt["plc_tag_name"]  = cfg.plc_tag_name;
                        jt["datatype"]      = cfg.datatype;
                        jt["scan_ms"]       = cfg.scan_ms;
                        jt["writable"]      = cfg.writable;
                        root["tags"].push_back(jt);
                    }
                }

		                res.set_content(root.dump(2), "application/json");
		            });

		            // /metrics (poll performance counters)
		            svr.Get("/metrics", [&](const httplib::Request &, httplib::Response &res) {
		                json root;
		                auto now_sys = std::chrono::system_clock::now();
		                int64_t now_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
		                    now_sys.time_since_epoch()
		                ).count();

		                root["timestamp_ms"] = now_ms;
		                root["connections"] = json::object();

		                std::lock_guard<std::mutex> lock(g_metricsMutex);
		                for (const auto &kv : g_connPollMetrics) {
		                    const std::string &connId = kv.first;
		                    const auto &m = kv.second;
		                    if (!m) continue;

		                    uint64_t total = m->reads_total.load(std::memory_order_relaxed);
		                    uint64_t ok    = m->reads_ok.load(std::memory_order_relaxed);
		                    uint64_t err   = m->reads_err.load(std::memory_order_relaxed);

		                    uint64_t us_total = m->read_us_total.load(std::memory_order_relaxed);
		                    uint64_t us_last  = m->read_us_last.load(std::memory_order_relaxed);
		                    uint64_t us_max   = m->read_us_max.load(std::memory_order_relaxed);

		                    int64_t last_ok = m->last_ok_ts_ms.load(std::memory_order_relaxed);
		                    int64_t last_err= m->last_err_ts_ms.load(std::memory_order_relaxed);

		                    json j;
		                    j["reads_total"] = total;
		                    j["reads_ok"]    = ok;
		                    j["reads_err"]   = err;

		                    j["read_ms_last"] = static_cast<double>(us_last) / 1000.0;
		                    j["read_ms_max"]  = static_cast<double>(us_max) / 1000.0;
		                    j["read_ms_avg"]  = (total > 0)
		                        ? (static_cast<double>(us_total) / 1000.0) / static_cast<double>(total)
		                        : 0.0;

		                    j["last_ok_ts_ms"]  = (last_ok >= 0) ? json(last_ok) : json(nullptr);
		                    j["last_err_ts_ms"] = (last_err >= 0) ? json(last_err) : json(nullptr);
		                    j["last_ok_age_ms"]  = (last_ok >= 0) ? json(now_ms - last_ok) : json(nullptr);
		                    j["last_err_age_ms"] = (last_err >= 0) ? json(now_ms - last_err) : json(nullptr);

		                    root["connections"][connId] = std::move(j);
		                }

		                res.set_content(root.dump(2), "application/json");
		            });

		            // /tags
		            svr.Get("/tags", [&](const httplib::Request &, httplib::Response &res) {
							struct TagRow {
								std::string connection_id;
								std::string name;
								std::string datatype;
								TagSnapshot snap;
								bool enabled;
								bool writable;
								bool handle_ok;
								bool has_snapshot;
							};

						std::vector<TagRow> rows;

		                {
							std::lock_guard<std::mutex> lock(driverMutex);
							for (auto &driver : drivers) {
			                    for (auto &t : driver.tags) {
										std::string key = make_tag_key(driver.conn.id, t.cfg.logical_name);
										auto it = tagTable.find(key);
										TagRow row;
										row.connection_id = driver.conn.id;
										row.name          = t.cfg.logical_name;
										row.datatype      = t.cfg.datatype;
										row.enabled       = t.cfg.enabled;
										row.writable      = t.cfg.writable;
										row.handle_ok     = (t.handle >= 0);
										row.has_snapshot  = (it != tagTable.end());
										if (row.has_snapshot) {
											row.snap = it->second;
										}
										rows.push_back(std::move(row));
									}
								}
							}

		                json root;
		                root["tags"] = json::array();

						for (const auto &r : rows) {
							json jt;
							jt["connection_id"] = r.connection_id;
							jt["name"]          = r.name;
							jt["datatype"]      = r.datatype;
								jt["enabled"]       = r.enabled;
								jt["writable"]      = r.writable;
								jt["handle_ok"]     = r.handle_ok;
								jt["has_snapshot"]  = r.has_snapshot;

								if (!r.enabled) {
									jt["reason"] = "disabled";
								} else if (!r.handle_ok) {
									jt["reason"] = "bad_handle";
								} else if (!r.has_snapshot) {
									jt["reason"] = "no_snapshot_yet";
								}

								if (r.has_snapshot) {
									const TagSnapshot &snap = r.snap;
									jt["quality"] = snap.quality;

								auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
									snap.timestamp.time_since_epoch()
								).count();
								jt["timestamp_ms"] = ms;

									if (snap.quality == 1) {
										std::visit([&jt](auto &&arg) {
											using V = std::decay_t<decltype(arg)>;
											if constexpr (std::is_same_v<V, float> || std::is_same_v<V, double>) {
												// JSON cannot represent NaN/Inf; avoid throwing and breaking /tags.
												if (std::isfinite(arg)) {
													jt["value"] = arg;
												} else {
													jt["value"] = nullptr;
												}
											} else {
												jt["value"] = arg;
											}
										}, snap.value);
									} else {
										jt["value"] = nullptr;
									}
								} else {
									jt["quality"] = nullptr;
									jt["timestamp_ms"] = nullptr;
									jt["value"] = nullptr;
								}

							root["tags"].push_back(std::move(jt));
						}

		                res.set_content(root.dump(), "application/json");
		            });

            // /tags/<conn>/<tag>
            svr.Get(R"(/tags/([^/]+)/(.+))", [&](const httplib::Request &req, httplib::Response &res) {
                if (req.matches.size() < 3) {
                    res.status = 400;
                    json err;
                    err["error"] = "Invalid path format. Use /tags/<connection_id>/<logical_name>";
                    res.set_content(err.dump(2), "application/json");
                    return;
                }

                std::string conn_id = req.matches[1];
                std::string tag_name= req.matches[2];

                ConnectionConfig conn;
                TagConfig cfg;
                int32_t handle = PLCTAG_ERR_NOT_FOUND;
                bool found = false;

                {
                    std::lock_guard<std::mutex> lock(driverMutex);
                    for (auto &d : drivers) {
                        if (d.conn.id != conn_id) continue;
                        conn = d.conn;
                        for (auto &t : d.tags) {
                            if (t.cfg.logical_name == tag_name) {
                                cfg = t.cfg;
                                handle = t.handle;
                                found = true;
                                break;
                            }
                        }
                        break;
                    }
                }

	                if (!found) {
	                    res.status = 404;
	                    json err;
	                    err["error"] = "Connection or tag not found";
	                    err["connection_id"] = conn_id;
	                    err["name"] = tag_name;
	                    res.set_content(err.dump(2), "application/json");
	                    return;
	                }

	                if (!cfg.enabled) {
	                    res.status = 409;
	                    json err;
	                    err["error"] = "Tag is disabled";
	                    err["connection_id"] = conn_id;
	                    err["name"] = tag_name;
	                    res.set_content(err.dump(2), "application/json");
	                    return;
	                }

	                if (handle < 0) {
	                    res.status = 503;
	                    json err;
	                    err["error"] = "Tag has invalid handle";
	                    err["connection_id"] = conn_id;
                    err["name"] = tag_name;
                    res.set_content(err.dump(2), "application/json");
                    return;
                }

                TagSnapshot snap;
                int32_t status = PLCTAG_STATUS_OK;

	                {
	                    std::shared_lock<std::shared_mutex> plcLock;
	                    if (g_plcMutex) {
	                        plcLock = std::shared_lock<std::shared_mutex>(*g_plcMutex);
	                    }

                    status = plc_tag_read(handle, conn.default_read_ms);
                    if (status == PLCTAG_STATUS_OK) {
                        TagRuntime tmp;
                        tmp.cfg = cfg;
                        tmp.handle = handle;
                        update_snapshot_from_plc(snap, conn, tmp);
                    }
                }

                auto now = std::chrono::system_clock::now();
                auto ts = (status == PLCTAG_STATUS_OK) ? snap.timestamp : now;
                auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
                    ts.time_since_epoch()
                ).count();

	                json jt;
	                jt["connection_id"] = conn_id;
	                jt["name"]          = tag_name;
	                jt["datatype"]      = cfg.datatype;
	                jt["enabled"]       = cfg.enabled;
	                jt["writable"]      = cfg.writable;
	                jt["timestamp_ms"]  = ms;

                if (status != PLCTAG_STATUS_OK) {
                    jt["quality"] = 0;
                    jt["error"] = plc_tag_decode_error(status);
                    jt["value"] = nullptr;

                    {
                        std::lock_guard<std::mutex> lock(driverMutex);
                        TagSnapshot &s = tagTable[make_tag_key(conn_id, tag_name)];
                        s.connection_id = conn_id;
                        s.logical_name  = tag_name;
                        s.datatype      = cfg.datatype;
                        s.timestamp     = now;
                        s.quality       = 0;
                    }

                    res.status = 503;
                } else {
                    jt["quality"] = 1;
                    std::visit([&jt](auto &&arg) {
                        jt["value"] = arg;
                    }, snap.value);

                    {
                        std::lock_guard<std::mutex> lock(driverMutex);
                        tagTable[make_tag_key(conn_id, tag_name)] = snap;
                    }

                    res.status = 200;
                }

                res.set_content(jt.dump(2), "application/json");
            });

            // POST /write
            svr.Post("/write", [&](const httplib::Request &req, httplib::Response &res) {
                json resp;
                try {
                    json body = json::parse(req.body);

                    std::string clientToken = body.value("token", std::string{});
                    bool hasWriteToken = (clientToken == writeToken);
                    bool isAdmin = is_admin_request(req);

                    if (!hasWriteToken && !isAdmin) {
                        resp["ok"] = false;
                        resp["error"] = "Invalid or missing write token and not admin.";
                        res.status = 403;
                        res.set_content(resp.dump(2), "application/json");
                        return;
                    }

                    std::string conn_id = body.at("connection_id").get<std::string>();
                    std::string tag_name= body.at("name").get<std::string>();
                    std::string value   = body.at("value").get<std::string>();

                    bool ok = write_tag_by_name(drivers, conn_id, tag_name, value, tagTable, driverMutex);

                    resp["ok"] = ok;
                    if (!ok) {
                        resp["error"] = "Write failed (see server log for details).";
                        res.status = 400;
                    } else {
                        resp["message"] = "Write successful.";
                    }
                } catch (const std::exception &ex) {
                    resp["ok"] = false;
                    resp["error"] = std::string("Invalid JSON or fields: ") + ex.what();
                    res.status = 400;
                }

                res.set_content(resp.dump(2), "application/json");
            });

	            svr.Post("/reload", [&](const httplib::Request &req, httplib::Response &res) {
	                json resp;
	                try {
	                    json body = json::parse(req.body);

                    std::string clientToken = body.value("token", std::string{});
                    bool hasWriteToken = (clientToken == writeToken);
                    bool isAdmin = is_admin_request(req);

	                    if (!hasWriteToken && !isAdmin) {
	                        resp["ok"] = false;
	                        resp["error"] = "Invalid or missing write token and not admin.";
	                        res.status = 403;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }

	                    // Hand off reload to the main thread (which owns the poller manager
	                    // and OPC UA iterate loop) so we don't race with pollers/OPC UA.
	                    uint64_t newGen = g_configGeneration.fetch_add(1, std::memory_order_relaxed) + 1;

	                    {
	                        std::unique_lock<std::mutex> lk(g_reloadMutex);
	                        if (g_reloadState.requested || g_reloadState.in_progress) {
	                            resp["ok"] = false;
	                            resp["error"] = "Reload already in progress.";
	                            res.status = 409;
	                            res.set_content(resp.dump(2), "application/json");
	                            return;
	                        }
	                        g_reloadState.requested = true;
	                        g_reloadState.in_progress = false;
	                        g_reloadState.done = false;
	                        g_reloadState.ok = false;
	                        g_reloadState.gen = newGen;
	                        g_reloadState.error.clear();
	                        g_reloadCv.notify_all();

	                        // Wait for completion (up to 30s)
	                        bool finished = g_reloadCv.wait_for(lk, std::chrono::seconds(30), [&]() {
	                            return g_reloadState.done;
	                        });
	                        if (!finished) {
	                            resp["ok"] = false;
	                            resp["error"] = "Reload timed out waiting for main thread.";
	                            res.status = 504;
	                            res.set_content(resp.dump(2), "application/json");
	                            return;
	                        }

	                        resp["ok"] = g_reloadState.ok;
	                        if (!g_reloadState.ok) {
	                            resp["error"] = g_reloadState.error.empty()
	                                ? "Reload failed (see server log)."
	                                : g_reloadState.error;
	                            res.status = 500;
	                            res.set_content(resp.dump(2), "application/json");
	                            return;
	                        }
	                    }

	                    resp["ok"] = true;
	                    resp["message"] = "Config reload successful.";
	                    res.status = 200;
	                } catch (const std::exception &ex) {
                    resp["ok"] = false;
                    resp["error"] = std::string("Invalid JSON or fields: ") + ex.what();
                    res.status = 400;
                }

                res.set_content(resp.dump(2), "application/json");
            });

	            // /health
	            svr.Get("/health", [&](const httplib::Request &, httplib::Response &res) {
	                json resp;

					auto now = std::chrono::system_clock::now();

						int ok_count = 0;
						int degraded_count = 0;
						int error_count = 0;
						json conn_obj = json::object();

					{
						std::lock_guard<std::mutex> lock(driverMutex);

							if (drivers.empty()) {
								// Treat "no drivers" as a valid bootstrap state so tools like opcbridge-scada
								// can start and create the first connections/tags.
								resp["status"] = "ok";
								resp["reason"] = "no drivers configured";
								resp["connections"] = json::object();
								resp["counts"] = {{"ok", 0}, {"degraded", 0}, {"error", 0}};
								res.status = 200;
								res.set_content(resp.dump(), "application/json");
								return;
							}

							for (auto &driver : drivers) {
								json dstatus;

								if (driver.tags.empty()) {
									dstatus["status"] = "error";
									dstatus["reason"] = "no tags configured";
									++error_count;
									conn_obj[driver.conn.id] = dstatus;
									continue;
								}

								bool has_valid_tag = false;
								int total_seen = 0;
								int good_recent = 0;
								int stale_or_bad = 0;
								int64_t newest_age_ms = -1;

							for (auto &t : driver.tags) {
								if (!t.cfg.enabled) continue;
								if (t.handle < 0) continue;
								has_valid_tag = true;

								std::string key = make_tag_key(driver.conn.id, t.cfg.logical_name);
								auto it = tagTable.find(key);
								if (it == tagTable.end()) {
									continue; // no snapshot yet
								}

								++total_seen;
								const TagSnapshot &snap = it->second;

								auto age_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
									now - snap.timestamp
								).count();
								if (newest_age_ms < 0 || age_ms < newest_age_ms) {
									newest_age_ms = age_ms;
								}

									int scan_ms = t.cfg.scan_ms;
									if (scan_ms <= 0) scan_ms = 1000;

										// Health budgets are intentionally generous: /health should not flap
										// just because the poll loop is busy (e.g., thousands of tags).
										int64_t budget_ms = std::max<int64_t>(static_cast<int64_t>(scan_ms) * 6, 15000);
										bool recent = (age_ms >= 0 && age_ms <= budget_ms);

									if (recent && snap.quality == 1) {
										++good_recent;
									} else {
										++stale_or_bad;
									}
								}

								double stale_ratio = 0.0;
								if (total_seen > 0) {
									stale_ratio = static_cast<double>(stale_or_bad) / static_cast<double>(total_seen);
								}

									if (!has_valid_tag) {
										dstatus["status"] = "error";
										dstatus["reason"] = "no valid tag handles";
										++error_count;
									} else if (total_seen == 0) {
										dstatus["status"] = "error";
										dstatus["reason"] = "no tag snapshots yet";
										++error_count;
									} else if (good_recent == 0) {
										// Poll loop may be behind briefly; avoid flapping ERROR unless we've
										// had no good snapshots for an extended period.
										const int64_t hard_grace_ms = 120000; // 2 minutes
										if (newest_age_ms >= 0 && newest_age_ms <= hard_grace_ms) {
											dstatus["status"] = "degraded";
											dstatus["reason"] = "polling behind (no recent good tag snapshots)";
											++degraded_count;
										} else {
											dstatus["status"] = "error";
											dstatus["reason"] = "no recent good tag snapshots";
											++error_count;
										}
									} else if (stale_ratio <= 0.05) {
										dstatus["status"] = "ok";
										++ok_count;
									} else if (stale_ratio <= 0.25) {
										dstatus["status"] = "degraded";
										dstatus["reason"] = "some tags stale/bad";
										++degraded_count;
									} else {
										const int64_t hard_grace_ms = 120000; // 2 minutes
										if (newest_age_ms >= 0 && newest_age_ms <= hard_grace_ms) {
											dstatus["status"] = "degraded";
											dstatus["reason"] = "many tags stale/bad";
											++degraded_count;
										} else {
											dstatus["status"] = "error";
											dstatus["reason"] = "most tags stale/bad";
											++error_count;
										}
									}

								dstatus["tags_seen"] = total_seen;
								dstatus["good_recent"] = good_recent;
								dstatus["stale_or_bad"] = stale_or_bad;
								dstatus["stale_ratio"] = stale_ratio;
								if (newest_age_ms >= 0) dstatus["newest_age_ms"] = newest_age_ms;

								conn_obj[driver.conn.id] = dstatus;
							}
						}

					std::string overall;
					if (error_count > 0) {
						overall = "error";
					} else if (degraded_count > 0) {
						overall = "degraded";
					} else {
						overall = "ok";
					}

					resp["status"] = overall;
					resp["connections"] = conn_obj;
					resp["counts"] = {
						{"ok", ok_count},
						{"degraded", degraded_count},
						{"error", error_count}
					};

						// HTTP status reflects server availability, not tag quality. Clients should
						// use resp["status"] to display ok/degraded/error.
						res.status = 200;
		                res.set_content(resp.dump(), "application/json");
		            });
            
            // /alarm-history?limit=N  (default 50, max 1000)
            svr.Get("/alarm-history", [&](const httplib::Request &req, httplib::Response &res) {	    int limit = 50;
				if (auto it = req.params.find("limit"); it != req.params.end()) {
					try {
						limit = std::stoi(it->second);
					} catch (...) {
						limit = 50;
					}
				}

				json root;
				json arr;
				bool ok = sqlite_fetch_recent_events(limit, arr);
				root["ok"] = ok;
				root["events"] = arr;
				root["limit"] = limit;

				if (!ok) {
					res.status = 500;
				} else {
					res.status = 200;
				}

				res.set_content(root.dump(2), "application/json");
			});


            // /alarms
            svr.Get("/alarms", [&](const httplib::Request &, httplib::Response &res) {
                std::lock_guard<std::mutex> lock(driverMutex);

                json root;
                root["alarms"] = json::array();

                for (const auto &a : g_alarms) {
                    json ja;
                    ja["id"]            = a.cfg.id;
                    ja["name"]          = a.cfg.name.empty() ? a.cfg.id : a.cfg.name;
                    ja["connection_id"] = a.cfg.connection_id;
                    ja["tag_name"]      = a.cfg.tag_name;
                    ja["type"]          = a.cfg.type;
                    ja["enabled"]       = a.cfg.enabled;
                    ja["severity"]      = a.cfg.severity;
                    ja["message_on_active"] = a.cfg.message_on_active;
                    ja["message_on_return"] = a.cfg.message_on_return;
                    ja["group"]         = a.cfg.group;
                    ja["site"]          = a.cfg.site;
                    ja["active"]        = a.active;

                    // State: active / inactive / disabled
                    std::string state;
                    if (!a.cfg.enabled) {
                        state = "disabled";
                    } else if (a.active) {
                        state = "active";
                    } else {
                        state = "inactive";
                    }
                    ja["state"] = state;

                    // threshold / hysteresis if applicable
                    if (a.cfg.type == "high" || a.cfg.type == "low") {
                        ja["threshold"]  = a.cfg.threshold;
                        ja["hysteresis"] = a.cfg.hysteresis;
                    }
	                    if (a.cfg.type == "equals" || a.cfg.type == "not_equals") {
	                        ja["equals_value"] = a.cfg.equals_value;
	                        ja["tolerance"] = a.cfg.equals_tolerance;
	                    }

                    // last_value if we have one
                    if (a.hasLastValue) {
                        std::visit([&](auto &&arg) {
                            ja["last_value"] = arg;
                        }, a.lastValue);
                    } else {
                        ja["last_value"] = nullptr;
                    }

                    root["alarms"].push_back(ja);
                }

                res.set_content(root.dump(2), "application/json");
            });

			// GET /events  -> last N events from SQLite (e.g. N = 100)
			svr.Get("/events", [&](const httplib::Request &, httplib::Response &res) {
				json root;
				root["ok"] = false;
				root["events"] = json::array();

				// If DB isn't initialized, just return empty list
				if (!g_alarmDb) {
					root["ok"] = true;
					res.set_content(root.dump(2), "application/json");
					return;
				}

				json arr = json::array();
				// Adjust limit to taste: 50 / 100 / 500, etc.
				const int LIMIT = 100;
			
				if (!sqlite_fetch_recent_events(LIMIT, arr)) {
					res.status = 500;
					root["error"] = "SQLite error while fetching events";
					res.set_content(root.dump(2), "application/json");
					return;
				}

				root["ok"] = true;
				root["events"] = arr;
				res.set_content(root.dump(2), "application/json");
			});

				// GET /alarms/events
				svr.Get(R"(/alarms/events)", [&](const httplib::Request &req, httplib::Response &res) {
				int limit = 50;
				if (req.has_param("limit")) {
					try {
						limit = std::stoi(req.get_param_value("limit"));
						if (limit <= 0) limit = 50;
					} catch (...) {
						limit = 50;
					}
				}

				json root;
				json events = json::array();

				if (!sqlite_fetch_recent_events(limit, events)) {
					root["ok"] = false;
					root["error"] = "Failed to fetch events.";
					res.status = 500;
				} else {
					root["ok"] = true;
					root["events"] = events;
					res.status = 200;
				}

					res.set_content(root.dump(2), "application/json");
				});

					// GET /workspace/config -> read-only workspace config (connections + tags), no admin required
					svr.Get("/workspace/config", [&](const httplib::Request &, httplib::Response &res) {
						json root;
						root["ok"] = false;
						root["connections"] = json::array();
						root["tags"] = json::array();

						try {
							auto pick = [](const json &src, const std::vector<std::string> &keys) -> json {
								json out = json::object();
								if (!src.is_object()) return out;
								for (const auto &k : keys) {
									if (src.contains(k)) out[k] = src.at(k);
								}
								return out;
							};
							const std::vector<std::string> connKeys = {
								"id",
								"description",
								"driver",
								"plc_type",
								"gateway",
								"path",
								"slot",
								"default_timeout_ms",
								"default_read_ms",
								"default_write_ms",
								"debug"};
								const std::vector<std::string> tagKeys = {
									"connection_id",
									"name",
									"plc_tag_name",
									"datatype",
									"scan_ms",
									"enabled",
									"writable",
									"mqtt_command_allowed",
									"log_event_on_change",
									"log_periodic",
									"log_periodic_mode",
									"log_periodic_interval_sec",
									"log_hourly_minute",
									"log_daily_hour",
									"log_daily_minute",
									"source_file"};

							// connections/*.json
							const std::string connDir = joinPath(configDir, "connections");
							if (fs::exists(connDir) && fs::is_directory(connDir)) {
								std::vector<std::string> paths;
								for (const auto &entry : fs::directory_iterator(connDir)) {
									if (!entry.is_regular_file()) continue;
									if (entry.path().extension() != ".json" && entry.path().extension() != ".jsonc") continue;
									paths.push_back(entry.path().string());
								}
								std::sort(paths.begin(), paths.end());
								for (const auto &path : paths) {
									try {
										json c = load_json_with_comments(path);
										if (!c.is_object()) continue;
										std::string id = c.value("id", std::string{});
										if (id.empty()) continue;
										fs::path p(path);
										json safe = pick(c, connKeys);
										safe["__path"] = std::string("connections/") + p.filename().string();
										root["connections"].push_back(safe);
									} catch (const std::exception &ex) {
										std::cerr << "[workspace] Error reading connection file " << path
												  << ": " << ex.what() << "\n";
									}
								}
							}

								// tags/*.json (flattened view, same shape as /config/tags)
								// Prefer one canonical tag file per connection_id (tags/<id>.json). If present, ignore other files
								// that claim the same connection_id (e.g. legacy .jsonc or alternate filenames).
								const std::string tagDir = joinPath(configDir, "tags");
								if (fs::exists(tagDir) && fs::is_directory(tagDir)) {
									std::unordered_set<std::string> seenTags;

									struct Choice {
										std::string cid;
										std::string path;
										std::string filename;
									};

									std::vector<Choice> candidates;
									for (const auto &entry : fs::directory_iterator(tagDir)) {
										if (!entry.is_regular_file()) continue;
										const std::string ext = entry.path().extension().string();
										if (ext != ".json" && ext != ".jsonc") continue;

										const std::string path = entry.path().string();
										try {
											json jf = load_json_with_comments(path);
											if (!jf.is_object()) continue;
											const std::string cid = jf.value("connection_id", std::string{});
											if (cid.empty()) continue;
											if (!jf.contains("tags") || !jf["tags"].is_array()) continue;
											candidates.push_back({cid, path, entry.path().filename().string()});
										} catch (const std::exception &ex) {
											std::cerr << "[workspace] Error reading tag file " << path
													  << ": " << ex.what() << "\n";
										}
									}

									std::unordered_map<std::string, std::vector<Choice>> byCid;
									for (const auto &c : candidates) byCid[c.cid].push_back(c);

									std::map<std::string, Choice> chosen;
									for (auto &kv : byCid) {
										const std::string &cid = kv.first;
										auto &arr              = kv.second;
										auto isCanonicalJson   = [&](const Choice &x) { return x.filename == (cid + ".json"); };
										auto isCanonicalJsonc  = [&](const Choice &x) { return x.filename == (cid + ".jsonc"); };

										auto it = std::find_if(arr.begin(), arr.end(), isCanonicalJson);
										if (it == arr.end()) it = std::find_if(arr.begin(), arr.end(), isCanonicalJsonc);
										if (it == arr.end()) {
											std::sort(arr.begin(), arr.end(), [](const Choice &a, const Choice &b) {
												return a.filename < b.filename;
											});
											it = arr.begin();
										}
										chosen[cid] = *it;
									}

									for (const auto &kv : chosen) {
										const auto &pickFile = kv.second;
										try {
											json jf = load_json_with_comments(pickFile.path);
											if (!jf.is_object()) continue;
											std::string connId = jf.value("connection_id", std::string{});
											if (connId.empty()) continue;
											if (!jf.contains("tags") || !jf["tags"].is_array()) continue;

											for (const auto &t : jf["tags"]) {
												if (!t.is_object()) continue;
												const std::string name = t.value("name", std::string{});
												if (!name.empty()) {
													const std::string key = connId + ":" + name;
													if (!seenTags.insert(key).second) continue;
												}
												json flat = t;
												flat["connection_id"] = connId;
												flat["source_file"]   = pickFile.filename;
												root["tags"].push_back(pick(flat, tagKeys));
											}
										} catch (const std::exception &ex) {
											std::cerr << "[workspace] Error reading tag file " << pickFile.path
													  << ": " << ex.what() << "\n";
										}
									}
								}

						root["ok"] = true;
						res.status = 200;
					} catch (const std::exception &ex) {
						root["ok"] = false;
						root["error"] = std::string("Exception in /workspace/config: ") + ex.what();
						res.status = 500;
					}

					res.set_content(root.dump(2), "application/json");
				});

					// GET /config/tags  -> flattened view of all tag configs on disk
					svr.Get("/config/tags", [&](const httplib::Request &req, httplib::Response &res) {
						if (!is_admin_request(req)) {
							json err;
						err["ok"] = false;
						err["error"] = "Admin login required.";
						res.status = 403;
						res.set_content(err.dump(2), "application/json");
						return;
					}
					json root;
					root["ok"]   = false;
					root["tags"] = json::array();

					try {
						std::string tagDir = joinPath(configDir, "tags");
						root["source_dir"] = tagDir;

						if (!fs::exists(tagDir)) {
						root["ok"]      = true;
						root["message"] = "Tags directory does not exist.";
						res.status      = 200;
							res.set_content(root.dump(2), "application/json");
							return;
						}

						std::unordered_set<std::string> seenTags;

						struct Choice {
							std::string cid;
							std::string path;
							std::string filename;
						};
						std::vector<Choice> candidates;

						for (const auto &entry : fs::directory_iterator(tagDir)) {
							if (!entry.is_regular_file()) continue;
							const std::string ext = entry.path().extension().string();
							if (ext != ".json" && ext != ".jsonc") continue;

							const std::string path     = entry.path().string();
							const std::string filename = entry.path().filename().string();

							try {
								json jf = load_json_with_comments(path);
								if (!jf.is_object()) continue;

								// Expect each file to look like:
								// { "connection_id": "test01", "tags": [ ... ] }
								const std::string connId = jf.value("connection_id", std::string{});
								if (connId.empty()) continue;
								if (!jf.contains("tags") || !jf["tags"].is_array()) continue;

								candidates.push_back({connId, path, filename});
							} catch (const std::exception &ex) {
								std::cerr << "[config] Error reading tag file " << path
										  << ": " << ex.what() << "\n";
							}
						}

						std::unordered_map<std::string, std::vector<Choice>> byCid;
						for (const auto &c : candidates) byCid[c.cid].push_back(c);

						std::map<std::string, Choice> chosen;
						for (auto &kv : byCid) {
							const std::string &cid = kv.first;
							auto &arr              = kv.second;
							auto isCanonicalJson   = [&](const Choice &x) { return x.filename == (cid + ".json"); };
							auto isCanonicalJsonc  = [&](const Choice &x) { return x.filename == (cid + ".jsonc"); };

							auto it = std::find_if(arr.begin(), arr.end(), isCanonicalJson);
							if (it == arr.end()) it = std::find_if(arr.begin(), arr.end(), isCanonicalJsonc);
							if (it == arr.end()) {
								std::sort(arr.begin(), arr.end(), [](const Choice &a, const Choice &b) {
									return a.filename < b.filename;
								});
								it = arr.begin();
							}
							chosen[cid] = *it;
						}

						for (const auto &kv : chosen) {
							const auto &pickFile = kv.second;
							try {
								json jf = load_json_with_comments(pickFile.path);
								const std::string connId = jf.value("connection_id", std::string{});
								if (connId.empty()) continue;
								if (!jf.contains("tags") || !jf["tags"].is_array()) continue;

								for (const auto &t : jf["tags"]) {
									if (!t.is_object()) continue;
									const std::string name = t.value("name", std::string{});
									if (!name.empty()) {
										const std::string key = connId + ":" + name;
										if (!seenTags.insert(key).second) continue;
									}
									json flat = t;
									flat["connection_id"] = connId;
									flat["source_file"]   = pickFile.filename;
									root["tags"].push_back(flat);
								}
							} catch (const std::exception &ex) {
								std::cerr << "[config] Error reading tag file " << pickFile.path
										  << ": " << ex.what() << "\n";
							}
						}

					root["ok"] = true;
					res.status = 200;
				} catch (const std::exception &ex) {
					root["ok"]    = false;
					root["error"] = std::string("Exception in /config/tags: ") + ex.what();
					res.status    = 500;
				}

				res.set_content(root.dump(2), "application/json");
			});
			
				// GET /config/tagfiles  -> list of tag config files with full parsed content
				svr.Get("/config/tagfiles", [&](const httplib::Request &req, httplib::Response &res) {
					if (!is_admin_request(req)) {
						json err;
						err["ok"] = false;
						err["error"] = "Admin login required.";
						res.status = 403;
						res.set_content(err.dump(2), "application/json");
						return;
					}
					json root;
					root["ok"]    = false;
					root["files"] = json::array();

				try {
					std::string tagDir = joinPath(configDir, "tags");
					root["source_dir"] = tagDir;

					if (!fs::exists(tagDir)) {
						root["ok"]      = true;
						root["message"] = "Tags directory does not exist.";
						res.status      = 200;
						res.set_content(root.dump(2), "application/json");
						return;
					}

					for (const auto &entry : fs::directory_iterator(tagDir)) {
						if (!entry.is_regular_file()) continue;
						if (entry.path().extension() != ".json") continue;

						std::string path     = entry.path().string();
						std::string filename = entry.path().filename().string();

						try {
							json jf = load_json_with_comments(path);

							json rec;
							rec["file"]      = filename;
							rec["full_path"] = path;

							// SAFE: copy connection_id only if present and string
							if (jf.contains("connection_id") && jf["connection_id"].is_string()) {
								rec["connection_id"] = jf["connection_id"].get<std::string>();
							} else {
								rec["connection_id"] = nullptr;
							}

							// Entire parsed JSON content
							rec["content"] = jf;

							root["files"].push_back(rec);
						} catch (const std::exception &ex) {
							std::cerr << "[config] Error reading tag file " << path
									  << ": " << ex.what() << "\n";

							json rec;
							rec["file"]      = filename;
							rec["full_path"] = path;
							rec["error"]     = std::string("Failed to parse: ") + ex.what();
							root["files"].push_back(rec);
						}
					}

					root["ok"] = true;
					res.status = 200;
				} catch (const std::exception &ex) {
					root["ok"]    = false;
					root["error"] = std::string("Exception in /config/tagfiles: ") + ex.what();
					res.status    = 500;
				}

				res.set_content(root.dump(2), "application/json");
			});

			// List config files (connections, tags, mqtt, mqtt_inputs, alarms, ca.crt)
			svr.Get("/config/files", [&](const httplib::Request &req, httplib::Response &res) {
                if (!is_admin_request(req)) {
                    json err;
                    err["ok"] = false;
                    err["error"] = "Admin login required.";
                    res.status = 403;
                    res.set_content(err.dump(2), "application/json");
                    return;
                }
				std::lock_guard<std::mutex> lock(driverMutex);

				json root;
				json files = json::array();

				auto add_file = [&](const std::string &relPath,
									const std::string &kindStr) {
					std::string fullPath = joinPath(configDir, relPath);
					std::error_code ec;

					if (!fs::exists(fullPath)) {
						return;
					}

					json jf;
					jf["path"] = relPath;
					jf["kind"] = kindStr;

					auto sz = fs::file_size(fullPath, ec);
					if (!ec) {
						jf["size_bytes"] = static_cast<std::uintmax_t>(sz);
					}

					auto ft = fs::last_write_time(fullPath, ec);
					if (!ec) {
						// store as epoch ms for UI use
						auto sctp = std::chrono::time_point_cast<std::chrono::system_clock::duration>(
							ft - fs::file_time_type::clock::now() + std::chrono::system_clock::now()
						);
						auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
							sctp.time_since_epoch()
						).count();
						jf["mtime_ms"] = ms;
					}

					files.push_back(jf);
				};

				// connections/*.json
				{
					std::string dir = joinPath(configDir, "connections");
					std::error_code ec;
					if (fs::exists(dir, ec) && fs::is_directory(dir, ec)) {
						for (const auto &entry : fs::directory_iterator(dir)) {
							if (!entry.is_regular_file()) continue;
							if (entry.path().extension() != ".json") continue;

							fs::path p = entry.path();
							std::string rel = "connections/" + p.filename().string();
							add_file(rel, "connection");
						}
					}
				}

				// tags/*.json
				{
					std::string dir = joinPath(configDir, "tags");
					std::error_code ec;
					if (fs::exists(dir, ec) && fs::is_directory(dir, ec)) {
						for (const auto &entry : fs::directory_iterator(dir)) {
							if (!entry.is_regular_file()) continue;
							if (entry.path().extension() != ".json") continue;

							fs::path p = entry.path();
							std::string rel = "tags/" + p.filename().string();
							add_file(rel, "tags");
						}
					}
				}

				// Root-level JSON configs
				add_file("mqtt.json",        "mqtt");
				add_file("mqtt_inputs.json", "mqtt_inputs");
				add_file("alarms.json",      "alarms");

					// MQTT CA certificate
					add_file("ca.crt",           "tls_cert");

					root["ok"] = true;
					root["files"] = files;
					res.set_content(root.dump(2), "application/json");
				});

				// Download a single config file (raw text, comments preserved)
				svr.Get("/config/file", [&](const httplib::Request &req, httplib::Response &res) {
					if (!is_admin_request(req)) {
						json err;
						err["ok"] = false;
						err["error"] = "Admin login required.";
						res.status = 403;
						res.set_content(err.dump(2), "application/json");
						return;
					}
					std::lock_guard<std::mutex> lock(driverMutex);

				if (!req.has_param("path")) {
					res.status = 400;
					json err;
					err["error"] = "Missing 'path' query parameter.";
					res.set_content(err.dump(2), "application/json");
					return;
				}

				std::string relPath = req.get_param_value("path");
				ConfigFileKind kind = classify_config_path(relPath);
				if (kind == ConfigFileKind::UNKNOWN) {
					res.status = 400;
					json err;
					err["error"]   = "Invalid or unsupported config path.";
					err["path"]    = relPath;
					res.set_content(err.dump(2), "application/json");
					return;
				}

				std::string fullPath = joinPath(configDir, relPath);
				if (!fs::exists(fullPath)) {
					res.status = 404;
					json err;
					err["error"] = "Config file not found.";
					err["path"]  = relPath;
					res.set_content(err.dump(2), "application/json");
					return;
				}

				try {
					std::string txt = read_file_to_string(fullPath);

					// Use basename as download filename (e.g. "microplc03.json", "ca.crt")
					fs::path p(relPath);
					std::string downloadName = p.filename().string();
					if (downloadName.empty()) {
						downloadName = "config.txt";
					}

					res.set_header(
						"Content-Disposition",
						"attachment; filename=\"" + downloadName + "\""
					);

					// Serve as plain text so comments remain visible/editable
					res.set_content(txt, "text/plain; charset=utf-8");
				} catch (const std::exception &ex) {
					res.status = 500;
					json err;
					err["error"] = std::string("Failed to read file: ") + ex.what();
					err["path"]  = relPath;
					res.set_content(err.dump(2), "application/json");
				}
			});

			// Upload or overwrite a config file
			// Body: { "token": "...", "path": "connections/microplc03.json", "content": "..." }
			svr.Post("/config/file", [&](const httplib::Request &req, httplib::Response &res) {
                if (!is_admin_request(req)) {
                    json err;
                    err["ok"] = false;
                    err["error"] = "Admin login required.";
                    res.status = 403;
                    res.set_content(err.dump(2), "application/json");
                    return;
                }
				std::lock_guard<std::mutex> lock(driverMutex);

				json resp;
				try {
					json body = json::parse(req.body);

					std::string clientToken = body.value("token", std::string{});
					if (clientToken != writeToken) {
						resp["ok"] = false;
						resp["error"] = "Invalid or missing write token.";
						res.status = 403;
						res.set_content(resp.dump(2), "application/json");
						return;
					}

					std::string relPath = body.at("path").get<std::string>();
					std::string newText = body.at("content").get<std::string>();

					if (relPath.empty()) {
						resp["ok"] = false;
						resp["error"] = "Missing 'path' field.";
						res.status = 400;
						res.set_content(resp.dump(2), "application/json");
						return;
					}

					ConfigFileKind kind = classify_config_path(relPath);
					if (kind == ConfigFileKind::UNKNOWN) {
						resp["ok"] = false;
						resp["error"] = "Unsupported or unsafe config path.";
						res.status = 400;
						res.set_content(resp.dump(2), "application/json");
						return;
					}

					// Validate by kind
					std::string validateError;
					switch (kind) {
						case ConfigFileKind::CONNECTION:
							if (!validate_connection_json(newText, validateError)) {
								resp["ok"] = false;
								resp["error"] = validateError;
								res.status = 400;
								res.set_content(resp.dump(2), "application/json");
								return;
							}
							break;

						case ConfigFileKind::TAGS:
							if (!validate_tags_json(newText, validateError)) {
								resp["ok"] = false;
								resp["error"] = validateError;
								res.status = 400;
								res.set_content(resp.dump(2), "application/json");
								return;
							}
							break;

						case ConfigFileKind::MQTT:
							if (!validate_mqtt_json(newText, validateError)) {
								resp["ok"] = false;
								resp["error"] = validateError;
								res.status = 400;
								res.set_content(resp.dump(2), "application/json");
								return;
							}
							break;

						case ConfigFileKind::MQTT_INPUTS:
							if (!validate_mqtt_inputs_json(newText, validateError)) {
								resp["ok"] = false;
								resp["error"] = validateError;
								res.status = 400;
								res.set_content(resp.dump(2), "application/json");
								return;
							}
							break;

						case ConfigFileKind::ALARMS:
							if (!validate_alarms_json(newText, validateError)) {
								resp["ok"] = false;
								resp["error"] = validateError;
								res.status = 400;
								res.set_content(resp.dump(2), "application/json");
								return;
							}
							break;

						case ConfigFileKind::TLS_CERT:
							// No JSON validation for ca.crt – accept as raw text.
							break;

						case ConfigFileKind::UNKNOWN:
						default:
							resp["ok"] = false;
							resp["error"] = "Unsupported or unsafe config path.";
							res.status = 400;
							res.set_content(resp.dump(2), "application/json");
							return;
					}

					// Build full path and ensure parent directory exists
					std::string fullPath = joinPath(configDir, relPath);
					fs::path p(fullPath);
					if (!p.parent_path().empty()) {
						std::error_code ec;
						fs::create_directories(p.parent_path(), ec);
						if (ec) {
							resp["ok"] = false;
							resp["error"] = std::string("Failed to create directory: ") + ec.message();
							res.status = 500;
							res.set_content(resp.dump(2), "application/json");
							return;
						}
					}

					// Write to temp file then rename
					std::string tempPath = fullPath + ".tmp";
					{
						std::ofstream ofs(tempPath, std::ios::binary | std::ios::trunc);
						if (!ofs) {
							resp["ok"] = false;
							resp["error"] = "Failed to open temp file for write.";
							res.status = 500;
							res.set_content(resp.dump(2), "application/json");
							return;
						}
						ofs << newText;
					}

					std::error_code ec;
					fs::rename(tempPath, fullPath, ec);
					if (ec) {
						resp["ok"] = false;
						resp["error"] = std::string("Failed to rename temp file: ") + ec.message();
						res.status = 500;
						res.set_content(resp.dump(2), "application/json");
						return;
					}

					resp["ok"]   = true;
					resp["path"] = relPath;
					res.status   = 200;
					res.set_content(resp.dump(2), "application/json");

				} catch (const std::exception &ex) {
					resp["ok"] = false;
					resp["error"] = std::string("Invalid JSON or fields: ") + ex.what();
					res.status = 400;
					res.set_content(resp.dump(2), "application/json");
				}
			});

			// Delete a config file
			// Body: { "token": "...", "path": "connections/microplc03.json" }
			svr.Post("/config/delete", [&](const httplib::Request &req, httplib::Response &res) {
                if (!is_admin_request(req)) {
                    json err;
                    err["ok"] = false;
                    err["error"] = "Admin login required.";
                    res.status = 403;
                    res.set_content(err.dump(2), "application/json");
                    return;
                }
				std::lock_guard<std::mutex> lock(driverMutex);

				json resp;
				try {
					json body = json::parse(req.body);

					std::string clientToken = body.value("token", std::string{});
					if (clientToken != writeToken) {
						resp["ok"] = false;
						resp["error"] = "Invalid or missing write token.";
						res.status = 403;
						res.set_content(resp.dump(2), "application/json");
						return;
					}

					std::string relPath = body.at("path").get<std::string>();
					if (relPath.empty()) {
						resp["ok"] = false;
						resp["error"] = "Missing 'path' field.";
						res.status = 400;
						res.set_content(resp.dump(2), "application/json");
						return;
					}

					ConfigFileKind kind = classify_config_path(relPath);
					switch (kind) {
						case ConfigFileKind::CONNECTION:
						case ConfigFileKind::TAGS:
						case ConfigFileKind::MQTT:
						case ConfigFileKind::MQTT_INPUTS:
						case ConfigFileKind::ALARMS:
						case ConfigFileKind::TLS_CERT:
							break; // allowed
						case ConfigFileKind::UNKNOWN:
						default:
							resp["ok"] = false;
							resp["error"] = "Unsupported or unsafe config path.";
							res.status = 400;
							res.set_content(resp.dump(2), "application/json");
							return;
					}

					std::string fullPath = joinPath(configDir, relPath);
					if (!fs::exists(fullPath)) {
						resp["ok"] = false;
						resp["error"] = "File does not exist.";
						res.status = 404;
						res.set_content(resp.dump(2), "application/json");
						return;
					}

					std::error_code ec;
					fs::remove(fullPath, ec);
					if (ec) {
						resp["ok"] = false;
						resp["error"] = std::string("Failed to delete: ") + ec.message();
						res.status = 500;
						res.set_content(resp.dump(2), "application/json");
						return;
					}

					resp["ok"]   = true;
					resp["path"] = relPath;
					res.status   = 200;
					res.set_content(resp.dump(2), "application/json");

				} catch (const std::exception &ex) {
					resp["ok"] = false;
					resp["error"] = std::string("Invalid JSON or fields: ") + ex.what();
					res.status = 400;
					res.set_content(resp.dump(2), "application/json");
				}
			});

			// Upload MQTT CA certificate (raw body -> cafile)
			svr.Post("/config/cert/upload", [&](const httplib::Request &req, httplib::Response &res) {
                if (!is_admin_request(req)) {
                    json err;
                    err["ok"] = false;
                    err["error"] = "Admin login required.";
                    res.status = 403;
                    res.set_content(err.dump(2), "application/json");
                    return;
                }
				json resp;

				// Require write token
				if (!req.has_param("token")) {
					res.status = 403;
					resp["ok"]    = false;
					resp["error"] = "Missing write token.";
					res.set_content(resp.dump(2), "application/json");
					return;
				}
				std::string clientToken = req.get_param_value("token");
				if (clientToken != writeToken) {
					res.status = 403;
					resp["ok"]    = false;
					resp["error"] = "Invalid write token.";
					res.set_content(resp.dump(2), "application/json");
					return;
				}

				// Resolve destination path
				std::string destPath = resolve_ca_cert_path(configDir);
				fs::path dest(destPath);

				try {
					fs::path parent = dest.parent_path();
					if (!parent.empty()) {
						std::error_code ec;
						fs::create_directories(parent, ec);
						if (ec) {
							res.status = 500;
							resp["ok"]    = false;
							resp["error"] = std::string("Failed to create directory '")
											+ parent.string() + "': " + ec.message();
							res.set_content(resp.dump(2), "application/json");
							return;
						}
					}

					// Write raw body to cert file (no need for it to exist beforehand)
					std::ofstream ofs(dest, std::ios::binary | std::ios::trunc);
					if (!ofs) {
						res.status = 500;
						resp["ok"]    = false;
						resp["error"] = std::string("Failed to open '") + dest.string() + "' for writing.";
						res.set_content(resp.dump(2), "application/json");
						return;
					}

					ofs.write(req.body.data(), static_cast<std::streamsize>(req.body.size()));
					ofs.close();

					resp["ok"]      = true;
					resp["message"] = std::string("CA certificate written to ") + dest.string();
					res.status      = 200;
					res.set_content(resp.dump(2), "application/json");
				} catch (const std::exception &ex) {
					res.status = 500;
					resp["ok"]    = false;
					resp["error"] = std::string("Exception writing CA cert: ") + ex.what();
					res.set_content(resp.dump(2), "application/json");
				}
			});

			// Download MQTT CA certificate
			svr.Get("/config/cert/download", [&](const httplib::Request &req, httplib::Response &res) {
                if (!is_admin_request(req)) {
                    json err;
                    err["ok"] = false;
                    err["error"] = "Admin login required.";
                    res.status = 403;
                    res.set_content(err.dump(2), "application/json");
                    return;
                }
				json err;

				std::string path = resolve_ca_cert_path(configDir);
				fs::path p(path);

				if (!fs::exists(p)) {
					res.status = 404;
					err["error"] = "CA certificate not found.";
					err["path"]  = p.string();
					res.set_content(err.dump(2), "application/json");
					return;
				}

				try {
					std::ifstream ifs(p, std::ios::binary);
					if (!ifs) {
						res.status = 500;
						err["error"] = std::string("Failed to open '") + p.string() + "' for reading.";
						res.set_content(err.dump(2), "application/json");
						return;
					}

					std::string contents((std::istreambuf_iterator<char>(ifs)),
										 std::istreambuf_iterator<char>());

					// Try to pick a reasonable content type
					res.set_content(contents, "application/x-pem-file");
					std::string filename = p.filename().string();
					if (filename.empty()) filename = "ca.crt";
					res.set_header("Content-Disposition", "attachment; filename=\"" + filename + "\"");
				} catch (const std::exception &ex) {
					res.status = 500;
					err["error"] = std::string("Exception reading CA cert: ") + ex.what();
					res.set_content(err.dump(2), "application/json");
				}
			});

			// POST /config/tags  -> overwrite tag config files from a flat tag list
			svr.Post("/config/tags", [&](const httplib::Request &req, httplib::Response &res) {
                if (!is_admin_request(req)) {
                    json err;
                    err["ok"] = false;
                    err["error"] = "Admin login required.";
                    res.status = 403;
                    res.set_content(err.dump(2), "application/json");
                    return;
                }
				json resp;
				resp["ok"] = false;

				try {
					json body = json::parse(req.body);

					// 1) Token check
					std::string clientToken = body.value("token", std::string{});
					if (clientToken != writeToken) {
						resp["error"] = "Invalid or missing write token.";
						res.status    = 403;
						res.set_content(resp.dump(2), "application/json");
						return;
					}

					if (!body.contains("tags") || !body["tags"].is_array()) {
						resp["error"] = "Missing 'tags' array in request body.";
						res.status    = 400;
						res.set_content(resp.dump(2), "application/json");
						return;
					}

					// 2) Group tags by connection_id
					std::map<std::string, json> byConn; // connId -> { connection_id, tags: [...] }

					int idx = 0;
					for (const auto &t : body["tags"]) {
						++idx;
						if (!t.is_object()) {
							throw std::runtime_error("Tag at index " + std::to_string(idx) +
													 " is not an object.");
						}

						std::string connId = t.value("connection_id", std::string{});
						if (connId.empty()) {
							throw std::runtime_error("Tag at index " + std::to_string(idx) +
													 " is missing 'connection_id'.");
						}
						if (!t.contains("name")) {
							throw std::runtime_error("Tag at index " + std::to_string(idx) +
													 " is missing 'name'.");
						}
						if (!t.contains("plc_tag_name")) {
							throw std::runtime_error("Tag '" +
													 t.value("name", std::string{"<unnamed>"}) +
													 "' is missing 'plc_tag_name'.");
						}
						if (!t.contains("datatype")) {
							throw std::runtime_error("Tag '" +
													 t.value("name", std::string{"<unnamed>"}) +
													 "' is missing 'datatype'.");
						}

						json tagCopy = t;
						// We store connection_id at the file level, so remove it from the tag object
						tagCopy.erase("connection_id");

						json &fileJson = byConn[connId];
						if (fileJson.is_null()) {
							fileJson = json::object();
							fileJson["connection_id"] = connId;
							fileJson["tags"]          = json::array();
						}
						fileJson["tags"].push_back(tagCopy);
					}

					if (byConn.empty()) {
						resp["error"] = "No valid tags provided.";
						res.status    = 400;
						res.set_content(resp.dump(2), "application/json");
						return;
					}

					// 3) Ensure tag directory exists
					std::string tagDir = joinPath(configDir, "tags");
					std::error_code ec;
					fs::create_directories(tagDir, ec);
					if (ec) {
						throw std::runtime_error("Failed to create tags directory '" +
												 tagDir + "': " + ec.message());
					}

					// 4) Write one JSON file per connection_id
					json written = json::array();

					for (auto &kv : byConn) {
						const std::string &connId  = kv.first;
						json &fileJson             = kv.second;
						std::string path           = joinPath(tagDir, connId + ".json");
						std::string backupPath     = path + ".bak";

						// Backup existing file, if any
						if (fs::exists(path)) {
							std::error_code bec;
							fs::rename(path, backupPath, bec);
							if (bec) {
								std::cerr << "[config] Warning: failed to backup " << path
										  << " -> " << backupPath << ": " << bec.message() << "\n";
							} else {
								std::cout << "[config] Backed up " << path
										  << " to " << backupPath << "\n";
							}
						}

						std::ofstream ofs(path);
						if (!ofs) {
							throw std::runtime_error("Failed to open '" + path + "' for write.");
						}
						ofs << fileJson.dump(2) << "\n";
						ofs.close();

						std::cout << "[config] Wrote tag file: " << path
								  << " (" << fileJson["tags"].size() << " tag(s))\n";

						written.push_back(connId);
					}

					resp["ok"]                   = true;
					resp["written_connections"]  = written;
					resp["message"]              = "Tag configuration updated. Use /reload to apply.";
					resp["reload_required"]      = true;
					res.status                   = 200;
				} catch (const std::exception &ex) {
					resp["error"] = std::string("Exception in /config/tags: ") + ex.what();
					res.status    = 400;
				}

				res.set_content(resp.dump(2), "application/json");
			});


			// ------------------------------------------------------------
			// GET /config/bundle
			// Returns a JSON bundle of all known config files so user can
			// download/backup in one shot.
			// ------------------------------------------------------------
			svr.Get("/config/bundle", [&](const httplib::Request &req, httplib::Response &res) {
                if (!is_admin_request(req)) {
                    json err;
                    err["ok"] = false;
                    err["error"] = "Admin login required.";
                    res.status = 403;
                    res.set_content(err.dump(2), "application/json");
                    return;
                }
				json bundle;
				std::string err;

				if (!build_config_bundle_json(configDir, bundle, err)) {
					res.status = 500;
					json jerr;
					jerr["ok"]    = false;
					jerr["error"] = std::string("Failed to build bundle: ") + err;
					res.set_content(jerr.dump(2), "application/json");
					return;
				}

				json root;
				root["ok"]     = true;
				root["bundle"] = bundle;

				res.set_content(root.dump(2), "application/json");
			});

			// ------------------------------------------------------------
			// POST /config/bundle
			// Body: { "bundle": { ... } }
			// Overwrites the config files listed in the bundle.
			// Does NOT auto-reload; user can click Reload in UI after.
			// ------------------------------------------------------------
				svr.Post("/config/bundle", [&](const httplib::Request &req, httplib::Response &res) {
                if (!is_admin_request(req)) {
                    json err;
                    err["ok"] = false;
                    err["error"] = "Admin login required.";
                    res.status = 403;
                    res.set_content(err.dump(2), "application/json");
                    return;
                }
				json root;
				try {
					json body = json::parse(req.body);

					if (!body.contains("bundle")) {
						res.status = 400;
						root["ok"]    = false;
						root["error"] = "Missing 'bundle' field.";
						res.set_content(root.dump(2), "application/json");
						return;
					}

					json bundle = body["bundle"];
					std::string err;
					if (!apply_config_bundle_json(configDir, bundle, err)) {
						res.status = 400;
						root["ok"]    = false;
						root["error"] = err.empty()
										? "Failed to apply bundle."
										: err;
						res.set_content(root.dump(2), "application/json");
						return;
					}

					root["ok"]      = true;
					root["message"] = "Config bundle applied. Use Reload to re-open drivers.";
					res.set_content(root.dump(2), "application/json");
				} catch (const std::exception &ex) {
					res.status = 400;
					root["ok"]    = false;
					root["error"] = std::string("Invalid JSON: ") + ex.what();
					res.set_content(root.dump(2), "application/json");
				}
				});

				// ------------------------------------------------------------
				// GET /config/alarms
				// Returns the alarms.json config (or empty rules if missing).
				// Intended for opcbridge-alarms and admin tooling.
				// ------------------------------------------------------------
				svr.Get("/config/alarms", [&](const httplib::Request &req, httplib::Response &res) {
	                if (!is_admin_request(req)) {
	                    json err;
	                    err["ok"] = false;
	                    err["error"] = "Admin login required.";
	                    res.status = 403;
	                    res.set_content(err.dump(2), "application/json");
	                    return;
	                }

					const std::string alarmsPath = joinPath(configDir, "alarms.json");

					json out;
					out["ok"] = true;
					out["path"] = "alarms.json";
					out["mtime_ms"] = nullptr;
					out["json"] = json::object({{"rules", json::array()}});

						try {
							if (fs::exists(alarmsPath)) {
								auto ftime = fs::last_write_time(alarmsPath);
								// Convert filesystem clock to system_clock in C++17
								// (C++20 has file_clock::to_sys, but we build as C++17).
								auto sctp = std::chrono::time_point_cast<std::chrono::system_clock::duration>(
									ftime - fs::file_time_type::clock::now() + std::chrono::system_clock::now()
								);
								auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(sctp.time_since_epoch()).count();
								out["mtime_ms"] = ms;

							std::string raw = read_file_to_string(alarmsPath);
							std::string stripped = strip_json_comments(raw);
							out["json"] = json::parse(stripped);
						}
					} catch (const std::exception &ex) {
						out["ok"] = false;
						out["error"] = std::string("Failed to read alarms.json: ") + ex.what();
						res.status = 500;
					}

					res.set_content(out.dump(2), "application/json");
				});

	            // ---------- ADMIN AUTH ENDPOINTS ----------

			            // GET /auth/status
			            svr.Get("/auth/status", [&](const httplib::Request &req, httplib::Response &res) {
			                cleanup_expired_admin_sessions();
			                json resp;
			                // Backwards-compatible admin status (editor+).
			                resp["configured"] = g_userStoreConfigured;
			                resp["logged_in"]  = is_admin_request(req);
			                resp["legacy_admin_auth_present"] = g_adminAuthFilePresent;
			                resp["legacy_admin_auth_configured"] = g_legacyAdminConfigured;
			                resp["legacy_admin_auth_error"] = g_adminAuthLoadError.empty() ? json(nullptr) : json(g_adminAuthLoadError);
			                // New unified auth status (any role).
			                AdminSessionInfo sess;
			                const bool userLoggedIn = is_user_logged_in(req, sess);
			                resp["user_logged_in"] = userLoggedIn;
			                resp["user"] = userLoggedIn
		                  ? json::object({{"username", sess.username}, {"role", normalize_auth_role(sess.role)}})
		                  : json(nullptr);
			                resp["initialized"] = g_userStoreConfigured;
			                resp["timeoutMinutes"] = g_userStoreConfigured ? g_authTimeoutMinutes : 0;
			                resp["roles"] = json::array();
			                for (const auto &r : g_authRoles) {
			                    resp["roles"].push_back({
			                        {"id", r.id},
			                        {"label", r.label},
			                        {"description", r.description.empty() ? json(nullptr) : json(r.description)},
			                        {"rank", r.rank}
			                    });
			                }
			                resp["users"] = json::array();
			                if (g_userStoreConfigured) {
			                    for (const auto &u : g_authUsers) {
			                        resp["users"].push_back({
			                            {"username", u.username},
		                            {"role", normalize_auth_role(u.role)}
		                        });
		                    }
		                }
		                resp["service_token_enabled"] = !g_adminServiceToken.empty();
		                resp["service_token_len"] = static_cast<int>(g_adminServiceToken.size());
		                res.set_content(resp.dump(2), "application/json");
		            });

	            // GET /auth/debug
	            // Debug helper to verify whether the caller's X-Admin-Token header
	            // matches the service token (does not reveal token value).
		            svr.Get("/auth/debug", [&](const httplib::Request &req, httplib::Response &res) {
		                cleanup_expired_admin_sessions();
		                std::string token = req.get_header_value("X-Admin-Token");
		                if (token.empty()) token = get_cookie_value(req, "OPCBRIDGE_ADMIN_TOKEN");
		                json resp;
		                resp["ok"] = true;
		                resp["header_present"] = !token.empty();
		                resp["header_len"] = static_cast<int>(token.size());
	                resp["service_token_enabled"] = !g_adminServiceToken.empty();
	                resp["service_token_len"] = static_cast<int>(g_adminServiceToken.size());
	                resp["matches_service_token"] = (!g_adminServiceToken.empty() && token == g_adminServiceToken);
		                resp["admin_session_valid"] = false;
		                if (!token.empty()) {
		                    std::lock_guard<std::mutex> lock(g_adminMutex);
		                    auto it = g_adminSessions.find(token);
		                    if (it != g_adminSessions.end() && it->second.expires_at > std::chrono::system_clock::now()) {
		                        resp["admin_session_valid"] = true;
		                        resp["session_username"] = it->second.username;
		                        resp["session_role"] = normalize_auth_role(it->second.role);
		                    }
		                }
		                resp["is_admin_request"] = is_admin_request(req);
		                res.set_content(resp.dump(2), "application/json");
		            });

		            // POST /auth/login
		            // Body (preferred): { "username": "...", "password": "..." }
		            // Legacy: username may be omitted only when there is exactly one user.
		            svr.Post("/auth/login", [&](const httplib::Request &req, httplib::Response &res) {
	                json resp;
	                try {
	                    const std::string passwordsPath = joinPath(configDir, "passwords.jsonc");
	                    load_passwords_store(passwordsPath);

	                    json body = json::parse(req.body.empty() ? "{}" : req.body);
	                    std::string username = normalize_auth_username(body.value("username", std::string{}));
	                    std::string pw = body.value("password", std::string{});
	                    if (pw.empty()) {
	                        resp["ok"] = false;
	                        resp["error"] = "Password must not be empty.";
	                        res.status = 400;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }

	                    std::string role = "admin";

	                    if (g_userStoreConfigured) {
	                        if (username.empty()) {
	                            if (g_authUsers.size() == 1) username = g_authUsers[0].username;
	                            else {
	                                resp["ok"] = false;
	                                resp["error"] = "Username is required.";
	                                res.status = 400;
	                                res.set_content(resp.dump(2), "application/json");
	                                return;
	                            }
	                        }

	                        const AuthUserRecord *record = nullptr;
	                        for (const auto &u : g_authUsers) {
	                            if (u.username == username) { record = &u; break; }
	                        }
	                        if (!record) {
	                            resp["ok"] = false;
	                            resp["error"] = "Invalid username or password.";
	                            res.status = 403;
	                            res.set_content(resp.dump(2), "application/json");
	                            return;
	                        }

	                        std::string salt_bytes;
	                        if (!b64_decode(record->salt_b64, salt_bytes) || salt_bytes.empty()) {
	                            resp["ok"] = false;
	                            resp["error"] = "Invalid password salt.";
	                            res.status = 500;
	                            res.set_content(resp.dump(2), "application/json");
	                            return;
	                        }

	                        std::string actual_hash_b64;
	                        if (!pbkdf2_sha256_b64(pw, salt_bytes, record->iterations, actual_hash_b64)) {
	                            resp["ok"] = false;
	                            resp["error"] = "PBKDF2 hashing failed.";
	                            res.status = 500;
	                            res.set_content(resp.dump(2), "application/json");
	                            return;
	                        }

	                        std::string expected_bytes;
	                        std::string actual_bytes;
	                        if (!b64_decode(record->hash_b64, expected_bytes) ||
	                            !b64_decode(actual_hash_b64, actual_bytes) ||
	                            expected_bytes.empty() ||
	                            expected_bytes.size() != actual_bytes.size() ||
	                            CRYPTO_memcmp(expected_bytes.data(), actual_bytes.data(), expected_bytes.size()) != 0) {
	                            resp["ok"] = false;
	                            resp["error"] = "Invalid username or password.";
	                            res.status = 403;
	                            res.set_content(resp.dump(2), "application/json");
	                            return;
	                        }

	                        role = normalize_auth_role(record->role);
		                    } else {
		                        resp["ok"] = false;
		                        resp["error"] = "Not initialized. Use /auth/init to create the first admin user.";
		                        res.status = 400;
		                        res.set_content(resp.dump(2), "application/json");
		                        return;
		                    }

	                    std::string token = random_token_hex(32);
	                    auto now = std::chrono::system_clock::now();
	                    auto expiry = now + std::chrono::hours(8); // 8h session

	                    {
	                        std::lock_guard<std::mutex> lock(g_adminMutex);
	                        AdminSessionInfo info;
	                        info.expires_at = expiry;
	                        info.last_activity_at = now;
	                        info.username = username;
	                        info.role = role;
	                        g_adminSessions[token] = info;
	                    }

	                    resp["ok"] = true;
	                    resp["admin_token"] = token;
	                    resp["username"] = username;
	                    resp["role"] = role;
	                    resp["timeoutMinutes"] = g_userStoreConfigured ? g_authTimeoutMinutes : 0;
	                    resp["expires_ms"] = std::chrono::duration_cast<std::chrono::milliseconds>(
	                        expiry.time_since_epoch()
	                    ).count();

	                    res.set_header("Set-Cookie",
	                                   std::string("OPCBRIDGE_ADMIN_TOKEN=") + token +
	                                   "; Path=/; Max-Age=28800; HttpOnly; SameSite=Lax");
	                    res.set_content(resp.dump(2), "application/json");
	                } catch (const std::exception &ex) {
	                    resp["ok"] = false;
	                    resp["error"] = std::string("Invalid JSON: ") + ex.what();
	                    res.status = 400;
	                    res.set_content(resp.dump(2), "application/json");
	                }
	            });

			            // POST /auth/init  (first-time user store setup)
			            // Body: { "username": "...", "password": "...", "confirm": "...", "timeoutMinutes": 0, "legacy_password": "..." }
			            svr.Post("/auth/init", [&](const httplib::Request &req, httplib::Response &res) {
			                json resp;
			                try {
			                    const std::string passwordsPath = joinPath(configDir, "passwords.jsonc");
			                    load_passwords_store(passwordsPath);
			                    if (g_userStoreConfigured) {
			                        resp["ok"] = false;
			                        resp["error"] = "Already initialized.";
			                        res.status = 409;
			                        res.set_content(resp.dump(2), "application/json");
			                        return;
			                    }

			                    json body = json::parse(req.body.empty() ? "{}" : req.body);
			                    const std::string username = normalize_auth_username(body.value("username", std::string{}));
			                    const std::string password = body.value("password", std::string{});
			                    const std::string confirm = body.value("confirm", std::string{});
			                    const std::string legacyPassword = body.value("legacy_password", std::string{});
			                    const int timeoutMinutes = std::max(0, body.value("timeoutMinutes", 0));

		                    if (username.empty()) {
		                        resp["ok"] = false;
		                        resp["error"] = "Invalid username.";
		                        res.status = 400;
		                        res.set_content(resp.dump(2), "application/json");
		                        return;
		                    }
		                    if (password.size() < 4) {
		                        resp["ok"] = false;
		                        resp["error"] = "Password too short.";
		                        res.status = 400;
		                        res.set_content(resp.dump(2), "application/json");
		                        return;
		                    }
		                    if (!confirm.empty() && password != confirm) {
		                        resp["ok"] = false;
		                        resp["error"] = "Passwords do not match.";
		                        res.status = 400;
		                        res.set_content(resp.dump(2), "application/json");
		                        return;
		                    }

		                    // If legacy auth exists, require the legacy password to migrate into the new unified store.
		                    if (g_adminAuthFilePresent) {
		                        const std::string adminAuthPath = joinPath(configDir, "admin_auth.json");
		                        load_admin_auth(adminAuthPath);
		                        if (!g_legacyAdminConfigured) {
		                            resp["ok"] = false;
		                            resp["error"] = "Legacy admin_auth.json exists but is invalid. Fix or remove it before initializing.";
		                            res.status = 400;
		                            res.set_content(resp.dump(2), "application/json");
		                            return;
		                        }
		                        if (legacyPassword.empty()) {
		                            resp["ok"] = false;
		                            resp["error"] = "Legacy password required to migrate existing admin_auth.json.";
		                            res.status = 400;
		                            res.set_content(resp.dump(2), "application/json");
		                            return;
		                        }
		                        if (!verify_legacy_admin_password(legacyPassword)) {
		                            resp["ok"] = false;
		                            resp["error"] = "Invalid legacy password.";
		                            res.status = 403;
		                            res.set_content(resp.dump(2), "application/json");
		                            return;
		                        }
		                    }

				                    // Create first admin user.
				                    ensure_default_roles();
				                    std::string salt(16, '\0');
				                    if (RAND_bytes(reinterpret_cast<unsigned char*>(&salt[0]), static_cast<int>(salt.size())) != 1) {
				                        resp["ok"] = false;
				                        resp["error"] = "Failed to generate random salt.";
				                        res.status = 500;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }

				                    AuthUserRecord u;
				                    u.username = username;
				                    u.role = "admin";
	                    u.iterations = 150000;
	                    u.salt_b64 = b64_encode(salt);
	                    if (u.salt_b64.empty()) {
	                        resp["ok"] = false;
	                        resp["error"] = "Failed to encode password salt.";
	                        res.status = 500;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }
	                    if (!pbkdf2_sha256_b64(password, salt, u.iterations, u.hash_b64)) {
	                        resp["ok"] = false;
	                        resp["error"] = "PBKDF2 hashing failed.";
	                        res.status = 500;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }

	                    g_authTimeoutMinutes = timeoutMinutes;
	                    g_authUsers.clear();
	                    g_authUsers.push_back(u);
	                    g_userStoreConfigured = true;

	                    if (!save_passwords_store(passwordsPath)) {
	                        resp["ok"] = false;
	                        resp["error"] = "Failed to save passwords.jsonc.";
	                        res.status = 500;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }

	                    resp["ok"] = true;
	                    res.set_content(resp.dump(2), "application/json");
	                } catch (const std::exception &ex) {
	                    resp["ok"] = false;
	                    resp["error"] = std::string("Invalid JSON: ") + ex.what();
	                    res.status = 400;
	                    res.set_content(resp.dump(2), "application/json");
	                }
	            });

			            // PUT /auth/timeout  (admin-only)
			            svr.Put("/auth/timeout", [&](const httplib::Request &req, httplib::Response &res) {
		                json resp;
		                AdminSessionInfo sess;
		                if (!is_admin_user_request(req, sess)) {
		                    resp["ok"] = false;
		                    resp["error"] = "Admin login required.";
		                    res.status = 403;
		                    res.set_content(resp.dump(2), "application/json");
		                    return;
	                }
	                try {
	                    const std::string passwordsPath = joinPath(configDir, "passwords.jsonc");
	                    load_passwords_store(passwordsPath);
	                    if (!g_userStoreConfigured) {
	                        resp["ok"] = false;
	                        resp["error"] = "Not initialized.";
	                        res.status = 400;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }
	                    json body = json::parse(req.body.empty() ? "{}" : req.body);
	                    g_authTimeoutMinutes = std::max(0, body.value("timeoutMinutes", 0));
	                    if (!save_passwords_store(passwordsPath)) {
	                        resp["ok"] = false;
	                        resp["error"] = "Failed to save passwords.jsonc.";
	                        res.status = 500;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }
	                    resp["ok"] = true;
	                    res.set_content(resp.dump(2), "application/json");
	                } catch (const std::exception &ex) {
	                    resp["ok"] = false;
	                    resp["error"] = std::string("Invalid JSON: ") + ex.what();
	                    res.status = 400;
	                    res.set_content(resp.dump(2), "application/json");
	                }
			            });

			            // ---------- ROLES (admin-only) ----------
			            // GET /auth/roles
				            svr.Get("/auth/roles", [&](const httplib::Request & /*req*/, httplib::Response &res) {
				                json resp;
				                try {
				                    const std::string passwordsPath = joinPath(configDir, "passwords.jsonc");
				                    load_passwords_store(passwordsPath);
				                    ensure_default_roles();
			                    resp["ok"] = true;
			                    resp["roles"] = json::array();
			                    for (const auto &r : g_authRoles) {
			                        resp["roles"].push_back({
			                            {"id", r.id},
			                            {"label", r.label},
			                            {"description", r.description.empty() ? json(nullptr) : json(r.description)},
			                            {"rank", r.rank}
			                        });
			                    }
			                    res.set_content(resp.dump(2), "application/json");
			                } catch (const std::exception &ex) {
			                    resp["ok"] = false;
			                    resp["error"] = std::string("Failed: ") + ex.what();
			                    res.status = 500;
			                    res.set_content(resp.dump(2), "application/json");
			                }
			            });

			            auto is_reserved_role = [](const std::string &id) {
			                return (id == "admin" || id == "editor" || id == "operator" || id == "viewer");
			            };

			            // POST /auth/roles  (admin-only)
			            // Body: { id, label, description, rank }
			            svr.Post("/auth/roles", [&](const httplib::Request &req, httplib::Response &res) {
			                json resp;
			                AdminSessionInfo sess;
			                if (!is_admin_user_request(req, sess)) {
			                    resp["ok"] = false;
			                    resp["error"] = "Admin login required.";
			                    res.status = 403;
			                    res.set_content(resp.dump(2), "application/json");
			                    return;
			                }
			                try {
			                    const std::string passwordsPath = joinPath(configDir, "passwords.jsonc");
			                    load_passwords_store(passwordsPath);
			                    if (!g_userStoreConfigured) {
			                        resp["ok"] = false;
			                        resp["error"] = "Not initialized.";
			                        res.status = 400;
			                        res.set_content(resp.dump(2), "application/json");
			                        return;
			                    }
			                    ensure_default_roles();
			                    json body = json::parse(req.body.empty() ? "{}" : req.body);
			                    const std::string id = normalize_auth_role_id(body.value("id", std::string{}));
			                    const std::string label = body.value("label", std::string{});
			                    const std::string description = body.value("description", std::string{});
			                    const int rank = std::max(0, std::min(3, body.value("rank", 0)));
			                    if (id.empty()) {
			                        resp["ok"] = false;
			                        resp["error"] = "Invalid role id.";
			                        res.status = 400;
			                        res.set_content(resp.dump(2), "application/json");
			                        return;
			                    }
			                    if (is_reserved_role(id)) {
			                        resp["ok"] = false;
			                        resp["error"] = "Cannot create reserved role id.";
			                        res.status = 400;
			                        res.set_content(resp.dump(2), "application/json");
			                        return;
			                    }
			                    for (const auto &r : g_authRoles) {
			                        if (r.id == id) {
			                            resp["ok"] = false;
			                            resp["error"] = "Role already exists.";
			                            res.status = 409;
			                            res.set_content(resp.dump(2), "application/json");
			                            return;
			                        }
			                    }
			                    AuthRoleRecord r;
			                    r.id = id;
			                    r.label = label.empty() ? id : label;
			                    r.description = description;
			                    r.rank = rank;
			                    g_authRoles.push_back(r);
			                    if (!save_passwords_store(passwordsPath)) {
			                        resp["ok"] = false;
			                        resp["error"] = "Failed to save passwords.jsonc.";
			                        res.status = 500;
			                        res.set_content(resp.dump(2), "application/json");
			                        return;
			                    }
			                    resp["ok"] = true;
			                    res.set_content(resp.dump(2), "application/json");
			                } catch (const std::exception &ex) {
			                    resp["ok"] = false;
			                    resp["error"] = std::string("Invalid JSON: ") + ex.what();
			                    res.status = 400;
			                    res.set_content(resp.dump(2), "application/json");
			                }
			            });

			            // PUT /auth/roles/<id>  (admin-only)
			            // Body: { label?, description?, rank? }
			            svr.Put(R"(/auth/roles/(.+))", [&](const httplib::Request &req, httplib::Response &res) {
			                json resp;
			                AdminSessionInfo sess;
			                if (!is_admin_user_request(req, sess)) {
			                    resp["ok"] = false;
			                    resp["error"] = "Admin login required.";
			                    res.status = 403;
			                    res.set_content(resp.dump(2), "application/json");
			                    return;
			                }
			                try {
			                    const std::string passwordsPath = joinPath(configDir, "passwords.jsonc");
			                    load_passwords_store(passwordsPath);
			                    if (!g_userStoreConfigured) {
			                        resp["ok"] = false;
			                        resp["error"] = "Not initialized.";
			                        res.status = 400;
			                        res.set_content(resp.dump(2), "application/json");
			                        return;
			                    }
			                    ensure_default_roles();
			                    const std::string id = normalize_auth_role_id(req.matches[1]);
			                    if (id.empty()) {
			                        resp["ok"] = false;
			                        resp["error"] = "Invalid role id.";
			                        res.status = 400;
			                        res.set_content(resp.dump(2), "application/json");
			                        return;
			                    }
			                    json body = json::parse(req.body.empty() ? "{}" : req.body);
			                    const bool hasLabel = body.contains("label");
			                    const bool hasDesc = body.contains("description");
			                    const bool hasRank = body.contains("rank");
			                    bool found = false;
			                    for (auto &r : g_authRoles) {
			                        if (r.id != id) continue;
			                        found = true;
			                        if (hasLabel) {
			                            const std::string label = body.value("label", std::string{});
			                            r.label = label.empty() ? r.id : label;
			                        }
			                        if (hasDesc) {
			                            r.description = body.value("description", std::string{});
			                        }
			                        if (hasRank) {
			                            r.rank = std::max(0, std::min(3, body.value("rank", r.rank)));
			                        }
			                        break;
			                    }
			                    if (!found) {
			                        resp["ok"] = false;
			                        resp["error"] = "Role not found.";
			                        res.status = 404;
			                        res.set_content(resp.dump(2), "application/json");
			                        return;
			                    }
			                    // Ensure at least one admin-ranked user remains.
			                    int adminCount = 0;
			                    for (const auto &u : g_authUsers) {
			                        if (role_rank(u.role) >= 3) adminCount++;
			                    }
			                    if (adminCount < 1) {
			                        resp["ok"] = false;
			                        resp["error"] = "Cannot remove admin access from all users.";
			                        res.status = 400;
			                        res.set_content(resp.dump(2), "application/json");
			                        return;
			                    }
			                    if (!save_passwords_store(passwordsPath)) {
			                        resp["ok"] = false;
			                        resp["error"] = "Failed to save passwords.jsonc.";
			                        res.status = 500;
			                        res.set_content(resp.dump(2), "application/json");
			                        return;
			                    }
			                    resp["ok"] = true;
			                    res.set_content(resp.dump(2), "application/json");
			                } catch (const std::exception &ex) {
			                    resp["ok"] = false;
			                    resp["error"] = std::string("Invalid JSON: ") + ex.what();
			                    res.status = 400;
			                    res.set_content(resp.dump(2), "application/json");
			                }
			            });

			            // DELETE /auth/roles/<id>  (admin-only)
			            svr.Delete(R"(/auth/roles/(.+))", [&](const httplib::Request &req, httplib::Response &res) {
			                json resp;
			                AdminSessionInfo sess;
			                if (!is_admin_user_request(req, sess)) {
			                    resp["ok"] = false;
			                    resp["error"] = "Admin login required.";
			                    res.status = 403;
			                    res.set_content(resp.dump(2), "application/json");
			                    return;
			                }
			                try {
			                    const std::string passwordsPath = joinPath(configDir, "passwords.jsonc");
			                    load_passwords_store(passwordsPath);
			                    if (!g_userStoreConfigured) {
			                        resp["ok"] = false;
			                        resp["error"] = "Not initialized.";
			                        res.status = 400;
			                        res.set_content(resp.dump(2), "application/json");
			                        return;
			                    }
			                    ensure_default_roles();
			                    const std::string id = normalize_auth_role_id(req.matches[1]);
			                    if (id.empty()) {
			                        resp["ok"] = false;
			                        resp["error"] = "Invalid role id.";
			                        res.status = 400;
			                        res.set_content(resp.dump(2), "application/json");
			                        return;
			                    }
			                    if (is_reserved_role(id)) {
			                        resp["ok"] = false;
			                        resp["error"] = "Cannot delete reserved roles.";
			                        res.status = 400;
			                        res.set_content(resp.dump(2), "application/json");
			                        return;
			                    }
			                    for (const auto &u : g_authUsers) {
			                        if (normalize_auth_role(u.role) == id) {
			                            resp["ok"] = false;
			                            resp["error"] = "Cannot delete a role that is assigned to a user.";
			                            res.status = 400;
			                            res.set_content(resp.dump(2), "application/json");
			                            return;
			                        }
			                    }
			                    std::vector<AuthRoleRecord> next;
			                    next.reserve(g_authRoles.size());
			                    bool removed = false;
			                    for (const auto &r : g_authRoles) {
			                        if (r.id == id) { removed = true; continue; }
			                        next.push_back(r);
			                    }
			                    if (!removed) {
			                        resp["ok"] = false;
			                        resp["error"] = "Role not found.";
			                        res.status = 404;
			                        res.set_content(resp.dump(2), "application/json");
			                        return;
			                    }
			                    g_authRoles = next;
			                    ensure_default_roles();
			                    if (!save_passwords_store(passwordsPath)) {
			                        resp["ok"] = false;
			                        resp["error"] = "Failed to save passwords.jsonc.";
			                        res.status = 500;
			                        res.set_content(resp.dump(2), "application/json");
			                        return;
			                    }
			                    resp["ok"] = true;
			                    res.set_content(resp.dump(2), "application/json");
			                } catch (const std::exception &ex) {
			                    resp["ok"] = false;
			                    resp["error"] = std::string("Invalid request: ") + ex.what();
			                    res.status = 400;
			                    res.set_content(resp.dump(2), "application/json");
			                }
			            });

		            // POST /auth/users  (admin-only)
		            svr.Post("/auth/users", [&](const httplib::Request &req, httplib::Response &res) {
		                json resp;
		                AdminSessionInfo sess;
		                if (!is_admin_user_request(req, sess)) {
		                    resp["ok"] = false;
		                    resp["error"] = "Admin login required.";
		                    res.status = 403;
		                    res.set_content(resp.dump(2), "application/json");
		                    return;
	                }
	                try {
	                    const std::string passwordsPath = joinPath(configDir, "passwords.jsonc");
	                    load_passwords_store(passwordsPath);
	                    if (!g_userStoreConfigured) {
	                        resp["ok"] = false;
	                        resp["error"] = "Not initialized.";
	                        res.status = 400;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }
	                    json body = json::parse(req.body.empty() ? "{}" : req.body);
	                    const std::string username = normalize_auth_username(body.value("username", std::string{}));
	                    const std::string password = body.value("password", std::string{});
		                    const std::string role = normalize_auth_role(body.value("role", std::string{"viewer"}));
		                    if (!role_exists(role)) {
		                        resp["ok"] = false;
		                        resp["error"] = "Invalid role.";
		                        res.status = 400;
		                        res.set_content(resp.dump(2), "application/json");
		                        return;
		                    }
	                    if (username.empty()) {
	                        resp["ok"] = false;
	                        resp["error"] = "Invalid username.";
	                        res.status = 400;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }
	                    if (password.size() < 4) {
	                        resp["ok"] = false;
	                        resp["error"] = "Password too short.";
	                        res.status = 400;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }
	                    for (const auto &u : g_authUsers) {
	                        if (u.username == username) {
	                            resp["ok"] = false;
	                            resp["error"] = "User already exists.";
	                            res.status = 409;
	                            res.set_content(resp.dump(2), "application/json");
	                            return;
	                        }
	                    }

	                    std::string salt(16, '\0');
	                    if (RAND_bytes(reinterpret_cast<unsigned char*>(&salt[0]), static_cast<int>(salt.size())) != 1) {
	                        resp["ok"] = false;
	                        resp["error"] = "Failed to generate random salt.";
	                        res.status = 500;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }

	                    AuthUserRecord u;
	                    u.username = username;
	                    u.role = role;
	                    u.iterations = 150000;
	                    u.salt_b64 = b64_encode(salt);
	                    if (!pbkdf2_sha256_b64(password, salt, u.iterations, u.hash_b64)) {
	                        resp["ok"] = false;
	                        resp["error"] = "PBKDF2 hashing failed.";
	                        res.status = 500;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }
		                    g_authUsers.push_back(u);
	                    if (!save_passwords_store(passwordsPath)) {
	                        resp["ok"] = false;
	                        resp["error"] = "Failed to save passwords.jsonc.";
	                        res.status = 500;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }
	                    resp["ok"] = true;
	                    res.set_content(resp.dump(2), "application/json");
	                } catch (const std::exception &ex) {
	                    resp["ok"] = false;
	                    resp["error"] = std::string("Invalid JSON: ") + ex.what();
	                    res.status = 400;
	                    res.set_content(resp.dump(2), "application/json");
	                }
		            });

		            // PUT /auth/users/<username>  (admin-only)
		            // Body: { "role": "...", "password": "...", "confirm": "..." }
		            svr.Put(R"(/auth/users/(.+))", [&](const httplib::Request &req, httplib::Response &res) {
		                json resp;
		                AdminSessionInfo sess;
		                if (!is_admin_user_request(req, sess)) {
		                    resp["ok"] = false;
		                    resp["error"] = "Admin login required.";
		                    res.status = 403;
		                    res.set_content(resp.dump(2), "application/json");
		                    return;
		                }
		                try {
		                    const std::string passwordsPath = joinPath(configDir, "passwords.jsonc");
		                    load_passwords_store(passwordsPath);
		                    if (!g_userStoreConfigured) {
		                        resp["ok"] = false;
		                        resp["error"] = "Not initialized.";
		                        res.status = 400;
		                        res.set_content(resp.dump(2), "application/json");
		                        return;
		                    }

		                    const std::string username = normalize_auth_username(req.matches[1]);
		                    if (username.empty()) {
		                        resp["ok"] = false;
		                        resp["error"] = "Invalid username.";
		                        res.status = 400;
		                        res.set_content(resp.dump(2), "application/json");
		                        return;
		                    }

		                    json body = json::parse(req.body.empty() ? "{}" : req.body);
		                    const bool hasRole = body.contains("role");
		                    const bool hasPassword = body.contains("password");

		                    std::string nextRole;
		                    if (hasRole) {
		                        nextRole = normalize_auth_role(body.value("role", std::string{"viewer"}));
		                        if (!role_exists(nextRole)) {
		                            resp["ok"] = false;
		                            resp["error"] = "Invalid role.";
		                            res.status = 400;
		                            res.set_content(resp.dump(2), "application/json");
		                            return;
		                        }
		                    }

		                    std::string password;
		                    if (hasPassword) {
		                        password = body.value("password", std::string{});
		                        const std::string confirm = body.value("confirm", std::string{});
		                        if (password.size() < 4) {
		                            resp["ok"] = false;
		                            resp["error"] = "Password too short.";
		                            res.status = 400;
		                            res.set_content(resp.dump(2), "application/json");
		                            return;
		                        }
		                        if (!confirm.empty() && password != confirm) {
		                            resp["ok"] = false;
		                            resp["error"] = "Passwords do not match.";
		                            res.status = 400;
		                            res.set_content(resp.dump(2), "application/json");
		                            return;
		                        }
		                    }

		                    bool found = false;
		                    for (auto &u : g_authUsers) {
		                        if (u.username != username) continue;
		                        found = true;
		                        if (hasRole) u.role = nextRole;
		                        if (hasPassword) {
		                            std::string salt(16, '\0');
		                            if (RAND_bytes(reinterpret_cast<unsigned char*>(&salt[0]), static_cast<int>(salt.size())) != 1) {
		                                resp["ok"] = false;
		                                resp["error"] = "Failed to generate random salt.";
		                                res.status = 500;
		                                res.set_content(resp.dump(2), "application/json");
		                                return;
		                            }
		                            u.iterations = 150000;
		                            u.salt_b64 = b64_encode(salt);
		                            if (!pbkdf2_sha256_b64(password, salt, u.iterations, u.hash_b64)) {
		                                resp["ok"] = false;
		                                resp["error"] = "PBKDF2 hashing failed.";
		                                res.status = 500;
		                                res.set_content(resp.dump(2), "application/json");
		                                return;
		                            }
		                        }
		                        break;
		                    }

		                    if (!found) {
		                        resp["ok"] = false;
		                        resp["error"] = "User not found.";
		                        res.status = 404;
		                        res.set_content(resp.dump(2), "application/json");
		                        return;
		                    }

		                    bool hasAdmin = false;
		                    for (const auto &u : g_authUsers) {
		                        if (role_rank(u.role) >= 3) { hasAdmin = true; break; }
		                    }
		                    if (!hasAdmin) {
		                        resp["ok"] = false;
		                        resp["error"] = "Cannot remove admin access from all users.";
		                        res.status = 400;
		                        res.set_content(resp.dump(2), "application/json");
		                        return;
		                    }

		                    if (!save_passwords_store(passwordsPath)) {
		                        resp["ok"] = false;
		                        resp["error"] = "Failed to save passwords.jsonc.";
		                        res.status = 500;
		                        res.set_content(resp.dump(2), "application/json");
		                        return;
		                    }
		                    resp["ok"] = true;
		                    res.set_content(resp.dump(2), "application/json");
		                } catch (const std::exception &ex) {
		                    resp["ok"] = false;
		                    resp["error"] = std::string("Invalid request: ") + ex.what();
		                    res.status = 400;
		                    res.set_content(resp.dump(2), "application/json");
		                }
		            });

		            // DELETE /auth/users/<username>  (admin-only)
		            svr.Delete(R"(/auth/users/(.+))", [&](const httplib::Request &req, httplib::Response &res) {
		                json resp;
		                AdminSessionInfo sess;
		                if (!is_admin_user_request(req, sess)) {
		                    resp["ok"] = false;
		                    resp["error"] = "Admin login required.";
		                    res.status = 403;
		                    res.set_content(resp.dump(2), "application/json");
		                    return;
	                }
	                try {
	                    const std::string passwordsPath = joinPath(configDir, "passwords.jsonc");
	                    load_passwords_store(passwordsPath);
	                    if (!g_userStoreConfigured) {
	                        resp["ok"] = false;
	                        resp["error"] = "Not initialized.";
	                        res.status = 400;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }

	                    const std::string username = normalize_auth_username(req.matches[1]);
	                    if (username.empty()) {
	                        resp["ok"] = false;
	                        resp["error"] = "Invalid username.";
	                        res.status = 400;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }

	                    std::vector<AuthUserRecord> remaining;
	                    remaining.reserve(g_authUsers.size());
	                    bool removed = false;
	                    for (const auto &u : g_authUsers) {
	                        if (u.username == username) { removed = true; continue; }
	                        remaining.push_back(u);
	                    }
	                    if (!removed) {
	                        resp["ok"] = false;
	                        resp["error"] = "User not found.";
	                        res.status = 404;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }

		                    bool hasAdmin = false;
		                    for (const auto &u : remaining) {
		                        if (role_rank(u.role) >= 3) { hasAdmin = true; break; }
		                    }
		                    if (!hasAdmin) {
		                        resp["ok"] = false;
		                        resp["error"] = "Cannot remove the last admin user.";
		                        res.status = 400;
		                        res.set_content(resp.dump(2), "application/json");
		                        return;
		                    }

	                    g_authUsers = remaining;
	                    if (!save_passwords_store(passwordsPath)) {
	                        resp["ok"] = false;
	                        resp["error"] = "Failed to save passwords.jsonc.";
	                        res.status = 500;
	                        res.set_content(resp.dump(2), "application/json");
	                        return;
	                    }
	                    resp["ok"] = true;
	                    res.set_content(resp.dump(2), "application/json");
	                } catch (const std::exception &ex) {
	                    resp["ok"] = false;
	                    resp["error"] = std::string("Invalid request: ") + ex.what();
	                    res.status = 400;
	                    res.set_content(resp.dump(2), "application/json");
	                }
	            });

	            // POST /auth/logout
	            svr.Post("/auth/logout", [&](const httplib::Request &req, httplib::Response &res) {
	                json resp;

	                auto token = req.get_header_value("X-Admin-Token");
	                if (token.empty()) {
	                    token = get_cookie_value(req, "OPCBRIDGE_ADMIN_TOKEN");
	                }
	                if (token.empty()) {
	                    // Also allow in JSON body
	                    try {
	                        json body = json::parse(req.body);
	                        token = body.value("admin_token", std::string{});
	                    } catch (...) {}
	                }

                if (!token.empty()) {
                    std::lock_guard<std::mutex> lock(g_adminMutex);
                    g_adminSessions.erase(token);
	                }

	                resp["ok"] = true;
	                // Clear cookie in browser as well.
	                res.set_header("Set-Cookie",
	                               "OPCBRIDGE_ADMIN_TOKEN=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
	                res.set_content(resp.dump(2), "application/json");
	            });

            std::cout << "HTTP server listening on 0.0.0.0:8080\n";
            std::cout << "Endpoints:\n";
            std::cout << "  GET  /            (dashboard)\n";
            std::cout << "  GET  /dashboard   (dashboard)\n";
            std::cout << "  GET  /info\n";
            std::cout << "  GET  /metadata\n";
            std::cout << "  GET  /tags\n";
            std::cout << "  GET  /tags/<connection_id>/<logical_name>\n";
            std::cout << "  POST /write\n";
            std::cout << "  POST /reload\n";
            std::cout << "  GET  /health\n";
            std::cout << "  GET  /alarms\n";
			std::cout << "  GET  /config/tags\n";
			std::cout << "  GET  /config/tagfiles\n";
			std::cout << "  POST /config/tags\n";


            // Start the HTTP server in a background thread so we can still run the poll loop
            std::thread httpThread([&]() {
                svr.listen("0.0.0.0", 8080);
            });

            // We don't currently have a clean shutdown mechanism; detach the thread.
            // (Process exit will kill it on Ctrl+C.)
            httpThread.detach();
        }

	        // 6) POLL MODE (DEFAULT)
	        std::cout << "Configured " << drivers.size()
	                  << " connection(s) with tags. Entering poll loop (Ctrl+C to exit)...\n";

	        struct UaUpdate {
	            std::string conn_id;
	            std::string logical_name;
	            TagValue value;
	        };

	        struct MqttPublishJob {
	            TagSnapshot snap;
	            TagSnapshot prev;
	            bool hadPrev = false;
	        };

	        std::mutex uaQueueMutex;
	        std::deque<UaUpdate> uaQueue;

	        std::mutex mqttQueueMutex;
	        std::deque<MqttPublishJob> mqttQueue;

	        struct PollTagItem {
	            TagConfig cfg;
	            int32_t handle = PLCTAG_ERR_NOT_FOUND;
	            std::chrono::steady_clock::time_point next_poll;

	            bool periodic_enabled = false;
	            std::chrono::system_clock::time_point next_periodic_log;
	            bool periodic_init = false;
	        };

	        struct PollerSpec {
	            uint64_t gen = 0;
	            ConnectionConfig conn;
	            std::vector<PollTagItem> tags;
	            std::shared_ptr<ConnPollMetrics> metrics;
	        };

	        auto schedule_next_periodic_local = [](const TagConfig &cfg,
	                                              bool &enabled,
	                                              std::chrono::system_clock::time_point &nextLog) {
	            enabled = false;
	            nextLog = std::chrono::system_clock::time_point{};

	            if (!cfg.log_periodic) return;
	            if (cfg.log_periodic_mode == "interval") {
	                if (cfg.log_periodic_interval_sec <= 0) {
	                    return;
	                }
	                enabled = true;
	                nextLog = std::chrono::system_clock::now() +
	                          std::chrono::seconds(cfg.log_periodic_interval_sec);
	            }
	        };

	        std::vector<std::thread> pollThreads;
	        uint64_t activeGen = g_configGeneration.load(std::memory_order_relaxed);

	        auto startPollers = [&](uint64_t gen) {
	            std::vector<PollerSpec> specs;

	            {
	                std::lock_guard<std::mutex> lock(driverMutex);
		                for (const auto &d : drivers) {
		                    PollerSpec spec;
		                    spec.gen = gen;
		                    spec.conn = d.conn;

		                    {
		                        std::lock_guard<std::mutex> mlock(g_metricsMutex);
		                        auto &ptr = g_connPollMetrics[spec.conn.id];
		                        if (!ptr) {
		                            ptr = std::make_shared<ConnPollMetrics>();
		                        }
		                        spec.metrics = ptr;
		                    }

		                    // Actually build tag list; skip invalid handles (they'll show as bad_handle)
		                    spec.tags.clear();
		                    for (const auto &t : d.tags) {
	                        if (t.handle < 0) continue;
	                        PollTagItem it;
	                        it.cfg = t.cfg;
	                        it.handle = t.handle;

	                        int scan_ms = it.cfg.scan_ms;
	                        if (scan_ms <= 0) scan_ms = 1000;

	                        auto now = std::chrono::steady_clock::now();
	                        size_t h = std::hash<std::string>{}(spec.conn.id + ":" + it.cfg.logical_name);
	                        int jitter_ms = static_cast<int>(h % static_cast<size_t>(scan_ms));
	                        it.next_poll = now + std::chrono::milliseconds(jitter_ms);

	                        spec.tags.push_back(std::move(it));
	                    }

	                    specs.push_back(std::move(spec));
	                }
	            }

	            pollThreads.clear();
	            pollThreads.reserve(specs.size());

	            const bool doConsolePrint = (!httpMode && !opcuaMode && !mqttMode);

		            for (auto &spec : specs) {
		                if (spec.tags.empty()) {
		                    continue;
		                }
		                pollThreads.emplace_back([&, spec = std::move(spec), doConsolePrint]() mutable {
							struct HeapItem {
								std::chrono::steady_clock::time_point next_poll;
								size_t idx;
							};
							struct HeapCmp {
								bool operator()(const HeapItem &a, const HeapItem &b) const {
									// min-heap by next_poll
									return a.next_poll > b.next_poll;
								}
							};

							std::priority_queue<HeapItem, std::vector<HeapItem>, HeapCmp> heap;
							for (size_t i = 0; i < spec.tags.size(); ++i) {
								heap.push(HeapItem{spec.tags[i].next_poll, i});
							}

		                    while (g_configGeneration.load(std::memory_order_relaxed) == spec.gen) {
								if (g_configGeneration.load(std::memory_order_relaxed) != spec.gen) {
									return;
								}
								if (heap.empty()) {
									std::this_thread::sleep_for(std::chrono::milliseconds(25));
									continue;
								}

								auto nowSteady = std::chrono::steady_clock::now();
								const HeapItem top = heap.top();
								if (nowSteady < top.next_poll) {
									auto delta = std::chrono::duration_cast<std::chrono::milliseconds>(top.next_poll - nowSteady);
									if (delta.count() > 5) delta = std::chrono::milliseconds(5);
									if (delta.count() > 0) {
										std::this_thread::sleep_for(delta);
									}
									continue;
								}

								heap.pop();
								auto &t = spec.tags[top.idx];

								int scan_ms = t.cfg.scan_ms;
								if (scan_ms <= 0) scan_ms = 1000;
								t.next_poll = nowSteady + std::chrono::milliseconds(scan_ms);
								heap.push(HeapItem{t.next_poll, top.idx});

								const std::string key = make_tag_key(spec.conn.id, t.cfg.logical_name);

		                            int32_t status = PLCTAG_STATUS_OK;
		                            TagSnapshot snap;

		                            {
	                                std::shared_lock<std::shared_mutex> plcLock;
	                                if (g_plcMutex) {
	                                    plcLock = std::shared_lock<std::shared_mutex>(*g_plcMutex);
	                                }

	                                auto t0 = std::chrono::steady_clock::now();
	                                status = plc_tag_read(t.handle, spec.conn.default_read_ms);
	                                auto t1 = std::chrono::steady_clock::now();

	                                if (spec.metrics) {
	                                    uint64_t us = static_cast<uint64_t>(
	                                        std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count()
	                                    );
	                                    spec.metrics->reads_total.fetch_add(1, std::memory_order_relaxed);
	                                    spec.metrics->read_us_total.fetch_add(us, std::memory_order_relaxed);
	                                    spec.metrics->read_us_last.store(us, std::memory_order_relaxed);
	                                    atomic_update_max(spec.metrics->read_us_max, us);

	                                    int64_t ts_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
	                                        std::chrono::system_clock::now().time_since_epoch()
	                                    ).count();
	                                    if (status == PLCTAG_STATUS_OK) {
	                                        spec.metrics->reads_ok.fetch_add(1, std::memory_order_relaxed);
	                                        spec.metrics->last_ok_ts_ms.store(ts_ms, std::memory_order_relaxed);
	                                    } else {
	                                        spec.metrics->reads_err.fetch_add(1, std::memory_order_relaxed);
	                                        spec.metrics->last_err_ts_ms.store(ts_ms, std::memory_order_relaxed);
	                                    }
	                                }

	                                if (status == PLCTAG_STATUS_OK) {
	                                    TagRuntime tmp;
	                                    tmp.cfg = t.cfg;
	                                    tmp.handle = t.handle;
	                                    update_snapshot_from_plc(snap, spec.conn, tmp);
	                                }
	                            }

	                            TagSnapshot prevSnap;
	                            bool hadPrev = false;
	                            bool doWsTagUpdate = false;
	                            bool doWsEventRow = false;
	                            bool valueChangedForEvent = false;
	                            bool doUaUpdate = false;
	                            bool doMqttPublish = false;

	                            {
	                                std::lock_guard<std::mutex> lock(driverMutex);
	                                if (g_configGeneration.load(std::memory_order_relaxed) != spec.gen) {
	                                    continue;
	                                }

	                                auto itPrev = tagTable.find(key);
	                                if (itPrev != tagTable.end()) {
	                                    prevSnap = itPrev->second;
	                                    hadPrev = true;
	                                }

	                                if (status != PLCTAG_STATUS_OK) {
	                                    std::cerr << "Read error for ["
	                                              << spec.conn.id << "]."
	                                              << t.cfg.logical_name << ": "
	                                              << plc_tag_decode_error(status) << std::endl;

	                                    TagSnapshot &s = tagTable[key];
	                                    s.connection_id = spec.conn.id;
	                                    s.logical_name  = t.cfg.logical_name;
	                                    s.datatype      = t.cfg.datatype;
	                                    s.timestamp     = std::chrono::system_clock::now();
	                                    s.quality       = 0;
	                                    snap = s;
	                                } else {
	                                    tagTable[key] = snap;
	                                }

	                                if (ws_is_enabled()) {
	                                    doWsTagUpdate = !hadPrev || !snapshot_values_equal(snap, prevSnap);
	                                }

	                                if (!g_alarms.empty()) {
	                                    evaluate_tag_alarms(spec.conn.id, t.cfg.logical_name, snap);
	                                }

	                                if (t.cfg.log_event_on_change && hadPrev) {
	                                    valueChangedForEvent = !snapshot_values_equal(snap, prevSnap);
	                                    if (valueChangedForEvent) {
	                                        int64_t ts_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
	                                            snap.timestamp.time_since_epoch()
	                                        ).count();

	                                        sqlite_log_event(
	                                            spec.conn.id,
	                                            t.cfg.logical_name,
	                                            snapshot_value_to_string(prevSnap),
	                                            snapshot_value_to_string(snap),
	                                            prevSnap.quality,
	                                            snap.quality,
	                                            ts_ms,
	                                            "" // extra_json
	                                        );
	                                        doWsEventRow = ws_is_enabled();
	                                    }
	                                }

	                                // Periodic logging (interval mode only)
	                                if (t.cfg.log_periodic && !t.cfg.log_periodic_mode.empty()) {
	                                    if (!t.periodic_init) {
	                                        schedule_next_periodic_local(t.cfg, t.periodic_enabled, t.next_periodic_log);
	                                        t.periodic_init = true;
	                                    }

	                                    if (t.periodic_enabled &&
	                                        t.next_periodic_log.time_since_epoch().count() > 0 &&
	                                        std::chrono::system_clock::now() >= t.next_periodic_log)
	                                    {
	                                        int64_t ts_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
	                                            snap.timestamp.time_since_epoch()
	                                        ).count();

	                                        std::string valStr = snapshot_value_to_string(snap);
	                                        int q = snap.quality;
	                                        std::string extra = R"({"source":"periodic_interval"})";

	                                        sqlite_log_event(
	                                            spec.conn.id,
	                                            t.cfg.logical_name,
	                                            valStr,
	                                            valStr,
	                                            q,
	                                            q,
	                                            ts_ms,
	                                            extra
	                                        );

	                                        schedule_next_periodic_local(t.cfg, t.periodic_enabled, t.next_periodic_log);
	                                    }
	                                }

	                                if (mqttMode) {
	                                    doMqttPublish = true;
	                                }
	                                if (g_uaServer && snap.quality == 1) {
	                                    doUaUpdate = true;
	                                }
	                            }

	                            if (doWsTagUpdate) {
	                                ws_notify_tag_update(snap, t.cfg);
	                            }
	                            if (doWsEventRow && valueChangedForEvent) {
	                                ws_notify_event_log_row(&prevSnap, snap);
	                            }
	                            if (doConsolePrint) {
	                                print_snapshot(snap);
	                            }

	                            if (doUaUpdate) {
	                                std::lock_guard<std::mutex> ql(uaQueueMutex);
	                                uaQueue.push_back(UaUpdate{spec.conn.id, t.cfg.logical_name, snap.value});
	                            }

		                            if (doMqttPublish) {
		                                std::lock_guard<std::mutex> ql(mqttQueueMutex);
		                                MqttPublishJob j;
		                                j.snap = snap;
		                                j.hadPrev = hadPrev;
		                                if (hadPrev) j.prev = prevSnap;
		                                mqttQueue.push_back(std::move(j));
		                            }
		                    }
		                });
		            }
		        };

	        auto stopPollers = [&]() {
	            for (auto &t : pollThreads) {
	                if (t.joinable()) t.join();
	            }
	            pollThreads.clear();
	            g_pollers_running_gen.store(0, std::memory_order_relaxed);
	        };

	        std::cout << "[poll] Starting per-connection pollers...\n";
	        {
	            std::lock_guard<std::mutex> mlock(g_metricsMutex);
	            g_connPollMetrics.clear();
	        }
	        startPollers(activeGen);
	        g_pollers_running_gen.store(activeGen, std::memory_order_relaxed);

	        while (true) {
	            // Handle /reload requests (triggered by the HTTP thread) in the main thread.
	            bool doReload = false;
	            uint64_t requestedGen = 0;
	            {
	                std::lock_guard<std::mutex> lk(g_reloadMutex);
	                if (g_reloadState.requested && !g_reloadState.in_progress) {
	                    g_reloadState.in_progress = true;
	                    doReload = true;
	                    requestedGen = g_reloadState.gen;
	                }
	            }

	            if (doReload) {
	                std::cout << "[reload] Starting reload (gen=" << requestedGen << ")...\n";

	                stopPollers();

	                bool ok = false;
	                std::string err;

	                {
	                    std::unique_lock<std::shared_mutex> plcLock(plcMutex);
	                    std::vector<DriverContext> newDrivers;

	                    if (!load_all_drivers(newDrivers, configDir)) {
	                        err = "Reload failed (see server log for details).";
	                    } else {
	                        {
	                            std::lock_guard<std::mutex> lock(driverMutex);
	                            destroy_all_handles(drivers, true /*plcAlreadyLocked*/);
	                            drivers = std::move(newDrivers);
	                            tagTable.clear();
	                        }

	                        // Rebuild OPC UA server to refresh node contexts / handles.
	                        if (g_uaServer) {
	                            std::cout << "[reload] Rebuilding OPC UA server...\n";
	                            shutdown_opcua_server();
	                            if (!init_opcua_server(opcuaPort, drivers)) {
	                                err = "OPC UA reinit failed after reload (see server log).";
	                            }
	                        }

	                        ok = err.empty();
	                    }
	                }

	                {
	                    std::lock_guard<std::mutex> mlock(g_metricsMutex);
	                    g_connPollMetrics.clear();
	                }

	                // Resume pollers on the new config generation.
	                activeGen = g_configGeneration.load(std::memory_order_relaxed);
	                startPollers(activeGen);
	                g_pollers_running_gen.store(activeGen, std::memory_order_relaxed);

	                {
	                    std::lock_guard<std::mutex> lk(g_reloadMutex);
	                    g_reloadState.ok = ok;
	                    g_reloadState.error = err;
	                    g_reloadState.done = true;
	                    g_reloadState.requested = false;
	                    g_reloadState.in_progress = false;
	                }
	                g_reloadCv.notify_all();

	                std::cout << "[reload] Reload " << (ok ? "OK" : "FAILED") << "\n";
	                continue;
	            }

	            uint64_t genNow = g_configGeneration.load(std::memory_order_relaxed);
	            if (genNow != activeGen) {
	                stopPollers();
	                activeGen = genNow;
	                startPollers(activeGen);
	                g_pollers_running_gen.store(activeGen, std::memory_order_relaxed);
	            }

	            // Apply any queued OPC UA updates in the main thread (open62541 is not thread-safe).
	            if (g_uaServer) {
	                std::deque<UaUpdate> local;
	                {
	                    std::lock_guard<std::mutex> lock(uaQueueMutex);
	                    local.swap(uaQueue);
	                }

	                for (const auto &u : local) {
	                    auto itb = g_uaBindingIndex.find(ua_key(u.conn_id, u.logical_name));
	                    if (itb == g_uaBindingIndex.end()) continue;
	                    UaTagBinding &b = g_uaBindings[itb->second];

	                    UA_Variant value;
	                    UA_Variant_init(&value);

	                    std::visit([&](auto &&arg) {
	                        using T = std::decay_t<decltype(arg)>;
	                        if constexpr (std::is_same_v<T, bool>) {
	                            UA_Boolean v = arg ? UA_TRUE : UA_FALSE;
	                            UA_Variant_setScalar(&value, &v, &UA_TYPES[UA_TYPES_BOOLEAN]);
	                        } else if constexpr (std::is_same_v<T, int16_t>) {
	                            UA_Int16 v = arg;
	                            UA_Variant_setScalar(&value, &v, &UA_TYPES[UA_TYPES_INT16]);
	                        } else if constexpr (std::is_same_v<T, uint16_t>) {
	                            UA_UInt16 v = arg;
	                            UA_Variant_setScalar(&value, &v, &UA_TYPES[UA_TYPES_UINT16]);
	                        } else if constexpr (std::is_same_v<T, int32_t>) {
	                            UA_Int32 v = arg;
	                            UA_Variant_setScalar(&value, &v, &UA_TYPES[UA_TYPES_INT32]);
	                        } else if constexpr (std::is_same_v<T, uint32_t>) {
	                            UA_UInt32 v = arg;
	                            UA_Variant_setScalar(&value, &v, &UA_TYPES[UA_TYPES_UINT32]);
	                        } else if constexpr (std::is_same_v<T, float>) {
	                            UA_Float v = arg;
	                            UA_Variant_setScalar(&value, &v, &UA_TYPES[UA_TYPES_FLOAT]);
	                        } else if constexpr (std::is_same_v<T, double>) {
	                            UA_Double v = arg;
	                            UA_Variant_setScalar(&value, &v, &UA_TYPES[UA_TYPES_DOUBLE]);
	                        }
	                    }, u.value);

	                    if (value.type) {
	                        g_suppressOpcUaWriteCallback = true;
	                        UA_StatusCode wst = UA_Server_writeValue(g_uaServer, b.nodeId, value);
	                        g_suppressOpcUaWriteCallback = false;
	                        if (wst != UA_STATUSCODE_GOOD) {
	                            std::cerr << "OPC UA live: writeValue failed for ["
	                                      << b.conn->id << "]." << b.logical_name
	                                      << ": " << UA_StatusCode_name(wst) << "\n";
	                        }
	                    }
	                }
	            }

	            // Drain MQTT publish jobs in the main thread.
	            std::unordered_map<std::string, bool> connHadMqttPublish;
	            if (mqttMode) {
	                std::deque<MqttPublishJob> local;
	                {
	                    std::lock_guard<std::mutex> lock(mqttQueueMutex);
	                    local.swap(mqttQueue);
	                }

	                for (auto &j : local) {
	                    bool pub = mqtt_publish_snapshot(
	                        j.snap,
	                        j.hadPrev ? &j.prev : nullptr
	                    );
	                    if (pub) {
	                        connHadMqttPublish[j.snap.connection_id] = true;
	                    }
	                }
	            }

	            if (mqttMode && g_mqttCfg.publish_conn_json && !connHadMqttPublish.empty()) {
	                std::lock_guard<std::mutex> lock(driverMutex);
	                for (const auto &kv : connHadMqttPublish) {
	                    if (!kv.second) continue;
	                    mqtt_publish_connection_snapshot(kv.first, tagTable, true);
	                }
	            }

	            if (g_uaServer) {
	                UA_Server_run_iterate(g_uaServer, false);
	            }

	            if (mqttMode && g_mqtt) {
	                int rc = mosquitto_loop(g_mqtt, 0 /* timeout ms */, 1 /* max packets */);
	                if (rc != MOSQ_ERR_SUCCESS && rc != MOSQ_ERR_NO_CONN) {
	                    std::cerr << "[mqtt] mosquitto_loop error: "
	                              << mosquitto_strerror(rc) << "\n";
	                }
	            }

	            std::this_thread::sleep_for(std::chrono::milliseconds(50));
	        }

	        shutdown_opcua_server();
	        mqtt_shutdown();
	        sqlite_shutdown();
        destroy_all_handles(drivers);
        sqlite_alarm_shutdown();
        return 0;

    } catch (const std::exception &ex) {
        std::cerr << "Fatal error: " << ex.what() << std::endl;
        return 1;
    }
}
