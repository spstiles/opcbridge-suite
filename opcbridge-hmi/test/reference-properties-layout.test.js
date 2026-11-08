const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/js/hmi.js'), 'utf8');
function element() {
  return { children: [], classList: { toggle() {} }, attributes: {},
    appendChild(child) { this.children.push(child); },
    append(...children) { this.children.push(...children); },
    setAttribute(key, value) { this.attributes[key] = value; },
    set textContent(value) { this.children = []; this.text = value; },
    get textContent() { return this.text; } };
}
test('large reference lists are collapsed and contained without dropping issues', () => {
  const container = element();
  const ctx = vm.createContext({ selectedReferenceHealthProps: container,
    document: { createElement: element },
    getReferenceHealthIssues: () => Array.from({ length: 100 }, (_, index) => ({ objectImportId: 'group', category: 'tag', source: `Tag ${index}` })),
    getReferenceHealthIssueDisplay: issue => ({ source: issue.source }) });
  const start = source.indexOf('const renderSelectedReferenceProperties =');
  vm.runInContext(source.slice(start, source.indexOf('\n};', start) + 3), ctx);
  vm.runInContext('renderSelectedReferenceProperties({id:"group"})', ctx);
  const details = container.children[0];
  assert.equal(details.open, false);
  assert.equal(details.children[0].textContent, 'References Needing Attention (100)');
  const list = details.children[1];
  assert.equal(list.className, 'reference-property-list');
  assert.equal(list.children.length, 101);
  assert.equal(list.tabIndex, 0);
  ctx.getReferenceHealthIssues = () => [{ objectImportId: 'group', category: 'tag', source: 'One' }];
  vm.runInContext('renderSelectedReferenceProperties({id:"group"})', ctx);
  assert.equal(container.children[0].open, true);
});
