import { getGraphBounds, pointsToPath } from "./geometry";
import type { DielineGraph, DielineLayer, GeometryPrimitive, Point } from "./types";

const DEFAULT_STROKE_BY_LAYER: Record<DielineLayer, string> = {
  cut: "#c53f2f",
  crease: "#1677ff",
  perf: "#6b7280",
  window: "#2f8a53",
  hole: "#2f8a53",
  bleed: "#2f8a53",
  safe: "#7c8790",
  label: "#1f2a24",
};

const DXF_LAYER_BY_LAYER: Record<DielineLayer, string> = {
  cut: "CUT",
  crease: "CREASE",
  perf: "PERF",
  window: "WINDOW",
  hole: "HOLE",
  bleed: "BLEED",
  safe: "SAFE",
  label: "LABEL",
};

export function primitiveToSvgPath(primitive: GeometryPrimitive): string {
  switch (primitive.type) {
    case "line":
      return pointsToPath([primitive.start, primitive.end], false);
    case "polyline":
      return pointsToPath(primitive.points, false);
    case "polygon":
      return pointsToPath(primitive.points);
    case "arc":
      return arcToPath(primitive.center, primitive.radius, primitive.startAngle, primitive.endAngle);
    case "circle":
      return circleToPath(primitive.center, primitive.radius);
    case "ellipse":
      return ellipseToPath(primitive.center, primitive.radiusX, primitive.radiusY);
    case "rounded-rect":
    case "slot":
      return roundedRectToPath(primitive.x, primitive.y, primitive.width, primitive.height, primitive.radius);
    case "label":
      return "";
  }
}

export function graphToSvg(graph: DielineGraph): string {
  const bounds = getGraphBounds({ faces: graph.faces });
  const width = Math.max(1, graph.size.width || bounds.width);
  const height = Math.max(1, graph.size.height || bounds.height);
  const primitives = graph.geometry?.length ? graph.geometry : fallbackPrimitivesFromGraph(graph);
  const body = primitives.map((primitive) => primitiveToSvgElement(primitive)).join("\n  ");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${format(width)}mm" height="${format(height)}mm" viewBox="0 0 ${format(width)} ${format(height)}">`,
    `  <title>${escapeXml(graph.metadata?.familyLabel ?? "Dieline")}</title>`,
    `  <g id="dieline" fill="none" stroke-linecap="round" stroke-linejoin="round">`,
    `  ${body}`,
    `  </g>`,
    `</svg>`,
  ].join("\n");
}

export function graphToDxf(graph: DielineGraph): string {
  const primitives = graph.geometry?.length ? graph.geometry : fallbackPrimitivesFromGraph(graph);
  const entities = primitives.flatMap((primitive) => primitiveToDxfEntities(primitive));

  return [
    "0",
    "SECTION",
    "2",
    "ENTITIES",
    ...entities,
    "0",
    "ENDSEC",
    "0",
    "EOF",
    "",
  ].join("\n");
}

