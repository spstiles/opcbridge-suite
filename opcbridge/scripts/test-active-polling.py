#!/usr/bin/env python3
"""Controlled opt-in polling against disposable simulator ports only."""
import argparse
import asyncio
import json
import os
import pathlib
import subprocess
import tempfile
import urllib.request
import websockets

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--core-fixture', required=True)
    parser.add_argument('--simulator', required=True)
    parser.add_argument('--unbatched', action='store_true')
    parser.add_argument('--native-ua', action='store_true')
    parser.add_argument('--health-only-idle', action='store_true')
    args = parser.parse_args()
    processes = []
    with tempfile.TemporaryDirectory(prefix='opcbridge-active-poll-') as directory:
        root = pathlib.Path(directory)
        (root / 'connections').mkdir(); (root / 'tags').mkdir()
        for cid in (['PLC'] if args.health_only_idle else ['PLC', 'Control', 'Writable']):
            (root / f'connections/{cid}.json').write_text(json.dumps({'id': cid, 'driver': 'ab_eip',
                'gateway': '127.0.0.1:14418', 'plc_type': 'lgx', 'path': '1,0',
                'polling_pacing': 'fast', 'poll_batch_size': 16,
                'poll_max_reads_per_sec': 10 if args.unbatched else 0}))
            tags = [{'name': 'Input', 'plc_tag_name': 'Input', 'datatype': 'int32',
                     'scan_ms': 100, 'writable': cid == 'Writable'}]
            if cid == 'PLC':
                tags += [{'name': 'Other', 'plc_tag_name': 'Other', 'datatype': 'int32', 'scan_ms': 100},
                    {'name': 'Alias', 'source_tag': 'Input', 'datatype': 'int32'},
                    {'name': 'Array', 'plc_tag_name': 'Array', 'datatype': 'int32', 'elem_count': 2, 'scan_ms': 100}]
            (root / f'tags/{cid}.json').write_text(json.dumps({'connection_id': cid, 'tags': tags}))
        def api(path, body=None):
            request = urllib.request.Request('http://127.0.0.1:18080' + path,
                data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(request, timeout=6) as response: return json.load(response)
        def rows(cid='PLC'):
            return {r['name']: r for r in api('/tags?exclude_system=1&connection_id=' + cid)['tags']}
        async def expect(names, state):
            for _ in range(300):
                try:
                    current = await asyncio.to_thread(rows)
                    if all(current.get(name, {}).get('polling_state') == state for name in names):
                        for name in names:
                            assert current[name]['quality'] == (1 if state == 'active' else 0), current[name]
                            if state != 'active': assert current[name]['value'] is None, current[name]
                        return current
                except OSError: pass
                await asyncio.sleep(.05)
            raise AssertionError(('State timeout', state, names, current))
        def starts():
            return api('/polling/demand')['active_poll_test']['poll_read_requests']['PLC']
        def metrics(cid): return api('/metrics')['connections'][cid]['reads_total']
        async def ws_states(socket, names, states):
            pending = {name: list(states) for name in names}
            async with asyncio.timeout(10):
                while pending:
                    event = json.loads(await socket.recv())
                    name = event.get('name')
                    if event.get('type') != 'tag_update' or event.get('connection_id') != 'PLC' or name not in pending: continue
                    if event.get('polling_state') != pending[name][0]: continue
                    if event['polling_state'] != 'active': assert event['value'] is None and event['quality'] == 0, event
                    pending[name].pop(0)
                    if not pending[name]: del pending[name]
        with (root / 'server.log').open('w+') as log:
            def start(argv, env=None):
                process = subprocess.Popen(argv, stdout=log, stderr=log, env=env)
                processes.append(process); return process
            try:
                sim = start([args.simulator, '--plc=ControlLogix', '--path=1,0', '--port=14418',
                    '--tag=Input:DINT[1]', '--tag=Other:DINT[1]', '--tag=Array:DINT[2]'])
                await asyncio.sleep(.2)
                start([args.core_fixture, '--config', str(root), '--http', '--ws-port', '18090'] +
                    (['--opcua', '--opcua-port', '14840'] if args.native_ua else []),
                    {**os.environ, 'OPCBRIDGE_ACTIVE_POLL_TEST_CONNECTIONS': '["PLC","Writable"]', 'OPCBRIDGE_UA_VERIFY_READS': '1' if args.native_ua else '0'})
                selected = ['Input', 'Other', 'Alias', 'Array[0]', 'Array[1]']
                await expect(selected, 'active')
                async with websockets.connect('ws://127.0.0.1:18090') as socket:
                    # Observe delivery without creating polling demand.
                    await socket.send(json.dumps({'type': 'register_demand', 'owner': 'test-observer',
                                                  'demand_mode': 'explicit', 'tags': []}))
                    await socket.send(json.dumps({'type': 'subscribe_all'}))
                    await asyncio.sleep(32)
                    await expect(selected, 'inactive')
                    await ws_states(socket, selected, ['inactive'])
                    health = api('/health')['connections']['PLC']
                    assert health['status'] == 'ok' and health['polling_activity'] == 'idle', health
                    assert not health['stalled'] and health['stale_or_bad'] == 0, health
                    assert health['inactive_tags'] == 5 and health['active_poll_work'] == 0, health
                    assert health['configured_poll_work'] == 3 and health['inactive_poll_work'] == 3, health
                    assert health['sweep_ms_last'] is None and health['expected_sweep_ms'] is None, health
                    metric = api('/metrics')['connections']['PLC']
                    assert metric['poll_progress_pct'] is None and metric['full_sweep_available'] is False, metric
                    if args.health_only_idle:
                        watchdog = api('/health')['watchdog']
                        assert watchdog['status'] == 'ok' and 'intentionally idle' in watchdog['reason'], watchdog
                        assert watchdog['connections_stalled'] == 0 and watchdog['runtime_last_read_age_ms'] is None, watchdog
                    else:
                        assert 'full_sweep_available' not in api('/health')['connections']['Control']

                    before = starts()
                    if not args.health_only_idle: control = metrics('Control'); writable = metrics('Writable')
                    await asyncio.sleep(1)
                    assert starts() == before, (before, starts())
                    if not args.health_only_idle:
                        assert metrics('Control') > control and metrics('Writable') == writable
                        assert rows('Writable')['Input']['polling_state'] == 'inactive'
                    registration = {'owner': 'test-consumer', 'client_id': 'test-consumer', 'tags': ['PLC:Alias']}
                    api('/polling/demand/register', registration)
                    await ws_states(socket, ['Input', 'Alias'], ['waiting', 'active'])
                    await expect(['Input', 'Alias'], 'active')
                    await expect(['Other', 'Array[1]'], 'inactive')
                    health = api('/health')['connections']['PLC']
                    assert health['active_poll_work'] == 1 and health['inactive_poll_work'] == 2, health
                    assert health['inactive_tags'] == 3 and health['good_recent'] == 2, health
                    assert health['stale_or_bad'] == 0 and health['stale_ratio'] == 0, health

                    await asyncio.sleep(1)
                    after = starts()
                    assert after['Input'] > before['Input'], (before, after)
                    assert after['Other'] == before['Other'] and after['Array'] == before['Array'], (before, after)
                    api('/polling/demand/release', registration)
                    await expect(['Input', 'Alias'], 'inactive')
                    result = await asyncio.to_thread(api, '/polling/fresh-read', {'tags': [
                        {'connection_id': 'PLC', 'name': 'Array[1]'}], 'max_age_ms': 0, 'timeout_ms': 3000})
                    assert result['ok'] and result['tags'][0]['fresh'], result
                    await expect(['Array[0]', 'Array[1]'], 'active')
                    await expect(['Other', 'Input'], 'inactive')
                    assert starts()['Other'] == before['Other']
                    assert api('/polling/demand')['active_poll_test']['scan_selections_skipped'] > 0
                    if args.health_only_idle:
                        sim.terminate(); sim.wait(timeout=5)
                        await expect(['Array[0]', 'Array[1]'], 'error')
                        failed = api('/health')['connections']['PLC']
                        assert failed['polling_activity'] == 'active' and failed['active_poll_work'] == 1, failed
                        assert failed['stale_or_bad'] == 2 and failed['inactive_tags'] == 3, failed
                        assert 'polling idle' not in failed.get('reason', ''), failed
                        print('Health distinguishes a real active read failure from three intentionally inactive tags.')

                    if args.native_ua:
                        from asyncua import Client
                        async with Client('opc.tcp://127.0.0.1:14840') as client:
                            value = await client.get_node('ns=1;s=Tags/PLC/Other').read_data_value()
                            assert value.StatusCode.is_good() and value.Value.Value == 0, value
                            assert value.SourceTimestamp is not None
                        await expect(['Other'], 'active')
                        eligibility = api('/polling/demand')['active_poll_test']['connection_eligibility']
                        assert eligibility['PLC']['enabled']
                        if not args.health_only_idle:
                            assert eligibility['Writable']['enabled']
                            assert eligibility['Control']['reason'] == 'disabled_for_connection'
                        print('Native UA zero-age read woke an inactive physical tag and returned a verified sample.')

                print('Active polling test passed: idle reads stop, aliases wake physical roots, array fresh reads wake roots, inactive work stays out of batch prefetch, waiting precedes GOOD, health and work counts distinguish idle from failures.')
            except Exception:
                log.flush(); log.seek(0); print(log.read()[-8000:]); raise
            finally:
                for process in reversed(processes):
                    if process.poll() is None:
                        process.terminate()
                        try: process.wait(timeout=5)
                        except subprocess.TimeoutExpired: process.kill(); process.wait()

if __name__ == '__main__': asyncio.run(main())
