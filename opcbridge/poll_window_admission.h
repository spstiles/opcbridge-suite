#pragma once
#include <chrono>
#include <cstddef>
#include <vector>

inline bool poll_window_paused(size_t pending, size_t limit, bool ownsGate,
                               std::chrono::steady_clock::time_point began,
                               std::chrono::steady_clock::time_point now, int timeoutMs) {
    return ownsGate && (pending >= limit ||
        now-began >= std::chrono::milliseconds(timeoutMs));
}

// One rotating pass per admission group, instead of restarting at tag zero.
template<class Eligible>
std::vector<size_t> poll_window_candidates(size_t requested, size_t count,
                                          size_t slots, size_t &cursor, Eligible eligible) {
    if (!slots || !count) return {};
    std::vector<size_t> indices{requested};
    for (size_t checked=0; checked<count && indices.size()<slots; ++checked) {
        const size_t index=cursor % count;
        cursor=(index+1)%count;
        if (index!=requested && eligible(index)) indices.push_back(index);
    }
    return indices;
}
