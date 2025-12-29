#ifndef OPCBRIDGE_WS_H
#define OPCBRIDGE_WS_H

#include <cstdint>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// Forward declarations – real definitions live in main.cpp
struct TagSnapshot;
struct TagConfig;
struct AlarmRuntime;

// Lifecycle
bool ws_init(uint16_t port);
void ws_shutdown();
bool ws_is_enabled();

// Low-level: send JSON to all connected WS clients
void ws_send_json(const json &msg);

// High-level helpers – implemented in main.cpp (they *know* the structs)
void ws_notify_tag_update(const TagSnapshot &snap,
                          const TagConfig &cfg);

void ws_notify_alarm_event(const AlarmRuntime &alarm,
                           const TagSnapshot &snap,
                           const std::string &state);

void ws_notify_event_log_row(const TagSnapshot *prevSnap,
                             const TagSnapshot &snap);

#endif
