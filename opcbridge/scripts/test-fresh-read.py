#!/usr/bin/env python3
"""Run ONLY with a disposable core fixture listening on 127.0.0.1:18080.
Starts a local libplctag simulator and isolated core config; no installed services.
"""
import argparse
import json
import os
import pathlib
import subprocess
import tempfile
import time
import urllib.request
import urllib.error


def request(path, body=None, base='http://127.0.0.1:18080'):
    req = urllib.request.Request(base + path,
        data=None if body is None else json.dumps(body).encode(),
        headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=10) as response:
        return response.status, json.load(response)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--core-fixture', required=True)
    parser.add_argument('--simulator', required=True)
    parser.add_argument('--unbatched', action='store_true')
    parser.add_argument('--flow-binary')
    parser.add_argument('--automation', action='store_true')
    parser.add_argument('--ua-quality', action='store_true', help='Test cached UA subscriptions through outage and recovery')
    parser.add_argument('--native-ua', action='store_true', help='Test opt-in native UA verification using asyncua')
    parser.add_argument('--ua-array', action='store_true', help='Also test array demand using asyncua')
    args = parser.parse_args()
    assert not (args.ua_quality and args.native_ua), "Quality test must exercise cached subscription path"
    processes = []
    with tempfile.TemporaryDirectory(prefix='opcbridge-fresh-read-') as directory:
        root = pathlib.Path(directory)
        (root / 'connections').mkdir()
        (root / 'tags').mkdir()
        (root / 'connections' / 'PLC.json').write_text(json.dumps({'id': 'PLC',
            'driver': 'ab_eip', 'gateway': '127.0.0.1:14418', 'plc_type': 'lgx', 'path': '1,0',
            'polling_pacing': 'fast', 'poll_batch_size': 16, 'default_read_ms': 200,
            'poll_max_reads_per_sec': 10 if args.unbatched else 0}))
        tags = [{'name': name, 'plc_tag_name': name, 'datatype': 'int32', 'scan_ms': 200}
                for name in ['ScalarA', 'ScalarB']]
        tags += [{'name': 'Array', 'plc_tag_name': 'Array', 'datatype': 'int32', 'elem_count': 3, 'scan_ms': 200},
                 {'name': 'ArrayAlias', 'source_tag': 'Array[1]', 'datatype': 'int32'},
                 {'name': 'Array[01]', 'plc_tag_name': 'ScalarA', 'datatype': 'int32', 'scan_ms': 200},
                 {'name': 'Local', 'source': 'memory', 'datatype': 'int32', 'writable': args.automation},
                 {'name': 'Alias', 'source_tag': 'ScalarA', 'datatype': 'int32'},
                 {'name': 'Bit', 'source_tag': 'ScalarA', 'bit': 0, 'datatype': 'bool', 'invert': True},
                 {'name': 'ArrayBit', 'source_tag': 'Array[1]', 'bit': 0, 'datatype': 'bool', 'invert': True},
                 {'name': 'ScaledAlias', 'source_tag': 'ScalarA', 'datatype': 'float64', 'scaling': 'linear',
                  'raw_low': 0, 'raw_high': 100, 'scaled_low': 10, 'scaled_high': 20},
                 {'name': 'MemoryAlias', 'source_tag': 'Local', 'datatype': 'int32'},
                 {'name': 'OffAlias', 'source_tag': 'Off', 'datatype': 'int32'},
                 {'name': 'MissingAlias', 'source_tag': 'Missing', 'datatype': 'int32'},
                 {'name': 'CycleA', 'source_tag': 'CycleB', 'datatype': 'int32'},
                 {'name': 'CycleB', 'source_tag': 'CycleA', 'datatype': 'int32'},
                 {'name': 'Off', 'plc_tag_name': 'ScalarA', 'datatype': 'int32', 'enabled': False}]
        (root / 'tags' / 'PLC.json').write_text(json.dumps({'connection_id': 'PLC', 'tags': tags}))
        def start(argv, log, env=None):
            process = subprocess.Popen(argv, stdout=log, stderr=subprocess.STDOUT, env=env)
            processes.append(process)
            return process
        with (root / 'simulator.log').open('w+') as simlog, (root / 'core.log').open('w+') as corelog:
            try:
                sim = start([args.simulator, '--plc=ControlLogix', '--path=1,0', '--port=14418',
                    '--tag=ScalarA:DINT[1]', '--tag=ScalarB:DINT[1]', '--tag=Array:DINT[3]'], simlog)
                time.sleep(.2)
                start([args.core_fixture, '--config', str(root), '--http', '--opcua', '--opcua-port', '14840', '--ws-port', '18090'], corelog,
                    env={**os.environ, 'OPCBRIDGE_UA_VERIFY_READS': '1' if args.native_ua else '0'})
                for _ in range(100):
                    try:
                        _, health = request('/health')
                        if health.get('connections', {}).get('PLC', {}).get('good_recent', 0) >= 2: break
                    except OSError: pass
                    time.sleep(.1)
                else: raise AssertionError('Simulator polling did not become ready')
                def read(names, age=0, wait=2000):
                    return request('/polling/fresh-read', {'tags': [{'connection_id': 'PLC', 'name': n} for n in names],
                        'max_age_ms': age, 'timeout_ms': wait})[1]
                def demand():
                    return {t['name']: t for t in request('/polling/demand?connection_id=PLC')[1]['tags']}
                assert not demand()['Array']['observed_demand']
                assert demand()['Array[1]']['poll_source'] == 'Array'
                assert demand()['Array[01]']['poll_source'] is None
                for selected in ['Array[1]', 'ArrayAlias', 'Array[01]']:
                    assert request('/polling/demand/register', {'owner': 'array-test', 'client_id': 'array-test',
                        'tags': ['PLC:' + selected]})[1]['ok']
                    rows = demand()
                    if selected == 'Array[01]': assert not rows['Array']['observed_demand'], rows['Array']
                    else:
                        assert 'array_source:Array[1]' in rows['Array']['reasons'], rows['Array']
                        if selected == 'ArrayAlias': assert 'derived_source:ArrayAlias' in rows['Array[1]']['reasons']
                assert request('/polling/demand/release', {'owner': 'array-test', 'client_id': 'array-test'})[1]['ok']
                assert not demand()['Array']['observed_demand']
                if args.ua_array:
                    import asyncio
                    from asyncua import Client, ua
                    async def check_ua_array():
                        class Handler:
                            good = False
                            def datachange_notification(self, node, value, data):
                                self.good = data.monitored_item.Value.StatusCode.is_good()
                        handler = Handler()
                        async def expect(active):
                            for _ in range(50):
                                rows = await asyncio.to_thread(demand)
                                if rows['Array[1]']['opcua_active_monitored_items'] == active and rows['Array']['observed_demand'] == bool(active):
                                    return rows
                                await asyncio.sleep(.05)
                            raise AssertionError(rows)
                        async with Client('opc.tcp://127.0.0.1:14840') as client:
                            subscription = await client.create_subscription(200, handler)
                            await subscription.subscribe_data_change(client.get_node('ns=1;s=Tags/PLC/Array%5B1%5D'))
                            rows = await expect(1)
                            for _ in range(50):
                                if handler.good: break
                                await asyncio.sleep(.05)
                            assert handler.good, 'UA element never received a GOOD sample'
                            assert 'array_source:Array[1]' in rows['Array']['reasons']
                            assert not rows['Array[01]']['observed_demand']
                            await subscription.set_monitoring_mode(ua.MonitoringMode.Disabled)
                            await expect(0)
                            await subscription.set_monitoring_mode(ua.MonitoringMode.Sampling)
                            await expect(1)
                            await subscription.delete()
                        await expect(0)
                    asyncio.run(check_ua_array())
                    print('UA array demand passed: element monitoring, Disabled/Sampling, and subscription cleanup update root demand.')
                result = read(['Array[0]', 'Array[1]', 'Array[2]', 'Array[01]'])
                assert result['ok'] and all(t['sample']['quality'] == 1 for t in result['tags']), result
                assert not read(['Array'])['ok']  # Root is not a scalar sample.
                for invalid in [
                    {'tags': []}, {'tags': [{'connection_id': 'PLC', 'name': 'ScalarA'}], 'timeout_ms': 5001},
                    {'tags': [{'connection_id': 'PLC', 'name': 'ScalarA'}], 'max_age_ms': 4294967296},
                    {'tags': [{'connection_id': 'PLC', 'name': 'ScalarA'}], 'max_age_ms': 0.5},
                ]:
                    try: request('/polling/fresh-read', invalid)
                    except urllib.error.HTTPError as error: assert error.code == 400
                    else: raise AssertionError('Invalid fresh-read request accepted')
                result = read(['ScalarA', 'ScalarB'])
                assert result['ok'] and all(t['fresh'] and t['sample']['quality'] == 1 for t in result['tags']), result
                assert read(['ScalarA'], age=60000, wait=0)['ok']
                result = read(['ScalarA'], wait=0)
                assert not result['ok'] and 'sample' not in result['tags'][0], result
                result = read(['Alias', 'Bit', 'ArrayAlias', 'ArrayBit', 'ScaledAlias'])
                assert result['ok'], result
                samples = {t['name']: t['sample']['value'] for t in result['tags']}
                assert samples == {'Alias': 0, 'Bit': True, 'ArrayAlias': 0, 'ArrayBit': True, 'ScaledAlias': 10.0}, samples
                result = read(['Local', 'MemoryAlias', 'Off', 'Missing', 'OffAlias', 'MissingAlias', 'CycleA'])
                assert [t['reason'] for t in result['tags']] == ['unsupported_source', 'unsupported_source', 'disabled',
                    'not_found', 'source_unavailable', 'source_unavailable', 'source_cycle'], result
                if args.native_ua:
                    import asyncio
                    from asyncua import Client, ua
                    from urllib.parse import quote
                    def ua_item(name, attribute=ua.AttributeIds.Value):
                        return ua.ReadValueId(NodeId=ua.NodeId.from_string('ns=1;s=Tags/PLC/' + quote(name, safe='_.-')),
                            AttributeId=attribute)
                    async def ua_read(client, names, age=0, timestamps=ua.TimestampsToReturn.Both):
                        return await client.uaclient.read(ua.ReadParameters(MaxAge=age,
                            TimestampsToReturn=timestamps, NodesToRead=[ua_item(name) for name in names]))
                    async def verify_native_good():
                        async with Client('opc.tcp://127.0.0.1:14840', timeout=5) as client:
                            values = await ua_read(client, ['ScalarA', 'Array[1]', 'Alias', 'Bit', 'ScaledAlias', 'Local'])
                            assert all(v.StatusCode.is_good() for v in values), values
                            assert values[3].Value.Value is True and values[4].Value.Value == 10.0
                            assert all(v.SourceTimestamp and v.ServerTimestamp for v in values)
                            for timestamps in [ua.TimestampsToReturn.Source, ua.TimestampsToReturn.Server, ua.TimestampsToReturn.Neither]:
                                value = (await ua_read(client, ['ScalarA'], 1e100, timestamps))[0]
                                assert value.StatusCode.is_good(), value
                                assert (value.SourceTimestamp is not None) == (timestamps == ua.TimestampsToReturn.Source), value
                                assert (value.ServerTimestamp is not None) == (timestamps == ua.TimestampsToReturn.Server), value
                            values = await ua_read(client, ['OffAlias', 'MissingAlias', 'CycleA', 'MemoryAlias', 'NotDefined'])
                            assert [v.StatusCode.value for v in values] == [ua.StatusCodes.BadOutOfService,
                                ua.StatusCodes.BadOutOfService, ua.StatusCodes.BadNotSupported,
                                ua.StatusCodes.BadNotSupported, ua.StatusCodes.BadNodeIdUnknown], values
                            values = await ua_read(client, ['ScalarA'] * 129, 60000)
                            assert sum(v.StatusCode.is_good() for v in values) == 128, values
                            assert values[-1].StatusCode.value == ua.StatusCodes.BadTooManyOperations, values[-1]
                            value = await client.uaclient.read(ua.ReadParameters(MaxAge=0,
                                NodesToRead=[ua_item('ScalarA', ua.AttributeIds.DataType)]))
                            assert value[0].StatusCode.is_good()
                    asyncio.run(verify_native_good())
                    print('Native UA verification passed: scalar/array/derived/memory values, timestamps, queue limit and explicit failures.')
                flow = None
                if args.flow_binary:
                    flow = {'id': 'test', 'name': 'Verified PLC', 'enabled': True, 'edges': [], 'nodes': [
                        {'id': 'input', 'type': 'opc_tag_input', 'config': {'connection_id': 'PLC',
                            'tag_name': 'ScaledAlias', 'poll_interval_ms': 600000,
                            'require_fresh_read': True, 'fresh_timeout_ms': 1000}}]}
                    def write(name, value):
                        path = root / name; path.write_text(json.dumps(value)); return str(path)
                    start([args.flow_binary, '--config', write('flow-config.json', {
                        'listen_host': '127.0.0.1', 'listen_port': 18198,
                        'connections_dir': str(root / 'flow-connections'),
                        'opcbridge_base_url': 'http://127.0.0.1:18080'}),
                        '--flows', write('flows.json', {'flows': [flow]}),
                        '--deployed', write('deployed.json', {'flows': [flow]}),
                        '--state', str(root / 'flow-state.json')], corelog)
                    def flow_request(path, body=None):
                        return request(path, body, base='http://127.0.0.1:18198')[1]
                    for _ in range(100):
                        try:
                            node = flow_request('/flows')['runtime']['test']['nodes']['input']
                            if node['messages_out'] == 1:
                                assert node['last_value'] == 10.0, node
                                break
                        except OSError: pass
                        time.sleep(.05)
                    else: raise AssertionError('Flow did not emit a verified PLC sample')
                if args.automation:
                    (root / 'logic.json').write_text(json.dumps({'blocks': [], 'scripts': [{
                        'id': 'verified', 'enabled': True, 'interval_ms': 100,
                        'require_fresh_read': True, 'fresh_timeout_ms': 1000,
                        'source': "setTag('PLC', 'Local', tag('PLC', 'ScaledAlias'));"}]}))
                    def automation_state():
                        rows = request('/tags?connection_id=_system&limit=0')[1]['tags']
                        prefix = 'System/Logic/Scripts/verified/'
                        return {r['name'][len(prefix):]: r['value'] for r in rows if r['name'].startswith(prefix)}
                    for _ in range(100):
                        state = automation_state()
                        if state.get('LastRunOk') and state.get('MemoryWrites') == 1: break
                        time.sleep(.1)
                    else: raise AssertionError(('Verified automation did not run', state))
                    local = request('/tags?connection_id=PLC&tag=Local')[1]['tags']
                    assert local[0]['value'] == 10.0, local
                    print('Automation verified a physical scaled alias before writing its memory output.')
                sim.terminate(); sim.wait(timeout=5)
                time.sleep(1)
                result = read(['Alias', 'Bit', 'ArrayAlias', 'ArrayBit', 'ScaledAlias'], wait=300)
                assert not result['ok'] and all(not t['fresh'] and 'sample' not in t for t in result['tags']), result
                result = read(['Array[1]'], wait=300)
                assert not result['ok'] and 'sample' not in result['tags'][0], result
                result = read(['ScalarA'], wait=300)
                assert not result['ok'] and 'sample' not in result['tags'][0], result
                result = read(['ScalarA'], age=60000, wait=0)
                assert not result['ok'] and 'sample' not in result['tags'][0], result
                if args.automation:
                    for _ in range(100):
                        state = automation_state()
                        if state.get('LastRunOk') is False and 'timeout' in state.get('LastError', ''): break
                        time.sleep(.05)
                    else: raise AssertionError(('Automation did not report freshness failure', state))
                    assert state['MemoryWrites'] == 0, state
                    print('Automation outage passed: timeout without evaluating output writes.')
                if args.native_ua:
                    async def verify_native_failure():
                        async with Client('opc.tcp://127.0.0.1:14840', timeout=5) as client:
                            pending = asyncio.create_task(ua_read(client, ['ScalarA']))
                            await asyncio.sleep(.05)
                            await asyncio.wait_for(client.nodes.objects.get_children(), .7)
                            value = (await pending)[0]
                            assert value.StatusCode.value == ua.StatusCodes.BadTimeout and (value.Value is None or value.Value.Value is None), value
                        client = Client('opc.tcp://127.0.0.1:14840', timeout=5)
                        await client.connect()
                        pending = asyncio.create_task(ua_read(client, ['ScalarA']))
                        await asyncio.sleep(.05)
                        await client.disconnect()
                        await asyncio.gather(pending, return_exceptions=True)
                        async with Client('opc.tcp://127.0.0.1:14840', timeout=5) as recovered:
                            value = (await ua_read(recovered, ['Local']))[0]
                            assert value.StatusCode.is_good(), value
                    asyncio.run(verify_native_failure())
                    print('Native UA outage/cancellation passed: timeout without stale value, responsive browsing and safe reconnect.')
                if flow:
                    assert flow_request('/flows', flow)['ok']
                    assert flow_request('/flows/test/deploy', {})['ok']
                    for _ in range(100):
                        node = flow_request('/flows')['runtime']['test']['nodes']['input']
                        if node['status'] == 'error': break
                        time.sleep(.05)
                    else: raise AssertionError('Flow failed to report PLC freshness failure')
                    assert node['messages_out'] == 0, node
                    print('End-to-end Flow freshness passed: verified scaled derived input and no event during PLC outage.')
                if args.ua_quality:
                    import asyncio
                    from asyncua import Client, ua
                    from urllib.parse import quote
                    async def check_subscription_quality():
                        states = {}
                        names = ['ScalarA', 'Alias', 'Array[1]']
                        class Handler:
                            def datachange_notification(self, node, value, data):
                                states[node.nodeid.to_string()] = data.monitored_item.Value
                        async def expect(status):
                            for _ in range(200):
                                values = list(states.values())
                                if len(values) == len(names) and all(v.StatusCode.value == status for v in values):
                                    if status != ua.StatusCodes.Good:
                                        assert all(v.Value is None or v.Value.Value is None for v in values), values
                                    else:
                                        assert all(v.SourceTimestamp and v.ServerTimestamp for v in values), values
                                    return
                                await asyncio.sleep(.05)
                            raise AssertionError(('Subscription status did not converge', status, states))
                        async with Client('opc.tcp://127.0.0.1:14840') as client:
                            subscription = await client.create_subscription(100, Handler())
                            for name in names:
                                await subscription.subscribe_data_change(client.get_node(
                                    'ns=1;s=Tags/PLC/' + quote(name, safe='_.-')))
                            await expect(ua.StatusCodes.BadNoCommunication)
                            def restart_simulator():
                                return start([args.simulator, '--plc=ControlLogix', '--path=1,0', '--port=14418',
                                    '--tag=ScalarA:DINT[1]', '--tag=ScalarB:DINT[1]', '--tag=Array:DINT[3]'], simlog)
                            restored = restart_simulator()
                            await expect(ua.StatusCodes.Good)
                            restored.terminate(); restored.wait(timeout=5)
                            await expect(ua.StatusCodes.BadNoCommunication)
                            restart_simulator()
                            await expect(ua.StatusCodes.Good)
                            await subscription.delete()
                    asyncio.run(check_subscription_quality())
                    print('Cached UA subscriptions passed: bad with no stale value, physical/alias/array recovery, live failure and recovery, source/server timestamps.')
                print('Fresh-read passed: physical/array-element polls, array/alias demand mapping, derived/scaled/bit samples, positive cache age, zero-age no-wait, unsupported/disabled/missing inputs, and PLC outage timeout.')
            except Exception:
                for log in [simlog, corelog]:
                    log.flush(); log.seek(0); print(log.read()[-4000:])
                raise
            finally:
                for process in reversed(processes):
                    if process.poll() is None:
                        process.terminate()
                        try: process.wait(timeout=5)
                        except subprocess.TimeoutExpired: process.kill(); process.wait()

if __name__ == '__main__':
    main()
