#!/usr/bin/env python3
"""Test Logger verification against disposable HTTP fixtures; no database is used.
Build helper: g++ -std=c++17 -O0 -pthread -Iopcbridge
  opcbridge-logger/test/freshness.cpp -o /tmp/logger-freshness-test -lcurl -lmysqlclient
"""
import argparse
import http.server
import json
import pathlib
import subprocess
import tempfile
import threading
import time
import urllib.request


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--helper', required=True)
    parser.add_argument('--logger-binary', required=True)
    args = parser.parse_args()
    base = 'http://127.0.0.1:18182'
    class Source(http.server.BaseHTTPRequestHandler):
        def log_message(self, *_): pass
        def reply(self, status, body):
            self.send_response(status); self.end_headers(); self.wfile.write(json.dumps(body).encode())
        def do_GET(self):
            self.reply(200, {'tags': [{'connection_id': 'PLC', 'name': 'Tag' + str(i), 'value': 999, 'quality': 1}
                for i in range(3)] + [{'connection_id': 'Other', 'name': 'Unrelated'}]})
        def do_POST(self):
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            if not self.path.endswith('/polling/fresh-read'):
                self.reply(200, {'ok': True}); return
            mode = self.path.split('/')[1]
            refs = body['tags']
            assert len(refs) <= 64 and body['max_age_ms'] == 0 and body['timeout_ms'] == 1000
            if mode == 'old': self.reply(404, {'error': 'unsupported'}); return
            rows = [{'fresh': True, 'sample': {**ref, 'value': 7, 'quality': 1, 'timestamp_ms': 1234}} for ref in refs]
            result = {'ok': True, 'tags': rows}
            if mode == 'timeout' or (mode == 'second_fails' and len(refs) == 1): result['ok'] = False
            if mode == 'wrong': rows[0]['sample']['name'] = 'NotSelected'
            if mode == 'duplicate': rows[1] = rows[0]
            if mode == 'bad': rows[0]['sample']['quality'] = 0
            if mode == 'null': rows[0]['sample']['value'] = None
            if mode == 'timestamp': rows[0]['sample']['timestamp_ms'] = 'invalid'
            if mode == 'unverified': rows[0].pop('fresh')
            if mode == 'omitted': rows.pop()
            self.reply(200, result)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 18182), Source)
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    process = None
    def request(path, body=None):
        req = urllib.request.Request('http://127.0.0.1:18195' + path,
            data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as response: return json.load(response)
    try:
        subprocess.run([args.helper, base], check=True)
        with tempfile.TemporaryDirectory(prefix='opcbridge-logger-freshness-') as directory:
            root = pathlib.Path(directory)
            def write(name, value):
                path = root / name; path.write_text(json.dumps(value)); return str(path)
            with (root / 'logger.log').open('w+') as log:
                try:
                    process = subprocess.Popen([args.logger_binary, '--service', '--config', write('config.json', {
                        'listen_host': '127.0.0.1', 'listen_port': 18195, 'opcbridge_base_url': base + '/wrong'}),
                        '--databases', write('databases.json', {'databases': [
                            {'id': mode, 'mysql_host': '127.0.0.1', 'mysql_port': 9, 'opcbridge_base_url': base + '/' + mode}
                            for mode in ['timeout', 'good']]}),
                        '--reports', write('reports.json', {'reports': [
                            {'id': mode, 'database_id': mode, 'enabled': False, 'tags': ['PLC:Tag:WithColon'], 'require_fresh_read': True}
                            for mode in ['timeout', 'good']]}),
                        '--data-checks', write('checks.json', {'data_checks': []}), '--sync-jobs', write('sync.json', {'sync_jobs': []}),
                        '--state', str(root / 'state.json')], stdout=log, stderr=subprocess.STDOUT)
                    for _ in range(100):
                        try:
                            if request('/health').get('ok'): break
                        except OSError: pass
                        time.sleep(.05)
                    else: raise AssertionError('Logger did not start')
                    for mode in ['timeout', 'good']:
                        assert request('/jobs/' + mode + '/run', {})['ok']
                        for _ in range(100):
                            status = next(j for j in request('/jobs')['jobs'] if j['id'] == mode)
                            if status['runs_total'] and not status['running']: break
                            time.sleep(.05)
                        else: raise AssertionError(status)
                        assert status['last_inserted'] == 0, status
                        if mode == 'timeout':
                            assert 'Fresh samples unavailable' in status['last_error'] and 'mysql_real_connect' not in status['last_error'], status
                        else: assert 'mysql_real_connect failed' in status['last_error'], status
                    print('Logger freshness passed: exact/pattern/all selection, 65-tag batches, failure clears all samples, validation, endpoint overrides, and verification before DB access.')
                except Exception:
                    log.flush(); log.seek(0); print(log.read()[-4000:]); raise
                finally:
                    if process and process.poll() is None:
                        process.terminate()
                        try: process.wait(timeout=8)
                        except subprocess.TimeoutExpired: process.kill(); process.wait()
    finally:
        server.shutdown(); server.server_close(); thread.join()

if __name__ == '__main__': main()
