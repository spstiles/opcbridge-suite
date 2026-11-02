#!/usr/bin/env python3
"""Actual active-sweep cadence, scope changes, array accounting and idle probes."""
import argparse
import json
import os
import pathlib
import subprocess
import tempfile
import time
import urllib.request


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--core-fixture',required=True)
    parser.add_argument('--simulator',required=True)
    args=parser.parse_args()
    processes=[]
    with tempfile.TemporaryDirectory(prefix='opcbridge-active-sweep-') as directory:
        root=pathlib.Path(directory)
        for name in ['connections','tags']:(root/name).mkdir()
        (root/'connections/PLC.json').write_text(json.dumps({'id':'PLC','driver':'ab_eip',
            'gateway':'127.0.0.1:14418','path':'1,0','plc_type':'lgx','poll_max_reads_per_sec':0,'poll_lanes':2}))
        tags=[{'name':name,'plc_tag_name':name,'datatype':'int32','scan_ms':scan,'writable':True}
              for name,scan in [('Fast',100),('Slow',400),('Array',200)]]
        tags[2]['elem_count']=3
        tags.append({'name':'Alias','source_tag':'Fast','datatype':'int32'})
        (root/'tags/PLC.json').write_text(json.dumps({'connection_id':'PLC','tags':tags}))
        def api(path,body=None):
            req=urllib.request.Request('http://127.0.0.1:18080/'+path,
                data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json'})
            return json.load(urllib.request.urlopen(req,timeout=10))
        def health():return api('health')['connections']['PLC']
        def wait(predicate,timeout=15):
            end=time.monotonic()+timeout
            while time.monotonic()<end:
                try:
                    if predicate():return
                except OSError:pass
                time.sleep(.05)
            raise AssertionError('Active sweep condition timed out')
        def scope(names):
            assert api('polling/demand/register',{'client_id':'sweep-test','owner':'sweep-test',
                'tags':['PLC:'+name for name in names]})['ok']
        env=os.environ.copy();env.pop('OPCBRIDGE_ACTIVE_POLL_TEST_CONNECTIONS',None)
        with (root/'services.log').open('w+') as log:
            def start(argv):
                p=subprocess.Popen(argv,cwd=root,stdout=log,stderr=log,env=env);processes.append(p)
            try:
                start([args.simulator,'--plc=ControlLogix','--path=1,0','--port=14418',
                    '--tag=Fast:DINT[1]','--tag=Slow:DINT[1]','--tag=Array:DINT[3]'])
                time.sleep(.2)
                start([args.core_fixture,'--config',str(root),'--http','--ws-port','18090'])
                wait(lambda:health().get('active_sweep_completed',0)>0)
                wait(lambda:health().get('polling_activity')=='idle',40)
                assert health()['active_sweep_ms_last'] is None
                scope(['Fast','Slow','Array[1]','Alias'])
                wait(lambda:health().get('active_sweep_work')==3 and health().get('active_sweep_completed',0)>=3)
                h=health()
                assert 250<h['active_sweep_ms_avg_10s']<1500,h
                assert h['oldest_active_sample_age_ms'] is not None and h['oldest_active_sample_age_ms']<1500,h
                assert h['active_without_sample']==0,h
                m=api('metrics')['connections']['PLC']
                assert m['active_sweep_ms_last'] is not None and m['full_sweep_available'] is False,m
                print('Two lanes: active sweep follows the 400-ms source; array root counts once and alias adds no read work.',flush=True)
                scope(['Fast'])
                wait(lambda:health().get('active_sweep_work')==1,18)
                wait(lambda:health().get('active_sweep_completed',0)>=3)
                h=health()
                assert 50<h['active_sweep_ms_avg_10s']<250,h
                assert h['oldest_active_sample_age_ms']<500,h
                print('Scope replacement resets the old averages; the one-source sweep follows its 100-ms scan.',flush=True)
                assert api('polling/demand/release',{'client_id':'sweep-test','owner':'sweep-test'})['ok']
                wait(lambda:health().get('active_sweep_work')==0,18)
                before=health().get('communication',{}).get('health_check_reads',0)
                wait(lambda:health().get('communication',{}).get('health_check_reads',0)>before,40)
                h=health()
                assert h['active_sweep_ms_last'] is None and h['oldest_active_sample_age_ms'] is None,h
                assert h['active_sweep_completed']==0 and h['polling_activity']=='idle',h
                print('Idle clears active timing; background communication probes do not create sweeps or active sample ages.',flush=True)
            except Exception:
                try:print(json.dumps(health(),indent=2))
                except Exception:pass
                log.flush();log.seek(0);print(log.read()[-6000:]);raise
            finally:
                for p in reversed(processes):
                    if p.poll() is None:
                        p.terminate()
                        try:p.wait(timeout=10)
                        except subprocess.TimeoutExpired:p.kill();p.wait()

if __name__=='__main__':main()
