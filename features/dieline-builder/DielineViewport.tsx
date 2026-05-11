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

