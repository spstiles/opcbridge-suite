#!/usr/bin/env python3
"""Exercise production activity summary for a native-UA connection without PLC handles."""
from pathlib import Path
import tempfile,subprocess
root=Path(__file__).resolve().parent;s=(root/'main.cpp').read_text()
a=s.index('struct PollingActivitySummary {');b=s.index('// Caller holds driverMutex.',a)
struct=s[a:b]
a=s.index('static PollingActivitySummary polling_activity_summary(');b=s.index('\n}',a)+2
function=s[a:b]
a=s.index('} else if (intentionallyIdle) {')+len('} else if (intentionallyIdle) {')
b=s.index('} else if (total_seen == 0)',a)
health=s[a:b]
code=r'''
#include "read_freshness.h"
#include <string>
#include <vector>
#include <unordered_map>
#include <set>
#include <algorithm>
#include <cassert>
#include <mutex>
#include <memory>
#include <nlohmann/json.hpp>
using json=nlohmann::json;
enum class PollCacheState {Active,Inactive,Waiting};
struct TagSnapshot {PollCacheState polling_state=PollCacheState::Active; int quality=1;PollReadStamp poll_read;};
using TagTable=std::unordered_map<std::string,TagSnapshot>;
struct Cfg {bool enabled=true;int elem_count=1;std::string source_tag,logical_name;};
struct Tag {Cfg cfg;std::string poll_source;int handle=-1;bool handle_deferred=false;};
struct DriverContext {struct Conn {std::string id="UA",driver="opcua_client";} conn;unsigned freshness_epoch=1;std::vector<Tag>tags;};
bool is_memory_tag(const Cfg&){return false;}
bool is_opcua_client_driver_name(const std::string&s){return s=="opcua_client";}
std::string make_tag_key(const std::string&a,const std::string&b){return a+":"+b;}
'''+struct+function+r'''
struct Probe {int failures=0;json snapshot(){return {{"consecutive_failures",failures}};}};
struct Metrics {Probe idle_probe;};
std::mutex g_metricsMutex;
std::unordered_map<std::string,std::shared_ptr<Metrics>> g_connPollMetrics;
json idle_health(DriverContext &driver,const std::string &runtimeIssue,int failures){
 json dstatus;int error_count=0,ok_count=0;
 auto metric=std::make_shared<Metrics>();metric->idle_probe.failures=failures;g_connPollMetrics[driver.conn.id]=metric;
''' +health+r'''
 assert(error_count+ok_count==1);
 assert((dstatus["status"]=="error")==bool(error_count));
 return dstatus;
}
'''+r'''
int main(){
 DriverContext d;Tag tag;tag.cfg.logical_name="Kraft";d.tags.push_back(tag);TagTable table;
 TagSnapshot snap;snap.polling_state=PollCacheState::Inactive;snap.quality=0;table["UA:Kraft"]=snap;
 auto idle=polling_activity_summary(d,table);assert(idle.configured_work==1&&idle.inactive_work==1&&idle.active_work==0&&idle.idle());
 table["UA:Kraft"].polling_state=PollCacheState::Waiting;
 auto wake=polling_activity_summary(d,table);assert(!wake.idle()&&wake.waiting==1&&wake.active_without_sample==1);
 auto now=PollReadStamp::Clock::now();table["UA:Kraft"].polling_state=PollCacheState::Active;
 table["UA:Kraft"].quality=1;table["UA:Kraft"].poll_read={now,now,1};
 auto live=polling_activity_summary(d,table);assert(live.active_work==1&&live.active_without_sample==0&&!live.idle());
 assert(idle_health(d,"",0)["status"]=="ok");
 assert(idle_health(d,"",0)["reason"]=="polling idle (no active demand)");
 assert(idle_health(d,"OPC UA disconnected",0)["status"]=="error");
 assert(idle_health(d,"OPC UA disconnected",0)["reason"]=="OPC UA disconnected");
 d.conn.driver="ab_eip";
 assert(idle_health(d,"",3)["status"]=="error");
 assert(polling_activity_summary(d,table).configured_work==0);
}
'''
with tempfile.TemporaryDirectory() as directory:
 cpp=Path(directory)/'test.cpp';exe=Path(directory)/'test';cpp.write_text(code)
 subprocess.run(['g++','-std=c++17','-I'+str(root),str(cpp),'-o',str(exe)],check=True)
 subprocess.run([str(exe)],check=True)
print('Native UA idle, wake, and active work accounting passed.')
