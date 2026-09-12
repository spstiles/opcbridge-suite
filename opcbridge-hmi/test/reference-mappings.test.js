const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
function mappings(objects) {
  const context = vm.createContext({
    currentScreenObj: { objects },
    aliasTokenName: () => '',
    resolveMappedConnectionId: value => value
  });
  for (const [start, end] of [
    ['const decodeExpressionStringLiteral =', 'const rewriteAutomationExpressionConnections ='],
    ['const parseMappedTagReference =', 'function resolveMappedConnectionId('],
    ['const extractAutomationExpressionTagReferences =', 'const extractAutomationExpressionTagKeys ='],
    ['const formatMappedTagReference =', 'const downloadScreenReferenceMappings =']
  ]) vm.runInContext(source.slice(source.indexOf(start), source.indexOf(end)), context);
  return vm.runInContext('collectScreenReferenceMappings()', context);
}

test('exports unresolved imported expression tags and preserves math on replacement', () => {
  const binding = { sourceType: 'expression', expression: '{{ac:Plant/Flow/Analog}}/1000000', sourceReference: '{{ac:Plant/Flow/Analog}}/1000000', tag: '', connection_id: '' };
  const groups = mappings([{ id: 'flow', textBindings: { '1': binding } }]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].current, 'ac:Plant/Flow/Analog');
  assert.equal(groups[0].occurrences[0].status, 'unresolved');
  assert.equal(groups[0].occurrences[0].apply('Plant::Flow', true), true);
  assert.equal(binding.expression, 'tag("Plant", "Flow")/1000000');
  assert.equal(binding.sourceType, 'expression');
});

test('remaps repeated and nested-brace references without changing other expression terms', () => {
  const binding = { sourceType: 'expression', expression: '{{{{ac:A}}}} + {{ac:A}} + {{ac:B}} + tag("Plant", "Good")' };
  const groups = mappings([{ id: 'sum', textBindings: { '1': binding } }]);
  assert.equal(groups.length, 3);
  groups.find(group => group.current === 'ac:A').occurrences[0].apply('Plant::A', true);
  assert.equal(binding.expression, 'tag("Plant", "A") + tag("Plant", "A") + {{ac:B}} + tag("Plant", "Good")');
  assert.equal(binding.status, 'unresolved');
  groups.find(group => group.current === 'ac:B').occurrences[0].apply('Plant::B', true);
  assert.equal(binding.expression, 'tag("Plant", "A") + tag("Plant", "A") + tag("Plant", "B") + tag("Plant", "Good")');
});

test('object mapping repairs only the chosen object and ignores import-history references', () => {
  const first = { sourceType: 'expression', expression: '{{ac:A}} * 2' };
  const second = { ...first };
  const groups = mappings([
    { id: 'one', textBindings: { '1': first }, externalReferences: [{ tag: 'ac:Old', connection_id: '' }] },
    { id: 'two', textBindings: { '1': second } }
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].occurrences.length, 2);
  groups[0].occurrences.find(item => item.objectId === 'one').apply('Plant::A', true);
  assert.equal(first.expression, 'tag("Plant", "A") * 2');
  assert.equal(second.expression, '{{ac:A}} * 2');
});

test('keeps direct unresolved bindings and skips brace-like text inside quoted strings', () => {
  const groups = mappings([{ id: 'one',
    textBindings: {
      '1': { sourceType: 'tag', connection_id: '', tag: 'ac:Missing', status: 'unresolved' },
      '2': { sourceType: 'expression', expression: 'tag("Plant", "Good") + "{{ac:Literal}}"' }
    }
  }]);
  assert.equal(groups.length, 2);
  assert.ok(groups.some(group => group.current === 'ac:Missing'));
  assert.ok(groups.some(group => group.current === 'Plant::Good'));
});
