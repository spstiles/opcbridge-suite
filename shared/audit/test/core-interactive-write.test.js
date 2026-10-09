const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('core write routes enforce session and permission only for interactive requests', { timeout: 30000 }, t => {
  const repo = path.resolve(__dirname, '../../..');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opcbridge-write-guard-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = fs.readFileSync(path.join(repo, 'opcbridge/main.cpp'), 'utf8');
  const start = source.indexOf('            auto handle_tag_write =');
  const end = source.indexOf('\n\n\t            svr.Post("/reload"', start);
  assert.ok(start > 0 && end > start);
  const cpp = `
#include "httplib.h"
#include <nlohmann/json.hpp>
#include <cassert>
#include <atomic>
#include <mutex>
#include <thread>
#include <unordered_map>
using json = nlohmann::json;
struct AdminSessionInfo { std::string username; std::vector<std::string> groups; };
bool is_user_logged_in(const httplib::Request& req, AdminSessionInfo& session) {
  auto cookie = req.get_header_value("Cookie");
  if (cookie != "writer" && cookie != "reader") return false;
  session.username = cookie; session.groups = {cookie}; return true;
}
bool session_has_permission(const AdminSessionInfo& session, const std::string&) { return session.username == "writer"; }
bool is_admin_request(const httplib::Request& req) { return req.get_header_value("Cookie") == "admin"; }
struct TagConfig { std::string logical_name, datatype; bool enabled, writable; };
struct TagSnapshot { std::string datatype; };
struct Driver { struct { std::string id; } conn; struct Tag { TagConfig cfg; }; std::vector<Tag> tags; };
std::atomic<int> writes{0};
std::string make_tag_key(const std::string& a, const std::string& b) { return a + b; }
void ws_notify_tag_update(const TagSnapshot&, const TagConfig&) {}
bool write_tag_by_name(std::vector<Driver>&, const std::string&, const std::string&, const std::string&, std::unordered_map<std::string, TagSnapshot>&, std::mutex&, std::string*) { writes++; return true; }
int main() {
  httplib::Server svr;
  std::string writeToken = "machine-token";
  std::vector<Driver> drivers;
  std::unordered_map<std::string, TagSnapshot> tagTable;
  std::mutex driverMutex;
${source.slice(start, end)}
  int port = svr.bind_to_any_port("127.0.0.1"); assert(port > 0);
  std::thread server([&] { svr.listen_after_bind(); });
  httplib::Client client("127.0.0.1", port);
  auto send = [&](const std::string& route, const std::string& cookie, const std::string& token) {
    return client.Post(route, {{"Cookie", cookie}}, json({{"token", token}, {"connection_id", "memory"}, {"name", "Setpoint"}, {"value", "42"}}).dump(), "application/json");
  };
  auto result = send("/write", "", "machine-token"); assert(result && result->status == 200); assert(writes == 1);
  result = send("/write/interactive", "expired", "machine-token"); assert(result && result->status == 401); assert(writes == 1);
  result = send("/write/interactive", "service", "machine-token"); assert(result && result->status == 401); assert(writes == 1);
  result = send("/write/interactive", "reader", "machine-token"); assert(result && result->status == 403); assert(writes == 1);
  assert(json::parse(result->body)["authenticated_user"]["username"] == "reader");
  result = send("/write/interactive", "writer", "wrong"); assert(result && result->status == 403); assert(writes == 1);
  result = send("/write/interactive", "writer", "machine-token"); assert(result && result->status == 200); assert(writes == 2);
  assert(json::parse(result->body)["authenticated_user"]["username"] == "writer");
  result = send("/write", "admin", "wrong"); assert(result && result->status == 200); assert(writes == 3);
  svr.stop(); server.join();
}
`;
  const file = path.join(root, 'guard.cpp'); const binary = path.join(root, 'guard'); fs.writeFileSync(file, cpp);
  const compiled = spawnSync('g++', ['-std=c++17', '-pthread', '-I', path.join(repo, 'opcbridge'), file, '-o', binary], { encoding: 'utf8', timeout: 20000 });
  assert.equal(compiled.status, 0, compiled.stderr);
  const result = spawnSync(binary, [], { encoding: 'utf8', timeout: 5000 }); assert.equal(result.status, 0, result.stderr);
});
