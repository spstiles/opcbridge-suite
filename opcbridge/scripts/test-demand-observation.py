#!/usr/bin/env python3
"""Exercise demand observers against an isolated running test server.

Requires asyncua and websockets. The test server must use disposable configuration
with a declared _memory connection and tags Source (int32), Derived
(source_tag=Source), and Unused (int32).
Never point this test at an installed or production server.
"""
import argparse
import asyncio
import json
import urllib.request
import urllib.error
from asyncua import Client, ua
import websockets


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--http', default='http://127.0.0.1:18080')
    parser.add_argument('--ua', default='opc.tcp://127.0.0.1:14840')
    parser.add_argument('--ws', default='ws://127.0.0.1:18090')
    args = parser.parse_args()

    def read():
        with urllib.request.urlopen(args.http + '/polling/demand?connection_id=_memory', timeout=5) as response:
            result = json.load(response)
        assert result['mode'] == 'observe_only' and result['polling_unchanged']
        assert not result['coverage_complete'] and not result['safe_to_suspend_unobserved']
        return {row['name']: row for row in result['tags']}

    async def expect(predicate):
        for _ in range(50):
            rows = await asyncio.to_thread(read)
            if predicate(rows):
                return rows
            await asyncio.sleep(.1)
        raise AssertionError(rows)

    initial = await asyncio.to_thread(read)
    assert not initial['Unused']['observed_demand']
    # Browsing is not monitoring. Duplicate monitors count separately and release separately.
    async with Client(args.ua) as client:
        await client.nodes.objects.get_children()
        assert not (await asyncio.to_thread(read))['Derived']['observed_demand']
        class Handler:
            def datachange_notification(self, node, value, data):
                pass
        first = await client.create_subscription(100, Handler())
        second = await client.create_subscription(100, Handler())
        node = client.get_node('ns=1;s=Tags/_memory/Derived')
        await first.subscribe_data_change(node)
        handle = await second.subscribe_data_change(node)
        rows = await expect(lambda r: r['Derived']['opcua_registered_monitored_items'] == 2)
        assert 'derived_source:Derived' in rows['Source']['reasons']
        await first.set_monitoring_mode(ua.MonitoringMode.Disabled)
        rows = await expect(lambda r: r['Derived']['opcua_active_monitored_items'] == 1)
        assert rows['Derived']['opcua_registered_monitored_items'] == 2
        await second.set_monitoring_mode(ua.MonitoringMode.Sampling)
        await second.modify_monitored_item(handle, 250)
        await expect(lambda r: r['Derived']['opcua_min_explicit_sampling_interval_ms'] == 250)
        await second.set_publishing_mode(False)
        assert (await asyncio.to_thread(read))['Derived']['opcua_active_monitored_items'] == 1
        await second.set_monitoring_mode(ua.MonitoringMode.Disabled)
        rows = await expect(lambda r: r['Derived']['opcua_active_monitored_items'] == 0)
        assert 'opcua_active_monitored_item' not in rows['Derived']['reasons']
        assert 'derived_source:Derived' not in rows['Source']['reasons']
        await second.set_monitoring_mode(ua.MonitoringMode.Sampling)
        await expect(lambda r: r['Derived']['opcua_active_monitored_items'] == 1)
        await first.delete()
        await expect(lambda r: r['Derived']['opcua_registered_monitored_items'] == 1)
        # Disconnecting without deleting the second subscription must clean it up on session close.
    await expect(lambda r: r['Derived']['opcua_registered_monitored_items'] == 0)
    async with websockets.connect(args.ws) as socket:
        await expect(lambda r: 'websocket_all_tags' in r['Unused']['reasons'])
        await socket.send(json.dumps({'type': 'subscribe', 'tags': ['_memory:Derived']}))
        rows = await expect(lambda r: r['Derived']['websocket_subscribers'] == 1 and not r['Unused']['observed_demand'])
        assert 'derived_source:Derived' in rows['Source']['reasons']
        await socket.send(json.dumps({'type': 'subscribe', 'tags': []}))
        await expect(lambda r: not r['Derived']['observed_demand'])
        await socket.send(json.dumps({'type': 'subscribe_all'}))
        await expect(lambda r: 'websocket_all_tags' in r['Unused']['reasons'])
    await expect(lambda r: not r['Unused']['observed_demand'])
    # Explicit demand replaces inferred stream interest without changing delivery.
    async with websockets.connect(args.ws) as socket:
        await expect(lambda r: 'websocket_all_tags' in r['Unused']['reasons'])
        for invalid in [
            {'type': 'register_demand', 'owner': 'recorder', 'demand_mode': 'explicit', 'tags': [123]},
            {'type': 'register_demand', 'owner': 'recorder', 'demand_mode': 'invalid', 'tags': []},
        ]:
            await socket.send(json.dumps(invalid))
            await asyncio.sleep(.1)
            assert 'websocket_all_tags' in (await asyncio.to_thread(read))['Unused']['reasons']
        await socket.send(json.dumps({'type': 'register_demand', 'owner': 'recorder',
            'demand_mode': 'explicit', 'tags': ['_memory:Source']}))
        rows = await expect(lambda r: not r['Unused']['observed_demand'])
        assert 'consumer:recorder' in rows['Source']['reasons']
        # A malformed replacement cannot disable the conservative stream scope.
        await socket.send(json.dumps({'type': 'register_demand', 'owner': 'recorder',
            'demand_mode': 'subscription', 'tags': [123]}))
        await asyncio.sleep(.1)
        assert not (await asyncio.to_thread(read))['Unused']['observed_demand']
        # Changing delivery scope does not undo explicit demand mode.
        await socket.send(json.dumps({'type': 'subscribe_all'}))
        await asyncio.sleep(.1)
        assert not (await asyncio.to_thread(read))['Unused']['observed_demand']
        await socket.send(json.dumps({'type': 'release_demand', 'owner': 'recorder'}))
        await expect(lambda r: not r['Source']['observed_demand'])
        await socket.send(json.dumps({'type': 'register_demand', 'owner': 'recorder',
            'demand_mode': 'subscription', 'tags': []}))
        await expect(lambda r: 'websocket_all_tags' in r['Unused']['reasons'])
    await expect(lambda r: not r['Unused']['observed_demand'])
    # Owners are connection-scoped and independent of stream subscriptions.
    async with websockets.connect(args.ws) as first:
        async with websockets.connect(args.ws) as second:
            for socket in [first, second]:
                await socket.send(json.dumps({'type': 'subscribe', 'tags': []}))
                await socket.send(json.dumps({'type': 'register_demand', 'owner': 'alarms', 'tags': ['_memory:Source']}))
            await first.send(json.dumps({'type': 'register_demand', 'owner': 'historian', 'tags': ['_memory:Derived']}))
            rows = await expect(lambda r: 'consumer:alarms' in r['Source']['reasons'] and 'consumer:historian' in r['Derived']['reasons'])
            assert rows['Derived']['websocket_subscribers'] == 0
            await first.send(json.dumps({'type': 'register_demand', 'owner': 'alarms', 'tags': ['_memory:Unused']}))
            await expect(lambda r: 'consumer:alarms' in r['Source']['reasons'] and 'consumer:alarms' in r['Unused']['reasons'])
            await first.send(json.dumps({'type': 'register_demand', 'owner': 'alarms', 'tags': [42]}))
            await asyncio.sleep(.1)
            assert 'consumer:alarms' in (await asyncio.to_thread(read))['Unused']['reasons']
            await first.send(json.dumps({'type': 'release_demand', 'owner': 'alarms'}))
            await expect(lambda r: 'consumer:alarms' not in r['Unused']['reasons'] and 'consumer:alarms' in r['Source']['reasons'])
        await expect(lambda r: 'consumer:alarms' not in r['Source']['reasons'] and 'consumer:historian' in r['Derived']['reasons'])
        await first.send(json.dumps({'type': 'register_demand', 'owner': 'historian', 'all_tags': True}))
        await expect(lambda r: 'consumer:historian' in r['Unused']['reasons'])
    await expect(lambda r: not r['Unused']['observed_demand'] and not r['Derived']['observed_demand'])
    # Reconnect registers fresh demand; a previous owner does not survive disconnect.
    async with websockets.connect(args.ws) as socket:
        await socket.send(json.dumps({'type': 'subscribe', 'tags': []}))
        await socket.send(json.dumps({'type': 'register_demand', 'owner': 'alarms', 'tags': ['_memory:Source']}))
        await expect(lambda r: 'consumer:alarms' in r['Source']['reasons'])
    await expect(lambda r: not r['Source']['observed_demand'])
    # HTTP background registrations are renewable, independent owners too.
    def lease(client, tags, **extra):
        payload = {'client_id': client, 'owner': 'test-http', 'tags': tags, **extra}
        request = urllib.request.Request(args.http + '/polling/demand/register',
            data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=5) as response:
            assert json.load(response)['lease_ms'] == 60000
    def release(client):
        request = urllib.request.Request(args.http + '/polling/demand/release',
            data=json.dumps({'client_id': client, 'owner': 'test-http'}).encode(),
            headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=5) as response:
            assert json.load(response)['ok']
    lease('first', ['_memory:Source'])
    lease('second', ['_memory:Source'])
    await expect(lambda r: 'consumer:test-http' in r['Source']['reasons'])
    lease('first', [], patterns=[{'connection_id': '_memory', 'name': 'Un*'}])
    await expect(lambda r: 'consumer:test-http' in r['Unused']['reasons'] and 'consumer:test-http' in r['Source']['reasons'])
    try:
        lease('first', [42])
        raise AssertionError('Malformed replacement was accepted')
    except urllib.error.HTTPError as error:
        assert error.code == 400
    assert 'consumer:test-http' in (await asyncio.to_thread(read))['Unused']['reasons']
    release('first')
    await expect(lambda r: 'consumer:test-http' not in r['Unused']['reasons'] and 'consumer:test-http' in r['Source']['reasons'])
    release('second')
    await expect(lambda r: 'consumer:test-http' not in r['Source']['reasons'])
    # A broad metadata/snapshot fetch must not classify the whole namespace as needed.
    with urllib.request.urlopen(args.http + '/tags?limit=0', timeout=5) as response:
        response.read()
    assert not (await asyncio.to_thread(read))['Unused']['observed_demand']
    body = json.dumps({'tags': [{'connection_id': '_memory', 'name': 'Unused'},
                                {'connection_id': '_memory', 'name': 'DoesNotExist'}]}).encode()
    request = urllib.request.Request(args.http + '/tags/query', data=body,
                                     headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=5) as response:
        response.read()
    rows = await expect(lambda r: 'http_recent_read' in r['Unused']['reasons'])
    assert 'DoesNotExist' not in rows
    # Explicit reads are distinct from subscription sampling and attribute browsing.
    async with Client(args.ua) as client:
        await client.get_node('ns=1;s=Tags/_memory/Source').read_data_type()
        assert 'opcua_recent_read' not in (await asyncio.to_thread(read))['Source']['reasons']
        params = ua.ReadParameters()
        params.MaxAge = 5000
        item = ua.ReadValueId()
        item.NodeId = ua.NodeId.from_string('ns=1;s=Tags/_memory/Derived')
        item.AttributeId = ua.AttributeIds.Value
        params.NodesToRead = [item]
        await client.uaclient.read(params)
        rows = await expect(lambda r: 'opcua_recent_read' in r['Derived']['reasons'])
        assert 'opcua_fresh_read_requested' not in rows['Derived']['reasons']
        await client.get_node('ns=1;s=Tags/_memory/Unused').read_value()
        await expect(lambda r: 'opcua_fresh_read_requested' in r['Unused']['reasons'])
    print('Demand observation passed: browsing, duplicate monitors, mode/interval changes, publishing disabled, explicit reads, session cleanup, WebSocket replacement/all/disconnect, explicit demand mode/validation/restore, derived sources, HTTP leases, owner replacement/isolation/release/reconnect, and incomplete-coverage flags.')


if __name__ == '__main__':
    asyncio.run(main())
