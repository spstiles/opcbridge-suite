#pragma once

#include <chrono>
#include <cstdint>

class EthernetIpRecovery {
public:
    using Clock = std::chrono::steady_clock;

    bool observe(uint64_t successes, uint64_t errors, Clock::time_point now) {
        const bool countersReset = successes < lastSuccesses || errors < lastErrors;
        const bool succeeded = successes != lastSuccesses;
        const bool failed = errors > lastErrors;
        lastSuccesses = successes;
        lastErrors = errors;

        if (countersReset || succeeded ||
            (failing && now - lastFailure > std::chrono::seconds(15))) failing = false;
        if (countersReset || succeeded || !failed) return false;
        lastFailure = now;
        if (!failing) {
            failing = true;
            failureSince = now;
        }
        return now >= retryAfter && now - failureSince >= std::chrono::seconds(30);
    }

    void recoveredTransport(Clock::time_point now) {
        failing = false;
        retryAfter = now + std::chrono::minutes(2);
    }

private:
    uint64_t lastSuccesses = 0;
    uint64_t lastErrors = 0;
    bool failing = false;
    Clock::time_point failureSince{};
    Clock::time_point lastFailure{};
    Clock::time_point retryAfter{};
};
