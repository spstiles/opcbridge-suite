const path = require("path");
const crypto = require("crypto");

let parser = null;
const getParser = () => {
  if (parser) return parser;
  let XMLParser = null;
  try {
    ({ XMLParser } = require("fast-xml-parser"));
  } catch (error) {
    if (error?.code === "MODULE_NOT_FOUND") {
      throw new Error("GraphWorX import is unavailable because HMI Node dependencies are incomplete. Run npm ci --omit=dev in the installed HMI directory.");
    }
    throw error;
  }
  parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    preserveOrder: true,
    parseAttributeValue: false,
    trimValues: false
  });
  return parser;
};

const asArray = (value) => value == null ? [] : (Array.isArray(value) ? value : [value]);
const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const cleanName = (value) => String(value || "").replace(/\.gdfx?$/i, "").trim();
const screenRef = (value) => cleanName(path.basename(String(value || "")))
  .toLowerCase().replace(/[^a-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || null;

const normalizeOrderedElement = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  const name = Object.keys(entry).find((key) => key !== ":@" && key !== "#text");
  if (!name) return null;
  const node = { ...(entry[":@"] || {}) };
  const orderedChildren = [];
  let text = "";
  for (const childEntry of asArray(entry[name])) {
    if (childEntry && Object.prototype.hasOwnProperty.call(childEntry, "#text")) {
      text += String(childEntry["#text"] || "");
      continue;
    }
    const normalized = normalizeOrderedElement(childEntry);
    if (!normalized) continue;
    const childName = normalized.name;
    const childNode = normalized.node;
    if (node[childName] == null) node[childName] = childNode;
    else if (Array.isArray(node[childName])) node[childName].push(childNode);
    else node[childName] = [node[childName], childNode];
    orderedChildren.push({ name: childName, node: childNode });
  }
  if (text) node["#text"] = text;
  Object.defineProperty(node, "__orderedChildren", { value: orderedChildren, enumerable: false });
  return { name, node };
};

const color = (value, fallback = "none") => {
  const raw = String(value || "").trim();
  if (!raw || raw === "{x:Null}") return fallback;
  const match = raw.match(/^#([0-9a-f]{8})$/i);
  if (!match) return raw;
  const hex = match[1];
  const alpha = hex.slice(0, 2).toLowerCase();
  const rgb = hex.slice(2).toLowerCase();
  return alpha === "ff" ? `#${rgb}` : `#${rgb}${alpha}`;
};

const pointPair = (value, fallback = [0, 0]) => {
  const parts = String(value || "").split(",").map(Number);
  return parts.length === 2 && parts.every(Number.isFinite) ? parts : fallback;
};

const gradientPaint = (brush, type) => {
  if (!brush || typeof brush !== "object") return null;
  const stopContainer = brush[`${type === "radial" ? "Radial" : "Linear"}GradientBrush.GradientStops`] || {};
  const stops = asArray(stopContainer.GradientStop)
    .map((stop) => ({ color: color(stop?.Color, "#ffffff"), offset: Math.max(0, Math.min(1, num(stop?.Offset))) }))
    .filter((stop) => stop.color);
  if (stops.length < 2) return null;
  if (type === "radial") {
    // OPCBridge's SVG radial paint adapter stores positions outside-in.
    const text = stops.map((stop) => `${stop.color} ${Number(((1 - stop.offset) * 100).toFixed(2))}%`).join(", ");
    return `radial-gradient(circle, ${text})`;
  }
  const [sx, sy] = pointPair(brush.StartPoint, [0, 0.5]);
  const [ex, ey] = pointPair(brush.EndPoint, [1, 0.5]);
  let angle = (Math.atan2(ey - sy, ex - sx) * 180 / Math.PI) + 90;
  const rotate = brush["LinearGradientBrush.RelativeTransform"]?.RotateTransform;
  angle += num(rotate?.Angle);
  angle = ((angle % 360) + 360) % 360;
  const text = stops.map((stop) => `${stop.color} ${Number((stop.offset * 100).toFixed(2))}%`).join(", ");
  return `linear-gradient(${Number(angle.toFixed(2))}deg, ${text})`;
};

const nestedPaint = (node, propertyName, directValue, fallback = "none") => {
  if (String(directValue || "").trim()) return color(directValue, fallback);
  const property = node?.[propertyName];
  if (!property || typeof property !== "object") return fallback;
  const linear = asArray(property.LinearGradientBrush)[0];
  const radial = asArray(property.RadialGradientBrush)[0];
  const solid = asArray(property.SolidColorBrush)[0];
  return gradientPaint(linear, "linear")
    || gradientPaint(radial, "radial")
    || color(solid?.Color, fallback);
};

const renderMatrixFrom = (node) => {
  const matrix = String(node?.RenderTransform || "").split(",").map(Number);
  return matrix.length === 6 && matrix.every(Number.isFinite) ? matrix : null;
};

const directRotateTransformFrom = (node) => {
  const renderTransform = node?.["UIElement.RenderTransform"] || node?.["FrameworkElement.LayoutTransform"];
  if (!renderTransform || typeof renderTransform !== "object") return null;
  return asArray(renderTransform.RotateTransform)[0] || null;
};

const rotationFrom = (node) => {
  const explicit = directRotateTransformFrom(node);
  if (explicit?.Angle != null) return num(explicit.Angle);
  const matrix = renderMatrixFrom(node);
  if (matrix) {
    const angle = Math.atan2(matrix[1], matrix[0]) * 180 / Math.PI;
    return Math.abs(angle) > 0.001 ? angle : 0;
  }
  return 0;
};

const transformPoints = (points, node, base) => {
  const matrix = renderMatrixFrom(node);
  if (!matrix) {
    return points.map(([x, y]) => ({ x: x + base.x, y: y + base.y }));
  }
  const [a, b, c, d, e, f] = matrix;
  return points.map(([x, y]) => ({
    x: (a * x) + (c * y) + e + base.x,
    y: (b * x) + (d * y) + f + base.y
  }));
};

const transformedFrame = (node, base) => {
  const matrix = renderMatrixFrom(node);
  if (!matrix) return { ...base, rotation: rotationFrom(node) };
  const [a, b, c, d, e, f] = matrix;
  const centerX = base.x + (a * base.w / 2) + (c * base.h / 2) + e;
  const centerY = base.y + (b * base.w / 2) + (d * base.h / 2) + f;
  const w = base.w * Math.hypot(a, b);
  const h = base.h * Math.hypot(c, d);
  return {
    x: centerX - (w / 2), y: centerY - (h / 2), w, h,
    rotation: rotationFrom(node)
  };
};

const sampleGraphWorxPathFigures = (figures, curveSteps = 12) => {
  const tokens = String(figures || "").match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[Ee][-+]?\d+)?/g) || [];
  const paths = [];
  let points = [];
  let index = 0;
  let command = "";
  let current = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };
  const isCommand = (value) => /^[A-Za-z]$/.test(value || "");
  const take = () => Number(tokens[index++]);
  const push = (point) => {
    current = point;
    points.push([point.x, point.y]);
  };
  const finish = () => {
    if (points.length > 1) paths.push(points);
    points = [];
  };
  while (index < tokens.length) {
    if (isCommand(tokens[index])) command = tokens[index++];
    if (!command) break;
    const relative = command === command.toLowerCase();
    const upper = command.toUpperCase();
    const point = () => {
      const x = take();
      const y = take();
      return relative ? { x: current.x + x, y: current.y + y } : { x, y };
    };
    if (upper === "M") {
      finish();
      push(point());
      start = { ...current };
      command = relative ? "l" : "L";
    } else if (upper === "L") {
      push(point());
    } else if (upper === "H") {
      const x = take();
      push({ x: relative ? current.x + x : x, y: current.y });
    } else if (upper === "V") {
      const y = take();
      push({ x: current.x, y: relative ? current.y + y : y });
    } else if (upper === "C") {
      const origin = { ...current };
      const c1 = point();
      current = origin;
      const c2 = point();
      current = origin;
      const end = point();
      current = origin;
      for (let step = 1; step <= curveSteps; step += 1) {
        const t = step / curveSteps;
        const mt = 1 - t;
        push({
          x: (mt ** 3) * origin.x + 3 * (mt ** 2) * t * c1.x + 3 * mt * (t ** 2) * c2.x + (t ** 3) * end.x,
          y: (mt ** 3) * origin.y + 3 * (mt ** 2) * t * c1.y + 3 * mt * (t ** 2) * c2.y + (t ** 3) * end.y
        });
      }
    } else if (upper === "A") {
      // Preserve the arc endpoint when importing into the editable spline.
      // Intermediate spline points still produce a curved, selectable path.
      take(); take(); take(); take(); take();
      push(point());
    } else if (upper === "Z") {
      push({ ...start });
      command = "";
    } else {
      break;
    }
    if (index < tokens.length && !isCommand(tokens[index])) continue;
  }
  finish();
  return paths;
};

