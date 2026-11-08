#pragma once
#include <map>
#include <set>
#include <string>
#include <algorithm>

namespace alarm_groups {
inline std::string path(std::string group, const std::string &site = {}) {
    if (!site.empty()) group += (group.empty() ? "" : "/") + site;
    while (!group.empty() && group.front() == '/') group.erase(group.begin());
    while (!group.empty() && group.back() == '/') group.pop_back();
    return group;
}
inline std::set<std::string> parents(const std::string &name) {
    std::set<std::string> result;
    for (size_t i = name.find('/'); i != std::string::npos; i = name.find('/', i + 1))
        if (i) result.insert(name.substr(0, i));
    if (!name.empty()) result.insert(name);
    return result;
}
struct Summary {
    int active = 0, unacked = 0, active_unacked = 0, highest = 0;
};
template<class States>
std::map<std::string, Summary> summarize(const std::set<std::string> &defined, const States &states, long long now) {
    std::map<std::string, Summary> out;
    for (const auto &name : defined) for (const auto &p : parents(name)) out[p];
    for (const auto &kv : states) {
        const auto &s = kv.second;
        const auto scope = parents(path(s.group, s.site));
        for (const auto &p : scope) out[p];
        if (!s.enabled || !s.site_enabled || (s.shelved_until_ms && now < *s.shelved_until_ms)) continue;
        for (const auto &p : scope) {
            auto &summary = out[p];
            if (s.active) { summary.active++; summary.highest = std::max(summary.highest, s.severity); }
            if (!s.acked && (s.active || s.has_been_active)) summary.unacked++;
            if (s.active && !s.acked) summary.active_unacked++;
        }
    }
    return out;
}
}
