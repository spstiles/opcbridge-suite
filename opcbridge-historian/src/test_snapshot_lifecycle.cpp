#include "snapshot_lifecycle.h"
#include <cassert>
int main() {
    SnapshotLifecycleRetry retry;
    const auto start = std::chrono::steady_clock::now();
    assert(retry.retry("a", true, start));
    assert(retry.retry("a", true, start + std::chrono::milliseconds(4999)));
    assert(!retry.retry("a", true, start + std::chrono::seconds(5)));
    assert(!retry.retry("a", true, start + std::chrono::seconds(10)));
    assert(retry.retry("b", true, start + std::chrono::seconds(10)));
    assert(!retry.retry("a", false, start + std::chrono::seconds(10)));
    assert(retry.retry("a", true, start + std::chrono::seconds(11)));
    retry.clear();
    assert(retry.retry("b", true, start + std::chrono::seconds(20)));
}
