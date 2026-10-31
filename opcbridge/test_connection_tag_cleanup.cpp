#include "connection_tag_cleanup.h"
#include <nlohmann/json.hpp>
#include <cassert>
#include <fstream>
#include <unistd.h>

int main() {
    namespace fs = std::filesystem;
    char pattern[] = "/tmp/opcbridge-tag-cleanup-XXXXXX";
    const char *folder = mkdtemp(pattern);
    assert(folder);
    const fs::path root(folder);
    auto write = [&](const std::string &name, const std::string &text) {
        std::ofstream(root / name) << text;
    };
    const std::string owned = R"({"connection_id":"Field_Ops","tags":[]})";
    for (const auto *name : {"Field_Ops.json", "Field_Ops.jsonc", "legacy.json",
                             "legacy.jsonc", "legacy.json.bak", "legacy.jsonc.bak"})
        write(name, "// legacy comment\n" + owned);
    write("unrelated.json", R"({"connection_id":"Other","tags":[]})");
    write("Field_Ops_backup.json", R"({"connection_id":"Other","tags":[]})");
    write("broken.json", "invalid");
    write("notes.txt", owned);
    auto read = [](const std::string &path) {
        std::ifstream input(path);
        return nlohmann::json::parse(input, nullptr, true, true);
    };
    remove_connection_tag_files(root, "Field_Ops", read);
    for (const auto *name : {"Field_Ops.json", "Field_Ops.jsonc", "legacy.json",
                             "legacy.jsonc", "legacy.json.bak", "legacy.jsonc.bak"})
        assert(!fs::exists(root / name));
    for (const auto *name : {"unrelated.json", "Field_Ops_backup.json", "broken.json", "notes.txt"})
        assert(fs::exists(root / name));
    // Clean malformed canonical stores too, without touching unrelated malformed files.
    write("Field_Ops.json", "invalid");
    write("Field_Ops.jsonc.bak", "invalid");
    remove_connection_tag_files(root, "Field_Ops", read);
    assert(!fs::exists(root / "Field_Ops.json"));
    assert(!fs::exists(root / "Field_Ops.jsonc.bak"));
    assert(fs::exists(root / "broken.json"));
    remove_connection_tag_files(root / "missing", "Field_Ops", read);
    fs::remove_all(root);
}
