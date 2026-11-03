#!/usr/bin/env python3
"""Exercise unchanged UA values, bad quality, disconnects, and recovery locally."""
import argparse
import asyncio
import json
import pathlib
import subprocess
import tempfile
import time
import urllib.request

from asyncua import Server, ua


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--core-fixture', required=True, help='Core built with HTTP on localhost:18080')
    args = parser.parse_args()
    server = Server()
    await server.init()
    server.set_endpoint('opc.tcp://127.0.0.1:14840')
    ns = await server.register_namespace('opcbridge-health-test')
    node = await server.nodes.objects.add_variable(ua.NodeId('Steady', ns), 'Steady', ua.Variant(42, ua.VariantType.Int32))
    await server.start()
    running = True
    with tempfile.TemporaryDirectory(prefix='opcbridge-ua-health-') as directory:
        root = pathlib.Path(directory)
        for name in ['connections', 'tags']:
            (root / name).mkdir()
        (root / 'connections/Remote.json').write_text(json.dumps({
            'id': 'Remote', 'driver': 'opcua_client', 'endpoint': 'opc.tcp://127.0.0.1:14840'}))
        (root / 'tags/Remote.json').write_text(json.dumps({'connection_id': 'Remote', 'tags': [
            {'name': 'Steady', 'plc_tag_name': node.nodeid.to_string(), 'datatype': 'int32', 'scan_ms': 100}]}))

        def api(path):
            with urllib.request.urlopen('http://127.0.0.1:18080/' + path, timeout=10) as response:
                return json.load(response)

        async def health():
            return (await asyncio.to_thread(api, 'health'))['connections']['Remote']

        async def wait(predicate, timeout=25):
            end = time.monotonic() + timeout
            while time.monotonic() < end:
                try:
                    if await predicate():
                        return
                except (OSError, KeyError):
                    pass
                await asyncio.sleep(.2)
            raise AssertionError('UA health condition timed out')

        async def healthy():
            h = await health()
            return h['status'] == 'ok' and h.get('communication_verified') and h['good_recent'] == 1

        async def unhealthy():
            return (await health())['status'] != 'ok'

        with (root / 'core.log').open('w+') as log:
            process = subprocess.Popen([args.core_fixture, '--config', str(root), '--http', '--ws-port', '18090'],
                                       cwd=root, stdout=log, stderr=log)
            try:
                await wait(healthy)
                first = (await asyncio.to_thread(api, 'tags?connection_id=Remote'))['tags'][0]
                # Exceed both the value-age budget and the connection stall budget.
                await asyncio.sleep(65)
                assert await healthy(), await health()
                latest = (await asyncio.to_thread(api, 'tags?connection_id=Remote'))['tags'][0]
                assert latest['timestamp_ms'] == first['timestamp_ms'], (first, latest)
                assert not (await health())['stalled']
                watchdog = (await asyncio.to_thread(api, 'health'))['watchdog']
                assert watchdog['connections_stalled'] == 0 and watchdog['http_ok'], watchdog
                print('Unchanged GOOD value stays healthy past 60s; original timestamp preserved.', flush=True)
                bad = ua.DataValue(ua.Variant(42, ua.VariantType.Int32))
                bad.StatusCode = ua.StatusCode(ua.StatusCodes.BadSensorFailure)
                await node.write_value(bad)
                await wait(unhealthy)
                print('Bad upstream quality is unhealthy despite a responsive server.', flush=True)
                await node.write_value(ua.Variant(42, ua.VariantType.Int32))
                await wait(healthy)
                await server.stop()
                running = False
                await wait(unhealthy)
                assert not (await health()).get('communication_verified')
                print('Disconnected upstream is unhealthy.', flush=True)
                await server.start()
                running = True
                await wait(healthy, timeout=40)
                print('Reconnection restores healthy subscription.', flush=True)
            except Exception:
                log.flush()
                log.seek(0)
                print(log.read()[-8000:])
                raise
            finally:
                process.terminate()
                await asyncio.to_thread(process.wait, 15)
                if running:
                    await server.stop()


if __name__ == '__main__':
    asyncio.run(main())
