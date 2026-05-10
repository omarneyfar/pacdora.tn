import type { Bounds, DielineFace, DielineGraph, Point } from "./types";

const EPSILON = 0.000001;

export function getPolygonArea(vertices: Point[]): number {
  if (vertices.length < 3) {
    return 0;
  }

  let area = 0;

  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    area += current.x * next.y - next.x * current.y;
  }

  return area / 2;
}

export function getPolygonBounds(vertices: Point[]): Bounds {
  if (vertices.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const xs = vertices.map((point) => point.x);
  const ys = vertices.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function getPolygonCentroid(vertices: Point[]): Point {
  if (vertices.length === 0) {
    return { x: 0, y: 0 };
  }

  const area = getPolygonArea(vertices);

  if (Math.abs(area) < EPSILON) {
    const total = vertices.reduce(
      (accumulator, point) => ({
        x: accumulator.x + point.x,
        y: accumulator.y + point.y
      }),
      { x: 0, y: 0 }
    );

    return {
      x: total.x / vertices.length,
      y: total.y / vertices.length
    };
  }

  let centroidX = 0;
  let centroidY = 0;

  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    const factor = current.x * next.y - next.x * current.y;
    centroidX += (current.x + next.x) * factor;
    centroidY += (current.y + next.y) * factor;
  }

  return {
    x: centroidX / (6 * area),
    y: centroidY / (6 * area)
  };
}

export function pointsToPath(points: Point[], close = true): string {
  if (points.length === 0) {
    return "";
  }

  const [first, ...rest] = points;
  const commands = [`M ${formatCoordinate(first.x)} ${formatCoordinate(first.y)}`];

  for (const point of rest) {
    commands.push(`L ${formatCoordinate(point.x)} ${formatCoordinate(point.y)}`);
  }

  if (close) {
    commands.push("Z");
  }

  return commands.join(" ");
}

export function createDielineFace(input: {
  id: string;
  label: string;
  vertices: Point[];
  role?: DielineFace["role"];
  artworkEnabled?: boolean;
}): DielineFace {
  return {
    id: input.id,
    label: input.label,
    vertices: input.vertices,
    centroid: getPolygonCentroid(input.vertices),
    bounds: getPolygonBounds(input.vertices),
    role: input.role ?? "unknown",
    artworkEnabled: input.artworkEnabled ?? false
  };
}

export function getGraphBounds(graph: Pick<DielineGraph, "faces">): Bounds {
  return getPolygonBounds(graph.faces.flatMap((face) => face.vertices));
}

export function normalizeGraphBounds(graph: DielineGraph): DielineGraph {
  const bounds = getGraphBounds(graph);

  if (Math.abs(bounds.x) < EPSILON && Math.abs(bounds.y) < EPSILON) {
    return graph;
  }

  const shiftPoint = (point: Point): Point => ({
    x: point.x - bounds.x,
    y: point.y - bounds.y
  });

  return {
    ...graph,
    size: {
      width: bounds.width,
      height: bounds.height
    },
    faces: graph.faces.map((face) =>
      createDielineFace({
        id: face.id,
        label: face.label,
        vertices: face.vertices.map(shiftPoint),
        role: face.role,
        artworkEnabled: face.artworkEnabled
      })
    ),
    creases: graph.creases.map((crease) => ({
      ...crease,
      edgeStart: shiftPoint(crease.edgeStart),
      edgeEnd: shiftPoint(crease.edgeEnd)
    })),
    cutPaths: graph.cutPaths.map((path) => {
      if (!path.points) {
        return path;
      }

      const points = path.points.map(shiftPoint);

      return {
        ...path,
        points,
        d: pointsToPath(points, false)
      };
    })
  };
}

function formatCoordinate(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}
