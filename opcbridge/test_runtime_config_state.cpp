#include "runtime_config_state.h"
#include <cassert>
#include <fstream>
#include <chrono>

int main() {
    namespace fs = std::filesystem;
    using json = nlohmann::json;
    const auto root = fs::temp_directory_path() / ("opcbridge-config-state-" +
        std::to_string(std::chrono::steady_clock::now().time_since_epoch().count()));
    fs::create_directories(root / "connections");
    fs::create_directories(root / "tags");
    auto put = [&](const std::string &path, const std::string &text) { std::ofstream(root/path) << text; };
    auto capture = [&]() { return RuntimeConfigState::capture(root, [](const std::string &path) {
        std::ifstream input(path); json value; input >> value; return value;
    }); };
    put("connections/A.json", R"({"id":"A","enabled":true})");
    put("tags/A.json", R"({"connection_id":"A","tags":[]})");
    put("connections/B.json", R"({"id":"B","enabled":true})");
    RuntimeConfigState state;
    const auto initial = capture();
    state.applied(initial);
    assert(!state.pending(capture()));
    // Formatting/key ordering alone does not count as a saved change.
    put("connections/A.json", "{\n  \"enabled\": true, \"id\": \"A\"\n}");
    assert(!state.pending(capture()));
    put("connections/A.json", R"({"id":"A","enabled":false})");
    const auto forReload = capture();
    assert(state.pending(forReload));
    // An unsuccessful load never calls applied(), so pending remains true.
    assert(state.pending(capture()));
    put("connections/B.json", R"({"id":"B","enabled":false})");
    state.applied(forReload); // A newer save during the load must not be cleared.
    assert(state.pending(capture()));
    state.applied(capture(), "B");
    assert(!state.pending(capture()));
    put("connections/A.json", R"({"id":"A","enabled":true})");
    put("connections/B.json", R"({"id":"B","enabled":true})");
    state.applied(capture(), "A");
    assert(state.pending(capture())); // Targeted reload cannot acknowledge B.
    state.applied(capture(), "B");
    assert(!state.pending(capture()));
    fs::remove(root / "connections/A.json"); fs::remove(root / "tags/A.json");
    assert(state.pending(capture()));
    state.applied(capture(), "A");
    assert(!state.pending(capture()));
    put("tags/B.json", "invalid JSON");
    const auto invalid = capture();
    assert(!invalid.error.empty());
    assert(state.pending(invalid));
    state.applied(invalid); // Bad snapshots can never mark saved files applied.
    fs::remove(root / "tags/B.json");
    assert(!state.pending(capture()));
    // A process restart applies saved configuration during startup.
    RuntimeConfigState restarted;
    restarted.applied(capture());
    assert(!restarted.pending(capture()));
    fs::remove_all(root);
}
