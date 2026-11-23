#pragma once

#include <algorithm>
#include <cstdint>

// A fresh failed snapshot still represents an outage. Use the last successful
// read, or the first error for a connection that has never read successfully.
inline bool poll_health_sustained_failure(int64_t now, int64_t lastSuccess,
        int64_t firstError, int64_t freshnessBudget, int goodRecent,
        bool intentionallyIdle, bool communicationVerified) {
    if (goodRecent > 0 || intentionallyIdle || communicationVerified) return false;
    const auto since = lastSuccess >= 0 ? lastSuccess : firstError;
    return since >= 0 && now >= since &&
        now - since >= std::max<int64_t>(120000, freshnessBudget);
}
