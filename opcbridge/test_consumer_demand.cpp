#include "consumer_demand.h"
#include <cassert>
int main() {
    using nlohmann::json;
    ConsumerDemand first, second;
    auto register_tags = [](const char *owner, json tags) {
        return json{{"type", "register_demand"}, {"owner", owner}, {"tags", tags}};
    };
    assert(first.apply(register_tags("alarms", {"C:A", "C:A", "C:B"})));
    assert(first.owners().at("alarms").tags.size() == 2);
    assert(second.apply(register_tags("alarms", {"C:B"})));
    assert(first.apply(register_tags("historian", {"C:A"})));
    assert(first.apply(register_tags("alarms", {"C:C"})));
    assert(first.owners().at("alarms").tags.count("C:C"));
    assert(!first.owners().at("alarms").tags.count("C:A"));
    assert(first.owners().at("historian").tags.count("C:A"));
    assert(!first.apply(register_tags("alarms", {"malformed"})));
    assert(!first.apply(register_tags("alarms", {5})));
    assert(!first.apply({{"type", "register_demand"}, {"owner", "alarms"}, {"all_tags", "yes"}}));
    assert(first.owners().at("alarms").tags.count("C:C"));
    assert(first.apply({{"type", "register_demand"}, {"owner", "alarms"}, {"all_tags", true}}));
    assert(first.owners().at("alarms").all_tags);
    assert(first.apply(register_tags("alarms", json::array())));
    assert(!first.owners().at("alarms").all_tags && first.owners().at("alarms").tags.empty());
    assert(first.apply({{"type", "release_demand"}, {"owner", "alarms"}}));
    assert(!first.owners().count("alarms"));
    assert(first.owners().count("historian"));
    assert(second.owners().at("alarms").tags.count("C:B"));
}
