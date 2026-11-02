#pragma once
#include <chrono>
#include <cstdint>
#include <cmath>

struct PollReadStamp {
    using Clock = std::chrono::steady_clock;
    Clock::time_point started{}, completed{};
    uint64_t source_epoch = 0;
    bool satisfies_age(Clock::time_point requested, double maxAgeMs, bool good,
                       Clock::time_point now, uint64_t expectedEpoch) const {
        if (!std::isfinite(maxAgeMs) || maxAgeMs < 0 || source_epoch != expectedEpoch ||
            !good || started == Clock::time_point{} || completed < started || completed > now) return false;
        if (maxAgeMs == 0) return started >= requested;
        return std::chrono::duration<double, std::milli>(now - completed).count() <= maxAgeMs;
    }
    bool satisfies(Clock::time_point requested, std::chrono::milliseconds maxAge,
                   bool good, Clock::time_point now = Clock::now(), uint64_t expectedEpoch = 0) const {
        return satisfies_age(requested, static_cast<double>(maxAge.count()), good, now, expectedEpoch);
    }
};