const childEntries = (node) => {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node.__orderedChildren)) return node.__orderedChildren;
  return Object.entries(node).flatMap(([name, value]) => {
    if (name === "#text" || name.startsWith("xmlns") || typeof value !== "object") return [];
    return asArray(value).map((child) => ({ name, node: child }));
  });
};

const descendants = (node, wanted) => {
  const out = [];
  const visit = (value, name = "") => {
    if (!value || typeof value !== "object") return;
    if (wanted(name)) out.push(value);
    childEntries(value).forEach((entry) => visit(entry.node, entry.name));
  };
  visit(node);
  return out;
};

const embeddedBitmapSource = (node) => {
  const stream = descendants(node, (name) => name === "iwm:Base64Stream")
    .find((candidate) => typeof candidate?.Data === "string" && candidate.Data.trim());
  if (!stream) return null;
  const data = stream.Data.replace(/\s+/g, "");
  const format = data.startsWith("iVBOR") ? { mime: "image/png", ext: ".png" }
    : data.startsWith("/9j/") ? { mime: "image/jpeg", ext: ".jpg" }
      : data.startsWith("R0lGOD") ? { mime: "image/gif", ext: ".gif" }
        : data.startsWith("Qk") ? { mime: "image/bmp", ext: ".bmp" }
          : null;
  if (!format) return null;
  const bytes = Buffer.from(data, "base64");
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  return {
    ...format, data, bytes,
    filename: `graphworx-${digest.slice(0, 24)}${format.ext}`
  };
};

const dataSources = (node) => {
  const found = [];
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (typeof value.DataSource === "string" && value.DataSource.trim()) found.push(value.DataSource.trim());
    childEntries(value).forEach((entry) => visit(entry.node));
  };
  visit(node);
  return [...new Set(found)];
};

const namedDataSources = (node) => {
  const found = [];
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    childEntries(value).forEach((entry) => {
      if (typeof entry.node?.DataSource === "string" && entry.node.DataSource.trim()) {
        found.push({ name: entry.name, value: entry.node.DataSource.trim(), node: entry.node });
      }
      visit(entry.node);
    });
  };
  visit(node);
  return found;
};

