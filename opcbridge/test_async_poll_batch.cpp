#include "async_poll_batch.h"
#include <cassert>
#include <map>

int main() {
    constexpr int pending = 1, timeout = -1;
    std::vector<size_t> indices{0, 1, 2};
    std::vector<size_t> submitted, aborted;
    std::map<size_t, int> completed;
    const auto stats = async_poll_batch(indices, 3, pending, timeout,
        [&](size_t i) { submitted.push_back(i); return i == 1 ? -7 : pending; },
        [&](size_t i) {
            assert(submitted.size() == indices.size());
            return i == 0 ? 0 : pending;
        },
        [&](size_t i) { aborted.push_back(i); },
        [&](size_t i, int rc, auto) { assert(!completed.count(i)); completed[i] = rc; },
        [] { return false; });
    assert(stats.requests == 3 && stats.timeouts == 1 && stats.errors == 2);
    assert(stats.wait_us > 0);
    assert(completed.size() == 3 && completed[0] == 0 && completed[1] == -7 && completed[2] == timeout);
    assert(aborted == std::vector<size_t>{2});

    submitted.clear(); aborted.clear(); completed.clear();
    const auto cancelledStats = async_poll_batch(indices, 1000, pending, timeout,
        [&](size_t i) { submitted.push_back(i); return pending; },
        [](size_t) { return pending; },
        [&](size_t i) { aborted.push_back(i); },
        [&](size_t i, int rc, auto) { completed[i] = rc; },
        [&] { return submitted.size() >= 2; });
    assert(cancelledStats.requests == 2 && cancelledStats.cancelled_requests == 2);
    assert(cancelledStats.timeouts == 2 && cancelledStats.errors == 2);
    assert(submitted.size() == 2 && aborted.size() == 2 && completed.size() == 2);
    for (const auto& result : completed) assert(result.second == timeout);
}
