#pragma once
#include <chrono>
#include <cstdint>
#include <mutex>
#include <set>
#include <string>
#include <deque>
#include <nlohmann/json.hpp>

// One connection, shared by every lane. Boundaries require read starts after
// the boundary, so in-flight results from a former workload cannot complete it.
class ActiveSweep {
public:
    using Clock = std::chrono::steady_clock;
    void configure(std::set<std::string> names, uint64_t epoch, Clock::time_point now = Clock::now()) {
        std::lock_guard<std::mutex> lock(mutex_);
        epoch_ = epoch; active_ = std::move(names); reset(now);
    }
    void set_active(const std::string &name, bool active, uint64_t epoch, Clock::time_point now = Clock::now()) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (epoch != epoch_) return;
        const bool changed = active ? active_.insert(name).second : active_.erase(name) != 0;
        if (changed) reset(now);
    }
    void completed(const std::string &name, uint64_t epoch, Clock::time_point started, Clock::time_point finished) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (epoch != epoch_ || !active_.count(name) || started < boundary_ || finished < started) return;
        if (finished > latest_) latest_ = finished;
        seen_.insert(name);
        if (seen_.size() != active_.size()) return;
        finished = latest_;
        if (primed_) {
            last_ms_ = std::chrono::duration<double, std::milli>(finished-boundary_).count();
            samples_.emplace_back(finished, last_ms_); samples_last_=finished; ++cycles_;
        }
        primed_ = true; boundary_ = finished; seen_.clear();
        while (!samples_.empty() && finished-samples_.front().first > std::chrono::seconds(60)) samples_.pop_front();
    }
    nlohmann::json snapshot(Clock::time_point now = Clock::now()) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto average = [&](int seconds) -> nlohmann::json {
            double sum = 0; size_t count = 0;
            for (const auto &sample : samples_) if (now-sample.first <= std::chrono::seconds(seconds)) { sum+=sample.second; ++count; }
            return count ? nlohmann::json(sum/count) : nlohmann::json(nullptr);
        };
        return {{"active_sweep_state", active_.empty() ? "idle" : (cycles_ ? "measuring" : "warming_up")},
            {"active_sweep_ms_last", cycles_ ? nlohmann::json(last_ms_) : nlohmann::json(nullptr)},
            {"active_sweep_ms_avg_10s", average(10)}, {"active_sweep_ms_avg_60s", average(60)},
            {"active_sweep_last_age_ms", cycles_ ? nlohmann::json(std::chrono::duration<double,std::milli>(now-samples_last_).count()) : nlohmann::json(nullptr)},
            {"active_sweep_completed", cycles_}, {"active_sweep_work", active_.size()},
            {"active_sweep_seen", seen_.size()}};
    }
private:
    void reset(Clock::time_point now) { boundary_=now; latest_=now; seen_.clear(); samples_.clear(); primed_=false; cycles_=0; last_ms_=0; }
    mutable std::mutex mutex_;
    std::set<std::string> active_, seen_;
    uint64_t epoch_=0, cycles_=0;
    bool primed_=false;
    double last_ms_=0;
    Clock::time_point boundary_{}, latest_{}, samples_last_{};
    std::deque<std::pair<Clock::time_point,double>> samples_;
};
