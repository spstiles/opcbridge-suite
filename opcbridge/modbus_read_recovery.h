#pragma once
#include <chrono>

// A failed libplctag status describes the last operation, not permission to
// start the next one. Keep failed reads bounded without latching that status.
struct ModbusReadRecovery {
    using Clock = std::chrono::steady_clock;
    Clock::time_point retry_after{};
    bool ready(Clock::time_point now) const { return now >= retry_after; }
    void completed(bool success, Clock::time_point now) {
        retry_after = success ? Clock::time_point{} : now + std::chrono::seconds(1);
    }
};
