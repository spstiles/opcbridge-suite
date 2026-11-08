#include "alarm_status_source.h"
#include <cassert>
int main() {
    using json = nlohmann::json;
    assert(alarm_status_source(json::object()).key() == "127.0.0.1:8085");
    assert(alarm_status_source(json::parse(R"({"alarms":{"host":"192.168.100.43","httpPort":9085}})")).key() == "192.168.100.43:9085");
    assert(alarm_status_source(json::parse(R"({"alarms":{"host":""},"opcbridge":{"host":"192.168.100.45"}})")).key() == "192.168.100.45:8085");
    assert(alarm_status_source(json::parse(R"({"alarms":{"httpPort":0}})")).port == 8085);
    bool invalid = false;
    try { alarm_status_source(json::parse(R"({"alarms":{"httpPort":70000}})")); } catch (...) { invalid = true; }
    assert(invalid);
}
