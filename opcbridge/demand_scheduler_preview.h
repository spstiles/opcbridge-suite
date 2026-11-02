#pragma once
#include <chrono>
#include <cstdint>
#include <mutex>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <nlohmann/json.hpp>

// Pure planning: this class never changes scan eligibility or cache quality.
class DemandSchedulerPreview {
public:
    using Clock = std::chrono::steady_clock;
    using Ms = std::chrono::milliseconds;
    explicit DemandSchedulerPreview(Ms startup = Ms(30000), Ms idle = Ms(10000), Ms stale = Ms(2500))
        : startup_(startup), idle_(idle), stale_(stale) {}
    void refresh(const nlohmann::json &demand, Clock::time_point now = Clock::now()) {
        std::lock_guard<std::mutex> lock(mutex_);
        std::unordered_set<std::string> seen;
        rows_ = nlohmann::json::array();
        for (const auto &tag : demand.at("tags")) {
            if (!tag.value("poll_work", false) || !tag.value("enabled", false)) continue;
            const std::string cid = tag.at("connection_id"), name = tag.at("name");
            const auto key = cid + '\x1f' + name;
            seen.insert(key);
            const uint64_t epoch = tag.at("driver_epoch");
            auto found = entries_.find(key);
            if (found == entries_.end() || found->second.epoch != epoch)
                found = entries_.insert_or_assign(key, Entry{epoch, now, now, true}).first;
            auto &entry = found->second;
            const bool observed = tag.value("observed_demand", false);
            if (observed) entry.last_demand = now;
            bool poll = true;
            std::string reason;
            if (tag.value("driver", std::string{}) != "ab_eip") reason = "unsupported_driver";
            else if (tag.value("writable", false)) reason = "writable_tag";
            else if (observed) reason = entry.would_poll ? "observed_demand" : "wake_requested";
            else if (now - entry.started < startup_) reason = "startup_grace";
            else if (now - entry.last_demand < idle_) reason = "idle_grace";
            else { poll = false; reason = "no_observed_demand"; }
            entry.would_poll = poll;
            rows_.push_back({{"connection_id", cid}, {"name", name},
                {"would_poll", poll}, {"reason", reason}, {"driver_epoch", epoch}});
        }
        for (auto it = entries_.begin(); it != entries_.end();)
            if (!seen.count(it->first)) it = entries_.erase(it); else ++it;
        updated_ = now; initialized_ = true;
    }
    // Fail open for incomplete/stale plans and replacement drivers.
    bool should_poll(const std::string &cid, const std::string &name, uint64_t epoch,
                     Clock::time_point now = Clock::now()) const {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!initialized_ || now < updated_ || now - updated_ > stale_) return true;
        const auto found = entries_.find(cid + '\x1f' + name);
        return found == entries_.end() || found->second.epoch != epoch || found->second.would_poll;
    }
    nlohmann::json snapshot(const std::string &filter = "", bool includeTags = true,
                            Clock::time_point now = Clock::now()) const {
        std::lock_guard<std::mutex> lock(mutex_);
        const bool stale = !initialized_ || now < updated_ || now - updated_ > stale_;
        nlohmann::json result = {{"mode", "preview_only"}, {"polling_unchanged", true},
            {"reads_skipped", 0}, {"stale", stale}, {"startup_grace_ms", startup_.count()},
            {"idle_grace_ms", idle_.count()}, {"max_snapshot_age_ms", stale_.count()},
            {"connections", nlohmann::json::object()}, {"tags", nlohmann::json::array()}};
        for (auto row : rows_) {
            const std::string cid = row.at("connection_id");
            if (!filter.empty() && cid != filter) continue;
            if (stale) { row["would_poll"] = true; row["reason"] = "stale_demand_snapshot"; }
            auto &summary = result["connections"][cid];
            if (summary.is_null()) summary = {{"poll_work", 0}, {"would_poll", 0}, {"would_idle", 0}};
            summary["poll_work"] = summary["poll_work"].get<size_t>() + 1;
            const char *count = row["would_poll"].get<bool>() ? "would_poll" : "would_idle";
            summary[count] = summary[count].get<size_t>() + 1;
            if (includeTags) result["tags"].push_back(std::move(row));
        }
        return result;
    }
private:
    struct Entry { uint64_t epoch; Clock::time_point started, last_demand; bool would_poll; };
    Ms startup_, idle_, stale_;
    mutable std::mutex mutex_;
    std::unordered_map<std::string, Entry> entries_;
    nlohmann::json rows_ = nlohmann::json::array();
    Clock::time_point updated_{};
    bool initialized_ = false;
};
