#define main opcbridge_application_main
#include "main.cpp"
#undef main
#include <cassert>

int main() {
    assert(g_activePollTestConnections.empty());
    DriverContext policyDriver; policyDriver.conn.id = "Default"; policyDriver.conn.driver = "ab_eip";
    assert(active_poll_test_enabled(policyDriver, false));
    policyDriver.conn.poll_active_only = false;
    policyDriver.conn.poll_active_only_configured = true;
    assert(!active_poll_test_enabled(policyDriver, false));
    policyDriver.conn.poll_active_only = true;
    assert(active_poll_test_enabled(policyDriver, false));
    assert(!active_poll_test_enabled(policyDriver, true));
    policyDriver.tags.emplace_back(); policyDriver.tags.back().cfg.writable = true;
    assert(active_poll_test_enabled(policyDriver, false));
    policyDriver.tags.clear(); policyDriver.conn.driver = "modbus_tcp";
    assert(!active_poll_test_enabled(policyDriver, false));
    {
        std::vector<DriverContext> writeDrivers(1);
        auto &owner = writeDrivers.front(); owner.conn.id = "WriteTest"; owner.conn.driver = "ab_eip";
        TagRuntime output; output.cfg.logical_name = "Output"; output.cfg.datatype = "int32"; output.cfg.writable = true;
        TagRuntime alias; alias.cfg.logical_name = "Alias"; alias.cfg.source_tag = "Output"; alias.cfg.datatype = "int32";
        owner.tags.push_back(output); owner.tags.push_back(alias);
        TagTable cache; std::mutex mutex;
        const auto old = PollReadStamp::Clock::now();
        TagSnapshot sample; sample.connection_id = owner.conn.id; sample.logical_name = "Output";
        sample.quality = 1; sample.value = int32_t(7); sample.poll_read = {old, old, owner.freshness_epoch};
        cache[make_tag_key(owner.conn.id, "Output")] = sample;
        request_write_readback(writeDrivers, owner.conn.id, "Alias", owner.freshness_epoch, cache, mutex);
        assert(cache.at(make_tag_key(owner.conn.id, "Output")).quality == 0);
        assert(cache.at(make_tag_key(owner.conn.id, "Alias")).polling_state == PollCacheState::Waiting);
        assert(owner.poll_gates.at("Output").quality(sample.poll_read, true) == PollReadGate::Quality::Waiting);
        const auto after = PollReadStamp::Clock::now();
        sample.poll_read = {after, after, owner.freshness_epoch};
        assert(owner.poll_gates.at("Output").quality(sample.poll_read, true) == PollReadGate::Quality::Good);
        cache[make_tag_key(owner.conn.id, "Output")] = sample;
        request_write_readback(writeDrivers, owner.conn.id, "Output", owner.freshness_epoch + 1, cache, mutex);
        assert(cache.at(make_tag_key(owner.conn.id, "Output")).quality == 1);
        std::string writeError;
        assert(!write_tag_by_name(writeDrivers, owner.conn.id, "Output", "9", cache, mutex,
                                 &writeError, nullptr, owner.freshness_epoch + 1));
        assert(writeError.find("configuration changed") != std::string::npos);
        assert(cache.at(make_tag_key(owner.conn.id, "Output")).quality == 1);
    }
    UA_Server *server = UA_Server_new();
    UA_ServerConfig_setDefault(UA_Server_getConfig(server));
    UA_Server_addNamespace(server, "urn:opcbridge:quality-test");
    // An unchanged Kraft-like reload must retain all 70 derived nodes, not
    // mistake their lack of physical handles for removal from configuration.
    {
        g_uaServer = server;
        g_uaBridgeNodeId = UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER);
        DriverContext kraft; kraft.conn.id = "ReloadKraft"; kraft.conn.driver = "modbus_tcp";
        for (int i = 0; i < 16; ++i) {
            TagRuntime source; source.handle = 1; source.cfg.logical_name = "Source" + std::to_string(i);
            source.cfg.datatype = "int16"; kraft.tags.push_back(source);
        }
        for (int i = 0; i < 70; ++i) {
            TagRuntime derived; derived.cfg.logical_name = "Derived" + std::to_string(i);
            derived.cfg.source_tag = "Source0"; derived.cfg.datatype = "int16";
            kraft.tags.push_back(derived);
        }
        OpcUaSyncResult result; std::string error;
        assert(sync_opcua_connection_nodes(kraft, result, error));
        assert(result.added == 86 && result.retired == 0 && !result.full_rebuild_required);
        for (int repeat = 0; repeat < 2; ++repeat) {
            assert(sync_opcua_connection_nodes(kraft, result, error));
            assert(result.updated == 86 && result.retired == 0 && !result.full_rebuild_required);
            for (const auto &binding : g_uaBindings) assert(!binding.retired);
        }
        // Genuine removal still retires the removed node and requests cleanup.
        kraft.tags.pop_back();
        assert(sync_opcua_connection_nodes(kraft, result, error));
        assert(result.retired == 1 && !result.full_rebuild_required);
        UA_NodeClass removedClass;
        assert(UA_Server_readNodeClass(server, UA_NODEID_STRING(1, const_cast<char*>("Tags/ReloadKraft/Derived69")), &removedClass) == UA_STATUSCODE_BADNODEIDUNKNOWN);
        kraft.tags[0].cfg.enabled = false;
        assert(sync_opcua_connection_nodes(kraft, result, error));
        assert(result.retired == 1 && !result.full_rebuild_required);
        assert(UA_Server_readNodeClass(server, UA_NODEID_STRING(1, const_cast<char*>("Tags/ReloadKraft/Source0")), &removedClass) == UA_STATUSCODE_BADNODEIDUNKNOWN);
        kraft.tags[0].cfg.enabled = true;
        assert(sync_opcua_connection_nodes(kraft, result, error));
        assert(result.added == 1 && !result.full_rebuild_required);
        DriverContext remote; remote.conn.id = "ReloadRemote"; remote.conn.driver = "opcua_client";
        TagRuntime input; input.cfg.logical_name = "RemoteValue"; input.cfg.datatype = "int32";
        remote.tags.push_back(input);
        assert(sync_opcua_connection_nodes(remote, result, error));
        assert(result.added == 1 && !result.full_rebuild_required);
        assert(sync_opcua_connection_nodes(remote, result, error));
        assert(result.updated == 1 && result.retired == 0 && !result.full_rebuild_required);
        remote.tags[0].cfg.datatype = "float64";
        assert(sync_opcua_connection_nodes(remote, result, error));
        assert(result.datatype_conflicts == 1 && result.full_rebuild_required);
        remote.tags[0].cfg.enabled = false;
        assert(sync_opcua_connection_nodes(remote, result, error));
        assert(result.retired == 1);
        assert(UA_Server_readNodeClass(server, UA_NODEID_STRING(1, const_cast<char*>("Tags/ReloadRemote/RemoteValue")), &removedClass) == UA_STATUSCODE_BADNODEIDUNKNOWN);
        TagRuntime invalid;
        assert(!ua_tag_has_node(kraft.conn, invalid));
        invalid.handle_deferred = true;
        assert(ua_tag_has_node(kraft.conn, invalid));
        for (auto &binding : g_uaBindings) UA_NodeId_clear(&binding.nodeId);
        g_uaBindings.clear(); g_uaBindingIndex.clear();
        g_uaServer = nullptr; g_uaBridgeNodeId = UA_NODEID_NULL;
    }
    // Scalar and typed array conversion share element types without treating a block as a scalar.
    for (const auto &sample : std::vector<TagValue>{true, int16_t(-3), uint16_t(4), int32_t(-5), uint32_t(6), float(1.5), double(2.5), std::string("text")}) {
        const char *types[] = {"bool", "int16", "int32", "uint16", "uint32", "float32", "float64", "string"};
        TagSnapshot block; block.datatype = types[sample.index()]; block.value = sample;
        block.array_values = {sample, sample, sample};
        UA_VariableAttributes attributes = UA_VariableAttributes_default;
        assert(ua_set_variable_attr_from_snapshot(attributes, block));
        assert(attributes.valueRank == UA_VALUERANK_ONE_DIMENSION && attributes.arrayDimensions[0] == 3);
        TagSnapshot decoded; ConnectionConfig connection; TagConfig config;
        assert(snapshot_from_opcua_variant(decoded, connection, config, attributes.value));
        assert(decoded.datatype == block.datatype && decoded.array_values == block.array_values);
        assert(snapshot_json_value(decoded).is_array() && snapshot_json_value(decoded).size() == 3);
        UA_VariableAttributes_clear(&attributes);
    }
    {
        DriverContext owner; owner.conn.id = "Blocks"; owner.conn.driver = "modbus_tcp";
        TagRuntime block; block.handle = 1; block.cfg.logical_name = "Block"; block.cfg.datatype = "int16"; block.cfg.elem_count = 3;
        std::deque<UaTagBinding> bindings; std::string error;
        assert(ua_add_tag_variable_node(server, UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER), bindings, owner.conn, block, error));
        auto value = make_initial_snapshot_for_opcua(owner.conn, block);
        value.quality = 1; value.array_values = {int16_t(1), int16_t(2), int16_t(3)};
        assert(ua_write_snapshot(server, bindings.back().nodeId, value, UA_STATUSCODE_GOOD) == UA_STATUSCODE_GOOD);
        UA_Variant actual; UA_Variant_init(&actual);
        assert(UA_Server_readValue(server, bindings.back().nodeId, &actual) == UA_STATUSCODE_GOOD);
        assert(actual.arrayLength == 3 && actual.type == &UA_TYPES[UA_TYPES_INT16]);
        assert(static_cast<UA_Int16*>(actual.data)[2] == 3);
        UA_Variant_clear(&actual);
        value.array_values.push_back(int16_t(4));
        assert(ua_write_snapshot(server, bindings.back().nodeId, value, UA_STATUSCODE_GOOD) == UA_STATUSCODE_GOOD);
        assert(UA_Server_readValue(server, bindings.back().nodeId, &actual) == UA_STATUSCODE_GOOD && actual.arrayLength == 4);
        UA_Variant_clear(&actual);
        UA_NodeId_clear(&bindings.back().nodeId);
        block.cfg.enabled = false;
        assert(!ua_tag_has_node(owner.conn, block));
    }
    {
        ConnectionConfig conn; conn.id = "DisabledElement"; conn.driver = "ab_eip";
        conn.gateway = "127.0.0.1"; conn.path = "1,0"; conn.plc_type = "lgx";
        TagConfig block; block.logical_name = "Block"; block.plc_tag_name = "Array"; block.datatype = "int32"; block.elem_count = 4;
        TagConfig off; off.logical_name = "Block[2]"; off.datatype = "int32"; off.enabled = false;
        DriverContext built; std::string error;
        assert(build_driver_context_for_connection(conn, {block, off}, built, error));
        const auto found = std::find_if(built.tags.begin(), built.tags.end(), [](const auto &tag) { return tag.cfg.logical_name == "Block[2]"; });
        assert(found != built.tags.end() && !ua_tag_has_node(conn, *found));
    }
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
