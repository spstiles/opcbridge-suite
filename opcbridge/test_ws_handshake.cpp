/* Build/run from the repository root:
g++ -std=c++17 -pthread -Iopcbridge -I/usr/local/include \
  opcbridge/test_ws_handshake.cpp opcbridge/ws.cpp -L/usr/local/lib \
  -lixwebsocket -lssl -lcrypto -lz -o /tmp/test_ws_handshake
/tmp/test_ws_handshake
*/
#include "ws.h"
#include <arpa/inet.h>
#include <sys/socket.h>
#include <unistd.h>
#include <atomic>
#include <chrono>
#include <iostream>
#include <stdexcept>
#include <thread>

using namespace std::chrono_literals;

static void require(bool condition, const char *message) {
    if (!condition) throw std::runtime_error(message);
}

static int connect_client(uint16_t port) {
    const int client = socket(AF_INET, SOCK_STREAM, 0);
    require(client >= 0, "socket failed");
    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    address.sin_port = htons(port);
    if (connect(client, reinterpret_cast<sockaddr *>(&address), sizeof(address))) {
        close(client);
        throw std::runtime_error("connect failed");
    }
    return client;
}

static uint16_t unused_port() {
    const int fd = socket(AF_INET, SOCK_STREAM, 0);
    require(fd >= 0, "port reservation failed");
    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    require(bind(fd, reinterpret_cast<sockaddr *>(&address), sizeof(address)) == 0, "bind failed");
    socklen_t size = sizeof(address);
    require(getsockname(fd, reinterpret_cast<sockaddr *>(&address), &size) == 0, "getsockname failed");
    const auto port = ntohs(address.sin_port);
    close(fd);
    return port;
}

int main() {
    std::atomic<bool> running{true};
    std::thread publisher;
    int client = -1;
    try {
        const auto port = unused_port();
        require(ws_init(port), "server failed to start");
        publisher = std::thread([&] {
            int value = 0;
            while (running) {
                ws_send_json({{"type", "tag_update"}, {"connection_id", "_memory"},
                              {"name", "Rotation_Index"}, {"value", value++}});
                std::this_thread::sleep_for(2ms);
            }
        });
        // Exercise new connections and reconnects while live tags are changing.
        // A delayed upgrade exposes the pre-handshake registration race reliably.
        for (const auto delay : {0ms, 50ms, 200ms}) {
            client = connect_client(port);
            std::this_thread::sleep_for(delay);
            const std::string request =
                "GET / HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\n"
                "Connection: Upgrade\r\nSec-WebSocket-Version: 13\r\n"
                "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n";
            require(send(client, request.data(), request.size(), MSG_NOSIGNAL) ==
                        static_cast<ssize_t>(request.size()), "handshake send failed");
            std::string received;
            const auto deadline = std::chrono::steady_clock::now() + 2s;
            size_t updates = 0;
            while (std::chrono::steady_clock::now() < deadline && updates < 3) {
                char buffer[8192];
                const auto count = recv(client, buffer, sizeof(buffer), MSG_DONTWAIT);
                if (count > 0) received.append(buffer, count);
                updates = 0;
                for (size_t at = 0; (at = received.find("\"type\":\"tag_update\"", at)) != std::string::npos; ++at) ++updates;
                std::this_thread::sleep_for(5ms);
            }
            require(received.find("HTTP/1.1 101") == 0, "WebSocket did not open");
            require(updates >= 3, "open WebSocket lost live tag delivery during handshake");
            require(ws_demand_snapshot()["all_tags_clients"] == 1, "open viewer missing from demand registry");
            close(client);
            client = -1;
            for (int i = 0; i < 100 && ws_demand_snapshot()["all_tags_clients"] != 0; ++i)
                std::this_thread::sleep_for(5ms);
            require(ws_demand_snapshot()["all_tags_clients"] == 0, "closed viewer was not cleaned up");
        }
        running = false;
        publisher.join();
        ws_shutdown();
        std::cout << "WebSocket handshake delivery and reconnect cleanup passed\n";
        return 0;
    } catch (const std::exception &error) {
        if (client >= 0) close(client);
        running = false;
        if (publisher.joinable()) publisher.join();
        ws_shutdown();
        std::cerr << error.what() << '\n';
        return 1;
    }
}
