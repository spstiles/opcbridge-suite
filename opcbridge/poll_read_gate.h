#pragma once
#include "read_freshness.h"

// Runtime-lock protected by its owner. A resume/replacement starts a new read
// boundary; a completion from before that boundary can never restore GOOD.
class PollReadGate {
public:
    enum class Quality { Waiting, Inactive, Bad, Good };
    void restart(uint64_t epoch, PollReadStamp::Clock::time_point now = PollReadStamp::Clock::now()) {
        epoch_ = epoch; after_ = now; active_ = true;
    }
    bool is_active() const { return active_; }
    void suspend() { active_ = false; }
    void resume(PollReadStamp::Clock::time_point now = PollReadStamp::Clock::now()) {
        if (!active_) { active_ = true; after_ = now; }
    }
    Quality quality(const PollReadStamp &stamp, bool good,
                    PollReadStamp::Clock::time_point now = PollReadStamp::Clock::now()) const {
        if (!active_) return Quality::Inactive;
        if (!good) return Quality::Bad;
        return stamp.satisfies_age(after_, 0, true, now, epoch_) ? Quality::Good : Quality::Waiting;
    }
private:
    uint64_t epoch_ = 0;
    PollReadStamp::Clock::time_point after_{};
    bool active_ = true;
};
