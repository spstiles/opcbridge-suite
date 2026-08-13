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
#include <cstdint>
#include <deque>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <map>
#include <mutex>
#include <memory>
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
    std::string connections_dir = "/etc/opcbridge/connections";
};

struct FlowEvent {
    bool present = false;
    json value = nullptr;
    std::string quality = "not_initialized";
    long long timestamp_ms = 0;
    std::string source;
    std::string topic;
    std::string key;
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
    std::string last_key;
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
    std::string input_port;
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

static std::optional<uint64_t> parse_bit_integer(const json& value) {
    try {
        if (value.is_number_unsigned()) return value.get<uint64_t>();
        if (value.is_number_integer()) return static_cast<uint64_t>(value.get<int64_t>());
        if (value.is_number_float()) {
            const double number = value.get<double>();
            if (!std::isfinite(number) || std::trunc(number) != number) return std::nullopt;
            return static_cast<uint64_t>(static_cast<int64_t>(number));
        }
        std::string text = trim(value.is_string() ? value.get<std::string>() : value.dump());
        if (text.empty()) return std::nullopt;
        int base = 10;
        size_t prefix = 0;
        if (text.size() > 2 && text[0] == '0' && (text[1] == 'x' || text[1] == 'X')) { base = 16; prefix = 2; }
        else if (text.size() > 2 && text[0] == '0' && (text[1] == 'b' || text[1] == 'B')) { base = 2; prefix = 2; }
        size_t used = 0;
        const uint64_t result = std::stoull(text.substr(prefix), &used, base);
        if (used != text.size() - prefix) return std::nullopt;
        return result;
    } catch (...) { return std::nullopt; }
}

static uint64_t bit_word_mask(int width) {
    return width >= 64 ? UINT64_MAX : ((uint64_t{1} << width) - 1);
}

static json configured_flow_value(const json& value) {
    if (!value.is_string()) return value;
    const std::string text = trim(value.get<std::string>());
    if (text.empty()) return "";
    try { return json::parse(text); } catch (...) { return text; }
}

class MathExpression {
public:
    MathExpression(std::string expression, const std::map<std::string, double>& variables)
        : text_(std::move(expression)), variables_(variables) {}
    double evaluate() {
        position_ = 0; const double result = expression(); whitespace();
        if (position_ != text_.size()) fail("unexpected text");
        if (!std::isfinite(result)) fail("result is not finite");
        return result;
    }
private:
    double expression() {
        double value = term();
        while (true) { whitespace(); if (take('+')) value += term(); else if (take('-')) value -= term(); else break; }
        return value;
    }
    double term() {
        double value = unary();
        while (true) {
            whitespace();
            if (take('*')) value *= unary();
            else if (take('/')) { const double divisor = unary(); if (divisor == 0) fail("division by zero"); value /= divisor; }
            else if (take('%')) { const double divisor = unary(); if (divisor == 0) fail("division by zero"); value = std::fmod(value, divisor); }
            else break;
        }
        return value;
    }
    double unary() { whitespace(); if (take('+')) return unary(); if (take('-')) return -unary(); return primary(); }
    double primary() {
        whitespace();
        if (take('(')) { const double value = expression(); whitespace(); if (!take(')')) fail("missing )"); return value; }
        if (position_ < text_.size() && (std::isdigit(static_cast<unsigned char>(text_[position_])) || text_[position_] == '.')) {
            size_t used = 0; const double value = std::stod(text_.substr(position_), &used); position_ += used; return value;
        }
        const std::string name = identifier();
        if (name.empty()) fail("expected a number, input, or function");
        whitespace();
        if (!take('(')) {
            auto found = variables_.find(name); if (found == variables_.end()) fail("unknown input '" + name + "'"); return found->second;
        }
        std::vector<double> args;
        whitespace();
        if (!take(')')) {
            do { args.push_back(expression()); whitespace(); } while (take(','));
            if (!take(')')) fail("missing ) after function");
        }
        return function(name, args);
    }
    double function(const std::string& name, const std::vector<double>& a) {
        if (name == "abs" && a.size() == 1) return std::abs(a[0]);
        if (name == "sqrt" && a.size() == 1) { if (a[0] < 0) fail("sqrt requires a nonnegative value"); return std::sqrt(a[0]); }
        if (name == "floor" && a.size() == 1) return std::floor(a[0]);
        if (name == "ceil" && a.size() == 1) return std::ceil(a[0]);
        if (name == "pow" && a.size() == 2) return std::pow(a[0], a[1]);
        if (name == "clamp" && a.size() == 3) return std::max(a[1], std::min(a[2], a[0]));
        if (name == "round" && (a.size() == 1 || a.size() == 2)) { const double scale = a.size() == 2 ? std::pow(10.0, a[1]) : 1.0; return std::round(a[0] * scale) / scale; }
        if (name == "min" && !a.empty()) return *std::min_element(a.begin(), a.end());
        if (name == "max" && !a.empty()) return *std::max_element(a.begin(), a.end());
        fail("unknown function or wrong number of arguments for '" + name + "'"); return 0;
    }
    std::string identifier() { whitespace(); const size_t start = position_; while (position_ < text_.size() && (std::isalnum(static_cast<unsigned char>(text_[position_])) || text_[position_] == '_')) ++position_; return text_.substr(start, position_ - start); }
    void whitespace() { while (position_ < text_.size() && std::isspace(static_cast<unsigned char>(text_[position_]))) ++position_; }
    bool take(char ch) { if (position_ < text_.size() && text_[position_] == ch) { ++position_; return true; } return false; }
    [[noreturn]] void fail(const std::string& message) const { throw std::runtime_error("Math expression: " + message + " at position " + std::to_string(position_ + 1)); }
    std::string text_; const std::map<std::string, double>& variables_; size_t position_ = 0;
};

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
    struct MqttBroker {
        FlowService* owner = nullptr;
        std::string id;
        mosquitto* client = nullptr;
        std::atomic<bool> connected{false};
        std::string last_error;
        int qos = 0;
        std::set<std::string> subscriptions;
    };
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
        for (auto& entry : mqtt_brokers_) {
            auto& broker = *entry.second;
            if (!broker.client) continue;
            mosquitto_disconnect(broker.client);
            mosquitto_loop_stop(broker.client, true);
            mosquitto_destroy(broker.client);
            broker.client = nullptr;
        }
        mqtt_brokers_.clear();
        save_state();
    }

    json health() const {
        std::lock_guard<std::mutex> lock(mu_);
        int running = 0, failed = 0;
        for (const auto& entry : runtime_) {
            if (entry.second.status == "running") ++running;
            if (entry.second.status == "error") ++failed;
        }
        json broker_status = json::object();
        int connected_brokers = 0;
        for (const auto& entry : mqtt_brokers_) {
            const auto& broker = *entry.second;
            if (broker.connected.load()) ++connected_brokers;
            broker_status[entry.first] = {{"connected", broker.connected.load()}, {"last_error", broker.last_error}};
        }
        return {{"ok", true}, {"service", "opcbridge-flow"}, {"version", OPCBRIDGE_FLOW_VERSION},
            {"component_version", OPCBRIDGE_FLOW_VERSION}, {"suite_version", OPCBRIDGE_SUITE_VERSION},
            {"draft_flows", drafts_.size()}, {"deployed_flows", deployed_.size()},
            {"running_flows", running}, {"failed_flows", failed},
            {"mqtt", {{"configured", !mqtt_brokers_.empty()}, {"connected", connected_brokers},
                      {"brokers", broker_status}}}};
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
            combine_inputs_[id].clear();
            boolean_inputs_[id].clear();
            json_inputs_[id].clear();
            compute_inputs_[id].clear();
            rate_limit_state_[id].clear();
            trigger_generation_[id].clear();
            last_input_values_[id].clear();
        }
        clear_queued_events(id);
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
            combine_inputs_[id].clear();
            boolean_inputs_[id].clear();
            json_inputs_[id].clear();
            compute_inputs_[id].clear();
            rate_limit_state_[id].clear();
            trigger_generation_[id].clear();
        }
        clear_queued_events(id);
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
        enqueue({id, node_id, event, 0, ""});
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
                {"rejected", node.rejected}, {"last_value", node.last_value}, {"last_key", node.last_key}};
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
        static const std::set<std::string> allowed = {"opc_tag_input", "mqtt_subscribe", "manual_input", "split", "switch", "linear_map",
            "bit_operations", "combine", "boolean_logic", "build_json", "compute", "delay", "trigger", "boolean_invert", "datatype_convert", "debug", "opc_tag_write", "mqtt_publish"};
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
            if (type == "mqtt_subscribe" || type == "mqtt_publish") {
                if (trim(cfg.value("connection_id", "")).empty()) { error = type + " requires an MQTT connection"; return false; }
                if (trim(cfg.value("topic", "")).empty()) { error = type + " requires a topic"; return false; }
            }
            if (type == "linear_map") {
                const double in_min = cfg.value("input_min", 0.0), in_max = cfg.value("input_max", 100.0);
                if (in_min == in_max) { error = "Linear map input range cannot be zero"; return false; }
            }
            if (type == "bit_operations") {
                static const std::set<std::string> operations = {"and", "or", "xor", "and_not", "not", "shift_left", "shift_right",
                    "low_byte", "high_byte", "low_word", "high_word"};
                static const std::set<std::string> tests = {"nonzero", "zero", "any", "all", "equals"};
                const std::string operation = cfg.value("operation", "and");
                const std::string output_mode = cfg.value("output_mode", "result");
                const int width = cfg.value("word_size", 16);
                if (!operations.count(operation)) { error = "Unsupported bit operation"; return false; }
                if (width != 8 && width != 16 && width != 32 && width != 64) { error = "Bit operation word size must be 8, 16, 32, or 64"; return false; }
                if (operation == "high_byte" && width < 16) { error = "High byte requires a word size of at least 16 bits"; return false; }
                if (operation == "high_word" && width < 32) { error = "High word requires a word size of at least 32 bits"; return false; }
                if (output_mode != "result" && output_mode != "boolean") { error = "Unsupported bit operation output type"; return false; }
                if (output_mode == "boolean" && !tests.count(cfg.value("boolean_test", "nonzero"))) { error = "Unsupported bit operation Boolean test"; return false; }
                const bool needs_operand = operation == "and" || operation == "or" || operation == "xor" || operation == "and_not" ||
                    operation == "shift_left" || operation == "shift_right";
                if (needs_operand && !parse_bit_integer(cfg.value("operand", json("0")))) { error = "Bit operation mask/operand is invalid"; return false; }
                if (output_mode == "boolean" && cfg.value("boolean_test", "nonzero") == "equals" &&
                    !parse_bit_integer(cfg.value("comparison", json("0")))) { error = "Bit operation comparison value is invalid"; return false; }
            }
            if (type == "combine") {
                static const std::set<std::string> modes = {"two_bytes", "two_words", "four_bytes"};
                if (!modes.count(cfg.value("mode", "two_bytes"))) { error = "Unsupported Combine mode"; return false; }
            }
            if (type == "boolean_logic") {
                static const std::set<std::string> operations = {"and", "or", "xor", "and_not", "not_a_and_b"};
                if (!operations.count(cfg.value("operation", "and"))) { error = "Unsupported Boolean Logic operation"; return false; }
            }
            if (type == "build_json") {
                if (!cfg.contains("fields") || !cfg["fields"].is_array() || cfg["fields"].empty()) {
                    error = "Build JSON requires at least one field"; return false;
                }
                std::set<std::string> keys;
                for (const auto& field : cfg["fields"]) {
                    const std::string key = trim(field.value("key", ""));
                    if (key.empty()) { error = "Every Build JSON field needs a JSON key"; return false; }
                    if (!keys.insert(key).second) { error = "Build JSON keys must be unique"; return false; }
                }
            }
            if (type == "compute") {
                if (!cfg.contains("inputs") || !cfg["inputs"].is_array() || cfg["inputs"].empty()) { error = "Compute requires at least one input"; return false; }
                std::map<std::string, double> sample;
                for (const auto& input : cfg["inputs"]) {
                    const std::string name = trim(input.value("name", ""));
                    if (name.empty() || !std::isalpha(static_cast<unsigned char>(name[0])) ||
                        !std::all_of(name.begin(), name.end(), [](unsigned char ch) { return std::isalnum(ch) || ch == '_'; })) {
                        error = "Compute input names must start with a letter and contain only letters, numbers, or underscores"; return false;
                    }
                    if (!sample.emplace(name, 1.0).second) { error = "Compute input names must be unique"; return false; }
                }
                const std::string expression = trim(cfg.value("expression", ""));
                if (expression.empty()) { error = "Compute expression is required"; return false; }
                try { MathExpression(expression, sample).evaluate(); } catch (const std::exception& ex) { error = ex.what(); return false; }
            }
            if (type == "delay") {
                const std::string action = cfg.value("action", "delay_each");
                if (action != "delay_each" && action != "rate_limit") { error = "Unsupported Delay action"; return false; }
                const long long delay_ms = cfg.value("delay_ms", 1000LL);
                if (delay_ms < 0 || delay_ms > 86400000LL) { error = "Delay must be between 0 ms and 24 hours"; return false; }
            }
            if (type == "trigger") {
                const long long duration_ms = cfg.value("duration_ms", 1000LL);
                if (duration_ms < 1 || duration_ms > 86400000LL) { error = "Trigger duration must be between 1 ms and 24 hours"; return false; }
            }
            if (type == "switch" && (!cfg.contains("rules") || !cfg["rules"].is_array() || cfg["rules"].empty())) {
                error = "Switch requires at least one rule"; return false;
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

    bool enqueue_delayed(QueuedEvent event, long long due_ms) {
        {
            std::lock_guard<std::mutex> lock(queue_mu_);
            if (delayed_queue_.size() >= 10000) return false;
            delayed_queue_.emplace(due_ms, std::move(event));
        }
        cv_.notify_one();
        return true;
    }

    bool replace_trigger_timer(QueuedEvent event, long long due_ms) {
        {
            std::lock_guard<std::mutex> lock(queue_mu_);
            for (auto item = delayed_queue_.begin(); item != delayed_queue_.end();) {
                if (item->second.flow_id == event.flow_id && item->second.node_id == event.node_id &&
                    item->second.input_port.rfind("__trigger_release:", 0) == 0) item = delayed_queue_.erase(item);
                else ++item;
            }
            if (delayed_queue_.size() >= 10000) return false;
            delayed_queue_.emplace(due_ms, std::move(event));
        }
        cv_.notify_one();
        return true;
    }

    void clear_queued_events(const std::string& flow_id) {
        std::lock_guard<std::mutex> lock(queue_mu_);
        queue_.erase(std::remove_if(queue_.begin(), queue_.end(), [&](const QueuedEvent& event) { return event.flow_id == flow_id; }), queue_.end());
        for (auto item = delayed_queue_.begin(); item != delayed_queue_.end();) {
            if (item->second.flow_id == flow_id) item = delayed_queue_.erase(item);
            else ++item;
        }
    }

    void worker_loop() {
        long long last_state_save = 0;
        while (!stop_.load()) {
            poll_inputs();
            std::deque<QueuedEvent> events;
            {
                std::lock_guard<std::mutex> lock(queue_mu_);
                const long long current = now_ms();
                auto delayed = delayed_queue_.begin();
                while (delayed != delayed_queue_.end() && delayed->first <= current) {
                    queue_.push_back(std::move(delayed->second));
                    delayed = delayed_queue_.erase(delayed);
                }
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
            }
            // The first valid value is real process state, not merely a baseline.
            // Propagate it once after every deployment so stable modes and
            // setpoints initialize downstream logic. Null and bad-quality values
            // are rejected above. Subsequent events may be limited to changes.
            if (!had_baseline || changed || !cfg.value("only_on_change", true))
                enqueue({flow_id, node_id, event, 0, ""});
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
            state.messages_in++; state.last_input_ms = now_ms(); state.last_value = queued.event.value; state.last_key = queued.event.key; state.status = "running"; state.last_error.clear();
            runtime_[queued.flow_id].events_total++;
        }
        const std::string type = node.value("type", "");
        FlowEvent output = queued.event;
        bool emit = true;
        std::string error;
        const json cfg = node.value("config", json::object());
        if (type == "split") {
            emit = false;
            if (!event_writable(output, error)) {
                // Rejected below.
            } else if (!output.value.is_object() && !output.value.is_array()) {
                error = "Split input must be a JSON object or array";
            } else {
                std::vector<std::pair<std::string, json>> parts;
                if (output.value.is_object()) for (auto it = output.value.begin(); it != output.value.end(); ++it) parts.push_back({it.key(), it.value()});
                else for (size_t i = 0; i < output.value.size(); ++i) parts.push_back({std::to_string(i), output.value[i]});
                for (const auto& part : parts) {
                    if (part.second.is_null()) continue;
                    FlowEvent item = output; item.key = part.first; item.value = part.second;
                    for (const auto& edge : flow.value("edges", json::array()))
                        if (edge.value("from", "") == queued.node_id) enqueue({queued.flow_id, edge.value("to", ""), item, queued.hops + 1, edge.value("to_port", "")});
                }
                mark_node_output(queued.flow_id, queued.node_id, output, "split " + std::to_string(parts.size()) + " items");
            }
        } else if (type == "switch") {
            emit = false;
            bool matched = false;
            int index = 0;
            for (const auto& rule : cfg.value("rules", json::array())) {
                const std::string expected = trim(rule.value("value", ""));
                const bool rule_match = output.key == expected;
                if (rule_match) {
                    matched = true;
                    const std::string port = "rule_" + std::to_string(index);
                    for (const auto& edge : flow.value("edges", json::array()))
                        if (edge.value("from", "") == queued.node_id && edge.value("from_port", "rule_0") == port)
                            enqueue({queued.flow_id, edge.value("to", ""), output, queued.hops + 1, edge.value("to_port", "")});
                    if (!cfg.value("check_all", false)) break;
                }
                ++index;
            }
            if (!matched && cfg.value("otherwise", true)) {
                for (const auto& edge : flow.value("edges", json::array()))
                    if (edge.value("from", "") == queued.node_id && edge.value("from_port", "") == "otherwise")
                        enqueue({queued.flow_id, edge.value("to", ""), output, queued.hops + 1, edge.value("to_port", "")});
            }
            mark_node_output(queued.flow_id, queued.node_id, output, matched ? "matched" : "otherwise");
        } else if (type == "linear_map") {
            const auto number = as_number(output.value);
            if (!event_writable(output, error) || !number) { if (error.empty()) error = "input is not numeric"; emit = false; }
            else {
                const double in_min = cfg.value("input_min", 0.0), in_max = cfg.value("input_max", 100.0);
                const double out_min = cfg.value("output_min", 0.0), out_max = cfg.value("output_max", 100.0);
                double mapped = out_min + ((*number - in_min) / (in_max - in_min)) * (out_max - out_min);
                if (cfg.value("clamp", false)) mapped = std::max(std::min(out_min, out_max), std::min(std::max(out_min, out_max), mapped));
                output.value = mapped;
            }
        } else if (type == "bit_operations") {
            const auto input_value = parse_bit_integer(output.value);
            if (!event_writable(output, error) || !input_value) {
                if (error.empty()) error = "input must be an integer";
                emit = false;
            } else {
                const int width = cfg.value("word_size", 16);
                const uint64_t word_mask = bit_word_mask(width);
                const uint64_t input = *input_value & word_mask;
                const std::string operation = cfg.value("operation", "and");
                const auto parsed_operand = parse_bit_integer(cfg.value("operand", json("0")));
                const uint64_t operand = parsed_operand.value_or(0) & word_mask;
                uint64_t result = input;
                if (operation == "and") result = input & operand;
                else if (operation == "or") result = input | operand;
                else if (operation == "xor") result = input ^ operand;
                else if (operation == "and_not") result = input & (~operand);
                else if (operation == "not") result = ~input;
                else if (operation == "low_byte") result = input & 0xffULL;
                else if (operation == "high_byte") result = (input >> 8) & 0xffULL;
                else if (operation == "low_word") result = input & 0xffffULL;
                else if (operation == "high_word") result = (input >> 16) & 0xffffULL;
                else if (operation == "shift_left") {
                    if (operand >= static_cast<uint64_t>(width)) { error = "shift count must be smaller than the word size"; emit = false; }
                    else result = input << operand;
                } else if (operation == "shift_right") {
                    if (operand >= static_cast<uint64_t>(width)) { error = "shift count must be smaller than the word size"; emit = false; }
                    else result = input >> operand;
                }
                result &= word_mask;
                if (emit && cfg.value("output_mode", "result") == "boolean") {
                    const std::string test = cfg.value("boolean_test", "nonzero");
                    bool boolean = false;
                    if (test == "zero") boolean = result == 0;
                    else if (test == "any") boolean = (input & operand) != 0;
                    else if (test == "all") boolean = operand != 0 && (input & operand) == operand;
                    else if (test == "equals") {
                        const uint64_t comparison = parse_bit_integer(cfg.value("comparison", json("0"))).value_or(0) & word_mask;
                        boolean = result == comparison;
                    } else boolean = result != 0;
                    if (cfg.value("invert_boolean", false)) boolean = !boolean;
                    output.value = boolean;
                } else if (emit) {
                    output.value = result;
                }
            }
        } else if (type == "combine") {
            emit = false;
            const std::string mode = cfg.value("mode", "two_bytes");
            const std::vector<std::string> ports = mode == "four_bytes"
                ? std::vector<std::string>{"byte_3", "byte_2", "byte_1", "byte_0"}
                : (mode == "two_words" ? std::vector<std::string>{"high_word", "low_word"}
                                        : std::vector<std::string>{"high_byte", "low_byte"});
            if (!event_writable(output, error)) {
                // Rejected below.
            } else if (std::find(ports.begin(), ports.end(), queued.input_port) == ports.end()) {
                error = "value must arrive through a labeled Combine input";
            } else if (!parse_bit_integer(output.value)) {
                error = "Combine input must be an integer";
            } else {
                std::map<std::string, FlowEvent> retained;
                {
                    std::lock_guard<std::mutex> lock(mu_);
                    auto& inputs = combine_inputs_[queued.flow_id][queued.node_id];
                    inputs[queued.input_port] = output;
                    retained = inputs;
                }
                const bool ready = std::all_of(ports.begin(), ports.end(), [&](const std::string& port) { return retained.count(port) > 0; });
                if (!ready) {
                    set_node_status(queued.flow_id, queued.node_id, "waiting for all inputs");
                } else {
                    uint64_t result = 0;
                    if (mode == "two_bytes") {
                        result = ((parse_bit_integer(retained["high_byte"].value).value() & 0xffULL) << 8) |
                                 (parse_bit_integer(retained["low_byte"].value).value() & 0xffULL);
                    } else if (mode == "two_words") {
                        result = ((parse_bit_integer(retained["high_word"].value).value() & 0xffffULL) << 16) |
                                 (parse_bit_integer(retained["low_word"].value).value() & 0xffffULL);
                    } else {
                        result = ((parse_bit_integer(retained["byte_3"].value).value() & 0xffULL) << 24) |
                                 ((parse_bit_integer(retained["byte_2"].value).value() & 0xffULL) << 16) |
                                 ((parse_bit_integer(retained["byte_1"].value).value() & 0xffULL) << 8) |
                                  (parse_bit_integer(retained["byte_0"].value).value() & 0xffULL);
                    }
                    const int bits = mode == "two_bytes" ? 16 : 32;
                    if (cfg.value("signed_result", false) && (result & (uint64_t{1} << (bits - 1))))
                        output.value = static_cast<int64_t>(result | ~bit_word_mask(bits));
                    else output.value = result;
                    emit = true;
                }
            }
        } else if (type == "boolean_logic") {
            emit = false;
            if (!event_writable(output, error)) {
                // Rejected below.
            } else if (queued.input_port != "a" && queued.input_port != "b") {
                error = "value must arrive through Boolean input A or B";
            } else if (!as_bool(output.value)) {
                error = "Boolean Logic input must be Boolean or 0/1";
            } else {
                std::map<std::string, FlowEvent> retained;
                {
                    std::lock_guard<std::mutex> lock(mu_);
                    auto& inputs = boolean_inputs_[queued.flow_id][queued.node_id];
                    inputs[queued.input_port] = output;
                    retained = inputs;
                }
                if (!retained.count("a") || !retained.count("b")) {
                    set_node_status(queued.flow_id, queued.node_id, "waiting for A and B");
                } else {
                    const bool a = *as_bool(retained["a"].value);
                    const bool b = *as_bool(retained["b"].value);
                    const std::string operation = cfg.value("operation", "and");
                    if (operation == "or") output.value = a || b;
                    else if (operation == "xor") output.value = a != b;
                    else if (operation == "and_not") output.value = a && !b;
                    else if (operation == "not_a_and_b") output.value = !a && b;
                    else output.value = a && b;
                    output.timestamp_ms = std::max(retained["a"].timestamp_ms, retained["b"].timestamp_ms);
                    emit = true;
                }
            }
        } else if (type == "build_json") {
            emit = false;
            const json fields = cfg.value("fields", json::array());
            int port_index = -1;
            if (queued.input_port.rfind("field_", 0) == 0) {
                try { port_index = std::stoi(queued.input_port.substr(6)); } catch (...) { port_index = -1; }
            }
            if (!event_writable(output, error)) {
                // Rejected below.
            } else if (port_index < 0 || port_index >= static_cast<int>(fields.size())) {
                error = "value must arrive through a labeled Build JSON input";
            } else {
                std::map<std::string, FlowEvent> retained;
                {
                    std::lock_guard<std::mutex> lock(mu_);
                    auto& inputs = json_inputs_[queued.flow_id][queued.node_id];
                    inputs[queued.input_port] = output;
                    retained = inputs;
                }
                bool ready = true;
                json object = json::object();
                for (size_t index = 0; index < fields.size(); ++index) {
                    const std::string port = "field_" + std::to_string(index);
                    auto value = retained.find(port);
                    if (value == retained.end()) { ready = false; break; }
                    object[fields[index].value("key", "")] = value->second.value;
                }
                if (!ready) set_node_status(queued.flow_id, queued.node_id, "waiting for all fields");
                else { output.value = std::move(object); output.key.clear(); emit = true; }
            }
        } else if (type == "compute") {
            emit = false;
            const json inputs = cfg.value("inputs", json::array());
            int port_index = -1;
            if (queued.input_port.rfind("input_", 0) == 0) try { port_index = std::stoi(queued.input_port.substr(6)); } catch (...) {}
            if (!event_writable(output, error)) {
                // Rejected below.
            } else if (port_index < 0 || port_index >= static_cast<int>(inputs.size())) {
                error = "value must arrive through a labeled Compute input";
            } else if (!as_number(output.value)) {
                error = "Compute inputs must be numeric";
            } else {
                std::map<std::string, FlowEvent> retained;
                {
                    std::lock_guard<std::mutex> lock(mu_);
                    auto& values = compute_inputs_[queued.flow_id][queued.node_id]; values[queued.input_port] = output; retained = values;
                }
                std::map<std::string, double> variables;
                for (size_t index = 0; index < inputs.size(); ++index) {
                    const std::string port = "input_" + std::to_string(index);
                    auto found = retained.find(port); if (found == retained.end()) { variables.clear(); break; }
                    const auto number = as_number(found->second.value); if (!number) { error = "Compute inputs must be numeric"; break; }
                    variables[inputs[index].value("name", "")] = *number;
                }
                if (error.empty() && variables.empty()) set_node_status(queued.flow_id, queued.node_id, "waiting for all inputs");
                else if (error.empty()) {
                    try { output.value = MathExpression(cfg.value("expression", ""), variables).evaluate(); output.key.clear(); emit = true; }
                    catch (const std::exception& ex) { error = ex.what(); }
                }
            }
        } else if (type == "delay") {
            emit = false;
            const long long delay_ms = std::max(0LL, cfg.value("delay_ms", 1000LL));
            const std::string action = cfg.value("action", "delay_each");
            if (action == "rate_limit" && queued.input_port == "__rate_release") {
                {
                    std::lock_guard<std::mutex> lock(mu_);
                    auto& state = rate_limit_state_[queued.flow_id][queued.node_id];
                    output = state.latest;
                    state.scheduled = false;
                    state.next_allowed_ms = now_ms() + delay_ms;
                }
                for (const auto& edge : flow.value("edges", json::array()))
                    if (edge.value("from", "") == queued.node_id)
                        enqueue({queued.flow_id, edge.value("to", ""), output, queued.hops + 1, edge.value("to_port", "")});
                mark_node_output(queued.flow_id, queued.node_id, output, "rate limit released latest value");
            } else if (!event_writable(output, error)) {
                // Rejected below.
            } else if (action == "rate_limit") {
                bool release_now = false, schedule = false;
                long long due = 0;
                {
                    std::lock_guard<std::mutex> lock(mu_);
                    auto& state = rate_limit_state_[queued.flow_id][queued.node_id];
                    state.latest = output;
                    const long long current = now_ms();
                    if (!state.scheduled && current >= state.next_allowed_ms) {
                        release_now = true;
                        state.next_allowed_ms = current + delay_ms;
                    } else if (!state.scheduled) {
                        schedule = true; state.scheduled = true; due = state.next_allowed_ms;
                    }
                }
                if (release_now) {
                    for (const auto& edge : flow.value("edges", json::array()))
                        if (edge.value("from", "") == queued.node_id)
                            enqueue({queued.flow_id, edge.value("to", ""), output, queued.hops + 1, edge.value("to_port", "")});
                    mark_node_output(queued.flow_id, queued.node_id, output, "rate limit released value");
                } else if (schedule) {
                    if (!enqueue_delayed({queued.flow_id, queued.node_id, output, queued.hops + 1, "__rate_release"}, due))
                        error = "delayed message safety limit reached";
                    else set_node_status(queued.flow_id, queued.node_id, "waiting to release latest value");
                } else set_node_status(queued.flow_id, queued.node_id, "updated pending latest value");
            } else {
                const long long due = now_ms() + delay_ms;
                int queued_count = 0;
                for (const auto& edge : flow.value("edges", json::array())) {
                    if (edge.value("from", "") != queued.node_id) continue;
                    if (!enqueue_delayed({queued.flow_id, edge.value("to", ""), output, queued.hops + 1, edge.value("to_port", "")}, due)) {
                        error = "delayed message safety limit reached"; break;
                    }
                    ++queued_count;
                }
                set_node_status(queued.flow_id, queued.node_id, queued_count
                    ? "delaying each message " + std::to_string(delay_ms) + " ms"
                    : "no output connected");
            }
        } else if (type == "trigger") {
            emit = false;
            const long long duration_ms = std::max(1LL, cfg.value("duration_ms", 1000LL));
            auto send_value = [&](const json& value, const std::string& status) {
                FlowEvent sent = output; sent.present = !value.is_null(); sent.value = value; sent.quality = sent.present ? "good" : "bad_null"; sent.timestamp_ms = now_ms();
                for (const auto& edge : flow.value("edges", json::array()))
                    if (edge.value("from", "") == queued.node_id)
                        enqueue({queued.flow_id, edge.value("to", ""), sent, queued.hops + 1, edge.value("to_port", "")});
                mark_node_output(queued.flow_id, queued.node_id, sent, status);
            };
            if (queued.input_port.rfind("__trigger_release:", 0) == 0) {
                uint64_t generation = 0;
                try { generation = std::stoull(queued.input_port.substr(18)); } catch (...) {}
                bool current = false;
                {
                    std::lock_guard<std::mutex> lock(mu_);
                    current = trigger_generation_[queued.flow_id][queued.node_id] == generation;
                    if (current) trigger_generation_[queued.flow_id][queued.node_id] = 0;
                }
                if (current && cfg.value("send_delayed", true)) send_value(configured_flow_value(cfg.value("delayed_value", json("false"))), "trigger timeout");
                else if (current) set_node_status(queued.flow_id, queued.node_id, "trigger completed");
            } else if (!event_writable(output, error)) {
                // Rejected below.
            } else {
                const bool has_reset = cfg.value("reset_enabled", false);
                const json reset_value = configured_flow_value(cfg.value("reset_value", json("reset")));
                if (has_reset && output.value == reset_value) {
                    std::lock_guard<std::mutex> lock(mu_);
                    ++trigger_generation_[queued.flow_id][queued.node_id];
                    runtime_[queued.flow_id].nodes[queued.node_id].status = "trigger reset";
                    runtime_[queued.flow_id].nodes[queued.node_id].last_error.clear();
                } else {
                    uint64_t generation = 0;
                    bool start_timer = false;
                    {
                        std::lock_guard<std::mutex> lock(mu_);
                        uint64_t& current = trigger_generation_[queued.flow_id][queued.node_id];
                        if (cfg.value("extend_delay", true) || current == 0) { generation = ++current; start_timer = true; }
                    }
                    if (start_timer && cfg.value("send_initial", true)) send_value(configured_flow_value(cfg.value("initial_value", json("true"))), "trigger started");
                    if (start_timer && !replace_trigger_timer({queued.flow_id, queued.node_id, output, queued.hops + 1, "__trigger_release:" + std::to_string(generation)}, now_ms() + duration_ms))
                        error = "delayed message safety limit reached";
                }
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
            } else {
                const std::string connection_id = cfg.value("connection_id", "");
                auto broker_it = mqtt_brokers_.find(connection_id);
                if (broker_it == mqtt_brokers_.end()) { error = "MQTT connection not found: " + connection_id; }
                else if (!broker_it->second->connected.load()) { error = "MQTT connection is not connected: " + connection_id; }
                else {
                auto& broker = *broker_it->second;
                const std::string topic = cfg.value("topic", "");
                const std::string payload = cfg.value("payload_format", "scalar") == "json" ? output.value.dump() : scalar_text(output.value);
                const int qos = std::max(0, std::min(2, cfg.value("qos", broker.qos)));
                const int rc = mosquitto_publish(broker.client, nullptr, topic.c_str(), static_cast<int>(payload.size()), payload.data(), qos, cfg.value("retain", false));
                if (rc != MOSQ_ERR_SUCCESS) error = mosquitto_strerror(rc);
                else mark_node_output(queued.flow_id, queued.node_id, output, "publish ok");
                }
            }
        }
        if (!error.empty()) { reject_node(queued.flow_id, queued.node_id, error); return; }
        if (!emit) return;
        mark_node_output(queued.flow_id, queued.node_id, output, "ok");
        for (const auto& edge : flow.value("edges", json::array())) {
            if (edge.value("from", "") == queued.node_id) enqueue({queued.flow_id, edge.value("to", ""), output, queued.hops + 1, edge.value("to_port", "")});
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

    void set_node_status(const std::string& flow_id, const std::string& node_id, const std::string& status) {
        std::lock_guard<std::mutex> lock(mu_);
        NodeRuntime& node = runtime_[flow_id].nodes[node_id];
        node.status = status; node.last_error.clear();
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

    void clear_mqtt_connection_errors(const std::string& connection_id) {
        std::lock_guard<std::mutex> lock(mu_);
        for (const auto& flow : deployed_) {
            for (const auto& definition : flow.second.value("nodes", json::array())) {
                const std::string type = definition.value("type", "");
                if (type != "mqtt_subscribe" && type != "mqtt_publish") continue;
                if (definition.value("config", json::object()).value("connection_id", "") != connection_id) continue;
                NodeRuntime& node = runtime_[flow.first].nodes[definition.value("id", "")];
                if (node.last_error.rfind("MQTT connection is not connected:", 0) == 0 ||
                    node.last_error == "MQTT disconnected") {
                    node.last_error.clear();
                    node.status = "connected";
                }
            }
        }
    }

    void start_mqtt() {
        mosquitto_lib_init();
        if (!fs::exists(config_.connections_dir)) return;
        for (const auto& entry : fs::directory_iterator(config_.connections_dir)) {
            if (!entry.is_regular_file() || entry.path().extension() != ".json") continue;
            const json connection = read_json(entry.path().string(), json::object());
            if (connection.value("driver", "") != "mqtt" || connection.value("enabled", true) == false) continue;
            const std::string id = trim(connection.value("id", entry.path().stem().string()));
            const json cfg = connection.contains("settings") && connection["settings"].is_object() ? connection["settings"] : connection;
            const std::string host = trim(cfg.value("host", ""));
            if (id.empty() || host.empty()) continue;
            auto broker = std::make_unique<MqttBroker>();
            broker->owner = this; broker->id = id; broker->qos = std::max(0, std::min(2, cfg.value("qos", 0)));
            const std::string configured_client_id = trim(cfg.value("client_id", ""));
            const std::string client_id = configured_client_id.empty() ? "opcbridge-flow-" + id + "-" + std::to_string(now_ms()) : configured_client_id + "-flow";
            broker->client = mosquitto_new(client_id.c_str(), true, broker.get());
            if (!broker->client) { broker->last_error = "mosquitto_new failed"; mqtt_brokers_[id] = std::move(broker); continue; }
            const std::string username = cfg.value("username", ""), password = cfg.value("password", "");
            if (!username.empty()) mosquitto_username_pw_set(broker->client, username.c_str(), password.empty() ? nullptr : password.c_str());
            if (cfg.value("use_tls", false)) {
                const std::string base = fs::path(config_.connections_dir).parent_path().string();
                auto resolved = [&](const std::string& value) { return value.empty() ? value : (fs::path(value).is_absolute() ? value : (fs::path(base) / value).string()); };
                const std::string ca = resolved(cfg.value("cafile", "")), cert = resolved(cfg.value("certfile", "")), key = resolved(cfg.value("keyfile", ""));
                if (mosquitto_tls_set(broker->client, ca.empty() ? nullptr : ca.c_str(), nullptr, cert.empty() ? nullptr : cert.c_str(), key.empty() ? nullptr : key.c_str(), nullptr) != MOSQ_ERR_SUCCESS)
                    broker->last_error = "MQTT TLS configuration failed";
                mosquitto_tls_insecure_set(broker->client, cfg.value("tls_insecure", false));
            }
            mosquitto_connect_callback_set(broker->client, [](mosquitto*, void* userdata, int rc) {
                auto* broker = static_cast<MqttBroker*>(userdata); broker->connected.store(rc == 0);
                if (rc == 0) {
                    broker->last_error.clear();
                    broker->owner->clear_mqtt_connection_errors(broker->id);
                    broker->owner->refresh_mqtt_subscriptions(broker->id);
                }
                else broker->last_error = mosquitto_connack_string(rc);
            });
            mosquitto_disconnect_callback_set(broker->client, [](mosquitto*, void* userdata, int rc) {
                auto* broker = static_cast<MqttBroker*>(userdata); broker->connected.store(false); if (rc) broker->last_error = "MQTT disconnected";
            });
            mosquitto_message_callback_set(broker->client, [](mosquitto*, void* userdata, const mosquitto_message* message) {
                auto* broker = static_cast<MqttBroker*>(userdata); broker->owner->on_mqtt_message(broker->id, message);
            });
            mqtt_brokers_[id] = std::move(broker);
            auto& installed = *mqtt_brokers_[id];
            const int rc = mosquitto_connect_async(installed.client, host.c_str(), std::max(1, cfg.value("port", cfg.value("use_tls", false) ? 8883 : 1883)), 30);
            if (rc != MOSQ_ERR_SUCCESS) installed.last_error = mosquitto_strerror(rc);
            mosquitto_loop_start(installed.client);
        }
    }

    void refresh_mqtt_subscriptions(const std::string& connection_id = "") {
        if (connection_id.empty()) { for (const auto& entry : mqtt_brokers_) refresh_mqtt_subscriptions(entry.first); return; }
        auto broker_it = mqtt_brokers_.find(connection_id);
        if (broker_it == mqtt_brokers_.end() || !broker_it->second->client || !broker_it->second->connected.load()) return;
        auto& broker = *broker_it->second;
        std::set<std::string> desired;
        {
            std::lock_guard<std::mutex> lock(mu_);
            for (const auto& flow : deployed_) for (const auto& node : flow.second.value("nodes", json::array()))
                if (node.value("type", "") == "mqtt_subscribe" && node["config"].value("connection_id", "") == connection_id) desired.insert(node["config"].value("topic", ""));
        }
        for (const auto& topic : desired) {
            if (!topic.empty() && !broker.subscriptions.count(topic)) {
                if (mosquitto_subscribe(broker.client, nullptr, topic.c_str(), broker.qos) == MOSQ_ERR_SUCCESS) broker.subscriptions.insert(topic);
            }
        }
        for (auto it = broker.subscriptions.begin(); it != broker.subscriptions.end();) {
            if (!desired.count(*it)) { mosquitto_unsubscribe(broker.client, nullptr, it->c_str()); it = broker.subscriptions.erase(it); }
            else ++it;
        }
    }

    void on_mqtt_message(const std::string& connection_id, const mosquitto_message* message) {
        if (!message || !message->topic) return;
        std::vector<std::tuple<std::string, std::string, json>> targets;
        {
            std::lock_guard<std::mutex> lock(mu_);
            for (const auto& flow : deployed_) {
                if (!flow.second.value("enabled", true)) continue;
                for (const auto& node : flow.second.value("nodes", json::array())) {
                    if (node.value("type", "") != "mqtt_subscribe") continue;
                    if (node["config"].value("connection_id", "") != connection_id) continue;
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
                enqueue({std::get<0>(target), std::get<1>(target), event, 0, ""});
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
    std::map<std::string, std::map<std::string, std::map<std::string, FlowEvent>>> combine_inputs_;
    std::map<std::string, std::map<std::string, std::map<std::string, FlowEvent>>> boolean_inputs_;
    std::map<std::string, std::map<std::string, std::map<std::string, FlowEvent>>> json_inputs_;
    std::map<std::string, std::map<std::string, std::map<std::string, FlowEvent>>> compute_inputs_;
    struct RateLimitState { FlowEvent latest; bool scheduled = false; long long next_allowed_ms = 0; };
    std::map<std::string, std::map<std::string, RateLimitState>> rate_limit_state_;
    std::map<std::string, std::map<std::string, uint64_t>> trigger_generation_;
    std::deque<QueuedEvent> queue_;
    std::multimap<long long, QueuedEvent> delayed_queue_;
    std::map<std::string, std::unique_ptr<MqttBroker>> mqtt_brokers_;
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
    config.connections_dir = raw.value("connections_dir", config.connections_dir);
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
