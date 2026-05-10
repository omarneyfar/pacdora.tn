import {
  createDielineFace,
  createExteriorCutPaths,
  getGraphBounds,
  getPolygonArea,
  pointsToPath
} from "./geometry";
import { normalizeDielineGraph } from "./validation";
import type { DielineCrease, DielineCutPath, DielineFace, DielineFaceNode, DielineGraph, Point } from "./types";

type SvgElement = {
  tag: string;
  attributes: Record<string, string>;
};

export type SvgDielineImportResult = {
  graph: DielineGraph;
  warnings: string[];
};

const SVG_TAG_PATTERN = /<svg\b([^>]*)>/i;
const ELEMENT_PATTERN = /<(polygon|polyline|rect|line|path)\b([^>]*)\/?>/gi;
const ATTRIBUTE_PATTERN = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const RIGHT_ANGLE_FOLD = Math.PI / 2;

export function importSvgDieline(svgText: string): SvgDielineImportResult {
  const warnings: string[] = [];

  if (!svgText.trim().startsWith("<svg") && !svgText.includes("<svg")) {
    throw new Error("Upload a valid SVG dieline file.");
  }

  const elements = parseElements(svgText);
  const faces = elements.flatMap((element) => parseFaceElement(element, warnings));

  if (faces.length === 0) {
    throw new Error("No faces found. Add polygons or rectangles with id=\"face-front\" or data-face-id=\"front\".");
  }

  const faceIds = new Set(faces.map((face) => face.id));
  const creases = elements.flatMap((element, index) => parseCreaseElement(element, index, faceIds, warnings));
  const explicitCutPaths = elements.flatMap((element, index) => parseCutElement(element, index));
  const bounds = getGraphBounds({ faces });
  const size = parseSvgSize(svgText) ?? {
    width: bounds.x + bounds.width,
    height: bounds.y + bounds.height
  };
  const graph = normalizeDielineGraph({
    size,
    faces,
    creases,
    cutPaths: explicitCutPaths.length > 0 ? explicitCutPaths : createExteriorCutPaths(faces),
    faceTree: createFaceTree(faces, creases),
    source: {
      type: "svg-upload"
    },
    sourceSvg: svgText
  });

  if (!graph) {
    throw new Error("The SVG dieline could not be normalized.");
  }

  return { graph, warnings };
}

function parseElements(svgText: string): SvgElement[] {
  const elements: SvgElement[] = [];
  let match: RegExpExecArray | null;

  while ((match = ELEMENT_PATTERN.exec(svgText))) {
    elements.push({
      tag: match[1].toLowerCase(),
      attributes: parseAttributes(match[2])
    });
  }

  return elements;
}

function parseAttributes(rawAttributes: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  let match: RegExpExecArray | null;

  while ((match = ATTRIBUTE_PATTERN.exec(rawAttributes))) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? "";
  }

  return attributes;
}

function parseFaceElement(element: SvgElement, warnings: string[]): DielineFace[] {
  const faceId = getFaceId(element.attributes);
  if (!faceId) {
    return [];
  }

  const vertices = getElementVertices(element);
  if (vertices.length < 3) {
    warnings.push(`Face ${faceId} was ignored because it is not a closed polygon or rectangle.`);
    return [];
  }

  return [
    createDielineFace({
      id: faceId,
      label: getFaceLabel(element.attributes, faceId),
      vertices,
      role: getFaceRole(element.attributes),
      artworkEnabled: getArtworkEnabled(element.attributes)
    })
  ];
}

function parseCreaseElement(
  element: SvgElement,
  index: number,
  faceIds: Set<string>,
  warnings: string[]
): DielineCrease[] {
  if (!isCreaseElement(element)) {
    return [];
  }

  const faceA = getAttribute(element.attributes, "data-face-a", "data-facea", "face-a");
  const faceB = getAttribute(element.attributes, "data-face-b", "data-faceb", "face-b");
  const points = getLinePoints(element);

  if (!faceA || !faceB || !faceIds.has(faceA) || !faceIds.has(faceB) || !points) {
    warnings.push("A crease was ignored because it needs data-face-a, data-face-b, x1, y1, x2, and y2.");
    return [];
  }

  return [
    {
      id: getAttribute(element.attributes, "id") || `crease-${index + 1}`,
      faceA,
      faceB,
      edgeStart: points.start,
      edgeEnd: points.end,
      foldAngle: RIGHT_ANGLE_FOLD,
      direction: getAttribute(element.attributes, "data-direction") === "-1" ? -1 : 1
    }
  ];
}

function parseCutElement(element: SvgElement, index: number): DielineCutPath[] {
  if (!isCutElement(element)) {
    return [];
  }

  if (element.tag === "path") {
    const d = getAttribute(element.attributes, "d");
    return d ? [{ id: getAttribute(element.attributes, "id") || `cut-${index + 1}`, d }] : [];
  }

  const vertices = getElementVertices(element);
  if (vertices.length >= 2) {
    return [
      {
        id: getAttribute(element.attributes, "id") || `cut-${index + 1}`,
        d: pointsToPath(vertices, element.tag !== "line"),
        points: vertices
      }
    ];
  }

  return [];
}

