#!/usr/bin/env python3
"""Exercise the real Flow binary against an isolated controllable HTTP source.
No PLC, database, MQTT broker or installed service is changed.
"""
import argparse
import copy
import http.server
import json
import pathlib
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.request


def request(path, body=None):
    req = urllib.request.Request('http://127.0.0.1:18198' + path,
        data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=5) as response:
        return json.load(response)


def wait_for(predicate):
    for _ in range(100):
        value = predicate()
        if value: return value
        time.sleep(.05)
    raise AssertionError('Timed out waiting for Flow result')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--flow-binary', required=True)
    args = parser.parse_args()
    state = {'mode': 'good', 'fresh': [], 'cached': 0}
    lock = threading.Lock()
    blocked, release = threading.Event(), threading.Event()
    class Source(http.server.BaseHTTPRequestHandler):
        def log_message(self, *_): pass
        def respond(self, code, body):
            self.send_response(code); self.end_headers()
            try: self.wfile.write(json.dumps(body).encode())
            except BrokenPipeError: pass
        def do_GET(self):
            with lock:
                state['cached'] += 1
                mode = state['mode']
                state['wake_attempts'] = state.get('wake_attempts', 0) + 1
                attempt = state['wake_attempts']
            if mode == 'cached_wake_failure' and attempt > 1:
                self.respond(500, {'error': 'source failed'}); return
            row = {'connection_id': 'PLC', 'name': 'Input', 'quality': 1, 'value': 999}
            if mode == 'cached_waking' and attempt <= 2 or mode in ['cached_waiting', 'cached_bad', 'cached_wrong', 'cached_wake_failure']:
                row.update(quality=0, value=None)
                if mode != 'cached_bad': row['polling_state'] = 'inactive' if attempt == 1 else 'waiting'
                if mode == 'cached_wrong': row['name'] = 'Wrong'
            self.respond(200, {'tags': [row]})
        def do_POST(self):
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            if self.path != '/polling/fresh-read':
                self.respond(200, {'ok': True}); return
            with lock:
                mode = state['mode']; state['fresh'].append(body)
            if mode == 'blocked':
                blocked.set(); release.wait(4)
            if mode == 'old_core': self.respond(404, {'error': 'not supported'}); return
            sample = {'connection_id': 'PLC', 'name': body['tags'][0]['name'], 'quality': 1, 'value': 7, 'timestamp_ms': 1234}
            result = {'ok': True, 'tags': [{'fresh': True, 'sample': sample}]}
            if mode in ['timeout', 'unsupported_source']:
                result = {'ok': False, 'tags': [{'fresh': False, 'reason': mode, 'sample': sample}]}
            elif mode == 'bad_quality': sample['quality'] = 0
            elif mode == 'wrong_tag': sample['name'] = 'Other'
            elif mode == 'null': sample['value'] = None
            elif mode == 'missing_verification': result['tags'][0].pop('fresh')
            self.respond(200, result)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 18181), Source)
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    process = None
    with tempfile.TemporaryDirectory(prefix='opcbridge-flow-freshness-') as directory:
        root = pathlib.Path(directory)
        def write(name, body):
            p = root / name; p.write_text(json.dumps(body)); return str(p)
        flow = {'id': 'test', 'name': 'Fresh test', 'enabled': True, 'edges': [], 'nodes': [
            {'id': 'input', 'type': 'opc_tag_input', 'config': {'connection_id': 'PLC', 'tag_name': 'Input',
                'require_fresh_read': True, 'fresh_max_age_ms': 0, 'fresh_timeout_ms': 200,
                'poll_interval_ms': 600000}}]}
        def node(): return request('/flows')['runtime']['test']['nodes']['input']
        def deploy(mode):
            with lock: state['mode'] = mode
            assert request('/flows', flow)['ok']
            assert request('/flows/test/deploy', {})['ok']
        with (root / 'flow.log').open('w+') as log:
            try:
                process = subprocess.Popen([args.flow_binary, '--config', write('config.json', {
                    'listen_host': '127.0.0.1', 'listen_port': 18198,
                    'connections_dir': str(root / 'connections'), 'opcbridge_base_url': 'http://127.0.0.1:18181'}),
                    '--flows', write('flows.json', {'flows': []}), '--deployed', write('deployed.json', {'flows': []}),
                    '--state', str(root / 'state.json')], stdout=log, stderr=subprocess.STDOUT)
                def ready():
                    try: return request('/health').get('ok')
                    except OSError: return False
                wait_for(ready)
                for mode in ['good', 'timeout', 'unsupported_source', 'old_core', 'bad_quality', 'wrong_tag', 'null', 'missing_verification']:
                    deploy(mode)
                    result = wait_for(lambda: node() if node()['status'] in ['error', 'ok'] else None)
                    if mode == 'good': assert result['messages_out'] == 1 and result['last_value'] == 7, result
                    else: assert result['messages_out'] == 0 and result['last_error'], (mode, result)
                with lock:
                    assert state['cached'] == 0, state
                    assert all(r['max_age_ms'] == 0 and r['timeout_ms'] == 200 for r in state['fresh'])
                # The pending response must not overwrite a newly deployed input.
                deploy('blocked'); assert blocked.wait(3)
                flow['nodes'][0]['config']['tag_name'] = 'Replacement'
                assert request('/flows', flow)['ok']
                assert request('/flows/test/deploy', {})['ok']
                with lock: state['mode'] = 'good'
                release.set()
                result = wait_for(lambda: node() if node()['messages_out'] else None)
                assert result['messages_out'] == 1, result
                # Disabled while blocked: no late good value or error changes runtime.
                blocked.clear(); release.clear(); deploy('blocked'); assert blocked.wait(3)
                assert request('/flows/test/disable', {})['ok']
                release.set(); time.sleep(.3)
                assert request('/flows')['runtime']['test']['nodes']['input']['messages_out'] == 0
                # Existing configurations retain cached GET behavior.
                flow['nodes'][0]['config']['require_fresh_read'] = False
                deploy('good'); wait_for(lambda: node()['messages_out'] == 1)
                with lock: assert state['cached'] == 1
                flow['nodes'][0]['config']['tag_name'] = 'Input'
                with lock: state['wake_attempts'] = 0
                deploy('cached_waking')
                wait_for(lambda: node()['messages_out'] == 1)
                with lock: assert state['wake_attempts'] == 3
                assert node()['last_value'] == 999
                for mode in ['cached_bad', 'cached_wrong']:
                    with lock: state['wake_attempts'] = 0
                    deploy(mode); wait_for(lambda: node()['status'] == 'error')
                    time.sleep(.6)
                    with lock: assert state['wake_attempts'] == 1, state
                    assert node()['messages_out'] == 0
                with lock: state['wake_attempts'] = 0
                deploy('cached_wake_failure')
                wait_for(lambda: state['wake_attempts'] >= 2)
                time.sleep(.6)
                with lock: assert state['wake_attempts'] == 2, state
                assert node()['messages_out'] == 0
                with lock: state['wake_attempts'] = 0
                deploy('cached_waiting')
                time.sleep(5.8)
                with lock: attempts = state['wake_attempts']; assert 2 <= attempts <= 24, state
                time.sleep(.6)
                with lock: assert state['wake_attempts'] == attempts, state
                assert node()['messages_out'] == 0
                invalid = copy.deepcopy(flow); invalid['nodes'][0]['config']['fresh_timeout_ms'] = 5001
                try: request('/flows', invalid)
                except urllib.error.HTTPError as error: assert error.code == 400
                else: raise AssertionError('Invalid freshness configuration accepted')
                print('Flow freshness passed: verified samples, failures without cache fallback, identity/quality/null checks, redeploy/disable cancellation, legacy cached reads, lifecycle wake retries and bounded/error retry behavior.')
            except Exception:
                log.flush(); log.seek(0); print(log.read()[-4000:]); raise
            finally:
                release.set()
                if process and process.poll() is None:
                    process.terminate()
                    try: process.wait(timeout=8)
                    except subprocess.TimeoutExpired: process.kill(); process.wait()
                server.shutdown(); server.server_close(); thread.join()

if __name__ == '__main__': main()
