#pragma once
#include <chrono>
#include <string>
#include <unordered_map>

// Retry only explicit cold-cache states; ordinary faults keep their normal interval.
class SnapshotLifecycleRetry {
    using Clock = std::chrono::steady_clock;
    std::unordered_map<std::string, Clock::time_point> started_;
public:
    bool retry(const std::string& key, bool cold, Clock::time_point now = Clock::now()) {
        if (!cold) { started_.erase(key); return false; }
        const auto inserted = started_.emplace(key, now);
        return now - inserted.first->second < std::chrono::seconds(5);
    }
    void clear() { started_.clear(); }
};