export function graphToPdf(graph: DielineGraph): string {
  const primitives = graph.geometry?.length ? graph.geometry : fallbackPrimitivesFromGraph(graph);
  const bounds = getGraphBounds({ faces: graph.faces });
  const widthMm = Math.max(1, graph.size.width || bounds.width);
  const heightMm = Math.max(1, graph.size.height || bounds.height);
  const width = mmToPt(widthMm);
  const height = mmToPt(heightMm);
  const commands = primitives.flatMap((primitive) => primitiveToPdfCommands(primitive, heightMm)).join("\n");
  const stream = `0.75 w\n${commands}\n`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${format(width)} ${format(height)}] /Contents 4 0 R >> endobj`,
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}endstream endobj`,
  ];
  let offset = "%PDF-1.4\n".length;
  const xrefOffsets = ["0000000000 65535 f "];
  const serializedObjects = objects.map((object) => {
    const current = `${object}\n`;
    xrefOffsets.push(`${String(offset).padStart(10, "0")} 00000 n `);
    offset += current.length;
    return current;
  }).join("");
  const xrefOffset = offset;

  return `%PDF-1.4\n${serializedObjects}xref\n0 ${xrefOffsets.length}\n${xrefOffsets.join("\n")}\ntrailer << /Root 1 0 R /Size ${xrefOffsets.length} >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
}

export function fallbackPrimitivesFromGraph(graph: DielineGraph): GeometryPrimitive[] {
  const cutPrimitives = graph.cutPaths.flatMap((path, index): GeometryPrimitive[] => {
    const points = path.points ?? [];
    return points.length >= 2
      ? [{
          id: path.id || `cut-${index + 1}`,
          layer: "cut",
          type: "polyline",
          points,
        }]
      : [];
  });

  return [
    ...cutPrimitives,
    ...graph.creases.map((crease): GeometryPrimitive => ({
      id: crease.id,
      layer: "crease",
      type: "line",
      start: crease.edgeStart,
      end: crease.edgeEnd,
    })),
  ];
}

export function primitiveToPoints(primitive: GeometryPrimitive, segments = 32): Point[] {
  switch (primitive.type) {
    case "line":
      return [primitive.start, primitive.end];
    case "polyline":
    case "polygon":
      return primitive.points;
    case "arc":
      return sampleArc(primitive.center, primitive.radius, primitive.startAngle, primitive.endAngle, segments);
    case "circle":
      return sampleArc(primitive.center, primitive.radius, 0, Math.PI * 2, segments);
    case "ellipse":
      return Array.from({ length: segments }, (_, index) => {
        const angle = (index / segments) * Math.PI * 2;
        return {
          x: primitive.center.x + Math.cos(angle) * primitive.radiusX,
          y: primitive.center.y + Math.sin(angle) * primitive.radiusY,
        };
      });
    case "rounded-rect":
    case "slot":
      return roundedRectPoints(primitive.x, primitive.y, primitive.width, primitive.height, primitive.radius, Math.max(4, Math.floor(segments / 4)));
    case "label":
      return [primitive.position];
  }
}

function primitiveToSvgElement(primitive: GeometryPrimitive): string {
  if (primitive.type === "label") {
    return `<text id="${escapeXml(primitive.id)}" data-layer="${primitive.layer}" x="${format(primitive.position.x)}" y="${format(primitive.position.y)}" fill="${DEFAULT_STROKE_BY_LAYER.label}" font-size="4">${escapeXml(primitive.text)}</text>`;
  }

  const dash = primitive.layer === "crease" || primitive.layer === "perf" ? ` stroke-dasharray="5 3"` : "";
  return `<path id="${escapeXml(primitive.id)}" data-layer="${primitive.layer}" d="${primitiveToSvgPath(primitive)}" stroke="${DEFAULT_STROKE_BY_LAYER[primitive.layer]}" stroke-width="0.35"${dash}/>`;
}

function primitiveToDxfEntities(primitive: GeometryPrimitive): string[] {
  const layer = DXF_LAYER_BY_LAYER[primitive.layer];

  if (primitive.type === "line") {
    return dxfLine(layer, primitive.start, primitive.end);
  }

  if (primitive.type === "circle") {
    return ["0", "CIRCLE", "8", layer, "10", format(primitive.center.x), "20", format(primitive.center.y), "30", "0", "40", format(primitive.radius)];
  }

  if (primitive.type === "arc") {
    return [
      "0", "ARC", "8", layer,
      "10", format(primitive.center.x),
      "20", format(primitive.center.y),
      "30", "0",
      "40", format(primitive.radius),
      "50", format(radToDeg(primitive.startAngle)),
      "51", format(radToDeg(primitive.endAngle)),
    ];
  }

  if (primitive.type === "label") {
    return ["0", "TEXT", "8", layer, "10", format(primitive.position.x), "20", format(primitive.position.y), "30", "0", "40", "4", "1", primitive.text];
  }

  const points = primitiveToPoints(primitive, 48);
  const close = primitive.type === "polygon" || primitive.type === "rounded-rect" || primitive.type === "slot" || primitive.type === "ellipse";
  return dxfPolyline(layer, points, close);
}

function primitiveToPdfCommands(primitive: GeometryPrimitive, pageHeightMm: number): string[] {
  if (primitive.type === "label") {
    return [];
  }

  const color = primitive.layer === "crease" ? "0.09 0.47 1 RG" : primitive.layer === "cut" ? "0.77 0.25 0.18 RG" : "0.18 0.54 0.33 RG";
  const points = primitiveToPoints(primitive, 48);
  if (points.length < 2) return [];

  const [first, ...rest] = points;
  const commands = [color, `${format(mmToPt(first.x))} ${format(mmToPt(pageHeightMm - first.y))} m`];

  for (const point of rest) {
    commands.push(`${format(mmToPt(point.x))} ${format(mmToPt(pageHeightMm - point.y))} l`);
  }

  if (primitive.type === "polygon" || primitive.type === "rounded-rect" || primitive.type === "slot" || primitive.type === "circle" || primitive.type === "ellipse") {
    commands.push("h");
  }

  commands.push("S");
  return commands;
}

function dxfLine(layer: string, start: Point, end: Point): string[] {
  return ["0", "LINE", "8", layer, "10", format(start.x), "20", format(start.y), "30", "0", "11", format(end.x), "21", format(end.y), "31", "0"];
}

function dxfPolyline(layer: string, points: Point[], close: boolean): string[] {
  return [
    "0",
    "LWPOLYLINE",
    "8",
    layer,
    "90",
    String(points.length),
    "70",
    close ? "1" : "0",
    ...points.flatMap((point) => ["10", format(point.x), "20", format(point.y)]),
  ];
}

function arcToPath(center: Point, radius: number, startAngle: number, endAngle: number): string {
  const start = polar(center, radius, startAngle);
  const end = polar(center, radius, endAngle);
  const delta = Math.abs(endAngle - startAngle);
  const largeArc = delta > Math.PI ? 1 : 0;
  const sweep = endAngle >= startAngle ? 1 : 0;
  return `M ${format(start.x)} ${format(start.y)} A ${format(radius)} ${format(radius)} 0 ${largeArc} ${sweep} ${format(end.x)} ${format(end.y)}`;
}

function circleToPath(center: Point, radius: number): string {
  return [
    `M ${format(center.x + radius)} ${format(center.y)}`,
    `A ${format(radius)} ${format(radius)} 0 1 0 ${format(center.x - radius)} ${format(center.y)}`,
    `A ${format(radius)} ${format(radius)} 0 1 0 ${format(center.x + radius)} ${format(center.y)}`,
    "Z",
  ].join(" ");
}

function ellipseToPath(center: Point, radiusX: number, radiusY: number): string {
  return [
    `M ${format(center.x + radiusX)} ${format(center.y)}`,
    `A ${format(radiusX)} ${format(radiusY)} 0 1 0 ${format(center.x - radiusX)} ${format(center.y)}`,
    `A ${format(radiusX)} ${format(radiusY)} 0 1 0 ${format(center.x + radiusX)} ${format(center.y)}`,
    "Z",
  ].join(" ");
}

function roundedRectToPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height / 2);
  return [
    `M ${format(x + r)} ${format(y)}`,
    `L ${format(x + width - r)} ${format(y)}`,
    `A ${format(r)} ${format(r)} 0 0 1 ${format(x + width)} ${format(y + r)}`,
    `L ${format(x + width)} ${format(y + height - r)}`,
    `A ${format(r)} ${format(r)} 0 0 1 ${format(x + width - r)} ${format(y + height)}`,
    `L ${format(x + r)} ${format(y + height)}`,
    `A ${format(r)} ${format(r)} 0 0 1 ${format(x)} ${format(y + height - r)}`,
    `L ${format(x)} ${format(y + r)}`,
    `A ${format(r)} ${format(r)} 0 0 1 ${format(x + r)} ${format(y)}`,
    "Z",
  ].join(" ");
}

function roundedRectPoints(x: number, y: number, width: number, height: number, radius: number, segments: number): Point[] {
  const r = Math.min(radius, width / 2, height / 2);
  return [
    ...sampleArc({ x: x + width - r, y: y + r }, r, -Math.PI / 2, 0, segments),
    ...sampleArc({ x: x + width - r, y: y + height - r }, r, 0, Math.PI / 2, segments),
    ...sampleArc({ x: x + r, y: y + height - r }, r, Math.PI / 2, Math.PI, segments),
    ...sampleArc({ x: x + r, y: y + r }, r, Math.PI, Math.PI * 1.5, segments),
  ];
}

function sampleArc(center: Point, radius: number, startAngle: number, endAngle: number, segments: number): Point[] {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = startAngle + ((endAngle - startAngle) * index) / segments;
    return polar(center, radius, angle);
  });
}

function polar(center: Point, radius: number, angle: number): Point {
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function mmToPt(value: number): number {
  return value * 2.8346456693;
}

function radToDeg(value: number): number {
  return (value * 180) / Math.PI;
}

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
