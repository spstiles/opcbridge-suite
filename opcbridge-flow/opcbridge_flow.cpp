#include "httplib.h"
#include "nlohmann/json.hpp"

#include <curl/curl.h>
#include <mosquitto.h>

#include <algorithm>
#include <atomic>
#include <chrono>
#include <cmath>
#include <condition_variable>
#include <cctype>
#include <deque>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <map>
#include <mutex>
#include <optional>
#include <set>
#include <sstream>
#include <string>
#include <thread>
#include <unordered_map>
#include <unordered_set>
#include <vector>

#ifndef OPCBRIDGE_SUITE_VERSION
#define OPCBRIDGE_SUITE_VERSION "dev"
#endif
#ifndef OPCBRIDGE_FLOW_VERSION
#define OPCBRIDGE_FLOW_VERSION "dev"
#endif

using json = nlohmann::json;
namespace fs = std::filesystem;

static long long now_ms() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
}

static std::string trim(std::string value) {
    auto not_space = [](unsigned char ch) { return !std::isspace(ch); };
    value.erase(value.begin(), std::find_if(value.begin(), value.end(), not_space));
    value.erase(std::find_if(value.rbegin(), value.rend(), not_space).base(), value.end());
    return value;
}

static json read_json(const std::string& path, const json& fallback = json::object()) {
    try {
        std::ifstream input(path);
        if (!input) return fallback;
        return json::parse(input, nullptr, true, true);
    } catch (const std::exception& ex) {
        std::cerr << "opcbridge-flow: could not read " << path << ": " << ex.what() << "\n";
        return fallback;
    }
}

static bool write_json_atomic(const std::string& path, const json& value, std::string& error) {
    try {
        const fs::path target(path);
        if (target.has_parent_path()) fs::create_directories(target.parent_path());
        const fs::path temporary = target.string() + ".tmp";
        {
            std::ofstream output(temporary, std::ios::trunc);
            if (!output) throw std::runtime_error("could not open temporary file");
            output << value.dump(2) << "\n";
            output.flush();
            if (!output) throw std::runtime_error("could not write temporary file");
        }
        fs::rename(temporary, target);
        return true;
    } catch (const std::exception& ex) {
        error = ex.what();
        return false;
    }
}

static size_t curl_write(char* ptr, size_t size, size_t nmemb, void* userdata) {
    auto* output = static_cast<std::string*>(userdata);
    output->append(ptr, size * nmemb);
    return size * nmemb;
}

struct HttpResult {
    bool transport_ok = false;
    long status = 0;
    std::string body;
    std::string error;
};

static HttpResult http_request(const std::string& method, const std::string& url,
                               const std::string& body = "", long timeout_ms = 5000) {
    HttpResult out;
    CURL* curl = curl_easy_init();
    if (!curl) { out.error = "curl_easy_init failed"; return out; }
    char error_buffer[CURL_ERROR_SIZE] = {0};
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, timeout_ms);
    curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT_MS, std::min<long>(timeout_ms, 2000));
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curl_write);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &out.body);
    curl_easy_setopt(curl, CURLOPT_ERRORBUFFER, error_buffer);
    curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L);
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Accept: application/json");
    if (method == "POST") {
        headers = curl_slist_append(headers, "Content-Type: application/json");
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, static_cast<long>(body.size()));
    }
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    const CURLcode code = curl_easy_perform(curl);
    if (code == CURLE_OK) {
        out.transport_ok = true;
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &out.status);
    } else {
        out.error = error_buffer[0] ? error_buffer : curl_easy_strerror(code);
    }
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return out;
}

static std::string url_encode(const std::string& value) {
    CURL* curl = curl_easy_init();
    if (!curl) return value;
    char* escaped = curl_easy_escape(curl, value.c_str(), static_cast<int>(value.size()));
    std::string output = escaped ? escaped : value;
    if (escaped) curl_free(escaped);
    curl_easy_cleanup(curl);
    return output;
}

struct ServiceConfig {
    std::string listen_host = "127.0.0.1";
    int listen_port = 8098;
    std::string opcbridge_base_url = "http://127.0.0.1:8080";
    int poll_interval_ms = 500;
    int max_event_hops = 64;
    std::string mqtt_config = "/etc/opcbridge/mqtt.json";
};

struct FlowEvent {
    bool present = false;
    json value = nullptr;
    std::string quality = "not_initialized";
    long long timestamp_ms = 0;
    std::string source;
    std::string topic;
};

struct NodeRuntime {
    std::string status = "idle";
    std::string last_error;
    long long last_input_ms = 0;
    long long last_output_ms = 0;
    long long messages_in = 0;
    long long messages_out = 0;
    long long rejected = 0;
    json last_value = nullptr;
};

struct FlowRuntime {
    std::string status = "stopped";
    std::string last_error;
    long long deployed_ms = 0;
    long long events_total = 0;
    std::map<std::string, NodeRuntime> nodes;
};

struct QueuedEvent {
    std::string flow_id;
    std::string node_id;
    FlowEvent event;
    int hops = 0;
};

static bool event_writable(const FlowEvent& event, std::string& reason) {
    if (!event.present) { reason = "value has not been initialized"; return false; }
    if (event.value.is_null()) { reason = "null values are not writable"; return false; }
    if (event.quality != "good") { reason = "quality is " + event.quality; return false; }
    return true;
}

