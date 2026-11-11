(function(root) {
  const text = value => String(value ?? '').trim();
  const OBJECT_LABELS = { group: 'Group', ellipse: 'Ellipse', circle: 'Circle', rect: 'Rectangle',
    line: 'Line', curve: 'Curve', polyline: 'Polyline', pipe: 'Pipe', polygon: 'Polygon', spline: 'Spline',
    text: 'Text', button: 'Button', viewport: 'Viewport', image: 'Image', indicator: 'Indicator',
    'number-input': 'Numeric Entry', bar: 'Bar', arc: 'Arc', 'alarms-panel': 'Alarm Panel' };
  const label = obj => OBJECT_LABELS[obj.type] || 'Object';
  function automations(obj) {
    const entries = [];
    const add = (title, tab, binding, actionIndex) => {
      const detail = binding?.tag || binding?.expression || binding?.screenId || '';
      entries.push({ label: `${title}${detail ? ` · ${detail}` : ''}`, tab, actionIndex });
    };
    if (obj.type === 'viewport' && obj.target) add('Screen', 'properties', {screenId:obj.target});
    const actions = obj.action?.type === 'sequence' ? obj.action.actions || [] : obj.action?.type ? [obj.action] : [];
    actions.forEach((action, index) => add(`Click: ${action.type}`, 'click', action, index));
    if (obj.visibility) (obj.visibility.rules || [obj.visibility]).forEach((rule, index) => add(`Visibility ${index + 1}`, index ? `visibility-${index}` : 'visibility', rule));
    const legacyColors = ['fillAutomation','strokeAutomation','backgroundAutomation','borderColorAutomation','textColorAutomation']
      .flatMap(key => obj[key] ? obj[key].rules || [obj[key]] : []);
    const colors = obj.colorAutomationRules || legacyColors;
    colors.forEach((rule, index) => add(`Color ${index + 1}`, index ? `color-${index}` : 'color', rule));
    for (const [key, title, tab] of [['levelAutomation','Level','level'], ['rotationAutomation','Rotation','rotation'], ['motion','Motion','motion'], ['multiStateAutomation','States','states'], ['animator','Animator','animator']]) {
      if (obj[key]) add(title, tab, obj[key]);
    }
    for (const key of ['bind','bindValue','bindLabel']) if (obj[key]) add('Binding', 'properties', obj[key]);
    if (/\{alias:[a-zA-Z0-9_.-]+\}/i.test(String(obj.text || obj.label || ''))) add('Alias', 'properties');
    for (const key of ['textBindings','labelBindings']) for (const [name, binding] of Object.entries(obj[key] || {})) add(`Text {${name}}`, 'properties', binding);
    return entries;
  }
  function model(objects, query = '', parents = [], layers = [], selectedPaths = []) {
    const needle = text(query).toLowerCase();
    const order = new Map(layers.map((layer, index) => [layer.id, index]));
    const entriesByZ = (objects || []).map((object, index) => ({ object, index }))
      .sort((a, b) => (order.get(a.object.layerId) || 0) - (order.get(b.object.layerId) || 0) || a.index - b.index);
    return entriesByZ.flatMap(({object, index}) => {
      const path = [...parents, index];
      const entries = automations(object);
      const own = Object.fromEntries(Object.entries(object).filter(([key]) => !['children','externalReferences','importedDynamics','importInfo','referenceHealth'].includes(key)));
      const matches = !needle || `${label(object)} ${JSON.stringify(own)}`.toLowerCase().includes(needle);
      const children = model(object.children, matches ? '' : query, path, [], selectedPaths);
      const selectedBranch = selectedPaths.some(selected => path.every((index, depth) => selected[depth] === index));
      if (!matches && !children.length && !selectedBranch) return [];
      return [{ object, path, label: label(object), automations: entries, children }];
    });
  }
  function findPath(objects, target, parents = []) {
    for (let index = 0; index < (objects || []).length; index++) {
      const path = [...parents, index];
      if (objects[index] === target) return path;
      const nested = findPath(objects[index].children, target, path);
      if (nested) return nested;
    }
    return null;
  }
  function render({ container, objects, query, expanded, selectedPath, selectedPaths = selectedPath ? [selectedPath] : [], revealSelection = true, onSelect, layers = [] }) {
    const doc = container.ownerDocument;
    const selected = new Set(selectedPaths.map(path => path.join('.')));
    const scrollTop = container.scrollTop;
    let selectedRow;
    for (const path of selectedPaths) for (let depth = 1; depth < path.length; depth++) expanded.add(path.slice(0, depth).join('.'));
    container.replaceChildren();
    const list = doc.createElement('ul'); list.className = 'object-tree-list'; list.setAttribute('role', 'tree');
    list.setAttribute('aria-label', 'Screen objects');
    const draw = (nodes, parent) => nodes.forEach(node => {
      const key = node.path.join('.');
      const li = doc.createElement('li'); li.setAttribute('role', 'treeitem');
      li.setAttribute('aria-selected', selected.has(key) ? 'true' : 'false');
      const row = doc.createElement('div'); row.className = `object-tree-row${selected.has(key) ? ' is-selected' : ''}`;
      if (selected.has(key) && !selectedRow) selectedRow = row;
      const hasChildren = node.children.length;
      const open = Boolean(query) || expanded.has(key);
      const toggle = doc.createElement('button'); toggle.type = 'button'; toggle.className = 'object-tree-toggle';
      toggle.textContent = hasChildren ? open ? '▾' : '▸' : '·'; toggle.disabled = !hasChildren;
      toggle.setAttribute('aria-label', `${open ? 'Collapse' : 'Expand'} ${node.label}`);
      if (hasChildren) li.setAttribute('aria-expanded', open ? 'true' : 'false');
      const button = doc.createElement('button'); button.type = 'button'; button.className = `object-tree-object${node.automations.length ? ' is-linked' : ''}`;
      button.textContent = node.label;
      button.title = `${node.label}\nSelect to show Properties`;
      button.addEventListener('click', () => {
        if (onSelect(node.path) === false) return;
        for (const item of list.querySelectorAll('[aria-selected]')) item.setAttribute('aria-selected', item === li ? 'true' : 'false');
        for (const item of list.querySelectorAll('.object-tree-row')) item.classList.toggle('is-selected', item === row);
      });
      button.addEventListener('dblclick', () => onSelect(node.path, { tab: 'properties' }));
      row.append(toggle, button); li.appendChild(row); parent.appendChild(li);
      if (hasChildren) {
        const children = doc.createElement('ul'); children.setAttribute('role', 'group'); children.hidden = !open;
        toggle.addEventListener('click', () => {
          if (expanded.has(key)) expanded.delete(key); else expanded.add(key);
          children.hidden = !children.hidden; toggle.textContent = children.hidden ? '▸' : '▾';
          li.setAttribute('aria-expanded', children.hidden ? 'false' : 'true');
        });
        draw(node.children, children); li.appendChild(children);
      }
    });
    draw(model(objects, query, [], layers, selectedPaths), list); container.appendChild(list);
    container.scrollTop = scrollTop;
    if (revealSelection) selectedRow?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    if (!list.children.length) { const empty = doc.createElement('p'); empty.className = 'prop-help'; empty.textContent = query ? 'No matching objects.' : 'This screen has no objects.'; container.appendChild(empty); }
  }
  const api = { model, findPath, automations, render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HmiObjectTree = api;
})(globalThis);
