#!/usr/bin/env python3
"""Run the production monitored-item reconciliation lambda against a local UA server."""
from pathlib import Path
import subprocess,tempfile
root=Path(__file__).resolve().parent
source=(root/'main.cpp').read_text()
a=source.index('auto ensureRemoteUaSubscription =')
b=source.index('auto prefetchRemoteUaDue =',a)
production=source[a:b]
code=r'''
#include "open62541.h"
#include <atomic>
#include <cassert>
#include <thread>
#include <mutex>
#include <optional>
#include <unordered_map>
#include <vector>
#include <string>
#include <algorithm>
#include <iostream>
using Clock=std::chrono::steady_clock;
struct Cfg {std::string plc_tag_name,logical_name; int scan_ms=100;};
struct Tag {Cfg cfg; bool demand_active=true;};
struct Conn {std::string id="bridge"; int poll_batch_size=1;};
struct Spec {Conn conn; std::vector<Tag> tags; int metrics=0; unsigned gen=1,freshness_epoch=1; std::shared_ptr<std::atomic<bool>> stop_requested=std::make_shared<std::atomic<bool>>(false);};
struct TagSnapshot {std::string connection_id,logical_name;};
struct TagRuntime {Cfg cfg;};
struct Driver {Conn conn; unsigned freshness_epoch=1;};
struct UaUpdate {std::string a,b; TagSnapshot snap; unsigned epoch;};
struct RemoteUaPrefetchResult {UA_StatusCode ua_status;};
std::string trim_copy(const std::string&s){return s;}
void set_connection_runtime_issue(int,const std::string&){}
void ws_notify_tag_update(const TagSnapshot&,const Cfg&){}
TagSnapshot transition_poll_cache(Driver&d,const TagRuntime&t,int,bool){return {d.conn.id,t.cfg.logical_name};}
int main(){
 UA_Server* server=UA_Server_new();
 assert(UA_ServerConfig_setMinimal(UA_Server_getConfig(server),48671,nullptr)==UA_STATUSCODE_GOOD);
 for(int i=1;i<=2;++i){
  UA_VariableAttributes attr=UA_VariableAttributes_default; UA_Int32 value=i;
  UA_Variant_setScalar(&attr.value,&value,&UA_TYPES[UA_TYPES_INT32]);
  attr.dataType=UA_TYPES[UA_TYPES_INT32].typeId;
  assert(UA_Server_addVariableNode(server,UA_NODEID_NUMERIC(1,i),UA_NODEID_NUMERIC(0,UA_NS0ID_OBJECTSFOLDER),
    UA_NODEID_NUMERIC(0,UA_NS0ID_ORGANIZES),UA_QUALIFIEDNAME(1,const_cast<char*>("Value")),UA_NODEID_NUMERIC(0,UA_NS0ID_BASEDATAVARIABLETYPE),attr,nullptr,nullptr)==UA_STATUSCODE_GOOD);
 }
 assert(UA_Server_run_startup(server)==UA_STATUSCODE_GOOD);
 std::atomic<bool> running{true};std::thread thread([&]{while(running)UA_Server_run_iterate(server,true);});
 UA_Client* remoteUaClient=UA_Client_new();UA_ClientConfig_setDefault(UA_Client_getConfig(remoteUaClient));
 assert(UA_Client_connect(remoteUaClient,"opc.tcp://127.0.0.1:48671")==UA_STATUSCODE_GOOD);
 Spec spec;spec.tags={{{"ns=1;i=1","One"}},{{"ns=1;i=2","Two"}}};
 std::vector<Driver> drivers(1);std::mutex driverMutex,uaQueueMutex;int tagTable=0;UA_Server*g_uaServer=nullptr;std::vector<UaUpdate>uaQueue;
 std::atomic<unsigned>g_configGeneration{1};
 std::unordered_map<size_t,RemoteUaPrefetchResult>remoteUaPrefetch;
 std::unordered_map<size_t,UA_UInt32>remoteUaItems;
 std::vector<bool>remoteUaWanted(2,true),wanted{true,false};
 std::vector<Clock::time_point>remoteUaItemRetry(2);
 auto remoteUaSubscriptionRetryAfter=Clock::time_point{},remoteUaDemandSync=Clock::time_point{};
 UA_UInt32 remoteUaSubscriptionId=0;int remoteUaSubscriptionState=0;
 auto remoteUaDemandAllows=[&](size_t i){return wanted[i];};
 auto ensureRemoteUaConnected=[&]{return true;};
 std::atomic<int>notifications{0};
 UA_Client_DataChangeNotificationCallback remoteUaDataChange=[](UA_Client*,UA_UInt32,void*ctx,UA_UInt32,void*,UA_DataValue*value){if(value&&value->hasValue)++*static_cast<std::atomic<int>*>(ctx);};
 // The production lambda takes a pointer to subscription state. Give the callback
 // a compatible counter in this fixture, keeping subscription calls unchanged.
'''+production.replace('&remoteUaSubscriptionState, nullptr, nullptr','&notifications, nullptr, nullptr')+r'''
 auto sync=[&]{remoteUaDemandSync={}; assert(ensureRemoteUaSubscription());};
 sync();assert(remoteUaItems.size()==1&&remoteUaItems.count(0));
 const auto original=remoteUaItems.at(0);const auto subscription=remoteUaSubscriptionId;
 for(int i=0;i<20&&notifications==0;++i)UA_Client_run_iterate(remoteUaClient,50);
 assert(notifications>0); // Initial value arrives without waiting for a value change.
 wanted[1]=true;sync();assert(remoteUaItems.size()==2&&remoteUaItems.at(0)==original&&remoteUaSubscriptionId==subscription);
 wanted[0]=false;sync();assert(remoteUaItems.size()==1&&!remoteUaItems.count(0)&&remoteUaItems.count(1));
 wanted[0]=true;sync();assert(remoteUaItems.size()==2&&remoteUaItems.at(0)!=original);
 wanted={false,false};sync();assert(remoteUaItems.empty()&&remoteUaSubscriptionId==subscription);
 // Reconnect: discard old monitored-item IDs and create only current demand.
 UA_Client_disconnect(remoteUaClient);assert(UA_Client_connect(remoteUaClient,"opc.tcp://127.0.0.1:48671")==UA_STATUSCODE_GOOD);
 remoteUaSubscriptionId=0;wanted={false,true};sync();assert(remoteUaItems.size()==1&&remoteUaItems.count(1));
 UA_Client_disconnect(remoteUaClient);UA_Client_delete(remoteUaClient);
 running=false;thread.join();UA_Server_run_shutdown(server);UA_Server_delete(server);
}
'''
# memory is required for the minimal Spec fixture.
code=code.replace('#include <atomic>','#include <atomic>\n#include <memory>')
with tempfile.TemporaryDirectory(prefix='ua-demand-') as d:
 cpp=Path(d)/'test.cpp';exe=Path(d)/'test';cpp.write_text(code)
 subprocess.run(['g++','-std=c++17','-DUA_ENABLE_ENCRYPTION_OPENSSL','-I'+str(root),str(cpp),str(root/'open62541.o'),'-lssl','-lcrypto','-lpthread','-o',str(exe)],check=True)
 subprocess.run([str(exe)],check=True,stdout=subprocess.DEVNULL,timeout=30)
print('Production UA reconciliation: activation, idle deletion, stable active items, initial value, reconnect passed.')
