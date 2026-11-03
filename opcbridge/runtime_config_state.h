#pragma once
#include <nlohmann/json.hpp>
#include <filesystem>
#include <map>
#include <mutex>
#include <string>

// Compare saved configuration with the snapshot captured BEFORE a successful
// load. Saves made during a reload must remain pending after it completes.
class RuntimeConfigState {
public:
    using Files = std::map<std::string, nlohmann::json>;
    struct Snapshot {
        Files files;
        std::string error;
    };

    template<class ReadJson>
    static Snapshot capture(const std::filesystem::path &root, ReadJson read) {
        Snapshot result;
        try {
            for (const auto *directory : {"connections", "tags"}) {
                const auto dir = root / directory;
                if (!std::filesystem::exists(dir)) continue;
                for (const auto &entry : std::filesystem::directory_iterator(dir)) {
                    const auto ext = entry.path().extension();
                    if (!entry.is_regular_file() || (ext != ".json" &&
                        !(std::string(directory) == "tags" && ext == ".jsonc"))) continue;
                    result.files[std::string(directory) + "/" + entry.path().filename().string()] = read(entry.path().string());
                }
            }
        } catch (const std::exception &) {
            result.error = "Could not read saved connection/tag configuration.";
        }
        return result;
    }

    void applied(const Snapshot &loaded, const std::string &connection = {}) {
        if (!loaded.error.empty()) return;
        std::lock_guard<std::mutex> lock(mutex_);
        if (connection.empty()) {
            applied_ = loaded.files;
            initialized_ = true;
            return;
        }
        auto belongs = [&](const auto &entry) {
            const char *key = entry.first.rfind("connections/", 0) == 0 ? "id" : "connection_id";
            return entry.second.is_object() && entry.second.contains(key) &&
                entry.second[key].is_string() && entry.second[key] == connection;
        };
        for (auto it = applied_.begin(); it != applied_.end();) {
            if (belongs(*it)) it = applied_.erase(it); else ++it;
        }
        for (const auto &entry : loaded.files) if (belongs(entry)) applied_.insert(entry);
    }

    bool pending(const Snapshot &saved) const {
        std::lock_guard<std::mutex> lock(mutex_);
        return !initialized_ || !saved.error.empty() || saved.files != applied_;
    }

private:
    mutable std::mutex mutex_;
    Files applied_;
    bool initialized_ = false;
};
