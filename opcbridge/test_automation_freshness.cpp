// Actual automation evaluation, with synthetic poll completions and no PLC I/O.
#define main opcbridge_application_main
#include "main.cpp"
#undef main
#include <cassert>

int main() {
    std::vector<DriverContext> drivers(1);
    auto &driver = drivers[0];
    driver.conn.id = "PLC"; driver.conn.driver = "ab_eip";
    for (const auto &name : {"Input", "Other", "Output"}) {
        TagRuntime tag; tag.cfg.logical_name = name; tag.cfg.datatype = "int32";
        tag.cfg.writable = true; driver.tags.push_back(tag);
    }
    TagTable table;
    std::mutex driverMutex, uaMutex, mqttMutex;
    std::deque<UaUpdate> ua;
    std::deque<MqttPublishJob> mqtt;
    const auto input = make_tag_key("PLC", "Input");
    auto sample = [&](int value, bool good = true) {
        TagSnapshot result; result.value = int32_t(value); result.quality = good ? 1 : 0;
        const auto now = PollReadStamp::Clock::now();
        result.poll_read = {now, now, driver.freshness_epoch};
        return result;
    };
    std::unordered_map<std::string, TagSnapshot> oldCache{{input, sample(7)}};
    int writes = 0;
    std::string written;
    g_logicAsyncWriteEnqueue = [&](const std::string &, const std::string &, const std::string &value, std::string *) {
        ++writes; written = value; return true;
    };
    auto reset = [&](bool verified = true) {
        std::lock_guard<std::mutex> lock(g_logicMutex);
        ++g_logicState.revision;
        LogicScriptConfig script; script.id = "test"; script.enabled = true;
        script.require_fresh_read = verified; script.fresh_timeout_ms = 100;
        script.source = "setTag('PLC', 'Output', tag('PLC', 'Input'));";
        g_logicState.scripts = {script}; writes = 0; written.clear();
        table[input] = sample(42);
    };
    auto run = [&] {
        logic_run_validation_cycle({input, make_tag_key("PLC", "Other"), make_tag_key("PLC", "Output")},
            {}, oldCache, {}, &drivers, &table, &driverMutex, &ua, &uaMutex, &mqtt, &mqttMutex);
        assert(g_logicExecutionDemand.snapshot().empty());
    };
    reset(false); run(); assert(writes == 1 && written == "7"); // Legacy behavior.
    reset(); g_logicState.scripts[0].fresh_max_age_ms = 1000;
    run(); assert(writes == 1 && written == "42"); // Verified copy replaces stale scheduler cache.
    reset();
    std::thread poll([&] {
        std::this_thread::sleep_for(std::chrono::milliseconds(30));
        std::lock_guard<std::mutex> lock(driverMutex); table[input] = sample(99);
    });
    run(); poll.join(); assert(writes == 1 && written == "99"); // MaxAge zero waits for new I/O.
    reset(); run(); assert(writes == 0 && g_logicState.scripts[0].last_error.find("timeout") != std::string::npos);
    reset(); table[input] = sample(42, false);
    run(); assert(writes == 0);
    reset(); drivers[0].tags[0].cfg.enabled = false;
    run(); assert(writes == 0 && g_logicState.scripts[0].last_error.find("disabled") != std::string::npos);
    drivers[0].tags[0].cfg.enabled = true;
    reset(); g_logicState.scripts[0].source = "setTag('PLC', 'Output', 1); let x = tag(connection, name);";
    run(); assert(writes == 0 && g_logicState.scripts[0].last_error.find("literal dependencies") != std::string::npos);
    reset(); g_logicState.scripts[0].source = "setTag('PLC', 'Output', 1); let x = tag('PLC', 'Missing');";
    run(); assert(writes == 0 && g_logicState.scripts[0].last_error.find("not_found") != std::string::npos);
    reset(); g_logicState.scripts[0].fresh_max_age_ms = 1000;
    g_logicState.scripts[0].source = "setTag('PLC', 'Output', tag('PLC', 'Input')); let x = tag('PLC', 'Other');";
    run(); assert(writes == 0); // A fresh first input cannot permit partial execution.
    reset(); g_logicState.scripts[0].fresh_max_age_ms = 1000;
    table[input].poll_read.source_epoch += 1;
    run(); assert(writes == 0); // A previous driver's cache cannot qualify.
    reset(); drivers[0].tags[0].cfg.source_type = "memory";
    table[input].poll_read = {};
    run(); assert(writes == 1 && written == "42"); // Direct memory is authoritative.
    drivers[0].tags[0].cfg.source_type = "plc";
    reset();
    std::thread reload([&] {
        std::this_thread::sleep_for(std::chrono::milliseconds(30));
        std::lock_guard<std::mutex> lock(g_logicMutex);
        assert(g_logicExecutionDemand.snapshot().size() == 1);
        ++g_logicState.revision; g_logicState.scripts.clear();
    });
    run(); reload.join(); assert(writes == 0);
    reset();
    g_logicState.scripts[0].kind = "block";
    g_logicState.scripts[0].setup_source = "setTag('PLC', 'Output', 1);";
    g_logicState.scripts[0].loop_source = "let x = tag('PLC', 'Missing');";
    run(); assert(writes == 0 && !g_logicState.scripts[0].setup_initialized);
    for (const auto &fields : std::vector<json>{
            {{"require_fresh_read", "yes"}}, {{"fresh_max_age_ms", -1}},
            {{"fresh_max_age_ms", 60001}}, {{"fresh_timeout_ms", 5001}},
            {{"fresh_timeout_ms", 0.5}}, {{"fresh_timeout_ms", uint64_t(-1)}}}) {
        std::string error;
        assert(!validate_logic_json(json{{"scripts", json::array({fields})}, {"blocks", json::array()}}.dump(), error));
    }
    std::string error;
    assert(validate_logic_json(json{{"scripts", json::array({json{{"require_fresh_read", true},
        {"fresh_max_age_ms", 60000}, {"fresh_timeout_ms", 5000}}})}, {"blocks", json::array()}}.dump(), error));
    g_logicAsyncWriteEnqueue = {};
    std::cout << "Automation freshness tests passed\n";
}
