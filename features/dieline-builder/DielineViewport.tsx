"use client";

import { fallbackPrimitivesFromGraph, primitiveToSvgPath } from "@/domain/dieline/canonicalGeometry";
import type { DielineGraph, DielineLayer, GeometryPrimitive } from "@/domain/dieline/types";

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
        viewBox={`0 0 ${graph.size.width} ${graph.size.height}`}
      >
        <g className="template-viewport-faces">
          {graph.faces.map((face) => (
            <polygon
              className={`template-viewport-face dieline-face-role-${face.role}`}
              key={face.id}
              points={face.vertices.map((vertex) => `${vertex.x},${vertex.y}`).join(" ")}
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
              <text className="dieline-guide-label template-viewport-label" key={label.id} x={label.position.x} y={label.position.y}>
                {label.text}
              </text>
            ))}
          </g>
        ) : null}

        {measurements.length > 0 ? (
          <g className="template-measurements">
            {measurements.map((measurement) => (
              <g key={measurement.id}>
                <line x1={measurement.start.x} x2={measurement.end.x} y1={measurement.start.y} y2={measurement.end.y} />
                <text
                  transform={measurement.vertical ? `rotate(-90 ${measurement.label.x} ${measurement.label.y})` : undefined}
                  x={measurement.label.x}
                  y={measurement.label.y}
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

function getReverseTuckEndMeasurements(graph: DielineGraph) {
  const values = graph.metadata?.family === "reverse-tuck-end" ? graph.metadata.parameterValues : null;
  if (!values) return [];

  const L = numberValue(values.L);
  const W = numberValue(values.W);
  const H = numberValue(values.H);
  const TFW = numberValue(values.TFW);
  const TFR = numberValue(values.TFR);
  const GFW = numberValue(values.GFW);
  const DFW = numberValue(values.DFW);
  if (![L, W, H, TFW, TFR, GFW, DFW].every((value) => value > 0)) return [];

  const bodyTop = TFW + DFW;
  const bodyBottom = bodyTop + H;
  const x0 = 0;
  const x1 = W;
  const x2 = x1 + L;
  const x3 = x2 + W;
  const x4 = x3 + L;
  const x5 = x4 + GFW;

  return [
    horizontalMeasurement("dim-width", x0, x1, bodyBottom - 12, W),
    horizontalMeasurement("dim-length", x1, x2, bodyBottom - 12, L),
    verticalMeasurement("dim-height", 6, bodyTop, bodyBottom, H),
    horizontalMeasurement("dim-glue", x4, x5, bodyBottom - 12, GFW),
    verticalMeasurement("dim-dfw", x1 - 7, TFW, bodyTop, DFW),
    verticalMeasurement("dim-tfw", x1 + 18, 0, TFW, TFW),
    verticalMeasurement("dim-tfr", x2 - 18, 0, TFR, TFR),
  ];
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

function numberValue(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatMeasurement(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