static std::optional<double> as_number(const json& value) {
    try {
        if (value.is_number()) return value.get<double>();
        if (value.is_boolean()) return value.get<bool>() ? 1.0 : 0.0;
        if (value.is_string()) {
            const std::string raw = trim(value.get<std::string>());
            size_t used = 0;
            const double parsed = std::stod(raw, &used);
            if (used == raw.size() && std::isfinite(parsed)) return parsed;
        }
    } catch (...) {}
    return std::nullopt;
}

static std::optional<bool> as_bool(const json& value) {
    if (value.is_boolean()) return value.get<bool>();
    if (value.is_number()) return value.get<double>() != 0.0;
    if (value.is_string()) {
        std::string raw = trim(value.get<std::string>());
        std::transform(raw.begin(), raw.end(), raw.begin(), [](unsigned char ch) { return std::tolower(ch); });
        if (raw == "true" || raw == "on" || raw == "yes" || raw == "1") return true;
        if (raw == "false" || raw == "off" || raw == "no" || raw == "0") return false;
    }
    return std::nullopt;
}

static std::string scalar_text(const json& value) {
    if (value.is_string()) return value.get<std::string>();
    if (value.is_boolean()) return value.get<bool>() ? "true" : "false";
    if (value.is_number_float()) { std::ostringstream out; out << value.get<double>(); return out.str(); }
    if (value.is_number_integer()) return std::to_string(value.get<long long>());
    if (value.is_number_unsigned()) return std::to_string(value.get<unsigned long long>());
    return value.dump();
}

static std::optional<json> json_path_value(const json& root, const std::string& path) {
    if (path.empty()) return root;
    const json* current = &root;
    std::string token;
    for (size_t i = 0; i <= path.size(); ++i) {
        const char ch = i < path.size() ? path[i] : '.';
        if (ch == '.') {
            if (!token.empty()) {
                if (!current->is_object() || !current->contains(token)) return std::nullopt;
                current = &current->at(token); token.clear();
            }
        } else if (ch == '[') {
            if (!token.empty()) {
                if (!current->is_object() || !current->contains(token)) return std::nullopt;
                current = &current->at(token); token.clear();
            }
            const size_t close = path.find(']', i + 1);
            if (close == std::string::npos) return std::nullopt;
            try {
                const size_t index = static_cast<size_t>(std::stoul(path.substr(i + 1, close - i - 1)));
                if (!current->is_array() || index >= current->size()) return std::nullopt;
                current = &current->at(index); i = close;
            } catch (...) { return std::nullopt; }
        } else token += ch;
    }
    return *current;
}

class FlowService {
public:
    FlowService(ServiceConfig config, std::string drafts_path, std::string deployed_path,
                std::string state_path, std::string write_token)
        : config_(std::move(config)), drafts_path_(std::move(drafts_path)),
          deployed_path_(std::move(deployed_path)), state_path_(std::move(state_path)),
          write_token_(std::move(write_token)) {}

    ~FlowService() { stop(); }

    void start() {
        load_all();
        start_mqtt();
        stop_.store(false);
        worker_ = std::thread([this]() { worker_loop(); });
    }

    void stop() {
        if (stop_.exchange(true)) return;
        cv_.notify_all();
        if (worker_.joinable()) worker_.join();
        if (mqtt_) {
            mosquitto_disconnect(mqtt_);
            mosquitto_loop_stop(mqtt_, true);
            mosquitto_destroy(mqtt_);
            mqtt_ = nullptr;
        }
        save_state();
    }

    json health() const {
        std::lock_guard<std::mutex> lock(mu_);
        int running = 0, failed = 0;
        for (const auto& entry : runtime_) {
            if (entry.second.status == "running") ++running;
            if (entry.second.status == "error") ++failed;
        }
        return {{"ok", true}, {"service", "opcbridge-flow"}, {"version", OPCBRIDGE_FLOW_VERSION},
            {"component_version", OPCBRIDGE_FLOW_VERSION}, {"suite_version", OPCBRIDGE_SUITE_VERSION},
            {"draft_flows", drafts_.size()}, {"deployed_flows", deployed_.size()},
            {"running_flows", running}, {"failed_flows", failed},
            {"mqtt", {{"configured", mqtt_configured_}, {"connected", mqtt_connected_.load()},
                      {"last_error", mqtt_last_error_}}}};
    }

    json flows() const {
        std::lock_guard<std::mutex> lock(mu_);
        json runtime = json::object();
        for (const auto& entry : runtime_) runtime[entry.first] = runtime_json(entry.second);
        return {{"ok", true}, {"drafts", map_values(drafts_)}, {"deployed", map_values(deployed_)}, {"runtime", runtime}};
    }

    json save_draft(json flow) {
        std::string error;
        if (!normalize_and_validate(flow, error, false)) return {{"ok", false}, {"error", error}};
        {
            std::lock_guard<std::mutex> lock(mu_);
            drafts_[flow["id"].get<std::string>()] = flow;
        }
        if (!save_collection(drafts_path_, drafts_, error)) return {{"ok", false}, {"error", error}};
        return {{"ok", true}, {"flow", flow}};
    }

