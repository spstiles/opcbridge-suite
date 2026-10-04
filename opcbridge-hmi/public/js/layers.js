(function (root) {
  "use strict";
  const createId = () => "layer_" + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
  function ensure(screen, activeId) {
    if (!screen) return [];
    if (!Array.isArray(screen.layers) || !screen.layers.length) {
      screen.layers = [{ id: createId(), name: "Default", editorVisible: true, locked: false }];
    }
    const ids = new Set();
    for (const layer of screen.layers) {
      if (!layer.id || ids.has(layer.id)) layer.id = createId();
      ids.add(layer.id);
      if (!layer.name) layer.name = "Layer";
    }
    const fallback = ids.has(activeId) ? activeId : screen.layers[0].id;
    for (const obj of screen.objects || []) {
      if (!ids.has(obj.layerId)) obj.layerId = fallback;
    }
    return screen.layers;
  }
  // editorVisible is the editor Show checkbox and never affects runtime
  // painting. hidden is the runtime flag, so a layer sourced as hidden can stay
  // editable without appearing on the running display.
  function shouldDraw(layer, isEditMode, evaluateVisibility) {
    if (!layer) return true;
    if (isEditMode) return layer.editorVisible !== false;
    if (layer.visibility && layer.visibility.enabled !== false && evaluateVisibility) {
      return Boolean(evaluateVisibility(layer));
    }
    return layer.hidden !== true;
  }
  function layerOf(screen, obj) {
    return screen?.layers?.find(layer => layer.id === obj?.layerId);
  }
  function entries(screen) {
    const layers = screen?.layers || [];
    const order = new Map(layers.map((layer, index) => [layer.id, index]));
    return (screen?.objects || []).map((object, index) => ({ object, index }))
      .sort((a, b) => (order.get(a.object.layerId) || 0) - (order.get(b.object.layerId) || 0) || a.index - b.index);
  }
  function rename(screen, id, name) {
    name = String(name || "").trim();
    if (!name) throw new Error("Enter a layer name.");
    if (screen.layers.some(layer => layer.id !== id && layer.name.toLowerCase() === name.toLowerCase())) throw new Error("That layer name is already in use.");
    screen.layers.find(layer => layer.id === id).name = name;
  }
  function reorder(screen, id, delta) {
    const index = screen.layers.findIndex(layer => layer.id === id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= screen.layers.length) return;
    const [layer] = screen.layers.splice(index, 1);
    screen.layers.splice(next, 0, layer);
  }
  function remove(screen, id, destination) {
    if (screen.layers.length <= 1) throw new Error("A screen must have at least one layer.");
    if (destination && (destination === id || !screen.layers.some(layer => layer.id === destination))) throw new Error("Choose another destination layer.");
    screen.objects = (screen.objects || []).filter(obj => {
      if (obj.layerId !== id) return true;
      if (!destination) return false;
      obj.layerId = destination;
      return true;
    });
    screen.layers = screen.layers.filter(layer => layer.id !== id);
  }
  const api = { createId, ensure, entries, rename, reorder, remove, shouldDraw, layerOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HmiLayers = api;
})(globalThis);
