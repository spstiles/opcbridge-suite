#include "idle_connection_probe.h"
#include <cassert>
int main() {
    IdleConnectionProbe p;
    const auto t = IdleConnectionProbe::Clock::now();
    assert(!p.claim("A", t));
    p.good("A", t); p.good("B", t);
    assert(!p.claim("A", t + std::chrono::seconds(29)));
    assert(p.claim("A", t + std::chrono::seconds(30)));
    assert(!p.claim("A", t + std::chrono::seconds(30)));
    p.completed("A", false, true, t + std::chrono::seconds(30));
    assert(p.snapshot(t + std::chrono::seconds(31))["consecutive_failures"] == 0);
    assert(!p.claim("A", t + std::chrono::seconds(60)));
    assert(p.claim("B", t + std::chrono::seconds(60)));
    p.completed("B", true, false, t + std::chrono::seconds(60));
    assert(p.snapshot(t + std::chrono::seconds(61))["state"] == "available");
    for (int n = 0; n < 3; ++n) p.completed("B", false, false, t + std::chrono::seconds(90+n));
    assert(p.snapshot(t + std::chrono::seconds(93))["consecutive_failures"] == 3);
    p.good("B", t + std::chrono::seconds(94));
    assert(p.snapshot(t + std::chrono::seconds(95))["state"] == "available");
}