    json remove_draft(const std::string& id) {
        {
            std::lock_guard<std::mutex> lock(mu_);
            if (deployed_.count(id)) return {{"ok", false}, {"error", "Disable the deployed flow before deleting it"}};
            if (!drafts_.erase(id)) return {{"ok", false}, {"error", "Flow not found"}};
        }
        std::string error;
        if (!save_collection(drafts_path_, drafts_, error)) return {{"ok", false}, {"error", error}};
        return {{"ok", true}};
    }

    json deploy(const std::string& id) {
        json candidate;
        {
            std::lock_guard<std::mutex> lock(mu_);
            auto found = drafts_.find(id);
            if (found == drafts_.end()) return {{"ok", false}, {"error", "Draft flow not found"}};
            candidate = found->second;
        }
        std::string error;
        if (!normalize_and_validate(candidate, error, true)) return {{"ok", false}, {"error", error}};

        // Persist the complete staged definition before atomically switching the
        // in-memory graph. Deployment never creates an input event.
        std::map<std::string, json> next;
        {
            std::lock_guard<std::mutex> lock(mu_);
            next = deployed_;
            candidate["deployed_ms"] = now_ms();
            next[id] = candidate;
        }
        if (!save_collection(deployed_path_, next, error)) return {{"ok", false}, {"error", error}};
        {
            std::lock_guard<std::mutex> lock(mu_);
            deployed_ = std::move(next);
            FlowRuntime& state = runtime_[id];
            state.status = candidate.value("enabled", true) ? "running" : "disabled";
            state.last_error.clear();
            state.deployed_ms = candidate.value("deployed_ms", now_ms());
            state.nodes.clear();
            for (const auto& node : candidate.value("nodes", json::array())) state.nodes[node.value("id", "")];
            next_poll_ms_[id].clear();
            if (candidate.value("mode", "active") == "monitor") last_input_values_[id].clear();
        }
        refresh_mqtt_subscriptions();
        return {{"ok", true}, {"flow", candidate}, {"message", "Flow deployed without emitting data"}};
    }

    json disable(const std::string& id) {
        std::map<std::string, json> next;
        {
            std::lock_guard<std::mutex> lock(mu_);
            if (!deployed_.count(id)) return {{"ok", false}, {"error", "Deployed flow not found"}};
            next = deployed_; next.erase(id);
        }
        std::string error;
        if (!save_collection(deployed_path_, next, error)) return {{"ok", false}, {"error", error}};
        {
            std::lock_guard<std::mutex> lock(mu_);
            deployed_ = std::move(next);
            runtime_[id].status = "stopped";
        }
        refresh_mqtt_subscriptions();
        return {{"ok", true}};
    }

    json inject(const std::string& id, const std::string& node_id, const json& value) {
        {
            std::lock_guard<std::mutex> lock(mu_);
            auto flow = deployed_.find(id);
            if (flow == deployed_.end()) return {{"ok", false}, {"error", "Flow is not deployed"}};
            bool found = false;
            for (const auto& node : flow->second.value("nodes", json::array())) if (node.value("id", "") == node_id) found = true;
            if (!found) return {{"ok", false}, {"error", "Node not found"}};
        }
        FlowEvent event;
        event.present = !value.is_null(); event.value = value;
        event.quality = value.is_null() ? "bad_null" : "good";
        event.timestamp_ms = now_ms(); event.source = "manual_test";
        enqueue({id, node_id, event, 0});
        return {{"ok", true}, {"message", "Test event queued"}};
    }

private:
    static json map_values(const std::map<std::string, json>& values) {
        json output = json::array();
        for (const auto& entry : values) output.push_back(entry.second);
        return output;
    }

    static json runtime_json(const FlowRuntime& runtime) {
        json nodes = json::object();
        for (const auto& entry : runtime.nodes) {
            const NodeRuntime& node = entry.second;
            nodes[entry.first] = {{"status", node.status}, {"last_error", node.last_error},
                {"last_input_ms", node.last_input_ms}, {"last_output_ms", node.last_output_ms},
                {"messages_in", node.messages_in}, {"messages_out", node.messages_out},
                {"rejected", node.rejected}, {"last_value", node.last_value}};
        }
        return {{"status", runtime.status}, {"last_error", runtime.last_error},
            {"deployed_ms", runtime.deployed_ms}, {"events_total", runtime.events_total}, {"nodes", nodes}};
    }

    void load_all() {
        auto load_collection = [](const json& root) {
            std::map<std::string, json> output;
            for (const auto& flow : root.value("flows", json::array())) {
                if (flow.is_object() && !flow.value("id", "").empty()) output[flow.value("id", "")] = flow;
            }
            return output;
        };
        std::lock_guard<std::mutex> lock(mu_);
        drafts_ = load_collection(read_json(drafts_path_, {{"flows", json::array()}}));
        deployed_ = load_collection(read_json(deployed_path_, {{"flows", json::array()}}));
        for (const auto& entry : deployed_) {
            FlowRuntime state;
            state.status = entry.second.value("enabled", true) ? "running" : "disabled";
            state.deployed_ms = entry.second.value("deployed_ms", 0LL);
            for (const auto& node : entry.second.value("nodes", json::array())) state.nodes[node.value("id", "")];
            runtime_[entry.first] = state;
        }
    }

    bool save_collection(const std::string& path, const std::map<std::string, json>& values, std::string& error) const {
        return write_json_atomic(path, {{"flows", map_values(values)}}, error);
    }

