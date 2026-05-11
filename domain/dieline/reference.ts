import { getPolygonBounds } from "./geometry";
import { fallbackPrimitivesFromGraph, primitiveToPoints } from "./canonicalGeometry";
import type { Bounds, DielineGraph, DielineLayer, GeometryPrimitive, Point } from "./types";

export type ReferenceGeometry = {
  primitives: GeometryPrimitive[];
  bounds: Bounds;
};

export type ReferenceComparison = {
  ok: boolean;
  messages: string[];
};

const LAYER_ALIASES: Record<string, DielineLayer> = {
  cut: "cut",
  cuts: "cut",
  crease: "crease",
  creases: "crease",
  fold: "crease",
  folds: "crease",
  perf: "perf",
  window: "window",
  windows: "window",
  hole: "hole",
  holes: "hole",
  bleed: "bleed",
  safe: "safe",
  label: "label",
};

export function parseReferenceGeometry(content: string, fileName: string): ReferenceGeometry {
  if (/\.dxf$/i.test(fileName)) {
    return parseDxfReference(content);
  }

  return parseSvgReference(content);
}

export function compareGraphToReference(graph: DielineGraph, reference: ReferenceGeometry, tolerance = 0.5): ReferenceComparison {
  const graphPrimitives = graph.geometry?.length ? graph.geometry : fallbackPrimitivesFromGraph(graph);
  const messages: string[] = [];

  for (const layer of ["cut", "crease", "window", "hole", "perf"] as const) {
    const graphCount = graphPrimitives.filter((primitive) => primitive.layer === layer).length;
    const referenceCount = reference.primitives.filter((primitive) => primitive.layer === layer).length;

    if (referenceCount > 0 && graphCount !== referenceCount) {
      messages.push(`${layer}: expected ${referenceCount} primitives, got ${graphCount}`);
    }
  }

  const graphBounds = getPrimitiveBounds(graphPrimitives);
  for (const key of ["x", "y", "width", "height"] as const) {
    if (Math.abs(graphBounds[key] - reference.bounds[key]) > tolerance) {
      messages.push(`bounds.${key}: expected ${reference.bounds[key]}, got ${graphBounds[key]}`);
    }
  }

  return {
    ok: messages.length === 0,
    messages,
  };
}

function parseSvgReference(content: string): ReferenceGeometry {
  const primitives: GeometryPrimitive[] = [];
  let index = 0;

  for (const match of content.matchAll(/<(line|polyline|polygon|circle|ellipse|rect|path)\b([^>]*)>/gi)) {
    const tag = match[1].toLowerCase();
    const attrs = parseAttributes(match[2]);
    const layer = inferLayer(attrs["data-layer"] ?? attrs.id ?? attrs.class);

    if (tag === "line") {
      const start = point(attrs.x1, attrs.y1);
      const end = point(attrs.x2, attrs.y2);
      if (start && end) primitives.push({ id: attrs.id ?? `ref-line-${index}`, layer, type: "line", start, end });
    } else if (tag === "polyline" || tag === "polygon") {
      const points = parseSvgPoints(attrs.points);
      if (points.length >= 2) primitives.push({ id: attrs.id ?? `ref-${tag}-${index}`, layer, type: tag, points });
    } else if (tag === "circle") {
      const center = point(attrs.cx, attrs.cy);
      const radius = numeric(attrs.r);
      if (center && radius > 0) primitives.push({ id: attrs.id ?? `ref-circle-${index}`, layer, type: "circle", center, radius });
    } else if (tag === "ellipse") {
      const center = point(attrs.cx, attrs.cy);
      const radiusX = numeric(attrs.rx);
      const radiusY = numeric(attrs.ry);
      if (center && radiusX > 0 && radiusY > 0) primitives.push({ id: attrs.id ?? `ref-ellipse-${index}`, layer, type: "ellipse", center, radiusX, radiusY });
    } else if (tag === "rect") {
      const x = numeric(attrs.x);
      const y = numeric(attrs.y);
      const width = numeric(attrs.width);
      const height = numeric(attrs.height);
      const radius = Math.max(numeric(attrs.rx), numeric(attrs.ry));
      if (width > 0 && height > 0) primitives.push({ id: attrs.id ?? `ref-rect-${index}`, layer, type: radius > 0 ? "rounded-rect" : "polygon", ...(radius > 0 ? { x, y, width, height, radius } : { points: [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }] }) } as GeometryPrimitive);
    }

    index += 1;
  }

  return { primitives, bounds: getPrimitiveBounds(primitives) };
}

