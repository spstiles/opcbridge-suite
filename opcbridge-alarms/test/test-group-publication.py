#!/usr/bin/env python3
"""Compile actual group serialization and UA publication functions in an isolated server."""
from pathlib import Path
import subprocess, tempfile, os
root = Path(__file__).resolve().parents[2]
core = (root / 'opcbridge/main.cpp').read_text()
alarms = (root / 'opcbridge-alarms/src/main.cpp').read_text()
def function(source, signature, last=False):
    start = source.rindex(signature) if last else source.index(signature)
    brace = source.index('{', start)
    depth = 1; end = brace + 1
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[start:end]
code = '''
#include <nlohmann/json.hpp>
#include "open62541.h"
#include "group_summary.h"
#include "alarm_status_source.h"
#include <fstream>
#include <sstream>
#include <filesystem>
#include <atomic>
#include <cstdlib>
#include <cassert>
#include <optional>
#include <mutex>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <iostream>
using json = nlohmann::json;
struct SystemTagDef {std::string name, datatype; json value;};
struct UaSystemBinding {std::string name, datatype; UA_NodeId nodeId;};
UA_Server *g_uaServer;
UA_NodeId g_uaAlarmSystemRoot;
std::vector<UaSystemBinding> g_uaSystemBindings;
std::unordered_map<std::string,size_t> g_uaSystemBindingIndex;
std::string leaf_name_from_path(const std::string &path) {return path.substr(path.rfind('/')+1);}
long long now_ms() { return 100; }
struct State {
 std::string group, site;
 bool enabled=true,site_enabled=true,active=false,acked=false,has_been_active=false;
 int severity=500;
 std::optional<long long> shelved_until_ms;
};
struct Engine {
 mutable std::mutex mu;
 std::set<std::string> defined_groups;
 std::unordered_map<std::string,State> states;
'''
code += function(alarms, '    static std::set<std::string> configured_groups(') + '\n'
code += function(alarms, '    json group_summaries() const') + '\n};\n'
for signature in ['static bool ua_set_variant_for_system_value(', 'static const UA_DataType* ua_system_datatype_for_name(', 'static UA_NodeId ua_add_folder(', 'static bool ua_add_system_variable(', 'static void ua_sync_alarm_group_nodes(']:
    code += function(core, signature, True) + '\n'
