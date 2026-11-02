#!/usr/bin/env python3
"""Use a test-port core binary and disposable memory-only config; never production."""
import argparse
import json
import pathlib
import subprocess
import tempfile
import time
import urllib.request


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--binary', required=True, help='Isolated test core listening on localhost:18080')
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='opcbridge-automation-demand-') as directory:
        root = pathlib.Path(directory)
        (root / 'tags').mkdir()
        (root / 'connections').mkdir()
        (root / 'tags/_memory.json').write_text(json.dumps({'connection_id': '_memory', 'tags': [
            {'name': 'Source', 'source': 'memory', 'datatype': 'int32', 'initial_value': '7'},
            {'name': 'Unused', 'source': 'memory', 'datatype': 'int32', 'initial_value': '0'},
            {'name': 'Unrelated', 'source': 'memory', 'datatype': 'int32', 'initial_value': '0'}]}))
        scripts = [{'id': 'conditional', 'name': 'Conditional', 'enabled': False,
                    'source': "if (tag('_memory', 'Source') > 100) { let x = tag('_memory', 'Unused'); }"},
                   {'id': 'dynamic', 'name': 'Unresolved', 'enabled': False,
                    'source': 'let x = tag(connection, name);', 'engine': 'unknown'}]
        blocks = [{'id': 'block', 'name': 'Setup and loop', 'enabled': False,
                   'setup_source': "let x = tag('_memory', 'Source');",
                   'loop_source': "let value = quality('_memory', 'Unused');"}]
        def save():
            temporary = root / 'logic.tmp'
            temporary.write_text(json.dumps({'scripts': scripts, 'blocks': blocks}))
            temporary.replace(root / 'logic.json')
        save()
        with open(root / 'server.log', 'w+') as log:
            process = subprocess.Popen([args.binary, '--config', str(root), '--http'],
                                       cwd=root, stdout=log, stderr=log)
            try:
                def wait_for(predicate):
                    for _ in range(100):
                        try:
                            with urllib.request.urlopen('http://127.0.0.1:18080/polling/demand', timeout=2) as response:
                                result = json.load(response)
                            assert result['mode'] == 'observe_only' and result['polling_unchanged']
                            if predicate(result):
                                return result
                        except (OSError, ValueError):
                            pass
                        time.sleep(.1)
                    raise AssertionError('Timed out waiting for automation observations')
                wait_for(lambda d: not d['automation']['all_tags_required'])
                scripts[0]['enabled'] = True
                blocks[0]['enabled'] = True
                save()
                result = wait_for(lambda d: len(d['automation']['enabled_automations']) == 2)
                assert result['automation']['coverage_complete']
                assert not result['automation']['all_tags_required']
                assert result['automation']['tags'] == ['_memory:Source', '_memory:Unused']
                assert result['consumer_registrations']['opcbridge-automation']['all_tags_registrations'] == 0
                rows = {t['name']: t for t in result['tags']}
                assert 'consumer:opcbridge-automation' in rows['Source']['reasons']
                assert 'consumer:opcbridge-automation' in rows['Unused']['reasons']
                assert 'consumer:opcbridge-automation' not in rows['Unrelated']['reasons']
                # Demand must outlive setup and retain reads from untaken branches.
                time.sleep(2.2)
                wait_for(lambda d: d['automation']['tags'] == ['_memory:Source', '_memory:Unused'])
                scripts[1]['enabled'] = True
                save()
                result = wait_for(lambda d: len(d['automation']['enabled_automations']) == 3)
                assert not result['automation']['coverage_complete']
                assert result['consumer_registrations']['opcbridge-automation']['all_tags_registrations'] == 1
                assert all('consumer:opcbridge-automation' in tag['reasons'] for tag in result['tags'])
                for item in scripts + blocks:
                    item['enabled'] = False
                save()
                result = wait_for(lambda d: not d['automation']['enabled_automations'])
                assert 'opcbridge-automation' not in result['consumer_registrations']
                assert all('consumer:opcbridge-automation' not in tag['reasons'] for tag in result['tags'])
                print('Automation demand passed: literal inputs, setup/conditions/loops, unrelated-tag exclusion, conservative fallback, and config reload release.')
            except Exception:
                log.flush(); log.seek(0)
                print(log.read()[-3000:])
                raise
            finally:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill(); process.wait()


if __name__ == '__main__':
    main()
