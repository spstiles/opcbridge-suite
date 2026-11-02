#include "automation_demand.h"
#include <cassert>
#include <string>
#include <vector>
struct Script {
    bool enabled;
    std::string id, name, kind, engine, source, setup_source, loop_source;
};
int main() {
    auto d = automation_read_dependencies("tag('C','T')");
    assert(d.complete && d.reads.count({"C", "T"}));
    d = automation_read_dependencies("if (tag('C','Trigger')) { setTag('_memory','Out', quality('C','Left')); } else { let x = tag('C','Right'); }");
    assert(d.complete && d.reads.size() == 3 && !d.reads.count({"_memory", "Out"}));
    d = automation_read_dependencies("// tag('C','Comment')\n let text = \"tag('C','String')\"; /* quality('C','BlockComment') */ let x = tag /* gap */ ('C', 'Actual');");
    assert(d.complete && d.reads.size() == 1 && d.reads.count({"C", "Actual"}));
    d = automation_read_dependencies("setTag('_memory','OnlyWrite', 1); let exists = hasTag('C','Exists'); let clock = tag('_system','Clock');");
    assert(d.complete && d.reads.empty());
    d = automation_read_dependencies("let x = max(tag('C','One'), num(quality('C','Two')));");
    assert(d.complete && d.reads.size() == 2);
    for (const auto *source : {"tag(conn,'T');", "tag('C', concat('P', '1'));", "tag('C','A' + 'B');",
         "tag('C','Escaped\\n');", "let reader = tag; reader('C','T');", "obj.tag('C','T');",
         "eval(code);", "tag(`C`, 'T');", "obj['tag']('C','T');", "unknown();",
         "tag('C','T'", "'unfinished", "/* unfinished", "function f() {}", "setTag(conn,'T', 1);"})
        assert(!automation_read_dependencies(source).complete);
    std::vector<Script> scripts;
    assert(automation_demand_snapshot(scripts)["coverage_complete"] == true);
    scripts.push_back({false, "off", "Disabled", "script", "javascript", "tag(dynamic, name);", "", ""});
    assert(automation_demand_snapshot(scripts)["enabled_automations"].empty());
    scripts.push_back({true, "literal", "Read", "script", "javascript", "let x = tag('C','Read');", "", ""});
    scripts.push_back({true, "block", "Setup and loop", "block", "javascript", "", "let init = tag('C','Setup');", "let x = quality('C','Loop');"});
    auto result = automation_demand_snapshot(scripts);
    assert(result["coverage_complete"] == true && result["all_tags_required"] == false);
    assert(result["tags"] == nlohmann::json({"C:Loop", "C:Read", "C:Setup"}));
    scripts.push_back({true, "dynamic", "Dynamic", "script", "javascript", "tag(conn, name);", "", ""});
    assert(automation_demand_snapshot(scripts)["all_tags_required"] == true);
    scripts.back().enabled = false;
    scripts.push_back({true, "unknown", "Unsupported", "script", "unknown", "", "", ""});
    assert(automation_demand_snapshot(scripts)["all_tags_required"] == true);
    for (auto &script : scripts) script.enabled = false;
    assert(automation_demand_snapshot(scripts)["all_tags_required"] == false);
}
