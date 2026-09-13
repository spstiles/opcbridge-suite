/* On-demand, read-only cross-reference analysis of saved configuration. */
(function (root) {
  function create(tags, connectionNames = {}) {
    const warnings = new Set();
    const references = new Map();
    const records = new Map();
    const byConnection = new Map();
    const key = (connection, name) => `${connection}\u0000${name}`;
    tags.forEach(tag => {
      const connection = String(tag.connection_id || '');
      const name = String(tag.name || '');
      if (!name) return;
      const record = { connection, name, definition: tag, source: String(tag.plc_tag_name || tag.source_tag || ''), uses: new Map() };
      records.set(key(connection, name), record);
      if (!byConnection.has(connection)) byConnection.set(connection, []);
      byConnection.get(connection).push(record);
    });
    const resolveConnection = value => {
      if (byConnection.has(value)) return value;
      const matches = Object.keys(connectionNames).filter(id => String(connectionNames[id]).toLowerCase() === value.toLowerCase());
      return matches.length === 1 ? matches[0] : value;
    };
    function add(connection, name, component, location, usage, patterns = false) {
      connection = resolveConnection(String(connection || ''));
      name = String(name || '');
      if (!name) return;
      if (/\{alias:|\{\{|\$\{/.test(connection + name)) {
        warnings.add(`${component}: dynamic or imported reference at ${location}`);
        return;
      }
      const reference = { connection, name, component, location, usage };
      references.set(JSON.stringify(reference), reference);
      let matches;
      if (patterns && /[*?]/.test(name)) {
        const regex = new RegExp(`^${name.split('').map(c => c === '*' ? '.*' : c === '?' ? '.' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')}$`);
        matches = (byConnection.get(connection) || []).filter(record => regex.test(record.name));
      } else {
        const record = records.get(key(connection, name));
        matches = record ? [record] : [];
      }
      if (!matches.length) {
        warnings.add(`${component}: unresolved reference ${connectionNames[connection] || connection}::${name} at ${location}`);
        return;
      }
      const use = { component, location, usage };
      matches.forEach(record => record.uses.set(JSON.stringify(use), use));
    }
    const decode = literal => literal[0] === '"' ? JSON.parse(literal) : literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    function scan(value, component, location, patterns = false) {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) { value.forEach((item, i) => scan(item, component, `${location}[${i}]`, patterns)); return; }
      const label = value.id || value.importId;
      if (label) location += ` (${String(label)})`;
      const isExpression = value.sourceType === 'expression';
      const tag = value.tag_name ?? value.tag ?? value.name;
      if (!isExpression && value.connection_id != null && tag != null) {
        add(value.connection_id, tag, component, location, value.enabled === false ? 'Configured (disabled)' : 'Tag reference', patterns);
      }
      for (const [field, child] of Object.entries(value)) {
        if (['externalReferences', 'referenceHealth', 'importInfo', 'sourceReference', 'sourceExpression', 'runtime'].includes(field)) continue;
        const childLocation = `${location}.${field}`;
        if (/expression|condition|script|code/i.test(field) && typeof child === 'string') {
          const regex = /\btag\s*\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*,\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\)/g;
          let count = 0;
          for (const match of child.matchAll(regex)) {
            count++;
            try { add(decode(match[1]), decode(match[2]), component, childLocation, 'Expression'); }
            catch { warnings.add(`${component}: unreadable expression at ${childLocation}`); }
          }
          if (child.includes('{{') || child.includes('{alias:') || (child.match(/\btag\s*\(/g) || []).length > count) warnings.add(`${component}: expression requires manual review at ${childLocation}`);
          if (/script|code/i.test(field) && child.trim()) warnings.add(`${component}: script may construct references dynamically at ${childLocation}`);
        } else if (Array.isArray(child) && ['tags', 'patterns'].includes(field)) {
          child.forEach((item, i) => {
            if (typeof item === 'string') {
              const separator = item.indexOf(':');
              if (separator > 0) add(item.slice(0, separator), item.slice(separator + (item[separator + 1] === ':' ? 2 : 1)), component, `${childLocation}[${i}]`, 'Tag selection', patterns);
              else warnings.add(`${component}: unqualified tag selection at ${childLocation}[${i}]`);
            } else scan(item, component, `${childLocation}[${i}]`, patterns);
          });
        } else if (child && typeof child === 'object') scan(child, component, childLocation, patterns);
      }
    }
    tags.forEach(tag => {
      if (tag.source_tag) add(tag.source_connection_id || tag.connection_id, tag.source_tag, 'Tag Alias', String(tag.name), 'Derived source');
    });
    const describe = record => ({ id: key(record.connection, record.name), name: record.name,
      connection: connectionNames[record.connection] || record.connection,
      bit: record.definition.bit, enabled: record.definition.enabled !== false });
    function trace(record) {
      const chain = [], seen = new Set();
      let current = record;
      while (current) {
        const id = key(current.connection, current.name);
        if (seen.has(id)) return { chain, error: 'Alias cycle — source cannot be resolved.' };
        seen.add(id); chain.push(describe(current));
        const source = current.definition.source_tag;
        if (!source) return { chain, connection: current.connection,
          source: current.definition.plc_tag_name || current.name };
        const connection = resolveConnection(String(current.definition.source_connection_id || current.connection));
        current = records.get(key(connection, String(source)));
        if (!current) {
          const element = String(source).match(/^(.*?)((?:\[\d+\])+.*)$/);
          const arrayRoot = element && records.get(key(connection, element[1]));
          if (arrayRoot && !arrayRoot.definition.source_tag) return { chain: [...chain, describe(arrayRoot)], connection,
            source: (arrayRoot.definition.plc_tag_name || arrayRoot.name) + element[2] };
        }
        if (!current) return { chain, error: `Alias source not found: ${source}` };
      }
    }
    const sources = new Map([...records].map(([id, record]) => [id, trace(record)]));
    function details(id) {
      const record = records.get(id);
      if (!record) return null;
      const resolved = sources.get(id);
      const result = { ...describe(record), ...resolved, connection: describe(record).connection,
        sourceConnection: connectionNames[resolved.connection] || resolved.connection,
        uses: [...record.uses.values()], related: [], array: null };
      if (resolved.error) return result;
      const match = resolved.source.match(/^(.*?)\[(\d+)\](.*)$/);
      const base = match ? match[1] : resolved.source;
      const elements = new Map();
      for (const [otherId, other] of records) {
        const target = sources.get(otherId);
        if (target.error || target.connection !== resolved.connection) continue;
        if (target.source === resolved.source) result.related.push(describe(other));
        const element = target.source.match(/^(.*?)\[(\d+)\](.*)$/);
        if (!element || element[1] !== base) continue;
        const index = Number(element[2]);
        if (!elements.has(index)) elements.set(index, []);
        elements.get(index).push({ ...describe(other), source: target.source });
      }
      if (elements.size) result.array = { name: base,
        highest: Math.max(...elements.keys()),
        elements: [...elements].sort((a, b) => a[0] - b[0]).map(([index, assignments]) => ({ index, assignments })) };
      return result;
    }
    function assignments(connection, name = '') {
      const groups = new Map();
      for (const [id, record] of records) {
        if (record.connection !== connection) continue;
        const resolved = sources.get(id);
        let source = resolved.error ? (record.definition.source_tag || record.source || record.name) : resolved.source;
        if (name) {
          if (id === key(connection, name)) continue;
          source = String(record.definition.source_tag || '');
          const sourceConnection = resolveConnection(String(record.definition.source_connection_id || record.connection));
          if (sourceConnection !== connection) continue;
          // Search the configured logical reference, never the underlying PLC address.
          const suffix = source.startsWith(name) ? source.slice(name.length) : null;
          if (suffix !== '' && !(suffix && /^(?:\[\d+\])+(?:\.\d+)?$/.test(suffix))) continue;
        }
        const groupKey = key(resolved.connection || connection, source);
        if (!groups.has(groupKey)) groups.set(groupKey, { source, tags: [] });
        groups.get(groupKey).tags.push({ ...describe(record), error: name ? '' : resolved.error || '' });
      }
      return [...groups.values()].sort((a, b) => a.source.localeCompare(b.source, undefined, { numeric: true }));
    }
    function rows() {
      const output = [];
      const notes = ['Saved configuration only; external clients and unsaved edits are excluded.', ...[...warnings].slice(0, 20),
        ...(warnings.size > 20 ? [`${warnings.size - 20} additional coverage notes are shown in the audit panel.`] : [])].join(' | ');
      [...records.values()].sort((a, b) => String(connectionNames[a.connection] || a.connection).localeCompare(String(connectionNames[b.connection] || b.connection))
        || a.source.localeCompare(b.source, undefined, { numeric: true }) || a.name.localeCompare(b.name, undefined, { numeric: true }))
        .forEach(record => {
          const uses = [...record.uses.values()];
          (uses.length ? uses : [{ component: '', location: '', usage: '' }]).forEach(use => output.push(Object.assign([
            connectionNames[record.connection] || record.connection, record.name, record.source, uses.length,
            use.component, use.location, use.usage, warnings.size ? 'Incomplete — see notes' : 'Configured references scanned', notes
          ], { recordId: key(record.connection, record.name) })));
        });
      return output;
    }
    const headers = ['Connection', 'Tag Name', 'PLC / Alias Source', 'Use Count', 'Component', 'Location', 'Usage Type', 'Audit Coverage', 'Audit Notes'];
    const csv = () => [headers, ...rows()].map(row => row.map(value => {
      let text = String(value ?? '');
      if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    }).join(',')).join('\r\n');
    function uses(connection, name) {
      return [...references.values()].filter(ref => {
        if (ref.connection !== connection || ref.component === 'Tag Alias') return false;
        const suffix = ref.name.startsWith(name) ? ref.name.slice(name.length) : null;
        return suffix === '' || !!(suffix && /^(?:\[\d+\])+(?:\.\d+)?$/.test(suffix));
      }).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }) || a.location.localeCompare(b.location));
    }
    return { scan, rows, csv, details, assignments, uses, headers, warnings, tagCount: records.size };
  }
  const connectionInfo = (config, fallbackId = '') => {
    const id = String(config.id || config.connection_id || fallbackId).trim();
    const name = String(config.description || '').trim() || String(config.name || '').trim()
      || String(config.display_name || '').trim() || id;
    return { id, name };
  };
  const filterRows = (rows, search = '') => {
    const terms = [...String(search).toLowerCase().matchAll(/"([^"]*)"|(\S+)/g)]
      .map(match => match[1] ?? match[2]).filter(Boolean);
    if (!terms.length) return rows;
    return rows.filter(row => {
      const fields = row.slice(0, 7).map(value => String(value).toLowerCase());
      return terms.every(term => fields.some(field => field.includes(term)));
    });
  };
  function crossReferenceCsv({ connection, selection = '', assignments = [], uses = [], warnings = [] }) {
    const coverage = selection
      ? 'Workspace assignments and saved HMI only; unsaved HMI edits and other services excluded.'
      : 'Workspace assignments only; application uses not scanned.';
    const notes = [coverage, ...warnings].join(' | ');
    const rows = [['Connection', 'Selected Tag', 'Referenced Tag / Source', 'Assignment Count', 'Used In', 'Location / Assigned Tag', 'Usage', 'Bit', 'Enabled', 'Coverage Notes']];
    assignments.forEach(item => item.tags.forEach(tag => rows.push([
      connection, selection, item.source, item.tags.length, 'Workspace', tag.name,
      'Tag assignment', tag.bit != null && Number(tag.bit) >= 0 ? tag.bit : '', tag.enabled, [notes, tag.error].filter(Boolean).join(' | ')
    ])));
    uses.forEach(use => rows.push([connection, selection, use.name, '', use.component, use.location, use.usage, '', '', notes]));
    if (rows.length === 1) rows.push([connection, selection, '', 0, '', '', 'No references found within scan coverage', '', '', notes]);
    return rows.map(row => row.map(value => {
      let text = String(value ?? '');
      if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    }).join(',')).join('\r\n');
  }
  const api = { create, connectionInfo, filterRows, crossReferenceCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TagAudit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
