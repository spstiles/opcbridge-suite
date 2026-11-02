#include "demand.h"
#include <cassert>
struct Rule { std::string connection_id, tag_name; bool enabled; };
struct Config {
    bool enabled = true;
    struct { bool enabled = true; } snapshot;
    std::string subscribe_mode = "all";
    std::vector<std::string> tags;
    std::vector<Rule> historian_tags;
};
int main() {
    Config c;
    auto message = historian_demand_registration(c, {});
    assert(message["all_tags"] == true);
    assert(message["demand_mode"] == "explicit");
    c.historian_tags = {{"C", "SlowPeriodic", true}, {"C", "OnChange", true}, {"C", "Off", false}};
    message = historian_demand_registration(c, {});
    assert(message["all_tags"] == false);
    assert(message["tags"] == nlohmann::json({"C:SlowPeriodic", "C:OnChange"}));
    c.enabled = false;
    assert(historian_demand_registration(c, {})["tags"].empty());
    c.enabled = true;
    c.historian_tags = {{"C", "Off", false}};
    assert(historian_demand_registration(c, {})["tags"].empty());
    c.historian_tags.clear(); c.subscribe_mode = "list"; c.tags = {"C:A"};
    assert(historian_demand_registration(c, {})["tags"] == nlohmann::json({"C:A"}));
    c.subscribe_mode = "patterns";
    assert(historian_demand_registration(c, {"C:B"})["tags"] == nlohmann::json({"C:B"}));
    c.snapshot.enabled = false;
    assert(historian_demand_registration(c, {"C:B"})["tags"].empty());
}
