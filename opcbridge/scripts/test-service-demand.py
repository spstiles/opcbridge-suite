#!/usr/bin/env python3
"""Test actual service registrations against disposable core and TimescaleDB fixtures.

Core fixture: localhost:18080 HTTP, localhost:18090 WS, _memory tags Source/Unused.
Never point this test at installed/production services or databases.
"""
import argparse
import json
import os
import pathlib
import subprocess
import tempfile
import time
import urllib.request


def request(url, body=None):
    req = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=5) as response:
        return json.load(response)


def owner(name):
    payload = request('http://127.0.0.1:18080/polling/demand?include_tags=0')
    assert payload['mode'] == 'observe_only' and payload['polling_unchanged']
    return payload['consumer_registrations'].get(name)


def wait_for(predicate):
    for _ in range(100):
        if predicate():
            return
        time.sleep(.1)
    raise AssertionError('Timed out waiting for consumer demand')


def has_tags(name, tags):
    current = owner(name)
    return current is not None and set(current['tags']) == set(tags) and current['all_tags_registrations'] == 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--alarms-binary', required=True)
    parser.add_argument('--historian-binary', required=True)
    parser.add_argument('--pg-conninfo', required=True, help='Disposable TimescaleDB only')
    args = parser.parse_args()
    processes = []
    logs = []
    with tempfile.TemporaryDirectory(prefix='opcbridge-service-demand-') as directory:
        root = pathlib.Path(directory)
        def start(binary, arguments, name):
            log = open(root / (name + '.log'), 'w+')
            logs.append(log)
            env = os.environ.copy()
            # Do not let inherited service credentials override disposable local alarm rules.
            for key in ['OPCBRIDGE_ADMIN_SERVICE_TOKEN', 'OPCBRIDGE_ADMIN_TOKEN']:
                env.pop(key, None)
            process = subprocess.Popen([binary] + arguments, stdin=subprocess.PIPE, stdout=log, stderr=log, cwd=root, env=env)
            processes.append(process)
            return process
        def stop(process):
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        try:
            alarm_dir = root / 'alarms'
            alarm_dir.mkdir()
            alarm_file = alarm_dir / 'alarms.json'
            def alarm_config(tag):
                alarm_file.write_text(json.dumps({'alarms': [{'id': 'demand-test', 'connection_id': '_memory',
                    'tag_name': tag, 'enabled': True, 'type': 'high', 'threshold': 1000}]}))
            alarm_config('Source')
            alarms = start(args.alarms_binary, ['--config', str(alarm_dir), '--opcbridge-host', '127.0.0.1',
                '--opcbridge-http-port', '18080', '--opcbridge-ws-port', '18090', '--http-port', '18091'], 'alarms')
            wait_for(lambda: has_tags('opcbridge-alarms', ['_memory:Source']))
            alarm_config('Unused')
            assert request('http://127.0.0.1:18091/alarm/api/reload', {})['ok']
            wait_for(lambda: has_tags('opcbridge-alarms', ['_memory:Unused']))

            historian_file = root / 'historian.json'
            historian = {'enabled': True, 'http_port': 18096, 'opcbridge_host': '127.0.0.1',
                'opcbridge_http_port': 18080, 'opcbridge_ws_port': 18090, 'subscribe_mode': 'all',
                'historian_tags': [{'connection_id': '_memory', 'tag_name': 'Source', 'enabled': True}],
                'snapshot': {'enabled': True, 'interval_ms': 60000},
                'historian_policy': {'interval_ms': 60000, 'mode': 'periodic', 'resolution_tiers': []},
                'postgres': {'conninfo': args.pg_conninfo, 'table': 'demand_test_samples'}}
            historian_file.write_text(json.dumps(historian))
            hist = start(args.historian_binary, ['--config', str(historian_file)], 'historian')
            wait_for(lambda: has_tags('opcbridge-historian', ['_memory:Source']))
            # Rules replace owner demand even though transport remains subscribe_all.
            historian['historian_tags'][0]['tag_name'] = 'Unused'
            historian_file.write_text(json.dumps(historian))
            assert request('http://127.0.0.1:18096/reload', {})['ok']
            wait_for(lambda: has_tags('opcbridge-historian', ['_memory:Unused']))
            historian['enabled'] = False
            historian_file.write_text(json.dumps(historian))
            assert request('http://127.0.0.1:18096/reload', {})['ok']
            wait_for(lambda: has_tags('opcbridge-historian', []))
            assert has_tags('opcbridge-alarms', ['_memory:Unused'])
            stop(hist)
            wait_for(lambda: owner('opcbridge-historian') is None)
            assert has_tags('opcbridge-alarms', ['_memory:Unused'])
            stop(alarms)
            wait_for(lambda: owner('opcbridge-alarms') is None)
            # Service restart recreates its registration from current config.
            alarms = start(args.alarms_binary, ['--config', str(alarm_dir), '--opcbridge-host', '127.0.0.1',
                '--opcbridge-http-port', '18080', '--opcbridge-ws-port', '18090', '--http-port', '18091'], 'alarms-restart')
            wait_for(lambda: has_tags('opcbridge-alarms', ['_memory:Unused']))
            print('Actual service demand passed: alarm config reload/restart, historian rules/disable/reload, independent owners, disconnect cleanup.')
        except Exception:
            for log in logs:
                log.flush()
                log.seek(0)
                print(log.read()[-3000:])
            raise
        finally:
            for process in reversed(processes):
                if process.poll() is None:
                    stop(process)
            for log in logs:
                log.close()


if __name__ == '__main__':
    main()
