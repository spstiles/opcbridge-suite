#!/usr/bin/env python3
"""Disposable default-on and per-connection polling setting/reload checks."""
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
    args = parser.parse_args()
    processes = []
    with tempfile.TemporaryDirectory(prefix='opcbridge-active-settings-') as directory:
        root = pathlib.Path(directory)
        for name in ['connections', 'tags']: (root / name).mkdir()
        def save(cid, setting=None, writable=False):
            config = {'id': cid, 'driver': 'ab_eip', 'gateway': '127.0.0.1:14418', 'path': '1,0',
                'plc_type': 'lgx', 'polling_pacing': 'fast', 'poll_max_reads_per_sec': 0}
            if setting is not None: config['poll_active_only'] = setting
            (root / f'connections/{cid}.json').write_text(json.dumps(config))
            (root / f'tags/{cid}.json').write_text(json.dumps({'connection_id': cid, 'tags': [
                {'name': 'Input', 'plc_tag_name': 'Input', 'datatype': 'int32', 'scan_ms': 100, 'writable': writable}]}))
        save('Default'); save('All', False); save('Writable', writable=True)
        def api(path, body=None):
            req = urllib.request.Request('http://127.0.0.1:18080/'+path,
                data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
            return json.load(urllib.request.urlopen(req, timeout=20))
        def rows():
            return {r['connection_id']: r for r in api('tags?exclude_system=1')['tags']}
        def wait(predicate, timeout=15):
            end = time.monotonic()+timeout
            while time.monotonic()<end:
                try:
                    if predicate(): return
                except OSError: pass
                time.sleep(.1)
            raise AssertionError('Connection polling setting condition timed out')
        def reload():
            result = api('reload/connection', {'connection_id': 'Default', 'token': 'setting-test-token'})
            assert result['ok'] and not result['pending'], result
        env = os.environ.copy()
        env.pop('OPCBRIDGE_ACTIVE_POLL_TEST_CONNECTIONS', None)
        env['OPCBRIDGE_WRITE_TOKEN'] = 'setting-test-token'
        with (root / 'services.log').open('w+') as log:
            def start(argv):
                p = subprocess.Popen(argv, cwd=root, stdout=log, stderr=log, env=env); processes.append(p)
            try:
                start([args.simulator, '--plc=ControlLogix', '--path=1,0', '--port=14418', '--tag=Input:DINT[1]'])
                time.sleep(.2)
                start([args.core_fixture, '--config', str(root), '--http', '--ws-port', '18090'])
                wait(lambda: len(rows()) == 3 and all(r['quality'] == 1 for r in rows().values()))
                wait(lambda: rows()['Default']['polling_state'] == 'inactive', timeout=40)
                assert rows()['All']['polling_state'] == 'active'
                assert rows()['Writable']['polling_state'] == 'active'
                eligibility = api('polling/demand?include_tags=0')['active_poll_test']['connection_eligibility']
                assert eligibility['Default']['enabled'] and not eligibility['All']['enabled']
                assert eligibility['Writable']['reason'] == 'writable_tags'
                print('No environment setup: default read-only connection idles, explicit all-tags and writable connections keep polling.', flush=True)
                save('Default', False); reload()
                wait(lambda: rows()['Default']['quality'] == 1)
                time.sleep(32)
                assert rows()['Default']['polling_state'] == 'active'
                assert not api('polling/demand?include_tags=0')['active_poll_test']['connection_eligibility']['Default']['enabled']
                print('Saving all-tags mode and reloading applies immediately and stays active past startup grace.', flush=True)
                save('Default', True); reload()
                wait(lambda: rows()['Default']['polling_state'] == 'inactive', timeout=40)
                body = {'client_id': 'settings-test', 'owner': 'settings-test', 'tags': ['Default:Input']}
                try:
                    assert api('polling/demand/register', body)['ok']
                    wait(lambda: rows()['Default']['polling_state'] == 'active' and rows()['Default']['quality'] == 1)
                finally:
                    api('polling/demand/release', {'client_id': body['client_id'], 'owner': body['owner']})
                wait(lambda: rows()['Default']['polling_state'] == 'inactive')
                print('Saving active-tags mode restores demand-driven wake/release without restarting the core.', flush=True)
            except Exception:
                log.flush(); log.seek(0); print(log.read()[-6000:]); raise
            finally:
                for p in reversed(processes):
                    if p.poll() is None:
                        p.terminate()
                        try: p.wait(timeout=10)
                        except subprocess.TimeoutExpired: p.kill(); p.wait()


if __name__ == '__main__': main()
