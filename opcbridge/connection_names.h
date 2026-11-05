#pragma once
#include <nlohmann/json.hpp>
#include <filesystem>
#include <string>
#include <cctype>

inline std::string connection_name_key(std::string name) {
    const auto begin = name.find_first_not_of(" \t\r\n");
    if (begin == std::string::npos) return {};
    name = name.substr(begin, name.find_last_not_of(" \t\r\n") - begin + 1);
    for (char &c : name) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    return name;
}

inline std::string connection_friendly_name(const nlohmann::json &value) {
    const std::string description = value.value("description", std::string{});
    return connection_name_key(description).empty() ? value.value("id", std::string{}) : description;
}

// Called under the config-write lock so concurrent saves cannot claim one name.
template<class ReadJson>
std::string connection_name_conflict(const nlohmann::json &candidate,
                                    const std::filesystem::path &root,
                                    const std::filesystem::path &target,
                                    ReadJson read) {
    const auto key = connection_name_key(connection_friendly_name(candidate));
    const auto directory = root / "connections";
    if (!std::filesystem::exists(directory)) return {};
    for (const auto &entry : std::filesystem::directory_iterator(directory)) {
        const auto extension = entry.path().extension().string();
        if (!entry.is_regular_file() || (extension != ".json" && extension != ".jsonc")) continue;
        if (entry.path().lexically_normal() == (root / target).lexically_normal()) continue;
        const auto other = read(entry.path().string());
        // A legacy file may be moving to its canonical path for the same connection.
        if (other.value("id", std::string{}) == candidate.value("id", std::string{})) continue;
        if (!key.empty() && key == connection_name_key(connection_friendly_name(other)))
            return "Connection name '" + connection_friendly_name(candidate) + "' is already in use. Choose a unique connection name.";
    }
    return {};
}
