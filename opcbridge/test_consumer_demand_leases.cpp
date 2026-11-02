#include "consumer_demand_leases.h"
#include <cassert>
int main() {
    using nlohmann::json;
    ConsumerDemandLeases leases;
    const auto now = ConsumerDemandLeases::Clock::now();
    auto body = [](const char *id, const char *tag) { return json{{"client_id", id}, {"owner", "logger"}, {"tags", {tag}}}; };
    assert(leases.apply(body("first", "C:A"), false, now));
    assert(leases.apply(body("second", "C:B"), false, now));
    json owners = json::object(); leases.append(owners, now);
    assert(owners["logger"]["registrations"] == 2);
    assert(consumer_demand_matches(owners["logger"], "C", "A"));
    assert(leases.apply(body("first", "C:New"), false, now + std::chrono::seconds(30)));
    auto invalid = body("first", "not-a-key"); invalid["tags"] = {42};
    assert(!leases.apply(invalid, false, now + std::chrono::seconds(31)));
    owners = json::object(); leases.append(owners, now + std::chrono::seconds(61));
    assert(owners["logger"]["registrations"] == 1);
    assert(consumer_demand_matches(owners["logger"], "C", "New"));
    assert(!consumer_demand_matches(owners["logger"], "C", "A"));
    assert(!consumer_demand_matches(owners["logger"], "C", "B"));
    assert(leases.apply(body("second", "C:B"), true, now + std::chrono::seconds(62)));
    owners = json::object(); leases.append(owners, now + std::chrono::seconds(63));
    assert(owners["logger"]["registrations"] == 1);
    owners = json::object(); leases.append(owners, now + std::chrono::seconds(91));
    assert(owners.empty());
    auto pattern = body("patterns", "C:Exact");
    pattern["patterns"] = {{{"connection_id", "C"}, {"name", "Pump?.*"}}};
    assert(leases.apply(pattern, false, now));
    owners = json::object(); leases.append(owners, now);
    assert(consumer_demand_matches(owners["logger"], "C", "Pump1.Running"));
    assert(!consumer_demand_matches(owners["logger"], "C", "Pump12.Running"));
    assert(!consumer_demand_matches(owners["logger"], "Other", "Pump1.Running"));
    pattern["all_tags"] = true;
    assert(leases.apply(pattern, false, now));
    owners = json::object(); leases.append(owners, now);
    assert(consumer_demand_matches(owners["logger"], "Other", "Anything"));
}