const sourceMetadata = (sourceType, node, extra = {}) => {
  const colors = descendants(node, (name) => name === "gwx:GwxColor").map((item) => ({
    kind: "color",
    target: String(item.TargetPropertyName || ""),
    endColor: color(item.EndBrush, "none"),
    sourceExpression: String(item.DataSource || ""),
    animationMode: String(item.AnimationMode || ""),
    comparison: String(item.DataComparison || ""),
    periodicToggleRate: num(item.PeriodicToggleRate, 0)
  }));
  const hides = descendants(node, (name) => name === "gwx:GwxHide").map((item) => ({
    kind: "visibility",
    sourceExpression: String(item.DataSource || ""),
    comparison: String(item.DataComparison || ""),
    periodicToggleRate: num(item.PeriodicToggleRate, 0),
    dynamicStateWhenToggleOff: String(item.DynamicStateWhenToggleOff || "").toLowerCase() === "true"
  }));
  const sizes = descendants(node, (name) => name === "gwx:GwxSize").map((item) => {
    const vertical = String(item.SizeVertical || "").toLowerCase() === "true";
    const horizontal = String(item.SizeHorizontal || "").toLowerCase() === "true";
    const analog = String(item.AnimationMode || "").toLowerCase() === "analog";
    let direction = "up";
    if (horizontal) direction = num(item.HorizontalAnchor, 0) >= 0.5 ? "left" : "right";
    else if (vertical) direction = num(item.VerticalAnchor, 0) >= 0.5 ? "up" : "down";
    return {
      kind: "size",
      sourceExpression: String(item.DataSource || ""),
      lowLimit: num(item.LowLimitSource, 0),
      highLimit: num(item.HighLimitSource, 100),
      direction,
      levelCompatible: analog && (vertical || horizontal)
    };
  });
  const rotations = descendants(node, (name) => name === "gwx:GwxRotation").map((item) => ({ kind: "rotation", sourceExpression: String(item.DataSource || "") }));
  const processPoints = descendants(node, (name) => name === "gwx:GwxProcessPoint").map((item) => ({
    kind: "states",
    sourceExpression: String(item.DataSource || ""),
    animationMode: String(item.AnimationMode || ""),
    isAnalog: String(item.AnimationMode || "").toLowerCase() === "analog",
    maximumIntegerDigits: item.MaximumIntegerDigits == null ? null : num(item.MaximumIntegerDigits),
    decimalPlaces: item.DecimalPlaces == null ? null : num(item.DecimalPlaces),
    prefixLabel: String(item.PrefixLabel || ""),
    postfixLabel: String(item.PostfixLabel || ""),
    states: descendants(item, (name) => name === "gwx:GwxProcessPointStateItem").map((state) => ({
      text: String(state.StateText || ""),
      match: String(state.LowLimitSource ?? ""),
      comparison: String(state.DataComparison || ""),
      target: String(state.TargetPropertyName || "")
    }))
  })).filter((item) => item.sourceExpression);
  const dynamics = [...colors, ...hides, ...sizes, ...rotations, ...processPoints].filter((item) => item.sourceExpression);
  const automationTypes = {
    "gwx:GwxColor": { automation: "color", supported: true },
    "gwx:GwxHide": { automation: "visibility", supported: true },
    "gwx:GwxRotation": { automation: "rotation", supported: true },
    "gwx:GwxSize": { automation: "size", supported: false },
    "gwx:GwxProcessPoint": { automation: "process point", supported: false },
    "gwx:GwxPick": { automation: "pick/write", supported: false }
  };
  const named = namedDataSources(node);
  const namedValues = new Set(named.map((item) => item.value));
  const refs = [
    ...named.map((item) => {
      const hasDiscreteStates = item.name === "gwx:GwxProcessPoint"
        && descendants(item.node, (name) => name === "gwx:GwxProcessPointStateItem").length > 0;
      const hasTextValue = item.name === "gwx:GwxProcessPoint" && sourceType === "Label" && !hasDiscreteStates
        && (String(item.node.AnimationMode || "").toLowerCase() === "analog" || /\?+/.test(textFrom(node)));
      const hasTextExpression = hasTextValue && String(item.value || "").trim().startsWith("x=");
      const hasWriteCommand = item.name === "gwx:GwxPick"
        && descendants(item.node, (name) => name === "gwxcmd:WriteValueCommand").length > 0;
      const sizeDynamic = item.name === "gwx:GwxSize"
        ? sizes.find((candidate) => candidate.sourceExpression === item.value)
        : null;
      const info = hasDiscreteStates
        ? { automation: "states", supported: true }
        : (hasTextValue ? { automation: hasTextExpression ? "text expression" : "text", supported: true }
        : (hasWriteCommand ? { automation: "pick/write", supported: true }
        : (sizeDynamic?.levelCompatible ? { automation: "level", supported: true }
        : (automationTypes[item.name] || { automation: item.name.replace(/^.*:/, ""), supported: false }))));
      return { kind: "tag", ...info, source: { format: "graphworx64", value: item.value }, target: null, status: info.supported ? "unresolved" : "unsupported" };
    }),
    ...dataSources(node).filter((value) => !namedValues.has(value)).map((value) => ({ kind: "tag", automation: "data", supported: false, source: { format: "graphworx64", value }, target: null, status: "unsupported" }))
  ];
  return {
    source: { format: "graphworx64", type: sourceType, name: node?.Name || null },
    externalReferences: refs,
    ...(dynamics.length ? { importedDynamics: { colors, hides, sizes, rotations, processPoints } } : {}),
    ...extra
  };
};