code += r'''
#include <chrono>
#include <thread>
#include <memory>
long long system_wall_now_ms() { return 100; }
namespace httplib {
struct Response { int status=200; std::string body; };
static bool online=true;
static std::string status_body;
static std::string last_host;
static int last_port=0;
struct Client {
 Client(const std::string &host, int port) { last_host=host;last_port=port; }
 void set_connection_timeout(int,int) {} void set_read_timeout(int,int) {} void set_write_timeout(int,int) {}
 std::shared_ptr<Response> Get(const char*) { return online ? std::make_shared<Response>(Response{200,status_body}) : nullptr; }
};
}
'''
code += function(core, 'std::string strip_json_comments(', True) + '\n'
code += function(core, 'static int64_t json_i64_at(') + '\n'
code += function(core, 'static std::vector<SystemTagDef> alarm_default_system_tags(') + '\n'
code += function(core, 'static std::vector<SystemTagDef> collect_alarm_system_tags(') + '\n'
code += r'''
int main() {
 const char *source_config=std::getenv("OPCBRIDGE_ALARM_SOURCE_CONFIG");
 assert(source_config);
 {std::ofstream file(source_config);file << R"({"alarms":{"host":"192.168.100.43","httpPort":18085}})";}
 Engine engine;
 engine.defined_groups = Engine::configured_groups(json::parse(R"({"groups":[{"name":"Field","sites":[{"name":"Lift Station 1"}]},{"name":"Plant","sites":[]}]})"));
 auto groups=engine.group_summaries();
 assert(groups.size()==3);
 assert(groups[0]["ActiveCount"]==0 && groups[0]["AllAcknowledged"]==true);
 engine.states["test"]={"Field","Lift Station 1",true,true,true,false,true,800,{}};
 groups=engine.group_summaries();
 assert(groups[0]["Active"]==true && groups[0]["HighestActiveSeverity"]==800);
 httplib::status_body=json({{"ok",true},{"group_summaries",groups}}).dump();
 auto httpRows=collect_alarm_system_tags();
 assert(httpRows.size()==34);
 assert(httplib::last_host=="192.168.100.43" && httplib::last_port==18085);
 bool found=false;
 for(const auto &row:httpRows)if(row.name=="System/Alarms/Groups/Field/Active") {found=true;assert(row.value==true);}
 assert(found);
 httplib::online=false;
 std::this_thread::sleep_for(std::chrono::milliseconds(2100));
 auto retained=collect_alarm_system_tags();assert(retained.size()==34 && retained.front().value==false);
 {std::ofstream file(source_config);file << R"({"alarms":{"host":"192.168.100.45","httpPort":8085}})";}
 std::this_thread::sleep_for(std::chrono::milliseconds(2100));
 assert(collect_alarm_system_tags().size()==10); // old server values must not survive a source change
 assert(httplib::last_host=="192.168.100.45");
 httplib::online=true;httplib::status_body=json({{"ok",true},{"group_summaries",json::array()}}).dump();
 std::this_thread::sleep_for(std::chrono::milliseconds(2100));
 assert(collect_alarm_system_tags().size()==10);
 g_uaServer=UA_Server_new();
 g_uaAlarmSystemRoot=ua_add_folder(g_uaServer,UA_NODEID_NUMERIC(0,UA_NS0ID_OBJECTSFOLDER),"Alarms");
 std::vector<SystemTagDef> rows;
 for(const auto &g:groups) for(const auto *key:{"Active","Unacked","ActiveUnacked","AllAcknowledged","ActiveCount","UnackedCount","ActiveUnackedCount","HighestActiveSeverity"})
  rows.push_back({"System/Alarms/Groups/"+g["path"].get<std::string>()+"/"+key,g[key].is_boolean()?"bool":"int32",g[key]});
 ua_sync_alarm_group_nodes(rows);
 assert(g_uaSystemBindings.size()==24);
 ua_sync_alarm_group_nodes(rows);
 assert(g_uaSystemBindings.size()==24);
 std::string path="System/Alarms/Groups/Field/Lift Station 1/Active";
 UA_NodeId node=UA_NODEID_STRING(1,const_cast<char*>(path.c_str()));
 UA_Variant value;UA_Variant_init(&value);
 assert(UA_Server_readValue(g_uaServer,node,&value)==UA_STATUSCODE_GOOD);
 assert(*static_cast<UA_Boolean*>(value.data)); UA_Variant_clear(&value);
 UA_Byte access=0;UA_Server_readAccessLevel(g_uaServer,node,&access);assert(access==UA_ACCESSLEVELMASK_READ);
 ua_sync_alarm_group_nodes({});
 assert(g_uaSystemBindings.empty() && g_uaSystemBindingIndex.empty());
 UA_NodeClass cls;assert(UA_Server_readNodeClass(g_uaServer,node,&cls)!=UA_STATUSCODE_GOOD);
 ua_sync_alarm_group_nodes(rows);assert(g_uaSystemBindings.size()==24);
 for(auto &binding:g_uaSystemBindings)UA_NodeId_clear(&binding.nodeId);
 UA_Server_delete(g_uaServer);
}
'''
with tempfile.TemporaryDirectory(prefix='alarm-groups-') as directory:
    cpp = Path(directory)/'test.cpp'; cpp.write_text(code)
    binary=Path(directory)/'test'
    subprocess.run(['g++','-std=c++17','-DUA_ENABLE_ENCRYPTION_OPENSSL','-I'+str(root/'opcbridge'),'-I'+str(root/'opcbridge-alarms/src'),str(cpp),str(root/'opcbridge/open62541.o'),'-lssl','-lcrypto','-lpthread','-o',str(binary)],check=True)
    subprocess.run([str(binary)],check=True,stdout=subprocess.DEVNULL, env={**os.environ,'OPCBRIDGE_ALARM_SOURCE_CONFIG':str(Path(directory)/'hmi.jsonc')})
print('Group configuration, summary serialization, UA discovery/read-only nodes and removal/re-add passed.')
