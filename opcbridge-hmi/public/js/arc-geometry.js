// Angles use screen coordinates: zero is right, positive is clockwise.
(function (root) {
  const number = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const frame = o => ({ x: number(o.x, 0), y: number(o.y, 0), w: Math.max(0, number(o.w, 0)), h: Math.max(0, number(o.h, 0)) });
  const point = (o, angle) => {
    const { x, y, w, h } = frame(o);
    const a = angle * Math.PI / 180;
    return { x: x + w / 2 + w / 2 * Math.cos(a), y: y + h / 2 + h / 2 * Math.sin(a) };
  };
  const path = o => {
    const { w, h } = frame(o);
    const start = number(o.startAngle, 0);
    const sweep = Math.max(-360, Math.min(360, number(o.sweepAngle, 90)));
    if (!w || !h || !sweep) return '';
    const p = point(o, start);
    let d = `M ${p.x} ${p.y}`;
    // Two arcs also handle a full circle (coincident SVG endpoints cannot).
    const count = Math.ceil(Math.abs(sweep) / 180);
    for (let i = 1; i <= count; i++) {
      const end = point(o, start + sweep * i / count);
      d += ` A ${w / 2} ${h / 2} 0 0 ${sweep > 0 ? 1 : 0} ${end.x} ${end.y}`;
    }
    return d;
  };
  const angle = (o, p) => {
    const { x, y, w, h } = frame(o);
    return Math.atan2((p.y - y - h / 2) / (h / 2 || 1), (p.x - x - w / 2) / (w / 2 || 1)) * 180 / Math.PI;
  };
  const fromEndpoints = (a, b, circle = false) => {
    let dx = b.x - a.x, dy = b.y - a.y;
    // A quarter ellipse requires displacement on both axes. Do not invent
    // an endpoint for a click or a straight horizontal/vertical drag.
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || !dx || !dy) return null;
    if (circle) { const size = Math.max(Math.abs(dx), Math.abs(dy)); dx = (dx < 0 ? -1 : 1) * size; dy = (dy < 0 ? -1 : 1) * size; }
    // Start tangent is horizontal; end tangent is vertical. Mirroring the
    // drag gives all four bend orientations without an extra direction mode.
    const rx = Math.abs(dx), ry = Math.abs(dy);
    return { x: a.x - rx, y: a.y + dy - ry, w: rx * 2, h: ry * 2,
      startAngle: dy > 0 ? -90 : 90, sweepAngle: Math.sign(dx * dy) * 90 };
  };
  const api = { point, path, angle, fromEndpoints };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HmiArcGeometry = api;
})(globalThis);
