#pragma once

#include <chrono>
#include <cstddef>
#include <thread>
#include <vector>

// Queue every request before waiting. Each request has its own deadline; capture
// completed buffers immediately, while the caller holds its driver/write gates.
template<class Start, class Status, class Abort, class Capture, class Cancelled>
void async_poll_batch(const std::vector<size_t>& indices, int timeoutMs,
                      int pending, int timeout, Start start, Status status,
                      Abort abort, Capture capture, Cancelled cancelled) {
    using Clock = std::chrono::steady_clock;
    struct Request { size_t index; Clock::time_point deadline; bool active; };
    std::vector<Request> requests;
    for (size_t index : indices) {
        if (cancelled()) break;
        const auto began = Clock::now();
        const int rc = start(index);
        requests.push_back({index, began + std::chrono::milliseconds(timeoutMs), rc == pending});
        if (rc != pending) capture(index, rc, began);
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
                rc = timeout;
            }
            if (rc == pending) { active = true; continue; }
            request.active = false;
            capture(request.index, rc, request.deadline - std::chrono::milliseconds(timeoutMs));
        }
        if (active) std::this_thread::sleep_for(std::chrono::milliseconds(1));
    } while (active);
}