    void save_state() const {
        json runtime = json::object();
        {
            std::lock_guard<std::mutex> lock(mu_);
            for (const auto& entry : runtime_) runtime[entry.first] = runtime_json(entry.second);
        }
        std::string error;
        if (!write_json_atomic(state_path_, {{"updated_ms", now_ms()}, {"runtime", runtime}}, error))
            std::cerr << "opcbridge-flow: state save failed: " << error << "\n";
    }

    bool normalize_and_validate(json& flow, std::string& error, bool for_deploy) const {
        if (!flow.is_object()) { error = "Flow must be an object"; return false; }
        const std::string id = trim(flow.value("id", ""));
        const std::string name = trim(flow.value("name", ""));
        if (id.empty() || !std::all_of(id.begin(), id.end(), [](unsigned char ch) { return std::isalnum(ch) || ch == '_' || ch == '-'; })) {
            error = "Flow ID may contain only letters, numbers, underscores, and dashes"; return false;
        }
        if (name.empty()) { error = "Flow name is required"; return false; }
        flow["id"] = id; flow["name"] = name;
        if (!flow.contains("enabled")) flow["enabled"] = true;
        if (!flow.contains("mode")) flow["mode"] = "active";
        if (!flow.contains("nodes") || !flow["nodes"].is_array()) { error = "Flow nodes must be an array"; return false; }
        if (!flow.contains("edges") || !flow["edges"].is_array()) { error = "Flow edges must be an array"; return false; }
        static const std::set<std::string> allowed = {"opc_tag_input", "mqtt_subscribe", "manual_input", "linear_map",
            "boolean_invert", "datatype_convert", "debug", "opc_tag_write", "mqtt_publish"};
        std::unordered_set<std::string> node_ids;
        std::unordered_map<std::string, std::string> types;
        for (auto& node : flow["nodes"]) {
            if (!node.is_object()) { error = "Every node must be an object"; return false; }
            const std::string node_id = trim(node.value("id", ""));
            const std::string type = trim(node.value("type", ""));
            if (node_id.empty() || !node_ids.insert(node_id).second) { error = "Node IDs must be present and unique"; return false; }
            if (!allowed.count(type)) { error = "Unsupported node type: " + type; return false; }
            node["id"] = node_id; node["type"] = type; types[node_id] = type;
            if (!node.contains("config") || !node["config"].is_object()) node["config"] = json::object();
            const json& cfg = node["config"];
            if (type == "opc_tag_input" || type == "opc_tag_write") {
                if (trim(cfg.value("connection_id", "")).empty() || trim(cfg.value("tag_name", "")).empty()) {
                    error = type + " requires a connection and tag"; return false;
                }
            }
            if ((type == "mqtt_subscribe" || type == "mqtt_publish") && trim(cfg.value("topic", "")).empty()) {
                error = type + " requires a topic"; return false;
            }
            if (type == "linear_map") {
                const double in_min = cfg.value("input_min", 0.0), in_max = cfg.value("input_max", 100.0);
                if (in_min == in_max) { error = "Linear map input range cannot be zero"; return false; }
            }
        }
        std::unordered_map<std::string, std::vector<std::string>> graph;
        std::unordered_map<std::string, int> indegree;
        for (const auto& node_id : node_ids) indegree[node_id] = 0;
        for (auto& edge : flow["edges"]) {
            const std::string from = trim(edge.value("from", "")), to = trim(edge.value("to", ""));
            if (!node_ids.count(from) || !node_ids.count(to)) { error = "Every edge must connect existing nodes"; return false; }
            if (from == to) { error = "A node cannot connect to itself"; return false; }
            edge["from"] = from; edge["to"] = to;
            graph[from].push_back(to); indegree[to]++;
        }
        std::deque<std::string> ready;
        for (const auto& entry : indegree) if (entry.second == 0) ready.push_back(entry.first);
        size_t visited = 0;
        while (!ready.empty()) {
            const std::string node = ready.front(); ready.pop_front(); ++visited;
            for (const auto& next : graph[node]) if (--indegree[next] == 0) ready.push_back(next);
        }
        if (visited != node_ids.size()) { error = "Flow contains a cycle"; return false; }
        if (for_deploy && flow.value("mode", "active") == "monitor") {
            // Monitor mode is enforced by output nodes at execution time.
        }
        return true;
    }

    void enqueue(QueuedEvent event) {
        {
            std::lock_guard<std::mutex> lock(queue_mu_);
            queue_.push_back(std::move(event));
        }
        cv_.notify_one();
    }

    void worker_loop() {
        long long last_state_save = 0;
        while (!stop_.load()) {
            poll_inputs();
            std::deque<QueuedEvent> events;
            {
                std::lock_guard<std::mutex> lock(queue_mu_);
                events.swap(queue_);
            }
            while (!events.empty()) {
                process_event(events.front()); events.pop_front();
                std::lock_guard<std::mutex> lock(queue_mu_);
                while (!queue_.empty()) { events.push_back(std::move(queue_.front())); queue_.pop_front(); }
            }
            if (now_ms() - last_state_save >= 5000) { save_state(); last_state_save = now_ms(); }
            std::unique_lock<std::mutex> lock(wait_mu_);
            cv_.wait_for(lock, std::chrono::milliseconds(100), [this]() { return stop_.load(); });
        }
    }

