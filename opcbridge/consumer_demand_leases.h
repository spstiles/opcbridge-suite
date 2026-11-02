#pragma once
#include "consumer_demand.h"
#include <chrono>
#include <map>
#include <mutex>

// HTTP consumers renew independently of their job/read interval. Observation only.
class ConsumerDemandLeases {
public:
    using Clock = std::chrono::steady_clock;
    bool apply(nlohmann::json message, bool release, Clock::time_point now = Clock::now()) {
        if (!message.is_object() || !message.contains("client_id") || !message["client_id"].is_string()) return false;
        const auto client = message["client_id"].get<std::string>();
        if (client.empty() || client.size() > 128) return false;
        message["type"] = release ? "release_demand" : "register_demand";
        ConsumerDemand validated;
        if (!validated.apply(message)) return false;
        const auto owner = message["owner"].get<std::string>();
        std::lock_guard<std::mutex> lock(mutex_);
        prune(now);
        const auto key = std::make_pair(client, owner);
        if (release) entries_.erase(key);
        else entries_[key] = {validated.owners().at(owner), now + std::chrono::seconds(60)};
        return true;
    }
    void append(nlohmann::json &owners, Clock::time_point now = Clock::now()) {
        std::lock_guard<std::mutex> lock(mutex_);
        prune(now);
        for (const auto &entry : entries_) merge_consumer_scope(owners, entry.first.second, entry.second.scope);
    }
private:
    struct Entry { ConsumerDemand::Scope scope; Clock::time_point until; };
    void prune(Clock::time_point now) {
        for (auto it = entries_.begin(); it != entries_.end();)
            if (it->second.until <= now) it = entries_.erase(it); else ++it;
    }
    std::mutex mutex_;
    std::map<std::pair<std::string, std::string>, Entry> entries_;
};