const dynamicColorFallback = (node, targetName, current) => {
  const base = String(current || "").trim();
  const transparentHex = /^#[0-9a-f]{6}00$/i.test(base);
  if (base && base !== "none" && base !== "transparent" && !transparentHex) return current;
  const target = String(targetName || "").toLowerCase();
  const match = descendants(node, (name) => name === "gwx:GwxColor")
    .find((item) => String(item.TargetPropertyName || "").toLowerCase() === target && item.EndBrush);
  return match ? color(match.EndBrush, current || "none") : current;
};

const decodeXmlText = (value) => String(value ?? "")
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#([0-9]+);/g, (_, decimal) => String.fromCodePoint(parseInt(decimal, 10)))
  .replace(/\r\n?/g, "\n");

const textFrom = (node) => {
  if (typeof node?.Text === "string") return decodeXmlText(node.Text);
  const blocks = descendants(node, (name) => name === "TextBlock");
  return blocks.map((item) => item.Text).filter((item) => typeof item === "string").map(decodeXmlText).join("\n");
};

const horizontalTextAlignment = (node, fallback = "left") => {
  const value = String(node?.["Block.TextAlignment"] || node?.TextAlignment || node?.HorizontalContentAlignment || fallback).toLowerCase();
  return ["left", "center", "right"].includes(value) ? value : fallback;
};

const verticalTextAlignment = (node, fallback = "top") => {
  const value = String(node?.VerticalContentAlignment || fallback).toLowerCase();
  return value === "center" ? "middle" : (["top", "middle", "bottom"].includes(value) ? value : fallback);
};

const directChild = (node, wanted) => childEntries(node).find((entry) => wanted(entry.name, entry.node));

const boundsOfButton = (node) => {
  // A GraphWorX button commonly contains a border decorator whose own Rectangle
  // starts at 0,0. Recursing into that Rectangle incorrectly expands the button
  // back to the canvas origin. The first direct, sized face is its authored hit box.
  const face = directChild(node, (name, item) =>
    ["Rectangle", "mwt:ClassicBorderDecorator", "Ellipse"].includes(name)
      && num(item.Width) > 0 && num(item.Height) > 0
  );
  const item = face?.node || node;
  return {
    x: num(item["Canvas.Left"], num(node?.["Canvas.Left"])),
    y: num(item["Canvas.Top"], num(node?.["Canvas.Top"])),
    w: num(item.Width, num(node?.Width, 120)),
    h: num(item.Height, num(node?.Height, 40))
  };
};

const navigationFor = (node, viewportNames) => {
  // A containing Canvas must not steal the action from a nested clickable Canvas.
  let command = null;
  let commandName = "";
  let commandPick = null;
  const visit = (value, owningPick = null) => {
    if (!value || typeof value !== "object" || command) return;
    for (const entry of childEntries(value)) {
      const nextPick = entry.name === "gwx:GwxPick" ? entry.node : owningPick;
      if (["gwxcmd:LoadDisplayCommand", "gwxcmd:HistoryBackCommand", "gwxcmd:HistoryForwardCommand", "gwxcmd:WriteValueCommand"].includes(entry.name)) {
        command = entry.node;
        commandName = entry.name;
        commandPick = owningPick;
        return;
      }
      if (entry.name !== "Canvas") visit(entry.node, nextPick);
    }
  };
  visit(node);
  if (commandName === "gwxcmd:HistoryBackCommand" || commandName === "gwxcmd:HistoryForwardCommand") {
    return { type: commandName === "gwxcmd:HistoryBackCommand" ? "history-back" : "history-forward" };
  }
  if (commandName === "gwxcmd:WriteValueCommand") {
    const sourceReference = String(commandPick?.DataSource || "").trim();
    if (!sourceReference) return null;
    const hasDownValue = command?.OnDownValue != null && String(command.OnDownValue) !== "";
    const hasUpValue = command?.OnUpValue != null && String(command.OnUpValue) !== "";
    if (hasDownValue && hasUpValue) {
      return {
        type: "momentary-write",
        connection_id: "",
        tag: sourceReference,
        onValue: String(command.OnDownValue),
        offValue: String(command.OnUpValue),
        sourceReference,
        status: "unresolved"
      };
    }
    return {
      type: "set-write",
      connection_id: "",
      tag: sourceReference,
      onValue: String(hasUpValue ? command.OnUpValue : (hasDownValue ? command.OnDownValue : "1")),
      sourceReference,
      status: "unresolved"
    };
  }
  if (!command?.FileName) return null;
  const sourceScreen = String(command.FileName);
  const targetName = String(command.TargetName || "").trim();
  const embedded = String(command.TargetType || "").toLowerCase() === "embedded";
  const mappedViewport = targetName ? viewportNames.get(targetName) : null;
  return {
    type: embedded ? "load-viewport" : "navigate",
    screenId: null,
    sourceScreen,
    suggestedScreenId: screenRef(sourceScreen),
    status: "unresolved",
    ...(embedded ? { viewportId: mappedViewport || null, sourceTargetName: targetName || null } : {})
  };
};