    void poll_inputs() {
        struct Task { std::string flow_id; std::string node_id; json config; };
        std::vector<Task> tasks;
        const long long now = now_ms();
        {
            std::lock_guard<std::mutex> lock(mu_);
            for (const auto& flow_entry : deployed_) {
                const json& flow = flow_entry.second;
                if (!flow.value("enabled", true)) continue;
                for (const auto& node : flow.value("nodes", json::array())) {
                    if (node.value("type", "") != "opc_tag_input") continue;
                    const std::string node_id = node.value("id", "");
                    const int interval = std::max(100, node["config"].value("poll_interval_ms", config_.poll_interval_ms));
                    if (next_poll_ms_[flow_entry.first][node_id] <= now) {
                        next_poll_ms_[flow_entry.first][node_id] = now + interval;
                        tasks.push_back({flow_entry.first, node_id, node["config"]});
                    }
                }
            }
        }
        for (const auto& task : tasks) poll_tag(task.flow_id, task.node_id, task.config);
    }

    void poll_tag(const std::string& flow_id, const std::string& node_id, const json& cfg) {
        const std::string conn = cfg.value("connection_id", ""), tag = cfg.value("tag_name", "");
        const std::string url = config_.opcbridge_base_url + "/tags?connection_id=" + url_encode(conn) +
            "&tag=" + url_encode(tag) + "&limit=1";
        const HttpResult response = http_request("GET", url, "", 3000);
        FlowEvent event; event.timestamp_ms = now_ms(); event.source = "opcbridge:" + conn + ":" + tag;
        if (!response.transport_ok || response.status != 200) {
            event.quality = "bad_source";
            set_node_error(flow_id, node_id, response.error.empty() ? "OPCBridge tag request failed" : response.error);
            return;
        }
        try {
            const json body = json::parse(response.body);
            const json rows = body.value("tags", json::array());
            if (!rows.is_array() || rows.empty() || !rows[0].contains("value") || rows[0]["value"].is_null()) {
                set_node_error(flow_id, node_id, "Tag has no current value"); return;
            }
            const json& row = rows[0];
            if (row.value("quality", 0) != 1) { set_node_error(flow_id, node_id, "Tag quality is bad"); return; }
            event.present = true; event.value = row["value"]; event.quality = "good";
            event.timestamp_ms = row.value("timestamp_ms", now_ms());
            bool changed = false;
            bool had_baseline = false;
            bool monitor_mode = false;
            {
                std::lock_guard<std::mutex> lock(mu_);
                NodeRuntime& observed = runtime_[flow_id].nodes[node_id];
                observed.status = "watching";
                observed.last_error.clear();
                observed.last_input_ms = event.timestamp_ms;
                observed.last_value = event.value;
                json& last = last_input_values_[flow_id][node_id];
                had_baseline = !last.is_null();
                changed = had_baseline && last != event.value;
                last = event.value;
                const auto deployed = deployed_.find(flow_id);
                monitor_mode = deployed != deployed_.end() && deployed->second.value("mode", "active") == "monitor";
            }
            // Establishing a baseline is observational in active mode and must
            // never cause a write merely because a flow was deployed. Monitor
            // mode may propagate that baseline because all external outputs are
            // suppressed, which makes the diagnostic canvas immediately useful.
            if (changed || !cfg.value("only_on_change", true) || (!had_baseline && monitor_mode))
                enqueue({flow_id, node_id, event, 0});
        } catch (const std::exception& ex) { set_node_error(flow_id, node_id, ex.what()); }
    }

