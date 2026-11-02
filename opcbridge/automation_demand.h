#pragma once
#include <nlohmann/json.hpp>

#include "automation_dependencies.h"

// Analyze all configured branches, including retained setup code. Never infer
// completeness from which expressions happened to execute on the last cycle.
template <typename Scripts>
nlohmann::json automation_demand_snapshot(const Scripts &scripts) {
    nlohmann::json result = {{"coverage_complete", true}, {"all_tags_required", false},
        {"tags", nlohmann::json::array()}, {"enabled_automations", nlohmann::json::array()}};
    std::set<std::string> tags;
    for (const auto &script : scripts) {
        if (!script.enabled) continue;
        auto deps = automation_read_dependencies(script.kind == "block" ? script.setup_source : script.source);
        if (script.kind == "block") {
            const auto loop = automation_read_dependencies(script.loop_source);
            deps.reads.insert(loop.reads.begin(), loop.reads.end());
            if (!loop.complete) deps.uncertain(loop.reason);
        }
        if (script.engine != "javascript" || (script.kind != "block" && script.kind != "script"))
            deps.uncertain("unsupported_engine_or_kind");
        nlohmann::json reads = nlohmann::json::array();
        for (const auto &read : deps.reads) {
            tags.insert(read.first + ":" + read.second);
            reads.push_back({{"connection_id", read.first}, {"name", read.second}});
        }
        if (!deps.complete) {
            result["all_tags_required"] = true;
            result["coverage_complete"] = false;
        }
        result["enabled_automations"].push_back({{"id", script.id}, {"name", script.name},
            {"kind", script.kind}, {"engine", script.engine},
            {"scope", deps.complete ? "read_tags" : "all_tags"},
            {"reason", deps.reason}, {"read_tags", reads}});
    }
    result["tags"] = tags;
    return result;
}

// Keep configured and executing diagnostics separate while taking their union.
template <typename Scripts, typename Executions>
nlohmann::json automation_demand_snapshot(const Scripts &scripts, const Executions &executions) {
    auto result = automation_demand_snapshot(scripts);
    const auto running = automation_demand_snapshot(executions);
    result["executing_automations"] = running["enabled_automations"];
    result["coverage_complete"] = result["coverage_complete"].template get<bool>() &&
                                  running["coverage_complete"].template get<bool>();
    result["all_tags_required"] = result["all_tags_required"].template get<bool>() ||
                                  running["all_tags_required"].template get<bool>();
    std::set<std::string> tags;
    for (const auto &tag : result["tags"]) tags.insert(tag.template get<std::string>());
    for (const auto &tag : running["tags"]) tags.insert(tag.template get<std::string>());
    result["tags"] = tags;
    return result;
}
