#!/usr/bin/env python3
"""Real consumer lifecycle against disposable local core, Flow and PLC simulator."""
import argparse
import asyncio
import json
import os
import pathlib
import subprocess
import tempfile
import time
import urllib.request
from asyncua import Client, ua
import websockets

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--core-fixture', required=True)
    parser.add_argument('--simulator', required=True)
    parser.add_argument('--flow-binary', required=True)
    args = parser.parse_args()
    processes = []
    with tempfile.TemporaryDirectory(prefix='opcbridge-active-consumers-') as directory:
        root = pathlib.Path(directory)
        for name in ['connections', 'tags', 'flow-connections']: (root / name).mkdir()
        names = ['Input', 'Other', 'Background', 'Unused']
        (root / 'connections/PLC.json').write_text(json.dumps({'id': 'PLC', 'driver': 'ab_eip',
            'gateway': '127.0.0.1:14418', 'path': '1,0', 'plc_type': 'lgx',
            'polling_pacing': 'fast', 'poll_batch_size': 16, 'poll_max_reads_per_sec': 0}))
        (root / 'tags/PLC.json').write_text(json.dumps({'connection_id': 'PLC', 'tags': [
            {'name': name, 'plc_tag_name': name, 'datatype': 'int32', 'scan_ms': 100} for name in names]}))
        def write(name, value):
            path = root / name; path.write_text(json.dumps(value)); return str(path)
        def api(path, body=None, port=18080):
            request = urllib.request.Request(f'http://127.0.0.1:{port}' + path,
                data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(request, timeout=5) as response: return json.load(response)
        def rows(): return {r['name']: r for r in api('/tags?connection_id=PLC&exclude_system=1')['tags']}
        def demand(): return api('/polling/demand?connection_id=PLC')
        def starts(): return demand()['active_poll_test']['poll_read_requests']['PLC']
        async def wait(predicate, timeout=15):
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                try:
                    value = await asyncio.to_thread(predicate)
                    if value: return value
                except OSError: pass
                await asyncio.sleep(.05)
            raise AssertionError('Consumer lifecycle condition timed out')
        async def state(selected, wanted, timeout=15):
            def check():
                current = rows()
                return all(current.get(name, {}).get('polling_state') == wanted for name in selected)
            await wait(check, timeout)
        flow = {'id': 'test', 'name': 'Long interval', 'enabled': True, 'edges': [], 'nodes': [
            {'id': 'input', 'type': 'opc_tag_input', 'config': {'connection_id': 'PLC',
                'tag_name': 'Background', 'poll_interval_ms': 600000}}]}
        with (root / 'server.log').open('w+') as log:
            def start(argv, env=None):
                process = subprocess.Popen(argv, stdout=log, stderr=log, env=env)
                processes.append(process); return process
            client1 = client2 = socket1 = socket2 = None
            try:
                start([args.simulator, '--plc=ControlLogix', '--path=1,0', '--port=14418'] +
                      ['--tag=' + name + ':DINT[1]' for name in names])
                await asyncio.sleep(.2)
                start([args.core_fixture, '--config', str(root), '--http', '--opcua', '--opcua-port', '14840', '--ws-port', '18090'],
                    {**os.environ, 'OPCBRIDGE_ACTIVE_POLL_TEST_CONNECTIONS': '["PLC"]', 'OPCBRIDGE_UA_VERIFY_READS': '0'})
                await state(names, 'active')
                start([args.flow_binary, '--config', write('flow-config.json', {'listen_host': '127.0.0.1',
                    'listen_port': 18198, 'connections_dir': str(root / 'flow-connections'),
                    'opcbridge_base_url': 'http://127.0.0.1:18080'}),
                    '--flows', write('drafts.json', {'flows': [flow]}), '--deployed', write('deployed.json', {'flows': [flow]}),
                    '--state', str(root / 'flow-state.json')])
                await wait(lambda: 'opcbridge-flow' in demand()['consumer_registrations'])
                await wait(lambda: api('/flows', port=18198)['runtime']['test']['nodes']['input']['messages_out'] >= 1)
                class Handler:
                    def datachange_notification(self, node, value, data): pass
                client1 = Client('opc.tcp://127.0.0.1:14840'); await client1.connect()
                client2 = Client('opc.tcp://127.0.0.1:14840'); await client2.connect()
                sub1 = await client1.create_subscription(100, Handler())
                sub2 = await client2.create_subscription(100, Handler())
                await sub1.subscribe_data_change(client1.get_node('ns=1;s=Tags/PLC/Input'))
                await sub2.subscribe_data_change(client2.get_node('ns=1;s=Tags/PLC/Input'))
                await sub1.set_publishing_mode(False)
                socket1 = await websockets.connect('ws://127.0.0.1:18090')
                socket2 = await websockets.connect('ws://127.0.0.1:18090')
                for socket in [socket1, socket2]:
                    await socket.send(json.dumps({'type': 'subscribe', 'tags': ['PLC:Other']}))
                await asyncio.sleep(32)
                await state(['Unused'], 'inactive')
                await state(['Input', 'Other', 'Background'], 'active')
                background = {r['name']: r for r in demand()['tags']}['Background']
                assert 'consumer:opcbridge-flow' in background['reasons'], background
                assert 'http_recent_read' not in background['reasons'], background
                before = starts(); await asyncio.sleep(1); after = starts()
                assert after['Background'] > before['Background'] and after['Unused'] == before['Unused']
                print('Long-interval Flow demand survives HTTP lease expiry; unused work idles.')
                # Changing one WS scope must not remove the other's interest.
                await socket1.send(json.dumps({'type': 'subscribe', 'tags': ['PLC:Input']}))
                await sub1.set_monitoring_mode(ua.MonitoringMode.Disabled)
                await asyncio.sleep(.5)
                await state(['Input', 'Other'], 'active')
                await socket2.close(); socket2 = None
                # A draft change must not move live Flow demand.
                flow['nodes'][0]['config']['tag_name'] = 'Unused'
                assert api('/flows', flow, port=18198)['ok']
                await asyncio.sleep(1.2)
                assert set(demand()['consumer_registrations']['opcbridge-flow']['tags']) == {'PLC:Background'}
                await state(['Unused'], 'inactive')
                assert api('/flows/test/deploy', {}, port=18198)['ok']
                await state(['Unused'], 'active')
                await wait(lambda: api('/flows', port=18198)['runtime']['test']['nodes']['input']['messages_out'] >= 1)
                await state(['Other', 'Background'], 'inactive')
                assert set(demand()['consumer_registrations']['opcbridge-flow']['tags']) == {'PLC:Unused'}
                assert api('/flows/test/disable', {}, port=18198)['ok']
                await wait(lambda: 'opcbridge-flow' not in demand()['consumer_registrations'])
                await state(['Input'], 'active')
                print('WS replacement/disconnect and Flow draft/redeploy/disable isolate demand; cached long-interval input wakes and initializes its new source.')
                await socket1.send(json.dumps({'type': 'subscribe', 'tags': []}))
                await client2.disconnect(); client2 = None
                await state(['Input'], 'inactive')
                # Disabled item remains registered; Sampling counts even when
                # publication is disabled, while Disabled releases physical reads.
                await sub1.set_monitoring_mode(ua.MonitoringMode.Sampling)
                await state(['Input'], 'active')
                observed = {r['name']: r for r in demand()['tags']}['Input']
                assert observed['opcua_active_monitored_items'] == 1, observed
                await state(['Other', 'Background'], 'inactive')
                await sub1.set_monitoring_mode(ua.MonitoringMode.Disabled)
                # The last real HTTP read lease remains valid after Flow disable.
                await state(names, 'inactive', timeout=45)
                await client1.disconnect(); client1 = None
                await socket1.close(); socket1 = None
                before = starts(); await asyncio.sleep(1); assert starts() == before
                health = api('/health')['connections']['PLC']
                assert health['polling_activity'] == 'idle' and health['stale_or_bad'] == 0, health
                print('UA shared subscriptions, publication-disabled sampling, Disabled mode, and final disconnect release correctly; all physical requests stop when consumers are gone.')
            except Exception:
                log.flush(); log.seek(0); print(log.read()[-9000:]); raise
            finally:
                for socket in [socket1, socket2]:
                    if socket is not None: await socket.close()
                for client in [client1, client2]:
                    if client is not None:
                        try: await client.disconnect()
                        except Exception: pass
                for process in reversed(processes):
                    if process.poll() is None:
                        process.terminate()
                        try: process.wait(timeout=5)
                        except subprocess.TimeoutExpired: process.kill(); process.wait()

if __name__ == '__main__': asyncio.run(main())
