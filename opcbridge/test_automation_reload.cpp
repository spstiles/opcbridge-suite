// Exercise the actual scheduler and loader without starting services or PLC I/O.
#define main opcbridge_application_main
#include "main.cpp"
#undef main
#include <cassert>

int main() {
    char directory[] = "/tmp/opcbridge-automation-reload-XXXXXX";
    assert(mkdtemp(directory));
    const fs::path root(directory);
    const fs::path config = root / "logic.json";
    auto script = [](const std::string &id) {
        return json{{"id", id}, {"enabled", true},
                    {"source", "let retained = 7; setTag('PLC', 'Output', retained);"}};
    };
    const json original{{"scripts", json::array({script("first"), script("second")})},
                        {"blocks", json::array()}};
    auto save = [&](const json &value) { std::ofstream(config) << value.dump(); };
    std::vector<DriverContext> drivers(1);
    drivers[0].conn.id = "PLC";
    drivers[0].conn.driver = "ab_eip";
    TagRuntime target;
    target.cfg.logical_name = "Output";
    target.cfg.datatype = "int32";
    target.cfg.writable = true;
    drivers[0].tags.push_back(target);
    TagTable table;
    std::mutex driverMutex, uaMutex, mqttMutex;
    std::deque<UaUpdate> ua;
    std::deque<MqttPublishJob> mqtt;
    auto run = [&] {
        logic_run_validation_cycle({make_tag_key("PLC", "Output")}, {}, {}, {},
            &drivers, &table, &driverMutex, &ua, &uaMutex, &mqtt, &mqttMutex);
    };
    for (const std::string mode : {"reorder", "edit", "disable", "remove", "invalid", "unchanged"}) {
        save(original);
        assert(load_logic_config(root.string(), true));
        int writes = 0;
        g_logicAsyncWriteEnqueue = [&](const std::string &, const std::string &,
                                      const std::string &, std::string *) {
            ++writes;
            assert(g_logicExecutionDemand.snapshot().size() == 1);
            if (writes == 1 && mode != "unchanged") {
                auto changed = original;
                if (mode == "reorder") std::swap(changed["scripts"][0], changed["scripts"][1]);
                if (mode == "edit") changed["scripts"][0]["source"] = "let replacement = 99;";
                if (mode == "disable") changed["scripts"][0]["enabled"] = false;
                if (mode == "remove") { fs::remove(config); }
                else if (mode == "invalid") { std::ofstream(config) << "{"; }
                else save(changed);
                assert(load_logic_config(root.string(), true) == (mode != "invalid"));
                // Old inputs remain demanded until this captured execution exits.
                assert(g_logicExecutionDemand.snapshot().size() == 1);
            }
            return true;
        };
        run();
        assert(g_logicExecutionDemand.snapshot().empty());
        assert(writes == (mode == "unchanged" ? 2 : 1));
        for (const auto &item : g_logicState.scripts) {
            assert(item.runs_total == (mode == "unchanged" ? 1u : 0u));
            assert(item.retained_vars.empty());
            assert(item.variable_preview.empty() == (mode != "unchanged"));
        }
        // Reset diagnostics so the next load does not deliberately preserve them.
        { std::lock_guard<std::mutex> lock(g_logicMutex); g_logicState.scripts.clear(); }
    }
    g_logicAsyncWriteEnqueue = {};
    fs::remove_all(root);
    std::cout << "Automation reload ownership tests passed\n";
}