    void process_event(const QueuedEvent& queued) {
        if (queued.hops > config_.max_event_hops) { set_flow_error(queued.flow_id, "Maximum event hops exceeded"); return; }
        json flow, node;
        {
            std::lock_guard<std::mutex> lock(mu_);
            auto found = deployed_.find(queued.flow_id);
            if (found == deployed_.end() || !found->second.value("enabled", true)) return;
            flow = found->second;
            for (const auto& candidate : flow.value("nodes", json::array())) {
                if (candidate.value("id", "") == queued.node_id) { node = candidate; break; }
            }
            if (node.is_null() || node.empty()) return;
            NodeRuntime& state = runtime_[queued.flow_id].nodes[queued.node_id];
            state.messages_in++; state.last_input_ms = now_ms(); state.last_value = queued.event.value; state.status = "running"; state.last_error.clear();
            runtime_[queued.flow_id].events_total++;
        }
        const std::string type = node.value("type", "");
        FlowEvent output = queued.event;
        bool emit = true;
        std::string error;
        const json cfg = node.value("config", json::object());
        if (type == "linear_map") {
            const auto number = as_number(output.value);
            if (!event_writable(output, error) || !number) { if (error.empty()) error = "input is not numeric"; emit = false; }
            else {
                const double in_min = cfg.value("input_min", 0.0), in_max = cfg.value("input_max", 100.0);
                const double out_min = cfg.value("output_min", 0.0), out_max = cfg.value("output_max", 100.0);
                double mapped = out_min + ((*number - in_min) / (in_max - in_min)) * (out_max - out_min);
                if (cfg.value("clamp", false)) mapped = std::max(std::min(out_min, out_max), std::min(std::max(out_min, out_max), mapped));
                output.value = mapped;
            }
        } else if (type == "boolean_invert") {
            const auto boolean = as_bool(output.value);
            if (!event_writable(output, error) || !boolean) { if (error.empty()) error = "input is not Boolean"; emit = false; }
            else output.value = !*boolean;
        } else if (type == "datatype_convert") {
            if (!event_writable(output, error)) emit = false;
            else {
                const std::string target = cfg.value("datatype", "string");
                if (target == "bool") { auto value = as_bool(output.value); if (value) output.value = *value; else { error = "Boolean conversion failed"; emit = false; } }
                else if (target == "float" || target == "double") { auto value = as_number(output.value); if (value) output.value = *value; else { error = "Numeric conversion failed"; emit = false; } }
                else if (target == "integer") { auto value = as_number(output.value); if (value) output.value = static_cast<long long>(std::llround(*value)); else { error = "Integer conversion failed"; emit = false; } }
                else output.value = scalar_text(output.value);
            }
        } else if (type == "debug") {
            std::cout << "[flow " << queued.flow_id << "][" << queued.node_id << "] "
                      << output.quality << " " << (output.present ? output.value.dump() : "<missing>") << "\n";
        } else if (type == "opc_tag_write") {
            emit = false;
            if (flow.value("mode", "active") == "monitor") {
                mark_node_output(queued.flow_id, queued.node_id, output, "monitor: write suppressed");
            } else if (!event_writable(output, error)) {
                // Rejected below.
            } else {
                const int stale_ms = std::max(0, cfg.value("stale_after_ms", 0));
                if (stale_ms > 0 && now_ms() - output.timestamp_ms > stale_ms) error = "input is stale";
                else if (write_opc_tag(cfg, output.value, error)) mark_node_output(queued.flow_id, queued.node_id, output, "write ok");
            }
        } else if (type == "mqtt_publish") {
            emit = false;
            if (flow.value("mode", "active") == "monitor") {
                mark_node_output(queued.flow_id, queued.node_id, output, "monitor: publish suppressed");
            } else if (!event_writable(output, error)) {
                // Rejected below.
            } else if (!mqtt_ || !mqtt_connected_.load()) error = "MQTT is not connected";
            else {
                const std::string topic = cfg.value("topic", "");
                const std::string payload = cfg.value("payload_format", "scalar") == "json" ? output.value.dump() : scalar_text(output.value);
                const int qos = std::max(0, std::min(2, cfg.value("qos", mqtt_qos_)));
                const int rc = mosquitto_publish(mqtt_, nullptr, topic.c_str(), static_cast<int>(payload.size()), payload.data(), qos, cfg.value("retain", false));
                if (rc != MOSQ_ERR_SUCCESS) error = mosquitto_strerror(rc);
                else mark_node_output(queued.flow_id, queued.node_id, output, "publish ok");
            }
        }
        if (!error.empty()) { reject_node(queued.flow_id, queued.node_id, error); return; }
        if (!emit) return;
        mark_node_output(queued.flow_id, queued.node_id, output, "ok");
        for (const auto& edge : flow.value("edges", json::array())) {
            if (edge.value("from", "") == queued.node_id) enqueue({queued.flow_id, edge.value("to", ""), output, queued.hops + 1});
        }
    }

    bool write_opc_tag(const json& cfg, const json& value, std::string& error) const {
        json body = {{"connection_id", cfg.value("connection_id", "")}, {"name", cfg.value("tag_name", "")},
                     {"value", scalar_text(value)}, {"token", write_token_}};
        const HttpResult response = http_request("POST", config_.opcbridge_base_url + "/write", body.dump(), 5000);
        if (!response.transport_ok) { error = response.error; return false; }
        try {
            const json parsed = json::parse(response.body);
            if (response.status >= 200 && response.status < 300 && parsed.value("ok", false)) return true;
            error = parsed.value("error", "OPCBridge write failed");
        } catch (...) { error = "OPCBridge returned an invalid write response"; }
        return false;
    }

    void mark_node_output(const std::string& flow_id, const std::string& node_id, const FlowEvent& event, const std::string& status) {
        std::lock_guard<std::mutex> lock(mu_);
        NodeRuntime& node = runtime_[flow_id].nodes[node_id];
        node.messages_out++; node.last_output_ms = now_ms(); node.last_value = event.value; node.status = status; node.last_error.clear();
    }

    void reject_node(const std::string& flow_id, const std::string& node_id, const std::string& error) {
        std::lock_guard<std::mutex> lock(mu_);
        NodeRuntime& node = runtime_[flow_id].nodes[node_id];
        node.rejected++; node.status = "rejected"; node.last_error = error;
    }

    void set_node_error(const std::string& flow_id, const std::string& node_id, const std::string& error) {
        std::lock_guard<std::mutex> lock(mu_);
        NodeRuntime& node = runtime_[flow_id].nodes[node_id]; node.status = "error"; node.last_error = error;
    }

    void set_flow_error(const std::string& flow_id, const std::string& error) {
        std::lock_guard<std::mutex> lock(mu_);
        FlowRuntime& flow = runtime_[flow_id]; flow.status = "error"; flow.last_error = error;
    }

