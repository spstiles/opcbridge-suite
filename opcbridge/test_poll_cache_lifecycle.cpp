#define main opcbridge_application_main
#include "main.cpp"
#undef main
#include <cassert>
int main() {
    DriverContext driver; driver.conn.id = "PLC"; driver.conn.driver = "ab_eip";
    TagRuntime tag; tag.cfg.logical_name = "Value"; tag.cfg.datatype = "int32";
    TagTable table;
    const auto key = make_tag_key("PLC", "Value");
    auto good = make_initial_snapshot_for_opcua(driver.conn, tag);
    good.value = int32_t(42); good.quality = 1;
    const auto before = PollReadStamp::Clock::now();
    good.poll_read = {before, before, driver.freshness_epoch};
    table[key] = good;
    auto waiting = transition_poll_cache(driver, tag, table, true, true);
    assert(waiting.quality == 0 && std::string(snapshot_polling_state(waiting)) == "waiting");
    assert(waiting.timestamp == good.timestamp); // No fabricated new measurement.
    auto stale = good;
    apply_poll_cache_gate(driver, stale);
    assert(stale.quality == 0 && stale.polling_state == PollCacheState::Waiting);
    auto fresh = good;
    auto now = PollReadStamp::Clock::now();
    fresh.poll_read = {now, now, driver.freshness_epoch};
    apply_poll_cache_gate(driver, fresh);
    assert(fresh.quality == 1 && std::string(snapshot_polling_state(fresh)) == "active");
    assert(!snapshot_updates_equal(waiting, fresh));
    table[key] = fresh;
    auto renewed = transition_poll_cache(driver, tag, table, true);
    assert(renewed.quality == 1); // Renewed demand does not force another wait.
    auto bad = fresh; bad.quality = 0;
    apply_poll_cache_gate(driver, bad);
    assert(std::string(snapshot_polling_state(bad)) == "error");
    assert(!snapshot_updates_equal(fresh, bad)); // Same value, changed quality.
    auto inactive = transition_poll_cache(driver, tag, table, false);
    assert(inactive.quality == 0 && std::string(snapshot_polling_state(inactive)) == "inactive");
    auto duringSuspend = fresh;
    apply_poll_cache_gate(driver, duringSuspend);
    assert(duringSuspend.quality == 0 && duringSuspend.polling_state == PollCacheState::Inactive);
    assert(!snapshot_updates_equal(bad, duringSuspend)); // Same value/quality, changed state.
    auto resumed = transition_poll_cache(driver, tag, table, true);
    assert(resumed.quality == 0 && resumed.polling_state == PollCacheState::Waiting);
    auto inFlight = fresh;
    apply_poll_cache_gate(driver, inFlight);
    assert(inFlight.quality == 0); // Started before resume cannot restore GOOD.
    auto oldDriver = good;
    now = PollReadStamp::Clock::now();
    oldDriver.poll_read = {now, now, driver.freshness_epoch + 1};
    apply_poll_cache_gate(driver, oldDriver); assert(oldDriver.quality == 0);
    auto current = good; current.poll_read = {now, now, driver.freshness_epoch};
    apply_poll_cache_gate(driver, current); assert(current.quality == 1);
    tag.handle = 1;
    TagRuntime root; root.handle = 2; root.cfg.logical_name = "Array"; root.cfg.elem_count = 2;
    TagRuntime element0; element0.cfg.logical_name = "Array[0]"; element0.poll_source = "Array";
    TagRuntime element1 = element0; element1.cfg.logical_name = "Array[1]";
    TagRuntime alias; alias.cfg.logical_name = "Alias"; alias.cfg.source_tag = "Value";
    driver.tags = {tag, root, element0, element1, alias};
    for (const auto &item : driver.tags) {
        if (item.cfg.logical_name == "Array") continue;
        auto state = good; state.logical_name = item.cfg.logical_name;
        state.quality = 0; state.polling_state = PollCacheState::Inactive;
        table[make_tag_key("PLC", state.logical_name)] = state;
    }
    auto activity = polling_activity_summary(driver, table);
    assert(activity.idle() && activity.enabled == 4 && activity.inactive == 4);
    assert(activity.configured_work == 2 && activity.inactive_work == 2 && activity.active_work == 0);
    table[make_tag_key("PLC", "Array[1]")].polling_state = PollCacheState::Waiting;
    activity = polling_activity_summary(driver, table);
    assert(!activity.idle() && activity.waiting == 1 && activity.active_work == 1);
    table.erase(make_tag_key("PLC", "Array[1]"));
    assert(polling_activity_summary(driver, table).active_work == 1); // Missing element fails open.
    json metric{{"sweep_ms_last", 123.0}, {"poll_progress_pct", 99.0}};
    add_polling_activity_json(metric, activity);
    assert(metric["sweep_ms_last"].is_null() && metric["poll_progress_pct"].is_null());
    assert(metric["sweep_scope"] == "demand_driven" && !metric["full_sweep_available"].get<bool>());
    std::cout << "Poll cache lifecycle tests passed\n";
}
