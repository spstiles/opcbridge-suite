#!/usr/bin/env python3
"""Disposable actual Logger/PLC demand integration; no database jobs are run."""
import argparse
import datetime
import json
import os
import pathlib
import subprocess
import tempfile
import time
import urllib.request


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--core-fixture', required=True)
    parser.add_argument('--simulator', required=True)
    parser.add_argument('--logger-binary', required=True)
    parser.add_argument('--namespace-churn', action='store_true',
                        help='Also replace tags while the wildcard registration remains attached')
    args = parser.parse_args()
    processes = []
    with tempfile.TemporaryDirectory(prefix='opcbridge-active-logger-') as directory:
        root = pathlib.Path(directory)
        names = ['Exact', 'PatternOne', 'PatternTwo', 'Unused']
        for name in ['connections', 'tags']: (root / name).mkdir()
        def write(name, value):
            path = root / name
            path.write_text(json.dumps(value))
            return str(path)
        write('connections/PLC.json', {'id': 'PLC', 'driver': 'ab_eip', 'gateway': '127.0.0.1:14418',
            'path': '1,0', 'plc_type': 'lgx', 'polling_pacing': 'fast', 'poll_batch_size': 16, 'poll_max_reads_per_sec': 0})
        def save_tags(physical=None):
            write('tags/PLC.json', {'connection_id': 'PLC', 'tags': [
                {'name': n, 'plc_tag_name': (physical or {}).get(n, n), 'datatype': 'int32', 'scan_ms': 100} for n in names]})
        save_tags()
        def api(path, body=None, port=18080):
            req = urllib.request.Request(f'http://127.0.0.1:{port}{path}',
                data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=5) as response: return json.load(response)
        def wait(predicate, timeout=15):
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                try:
                    if predicate(): return
                except OSError: pass
                time.sleep(.1)
            raise AssertionError('Logger active demand condition timed out')
        def demand(): return api('/polling/demand?connection_id=PLC')
        def owner(): return demand()['consumer_registrations'].get('opcbridge-logger')
        def states(): return {r['name']: r['polling_state'] for r in api('/tags?connection_id=PLC')['tags']}
        def scope(active, timeout=15):
            wait(lambda: states() == {n: 'active' if n in active else 'inactive' for n in names}, timeout)
        schedule = {'on_calendar': (datetime.datetime.now() + datetime.timedelta(hours=12)).strftime('*-*-* %H:%M:%S')}
        jobs = [
            {'id': 'live', 'enabled': True, 'database_id': 'local', 'tags': ['PLC:Exact'], 'schedule': schedule},
            {'id': 'off', 'enabled': False, 'database_id': 'local', 'tags': ['PLC:Unused'], 'schedule': schedule},
            {'id': 'history', 'enabled': True, 'database_id': 'local', 'tags': [], 'schedule': schedule,
             'historian_fields': [{'connection_id': 'PLC', 'tag_name': 'Unused', 'statistic': 'avg', 'range': '1h', 'field_name': 'avg'}]}]
        def reload():
            write('reports.json', {'reports': jobs})
            assert api('/reload', {}, port=18095)['ok']
        env = os.environ.copy()
        env.update(OPCBRIDGE_ACTIVE_POLL_TEST_CONNECTIONS='["PLC"]', OPCBRIDGE_UA_VERIFY_READS='0')
        env['OPCBRIDGE_WRITE_TOKEN'] = 'logger-churn-test-token'
        for key in ['OPCBRIDGE_ADMIN_SERVICE_TOKEN', 'OPCBRIDGE_ADMIN_TOKEN']: env.pop(key, None)
        with (root / 'services.log').open('w+') as log:
            def start(argv):
                p = subprocess.Popen(argv, cwd=root, stdout=log, stderr=log, env=env)
                processes.append(p)
                return p
            try:
                start([args.simulator, '--plc=ControlLogix', '--path=1,0', '--port=14418'] +
                      ['--tag=' + n + ':DINT[1]' for n in names + ['PatternAdded']])
                time.sleep(.2)
                start([args.core_fixture, '--config', str(root), '--http', '--ws-port', '18090'])
                scope(names)
                scope([], timeout=40)
                logger = start([args.logger_binary, '--service', '--config', write('config.json', {
                    'listen_host': '127.0.0.1', 'listen_port': 18095, 'opcbridge_base_url': 'http://127.0.0.1:18080'}),
                    '--databases', write('databases.json', {'databases': [{'id': 'local', 'mysql_host': '127.0.0.1', 'mysql_port': 9}]}),
                    '--reports', write('reports.json', {'reports': jobs}), '--data-checks', write('checks.json', {'data_checks': []}),
                    '--sync-jobs', write('sync.json', {'sync_jobs': []}), '--state', write('state.json', {})])
                scope(['Exact'])
                assert set(owner()['tags']) == {'PLC:Exact'}, owner()
                print('Logger wakes its exact live input; disabled and historical-only jobs leave unused inputs idle.', flush=True)
                jobs[0]['tags'] = ['PLC:Pattern*']; reload()
                scope(['PatternOne', 'PatternTwo'])
                assert owner()['patterns'] == [{'connection_id': 'PLC', 'name': 'Pattern*'}], owner()
                before = demand()['active_poll_test']['poll_read_requests']['PLC']
                time.sleep(1)
                after = demand()['active_poll_test']['poll_read_requests']['PLC']
                for name in names:
                    assert (after[name] > before[name]) == name.startswith('Pattern'), (before, after)
                if args.namespace_churn:
                    registration = owner()
                    names[:] = ['Exact', 'PatternAdded', 'Renamed', 'Unused']
                    save_tags({'Renamed': 'PatternTwo'})
                    result = api('/reload/connection', {'connection_id': 'PLC', 'token': 'logger-churn-test-token'})
                    assert result['ok'] and not result['pending'], result
                    # Reload gives all new physical work startup grace. The surviving
                    # wildcard, rather than that grace, must retain the added match.
                    scope(['PatternAdded'], timeout=40)
                    assert owner()['patterns'] == registration['patterns'], owner()
                    before = demand()['active_poll_test']['poll_read_requests']['PLC']
                    assert 'PatternOne' not in before and 'PatternTwo' not in before, before
                    time.sleep(1)
                    after = demand()['active_poll_test']['poll_read_requests']['PLC']
                    for name in names:
                        assert (after[name] > before[name]) == (name == 'PatternAdded'), (before, after)
                    print('Attached wildcard follows added matches, renamed nonmatches and removed tags after driver reload.', flush=True)
                jobs[0]['tags'] = 'ALL'; reload(); scope(names)
                assert owner()['all_tags_registrations'] == 1, owner()
                jobs[0]['enabled'] = False; reload()
                wait(lambda: owner() is None); scope([])
                print('Wildcard and ALL selections control real read counters; disabling live jobs releases demand.', flush=True)
                jobs[0]['enabled'] = True; jobs[0]['tags'] = ['PLC:Exact']; reload(); scope(['Exact'])
                time.sleep(32)
                scope(['Exact'])
                assert all(j['runs_total'] == 0 for j in api('/jobs', port=18095)['jobs'])
                # Abrupt exit cannot send release. The server must expire its HTTP lease.
                logger.kill(); logger.wait(timeout=10)
                wait(lambda: owner() is None, timeout=75)
                scope([])
                before = demand()['active_poll_test']['poll_read_requests']['PLC']
                time.sleep(1)
                assert demand()['active_poll_test']['poll_read_requests']['PLC'] == before
                print('Logger renews long-interval demand without running jobs; crash lease expiry stops all physical reads.', flush=True)
            except Exception:
                try: print(json.dumps(demand(), indent=2))
                except Exception: pass
                log.flush(); log.seek(0); print(log.read()[-8000:])
                raise
            finally:
                for p in reversed(processes):
                    if p.poll() is None:
                        p.terminate()
                        try: p.wait(timeout=10)
                        except subprocess.TimeoutExpired: p.kill(); p.wait()


if __name__ == '__main__': main()
