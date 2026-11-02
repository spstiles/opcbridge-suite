#pragma once
#include <nlohmann/json.hpp>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

// One connection owns these registrations. Replacing/releasing one owner cannot
// release another connection's interest, even if both use the same owner label.
class ConsumerDemand {
public:
    struct Scope {
        bool all_tags = false;
        std::unordered_set<std::string> tags;
        std::vector<std::pair<std::string, std::string>> patterns;
    };
    bool apply(const nlohmann::json &message) {
        if (!message.is_object() || !message.contains("owner") || !message["owner"].is_string()) return false;
        const std::string owner = message["owner"].get<std::string>();
        if (owner.empty() || owner.size() > 128) return false;
        if (!message.contains("type") || !message["type"].is_string()) return false;
        const std::string type = message["type"].get<std::string>();
        if (type == "release_demand") { owners_.erase(owner); return true; }
        if (type != "register_demand") return false;
        Scope next;
        if (message.contains("all_tags")) {
            if (!message["all_tags"].is_boolean()) return false;
            next.all_tags = message["all_tags"].get<bool>();
        }
        if (!next.all_tags && (!message.contains("tags") || !message["tags"].is_array())) return false;
        if (message.contains("tags")) {
            if (!message["tags"].is_array() || message["tags"].size() > 100000) return false;
            for (const auto &tag : message["tags"]) {
                if (!tag.is_string()) return false;
                const std::string key = tag.get<std::string>();
                const auto colon = key.find(':');
                if (colon == std::string::npos || colon == 0 || colon + 1 == key.size()) return false;
                next.tags.insert(key);
            }
        }
        if (message.contains("patterns")) {
            if (!message["patterns"].is_array() || message["patterns"].size() > 100000) return false;
            for (const auto &pattern : message["patterns"]) {
                if (!pattern.is_object() || !pattern.contains("connection_id") ||
                    !pattern["connection_id"].is_string() || !pattern.contains("name") || !pattern["name"].is_string()) return false;
                auto cid = pattern["connection_id"].get<std::string>();
                auto name = pattern["name"].get<std::string>();
                if (cid.empty() || name.empty()) return false;
                next.patterns.emplace_back(std::move(cid), std::move(name));
            }
        }
        owners_[owner] = std::move(next);
        return true;
    }
    const std::unordered_map<std::string, Scope> &owners() const { return owners_; }
private:
    std::unordered_map<std::string, Scope> owners_;
};

inline void merge_consumer_scope(nlohmann::json &owners, const std::string &name,
                                 const ConsumerDemand::Scope &scope) {
    auto &owner = owners[name];
    if (owner.is_null()) owner = {{"registrations", 0}, {"all_tags_registrations", 0},
                                  {"tags", nlohmann::json::object()}, {"patterns", nlohmann::json::array()}};
    owner["registrations"] = owner["registrations"].get<size_t>() + 1;
    if (scope.all_tags) owner["all_tags_registrations"] = owner["all_tags_registrations"].get<size_t>() + 1;
    else {
        for (const auto &key : scope.tags) owner["tags"][key] = owner["tags"].value(key, size_t{0}) + 1;
        for (const auto &pattern : scope.patterns)
            owner["patterns"].push_back({{"connection_id", pattern.first}, {"name", pattern.second}});
    }
}

// Same * and ? semantics as logger job selection; connection IDs are exact.
inline bool consumer_demand_glob(const std::string &pattern, const std::string &text) {
    size_t p = 0, t = 0, star = std::string::npos, match = 0;
    while (t < text.size()) {
        if (p < pattern.size() && (pattern[p] == '?' || pattern[p] == text[t])) { ++p; ++t; }
        else if (p < pattern.size() && pattern[p] == '*') { star = p++; match = t; }
        else if (star != std::string::npos) { p = star + 1; t = ++match; }
        else return false;
    }
    while (p < pattern.size() && pattern[p] == '*') ++p;
    return p == pattern.size();
}

inline bool consumer_demand_matches(const nlohmann::json &owner,
                                    const std::string &cid, const std::string &name) {
    if (owner.value("all_tags_registrations", size_t{0}) ||
        owner["tags"].value(cid + ":" + name, size_t{0})) return true;
    for (const auto &pattern : owner["patterns"])
        if (pattern["connection_id"] == cid && consumer_demand_glob(pattern["name"], name)) return true;
    return false;
}
