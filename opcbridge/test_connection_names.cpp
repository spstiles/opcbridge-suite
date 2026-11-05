#include "connection_names.h"
#include <cassert>
#include <fstream>
#include <unistd.h>
int main() {
    namespace fs = std::filesystem;
    using nlohmann::json;
    const auto root = fs::temp_directory_path() / ("opcbridge-names-" + std::to_string(getpid()));
    fs::create_directories(root / "connections");
    std::ofstream(root / "connections/a.json") << R"({"id":"a","description":"Field Ops"})";
    std::ofstream(root / "connections/b.jsonc") << R"({"id":"b","description":""})";
    const auto read = [](const std::string &path) { std::ifstream stream(path); return json::parse(stream); };
    const auto check = [&](const json &value) { return connection_name_conflict(value,root,"connections/new.json",read); };
    assert(!check(json{{"id","new"},{"description"," field OPS "}}).empty());
    assert(!check(json{{"id","new"},{"description","B"}}).empty());
    assert(check(json{{"id","a"},{"description","FIELD OPS"}}).empty());
    assert(check(json{{"id","new"},{"description","Other"}}).empty());
    assert(connection_name_key(" \tField Ops\n") == "field ops");
    fs::remove_all(root);
}
