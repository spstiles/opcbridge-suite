#include "active_sweep.h"
#include <cassert>
int main() {
    ActiveSweep sweep;
    const auto t = ActiveSweep::Clock::now();
    auto ms = [&](int n) { return t+std::chrono::milliseconds(n); };
    sweep.configure({"A", "B"}, 1, ms(0));
    sweep.completed("A", 1, ms(0), ms(5));
    sweep.completed("A", 1, ms(10), ms(15)); // A cannot stand in for B.
    assert(sweep.snapshot(ms(15))["active_sweep_ms_last"].is_null());
    sweep.completed("B", 1, ms(0), ms(20)); // Prime a whole round first.
    sweep.completed("A", 1, ms(21), ms(25));
    sweep.completed("B", 1, ms(21), ms(120));
    assert(sweep.snapshot(ms(120))["active_sweep_ms_last"] == 100.0);
    sweep.set_active("B", false, 1, ms(130));
    assert(sweep.snapshot(ms(130))["active_sweep_ms_last"].is_null());
    sweep.completed("A", 1, ms(129), ms(140)); // Former in-flight work is rejected.
    assert(sweep.snapshot(ms(140))["active_sweep_seen"] == 0);
    sweep.completed("A", 1, ms(141), ms(150));
    sweep.completed("A", 1, ms(151), ms(250));
    assert(sweep.snapshot(ms(250))["active_sweep_ms_avg_10s"] == 100.0);
    assert(sweep.snapshot(ms(11000))["active_sweep_ms_avg_10s"].is_null());
    sweep.set_active("A", false, 1, ms(260));
    assert(sweep.snapshot(ms(270))["active_sweep_state"] == "idle");
    assert(sweep.snapshot(ms(270))["active_sweep_ms_last"].is_null());
    sweep.configure({"A", "B"}, 2, ms(300));
    sweep.completed("A", 1, ms(310), ms(320)); // Old driver cannot report into a replacement.
    assert(sweep.snapshot(ms(320))["active_sweep_seen"] == 0);
    sweep.completed("A", 2, ms(310), ms(330));
    sweep.completed("B", 2, ms(310), ms(320)); // Out-of-order lane reporting uses latest finish.
    sweep.completed("A", 2, ms(331), ms(340));
    sweep.completed("B", 2, ms(331), ms(430));
    assert(sweep.snapshot(ms(430))["active_sweep_ms_last"] == 100.0);
}
