(function(root) {
  const text = value => String(value ?? '').trim();
  const label = obj => text(obj.name || obj.source?.name || obj.label || obj.text || `${obj.type || 'object'}${obj.id || obj.importId ? ` · ${obj.id || obj.importId}` : ''}`).replace(/\s+/g, ' ').slice(0, 90);
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
    const colors = obj.colorAutomationRules || obj.fillAutomation?.rules || (obj.fillAutomation ? [obj.fillAutomation] : []);
    colors.forEach((rule, index) => add(`Color ${index + 1}`, index ? `color-${index}` : 'color', rule));
    for (const [key, title, tab] of [['levelAutomation','Level','level'], ['rotationAutomation','Rotation','rotation'], ['motion','Motion','motion'], ['multiStateAutomation','States','states'], ['animator','Animator','animator']]) {
      if (obj[key]) add(title, tab, obj[key]);
    }
    for (const key of ['bind','bindValue','bindLabel']) if (obj[key]) add('Binding', 'properties', obj[key]);
    for (const key of ['textBindings','labelBindings']) for (const [name, binding] of Object.entries(obj[key] || {})) add(`Text {${name}}`, 'properties', binding);
    return entries;
  }
  function model(objects, query = '', parents = []) {
    const needle = text(query).toLowerCase();
    return (objects || []).flatMap((object, index) => {
      const path = [...parents, index];
      const entries = automations(object);
      const own = Object.fromEntries(Object.entries(object).filter(([key]) => !['children','externalReferences','importedDynamics','importInfo','referenceHealth'].includes(key)));
      const matches = !needle || `${label(object)} ${JSON.stringify(own)}`.toLowerCase().includes(needle);
      const children = model(object.children, matches ? '' : query, path);
      if (!matches && !children.length) return [];
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
  function render({ container, objects, query, expanded, selectedPath, onSelect }) {
    const doc = container.ownerDocument;
    const selected = (selectedPath || []).join('.');
    for (let depth = 1; depth < (selectedPath || []).length; depth++) expanded.add(selectedPath.slice(0, depth).join('.'));
    container.replaceChildren();
    const list = doc.createElement('ul'); list.className = 'object-tree-list'; list.setAttribute('role', 'tree');
    list.setAttribute('aria-label', 'Screen objects');
    const draw = (nodes, parent) => nodes.forEach(node => {
      const key = node.path.join('.');
      const li = doc.createElement('li'); li.setAttribute('role', 'treeitem');
      li.setAttribute('aria-selected', key === selected ? 'true' : 'false');
      const row = doc.createElement('div'); row.className = `object-tree-row${key === selected ? ' is-selected' : ''}`;
      const hasChildren = node.children.length || node.automations.length;
      const open = Boolean(query) || expanded.has(key);
      const toggle = doc.createElement('button'); toggle.type = 'button'; toggle.className = 'object-tree-toggle';
      toggle.textContent = hasChildren ? open ? '▾' : '▸' : '·'; toggle.disabled = !hasChildren;
      toggle.setAttribute('aria-label', `${open ? 'Collapse' : 'Expand'} ${node.label}`);
      if (hasChildren) li.setAttribute('aria-expanded', open ? 'true' : 'false');
      const button = doc.createElement('button'); button.type = 'button'; button.className = 'object-tree-object';
      button.textContent = `${node.label}${node.automations.length ? `  [${node.automations.length}]` : ''}`;
      button.title = `${node.object.type} · ${node.label}\nSelect to show Properties`;
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
        for (const entry of node.automations) {
          const item = doc.createElement('li'); item.setAttribute('role', 'treeitem');
          const action = doc.createElement('button'); action.type = 'button'; action.className = 'object-tree-automation';
          action.textContent = entry.label; action.title = entry.label;
          action.addEventListener('click', () => onSelect(node.path, entry));
          item.appendChild(action); children.appendChild(item);
        }
        draw(node.children, children); li.appendChild(children);
      }
    });
    draw(model(objects, query), list); container.appendChild(list);
    if (!list.children.length) { const empty = doc.createElement('p'); empty.className = 'prop-help'; empty.textContent = query ? 'No matching objects.' : 'This screen has no objects.'; container.appendChild(empty); }
  }
  const api = { model, findPath, automations, render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HmiObjectTree = api;
})(globalThis);
