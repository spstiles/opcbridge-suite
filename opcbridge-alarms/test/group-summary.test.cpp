#include "../src/group_summary.h"
#include <cassert>
#include <optional>
#include <unordered_map>
struct State {
    std::string group, site;
    bool enabled = true, site_enabled = true, active = false, acked = false, has_been_active = false;
    int severity = 500;
    std::optional<long long> shelved_until_ms;
};
int main() {
    std::unordered_map<std::string, State> states;
    states["first"] = {"Field", "Station 1", true, true, true, false, true, 700, {}};
    states["second"] = {"Field", "Station 10", true, true, true, true, true, 800, {}};
    states["cleared"] = {"Field", "Station 1", true, true, false, false, true, 900, {}};
    states["normal"] = {"Field", "Station 1", true, true, false, false, false, 500, {}};
    states["disabled"] = {"Field", "Station 1", false, true, true, false, true, 1000, {}};
    states["shelved"] = {"Field", "Station 1", true, true, true, false, true, 1000, 200};
    auto summaries = alarm_groups::summarize({"Plant/UV", "Field/Empty"}, states, 100);
    assert(summaries.at("Field").active == 2);
    assert(summaries.at("Field").unacked == 2);
    assert(summaries.at("Field").active_unacked == 1);
    assert(summaries.at("Field").highest == 800);
    assert(summaries.at("Field/Station 1").active == 1);
    assert(summaries.at("Field/Station 1").highest == 700);
    assert(summaries.at("Field/Empty").unacked == 0);
    assert(summaries.at("Plant").active == 0);
    states["first"].acked = true; states["cleared"].acked = true;
    summaries = alarm_groups::summarize({}, states, 100);
    assert(summaries.at("Field").unacked == 0);
    summaries = alarm_groups::summarize({}, states, 300);
    assert(summaries.at("Field/Station 1").active == 2);
    states["nested"] = {"Field/Station 1/Pumps", "", true, true, true, false, true, 950, {}};
    summaries = alarm_groups::summarize({}, states, 100);
    assert(summaries.at("Field/Station 1").highest == 950);
    assert(summaries.at("Field/Station 10").highest == 800);
}
