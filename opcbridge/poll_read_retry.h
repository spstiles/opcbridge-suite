#pragma once
#include <algorithm>
#include <chrono>

// Failed tags retry independently, leaving healthy tags on their requested scan.
struct PollReadRetry {
    using Clock = std::chrono::steady_clock;
    unsigned failures = 0;
    Clock::time_point retry_after{};
    bool ready(Clock::time_point now) const { return now >= retry_after; }
    void completed(bool success, Clock::time_point now) {
        if (success) { failures = 0; retry_after = {}; return; }
        failures = std::min(6u, failures + 1);
        retry_after = now + std::chrono::seconds(std::min(30u, 1u << (failures - 1)));
    }
};
