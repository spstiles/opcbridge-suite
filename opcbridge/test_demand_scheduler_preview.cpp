#include "demand_scheduler_preview.h"
#include <cassert>
#include <iostream>
int main() {
    using P = DemandSchedulerPreview;
    using json = nlohmann::json;
    const auto start = P::Clock::now();
    P preview(P::Ms(100), P::Ms(50), P::Ms(25));
    auto row = [](const char *name, bool observed = false) {
        return json{{"connection_id", "PLC"}, {"name", name}, {"enabled", true},
            {"poll_work", true}, {"driver_epoch", 1}, {"observed_demand", observed},
            {"driver", "ab_eip"}, {"writable", false}};
    };
    json demand{{"tags", json::array({row("Idle"), row("Active", true), row("Writable"), row("Other")})}};
    demand["tags"][2]["writable"] = true;
    demand["tags"][3]["driver"] = "modbus_tcp";
    demand["tags"].push_back(row("Alias")); demand["tags"].back()["poll_work"] = false;
    demand["tags"].push_back(row("Disabled")); demand["tags"].back()["enabled"] = false;
    assert(preview.snapshot("", true, start)["stale"]);
    auto at = [&](int ms) { preview.refresh(demand, start + P::Ms(ms)); return preview.snapshot("", true, start + P::Ms(ms)); };
    auto first = at(0);
    assert(first["tags"].size() == 4 && first["tags"][0]["reason"] == "startup_grace");
    auto idle = at(100);
    assert(idle["tags"][0]["would_poll"] == false);
    assert(!preview.should_poll("PLC", "Idle", 1, start + P::Ms(100)));
    assert(preview.should_poll("PLC", "Idle", 2, start + P::Ms(100)));
    assert(preview.should_poll("PLC", "Missing", 1, start + P::Ms(100)));
    assert(preview.should_poll("PLC", "Idle", 1, start + P::Ms(126)));
    assert(idle["connections"]["PLC"]["would_idle"] == 1);
    assert(idle["tags"][2]["reason"] == "writable_tag");
    assert(idle["tags"][3]["reason"] == "unsupported_driver");
    demand["tags"][0]["observed_demand"] = true;
    assert(at(110)["tags"][0]["reason"] == "wake_requested");
    assert(at(120)["tags"][0]["reason"] == "observed_demand");
    demand["tags"][0]["observed_demand"] = false;
    assert(at(140)["tags"][0]["reason"] == "idle_grace");
    assert(at(170)["tags"][0]["would_poll"] == false);
    auto stale = preview.snapshot("", true, start + P::Ms(196));
    assert(stale["stale"] && stale["tags"][0]["would_poll"] == true);
    assert(stale["reads_skipped"] == 0 && stale["polling_unchanged"]);
    demand["tags"][0]["driver_epoch"] = 2;
    assert(at(200)["tags"][0]["reason"] == "startup_grace");
    assert(preview.snapshot("Missing", true, start + P::Ms(200))["tags"].empty());
    assert(preview.snapshot("PLC", false, start + P::Ms(200))["tags"].empty());
    demand["tags"] = json::array(); at(210);
    demand["tags"] = json::array({row("Idle")});
    assert(at(220)["tags"][0]["reason"] == "startup_grace");
    std::cout << "Demand scheduler preview tests passed\n";
}
