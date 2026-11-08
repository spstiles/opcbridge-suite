#include "poll_read_retry.h"
#include <cassert>
int main() {
    using namespace std::chrono;
    auto now = PollReadRetry::Clock::now();
    PollReadRetry bad, healthy;
    for (int delay : {1, 2, 4, 8, 16, 30, 30, 30}) {
        assert(bad.ready(now));
        bad.completed(false, now);
        assert(!bad.ready(now + seconds(delay) - milliseconds(1)));
        assert(bad.ready(now + seconds(delay)));
        assert(healthy.ready(now)); // Another tag is never delayed.
        now += seconds(delay);
    }
    bad.completed(true, now);
    assert(bad.ready(now) && bad.failures == 0);
    bad.completed(false, now);
    assert(bad.ready(now + seconds(1))); // Recovery resets backoff.
}
