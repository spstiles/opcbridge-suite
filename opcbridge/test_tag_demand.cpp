#include "tag_demand.h"
#include <cassert>
#include <thread>
#include <vector>
int main() {
    TagDemandObservations d;
    using Clock = TagDemandObservations::Clock;
    const auto now = Clock::now();
    d.monitored("Tags/C/T", 1, 1, 2, 100, false);
    d.monitored("Tags/C/T", 2, 1, 1, 200, false);
    auto s = d.snapshot().at("Tags/C/T");
    assert(s.monitored_items == 2 && s.active_monitored_items == 2 && s.min_sampling_interval_ms == 100);
    d.monitored("Tags/C/T", 1, 1, 0, 100, false);
    s = d.snapshot().at("Tags/C/T");
    assert(s.monitored_items == 2 && s.active_monitored_items == 1 && s.min_sampling_interval_ms == 200);
    d.monitored("Tags/C/T", 2, 1, 1, 50, false);
    assert(d.snapshot().at("Tags/C/T").min_sampling_interval_ms == 50);
    d.monitored("Tags/C/T", 2, 1, 1, -1, false);
    assert(d.snapshot().at("Tags/C/T").inherited_sampling_items == 1);
    d.monitored("Tags/C/T", 2, 1, 1, 50, true);
    assert(d.snapshot().at("Tags/C/T").active_monitored_items == 0);
    d.clear_monitored(); assert(d.snapshot().empty());
    d.http_read("Tags/C/T", now);
    d.ua_read("Tags/C/T", true, now);
    d.ua_read("Tags/C/T", false, now + std::chrono::seconds(20));
    s = d.snapshot(now + std::chrono::seconds(31)).at("Tags/C/T");
    assert(s.ua_read_until > now + std::chrono::seconds(31));
    assert(s.ua_fresh_until < now + std::chrono::seconds(31));
    assert(d.snapshot(now + std::chrono::seconds(51)).empty());
    std::vector<std::thread> threads;
    for (unsigned i = 0; i < 4; ++i) threads.emplace_back([&, i] {
        for (unsigned j = 0; j < 1000; ++j) {
            d.monitored("shared", i, j, 2, 100, false);
            d.monitored("shared", i, j, 0, 100, true);
        }
    });
    for (auto &t : threads) t.join();
    assert(d.snapshot().empty());
}
