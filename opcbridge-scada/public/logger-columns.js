(function (root) {
  const sources = ['job_name', 'timestamp_ms', 'timestamp_dt', 'connection_id', 'tag_name', 'tag_description', 'datatype', 'value_numeric', 'value_string', 'quality', 'created_at'];
  function validate(config) {
    const custom = Object.prototype.hasOwnProperty.call(config, 'field_map');
    const mapping = custom ? config.field_map : {};
    const constants = Object.prototype.hasOwnProperty.call(config, 'static_fields') ? config.static_fields : {};
    const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
    if (!object(mapping) || !object(constants)) throw new Error('Column mapping and static fields must be JSON objects.');
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(config.table)) throw new Error('Invalid logger table name.');
    const used = new Set(custom ? [] : sources);
    function destination(name) {
      if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(name)) throw new Error(`Invalid destination column: ${name}`);
      const key = name.toLowerCase();
      if (used.has(key)) throw new Error(`Duplicate destination column: ${name}`);
      used.add(key);
    }
    Object.entries(mapping).forEach(([source, target]) => {
      if (!sources.includes(source)) throw new Error(`Unknown source field: ${source}`);
      if (typeof target !== 'string') throw new Error(`Destination for ${source} must be a string.`);
      destination(target);
    });
    Object.entries(constants).forEach(([column, value]) => {
      destination(column);
      if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) throw new Error(`Static field ${column} must be a string, number, boolean, or null.`);
      if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`Static field ${column} must be finite.`);
    });
    if (custom && used.size === 0) throw new Error('Custom column mapping must include at least one column.');
  }
  const api = { sources, validate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LoggerColumns = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
