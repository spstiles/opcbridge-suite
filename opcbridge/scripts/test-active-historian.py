#!/usr/bin/env python3
"""Actual historian/PLC demand test with a private, disposable TimescaleDB cluster."""
import argparse
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
    parser.add_argument('--historian-binary', required=True)
    parser.add_argument('--pg-bin', default='/usr/lib/postgresql/16/bin')
    args = parser.parse_args()
    processes = []
    with tempfile.TemporaryDirectory(prefix='opcbridge-active-historian-') as directory:
        root = pathlib.Path(directory)
        pg = pathlib.Path(args.pg_bin)
        conn = f'host={root} port=18543 dbname=postgres'
        def run(argv):
            return subprocess.check_output(argv, stderr=subprocess.STDOUT, text=True)
        def api(path, body=None, port=18080):
            req = urllib.request.Request(f'http://127.0.0.1:{port}{path}',
                data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=5) as response:
                return json.load(response)
        def wait(predicate, timeout=15):
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                try:
                    if predicate(): return
                except OSError: pass
                time.sleep(.1)
            raise AssertionError('Historian integration condition timed out')
        def demand(): return api('/polling/demand?connection_id=PLC')
        def states():
            return {t['name']: t['polling_state'] for t in api('/tags?connection_id=PLC')['tags']}
        def count(tag):
            assert tag in ['Input', 'Unused']
            return int(run(['psql', conn, '-Atc', f"SELECT count(*) FROM active_samples WHERE tag_name='{tag}'"]).strip())
        for name in ['connections', 'tags']: (root / name).mkdir()
        (root / 'connections/PLC.json').write_text(json.dumps({'id': 'PLC', 'driver': 'ab_eip',
            'gateway': '127.0.0.1:14418', 'path': '1,0', 'plc_type': 'lgx', 'polling_pacing': 'fast',
            'poll_batch_size': 16, 'poll_max_reads_per_sec': 0}))
        (root / 'tags/PLC.json').write_text(json.dumps({'connection_id': 'PLC', 'tags': [
            {'name': n, 'plc_tag_name': n, 'datatype': 'int32', 'scan_ms': 100} for n in ['Input', 'Unused']]}))
        config = {'enabled': True, 'http_port': 18096, 'opcbridge_host': '127.0.0.1',
            'opcbridge_http_port': 18080, 'opcbridge_ws_port': 18090, 'subscribe_mode': 'all',
            'historian_tags': [{'connection_id': 'PLC', 'tag_name': 'Input', 'enabled': True}],
            'snapshot': {'enabled': True, 'interval_ms': 600000},
            'historian_policy': {'interval_ms': 600000, 'mode': 'periodic', 'resolution_tiers': []},
            'postgres': {'conninfo': conn, 'table': 'active_samples', 'flush_interval_ms': 100}}
        def save(): (root / 'historian.json').write_text(json.dumps(config))
        save()
        env = os.environ.copy()
        env.update(OPCBRIDGE_ACTIVE_POLL_TEST_CONNECTIONS='["PLC"]', OPCBRIDGE_UA_VERIFY_READS='0')
        for name in ['OPCBRIDGE_ADMIN_SERVICE_TOKEN', 'OPCBRIDGE_ADMIN_TOKEN']: env.pop(name, None)
        with (root / 'services.log').open('w+') as log:
            def start(argv):
                process = subprocess.Popen(argv, cwd=root, stdout=log, stderr=log, env=env)
                processes.append(process)
                return process
            pg_started = False
            try:
                run([str(pg / 'initdb'), '-D', str(root / 'pg'), '-A', 'trust', '--no-locale'])
                with (root / 'pg/postgresql.conf').open('a') as f:
                    f.write(f"\nlisten_addresses=''\nport=18543\nunix_socket_directories='{root}'\nshared_preload_libraries='timescaledb'\ntimescaledb.telemetry_level='off'\n")
                run([str(pg / 'pg_ctl'), '-D', str(root / 'pg'), '-l', str(root / 'pg.log'), '-w', 'start'])
                pg_started = True
                start([args.simulator, '--plc=ControlLogix', '--path=1,0', '--port=14418', '--tag=Input:DINT[1]', '--tag=Unused:DINT[1]'])
                time.sleep(.2)
                start([args.core_fixture, '--config', str(root), '--http', '--ws-port', '18090'])
                wait(lambda: states().get('Input') == 'active')
                wait(lambda: all(s == 'inactive' for s in states().values()), timeout=40)
                hist = start([args.historian_binary, '--config', str(root / 'historian.json')])
                wait(lambda: 'opcbridge-historian' in demand()['consumer_registrations'])
                wait(lambda: states().get('Input') == 'active')
                wait(lambda: count('Input') > 0, timeout=12)
                # A new WS starts with conservative delivery demand until its explicit
                # registration arrives. Allow that transient interest's idle grace.
                wait(lambda: states()['Unused'] == 'inactive')
                print('Periodic historian wakes an idle input and records its first sample promptly.', flush=True)
                time.sleep(32)
                assert states() == {'Input': 'active', 'Unused': 'inactive'}, states()
                assert count('Input') == 1
                before = demand()['active_poll_test']['poll_read_requests']['PLC']
                time.sleep(1)
                after = demand()['active_poll_test']['poll_read_requests']['PLC']
                assert after['Input'] > before['Input'] and after['Unused'] == before['Unused']
                config['historian_tags'][0]['tag_name'] = 'Unused'; save()
                assert api('/reload', {}, port=18096)['ok']
                wait(lambda: count('Unused') > 0, timeout=12)
                wait(lambda: states()['Input'] == 'inactive')
                config['enabled'] = False; save(); assert api('/reload', {}, port=18096)['ok']
                wait(lambda: all(s == 'inactive' for s in states().values()))
                previous = count('Unused')
                config['enabled'] = True; save(); assert api('/reload', {}, port=18096)['ok']
                wait(lambda: count('Unused') > previous, timeout=12)
                hist.terminate(); hist.wait(timeout=10)
                wait(lambda: 'opcbridge-historian' not in demand()['consumer_registrations'])
                wait(lambda: all(s == 'inactive' for s in states().values()))
                print('Historian demand survives long intervals, follows rule reloads and releases on disable/disconnect.', flush=True)
            except Exception:
                log.flush(); log.seek(0); print(log.read()[-8000:])
                raise
            finally:
                for process in reversed(processes):
                    if process.poll() is None:
                        process.terminate()
                        try: process.wait(timeout=10)
                        except subprocess.TimeoutExpired: process.kill(); process.wait()
                if pg_started:
                    run([str(pg / 'pg_ctl'), '-D', str(root / 'pg'), '-m', 'immediate', '-w', 'stop'])


if __name__ == '__main__': main()
