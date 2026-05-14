import type { V2GeometryPrimitive, V2PartDebugGraph, V2Point } from "../contracts/types";
import { formatPoint, midpoint, round } from "../primitives/points";

export function generatePartDebugSvg(graph: V2PartDebugGraph): string {
  const bounds = graphBounds(graph);
  const padding = 32;
  const width = bounds.width + padding * 2;
  const height = bounds.height + padding * 2;
  const dx = padding - bounds.x;
  const dy = padding - bounds.y;
  const body: string[] = [];

  body.push(`<rect x="0" y="0" width="${round(width)}" height="${round(height)}" fill="#fbfaf7"/>`);
  body.push(`<g transform="translate(${round(dx)} ${round(dy)})">`);
  body.push(`<g id="faces" fill="rgba(255,255,255,0.78)" stroke="#222" stroke-width="0.35">`);
  for (const face of graph.faces) {
    body.push(`<polygon points="${face.points.map(formatPoint).join(" ")}"/>`);
  }
  body.push(`</g>`);

  body.push(`<g id="creases" stroke="#2667aa" stroke-width="0.55" stroke-dasharray="2 1">`);
  for (const crease of graph.structuralCreases) {
    body.push(`<line x1="${round(crease.start.x)}" y1="${round(crease.start.y)}" x2="${round(crease.end.x)}" y2="${round(crease.end.y)}"/>`);
  }
  body.push(`</g>`);

  body.push(`<g id="geometry-primitives" fill="none" stroke-width="0.5">`);
  for (const primitive of graph.geometryPrimitives) {
    body.push(primitiveSvg(primitive));
  }
  body.push(`</g>`);

  body.push(`<g id="anchors" stroke="#138a4f" fill="#138a4f" stroke-width="0.35">`);
  for (const anchor of graph.anchors) {
    body.push(`<line x1="${round(anchor.start.x)}" y1="${round(anchor.start.y)}" x2="${round(anchor.end.x)}" y2="${round(anchor.end.y)}"/>`);
    body.push(`<circle cx="${round(anchor.start.x)}" cy="${round(anchor.start.y)}" r="1.1"/>`);
    body.push(`<circle cx="${round(anchor.end.x)}" cy="${round(anchor.end.y)}" r="1.1"/>`);
  }
  body.push(`</g>`);

  body.push(`<g id="labels" fill="#111" style="font-family:Arial,sans-serif;font-size:4px;paint-order:stroke;stroke:#fff;stroke-width:1.2px;">`);
  for (const face of graph.faces) {
    body.push(`<text x="${round(face.centroid.x)}" y="${round(face.centroid.y)}" text-anchor="middle">${escapeXml(face.id)}</text>`);
  }
  for (const primitive of graph.geometryPrimitives) {
    const center = primitiveCenter(primitive);
    if (center) body.push(`<text x="${round(center.x)}" y="${round(center.y - 2)}" text-anchor="middle">${escapeXml(primitive.id)}</text>`);
  }
  for (const crease of graph.structuralCreases) {
    const center = midpoint(crease.start, crease.end);
    body.push(`<text x="${round(center.x)}" y="${round(center.y - 2)}" text-anchor="middle">${escapeXml(crease.id)}</text>`);
  }
  body.push(`</g>`);
  body.push(`</g>`);

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(width)}mm" height="${round(height)}mm" viewBox="0 0 ${round(width)} ${round(height)}">`,
    `<title>${escapeXml(graph.label)}</title>`,
    ...body,
    `</svg>`,
  ].join("\n");
}

function primitiveSvg(primitive: V2GeometryPrimitive): string {
  const stroke = primitive.layer === "score"
    ? "#d88400"
    : primitive.layer === "glue"
      ? "#8a5a00"
      : primitive.layer === "window"
        ? "#0f8f57"
        : primitive.layer === "safe-area" || primitive.layer === "bleed"
          ? "#8b5cf6"
          : "#d12f2f";

  if (primitive.type === "line") {
    return `<line x1="${round(primitive.start.x)}" y1="${round(primitive.start.y)}" x2="${round(primitive.end.x)}" y2="${round(primitive.end.y)}" stroke="${stroke}"/>`;
  }
  if (primitive.type === "circle") {
    return `<circle cx="${round(primitive.center.x)}" cy="${round(primitive.center.y)}" r="${round(primitive.radius)}" stroke="${stroke}"/>`;
  }
  if (primitive.type === "polyline" || primitive.type === "polygon") {
    return `<polyline points="${primitive.points.map(formatPoint).join(" ")}" stroke="${stroke}"/>`;
  }
  if (isRectPrimitive(primitive)) {
    return `<rect x="${round(primitive.x)}" y="${round(primitive.y)}" width="${round(primitive.width)}" height="${round(primitive.height)}" rx="${round(primitive.radius)}" ry="${round(primitive.radius)}" stroke="${stroke}"/>`;
  }
  return "";
}

function primitiveCenter(primitive: V2GeometryPrimitive): V2Point | null {
  if (primitive.type === "circle") return primitive.center;
  if (primitive.type === "line") return midpoint(primitive.start, primitive.end);
  if (primitive.type === "polyline" || primitive.type === "polygon") {
    return primitive.points.length ? primitive.points[Math.floor(primitive.points.length / 2)] : null;
  }
  if (isRectPrimitive(primitive)) {
    return { x: primitive.x + primitive.width / 2, y: primitive.y + primitive.height / 2 };
  }
  return null;
}

function graphBounds(graph: V2PartDebugGraph) {
  const points = [
    ...graph.faces.flatMap((face) => face.points),
    ...graph.structuralCreases.flatMap((crease) => [crease.start, crease.end]),
    ...graph.geometryPrimitives.flatMap(primitivePoints),
  ];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function primitivePoints(primitive: V2GeometryPrimitive): V2Point[] {
  if (primitive.type === "circle") {
    return [
      { x: primitive.center.x - primitive.radius, y: primitive.center.y - primitive.radius },
      { x: primitive.center.x + primitive.radius, y: primitive.center.y + primitive.radius },
    ];
  }
  if (primitive.type === "line") return [primitive.start, primitive.end];
  if (primitive.type === "polyline" || primitive.type === "polygon") return primitive.points;
  if (isRectPrimitive(primitive)) {
    return [
      { x: primitive.x, y: primitive.y },
      { x: primitive.x + primitive.width, y: primitive.y + primitive.height },
    ];
  }
  return [];
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isRectPrimitive(primitive: V2GeometryPrimitive): primitive is Extract<V2GeometryPrimitive, { type: "rounded-rect" | "slot" | "euro-slot" }> {
  return primitive.type === "rounded-rect" || primitive.type === "slot" || primitive.type === "euro-slot";
}