function parseSvgSize(svgText: string): { width: number; height: number } | null {
  const svgMatch = svgText.match(SVG_TAG_PATTERN);
  if (!svgMatch) {
    return null;
  }

  const attributes = parseAttributes(svgMatch[1]);
  const viewBox = getAttribute(attributes, "viewbox");
  if (viewBox) {
    const [, , width, height] = viewBox.split(/[\s,]+/).map(Number);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }

  const width = parseNumber(getAttribute(attributes, "width"));
  const height = parseNumber(getAttribute(attributes, "height"));
  return width && height ? { width, height } : null;
}

function getElementVertices(element: SvgElement): Point[] {
  if (element.tag === "polygon" || element.tag === "polyline") {
    return parsePoints(getAttribute(element.attributes, "points"));
  }

  if (element.tag === "rect") {
    const x = parseNumber(getAttribute(element.attributes, "x")) ?? 0;
    const y = parseNumber(getAttribute(element.attributes, "y")) ?? 0;
    const width = parseNumber(getAttribute(element.attributes, "width"));
    const height = parseNumber(getAttribute(element.attributes, "height"));

    if (!width || !height) {
      return [];
    }

    return [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height }
    ];
  }

  const line = getLinePoints(element);
  return line ? [line.start, line.end] : [];
}

function getLinePoints(element: SvgElement): { start: Point; end: Point } | null {
  if (element.tag !== "line") {
    return null;
  }

  const x1 = parseNumber(getAttribute(element.attributes, "x1"));
  const y1 = parseNumber(getAttribute(element.attributes, "y1"));
  const x2 = parseNumber(getAttribute(element.attributes, "x2"));
  const y2 = parseNumber(getAttribute(element.attributes, "y2"));

  if ([x1, y1, x2, y2].some((value) => value === null)) {
    return null;
  }

  return {
    start: { x: x1 ?? 0, y: y1 ?? 0 },
    end: { x: x2 ?? 0, y: y2 ?? 0 }
  };
}

function parsePoints(value: string | undefined): Point[] {
  if (!value) {
    return [];
  }

  const numbers = value.trim().split(/[\s,]+/).map(Number);
  const points: Point[] = [];

  for (let index = 0; index < numbers.length - 1; index += 2) {
    const x = numbers[index];
    const y = numbers[index + 1];
    if (Number.isFinite(x) && Number.isFinite(y)) {
      points.push({ x, y });
    }
  }

  return points;
}

function createFaceTree(faces: DielineFace[], creases: DielineCrease[]): DielineFaceNode[] {
  if (faces.length === 0) {
    return [];
  }

  const root = [...faces].sort((a, b) => Math.abs(getPolygonArea(b.vertices)) - Math.abs(getPolygonArea(a.vertices)))[0];
  const visited = new Set<string>();
  const buildNode = (faceId: string, creaseId: string | null): DielineFaceNode => {
    visited.add(faceId);
    const children = creases
      .filter((crease) => crease.faceA === faceId || crease.faceB === faceId)
      .map((crease) => ({
        crease,
        childFaceId: crease.faceA === faceId ? crease.faceB : crease.faceA
      }))
      .filter(({ childFaceId }) => !visited.has(childFaceId))
      .map(({ childFaceId, crease }) => buildNode(childFaceId, crease.id));

    return { faceId, creaseId, children };
  };

  const roots = [buildNode(root.id, null)];
  for (const face of faces) {
    if (!visited.has(face.id)) {
      roots.push(buildNode(face.id, null));
    }
  }

  return roots;
}

function getFaceId(attributes: Record<string, string>): string | null {
  const explicit = getAttribute(attributes, "data-face-id", "data-face", "face-id");
  if (explicit) {
    return cleanId(explicit);
  }

  const id = getAttribute(attributes, "id");
  if (id?.startsWith("face-")) {
    return cleanId(id.slice("face-".length));
  }

  return null;
}

function getFaceLabel(attributes: Record<string, string>, faceId: string): string {
  const label = getAttribute(attributes, "data-label", "aria-label");
  return label?.trim() || toTitleCase(faceId);
}

function getFaceRole(attributes: Record<string, string>): DielineFace["role"] {
  const role = getAttribute(attributes, "data-role", "role");
  return role === "panel" || role === "flap" || role === "glue" ? role : "panel";
}

function getArtworkEnabled(attributes: Record<string, string>): boolean {
  const value = getAttribute(attributes, "data-artwork-enabled", "artwork-enabled");
  return value !== "false";
}

function isCreaseElement(element: SvgElement): boolean {
  const id = getAttribute(element.attributes, "id") ?? "";
  const kind = getAttribute(element.attributes, "data-kind", "data-type") ?? "";
  const className = getAttribute(element.attributes, "class") ?? "";
  return element.tag === "line" && (
    id.startsWith("crease-") ||
    kind === "crease" ||
    kind === "fold" ||
    className.includes("crease") ||
    className.includes("fold")
  );
}

function isCutElement(element: SvgElement): boolean {
  const id = getAttribute(element.attributes, "id") ?? "";
  const kind = getAttribute(element.attributes, "data-kind", "data-type") ?? "";
  const className = getAttribute(element.attributes, "class") ?? "";
  return (
    id.startsWith("cut-") ||
    kind === "cut" ||
    className.includes("cut")
  );
}

function getAttribute(attributes: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = attributes[key.toLowerCase()];
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function parseNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const numericValue = Number.parseFloat(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function cleanId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
}

function toTitleCase(value: string): string {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
