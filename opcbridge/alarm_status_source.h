#pragma once
#include <nlohmann/json.hpp>
#include <string>
#include <stdexcept>

struct AlarmStatusSource {
    std::string host = "127.0.0.1";
    int port = 8085;
    std::string key() const { return host + ":" + std::to_string(port); }
};
// Match the HMI alarm proxy's alarms.host -> opcbridge.host -> localhost fallback.
inline AlarmStatusSource alarm_status_source(const nlohmann::json &config) {
    AlarmStatusSource source;
    const auto alarms = config.value("alarms", nlohmann::json::object());
    const auto bridge = config.value("opcbridge", nlohmann::json::object());
    source.host = alarms.value("host", std::string{});
    if (source.host.empty()) source.host = bridge.value("host", std::string{"127.0.0.1"});
    if (source.host.empty()) source.host = "127.0.0.1";
    source.port = alarms.value("httpPort", 8085);
    if (source.port == 0) source.port = 8085;
    if (source.port < 1 || source.port > 65535) throw std::runtime_error("Invalid alarm HTTP port");
    return source;
}