function parseDxfReference(content: string): ReferenceGeometry {
  const tokens = content.split(/\r?\n/).map((line) => line.trim());
  const primitives: GeometryPrimitive[] = [];
  let index = 0;

  for (let cursor = 0; cursor < tokens.length - 1; cursor += 2) {
    if (tokens[cursor] !== "0") continue;
    const entity = tokens[cursor + 1];

    if (entity === "LINE") {
      const attrs = readDxfEntity(tokens, cursor + 2);
      const start = point(attrs["10"], attrs["20"]);
      const end = point(attrs["11"], attrs["21"]);
      if (start && end) primitives.push({ id: `ref-line-${index}`, layer: inferLayer(attrs["8"]), type: "line", start, end });
    } else if (entity === "LWPOLYLINE") {
      const polyline = readDxfPolyline(tokens, cursor + 2);
      if (polyline.points.length >= 2) {
        primitives.push({
          id: `ref-polyline-${index}`,
          layer: polyline.layer,
          type: polyline.closed ? "polygon" : "polyline",
          points: polyline.points,
        });
      }
    } else if (entity === "CIRCLE") {
      const attrs = readDxfEntity(tokens, cursor + 2);
      const center = point(attrs["10"], attrs["20"]);
      const radius = numeric(attrs["40"]);
      if (center && radius > 0) primitives.push({ id: `ref-circle-${index}`, layer: inferLayer(attrs["8"]), type: "circle", center, radius });
    } else if (entity === "ARC") {
      const attrs = readDxfEntity(tokens, cursor + 2);
      const center = point(attrs["10"], attrs["20"]);
      const radius = numeric(attrs["40"]);
      if (center && radius > 0) {
        primitives.push({
          id: `ref-arc-${index}`,
          layer: inferLayer(attrs["8"]),
          type: "arc",
          center,
          radius,
          startAngle: degToRad(numeric(attrs["50"])),
          endAngle: degToRad(numeric(attrs["51"])),
        });
      }
    } else if (entity === "TEXT") {
      const attrs = readDxfEntity(tokens, cursor + 2);
      const position = point(attrs["10"], attrs["20"]);
      if (position) {
        primitives.push({
          id: `ref-text-${index}`,
          layer: inferLayer(attrs["8"]),
          type: "label",
          position,
          text: attrs["1"] ?? "",
        });
      }
    }

    index += 1;
  }

  return { primitives, bounds: getPrimitiveBounds(primitives) };
}

function getPrimitiveBounds(primitives: GeometryPrimitive[]): Bounds {
  return getPolygonBounds(primitives.flatMap((primitive) => primitiveToPoints(primitive)));
}

function parseAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of source.matchAll(/([:\w-]+)=["']([^"']*)["']/g)) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function parseSvgPoints(value: string | undefined): Point[] {
  if (!value) return [];
  const numbers = value.trim().split(/[\s,]+/).map(Number).filter(Number.isFinite);
  const points: Point[] = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push({ x: numbers[index], y: numbers[index + 1] });
  }
  return points;
}

function readDxfEntity(tokens: string[], start: number): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (let cursor = start; cursor < tokens.length - 1; cursor += 2) {
    if (tokens[cursor] === "0") break;
    attrs[tokens[cursor]] = tokens[cursor + 1];
  }
  return attrs;
}

function readDxfPolyline(tokens: string[], start: number): { closed: boolean; layer: DielineLayer; points: Point[] } {
  let currentX: number | null = null;
  let closed = false;
  let layer: DielineLayer = "cut";
  const points: Point[] = [];

  for (let cursor = start; cursor < tokens.length - 1; cursor += 2) {
    const code = tokens[cursor];
    const value = tokens[cursor + 1];
    if (code === "0") break;

    if (code === "8") {
      layer = inferLayer(value);
    } else if (code === "70") {
      closed = (Math.trunc(numeric(value)) & 1) === 1;
    } else if (code === "10") {
      currentX = numeric(value);
    } else if (code === "20" && currentX !== null) {
      const y = numeric(value);
      if (Number.isFinite(currentX) && Number.isFinite(y)) {
        points.push({ x: currentX, y });
      }
      currentX = null;
    }
  }

  return { closed, layer, points };
}

function inferLayer(value: string | undefined): DielineLayer {
  const normalized = value?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  return LAYER_ALIASES[normalized] ?? "cut";
}

function point(x: string | undefined, y: string | undefined): Point | null {
  const px = numeric(x);
  const py = numeric(y);
  return Number.isFinite(px) && Number.isFinite(py) ? { x: px, y: py } : null;
}

function numeric(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function degToRad(value: number): number {
  return (value * Math.PI) / 180;
}
