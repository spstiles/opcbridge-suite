#!/usr/bin/env python3
"""Disposable simulator/core test. Never run against installed services."""
import argparse
import asyncio
import json
import pathlib
import subprocess
import tempfile
import urllib.request
import websockets

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--core-fixture', required=True)
    parser.add_argument('--simulator', required=True)
    parser.add_argument('--scheduler-preview', action='store_true')
    args = parser.parse_args()
    processes = []
    with tempfile.TemporaryDirectory(prefix='opcbridge-cache-lifecycle-') as directory:
        root = pathlib.Path(directory)
        (root / 'connections').mkdir(); (root / 'tags').mkdir()
        (root / 'connections/PLC.json').write_text(json.dumps({'id': 'PLC', 'driver': 'ab_eip',
            'gateway': '127.0.0.1:14418', 'plc_type': 'lgx', 'path': '1,0',
            'polling_pacing': 'fast', 'poll_max_reads_per_sec': 0, 'poll_batch_size': 16}))
        (root / 'tags/PLC.json').write_text(json.dumps({'connection_id': 'PLC', 'tags': [
            {'name': 'Input', 'plc_tag_name': 'Input', 'datatype': 'int32', 'scan_ms': 100},
            {'name': 'Alias', 'source_tag': 'Input', 'datatype': 'int32'},
            {'name': 'Array', 'plc_tag_name': 'Array', 'datatype': 'int32', 'elem_count': 2, 'scan_ms': 100}]}))
        with (root / 'core.log').open('w+') as log:
            def start(argv):
                process = subprocess.Popen(argv, stdout=log, stderr=log)
                processes.append(process); return process
            def simulator():
                return start([args.simulator, '--plc=ControlLogix', '--path=1,0', '--port=14418',
                    '--tag=Input:DINT[1]', '--tag=Array:DINT[2]'])
            def rows():
                with urllib.request.urlopen('http://127.0.0.1:18080/tags?connection_id=PLC&exclude_system=1', timeout=2) as response:
                    return {row['name']: row for row in json.load(response)['tags']}
            selected = ['Input', 'Alias', 'Array[1]']
            async def expect_http(state):
                for _ in range(150):
                    try:
                        values = await asyncio.to_thread(rows)
                        if all(values.get(name, {}).get('polling_state') == state for name in selected):
                            for name in selected:
                                assert values[name]['quality'] == (1 if state == 'active' else 0), values[name]
                                assert values[name]['value'] == (0 if state == 'active' else None), values[name]
                            return
                    except OSError: pass
                    await asyncio.sleep(.05)
                raise AssertionError(('HTTP state timeout', state, values))
            async def expect_ws(socket, state):
                pending = set(selected)
                async with asyncio.timeout(15):
                    while pending:
                        message = json.loads(await socket.recv())
                        if message.get('type') != 'tag_update' or message.get('polling_state') != state: continue
                        name = message.get('name')
                        if name in pending:
                            assert message['quality'] == (1 if state == 'active' else 0), message
                            assert message['value'] == (0 if state == 'active' else None), message
                            pending.remove(name)
            try:
                sim = simulator()
                await asyncio.sleep(.2)
                start([args.core_fixture, '--config', str(root), '--http', '--ws-port', '18090'])
                await expect_http('active')
                assert not (await asyncio.to_thread(rows))['Array']['has_snapshot']
                with urllib.request.urlopen('http://127.0.0.1:18080/health', timeout=2) as response:
                    assert 'polling_activity' not in json.load(response)['connections']['PLC']

                if args.scheduler_preview:
                    def api(path, body=None):
                        request = urllib.request.Request('http://127.0.0.1:18080' + path,
                            data=None if body is None else json.dumps(body).encode(),
                            headers={'Content-Type': 'application/json'})
                        with urllib.request.urlopen(request, timeout=3) as response: return json.load(response)
                    before = api('/metrics')['connections']['PLC']['reads_total']
                    # No demand diagnostic requests during startup grace. The runtime
                    # must collect and plan independently of anyone viewing the UI.
                    await asyncio.sleep(32)
                    view = api('/polling/demand?connection_id=PLC')['scheduler_preview']
                    assert view['mode'] == 'preview_only' and not view['stale'], view
                    assert view['reads_skipped'] == 0 and view['polling_unchanged'], view
                    assert view['connections']['PLC']['would_idle'] == 2, view
                    assert {r['name'] for r in view['tags']} == {'Input', 'Array'}, view
                    assert api('/metrics')['connections']['PLC']['reads_total'] > before + 20
                    api('/polling/demand/register', {'owner': 'preview-test', 'client_id': 'preview-test', 'tags': ['PLC:Alias']})
                    for _ in range(60):
                        view = api('/polling/demand?connection_id=PLC')['scheduler_preview']
                        planned = {r['name']: r for r in view['tags']}
                        if planned['Input']['would_poll'] and not planned['Array']['would_poll']: break
                        await asyncio.sleep(.05)
                    else: raise AssertionError(('Alias demand did not reach physical root plan', view))
                    assert not api('/polling/demand?include_tags=0')['scheduler_preview']['tags']
                    api('/polling/demand/release', {'owner': 'preview-test', 'client_id': 'preview-test'})
                    print('Runtime scheduler preview passed: independent collection, physical-root planning, alias demand, and unchanged polling despite idle candidates.')

                async with websockets.connect('ws://127.0.0.1:18090') as socket:
                    await socket.send(json.dumps({'type': 'subscribe', 'tags': ['PLC:' + name for name in selected]}))
                    await asyncio.sleep(.1)
                    sim.terminate(); sim.wait(timeout=5)
                    await expect_ws(socket, 'error')
                    await expect_http('error')
                    simulator()
                    await expect_ws(socket, 'active')
                    await expect_http('active')
                print('HTTP/WS cache lifecycle passed: scalar/alias/array failure and unchanged-value recovery update quality and state, bad payloads are null.')
            except Exception:
                log.flush(); log.seek(0); print(log.read()[-6000:]); raise
            finally:
                for process in reversed(processes):
                    if process.poll() is None:
                        process.terminate()
                        try: process.wait(timeout=5)
                        except subprocess.TimeoutExpired: process.kill(); process.wait()

if __name__ == '__main__':
    asyncio.run(main())
