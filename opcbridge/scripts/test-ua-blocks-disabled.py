#!/usr/bin/env python3
"""Exercise PLC block -> UA array -> UA client -> local derived tags and disabled-node removal."""
import argparse
import asyncio
import json
import os
import pathlib
import subprocess
import struct
import tempfile
import time
import urllib.request

from asyncua import Client, ua


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--core-fixture', required=True, help='Core with HTTP on localhost:18080')
    parser.add_argument('--simulator', required=True)
    args = parser.parse_args()
    processes = []
    with tempfile.TemporaryDirectory(prefix='opcbridge-ua-blocks-') as directory:
        root = pathlib.Path(directory)
        for name in ['connections', 'tags']:
            (root / name).mkdir()
        def save(name, document):
            (root / name).write_text(json.dumps(document))
        modbus_reads = []
        modbus_writers = set()
        async def serve_modbus(reader, writer):
            modbus_writers.add(writer)
            try:
                while True:
                    header = await reader.readexactly(7)
                    transaction, _, length, unit = struct.unpack('>HHHB', header)
                    request = await reader.readexactly(length - 1)
                    address, count = struct.unpack('>HH', request[1:5])
                    modbus_reads.append(count)
                    response = bytes([request[0], count * 2]) + b''.join(struct.pack('>H', 1000 + address + i) for i in range(count))
                    writer.write(struct.pack('>HHHB', transaction, 0, len(response) + 1, unit) + response)
                    await writer.drain()
            except (asyncio.IncompleteReadError, ConnectionError):
                pass
            finally:
                modbus_writers.discard(writer)
                writer.close()
        modbus = await asyncio.start_server(serve_modbus, '127.0.0.1', 0)
        modbus_port = modbus.sockets[0].getsockname()[1]
        save('connections/SourceMB.json', {'id': 'SourceMB', 'driver': 'modbus_tcp',
            'gateway': f'127.0.0.1:{modbus_port}', 'path': '1', 'default_read_ms': 300})
        save('tags/SourceMB.json', {'connection_id': 'SourceMB', 'tags': [
            {'name': 'Block', 'datatype': 'uint16', 'register_type': 'holding_register', 'address': 40001, 'elem_count': 4, 'scan_ms': 100},
            {'name': 'Value', 'datatype': 'uint16', 'source_tag': 'Block[2]'}]})
        save('connections/Source.json', {'id': 'Source', 'driver': 'ab_eip', 'gateway': '127.0.0.1:14418',
            'path': '1,0', 'plc_type': 'lgx', 'poll_active_only': False, 'poll_max_reads_per_sec': 0})
        source_tags = [
            {'name': 'Block', 'plc_tag_name': 'Array', 'datatype': 'int32', 'elem_count': 4, 'scan_ms': 100, 'writable': True},
            {'name': 'Value', 'source_tag': 'Block[2]', 'datatype': 'int32', 'writable': True},
            {'name': 'ECU', 'source_tag': 'Missing[69]', 'datatype': 'int32', 'enabled': False}]
        def save_source():
            save('tags/Source.json', {'connection_id': 'Source', 'tags': source_tags})
        save_source()
        save('connections/Empty.json', {'id': 'Empty', 'driver': 'ab_eip', 'gateway': '127.0.0.1:14418', 'path': '1,0', 'plc_type': 'lgx'})
        save('tags/Empty.json', {'connection_id': 'Empty', 'tags': [
            {'name': 'Off', 'plc_tag_name': 'Array', 'datatype': 'int32', 'enabled': False}]})
        save('connections/Remote.json', {'id': 'Remote', 'driver': 'opcua_client', 'endpoint': 'opc.tcp://127.0.0.1:14840'})
        save('tags/Remote.json', {'connection_id': 'Remote', 'tags': [
            {'name': 'Block', 'plc_tag_name': 'ns=1;s=Tags/Source/Block', 'datatype': 'int32', 'elem_count': 4, 'scan_ms': 100},
            # Existing imports made before array metadata was available also recover.
            {'name': 'LegacyBlock', 'plc_tag_name': 'ns=1;s=Tags/Source/Block', 'datatype': 'int32', 'scan_ms': 100},
            {'name': 'Value', 'source_tag': 'Block[2]', 'datatype': 'int32'},
            {'name': 'Bit', 'source_tag': 'Block[2]', 'bit': 0, 'datatype': 'bool'},
            {'name': 'MBBlock', 'plc_tag_name': 'ns=1;s=Tags/SourceMB/Block', 'datatype': 'uint16', 'elem_count': 4, 'scan_ms': 100},
            {'name': 'MBValue', 'source_tag': 'MBBlock[2]', 'datatype': 'uint16'}]})

        def api(path, body=None):
            request = urllib.request.Request('http://127.0.0.1:18080/' + path,
                data=None if body is None else json.dumps(body).encode(),
                headers={'Content-Type': 'application/json', 'X-Admin-Token': 'blocks-admin'})
            with urllib.request.urlopen(request, timeout=40) as response:
                return json.load(response)
        def rows():
            return {t['name']: t for t in api('tags?connection_id=Remote')['tags']}
        async def wait(predicate, timeout=25):
            end = time.monotonic() + timeout
            while time.monotonic() < end:
                try:
                    if await asyncio.to_thread(predicate):
                        return
                except OSError:
                    pass
                await asyncio.sleep(.1)
            raise AssertionError('UA block condition timed out')
        async def ua_good(client, name):
            end = time.monotonic() + 25
            while time.monotonic() < end:
                value = await client.get_node('ns=1;s=Tags/' + name).read_data_value(raise_on_bad_status=False)
                if value.StatusCode.is_good():
                    return value
                await asyncio.sleep(.1)
            raise AssertionError(f'No good UA value for {name}')
        async def reload():
            result = await asyncio.to_thread(api, 'reload/connection', {'connection_id': 'Source', 'token': 'blocks-write'})
            assert result['ok'] and not result.get('full_rebuild_required'), result
        env = os.environ.copy()
        env['OPCBRIDGE_WRITE_TOKEN'] = 'blocks-write'
        env['OPCBRIDGE_ADMIN_SERVICE_TOKEN'] = 'blocks-admin'
        with (root / 'services.log').open('w+') as log:
            def start(argv):
                process = subprocess.Popen(argv, cwd=root, stdout=log if argv[0] == args.core_fixture else subprocess.DEVNULL, stderr=log, env=env)
                processes.append(process)
            try:
                start([args.simulator, '--plc=ControlLogix', '--path=1,0', '--port=14418', '--tag=Array:DINT[4]'])
                start([args.core_fixture, '--config', str(root), '--http', '--opcua', '--opcua-port', '14840', '--ws-port', '18090'])
                await wait(lambda: rows().get('Block', {}).get('quality') == 1)
                result = await asyncio.to_thread(api, 'write', {'connection_id': 'Source', 'name': 'Value', 'value': '7', 'token': 'blocks-write'})
                assert result['ok'], result
                await wait(lambda: rows().get('Value', {}).get('value') == 7 and rows().get('Bit', {}).get('value') is True)
                data = rows()
                assert data['Block']['value'] == [0, 0, 7, 0], data
                assert data['LegacyBlock']['value'] == [0, 0, 7, 0], data
                await wait(lambda: rows().get('MBValue', {}).get('value') == 1002)
                assert rows()['MBBlock']['value'] == [1000, 1001, 1002, 1003]
                assert modbus_reads and all(count == 4 for count in modbus_reads), modbus_reads
                health = api('health')['connections']
                assert health['Remote']['status'] == 'ok', health
                assert health['Source']['poll_tag_count'] == 1, health
                async with Client('opc.tcp://127.0.0.1:14840') as client:
                    for connection in ['Source', 'Remote']:
                        value = await client.get_node(f'ns=1;s=Tags/{connection}/Block').read_data_value()
                        assert value.Value.VariantType == ua.VariantType.Int32 and value.Value.Value == [0, 0, 7, 0]
                    mb = await ua_good(client, 'SourceMB/Block')
                    assert mb.Value.VariantType == ua.VariantType.UInt16 and mb.Value.Value == [1000, 1001, 1002, 1003]
                    legacy = await ua_good(client, 'Remote/LegacyBlock')
                    assert legacy.Value.Value == [0, 0, 7, 0]
                    missing = await client.get_node('ns=1;s=Tags/Source/ECU').read_data_value(raise_on_bad_status=False)
                    assert missing.StatusCode.value == ua.StatusCodes.BadNodeIdUnknown
                    print('AB and Modbus block reads supply typed UA arrays, legacy roots, elements, local aliases and bits; disabled ECU is absent.', flush=True)
                    metadata = await asyncio.to_thread(api, 'config/opcua/browse', {'endpoint': 'opc.tcp://127.0.0.1:14840', 'token': 'blocks-write'})
                    tags = next(c['tags'] for c in metadata['connections'] if c['name'] == 'Source')
                    block = next(t for t in tags if t['name'] == 'Block')
                    assert block['datatype'] == 'int32' and block['elem_count'] == 4 and not block['writable'], block
                    assert all(t['name'] != 'ECU' for t in tags)
                    assert next(c['tags'] for c in metadata['connections'] if c['name'] == 'Empty') == []
                    await reload()
                    await wait(lambda: rows().get('Value', {}).get('value') == 7)
                    assert (await ua_good(client, 'Source/Value')).Value.Value == 7
                    updates = []
                    class Handler:
                        def datachange_notification(self, node, value, data):
                            updates.append(data.monitored_item.Value.StatusCode.value)
                    subscription = await client.create_subscription(50, Handler())
                    await subscription.subscribe_data_change(client.get_node('ns=1;s=Tags/Source/Value'))
                    # Disable a previously published leaf; a regular connection reload removes it.
                    source_tags[1]['enabled'] = False
                    save_source()
                    await reload()
                    disabled = await client.get_node('ns=1;s=Tags/Source/Value').read_data_value(raise_on_bad_status=False)
                    assert disabled.StatusCode.value == ua.StatusCodes.BadNodeIdUnknown
                    await wait(lambda: ua.StatusCodes.BadNodeIdUnknown in updates)
                    assert (await client.get_node('ns=1;s=Tags/Source/Block').read_data_value()).StatusCode.is_good()
                    await wait(lambda: rows().get('Value', {}).get('value') == 7)
                    assert rows()['Value']['value'] == 7, 'Local client derivation must survive disabling the separate source leaf'
                    source_tags[1]['enabled'] = True
                    save_source()
                    await reload()
                    await wait(lambda: api('tags?connection_id=Source')['tags'] and
                        next(t for t in api('tags?connection_id=Source')['tags'] if t['name'] == 'Value').get('quality') == 1)
                    assert (await ua_good(client, 'Source/Value')).Value.Value == 7
                    await subscription.delete()
                    source_tags[2]['enabled'] = True
                    save_source()
                    await reload()
                    unresolved = await client.get_node('ns=1;s=Tags/Source/ECU').read_data_value(raise_on_bad_status=False)
                    assert not unresolved.StatusCode.is_good() and unresolved.StatusCode.value != ua.StatusCodes.BadNodeIdUnknown
                    # Keep array subscriptions unchanged beyond the normal 15-second freshness budget.
                    await asyncio.sleep(16)
                    assert api('health')['connections']['Remote']['status'] == 'ok'
                    print('Browse preserves block metadata; unchanged reload, disable and re-enable preserve blocks and derived values without full rebuild.', flush=True)
            except Exception:
                log.flush(); log.seek(0); print(log.read()[-10000:]); raise
            finally:
                modbus.close()
                for writer in list(modbus_writers):
                    writer.close()
                await asyncio.wait_for(modbus.wait_closed(), timeout=5)
                for process in reversed(processes):
                    if process.poll() is None:
                        process.terminate()
                        try:
                            process.wait(timeout=15)
                        except subprocess.TimeoutExpired:
                            process.kill(); process.wait()


if __name__ == '__main__':
    asyncio.run(main())
