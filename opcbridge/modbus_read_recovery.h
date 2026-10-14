#pragma once
#include <chrono>
#include <cstdint>

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

// Observe the whole connection: one bad register must not reset a healthy PLC.
struct ModbusConnectionRecovery {
    using Clock = std::chrono::steady_clock;
    uint64_t last_ok = 0;
    uint64_t last_err = 0;
    bool failing = false;
    Clock::time_point failure_since{};
    bool observe(uint64_t ok, uint64_t errors, Clock::time_point now) {
        if (ok != last_ok || errors < last_err) failing = false;
        const bool newError = errors > last_err;
        const bool newSuccess = ok != last_ok;
        last_ok = ok;
        last_err = errors;
        if (newSuccess) return false;
        if (newError && !failing) {
            failing = true;
            failure_since = now;
        }
        return failing && now - failure_since >= std::chrono::seconds(30);
    }
    void reset(Clock::time_point now) {
        failing = false;
        failure_since = now;
    }
};
