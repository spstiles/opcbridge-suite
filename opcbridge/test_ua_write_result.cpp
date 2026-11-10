#define main opcbridge_application_main
#include "main.cpp"
#undef main
#include <cassert>

int main() {
    UA_Server *server = UA_Server_new();
    assert(UA_ServerConfig_setMinimal(UA_Server_getConfig(server), 48489, nullptr) == UA_STATUSCODE_GOOD);
    UA_Server_addNamespace(server, "urn:opcbridge:write-result-test");
    std::vector<DriverContext> drivers(1);
    auto &driver = drivers.front();
    driver.conn.id = "Test";
    driver.conn.driver = "ab_eip";
    TagRuntime memory;
    memory.cfg.logical_name = "Reset";
    memory.cfg.source_type = "memory";
    memory.cfg.datatype = "int32";
    memory.cfg.writable = true;
    memory.cfg.enabled = true;
    memory.cfg.log_event_on_change = false;
    driver.tags.push_back(memory);
    TagRuntime failed = memory;
    failed.cfg.logical_name = "UnavailablePLC";
    failed.cfg.source_type = "plc";
    failed.handle = PLCTAG_ERR_NOT_FOUND;
    failed.handle_deferred = true;
    driver.tags.push_back(failed);
    TagTable table;
    std::mutex mutex;
    g_mqttDrivers = &drivers; g_mqttTagTable = &table; g_mqttDriverMutex = &mutex;
    std::deque<UaTagBinding> bindings;
    std::string error;
    for (auto &tag : driver.tags) {
        assert(ua_add_tag_variable_node(server, UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER), bindings, driver.conn, tag, error));
        auto snapshot = make_initial_snapshot_for_opcua(driver.conn, tag);
        snapshot.datatype = "int32"; snapshot.value = int32_t(7); snapshot.quality = 1;
        table[make_tag_key(driver.conn.id, tag.cfg.logical_name)] = snapshot;
        assert(ua_write_snapshot(server, bindings.back().nodeId, snapshot, UA_STATUSCODE_GOOD) == UA_STATUSCODE_GOOD);
    }
    assert(UA_Server_run_startup(server) == UA_STATUSCODE_GOOD);
    std::atomic<bool> running{true};
    std::thread worker([&] { while (running) UA_Server_run_iterate(server, false); });
    // Exercise the same temporary-client forwarding path used by a second installation.
    std::vector<DriverContext> remote(1);
    remote[0].conn.id = "Remote";
    remote[0].conn.driver = "opcua_client";
    remote[0].conn.opcua_endpoint = "opc.tcp://127.0.0.1:48489";
    TagTable remoteTable; std::mutex remoteMutex;
    for (const auto &binding : bindings) {
        TagRuntime tag = memory;
        tag.cfg.source_type = "plc";
        tag.cfg.logical_name = binding.logical_name;
        tag.cfg.plc_tag_name = "ns=1;s=" + ua_tag_nodeid_string("Test", binding.logical_name);
        remote[0].tags.push_back(tag);
    }
    assert(write_tag_by_name(remote, "Remote", "Reset", "1", remoteTable, remoteMutex, &error));
    assert(std::get<int32_t>(table.at(make_tag_key("Test", "Reset")).value) == 1);
    assert(write_tag_by_name(remote, "Remote", "Reset", "0", remoteTable, remoteMutex, &error));
    assert(std::get<int32_t>(table.at(make_tag_key("Test", "Reset")).value) == 0);
    assert(!write_tag_by_name(remote, "Remote", "UnavailablePLC", "1", remoteTable, remoteMutex, &error));
    assert(error.find("BadNoCommunication") != std::string::npos);
    assert(remoteTable.find(make_tag_key("Remote", "UnavailablePLC")) == remoteTable.end());
    running = false; worker.join();
    // Failed writes cannot replace the last measured UA value with the request.
    UA_Variant value; UA_Variant_init(&value);
    assert(UA_Server_readValue(server, bindings[1].nodeId, &value) == UA_STATUSCODE_BADWAITINGFORINITIALDATA);
    assert(!bindings[1].ua_value->hasValue);
    UA_Variant_clear(&value);
    // Reinstalling after a configuration refresh retains cached data.
    assert(ua_install_write_source(server, bindings[0]) == UA_STATUSCODE_GOOD);
    assert(UA_Server_readValue(server, bindings[0].nodeId, &value) == UA_STATUSCODE_GOOD);
    assert(*static_cast<UA_Int32*>(value.data) == 0);
    UA_Variant_clear(&value);
    bindings[0].writable = false;
    UA_NodeId session = UA_NODEID_NUMERIC(1, 123);
    UA_DataValue request; UA_DataValue_init(&request);
    UA_Int32 one = 1; UA_Variant_setScalar(&request.value, &one, &UA_TYPES[UA_TYPES_INT32]); request.hasValue = true;
    assert(opcua_onWrite(server, &session, nullptr, &bindings[0].nodeId, &bindings[0], nullptr, &request) == UA_STATUSCODE_BADNOTWRITABLE);
    UA_Server_run_shutdown(server); UA_Server_delete(server);
    g_mqttDrivers = nullptr; g_mqttTagTable = nullptr; g_mqttDriverMutex = nullptr;
}
