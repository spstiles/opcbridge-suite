#!/usr/bin/env python3
"""Check server-owned pending configuration state through real HTTP saves/reloads."""
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
    parser.add_argument('--core-fixture', required=True, help='Core with HTTP on localhost:18080')
    parser.add_argument('--simulator', required=True)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='opcbridge-config-pending-') as directory:
        root = pathlib.Path(directory)
        for name in ['connections', 'tags']:
            (root / name).mkdir()
        connections = {}
        for cid in ['A', 'B']:
            connections[cid] = {'id': cid, 'driver': 'ab_eip', 'gateway': '127.0.0.1:14418',
                                'path': '1,0', 'plc_type': 'lgx', 'description': cid}
            (root / f'connections/{cid}.json').write_text(json.dumps(connections[cid]))
            (root / f'tags/{cid}.json').write_text(json.dumps({'connection_id': cid, 'tags': [
                {'name': 'Input', 'plc_tag_name': 'Input', 'datatype': 'int32', 'scan_ms': 1000}]}))

        def api(path, body=None):
            request = urllib.request.Request('http://127.0.0.1:18080/' + path,
                data=None if body is None else json.dumps(body).encode(),
                headers={'Content-Type': 'application/json', 'X-Admin-Token': 'pending-test-admin'})
            with urllib.request.urlopen(request, timeout=40) as response:
                return json.load(response)

        def pending():
            return api('reload/status')['saved_changes_pending']

        def wait(predicate, timeout=20):
            end = time.monotonic() + timeout
            while time.monotonic() < end:
                try:
                    if predicate():
                        return
                except OSError:
                    pass
                time.sleep(.1)
            raise AssertionError('Pending configuration condition timed out')

        def save(cid):
            result = api('config/file', {'token': 'pending-test-write',
                'path': f'connections/{cid}.json', 'content': json.dumps(connections[cid], indent=2)})
            assert result['ok'], result

        def apply(cid=None):
            body = {'token': 'pending-test-write'}
            if cid:
                body['connection_id'] = cid
            result = api('reload/connection' if cid else 'reload', body)
            assert result['ok'], result
            if result.get('pending'):
                wait(lambda: api('reload/status').get('done'), timeout=60)

        env = os.environ.copy()
        env['OPCBRIDGE_WRITE_TOKEN'] = 'pending-test-write'
        env['OPCBRIDGE_ADMIN_SERVICE_TOKEN'] = 'pending-test-admin'
        processes = []
        with (root / 'services.log').open('w+') as log:
            def start(argv):
                process = subprocess.Popen(argv, cwd=root, env=env, stdout=log, stderr=log)
                processes.append(process)
                return process

            def start_core():
                core = start([args.core_fixture, '--config', str(root), '--http', '--ws-port', '18090'])
                wait(lambda: api('reload/status').get('ok_status'))
                return core

            try:
                start([args.simulator, '--plc=ControlLogix', '--path=1,0', '--port=14418', '--tag=Input:DINT[1]'])
                core = start_core()
                assert not pending()
                save('A')
                assert not pending(), 'Identical JSON save must not enable Apply'
                connections['A']['description'] = 'Changed A'
                save('A')
                assert pending()
                assert pending(), 'New HTTP request/browser must see the same pending state'
                connections['B']['description'] = 'Changed B'
                save('B')
                apply('A')
                assert pending(), 'Applying A must not clear unapplied changes to B'
                apply()
                assert not pending()
                print('HTTP saves, repeated readers, targeted reload, and full Apply track pending changes correctly.', flush=True)
                result = api('config/delete', {'token': 'pending-test-write', 'path': 'connections/A.json'})
                assert result['ok'] and pending()
                assert not (root / 'tags/A.json').exists()
                apply()
                assert not pending()
                connections['B']['description'] = 'Applied at next startup'
                save('B')
                assert pending()
                core.terminate()
                core.wait(timeout=15)
                start_core()
                assert not pending(), 'Startup loads the saved configuration'
                print('Saved deletion enables Apply; restart loads pending configuration and clears pending state.', flush=True)
            except Exception:
                log.flush()
                log.seek(0)
                print(log.read()[-8000:])
                raise
            finally:
                for process in reversed(processes):
                    if process.poll() is None:
                        process.terminate()
                        try:
                            process.wait(timeout=15)
                        except subprocess.TimeoutExpired:
                            process.kill()
                            process.wait()


if __name__ == '__main__':
    main()
