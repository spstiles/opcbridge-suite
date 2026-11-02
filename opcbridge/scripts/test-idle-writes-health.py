#!/usr/bin/env python3
"""Actual simulator/core checks for idle writable tags and background health reads."""
import argparse
import asyncio
import json
import os
import pathlib
import subprocess
import tempfile
import time
import urllib.request
import urllib.error
from asyncua import Client, ua

async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--core-fixture', required=True)
    parser.add_argument('--simulator', required=True)
    args = parser.parse_args()
    processes = []
    with tempfile.TemporaryDirectory(prefix='opcbridge-idle-writes-') as directory:
        root = pathlib.Path(directory)
        for name in ['connections', 'tags']: (root / name).mkdir()
        (root / 'connections/PLC.json').write_text(json.dumps({'id': 'PLC', 'driver': 'ab_eip',
            'gateway': '127.0.0.1:14418', 'path': '1,0', 'plc_type': 'lgx', 'default_write_ms': 1000,
            'default_read_ms': 1000, 'poll_max_reads_per_sec': 0}))
        tags = [
            {'name': 'Input', 'plc_tag_name': 'Input', 'datatype': 'int32', 'writable': True},
            {'name': 'Unused', 'plc_tag_name': 'Unused', 'datatype': 'int32', 'writable': True},
            {'name': 'Array', 'plc_tag_name': 'Array', 'datatype': 'int32', 'elem_count': 3, 'writable': True},
            {'name': 'Alias', 'source_tag': 'Input', 'datatype': 'int32', 'writable': True},
            {'name': 'Bit', 'source_tag': 'Input', 'bit': 0, 'datatype': 'bool', 'writable': True}]
        for tag in tags: tag['scan_ms'] = 100
        (root / 'tags/PLC.json').write_text(json.dumps({'connection_id': 'PLC', 'tags': tags}))
        (root / 'logic.json').write_text(json.dumps({'scripts': [], 'blocks': []}))
        def api(path, body=None):
            req = urllib.request.Request('http://127.0.0.1:18080/'+path,
                data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
            return json.load(urllib.request.urlopen(req, timeout=8))
        def rows(): return {r['name']:r for r in api('tags?connection_id=PLC')['tags'] if not r.get('is_array_root')}
        def health(): return api('health')['connections']['PLC']
        async def wait(predicate, timeout=15):
            end = time.monotonic()+timeout
            while time.monotonic()<end:
                try:
                    if await asyncio.to_thread(predicate): return
                except OSError: pass
                await asyncio.sleep(.1)
            raise AssertionError('Idle write/health condition timed out')
        def all_idle(): return bool(rows()) and all(r.get('polling_state')=='inactive' for r in rows().values())
        def value(name, expected):
            r=rows()[name]; return r['quality']==1 and r['value']==expected
        def write(name, number):
            result=api('write', {'connection_id':'PLC','name':name,'value':str(number),'token':'write-test-token'})
            assert result['ok'],result
        env=os.environ.copy();env.pop('OPCBRIDGE_ACTIVE_POLL_TEST_CONNECTIONS',None)
        env.update(OPCBRIDGE_WRITE_TOKEN='write-test-token',OPCBRIDGE_UA_VERIFY_READS='0')
        with (root/'services.log').open('w+') as log:
            def start(argv):
                p=subprocess.Popen(argv,cwd=root,stdout=log,stderr=log,env=env);processes.append(p);return p
            sim_args=[args.simulator,'--plc=ControlLogix','--path=1,0','--port=14418',
                '--tag=Input:DINT[1]','--tag=Unused:DINT[1]','--tag=Array:DINT[3]']
            try:
                sim=start(sim_args);await asyncio.sleep(.2)
                start([args.core_fixture,'--config',str(root),'--http','--opcua','--opcua-port','14840','--ws-port','18090'])
                await wait(lambda: value('Input',0))
                await wait(all_idle,40)
                await wait(lambda: health().get('communication',{}).get('health_check_reads',0)>0,40)
                assert all_idle(),rows()
                assert health()['communication']['state']=='available',health()
                assert 'not verified' not in health().get('reason','')
                print('Writable tags suspend; one background health read confirms communication without activating tags.',flush=True)
                await asyncio.to_thread(write,'Input',42);await wait(lambda:value('Input',42))
                assert rows()['Unused']['polling_state']=='inactive'
                await asyncio.to_thread(write,'Alias',44);await wait(lambda:value('Input',44) and value('Alias',44))
                await asyncio.to_thread(write,'Bit',1);await wait(lambda:value('Input',45) and value('Bit',True))
                await asyncio.to_thread(write,'Array[1]',23);await wait(lambda:value('Array[1]',23))
                assert value('Array[0]',0) and value('Array[2]',0),rows()
                print('HTTP scalar, alias, bit and array-element writes read back actual PLC values without polling the unused writable tag.',flush=True)
                # Wait for every write lease to expire before native UA output write.
                await wait(all_idle,48)
                async with Client('opc.tcp://127.0.0.1:14840') as client:
                    await client.get_node('ns=1;s=Tags/PLC/Input').write_value(ua.Variant(78,ua.VariantType.Int32))
                    await wait(lambda:value('Input',78))
                assert rows()['Unused']['polling_state']=='inactive'
                # Automation has only an output, so read demand comes from writeback.
                (root/'logic.json').write_text(json.dumps({'scripts':[{'id':'writer','enabled':True,
                    'interval_ms':600000,'source':"setTag('PLC','Input',89);"}],'blocks':[]}))
                await wait(lambda:value('Input',89))
                print('Native UA and queued automation writes use the same readback path.',flush=True)
                sim.terminate();sim.wait(timeout=5)
                try:
                    await asyncio.to_thread(write,'Input',999)
                except urllib.error.HTTPError as error:
                    assert error.code==400
                else: raise AssertionError('Write to disconnected PLC unexpectedly succeeded')
                assert not value('Input',999)
                await wait(all_idle,48)
                await wait(lambda:health().get('communication',{}).get('state')=='check_failed',40)
                assert all_idle()
                sim=start(sim_args)
                await wait(lambda:health().get('communication',{}).get('state')=='available',45)
                assert all_idle()
                print('Failed writes never publish the requested GOOD value; idle health detects communication loss and recovery without waking tags.',flush=True)
            except Exception:
                log.flush();log.seek(0);print(log.read()[-7000:]);raise
            finally:
                for p in reversed(processes):
                    if p.poll() is None:
                        p.terminate()
                        try:p.wait(timeout=10)
                        except subprocess.TimeoutExpired:p.kill();p.wait()

if __name__=='__main__':asyncio.run(main())
