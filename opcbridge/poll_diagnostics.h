#pragma once
#include <atomic>
#include <chrono>
#include <cstdint>
#include <nlohmann/json.hpp>

struct PollTiming {
    std::atomic<uint64_t> count{0}, total_us{0}, max_us{0};
    void record(uint64_t us) {
        total_us.fetch_add(us, std::memory_order_relaxed);
        count.fetch_add(1, std::memory_order_relaxed);
        auto previous = max_us.load(std::memory_order_relaxed);
        while (previous < us && !max_us.compare_exchange_weak(previous, us, std::memory_order_relaxed)) {}
    }
    nlohmann::json snapshot() const {
        const auto n = count.load(std::memory_order_relaxed);
        const auto total = total_us.load(std::memory_order_relaxed);
        return {{"count", n}, {"total_ms", total / 1000.0},
                {"avg_ms", n ? total / 1000.0 / n : 0.0},
                {"max_ms", max_us.load(std::memory_order_relaxed) / 1000.0}};
    }
};
struct PollTimingScope {
    using Clock = std::chrono::steady_clock;
    PollTiming* target;
    Clock::time_point began = Clock::now();
    explicit PollTimingScope(PollTiming* value) : target(value) {}
    void finish() {
        if (!target) return;
        target->record(std::chrono::duration_cast<std::chrono::microseconds>(Clock::now()-began).count());
        target = nullptr;
    }
    ~PollTimingScope() { finish(); }
    PollTimingScope(const PollTimingScope&) = delete;
    PollTimingScope& operator=(const PollTimingScope&) = delete;
};
struct PollDiagnostics {
    PollTiming request_elapsed, lock_wait, handle_open, batch_select, batch_queue, batch_wait, batch_capture, result_processing;
    std::atomic<uint64_t> batches{0}, requests{0}, timeouts{0}, errors{0}, cancelled_requests{0};
    nlohmann::json snapshot() const {
        const auto n = batches.load(std::memory_order_relaxed);
        const auto r = requests.load(std::memory_order_relaxed);
        return {{"request_elapsed",request_elapsed.snapshot()}, {"lock_wait",lock_wait.snapshot()}, {"handle_open",handle_open.snapshot()},
                {"batch_select",batch_select.snapshot()}, {"batch_queue",batch_queue.snapshot()},
                {"batch_wait",batch_wait.snapshot()}, {"batch_capture",batch_capture.snapshot()},
                {"result_processing",result_processing.snapshot()}, {"batches",n}, {"requests",r},
                {"batch_size_avg", n ? double(r)/n : 0.0},
                {"timeouts",timeouts.load(std::memory_order_relaxed)},
                {"errors",errors.load(std::memory_order_relaxed)},
                {"cancelled_requests",cancelled_requests.load(std::memory_order_relaxed)}};
    }
};
