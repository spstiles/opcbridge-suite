#include "poll_sweep_estimate.h"
#include <cassert>

int main() {
    // B125's concurrent tag waits must not turn a six-second sweep into minutes.
    assert(estimate_poll_sweep_ms(5938, 5758, 1000, 300, 1479, 0, 1) == 5938);
    // A slower recent window takes precedence; old startup sweeps age out upstream.
    assert(estimate_poll_sweep_ms(5900, 6200, 1000, 300, 1479, 0, 1) == 6200);
    // Before any completed sweep, project distinct-tag progress in wall time.
    assert(estimate_poll_sweep_ms(0, 0, 2000, 500, 1500, 0, 4) == 6000);
    assert(estimate_poll_sweep_ms(0, 0, 2000, 500, 1500, 0, 1) == 6000);
    // Once a sweep completes, use its actual duration, not partial progress.
    assert(estimate_poll_sweep_ms(6000, 0, 100, 1, 1500, 0, 1) == 6000);
    // Configured caps apply per lane and bound startup/steady-state estimates.
    assert(estimate_poll_sweep_ms(0, 0, 0, 0, 1000, 100, 2) == 5000);
    assert(estimate_poll_sweep_ms(1000, 1000, 0, 0, 1000, 100, 2) == 5000);
    assert(estimate_poll_sweep_ms(8000, 7000, 0, 0, 1000, 100, 2) == 8000);
    assert(estimate_poll_sweep_ms(0, 0, 0, 0, 1500, 0, 1) == -1);
    assert(estimate_poll_sweep_ms(0, 0, 2000, 0, 1500, 0, 1) == -1);
    assert(estimate_poll_sweep_ms(6000, 6000, 0, 0, 0, 0, 1) == -1);
    assert(estimate_poll_sweep_ms(5.1, 0, 0, 0, 1, 0, 1) == 6);
}
