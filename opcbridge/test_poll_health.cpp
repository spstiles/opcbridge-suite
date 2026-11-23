#include "poll_health.h"

#include <cassert>

int main() {
    constexpr int64_t start = 1000000;
    constexpr int64_t threeDays = 3 * 24 * 60 * 60 * 1000;
    assert(!poll_health_sustained_failure(start + 119999, start, -1, 15000, 0, false, false));
    assert(poll_health_sustained_failure(start + 120000, start, -1, 15000, 0, false, false));
    assert(poll_health_sustained_failure(start + threeDays, start, -1, 15000, 0, false, false));
    assert(!poll_health_sustained_failure(start + 5000, -1, start, 15000, 0, false, false));
    assert(poll_health_sustained_failure(start + 120000, -1, start, 15000, 0, false, false));
    assert(!poll_health_sustained_failure(start + threeDays, -1, -1, 15000, 0, false, false));
    assert(!poll_health_sustained_failure(start + 120000, start, -1, 180000, 0, false, false));
    assert(!poll_health_sustained_failure(start + threeDays, start, -1, 15000, 1, false, false));
    assert(!poll_health_sustained_failure(start + threeDays, start, -1, 15000, 0, true, false));
    assert(!poll_health_sustained_failure(start + threeDays, start, -1, 15000, 0, false, true));
}
