#include "poll_diagnostics.h"
#include <cassert>
#include <thread>
#include <vector>
int main() {
    PollDiagnostics diagnostics;
    std::vector<std::thread> lanes;
    for (int i=0; i<2; ++i) lanes.emplace_back([&] {
        for (int n=0; n<1000; ++n) diagnostics.lock_wait.record(250);
    });
    for (auto &lane:lanes) lane.join();
    auto snapshot = diagnostics.snapshot();
    assert(snapshot["lock_wait"]["count"] == 2000);
    assert(snapshot["lock_wait"]["total_ms"] == 500.0);
    assert(snapshot["lock_wait"]["avg_ms"] == 0.25);
    assert(snapshot["lock_wait"]["max_ms"] == 0.25);
    assert(snapshot["batch_size_avg"] == 0.0);
    diagnostics.batches = 2; diagnostics.requests = 150;
    assert(diagnostics.snapshot()["batch_size_avg"] == 75.0);
    {
        PollTimingScope scope(&diagnostics.result_processing);
        scope.finish();
    }
    assert(diagnostics.result_processing.count == 1); // Explicit finish doesn't double-count.
    PollTimingScope disabled(nullptr);
}
