#pragma once
#include <chrono>
#include <mutex>
#include <string>
#include <vector>
#include <algorithm>
#include <unordered_set>
#include <nlohmann/json.hpp>

// A connection-wide heartbeat uses one previously successful source. It never
// creates demand or publishes a tag value. All lanes share this state.
class IdleConnectionProbe {
public:
    using Clock = std::chrono::steady_clock;
    void good(const std::string &name, Clock::time_point now = Clock::now()) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (known_.insert(name).second) candidates_.push_back(name);
        success_ = now; have_success_ = true; failures_ = 0; tag_error_ = false;
        due_ = now + std::chrono::seconds(30);
    }
    bool claim(const std::string &name, Clock::time_point now = Clock::now()) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (candidates_.empty() || candidates_.front() != name || now < due_) return false;
        due_ = now + std::chrono::seconds(30); ++reads_; return true;
    }
    void completed(const std::string &name, bool ok, bool tagError, Clock::time_point now = Clock::now()) {
        if (ok) { good(name, now); return; }
        std::lock_guard<std::mutex> lock(mutex_);
        tag_error_ = tagError;
        if (tagError) {
            failures_ = 0;
            known_.erase(name);
            candidates_.erase(std::remove(candidates_.begin(), candidates_.end(), name), candidates_.end());
        } else ++failures_;
    }
    nlohmann::json snapshot(Clock::time_point now = Clock::now()) const {
        std::lock_guard<std::mutex> lock(mutex_);
        const auto age = std::chrono::duration_cast<std::chrono::milliseconds>(now-success_).count();
        return {{"state", tag_error_ ? "tag_check_failed" : (failures_ ? "check_failed" :
                    (have_success_ && age <= 60000 ? "available" : "not_recently_checked"))},
                {"last_success_age_ms", have_success_ ? nlohmann::json(age) : nlohmann::json(nullptr)},
                {"health_check_reads", reads_}, {"consecutive_failures", failures_},
                {"interval_ms", 30000}};
    }
private:
    mutable std::mutex mutex_;
    std::vector<std::string> candidates_;
    std::unordered_set<std::string> known_;
    Clock::time_point due_{}, success_{};
    bool have_success_ = false, tag_error_ = false;
    unsigned failures_ = 0;
    uint64_t reads_ = 0;
};
