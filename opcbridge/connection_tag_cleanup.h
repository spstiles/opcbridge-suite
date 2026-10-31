#pragma once
#include <filesystem>
#include <stdexcept>
#include <string>
#include <vector>

// Only stores claiming this connection ID are removed; filenames may be legacy aliases.
template <typename JsonReader>
void remove_connection_tag_files(const std::filesystem::path &tagDir,
                                 const std::string &cid, JsonReader readJson) {
    namespace fs = std::filesystem;
    std::vector<fs::path> ownedFiles;
    if (fs::exists(tagDir)) {
        for (const auto &entry : fs::directory_iterator(tagDir)) {
            if (!entry.is_regular_file()) continue;
            fs::path name = entry.path().filename();
            if (name.extension() == ".bak") name = name.stem();
            if (name.extension() != ".json" && name.extension() != ".jsonc") continue;
            try {
                const auto tags = readJson(entry.path().string());
                if (tags.value("connection_id", std::string{}) == cid)
                    ownedFiles.push_back(entry.path());
            } catch (const std::exception &) {
                // A malformed canonical store still belongs to this connection.
                // Unreadable unrelated files must remain untouched.
                if (name == fs::path(cid + ".json") || name == fs::path(cid + ".jsonc"))
                    ownedFiles.push_back(entry.path());
            }
        }
    }
    for (const auto &path : ownedFiles) {
        std::error_code tagError;
        fs::remove(path, tagError);
        if (tagError) throw std::runtime_error("Failed to delete tag file " +
            path.filename().string() + ": " + tagError.message());
    }
}
