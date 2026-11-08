#pragma once

#include <chrono>
#include <cstddef>
#include <cstdint>
#include <thread>
#include <vector>

struct AsyncPollBatchStats {
    size_t requests = 0, timeouts = 0, errors = 0, cancelled_requests = 0, completed_requests = 0;
    uint64_t queue_us = 0, wait_us = 0, capture_us = 0;
};

// Queue every request before waiting. Each request has its own deadline; capture
// completed buffers immediately, while the caller holds its driver/write gates.
template<class Start, class Status, class Abort, class Capture, class Cancelled>
AsyncPollBatchStats async_poll_batch(const std::vector<size_t>& indices, int timeoutMs,
                      int pending, int timeout, Start start, Status status,
                      Abort abort, Capture capture, Cancelled cancelled) {
    using Clock = std::chrono::steady_clock;
    AsyncPollBatchStats stats;
    const auto batchBegan = Clock::now();
    auto captured = [&](size_t index, int rc, Clock::time_point began) {
        const auto before = Clock::now();
        capture(index, rc, began);
        ++stats.completed_requests;
        stats.capture_us += std::chrono::duration_cast<std::chrono::microseconds>(Clock::now()-before).count();
        if (rc < 0) ++stats.errors;
        if (rc == timeout) ++stats.timeouts;
    };
    struct Request { size_t index; Clock::time_point deadline; bool active; };
    std::vector<Request> requests;
    for (size_t index : indices) {
        if (cancelled()) break;
        const auto began = Clock::now();
        const auto queued = Clock::now();
        const int rc = start(index);
        stats.queue_us += std::chrono::duration_cast<std::chrono::microseconds>(Clock::now()-queued).count();
        ++stats.requests;
        requests.push_back({index, began + std::chrono::milliseconds(timeoutMs), rc == pending});
        if (rc != pending) captured(index, rc, began);
    }
    bool active;
    do {
        active = false;
        const bool cancel = cancelled();
        for (auto& request : requests) {
            if (!request.active) continue;
            int rc = status(request.index);
            if (rc == pending && (cancel || Clock::now() >= request.deadline)) {
                abort(request.index);
                if (cancel) ++stats.cancelled_requests;
                rc = timeout;
            }
            if (rc == pending) { active = true; continue; }
            request.active = false;
            captured(request.index, rc, request.deadline - std::chrono::milliseconds(timeoutMs));
        }
        if (active) std::this_thread::sleep_for(std::chrono::milliseconds(1));
    } while (active);
    const auto elapsed = std::chrono::duration_cast<std::chrono::microseconds>(Clock::now()-batchBegan).count();
    stats.wait_us = elapsed > static_cast<int64_t>(stats.queue_us + stats.capture_us)
        ? elapsed - stats.queue_us - stats.capture_us : 0;
    return stats;
}
