#include "execution_demand.h"
#include "automation_demand.h"
#include <cassert>
#include <thread>
struct Script {
    bool enabled = true;
    std::string id = "test", name = "test", engine = "javascript", kind = "script";
    std::string source, setup_source, loop_source;
};
int main() {
    ExecutionDemand<Script> registry;
    assert(registry.snapshot().empty());
    Script config; config.source = "tag('C', 'Old');";
    auto first = registry.retain(config);
    config.source = "tag('C', 'New');";
    auto second = registry.retain(config);
    config.enabled = false; // Reload/disable does not modify captured executions.
    auto demand = automation_demand_snapshot(std::vector<Script>{config}, registry.snapshot());
    assert(demand["enabled_automations"].empty());
    assert(demand["executing_automations"].size() == 2);
    assert(demand["tags"] == nlohmann::json({"C:New", "C:Old"}));
    first.reset();
    assert(automation_demand_snapshot(registry.snapshot())["tags"] == nlohmann::json({"C:New"}));
    second.reset();
    assert(registry.snapshot().empty());
    config.enabled = true; config.source = "tag(connection, name);";
    {
        auto dynamic = registry.retain(config);
        assert(automation_demand_snapshot(registry.snapshot())["all_tags_required"] == true);
    }
    assert(registry.snapshot().empty());
    // Exceptions release the pin as well.
    try { auto execution = registry.retain(config); throw 1; } catch (int) {}
    assert(registry.snapshot().empty());
    std::thread writer([&] { for (int i=0; i<1000; ++i) { auto execution = registry.retain(config); } });
    for (int i=0; i<1000; ++i) registry.snapshot();
    writer.join();
    assert(registry.snapshot().empty());
}
