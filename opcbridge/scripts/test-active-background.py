#!/usr/bin/env python3
"""Disposable PLC/core/alarm service and automation demand integration."""
import argparse
import asyncio
import json
import os
import pathlib
import subprocess
import tempfile
import time
import urllib.request

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--core-fixture', required=True)
    parser.add_argument('--simulator', required=True)
    parser.add_argument('--alarms-binary', required=True)
    args = parser.parse_args()
    processes = []
    with tempfile.TemporaryDirectory(prefix='opcbridge-active-background-') as directory:
        root = pathlib.Path(directory)
        for name in ['connections', 'tags', 'alarms']: (root / name).mkdir()
        names = ['AlarmInput', 'AutoInput', 'Unused']
        (root / 'connections/PLC.json').write_text(json.dumps({'id': 'PLC', 'driver': 'ab_eip',
            'gateway': '127.0.0.1:14418', 'path': '1,0', 'plc_type': 'lgx',
            'polling_pacing': 'fast', 'poll_batch_size': 16, 'poll_max_reads_per_sec': 0}))
        (root / 'tags/PLC.json').write_text(json.dumps({'connection_id': 'PLC', 'tags': [
            {'name': name, 'plc_tag_name': name, 'datatype': 'int32', 'scan_ms': 100} for name in names]}))
        (root / 'tags/_memory.json').write_text(json.dumps({'connection_id': '_memory', 'tags': [
            {'name': 'Sink', 'source': 'memory', 'datatype': 'int32', 'writable': True, 'initial_value': '-1'}]}))
        def save_logic(scripts):
            path = root / 'logic.tmp'; path.write_text(json.dumps({'scripts': scripts, 'blocks': []})); path.replace(root / 'logic.json')
        save_logic([])
        def alarm(tag):
            (root / 'alarms/alarms.json').write_text(json.dumps({'alarms': [{'id': 'test',
                'enabled': True, 'connection_id': 'PLC', 'tag_name': tag, 'type': 'high', 'threshold': 1000}]}))
        alarm('AlarmInput')
        def api(path, body=None, port=18080):
            request = urllib.request.Request(f'http://127.0.0.1:{port}' + path,
                data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(request, timeout=5) as response: return json.load(response)
        def rows(): return {r['name']: r for r in api('/tags?connection_id=PLC&exclude_system=1')['tags']}
        def demand(): return api('/polling/demand?connection_id=PLC')
        def starts(): return demand()['active_poll_test']['poll_read_requests']['PLC']
        def logic():
            prefix = 'System/Logic/Scripts/verified/'
            return {r['name'][len(prefix):]: r['value'] for r in api('/tags?connection_id=_system&limit=0')['tags'] if r['name'].startswith(prefix)}
        async def wait(predicate, timeout=15):
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                try:
                    result = await asyncio.to_thread(predicate)
                    if result: return result
                except OSError: pass
                await asyncio.sleep(.05)
            raise AssertionError('Background demand condition timed out')
        async def state(selected, wanted, timeout=15):
            def matches():
                snapshot = rows()
                return all(snapshot.get(name, {}).get('polling_state') == wanted for name in selected)
            await wait(matches, timeout)
        with (root / 'server.log').open('w+') as log:
            def start(argv, env=None):
                process = subprocess.Popen(argv, cwd=root, stdout=log, stderr=log, env=env)
                processes.append(process); return process
            try:
                start([args.simulator, '--plc=ControlLogix', '--path=1,0', '--port=14418'] +
                    ['--tag=' + name + ':DINT[1]' for name in names])
                await asyncio.sleep(.2)
                env = {**os.environ, 'OPCBRIDGE_ACTIVE_POLL_TEST_CONNECTIONS': '["PLC"]', 'OPCBRIDGE_UA_VERIFY_READS': '0'}
                env.pop('OPCBRIDGE_ADMIN_SERVICE_TOKEN', None); env.pop('OPCBRIDGE_ADMIN_TOKEN', None)
                start([args.core_fixture, '--config', str(root), '--http', '--ws-port', '18090'], env)
                await state(names, 'active')
                alarms = start([args.alarms_binary, '--config', str(root / 'alarms'), '--opcbridge-host', '127.0.0.1',
                    '--opcbridge-http-port', '18080', '--opcbridge-ws-port', '18090', '--http-port', '18091'], env)
                await wait(lambda: 'opcbridge-alarms' in demand()['consumer_registrations'])
                await asyncio.sleep(32)
                await state(['AutoInput', 'Unused'], 'inactive'); await state(['AlarmInput'], 'active')
                print('Actual alarm service keeps only its configured input active after startup grace.', flush=True)
                script = {'id': 'verified', 'enabled': True, 'interval_ms': 600000, 'require_fresh_read': True,
                    'fresh_timeout_ms': 2000, 'source': "setTag('_memory', 'Sink', tag('PLC', 'AutoInput'));"}
                save_logic([script])
                await wait(lambda: logic().get('LastRunOk') and logic().get('MemoryWrites') == 1)
                sink = api('/tags?connection_id=_memory&tag=Sink')['tags'][0]
                assert sink['value'] == 0 and sink['quality'] == 1, sink
                await state(['AutoInput'], 'active'); await state(['Unused'], 'inactive')
                await asyncio.sleep(32)
                observed = {r['name']: r for r in demand()['tags']}['AutoInput']
                assert 'consumer:opcbridge-automation' in observed['reasons'] and 'http_recent_read' not in observed['reasons'], observed
                assert logic()['RunsTotal'] == 1, logic()
                before = starts(); await asyncio.sleep(1); after = starts()
                assert after['AutoInput'] > before['AutoInput'] and after['Unused'] == before['Unused']
                print('A long-interval verified automation wakes an idle input and keeps demand after its read lease expires.', flush=True)
                alarm('AutoInput'); assert api('/alarm/api/reload', {}, port=18091)['ok']
                await wait(lambda: set(demand()['consumer_registrations']['opcbridge-alarms']['tags']) == {'PLC:AutoInput'})
                old_input = {r['name']: r for r in demand()['tags']}['AlarmInput']
                assert 'consumer:opcbridge-alarms' not in old_input['reasons'], old_input
                await state(['AlarmInput'], 'inactive', timeout=45)
                script['enabled'] = False; save_logic([script])
                await wait(lambda: not demand()['automation']['enabled_automations'])
                await state(['AutoInput'], 'active')
                alarms.terminate(); alarms.wait(timeout=10)
                await wait(lambda: 'opcbridge-alarms' not in demand()['consumer_registrations'])
                await state(names, 'inactive', timeout=45)
                before = starts(); await asyncio.sleep(1); assert starts() == before
                print('Alarm reload, automation disable and alarm disconnect preserve shared demand until the last owner leaves.', flush=True)
                save_logic([{'id': 'unresolved', 'enabled': True, 'engine': 'unknown', 'source': 'tag(connection, name);'}])
                await state(names, 'active')
                assert demand()['automation']['all_tags_required']
                save_logic([]); await state(names, 'inactive')
                print('Unresolved automation conservatively wakes all inputs; removing it permits idle again.', flush=True)
            except Exception:
                try: print(json.dumps(demand(), indent=2))
                except Exception: pass
                log.flush(); log.seek(0); print(log.read()[-9000:]); raise
            finally:
                for process in reversed(processes):
                    if process.poll() is None:
                        process.terminate()
                        try: process.wait(timeout=10)
                        except subprocess.TimeoutExpired: process.kill(); process.wait()

if __name__ == '__main__': asyncio.run(main())
