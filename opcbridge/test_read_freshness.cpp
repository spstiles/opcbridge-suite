#include "read_freshness.h"
#include <cassert>
int main() {
    using Clock = PollReadStamp::Clock;
    using namespace std::chrono;
    const auto requested = Clock::time_point(seconds(100));
    const auto now = requested + milliseconds(100);
    assert(!PollReadStamp{}.satisfies(requested, milliseconds(0), true, now));
    PollReadStamp old{requested - milliseconds(100), requested - milliseconds(50)};
    assert(!old.satisfies(requested, milliseconds(0), true, now));
    assert(old.satisfies(requested, milliseconds(200), true, now));
    assert(!old.satisfies(requested, milliseconds(149), true, now));
    PollReadStamp inflight{requested - milliseconds(1), now};
    assert(!inflight.satisfies(requested, milliseconds(0), true, now));
    PollReadStamp fresh{requested + milliseconds(1), now};
    assert(fresh.satisfies(requested, milliseconds(0), true, now));
    assert(fresh.satisfies_age(requested, 1e100, true, now, 0));
    assert(!fresh.satisfies_age(requested, std::nan(""), true, now, 0));
    fresh.source_epoch = 9;
    assert(!fresh.satisfies(requested, milliseconds(0), true, now, 10));
    assert(fresh.satisfies(requested, milliseconds(0), true, now, 9));
    fresh.source_epoch = 0;
    assert(!fresh.satisfies(requested, milliseconds(0), false, now));
    assert(!fresh.satisfies(requested, milliseconds(0), true, requested));
    assert((!PollReadStamp{now, requested}.satisfies(requested, milliseconds(0), true, now)));
}
