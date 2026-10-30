#pragma once

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <limits>

// All observed durations are wall time shared by the connection's polling lanes.
// Per-tag request durations overlap and must not be added to estimate a sweep.
inline int64_t estimate_poll_sweep_ms(double lastSweepMs, double recentSweepMs,
                                      double elapsedSweepMs, uint64_t seenTags,
                                      uint64_t totalTags, int maxReadsPerSec,
                                      int pollLanes) {
    if (totalTags == 0) return -1;
    double estimate = std::max(lastSweepMs, recentSweepMs);
    if (estimate <= 0.0 && elapsedSweepMs > 0.0 && seenTags > 0) {
        estimate = elapsedSweepMs * static_cast<double>(totalTags) /
            static_cast<double>(std::min(seenTags, totalTags));
    }
    // The poller applies this cap separately in each lane.
    if (maxReadsPerSec > 0) {
        const double capacity = static_cast<double>(maxReadsPerSec) * std::max(1, pollLanes);
        estimate = std::max(estimate, 1000.0 * static_cast<double>(totalTags) / capacity);
    }
    if (!(estimate > 0.0) || !std::isfinite(estimate)) return -1;
    // Leave headroom for health's grace period and three-sweep stall budget.
    const double limit = static_cast<double>(std::numeric_limits<int64_t>::max() / 4);
    return static_cast<int64_t>(std::ceil(std::min(estimate, limit)));
}
