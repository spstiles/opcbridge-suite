#include "open62541.h"
#include <atomic>
#include <cassert>
#include <chrono>
#include <condition_variable>
#include <future>
#include <mutex>
#include <thread>

// Exercise the actual library operation lifecycle. An expired token must never
// complete a newer operation, even when passed that newer operation's pointer.
static std::mutex mutex;
static std::condition_variable changed;
static UA_DataValue *pending = nullptr;
static UA_UInt64 token = 0;
static UA_UInt64 verify(UA_Server *, const UA_ReadValueId *item, UA_Double,
                       UA_TimestampsToReturn, UA_DataValue *output) {
    if (item->nodeId.namespaceIndex != 1) return 0;
    std::lock_guard<std::mutex> lock(mutex);
    pending = output; ++token; changed.notify_all(); return token;
}
int main() {
    UA_Server *server = UA_Server_new();
    assert(server);
    auto *config = UA_Server_getConfig(server);
    assert(UA_ServerConfig_setMinimal(config, 14841, nullptr) == UA_STATUSCODE_GOOD);
    config->opcbridgeReadVerifier = verify;
    UA_VariableAttributes attr = UA_VariableAttributes_default;
    UA_Int32 initial = 0;
    UA_Variant_setScalar(&attr.value, &initial, &UA_TYPES[UA_TYPES_INT32]);
    attr.dataType = UA_TYPES[UA_TYPES_INT32].typeId;
    const auto node = UA_NODEID_NUMERIC(1, 50000);
    assert(UA_Server_addVariableNode(server, node, UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER),
        UA_NODEID_NUMERIC(0, UA_NS0ID_ORGANIZES), UA_QUALIFIEDNAME(1, const_cast<char *>("Probe")),
        UA_NODEID_NUMERIC(0, UA_NS0ID_BASEDATAVARIABLETYPE), attr, nullptr, nullptr) == UA_STATUSCODE_GOOD);
    assert(UA_Server_run_startup(server) == UA_STATUSCODE_GOOD);
    std::atomic<bool> stop{false};
    std::thread loop([&] { while (!stop) { UA_Server_run_iterate(server, false);
        std::this_thread::sleep_for(std::chrono::milliseconds(1)); } });
    UA_UInt64 previous = 0;
    for (UA_Int32 expected : {42, 43}) {
        auto client = std::async(std::launch::async, [&] {
            auto *c = UA_Client_new(); UA_ClientConfig_setDefault(UA_Client_getConfig(c));
            assert(UA_Client_connect(c, "opc.tcp://127.0.0.1:14841") == UA_STATUSCODE_GOOD);
            UA_Variant value; UA_Variant_init(&value);
            assert(UA_Client_readValueAttribute(c, node, &value) == UA_STATUSCODE_GOOD);
            assert(UA_Variant_hasScalarType(&value, &UA_TYPES[UA_TYPES_INT32]));
            const auto result = *static_cast<UA_Int32 *>(value.data);
            UA_Variant_clear(&value); UA_Client_disconnect(c); UA_Client_delete(c); return result;
        });
        UA_DataValue *output;
        UA_UInt64 current;
        {
            std::unique_lock<std::mutex> lock(mutex);
            assert(changed.wait_for(lock, std::chrono::seconds(5), [&] { return token != previous; }));
            output = pending; current = token;
        }
        UA_DataValue result; UA_DataValue_init(&result);
        result.hasValue = true;
        UA_Variant_setScalarCopy(&result.value, &expected, &UA_TYPES[UA_TYPES_INT32]);
        assert(UA_Server_opcbridgeCompleteRead(server, output, previous, &result) == UA_STATUSCODE_BADNOTFOUND);
        assert(client.wait_for(std::chrono::milliseconds(10)) == std::future_status::timeout);
        assert(UA_Server_opcbridgeCompleteRead(server, output, current, &result) == UA_STATUSCODE_GOOD);
        assert(client.get() == expected);
        assert(UA_Server_opcbridgeCompleteRead(server, output, current, &result) == UA_STATUSCODE_BADNOTFOUND);
        UA_DataValue_clear(&result); previous = current;
    }
    stop = true; loop.join(); UA_Server_run_shutdown(server); UA_Server_delete(server);
}
