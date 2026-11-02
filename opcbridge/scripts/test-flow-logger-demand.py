#!/usr/bin/env python3
"""Run Flow/logger demand checks against a disposable core on localhost:18080.

Requires _memory Source, Derived and Unused tags. Uses only temporary service
configuration, memory values, and an HTTP registration collector; no database writes.
Never use production binaries/configuration endpoints as the core fixture.
"""
import argparse
import datetime
import http.server
import json
import pathlib
import subprocess
import tempfile
import threading
import time
import urllib.request


def request(url, body=None):
    req = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=5) as response:
        return json.load(response)


def snapshot():
    result = request('http://127.0.0.1:18080/polling/demand')
    assert result['mode'] == 'observe_only' and result['polling_unchanged']
    return result


def owner(name):
    return snapshot()['consumer_registrations'].get(name)


def wait_for(predicate, seconds=15):
    until = time.monotonic() + seconds
    while time.monotonic() < until:
        if predicate():
            return
        time.sleep(.1)
    raise AssertionError('Timed out waiting for demand')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--flow-binary', required=True)
    parser.add_argument('--logger-binary', required=True)
    args = parser.parse_args()
    requests, lock = [], threading.Lock()
    class Collector(http.server.BaseHTTPRequestHandler):
        def do_POST(self):
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            with lock:
                requests.append((self.path, body))
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
        def log_message(self, *_):
            pass
    collector = http.server.ThreadingHTTPServer(('127.0.0.1', 18180), Collector)
    thread = threading.Thread(target=collector.serve_forever, daemon=True)
    thread.start()
    def remote_latest():
        with lock:
            return requests[-1] if requests else None
    processes, logs = [], []
    with tempfile.TemporaryDirectory(prefix='opcbridge-flow-logger-demand-') as directory:
        root = pathlib.Path(directory)
        def write(name, value):
            path = root / name
            path.write_text(json.dumps(value))
            return str(path)
        def start(binary, arguments, name):
            log = open(root / (name + '.log'), 'w+')
            logs.append(log)
            process = subprocess.Popen([binary] + arguments, stdin=subprocess.PIPE, stdout=log, stderr=log, cwd=root)
            processes.append(process)
        try:
            deployed = {'id': 'test', 'name': 'Test', 'enabled': True, 'edges': [], 'nodes': [
                {'id': 'input', 'type': 'opc_tag_input', 'config': {'connection_id': '_memory',
                 'tag_name': 'Source', 'poll_interval_ms': 600000}}]}
            (root / 'connections').mkdir()
            start(args.flow_binary, ['--config', write('flow-config.json', {'listen_port': 18098,
                'connections_dir': str(root / 'connections'),
                'opcbridge_base_url': 'http://127.0.0.1:18080'}), '--flows', write('drafts.json', {'flows': [deployed]}),
                '--deployed', write('deployed.json', {'flows': [deployed]}), '--state', str(root / 'flow-state.json')], 'flow')
            wait_for(lambda: owner('opcbridge-flow') is not None)
            assert set(owner('opcbridge-flow')['tags']) == {'_memory:Source'}
            # Observe the first read before testing its lease expiry; otherwise an
            # initial registration could satisfy the assertion before polling starts.
            wait_for(lambda: any(row['name'] == 'Source' and 'http_recent_read' in row['reasons']
                for row in snapshot()['tags']))
            # The first HTTP read lease expires, but background demand must remain.
            wait_for(lambda: any(row['name'] == 'Source' and 'consumer:opcbridge-flow' in row['reasons']
                and 'http_recent_read' not in row['reasons'] for row in snapshot()['tags']), seconds=40)
            deployed['nodes'][0]['config']['tag_name'] = 'Unused'
            assert request('http://127.0.0.1:18098/flows', deployed)['ok']
            time.sleep(1.2)
            assert set(owner('opcbridge-flow')['tags']) == {'_memory:Source'}
            assert request('http://127.0.0.1:18098/flows/test/deploy', {})['ok']
            wait_for(lambda: owner('opcbridge-flow') is not None and set(owner('opcbridge-flow')['tags']) == {'_memory:Unused'})
            assert request('http://127.0.0.1:18098/flows/test/disable', {})['ok']
            wait_for(lambda: owner('opcbridge-flow') is None)

            schedule = {'on_calendar': (datetime.datetime.now() + datetime.timedelta(hours=12)).strftime('*-*-* %H:%M:%S')}
            jobs = [
                {'id': 'live', 'enabled': True, 'database_id': 'local', 'tags': ['_memory:Unused'], 'schedule': schedule},
                {'id': 'wildcard', 'enabled': True, 'database_id': 'local', 'tags': ['_memory:Un*'], 'schedule': schedule},
                {'id': 'off', 'enabled': False, 'database_id': 'local', 'tags': ['_memory:Source'], 'schedule': schedule},
                {'id': 'history', 'enabled': True, 'database_id': 'local', 'tags': [], 'schedule': schedule,
                 'historian_fields': [{'connection_id': '_memory', 'tag_name': 'Derived', 'statistic': 'avg', 'range': '1h', 'field_name': 'avg'}]},
                {'id': 'override', 'enabled': True, 'database_id': 'override', 'tags': ['_memory:Source'], 'schedule': schedule}]
            reports = pathlib.Path(write('reports.json', {'reports': jobs}))
            config = write('logger-config.json', {'listen_port': 18095, 'opcbridge_base_url': 'http://127.0.0.1:18080'})
            start(args.logger_binary, ['--service', '--config', config,
                '--databases', write('databases.json', {'databases': [
                    {'id': 'local', 'mysql_host': '127.0.0.1', 'mysql_port': 9},
                    {'id': 'override', 'mysql_host': '127.0.0.1', 'mysql_port': 9, 'opcbridge_base_url': 'http://127.0.0.1:18180/'}]}),
                '--reports', str(reports), '--data-checks', write('checks.json', {'data_checks': []}),
                '--sync-jobs', write('sync.json', {'sync_jobs': []}), '--state', write('logger-state.json', {})], 'logger')
            wait_for(lambda: owner('opcbridge-logger') is not None)
            assert set(owner('opcbridge-logger')['tags']) == {'_memory:Unused'}
            assert owner('opcbridge-logger')['patterns'] == [{'connection_id': '_memory', 'name': 'Un*'}]
            wait_for(lambda: remote_latest() is not None)
            assert remote_latest()[0] == '/polling/demand/register'
            assert remote_latest()[1]['tags'] == ['_memory:Source']
            jobs.append({'id': 'all', 'enabled': True, 'database_id': 'local', 'tags': 'ALL', 'schedule': schedule})
            reports.write_text(json.dumps({'reports': jobs}))
            assert request('http://127.0.0.1:18095/reload', {})['ok']
            wait_for(lambda: owner('opcbridge-logger')['all_tags_registrations'] == 1)
            for job in jobs:
                job['enabled'] = False
            reports.write_text(json.dumps({'reports': jobs}))
            assert request('http://127.0.0.1:18095/reload', {})['ok']
            wait_for(lambda: owner('opcbridge-logger') is None)
            wait_for(lambda: remote_latest()[0] == '/polling/demand/release')
            print('Flow/logger demand passed: long input interval, draft versus deploy, disable, exact/wildcard/all selections, historical-only exclusion, reload, and endpoint override/release.')
        except Exception:
            for log in logs:
                log.flush(); log.seek(0)
                print(log.read()[-3000:])
            raise
        finally:
            for process in reversed(processes):
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        process.kill(); process.wait()
            for log in logs:
                log.close()
            collector.shutdown(); collector.server_close(); thread.join()


if __name__ == '__main__':
    main()
