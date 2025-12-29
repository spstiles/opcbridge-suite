// ws.cpp - ixWebSocket-based server for opcbridge
//
// This file knows nothing about TagSnapshot / TagConfig / AlarmRuntime.
// It only exposes:
//   - ws_init(uint16_t port)
//   - ws_shutdown()
//   - ws_is_enabled()
//   - ws_send_json(const json&)

#include "ws.h"

#include <ixwebsocket/IXWebSocketServer.h>
#include <iostream>
#include <memory>
#include <mutex>
#include <unordered_map>
#include <unordered_set>
#include <string>
#include <vector>

using ix::WebSocketServer;
using nlohmann::json;

static std::shared_ptr<WebSocketServer> g_wsServer;
static std::mutex g_wsMutex;
static bool g_wsEnabled = false;

struct ClientSubs
{
    bool subscribe_all = true; // backward compatible default
    bool has_custom = false;
    std::unordered_set<std::string> tags;
};

static std::unordered_map<std::string, std::weak_ptr<ix::WebSocket>> g_clientsById;
static std::unordered_map<std::string, ClientSubs> g_subsById;

static void ws_forget_client_locked(const std::string &id)
{
    g_clientsById.erase(id);
    g_subsById.erase(id);
}

bool ws_init(uint16_t port)
{
    std::lock_guard<std::mutex> lock(g_wsMutex);

    if (g_wsServer) {
        std::cerr << "[ws] WebSocket server already initialized.\n";
        g_wsEnabled = true;
        return true;
    }

    // Listen on all interfaces
    g_wsServer = std::make_shared<WebSocketServer>(port, "0.0.0.0");

    g_wsServer->setOnConnectionCallback(
        [](std::weak_ptr<ix::WebSocket> webSocketWeak,
           std::shared_ptr<ix::ConnectionState> connectionState)
        {
            if (!connectionState) return;
            const std::string id = connectionState->getId();

            auto webSocket = webSocketWeak.lock();
            if (!webSocket) return;

            {
                std::lock_guard<std::mutex> lock(g_wsMutex);
                g_clientsById[id] = webSocketWeak;
                auto &subs = g_subsById[id];
                subs.subscribe_all = true;
                subs.has_custom = false;
                subs.tags.clear();
            }

            // ixwebsocket requires registering a per-connection onMessage callback
            // inside the onConnection callback.
            webSocket->setOnMessageCallback(
                [connectionState](const ix::WebSocketMessagePtr & msg)
                {
                    if (!msg) return;

                    if (msg->type == ix::WebSocketMessageType::Open)
                    {
                        std::cout << "[ws] client OPEN from "
                                  << (connectionState ? connectionState->getRemoteIp() : "?")
                                  << "\n";
                        std::cout << "      uri: " << msg->openInfo.uri << "\n";
                    }
                    else if (msg->type == ix::WebSocketMessageType::Close)
                    {
                        std::cout << "[ws] client CLOSE code="
                                  << msg->closeInfo.code
                                  << " reason=" << msg->closeInfo.reason << "\n";

                        if (connectionState) {
                            std::lock_guard<std::mutex> lock(g_wsMutex);
                            ws_forget_client_locked(connectionState->getId());
                        }
                    }
                    else if (msg->type == ix::WebSocketMessageType::Error)
                    {
                        std::cerr << "[ws] client ERROR: "
                                  << msg->errorInfo.reason << "\n";
                    }
                    else if (msg->type == ix::WebSocketMessageType::Message)
                    {
                        // Optional subscription support:
                        // Client may send:
                        //   {"type":"subscribe","tags":["conn:Tag1", ...]}
                        //   {"type":"subscribe_all"}
                        json j;
                        try {
                            j = json::parse(msg->str);
                        } catch (...) {
                            return;
                        }

                        if (!j.is_object() || !j.contains("type") || !j["type"].is_string()) {
                            return;
                        }

                        const std::string t = j["type"].get<std::string>();
                        if (!connectionState) return;
                        const std::string cid = connectionState->getId();

                        std::lock_guard<std::mutex> lock(g_wsMutex);
                        auto &subs = g_subsById[cid];

                        if (t == "subscribe_all") {
                            subs.subscribe_all = true;
                            subs.has_custom = false;
                            subs.tags.clear();
                            return;
                        }

                        if (t == "subscribe") {
                            subs.subscribe_all = false;
                            subs.has_custom = true;
                            subs.tags.clear();
                            if (j.contains("tags") && j["tags"].is_array()) {
                                for (const auto &it : j["tags"]) {
                                    if (it.is_string()) subs.tags.insert(it.get<std::string>());
                                }
                            }
                            return;
                        }
                    }
                }
            );
        }
    );

    auto res = g_wsServer->listen();
    if (!res.first)
    {
        std::cerr << "[ws] listen failed on port " << port
                  << ": " << res.second << "\n";
        g_wsServer.reset();
        g_wsEnabled = false;
        return false;
    }

    // Optional: slightly less CPU on small boxes
    g_wsServer->disablePerMessageDeflate();

    g_wsServer->start();
    g_wsEnabled = true;

    std::cout << "[ws] WebSocket server listening on ws://0.0.0.0:"
              << port << "\n";
    return true;
}

void ws_shutdown()
{
    std::lock_guard<std::mutex> lock(g_wsMutex);

    if (g_wsServer) {
        std::cout << "[ws] stopping WebSocket server...\n";
        g_wsServer->stop();
        g_wsServer.reset();
    }

    g_wsEnabled = false;
    g_clientsById.clear();
    g_subsById.clear();
    std::cout << "[ws] shutdown complete\n";
}

bool ws_is_enabled()
{
    std::lock_guard<std::mutex> lock(g_wsMutex);
    return g_wsEnabled && static_cast<bool>(g_wsServer);
}

void ws_send_json(const json &msg)
{
    std::lock_guard<std::mutex> lock(g_wsMutex);

    if (!g_wsEnabled || !g_wsServer) {
        return;
    }

    const std::string payload = msg.dump();

    std::string type;
    if (msg.contains("type") && msg["type"].is_string()) {
        type = msg["type"].get<std::string>();
    }

    std::string key;
    if (type == "tag_update") {
        if (msg.contains("key") && msg["key"].is_string()) {
            key = msg["key"].get<std::string>();
        } else if (msg.contains("connection_id") && msg.contains("name") &&
                   msg["connection_id"].is_string() && msg["name"].is_string()) {
            key = msg["connection_id"].get<std::string>() + ":" + msg["name"].get<std::string>();
        }
    }

    for (auto it = g_clientsById.begin(); it != g_clientsById.end(); ) {
        const std::string id = it->first;
        auto ws = it->second.lock();
        if (!ws) {
            g_subsById.erase(id);
            it = g_clientsById.erase(it);
            continue;
        }

        if (type == "tag_update") {
            auto sit = g_subsById.find(id);
            if (sit != g_subsById.end()) {
                const ClientSubs &subs = sit->second;
                if (subs.has_custom && !subs.subscribe_all) {
                    if (key.empty() || subs.tags.find(key) == subs.tags.end()) {
                        ++it;
                        continue;
                    }
                }
            }
        }

        ws->send(payload, false); // text frame
        ++it;
    }
}
