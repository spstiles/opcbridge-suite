#!/usr/bin/env python3
"""Reload churn against disposable local core and PLC simulator only."""
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
    parser = argparse.ArgumentParser()
    parser.add_argument('--core-fixture', required=True)
    parser.add_argument('--simulator', required=True)
    args = parser.parse_args()
    processes = []
    with tempfile.TemporaryDirectory(prefix='opcbridge-active-reload-') as directory:
        root = pathlib.Path(directory)
        (root / 'connections').mkdir(); (root / 'tags').mkdir()
        connection = {'id': 'PLC', 'driver': 'ab_eip', 'gateway': '127.0.0.1:14418',
            'path': '1,0', 'plc_type': 'lgx', 'polling_pacing': 'fast', 'poll_max_reads_per_sec': 0}
        def save(cid, name, writable=False, scan=2000):
            config = {**connection, 'id': cid}
            (root / f'connections/{cid}.json').write_text(json.dumps(config))
            (root / f'tags/{cid}.json').write_text(json.dumps({'connection_id': cid, 'tags': [
                {'name': name, 'plc_tag_name': 'Input', 'datatype': 'int32', 'writable': writable, 'scan_ms': scan}]}))
        save('PLC', 'Input'); save('ZControl', 'ControlValue', scan=100)
        def api(path, body=None):
            req = urllib.request.Request('http://127.0.0.1:18080' + path,
                data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=35) as response: return json.load(response)
        def reload():
            result = api('/reload/connection', {'connection_id': 'PLC', 'token': 'reload-test-token'})
            assert result['ok'] and not result['pending'], result
            return result
        def rows(): return api('/tags?connection_id=PLC&exclude_system=1')['tags']
        def metrics(): return api('/metrics')['connections']['ZControl']['reads_total']
        def epoch(cid='PLC'):
            return api('/polling/demand?connection_id=' + cid)['tags'][0]['driver_epoch']
        async def expect(predicate, timeout=12):
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                try:
                    value = await asyncio.to_thread(predicate)
                    if value: return value
                except OSError: pass
                await asyncio.sleep(.05)
            raise AssertionError('Reload condition timed out')
        async def ua_status(client, name):
            values = await client.uaclient.read(ua.ReadParameters(NodesToRead=[ua.ReadValueId(
                NodeId=ua.NodeId.from_string('ns=1;s=Tags/PLC/' + name), AttributeId=ua.AttributeIds.Value)]))
            return values[0]
        with (root / 'server.log').open('w+') as log:
            def start(argv, env=None):
                process = subprocess.Popen(argv, stdout=log, stderr=log, env=env)
                processes.append(process); return process
            try:
                start([args.simulator, '--plc=ControlLogix', '--path=1,0', '--port=14418', '--tag=Input:DINT[1]'])
                await asyncio.sleep(.2)
                start([args.core_fixture, '--config', str(root), '--http', '--opcua', '--opcua-port', '14840', '--ws-port', '18090'],
                    {**os.environ, 'OPCBRIDGE_ACTIVE_POLL_TEST_CONNECTIONS': '["PLC"]',
                     'OPCBRIDGE_WRITE_TOKEN': 'reload-test-token', 'OPCBRIDGE_UA_VERIFY_READS': '0'})
                await expect(lambda: rows() and rows()[0]['quality'] == 1)
                original_epoch, control_epoch = epoch(), epoch('ZControl')
                async with Client('opc.tcp://127.0.0.1:14840') as client:
                    # Launch just after a known completion so an old scan cannot
                    # satisfy the pending request before the replacement is installed.
                    previous = api('/metrics')['connections']['PLC']['reads_total']
                    await expect(lambda: api('/metrics')['connections']['PLC']['reads_total'] > previous)
                    pending = asyncio.create_task(asyncio.to_thread(api, '/polling/fresh-read', {
                        'tags': [{'connection_id': 'PLC', 'name': 'Input'}], 'max_age_ms': 0, 'timeout_ms': 5000}))
                    await asyncio.sleep(.05)
                    before_control = metrics()
                    save('PLC', 'Replacement', scan=100)
                    await asyncio.to_thread(reload)
                    result = await pending
                    assert not result['ok'] and result['tags'][0]['reason'] == 'not_found', result
                    assert 'sample' not in result['tags'][0], result
                    await expect(lambda: rows() and rows()[0]['name'] == 'Replacement' and rows()[0]['quality'] == 1)
                    assert epoch() != original_epoch and epoch('ZControl') == control_epoch
                    old = await ua_status(client, 'Input')
                    assert old.StatusCode.value == ua.StatusCodes.BadDataUnavailable, old
                    assert metrics() > before_control
                    print('Active replacement passed: pending old input fails without a sample; old UA node is retired; unrelated polling continues.')
                    current_epoch = epoch()
                    (root / 'connections/PLC.json').write_text('{')
                    try:
                        await asyncio.to_thread(reload)
                    except urllib.error.HTTPError as error:
                        assert error.code == 500
                    else: raise AssertionError('Malformed config silently removed a live connection')
                    (root / 'connections/PLC.json').write_text(json.dumps(connection))
                    await expect(lambda: rows()[0]['quality'] == 1)
                    assert epoch() == current_epoch and epoch('ZControl') == control_epoch
                    try:
                        await asyncio.to_thread(api, '/reload/connection', {'connection_id': 'Unknown', 'token': 'reload-test-token'})
                    except urllib.error.HTTPError as error:
                        assert error.code == 500
                    else: raise AssertionError('Unknown connection was accepted as a removal')
                    print('Invalid/unknown reloads retain the existing driver and unrelated polling.')

                    # Let the replacement become inactive, then replace it again.
                    await expect(lambda: rows()[0].get('polling_state') == 'inactive', timeout=38)
                    inactive_epoch = epoch()
                    await asyncio.to_thread(reload)
                    await expect(lambda: rows()[0]['quality'] == 1)
                    assert epoch() != inactive_epoch
                    await expect(lambda: api('/polling/demand?connection_id=PLC')['scheduler_preview']['tags'][0]['reason'] == 'startup_grace')
                    print('Inactive replacement passed: new driver epoch restarts grace and polling.')
                    tag_path = root / 'tags/PLC.json'
                    changed = json.loads(tag_path.read_text())
                    changed['tags'][0]['datatype'] = 'float32'
                    tag_path.write_text(json.dumps(changed))
                    conflict = await asyncio.to_thread(reload)
                    assert conflict['opcua_sync']['datatype_conflicts'] == 1, conflict
                    value = await ua_status(client, 'Replacement')
                    assert value.StatusCode.value == ua.StatusCodes.BadDataUnavailable, value
                    save('PLC', 'Replacement', scan=100)
                    await asyncio.to_thread(reload)
                    await expect(lambda: rows()[0]['quality'] == 1)
                    await expect(lambda: metrics() > before_control)
                    print('Datatype conflict retires the incompatible UA value until its schema is restored or rebuilt.')

                    before_control = metrics()
                    (root / 'connections/PLC.json').unlink(); (root / 'tags/PLC.json').unlink()
                    retired = await asyncio.to_thread(reload)
                    assert retired['opcua_sync']['retired'] >= 1, retired
                    assert not rows()
                    value = await ua_status(client, 'Replacement')
                    assert value.StatusCode.value == ua.StatusCodes.BadDataUnavailable, value
                    await expect(lambda: not api('/polling/demand?connection_id=PLC')['scheduler_preview']['tags'])
                    telemetry = api('/polling/demand')['active_poll_test']
                    assert 'PLC' not in telemetry['connection_eligibility'] and 'PLC' not in telemetry['poll_read_requests'], telemetry
                    await expect(lambda: metrics() > before_control)
                    assert epoch('ZControl') == control_epoch
                    # Reuse the stable node name with changed write policy.
                    save('PLC', 'Replacement', writable=True, scan=100)
                    await asyncio.to_thread(reload)
                    await expect(lambda: rows()[0]['quality'] == 1)
                    value = await ua_status(client, 'Replacement')
                    assert value.StatusCode.is_good(), value
                    policy = api('/polling/demand')['active_poll_test']['connection_eligibility']['PLC']
                    assert not policy['enabled'] and policy['reason'] == 'writable_tags', policy
                    assert 'polling_activity' not in api('/health')['connections']['PLC']
                    print('Removal/re-add passed: cache/UA/preview/test telemetry are retired, vector shifts preserve other polling, and writable re-add fails open.')
            except Exception:
                log.flush(); log.seek(0); print(log.read()[-9000:]); raise
            finally:
                for process in reversed(processes):
                    if process.poll() is None:
                        process.terminate()
                        try: process.wait(timeout=5)
                        except subprocess.TimeoutExpired: process.kill(); process.wait()

if __name__ == '__main__': asyncio.run(main())
