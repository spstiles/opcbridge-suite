#pragma once
#include <memory>
#include <mutex>
#include <vector>

// Retain the exact consumer configuration for the lifetime of an execution.
// Caller serializes retain + config capture with config replacement/snapshot.
// Releasing the returned pointer automatically ends the execution's demand.
template <typename Config>
class ExecutionDemand {
public:
    std::shared_ptr<const Config> retain(const Config &config) {
        auto copy = std::make_shared<const Config>(config);
        std::lock_guard<std::mutex> lock(mutex_);
        prune();
        running_.push_back(copy);
        return copy;
    }
    std::vector<Config> snapshot() {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<Config> result;
        for (auto it = running_.begin(); it != running_.end();) {
            if (auto config = it->lock()) {
                result.push_back(*config);
                ++it;
            } else it = running_.erase(it);
        }
        return result;
    }
private:
    void prune() {
        for (auto it = running_.begin(); it != running_.end();)
            if (it->expired()) it = running_.erase(it);
            else ++it;
    }
    std::mutex mutex_;
    std::vector<std::weak_ptr<const Config>> running_;
};
