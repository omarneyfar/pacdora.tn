"use client";

import { fallbackPrimitivesFromGraph, primitiveToSvgPath } from "@/domain/dieline/canonicalGeometry";
import type { DielineFace, DielineGraph, DielineLayer, GeometryPrimitive, Point } from "@/domain/dieline/types";

type DielineViewportProps = {
  graph: DielineGraph;
  visibleLayers: Record<DielineLayer, boolean>;
};

export function DielineViewport({ graph, visibleLayers }: DielineViewportProps) {
  const primitives = graph.geometry?.length ? graph.geometry : fallbackPrimitivesFromGraph(graph);
  const guidePrimitives = primitives.filter((primitive) => primitive.layer !== "label" && visibleLayers[primitive.layer]);
  const labels = getLabels(graph, primitives);
  const measurements = getReverseTuckEndMeasurements(graph);

  return (
    <div className="template-viewport-shell">
      <svg
        aria-label={`${graph.metadata?.familyLabel ?? "Dieline"} preview`}
        className="template-viewport-svg"
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${formatSvgNumber(graph.size.width)} ${formatSvgNumber(graph.size.height)}`}
      >
        <g className="template-viewport-faces">
          {graph.faces.map((face) => (
            <polygon
              className={`template-viewport-face dieline-face-role-${face.role}`}
              key={face.id}
              points={getPolygonPoints(face)}
            />
          ))}
        </g>

        <g className="template-viewport-guides">
          {guidePrimitives.map((primitive) => (
            <path
              className={getLayerClassName(primitive.layer)}
              d={primitiveToSvgPath(primitive)}
              key={primitive.id}
            />
          ))}
        </g>

        {visibleLayers.label ? (
          <g>
            {labels.map((label) => (
              <text
                className="dieline-guide-label template-viewport-label"
                key={label.id}
                x={formatSvgNumber(label.position.x)}
                y={formatSvgNumber(label.position.y)}
              >
                {label.text}
              </text>
            ))}
          </g>
        ) : null}

        {measurements.length > 0 ? (
          <g className="template-measurements">
            {measurements.map((measurement) => (
              <g key={measurement.id}>
                <line
                  x1={formatSvgNumber(measurement.start.x)}
                  x2={formatSvgNumber(measurement.end.x)}
                  y1={formatSvgNumber(measurement.start.y)}
                  y2={formatSvgNumber(measurement.end.y)}
                />
                <text
                  transform={measurement.vertical ? `rotate(-90 ${formatSvgNumber(measurement.label.x)} ${formatSvgNumber(measurement.label.y)})` : undefined}
                  x={formatSvgNumber(measurement.label.x)}
                  y={formatSvgNumber(measurement.label.y)}
                >
                  {measurement.text}
                </text>
              </g>
            ))}
          </g>
        ) : null}
      </svg>
    </div>
  );
}

export function getLayerPrimitiveCounts(graph: DielineGraph): Record<DielineLayer, number> {
  const counts: Record<DielineLayer, number> = {
    cut: 0,
    crease: 0,
    perf: 0,
    window: 0,
    hole: 0,
    bleed: 0,
    safe: 0,
    label: 0,
  };
  const primitives = graph.geometry?.length ? graph.geometry : fallbackPrimitivesFromGraph(graph);

  for (const primitive of primitives) {
    counts[primitive.layer] += 1;
  }

  if (!counts.label) {
    counts.label = graph.faces.length;
  }

  return counts;
}

function getLabels(graph: DielineGraph, primitives: GeometryPrimitive[]) {
  const geometryLabels = primitives.filter((primitive): primitive is Extract<GeometryPrimitive, { type: "label" }> => primitive.type === "label");
  if (geometryLabels.length > 0) {
    return geometryLabels.map((label) => ({
      id: label.id,
      position: label.position,
      text: label.text,
    }));
  }

  return graph.faces.map((face) => ({
    id: `label-${face.id}`,
    position: face.centroid,
    text: face.label,
  }));
}

function getLayerClassName(layer: DielineLayer): string {
  if (layer === "crease") return "dieline-guide-line dieline-guide-fold";
  if (layer === "bleed") return "dieline-guide-line dieline-guide-bleed";
  if (layer === "safe") return "dieline-guide-line dieline-guide-safe";
  if (layer === "window" || layer === "hole") return "dieline-guide-line dieline-guide-window";
  if (layer === "perf") return "dieline-guide-line template-guide-perf";
  return "dieline-guide-line dieline-guide-cut";
}

function getPolygonPoints(face: DielineFace): string {
  return face.vertices.map(formatSvgPoint).join(" ");
}

function formatSvgPoint(point: Point): string {
  return `${formatSvgNumber(point.x)},${formatSvgNumber(point.y)}`;
}

function formatSvgNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";

  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function getReverseTuckEndMeasurements(graph: DielineGraph) {
  if (graph.metadata?.family !== "reverse-tuck-end") return [];

  // Derive all measurement positions from the actual generated graph faces.
  // Do NOT duplicate generator formulas — the renderer shows what the graph produced.
  const faceBounds = new Map(graph.faces.map((face) => [face.id, face.bounds]));
  const front = faceBounds.get("front");
  const left = faceBounds.get("left");
  const glueTab = faceBounds.get("glue-tab");
  const topDustLeft = faceBounds.get("top-dust-left");
  const topTuck = faceBounds.get("top-tuck");
  if (!front || !left) return [];

  const bodyTop = front.y;
  const bodyBottom = front.y + front.height;
  const panelWidth = left.width;
  const panelLength = front.width;
  const panelHeight = front.height;
  const x0 = left.x;
  const x1 = front.x;
  const x2 = front.x + front.width;

  const measurements = [
    horizontalMeasurement("dim-width", x0, x0 + panelWidth, bodyBottom - 12, panelWidth),
    horizontalMeasurement("dim-length", x1, x2, bodyBottom - 12, panelLength),
    verticalMeasurement("dim-height", 6, bodyTop, bodyBottom, panelHeight),
  ];

  if (glueTab) {
    measurements.push(horizontalMeasurement("dim-glue", glueTab.x, glueTab.x + glueTab.width, bodyBottom - 12, glueTab.width));
  }

  if (topDustLeft) {
    const dustFlapDepth = topDustLeft.height;
    measurements.push(verticalMeasurement("dim-dfw", x1 - 7, topDustLeft.y, topDustLeft.y + dustFlapDepth, dustFlapDepth));
  }

  if (topTuck) {
    const tuckExtent = bodyTop - topTuck.y;
    measurements.push(verticalMeasurement("dim-tuck", x1 + 18, topTuck.y, bodyTop, tuckExtent));
  }

  return measurements;
}

function horizontalMeasurement(id: string, x1: number, x2: number, y: number, value: number) {
  return {
    id,
    start: { x: x1, y },
    end: { x: x2, y },
    label: { x: (x1 + x2) / 2, y: y - 2 },
    text: formatMeasurement(value),
    vertical: false,
  };
}

function verticalMeasurement(id: string, x: number, y1: number, y2: number, value: number) {
  return {
    id,
    start: { x, y: y1 },
    end: { x, y: y2 },
    label: { x: x + 5, y: (y1 + y2) / 2 },
    text: formatMeasurement(value),
    vertical: true,
  };
}

function formatMeasurement(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