    void start_mqtt() {
        const json cfg = read_json(config_.mqtt_config, json::object());
        if (!cfg.value("enabled", false)) return;
        mqtt_configured_ = true;
        mqtt_host_ = cfg.value("host", "127.0.0.1"); mqtt_port_ = cfg.value("port", 1883);
        mqtt_qos_ = std::max(0, std::min(2, cfg.value("qos", 0)));
        mosquitto_lib_init();
        const std::string client_id = "opcbridge-flow-" + std::to_string(now_ms());
        mqtt_ = mosquitto_new(client_id.c_str(), true, this);
        if (!mqtt_) { mqtt_last_error_ = "mosquitto_new failed"; return; }
        const std::string username = cfg.value("username", ""), password = cfg.value("password", "");
        if (!username.empty()) mosquitto_username_pw_set(mqtt_, username.c_str(), password.empty() ? nullptr : password.c_str());
        if (cfg.value("use_tls", false)) {
            const std::string base = fs::path(config_.mqtt_config).parent_path().string();
            auto resolved = [&](const std::string& value) { return value.empty() ? value : (fs::path(value).is_absolute() ? value : (fs::path(base) / value).string()); };
            const std::string ca = resolved(cfg.value("cafile", "")), cert = resolved(cfg.value("certfile", "")), key = resolved(cfg.value("keyfile", ""));
            if (mosquitto_tls_set(mqtt_, ca.empty() ? nullptr : ca.c_str(), nullptr, cert.empty() ? nullptr : cert.c_str(), key.empty() ? nullptr : key.c_str(), nullptr) != MOSQ_ERR_SUCCESS) {
                mqtt_last_error_ = "MQTT TLS configuration failed";
            }
            mosquitto_tls_insecure_set(mqtt_, cfg.value("tls_insecure", false));
        }
        mosquitto_connect_callback_set(mqtt_, [](mosquitto*, void* userdata, int rc) {
            auto* self = static_cast<FlowService*>(userdata);
            self->mqtt_connected_.store(rc == 0);
            if (rc == 0) { self->mqtt_last_error_.clear(); self->refresh_mqtt_subscriptions(); }
            else self->mqtt_last_error_ = mosquitto_connack_string(rc);
        });
        mosquitto_disconnect_callback_set(mqtt_, [](mosquitto*, void* userdata, int rc) {
            auto* self = static_cast<FlowService*>(userdata); self->mqtt_connected_.store(false);
            if (rc) self->mqtt_last_error_ = "MQTT disconnected";
        });
        mosquitto_message_callback_set(mqtt_, [](mosquitto*, void* userdata, const mosquitto_message* message) {
            static_cast<FlowService*>(userdata)->on_mqtt_message(message);
        });
        const int rc = mosquitto_connect_async(mqtt_, mqtt_host_.c_str(), mqtt_port_, 30);
        if (rc != MOSQ_ERR_SUCCESS) mqtt_last_error_ = mosquitto_strerror(rc);
        mosquitto_loop_start(mqtt_);
    }

    void refresh_mqtt_subscriptions() {
        if (!mqtt_ || !mqtt_connected_.load()) return;
        std::set<std::string> desired;
        {
            std::lock_guard<std::mutex> lock(mu_);
            for (const auto& flow : deployed_) for (const auto& node : flow.second.value("nodes", json::array()))
                if (node.value("type", "") == "mqtt_subscribe") desired.insert(node["config"].value("topic", ""));
        }
        for (const auto& topic : desired) {
            if (!topic.empty() && !mqtt_subscriptions_.count(topic)) {
                if (mosquitto_subscribe(mqtt_, nullptr, topic.c_str(), mqtt_qos_) == MOSQ_ERR_SUCCESS) mqtt_subscriptions_.insert(topic);
            }
        }
        for (auto it = mqtt_subscriptions_.begin(); it != mqtt_subscriptions_.end();) {
            if (!desired.count(*it)) { mosquitto_unsubscribe(mqtt_, nullptr, it->c_str()); it = mqtt_subscriptions_.erase(it); }
            else ++it;
        }
    }

    void on_mqtt_message(const mosquitto_message* message) {
        if (!message || !message->topic) return;
        std::vector<std::tuple<std::string, std::string, json>> targets;
        {
            std::lock_guard<std::mutex> lock(mu_);
            for (const auto& flow : deployed_) {
                if (!flow.second.value("enabled", true)) continue;
                for (const auto& node : flow.second.value("nodes", json::array())) {
                    if (node.value("type", "") != "mqtt_subscribe") continue;
                    bool matches = false;
                    mosquitto_topic_matches_sub(node["config"].value("topic", "").c_str(), message->topic, &matches);
                    if (matches) targets.emplace_back(flow.first, node.value("id", ""), node["config"]);
                }
            }
        }
        const std::string payload(static_cast<const char*>(message->payload), static_cast<size_t>(std::max(0, message->payloadlen)));
        for (const auto& target : targets) {
            FlowEvent event; event.timestamp_ms = now_ms(); event.source = "mqtt"; event.topic = message->topic;
            const json& cfg = std::get<2>(target);
            try {
                const std::string format = cfg.value("payload_format", "auto");
                json value;
                if (format == "string") value = payload;
                else {
                    try { value = json::parse(payload); }
                    catch (...) {
                        if (format == "json") throw;
                        if (auto number = as_number(json(payload))) value = *number;
                        else if (auto boolean = as_bool(json(payload))) value = *boolean;
                        else value = payload;
                    }
                }
                const std::string path = cfg.value("json_path", "");
                const auto extracted = json_path_value(value, path);
                if (!extracted || extracted->is_null()) {
                    reject_node(std::get<0>(target), std::get<1>(target), extracted ? "MQTT value is null" : "MQTT JSON path is missing");
                    continue;
                }
                event.present = true; event.value = *extracted; event.quality = "good";
                enqueue({std::get<0>(target), std::get<1>(target), event, 0});
            } catch (const std::exception& ex) { reject_node(std::get<0>(target), std::get<1>(target), ex.what()); }
        }
    }

