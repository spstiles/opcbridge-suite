#pragma once
#include <nlohmann/json.hpp>
#include <string>
#include <stdexcept>

struct AlarmStatusSource {
    std::string host = "127.0.0.1";
    int port = 8085;
    std::string scheme = "http";
    std::string key() const { return (scheme == "https" ? "https://" : "") + host + ":" + std::to_string(port); }
};
// Configure Server owns the shared alarm endpoint.
inline AlarmStatusSource alarm_status_source(const nlohmann::json &config) {
    AlarmStatusSource source;
    const auto alarms = config.value("alarms", nlohmann::json::object());
    source.host = alarms.value("host", std::string{});
    if (source.host.empty()) source.host = "127.0.0.1";
    source.scheme = alarms.value("scheme", std::string{"http"});
    if (source.scheme != "http" && source.scheme != "https") throw std::runtime_error("Invalid alarm scheme");
    source.port = alarms.value("port", alarms.value("httpPort", 8085));
    if (source.port == 0) source.port = 8085;
    if (source.port < 1 || source.port > 65535) throw std::runtime_error("Invalid alarm HTTP port");
    return source;
}