const convertGraphWorx = (xml, { filename = "Imported.gdfx" } = {}) => {
  if (typeof xml !== "string" || !xml.trim()) throw new Error("The GDFX file is empty.");
  const parsed = getParser().parse(xml.replace(/^\uFEFF/, ""));
  const rootEntry = asArray(parsed).map(normalizeOrderedElement).find((entry) => entry?.name === "Canvas");
  const root = rootEntry?.node;
  if (!root) throw new Error("This file does not contain a GraphWorX Canvas.");

  const objects = [];
  const issues = [];
  const embeddedAssets = [];
  const viewportNames = new Map();
  const supportedContainers = new Set(["Canvas", "mwt:ClassicBorderDecorator", "MultipleTabItem"]);
  let objectTarget = objects;
  let objectSequence = 0;
  const unresolvedBinding = (source) => {
    const raw = String(source || "").trim();
    return raw.startsWith("x=")
      ? { enabled: true, sourceType: "expression", expression: raw.slice(2), status: "unresolved", sourceReference: raw }
      : { enabled: true, sourceType: "tag", connection_id: "", tag: raw, status: "unresolved", sourceReference: raw };
  };
  const applyImportedDynamics = (obj) => {
    const dynamics = obj?.importedDynamics;
    if (!dynamics) return;
    const colorRules = (dynamics.colors || []).map((item) => {
      const binding = unresolvedBinding(item.sourceExpression);
      const target = String(item.target || "").toLowerCase();
      const strokeTarget = obj.type === "line" || obj.type === "pipe" || target.includes("stroke") || target.includes("border");
      const toggleRate = num(item.periodicToggleRate, 0);
      return {
        ...binding,
        sourceTarget: item.target || "",
        mode: String(item.animationMode || "").toLowerCase() === "discrete" ? "threshold" : "",
        threshold: 0,
        flashEnabled: toggleRate > 0,
        flashRate: toggleRate > 0 && toggleRate <= 500 ? "fast" : "slow",
        flashWhen: true,
        fillEnabled: !strokeTarget,
        fillColor: item.endColor,
        strokeEnabled: strokeTarget,
        strokeColor: item.endColor
      };
    });
    if (colorRules.length) {
      obj.colorAutomationRules = colorRules;
      const fillRules = colorRules.filter((rule) => rule.fillEnabled).map((rule) => ({ ...rule, onColor: rule.fillColor }));
      const strokeRules = colorRules.filter((rule) => rule.strokeEnabled).map((rule) => ({ ...rule, onColor: rule.strokeColor }));
      if (fillRules.length) obj.fillAutomation = { rules: fillRules };
      if (strokeRules.length) obj.strokeAutomation = { rules: strokeRules };
    }
    const hiddenRules = (dynamics.hides || []).map((hidden) => {
      const toggleRate = num(hidden.periodicToggleRate, 0);
      return {
        ...unresolvedBinding(hidden.sourceExpression),
        invert: !String(hidden.comparison || "").toLowerCase().includes("equalzero"),
        visible: false,
        flashEnabled: toggleRate > 0,
        flashRate: toggleRate > 0 && toggleRate <= 500 ? "fast" : "slow",
        flashWhen: true,
        sourceDynamicStateWhenToggleOff: hidden.dynamicStateWhenToggleOff
      };
    });
    if (hiddenRules.length) obj.visibility = { enabled: true, defaultVisible: true, rules: hiddenRules, selectedRuleIndex: 0 };
    const rotation = dynamics.rotations?.[0];
    if (rotation) obj.rotationAutomation = unresolvedBinding(rotation.sourceExpression);
    const size = dynamics.sizes?.find((item) => item.levelCompatible);
    if (size) {
      obj.levelAutomation = {
        ...unresolvedBinding(size.sourceExpression),
        inputMin: size.lowLimit,
        inputMax: size.highLimit,
        direction: size.direction,
        invert: false,
        clamp: true,
        fill: obj.fill || "#3a7bd5",
        emptyFill: "none",
        sourceAutomation: "GwxSize"
      };
    } else {
      const unsupportedSize = dynamics.sizes?.[0];
      if (unsupportedSize) obj.sizeAutomation = unresolvedBinding(unsupportedSize.sourceExpression);
    }
    const processPoint = dynamics.processPoints?.[0];
    if (processPoint?.states?.length) {
      obj.multiStateAutomation = {
        ...unresolvedBinding(processPoint.sourceExpression),
        mode: processPoint.states.every((state) => String(state.comparison || "").toLowerCase().includes("equal")) ? "equals" : "threshold",
        states: processPoint.states.map((state, index) => ({
          name: state.text || `State ${index + 1}`,
          match: state.match,
          rotationEnabled: false,
          rotation: 0,
          textEnabled: obj.type === "text" && state.text !== "",
          text: state.text,
          fillEnabled: false,
          fillColor: "",
          backgroundEnabled: false,
          backgroundColor: "",
          borderEnabled: false,
          borderColor: "",
          sourceTarget: state.target || ""
        })),
        selectedStateIndex: 0
      };
    } else if (processPoint && obj.type === "text" && (processPoint.isAnalog || /\?+/.test(String(obj.text || "")))) {
      const sourceReference = String(processPoint.sourceExpression || "").trim();
      const decimals = Math.max(0, num(processPoint.decimalPlaces, 0));
      const integerDigits = Math.max(1, num(processPoint.maximumIntegerDigits, 1));
      const originalText = String(obj.text || "");
      const generatedText = `${processPoint.prefixLabel || ""}{1}${processPoint.postfixLabel ? ` ${processPoint.postfixLabel}` : ""}`;
      obj.text = /\?+(?:\.\?+)?/.test(originalText) ? originalText.replace(/\?+(?:\.\?+)?/, "{1}") : generatedText;
      obj.textBindings = {
        "1": {
          connection_id: "",
          tag: sourceReference,
          digits: integerDigits + decimals,
          decimals,
          padZeros: false,
          multiplier: 1,
          status: "unresolved",
          sourceReference
        }
      };
    }
  };
  const add = (obj) => {
    applyImportedDynamics(obj);
    obj.importId = `gwx_${++objectSequence}`;
    objectTarget.push(obj);
    for (const ref of obj.externalReferences || []) {
      const unsupported = ref.supported === false || ref.status === "unsupported";
      issues.push({ id: `${obj.importId}:${issues.length + 1}`, objectImportId: obj.importId, severity: "warning", category: unsupported ? "unsupported-automation" : ref.kind, automation: ref.automation || null, status: unsupported ? "unsupported" : "unresolved", source: ref.source, message: unsupported ? `Unsupported ${ref.automation || ref.kind} automation preserved: ${ref.source.value}` : `Unresolved ${ref.automation || ref.kind}: ${ref.source.value}` });
    }
    if (obj.action?.status === "unresolved" && obj.action?.sourceScreen) {
      issues.push({ id: `${obj.importId}:${issues.length + 1}`, objectImportId: obj.importId, severity: "warning", category: "screen", status: "unresolved", source: { format: "graphworx64", value: obj.action.sourceScreen }, message: `Screen not mapped: ${obj.action.sourceScreen}` });
    }
    return obj;
  };

  const translateImportedObject = (obj, dx, dy) => {
    if (!obj) return;
    if (obj.type === "line") {
      obj.x1 += dx; obj.y1 += dy; obj.x2 += dx; obj.y2 += dy;
    } else if (["polyline", "pipe", "polygon", "spline"].includes(obj.type)) {
      obj.points = (obj.points || []).map((point) => ({ x: Number(point.x) + dx, y: Number(point.y) + dy }));
    } else if (obj.type === "circle") {
      obj.cx += dx; obj.cy += dy;
    } else {
      if (obj.x != null) obj.x += dx;
      if (obj.y != null) obj.y += dy;
    }
  };

  const importedObjectBounds = (obj) => {
    if (!obj) return null;
    if (obj.type === "text" && obj.autoSize === false) {
      const anchorX = obj.align === "center" ? 0.5 : (obj.align === "right" ? 1 : 0);
      const anchorY = obj.valign === "middle" ? 0.5 : (obj.valign === "bottom" ? 1 : 0);
      return {
        x: Number(obj.x) - Number(obj.w || 0) * anchorX,
        y: Number(obj.y) - Number(obj.h || 0) * anchorY,
        w: Number(obj.w || 0),
        h: Number(obj.h || 0)
      };
    }
    if (obj.type === "line") return { x: Math.min(obj.x1, obj.x2), y: Math.min(obj.y1, obj.y2), w: Math.abs(obj.x2 - obj.x1), h: Math.abs(obj.y2 - obj.y1) };
    if (["polyline", "pipe", "polygon", "spline"].includes(obj.type) && obj.points?.length) {
      const xs = obj.points.map((point) => Number(point.x)); const ys = obj.points.map((point) => Number(point.y));
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    if (obj.type === "circle") return { x: obj.cx - obj.r, y: obj.cy - obj.r, w: obj.r * 2, h: obj.r * 2 };
    if (obj.x != null && obj.y != null) return { x: Number(obj.x), y: Number(obj.y), w: Number(obj.w || 0), h: Number(obj.h || 0) };
    return null;
  };

  const contentBounds = (children) => {
    const bounds = (children || []).map(importedObjectBounds).filter(Boolean);
    if (!bounds.length) return { x: 0, y: 0, w: 0, h: 0 };
    const x = Math.min(...bounds.map((box) => box.x)); const y = Math.min(...bounds.map((box) => box.y));
    const right = Math.max(...bounds.map((box) => box.x + box.w)); const bottom = Math.max(...bounds.map((box) => box.y + box.h));
    return { x, y, w: right - x, h: bottom - y };
  };

  for (const view of descendants(root, (name) => name === "ig:GwxRuntimeViewControl")) {
    const id = String(view.Name || `viewport_${viewportNames.size + 1}`).replace(/[^A-Za-z0-9_-]+/g, "_").toLowerCase();
    viewportNames.set(String(view.Name || ""), id);
  }

  const walk = (name, node) => {
    if (!node || typeof node !== "object") return;
    if (name === "ig:GwxRuntimeViewControl") {
      const id = viewportNames.get(String(node.Name || "")) || `viewport_${viewportNames.size + 1}`;
      const initial = String(node.OriginalSource || "").trim();
      add({ type: "viewport", id, x: num(node["Canvas.Left"]), y: num(node["Canvas.Top"]), w: num(node.Width, 640), h: num(node.Height, 480), target: null, sourceInitialScreen: initial || null, suggestedTarget: screenRef(initial), scaleMode: "fit", border: { enabled: String(node.HasBorder).toLowerCase() === "true", color: "#ffffff", width: 1 }, ...sourceMetadata(name, node) });
      if (initial) issues.push({ id: `${id}:initial`, objectImportId: objects.at(-1).importId, severity: "warning", category: "screen", status: "unresolved", source: { format: "graphworx64", value: initial }, message: `Initial viewport screen not mapped: ${initial}` });
      return;
    }
    if (name === "Canvas") {
      const action = navigationFor(node, viewportNames);
      const entries = childEntries(node);
      const ownedDynamicEntries = entries.filter((entry) => entry.name.startsWith("gwx:GwxDynamicGroup"));
      // Every nested Canvas establishes a coordinate system. Even an unnamed
      // wrapper must be retained when it has visual children, otherwise groups
      // nested beneath it lose the wrapper's offset and bounds.
      const shouldPreserveGroup = true;
      if (shouldPreserveGroup) {
        const children = [];
        const previousTarget = objectTarget;
        objectTarget = children;
        entries.forEach((entry) => walk(entry.name, entry.node));
        objectTarget = previousTarget;
        if (!children.length) return;
        let x = num(node["Canvas.Left"]);
        let y = num(node["Canvas.Top"]);
        let w = num(node.Width);
        let h = num(node.Height);
        const childBounds = contentBounds(children);
        const isUnpositionedWrapper = !w && !h && node["Canvas.Left"] == null && node["Canvas.Top"] == null;
        if (isUnpositionedWrapper) {
          x = childBounds.x; y = childBounds.y;
          children.forEach((child) => translateImportedObject(child, -x, -y));
          w = childBounds.w; h = childBounds.h;
        } else {
          if (!w) w = Math.max(0, childBounds.x + childBounds.w);
          if (!h) h = Math.max(0, childBounds.y + childBounds.h);
        }
        const ownedDynamicsNode = { __orderedChildren: ownedDynamicEntries };
        add({
          type: "group", x, y, w, h, children, ...(action ? { action } : {}),
          ...sourceMetadata(name, ownedDynamicsNode, { source: { format: "graphworx64", type: name, name: node.Name || null }, importConversion: "preserved-group" })
        });
        return;
      }
    }

    const base = { x: num(node["Canvas.Left"]), y: num(node["Canvas.Top"]), w: num(node.Width), h: num(node.Height) };
    if (name === "mwt:ClassicBorderDecorator") {
      const decoration = asArray(node.Rectangle)[0] || {};
      const labels = asArray(node.Label);
      const thickness = String(node.BorderThickness || "").split(",").map(Number).filter(Number.isFinite);
      const decoratorStrokeWidth = thickness.length ? Math.max(...thickness) : num(decoration.StrokeThickness, 1);
      const innerStrokeWidth = decoration.StrokeThickness == null ? 0 : Math.max(0, num(decoration.StrokeThickness));
      if (labels.length === 1 && !asArray(node.Rectangle).length) {
        const label = labels[0];
        const align = horizontalTextAlignment(label);
        const valign = verticalTextAlignment(label);
        const anchorX = align === "center" ? 0.5 : (align === "right" ? 1 : 0);
        const anchorY = valign === "middle" ? 0.5 : (valign === "bottom" ? 1 : 0);
        add({
          type: "text", ...base,
          x: base.x + base.w * anchorX, y: base.y + base.h * anchorY,
          autoSize: false, positionMode: "insertion-point",
          text: textFrom(label), padding: Math.max(0, decoratorStrokeWidth), wrapMode: "word",
          fontSize: num(label.FontSize, 14),
          fill: dynamicColorFallback(label, "Foreground", color(label.Foreground, "#000000")),
          background: nestedPaint(label, "Label.Background", label.Background, "transparent"),
          bold: String(label.FontWeight).toLowerCase() === "bold", align, valign,
          borderEnabled: decoratorStrokeWidth > 0, borderColor: color(decoration.Stroke, "#000000"),
          borderWidth: decoratorStrokeWidth,
          borderStyle: String(node.BorderStyle || "").toLowerCase().includes("sunken") ? "inset" : "outset",
          ...sourceMetadata(name, node, { sourceBorderThickness: thickness.length ? thickness : null, importConversion: "collapsed-label-decorator" })
        });
        return;
      }
      add({
        type: "rect",
        ...base,
        rx: num(decoration.RadiusX),
        fill: nestedPaint(decoration, "Rectangle.Fill", decoration.Fill, "none"),
        stroke: color(decoration.Stroke, "#000000"),
        strokeWidth: decoratorStrokeWidth,
        borderStyle: String(node.BorderStyle || "").toLowerCase().includes("sunken") ? "inset" : "outset",
        ...(innerStrokeWidth > 0 ? { innerBorder: { enabled: true, color: color(decoration.Stroke, "#000000"), width: innerStrokeWidth } } : {}),
        ...sourceMetadata(name, node, { sourceBorderThickness: thickness.length ? thickness : null })
      });
      return;
    }
    if (name === "Image") {
      const asset = embeddedBitmapSource(node);
      if (asset) {
        if (!embeddedAssets.some((existing) => existing.filename === asset.filename)) embeddedAssets.push(asset);
        add({
          type: "image", ...transformedFrame(node, base), src: asset.filename,
          fit: String(node.Stretch || "Uniform").toLowerCase() === "fill" ? "fill" : "contain",
          ...sourceMetadata(name, node, { importConversion: "extracted-embedded-image" })
        });
      } else {
        issues.push({
          id: `image:${issues.length + 1}`, objectImportId: null, severity: "warning",
          category: "image", status: "unresolved",
          source: { format: "graphworx64", value: String(node.Source || "Image source") },
          message: "GraphWorX image source could not be resolved."
        });
      }
      return;
    }
    if (name === "Rectangle") add({ type: "rect", ...transformedFrame(node, base), rx: num(node.RadiusX), fill: dynamicColorFallback(node, "Fill", nestedPaint(node, "Rectangle.Fill", node.Fill, "none")), stroke: color(node.Stroke, "none"), strokeWidth: num(node.StrokeThickness, 1), ...sourceMetadata(name, node) });
    else if (name === "Ellipse") add({ type: "ellipse", ...transformedFrame(node, base), fill: dynamicColorFallback(node, "Fill", nestedPaint(node, "Ellipse.Fill", node.Fill, "none")), stroke: color(node.Stroke, "none"), strokeWidth: num(node.StrokeThickness, 1), ...sourceMetadata(name, node) });
    else if (name === "Line") {
      const [start, end] = transformPoints([[num(node.X1), num(node.Y1)], [num(node.X2), num(node.Y2)]], node, base);
      add({ type: "line", x1: start.x, y1: start.y, x2: end.x, y2: end.y, stroke: color(node.Stroke, "#000000"), strokeWidth: num(node.StrokeThickness, 1), ...sourceMetadata(name, node) });
    }
    else if (name === "Path") {
      const geometry = asArray(node?.["Path.Data"]?.PathGeometry)[0];
      const figures = String(geometry?.Figures || node.Data || "").trim();
      sampleGraphWorxPathFigures(figures).forEach((rawPoints) => {
        const points = transformPoints(rawPoints, node, base);
        add({
          type: "spline", points,
          stroke: color(node.Stroke, "#000000"),
          strokeWidth: num(node.StrokeThickness, 1),
          ...sourceMetadata(name, node, { importConversion: "editable-spline" })
        });
      });
    }
    else if (name === "Polygon" || name === "Polyline") {
      const rawPoints = String(node.Points || "").trim().split(/\s+/).map((pair) => pair.split(",").map(Number)).filter((pair) => pair.length === 2 && pair.every(Number.isFinite));
      const points = transformPoints(rawPoints, node, base);
      if (points.length) add({ type: name.toLowerCase(), points, fill: dynamicColorFallback(node, "Fill", nestedPaint(node, `${name}.Fill`, node.Fill, "none")), stroke: color(node.Stroke, "#000000"), strokeWidth: num(node.StrokeThickness, 1), ...sourceMetadata(name, node) });
    } else if (name === "Label") {
      const align = horizontalTextAlignment(node);
      const valign = verticalTextAlignment(node);
      const text = textFrom(node);
      const padding = num(String(node.Padding || "0").split(",")[0], 0);
      const background = color(node.Background, "transparent");
      const borderColor = color(node.BorderBrush, "transparent");
      const borderWidth = Math.max(0, num(String(node.BorderThickness || "0").split(",")[0], 0));
      const borderEnabled = borderWidth > 0 && !["none", "transparent", "#ffffff00"].includes(String(borderColor).toLowerCase());
      const anchorX = align === "center" ? 0.5 : (align === "right" ? 1 : 0);
      const anchorY = valign === "middle" ? 0.5 : (valign === "bottom" ? 1 : 0);
      add({ type: "text", ...base, x: base.x + base.w * anchorX, y: base.y + base.h * anchorY, autoSize: !(base.w > 0 && base.h > 0), positionMode: "insertion-point", text, padding, wrapMode: text.includes("\n") ? "explicit" : "word", fontSize: num(node.FontSize, 14), fill: dynamicColorFallback(node, "Foreground", color(node.Foreground, "#000000")), background, borderEnabled, borderColor, borderWidth, borderStyle: "flat", bold: String(node.FontWeight).toLowerCase() === "bold", align, valign, ...sourceMetadata(name, node) });
    }
    else if (name === "gwxctl:GwxPipeControl") {
      const rawPoints = String(node.Vertices || "").trim().split(/\s+/).map((pair) => pair.split(",").map(Number)).filter((pair) => pair.length === 2 && pair.every(Number.isFinite));
      const points = transformPoints(rawPoints, node, base);
      const normalizeCap = (value) => ({ none: "none", open: "none", flat: "flat", squared: "square", square: "square", rounded: "round", round: "round", triangular: "triangle", triangle: "triangle", flange: "flange" })[String(value || "flat").toLowerCase()] || "flat";
      const normalizeJoint = (value) => ({ rounded: "round", round: "round", mitered: "miter", miter: "miter", beveled: "bevel", bevel: "bevel" })[String(value || "round").toLowerCase()] || "round";
      const sharedCap = normalizeCap(node.CapType);
      const startCap = normalizeCap(node.StartCap || sharedCap);
      const endCap = normalizeCap(node.EndCap || sharedCap);
      const capWidth = (cap) => cap === "flange" ? 200 : 100;
      const capLength = (cap) => ({ round: 50, triangle: 86.6, square: 50, flange: 50 })[cap] || 50;
      if (points.length) add({
        type: "pipe", points,
        color: dynamicColorFallback(node, "Foreground", color(node.PipeColor || node.Foreground, "#d3d3d3")),
        thickness: num(node.PipeThickness, 10), outlineThickness: 1, jointType: normalizeJoint(node.JointType), curveRadius: num(node.CurveRadius, 15),
        startCap, endCap,
        startCapWidth: capWidth(startCap), startCapLength: capLength(startCap),
        endCapWidth: capWidth(endCap), endCapLength: capLength(endCap),
        gradientSmooth: String(node.GradientSmooth || "medium").toLowerCase().replace(/\s+/g, "-"),
        autoScale: String(node.AutoScale ?? "true").toLowerCase() !== "false",
        ...sourceMetadata(name, node)
      });
    } else if (name === "ia:AwxViewControl") {
      add({ type: "alarms-panel", ...base, panelMode: "alarms", ...sourceMetadata(name, node, { importConversion: "approximated" }) });
      return;
    }

    if (supportedContainers.has(name) || !["Image", "Rectangle", "Ellipse", "Line", "Path", "Polygon", "Polyline", "Label", "gwxctl:GwxPipeControl"].includes(name)) {
      childEntries(node).forEach((entry) => walk(entry.name, entry.node));
    }
  };

  childEntries(root).forEach((entry) => walk(entry.name, entry.node));
  const unresolved = issues.filter((issue) => issue.status === "unresolved").length;
  return {
    screen: {
      width: num(root.Width, 1920), height: num(root.Height, 1080), background: color(root.Background, "#000000"), objects,
      importInfo: { format: "graphworx64", sourceFile: path.basename(filename), importedAt: new Date().toISOString(), converterVersion: 2, zOrderPreserved: true },
      referenceHealth: { issues }
    },
    summary: { imported: true, objects: objects.length, imagesExtracted: embeddedAssets.length, unresolved, notices: issues.length - unresolved, issues: issues.length },
    embeddedAssets
  };
};

module.exports = { convertGraphWorx };