    ServiceConfig config_;
    std::string drafts_path_, deployed_path_, state_path_, write_token_;
    mutable std::mutex mu_, queue_mu_, wait_mu_;
    std::condition_variable cv_;
    std::atomic<bool> stop_{true};
    std::thread worker_;
    std::map<std::string, json> drafts_, deployed_;
    std::map<std::string, FlowRuntime> runtime_;
    std::map<std::string, std::map<std::string, long long>> next_poll_ms_;
    std::map<std::string, std::map<std::string, json>> last_input_values_;
    std::deque<QueuedEvent> queue_;
    mosquitto* mqtt_ = nullptr;
    bool mqtt_configured_ = false;
    std::atomic<bool> mqtt_connected_{false};
    std::string mqtt_host_, mqtt_last_error_;
    int mqtt_port_ = 1883, mqtt_qos_ = 0;
    std::set<std::string> mqtt_subscriptions_;
};

static void send_json(httplib::Response& response, int status, const json& body) {
    response.status = status;
    response.set_content(body.dump(2), "application/json");
}

int main(int argc, char** argv) {
    std::string config_path = "/etc/opcbridge/flow/config.json";
    std::string drafts_path = "/etc/opcbridge/flow/flows.json";
    std::string deployed_path = "/var/lib/opcbridge/flow/deployed.json";
    std::string state_path = "/var/lib/opcbridge/flow/runtime_state.json";
    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        auto next = [&]() { return i + 1 < argc ? std::string(argv[++i]) : std::string(); };
        if (arg == "--config") config_path = next();
        else if (arg == "--flows") drafts_path = next();
        else if (arg == "--deployed") deployed_path = next();
        else if (arg == "--state") state_path = next();
        else if (arg == "--version" || arg == "-V") {
            std::cout << "opcbridge-flow version " << OPCBRIDGE_FLOW_VERSION << " (suite " << OPCBRIDGE_SUITE_VERSION << ")\n";
            return 0;
        }
    }
    const json raw = read_json(config_path, json::object());
    ServiceConfig config;
    config.listen_host = raw.value("listen_host", config.listen_host);
    config.listen_port = raw.value("listen_port", config.listen_port);
    config.opcbridge_base_url = raw.value("opcbridge_base_url", config.opcbridge_base_url);
    config.poll_interval_ms = std::max(100, raw.value("poll_interval_ms", config.poll_interval_ms));
    config.max_event_hops = std::max(8, raw.value("max_event_hops", config.max_event_hops));
    config.mqtt_config = raw.value("mqtt_config", config.mqtt_config);
    const char* token = std::getenv("OPCBRIDGE_WRITE_TOKEN");
    curl_global_init(CURL_GLOBAL_DEFAULT);
    FlowService service(config, drafts_path, deployed_path, state_path, token ? token : "");
    service.start();

    httplib::Server server;
    server.Get("/health", [&](const httplib::Request&, httplib::Response& response) { send_json(response, 200, service.health()); });
    server.Get("/flows", [&](const httplib::Request&, httplib::Response& response) { send_json(response, 200, service.flows()); });
    server.Post("/flows", [&](const httplib::Request& request, httplib::Response& response) {
        try { json result = service.save_draft(json::parse(request.body)); send_json(response, result.value("ok", false) ? 200 : 400, result); }
        catch (const std::exception& ex) { send_json(response, 400, {{"ok", false}, {"error", ex.what()}}); }
    });
    server.Delete(R"(/flows/([A-Za-z0-9_-]+))", [&](const httplib::Request& request, httplib::Response& response) {
        json result = service.remove_draft(request.matches[1]); send_json(response, result.value("ok", false) ? 200 : 400, result);
    });
    server.Post(R"(/flows/([A-Za-z0-9_-]+)/deploy)", [&](const httplib::Request& request, httplib::Response& response) {
        json result = service.deploy(request.matches[1]); send_json(response, result.value("ok", false) ? 200 : 400, result);
    });
    server.Post(R"(/flows/([A-Za-z0-9_-]+)/disable)", [&](const httplib::Request& request, httplib::Response& response) {
        json result = service.disable(request.matches[1]); send_json(response, result.value("ok", false) ? 200 : 400, result);
    });
    server.Post(R"(/flows/([A-Za-z0-9_-]+)/inject/([A-Za-z0-9_-]+))", [&](const httplib::Request& request, httplib::Response& response) {
        try {
            const json body = json::parse(request.body);
            json result = service.inject(request.matches[1], request.matches[2], body.contains("value") ? body["value"] : json(nullptr));
            send_json(response, result.value("ok", false) ? 200 : 400, result);
        } catch (const std::exception& ex) { send_json(response, 400, {{"ok", false}, {"error", ex.what()}}); }
    });
    std::cout << "opcbridge-flow " << OPCBRIDGE_FLOW_VERSION << " listening on " << config.listen_host << ':' << config.listen_port << "\n";
    const bool listened = server.listen(config.listen_host.c_str(), config.listen_port);
    service.stop();
    mosquitto_lib_cleanup();
    curl_global_cleanup();
    return listened ? 0 : 1;
}
