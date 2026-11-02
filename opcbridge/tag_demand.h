#pragma once
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <map>
#include <mutex>
#include <string>
#include <unordered_map>

class TagDemandObservations {
public:
    using Clock = std::chrono::steady_clock;
    struct Entry {
        size_t monitored_items = 0, active_monitored_items = 0, inherited_sampling_items = 0;
        double min_sampling_interval_ms = -1;
        Clock::time_point http_until{}, ua_read_until{}, ua_fresh_until{};
    };
    void monitored(const std::string &node, uint32_t subscription, uint32_t item,
                   unsigned mode, double interval, bool removed) {
        std::lock_guard<std::mutex> lock(mutex_);
        const auto key = std::make_pair(subscription, item);
        if (removed) items_.erase(key);
        else items_[key] = {node, mode, interval};
    }
    void http_read(const std::string &node, Clock::time_point now = Clock::now()) {
        std::lock_guard<std::mutex> lock(mutex_);
        entries_[node].http_until = now + std::chrono::seconds(30);
    }
    void ua_read(const std::string &node, bool fresh, Clock::time_point now = Clock::now()) {
        std::lock_guard<std::mutex> lock(mutex_);
        entries_[node].ua_read_until = now + std::chrono::seconds(30);
        if (fresh) entries_[node].ua_fresh_until = now + std::chrono::seconds(30);
    }
    std::unordered_map<std::string, Entry> snapshot(Clock::time_point now = Clock::now()) {
        std::lock_guard<std::mutex> lock(mutex_);
        for (auto it = entries_.begin(); it != entries_.end();) {
            if (it->second.http_until <= now && it->second.ua_read_until <= now) it = entries_.erase(it);
            else ++it;
        }
        auto result = entries_;
        for (const auto &entry : items_) {
            auto &node = result[entry.second.node];
            ++node.monitored_items;
            if (!entry.second.mode) continue;
            ++node.active_monitored_items;
            const double interval = entry.second.interval;
            if (interval < 0) ++node.inherited_sampling_items;
            else if (node.min_sampling_interval_ms < 0 || interval < node.min_sampling_interval_ms)
                node.min_sampling_interval_ms = interval;
        }
        return result;
    }
    void clear_monitored() {
        std::lock_guard<std::mutex> lock(mutex_);
        items_.clear();
    }
private:
    struct Item { std::string node; unsigned mode; double interval; };
    std::mutex mutex_;
    std::unordered_map<std::string, Entry> entries_;
    std::map<std::pair<uint32_t, uint32_t>, Item> items_;
};
