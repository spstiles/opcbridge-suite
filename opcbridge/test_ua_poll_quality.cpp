#define main opcbridge_application_main
#include "main.cpp"
#undef main
#include <cassert>

int main() {
    UA_Server *server = UA_Server_new();
    UA_ServerConfig_setDefault(UA_Server_getConfig(server));
    UA_Server_addNamespace(server, "urn:opcbridge:quality-test");
    // Folder labels follow configuration; identity survives rename and duplicates.
    ConnectionConfig folder; folder.id = "connection_random"; folder.name = "B125";
    const UA_NodeId parent = UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER);
    UA_NodeId first = ua_ensure_connection_object(server, parent, folder);
    auto expectLabel = [&](const UA_NodeId &node, const std::string &expected, const std::string &expectedBrowse = "") {
        UA_LocalizedText label; UA_LocalizedText_init(&label);
        UA_QualifiedName browse; UA_QualifiedName_init(&browse);
        assert(UA_Server_readDisplayName(server, node, &label) == UA_STATUSCODE_GOOD);
        assert(UA_Server_readBrowseName(server, node, &browse) == UA_STATUSCODE_GOOD);
        assert(std::string(reinterpret_cast<char*>(label.text.data), label.text.length) == expected);
        assert(std::string(reinterpret_cast<char*>(browse.name.data), browse.name.length) == (expectedBrowse.empty() ? expected : expectedBrowse));
        UA_LocalizedText_clear(&label); UA_QualifiedName_clear(&browse);
    };
    expectLabel(first, "B125");
    assert(std::string(reinterpret_cast<char*>(first.identifier.string.data), first.identifier.string.length)
           == "Connections/connection_random");
    folder.name = "Renamed PLC";
    UA_NodeId renamed = ua_ensure_connection_object(server, parent, folder);
    assert(UA_NodeId_equal(&first, &renamed)); expectLabel(renamed, folder.name, "B125");
    folder.id = "connection_other";
    UA_NodeId duplicate = ua_ensure_connection_object(server, parent, folder);
    assert(!UA_NodeId_equal(&first, &duplicate)); expectLabel(duplicate, folder.name);
    folder.id = "micro"; folder.name.clear();
    UA_NodeId fallback = ua_ensure_connection_object(server, parent, folder);
    expectLabel(fallback, "micro");
    folder.id = "_memory"; folder.name = "Custom memory";
    UA_NodeId memory = ua_ensure_connection_object(server, parent, folder);
    expectLabel(memory, "Memory");
    for (auto node : {&first, &renamed, &duplicate, &fallback, &memory}) UA_NodeId_clear(node);
    DriverContext driver; driver.conn.id = "PLC"; driver.conn.driver = "ab_eip";
    TagRuntime tag; tag.handle = 1; tag.cfg.logical_name = "Value"; tag.cfg.datatype = "int32";
    std::deque<UaTagBinding> bindings;
    std::string error;
    assert(ua_add_tag_variable_node(server, UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER),
        bindings, driver.conn, tag, error));
    auto &binding = bindings.back();
    auto read = [&] {
        UA_ReadValueId item; UA_ReadValueId_init(&item);
        item.nodeId = binding.nodeId; item.attributeId = UA_ATTRIBUTEID_VALUE;
        return UA_Server_read(server, &item, UA_TIMESTAMPSTORETURN_BOTH);
    };
    auto expect = [&](UA_StatusCode status, bool hasValue) {
        auto result = read();
        assert(result.status == status);
        // open62541 marks successful attribute reads hasValue even for a Null Variant.
        assert((result.value.type != nullptr) == hasValue);
        if (hasValue) {
            assert(result.hasSourceTimestamp && result.hasServerTimestamp);
            assert(*static_cast<UA_Int32 *>(result.value.data) == 42);
        }
        UA_DataValue_clear(&result);
    };
    ua_restart_read_gate(server, binding, driver, tag);
    expect(UA_STATUSCODE_BADWAITINGFORINITIALDATA, false);
    TagSnapshot snapshot = make_initial_snapshot_for_opcua(driver.conn, tag);
    snapshot.quality = 1; snapshot.value = int32_t(42);
    const auto before = PollReadStamp::Clock::now();
    snapshot.poll_read = {before, before, driver.freshness_epoch};
    binding.read_gate.restart(driver.freshness_epoch, before + std::chrono::milliseconds(1));
    assert(ua_write_snapshot(server, binding.nodeId, snapshot, ua_snapshot_status(binding, snapshot)) == UA_STATUSCODE_GOOD);
    expect(UA_STATUSCODE_BADWAITINGFORINITIALDATA, false); // In-flight read began before wake.
    const auto now = PollReadStamp::Clock::now();
    binding.read_gate.restart(driver.freshness_epoch, now);
    snapshot.poll_read = {now, now, driver.freshness_epoch};
    ua_write_snapshot(server, binding.nodeId, snapshot, ua_snapshot_status(binding, snapshot));
    expect(UA_STATUSCODE_GOOD, true);
    const auto sourceMicros = std::chrono::duration_cast<std::chrono::microseconds>(snapshot.timestamp.time_since_epoch()).count();
    auto result = read();
    assert(result.sourceTimestamp == UA_DATETIME_UNIX_EPOCH + sourceMicros * UA_DATETIME_USEC);
    UA_DataValue_clear(&result);
    snapshot.quality = 0;
    ua_write_snapshot(server, binding.nodeId, snapshot, ua_snapshot_status(binding, snapshot));
    expect(UA_STATUSCODE_BADNOCOMMUNICATION, false);
    snapshot.quality = 1;
    binding.read_gate.suspend();
    ua_write_snapshot(server, binding.nodeId, snapshot, ua_snapshot_status(binding, snapshot));
    expect(UA_STATUSCODE_BADOUTOFSERVICE, false);
    binding.read_gate.resume();
    ua_write_snapshot(server, binding.nodeId, snapshot, ua_snapshot_status(binding, snapshot));
    expect(UA_STATUSCODE_BADWAITINGFORINITIALDATA, false);
    const auto resumed = PollReadStamp::Clock::now();
    snapshot.poll_read = {resumed, resumed, driver.freshness_epoch};
    ua_write_snapshot(server, binding.nodeId, snapshot, ua_snapshot_status(binding, snapshot));
    expect(UA_STATUSCODE_GOOD, true);
    binding.read_gate.restart(driver.freshness_epoch + 1, now);
    ua_write_snapshot(server, binding.nodeId, snapshot, ua_snapshot_status(binding, snapshot));
    expect(UA_STATUSCODE_BADWAITINGFORINITIALDATA, false); // Old driver cannot restore GOOD.
    std::vector<DriverContext> owners(1);
    owners[0].conn.id = "PLC";
    UaUpdate publication{"PLC", "Value", snapshot, owners[0].freshness_epoch};
    assert(ua_publication_is_current(owners, publication));
    ++owners[0].freshness_epoch;
    assert(!ua_publication_is_current(owners, publication));
    publication.driver_epoch = owners[0].freshness_epoch;
    publication.snapshot.quality = 0; // Bad statuses are also generation-owned.
    assert(ua_publication_is_current(owners, publication));
    owners.clear();
    assert(!ua_publication_is_current(owners, publication));
    UA_NodeId_clear(&binding.nodeId);
    UA_Server_delete(server);
    std::cout << "UA polling quality tests passed\n";
}
