#pragma once
#include "async_poll_batch.h"
#include <unordered_map>

// Owned by one polling lane. The caller keeps lifecycle/write gates held while
// requests exist, and captures a finished buffer before submitting that tag again.
class AsyncPollWindow {
public:
    using Clock = std::chrono::steady_clock;
    struct Request { Clock::time_point began, deadline; };
    explicit AsyncPollWindow(size_t limit) : capacity(limit) {}
    const size_t capacity;
    std::unordered_map<size_t, Request> pending;
    bool contains(size_t index) const { return pending.count(index) != 0; }
    size_t size() const { return pending.size(); }
    template<class Start, class Capture>
    AsyncPollBatchStats submit(size_t index, int timeoutMs, int pendingStatus,
                              int timeoutStatus, Start start, Capture capture,
                              Clock::time_point now = Clock::now()) {
        AsyncPollBatchStats stats;
        if (contains(index) || size() >= capacity) return stats;
        const auto before = Clock::now();
        const int rc = start(index);
        stats.queue_us = std::chrono::duration_cast<std::chrono::microseconds>(Clock::now()-before).count();
        stats.requests = 1;
        if (rc == pendingStatus) pending.emplace(index, Request{now, now+std::chrono::milliseconds(timeoutMs)});
        else {
            const auto captureBegan = Clock::now();
            capture(index, rc, now);
            ++stats.completed_requests;
            stats.capture_us = std::chrono::duration_cast<std::chrono::microseconds>(Clock::now()-captureBegan).count();
            stats.errors = rc < 0; stats.timeouts = rc == timeoutStatus;
        }
        return stats;
    }
    template<class Status, class Abort, class Capture>
    AsyncPollBatchStats service(int pendingStatus, int timeoutStatus, Status status,
                               Abort abort, Capture capture, bool cancelled = false,
                               Clock::time_point now = Clock::now()) {
        AsyncPollBatchStats stats;
        for (auto it=pending.begin(); it!=pending.end();) {
            const auto index=it->first;
            int rc=status(index);
            if (rc==pendingStatus && (cancelled || now>=it->second.deadline)) {
                abort(index); rc=timeoutStatus;
                stats.cancelled_requests += cancelled;
            }
            if (rc==pendingStatus) { ++it; continue; }
            const auto began=it->second.began;
            it=pending.erase(it);
            const auto captureBegan=Clock::now();
            capture(index,rc,began);
            ++stats.completed_requests;
            stats.capture_us += std::chrono::duration_cast<std::chrono::microseconds>(Clock::now()-captureBegan).count();
            stats.errors += rc<0; stats.timeouts += rc==timeoutStatus;
        }
        return stats;
    }
    template<class Abort> void cancel(size_t index, Abort abort) {
        if (pending.erase(index)) abort(index);
    }
    template<class Abort> void cancelAll(Abort abort) {
        for (const auto &entry:pending) abort(entry.first);
        pending.clear();
    }
};
