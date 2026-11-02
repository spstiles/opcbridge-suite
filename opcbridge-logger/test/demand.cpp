#define main logger_service_main
#include "../opcbridge_logger.cpp"
#undef main
#include <cassert>
#include <filesystem>
#include <unistd.h>

int main() {
    char pattern[] = "/tmp/opcbridge-logger-demand-unit-XXXXXX";
    const char *folder = mkdtemp(pattern);
    assert(folder);
    const std::filesystem::path root(folder);
    auto write = [&](const char *name, const json &body) {
        const auto path = root / name;
        std::ofstream(path) << body;
        return path.string();
    };
    const auto config = write("config.json", {{"opcbridge_base_url", "http://127.0.0.1:18080/"}});
    const auto dbs = write("db.json", {{"databases", {{{"id", "local"}},
        {{"id", "remote"}, {"opcbridge_base_url", "http://127.0.0.1:18180/"}}}}});
    const auto checks = write("checks.json", json::object());
    const auto sync = write("sync.json", json::object());
    json jobs = {
        {{"id", "exact"}, {"enabled", true}, {"database_id", "local"}, {"tags", {"C:Tag:WithColon"}}},
        {{"id", "pattern"}, {"enabled", true}, {"database_id", "local"}, {"tags", {"C:Pump?.*"}}},
        {{"id", "off"}, {"enabled", false}, {"database_id", "local"}, {"tags", "ALL"}},
        {{"id", "remote"}, {"enabled", true}, {"database_id", "remote"}, {"tags", {"C:Remote"}}},
        {{"id", "history"}, {"enabled", true}, {"database_id", "local"}, {"tags", json::array()},
         {"historian_fields", {{{"connection_id", "C"}, {"tag_name", "Historical"}}}}}
    };
    const auto reports = write("reports.json", {{"reports", jobs}});
    LoggerService service(config, dbs, reports, checks, sync, "");
    std::string error;
    assert(service.reload(error));
    auto scopes = service.demand_scopes();
    assert(scopes.size() == 2);
    assert(scopes.at("http://127.0.0.1:18080")["tags"] == json({"C:Tag:WithColon"}));
    assert(scopes.at("http://127.0.0.1:18080")["patterns"] == json({{{"connection_id", "C"}, {"name", "Pump?.*"}}}));
    assert(scopes.at("http://127.0.0.1:18180")["tags"] == json({"C:Remote"}));
    for (auto &job : jobs) job["enabled"] = false;
    write("reports.json", {{"reports", jobs}});
    assert(service.reload(error));
    assert(service.demand_scopes().empty());
    jobs[2]["enabled"] = true;
    write("reports.json", {{"reports", jobs}});
    assert(service.reload(error));
    assert(service.demand_scopes().at("http://127.0.0.1:18080")["all_tags"] == true);
    std::filesystem::remove_all(root);
}
