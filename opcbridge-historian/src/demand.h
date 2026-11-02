#pragma once
#include <nlohmann/json.hpp>
#include <string>
#include <vector>

// Recording rules are demand even when the stream is broad or the sample interval
// is longer than an HTTP recent-read lease. Empty legacy rules use snapshot scope.
template <typename Config>
nlohmann::json historian_demand_registration(const Config &cfg,
                                             const std::vector<std::string> &resolvedKeys) {
    nlohmann::json message = {{"type", "register_demand"}, {"owner", "opcbridge-historian"},
                              {"demand_mode", "explicit"}, {"all_tags", false}, {"tags", nlohmann::json::array()}};
    if (!cfg.enabled) return message;
    if (!cfg.historian_tags.empty()) {
        for (const auto &rule : cfg.historian_tags)
            if (rule.enabled && !rule.connection_id.empty() && !rule.tag_name.empty())
                message["tags"].push_back(rule.connection_id + ":" + rule.tag_name);
    } else if (cfg.snapshot.enabled) {
        if (cfg.subscribe_mode == "all") message["all_tags"] = true;
        else if (cfg.subscribe_mode == "list") message["tags"] = cfg.tags;
        else if (cfg.subscribe_mode == "patterns") message["tags"] = resolvedKeys;
    }
    return message;
}
