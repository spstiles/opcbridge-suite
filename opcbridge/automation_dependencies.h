#pragma once
#include <cctype>
#include <set>
#include <string>
#include <vector>

struct AutomationDependencies {
    bool complete = true;
    std::string reason = "literal_dependencies";
    std::set<std::pair<std::string, std::string>> reads;
    void uncertain(const std::string &why) {
        if (complete) reason = why;
        complete = false;
    }
};

// A deliberately restricted lexical proof, not JavaScript execution. All read
// calls in every branch must use literal arguments. Unsupported constructs retain
// the broad fallback. Strings/comments are tokens, never searched with regexes.
inline AutomationDependencies automation_read_dependencies(const std::string &source) {
    struct Token { std::string text; bool literal = false; bool escaped = false; };
    std::vector<Token> tokens;
    AutomationDependencies result;
    auto ident = [](unsigned char ch) { return std::isalnum(ch) || ch == '_' || ch == '$'; };
    std::vector<char> delimiters;
    for (size_t i = 0; i < source.size();) {
        const unsigned char ch = source[i];
        if (std::isspace(ch)) { ++i; continue; }
        if (ch == '/' && i + 1 < source.size() && source[i + 1] == '/') {
            while (i < source.size() && source[i] != '\n') ++i;
            continue;
        }
        if (ch == '/' && i + 1 < source.size() && source[i + 1] == '*') {
            const auto close = source.find("*/", i + 2);
            if (close == std::string::npos) { result.uncertain("unterminated_comment"); return result; }
            i = close + 2; continue;
        }
        if (ch == '\'' || ch == '"') {
            const char quote = ch;
            Token token; token.literal = true;
            ++i; bool closed = false;
            while (i < source.size()) {
                char c = source[i++];
                if (c == quote) { closed = true; break; }
                if (c == '\\') {
                    token.escaped = true;
                    if (i >= source.size()) break;
                    token.text += c; token.text += source[i++];
                } else {
                    if (c == '\n' || c == '\r') result.uncertain("multiline_string");
                    token.text += c;
                }
            }
            if (!closed) { result.uncertain("unterminated_string"); return result; }
            tokens.push_back(std::move(token)); continue;
        }
        if (std::isalpha(ch) || ch == '_' || ch == '$') {
            const size_t start = i++;
            while (i < source.size() && ident(static_cast<unsigned char>(source[i]))) ++i;
            tokens.push_back({source.substr(start, i - start), false, false}); continue;
        }
        if (std::isdigit(ch)) {
            const size_t start = i++;
            while (i < source.size() && (std::isdigit(static_cast<unsigned char>(source[i])) || source[i] == '.')) ++i;
            tokens.push_back({source.substr(start, i - start), false, false}); continue;
        }
        if (ch == '`' || ch == '[' || ch == ']' || ch == '.' || ch == '\\' || ch == '/' || ch >= 128)
            result.uncertain("unsupported_syntax");
        if (ch == '(' || ch == '{') delimiters.push_back(ch);
        if (ch == ')' || ch == '}') {
            const char expected = ch == ')' ? '(' : '{';
            if (delimiters.empty() || delimiters.back() != expected) result.uncertain("unbalanced_delimiters");
            else delimiters.pop_back();
        }
        tokens.push_back({std::string(1, ch), false, false}); ++i;
    }
    if (!delimiters.empty()) result.uncertain("unbalanced_delimiters");
    static const std::set<std::string> pure = {"json", "hasjson", "jsonobj", "jsonset", "jsonarray",
        "str", "num", "number", "bool", "concat", "lower", "upper", "trim", "contains",
        "startswith", "endswith", "bit", "bits", "map", "clamp", "round", "min", "max"};
    static const std::set<std::string> unsupported = {"function", "class", "new", "eval", "while", "for", "import", "yield", "await"};
    for (size_t i = 0; i < tokens.size(); ++i) {
        if (tokens[i].literal) continue;
        std::string name = tokens[i].text;
        for (auto &c : name) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
        if (unsupported.count(name)) result.uncertain("unsupported_construct");
        const bool call = i + 1 < tokens.size() && !tokens[i + 1].literal && tokens[i + 1].text == "(";
        const bool helper = name == "tag" || name == "quality" || name == "hastag" || name == "settag";
        if (helper && !call) { result.uncertain("indirect_tag_helper"); continue; }
        if (!call || name.empty() || !(std::isalpha(static_cast<unsigned char>(name[0])) || name[0] == '_' || name[0] == '$')) continue;
        if (name == "if" || pure.count(name)) continue;
        if (!helper) { result.uncertain("unknown_function"); continue; }
        // Require literal connection and tag, with no concatenation/coercion.
        if (i + 5 >= tokens.size() || !tokens[i + 2].literal || tokens[i + 2].escaped ||
            tokens[i + 3].literal || tokens[i + 3].text != "," ||
            !tokens[i + 4].literal || tokens[i + 4].escaped || tokens[i + 5].literal ||
            tokens[i + 5].text != (name == "settag" ? "," : ")")) {
            result.uncertain("dynamic_or_escaped_tag_reference"); continue;
        }
        const auto &cid = tokens[i + 2].text, &tag = tokens[i + 4].text;
        if (cid.empty() || tag.empty()) { result.uncertain("empty_tag_reference"); continue; }
        // hasTag is discovery, and setTag's destination is write-only. Continue
        // scanning its value expression so nested tag()/quality() inputs count.
        if ((name == "tag" || name == "quality") && cid != "_system") result.reads.emplace(cid, tag);
    }
    return result;
}
