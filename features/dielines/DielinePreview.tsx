"use client";

import { primitiveToSvgPath } from "@/domain/dieline/canonicalGeometry";
import type { DielineGraph } from "@/domain/dieline/types";

type DielinePreviewProps = {
  graph: DielineGraph;
  className?: string;
};

export function DielinePreview({ graph, className = "" }: DielinePreviewProps) {
  return (
    <div className={`dieline-preview ${className}`} style={{ aspectRatio: `${graph.size.width} / ${graph.size.height}` }}>
      <svg className="dieline-preview-svg" preserveAspectRatio="none" viewBox={`0 0 ${graph.size.width} ${graph.size.height}`}>
        <g>
          {graph.faces.map((face) => (
            <polygon
              className={`dieline-face-fill dieline-face-role-${face.role}`}
              key={face.id}
              points={face.vertices.map((vertex) => `${vertex.x},${vertex.y}`).join(" ")}
            />
          ))}
        </g>
        {graph.geometry?.length ? (
          <g>
            {graph.geometry.filter((primitive) => primitive.layer !== "label").map((primitive) => (
              <path
                className={primitive.layer === "crease" ? "dieline-guide-line dieline-guide-fold" : primitive.layer === "window" || primitive.layer === "hole" ? "dieline-guide-line dieline-guide-window" : "dieline-guide-line dieline-guide-cut"}
                d={primitiveToSvgPath(primitive)}
                key={primitive.id}
              />
            ))}
          </g>
        ) : (
          <>
            <g>
              {graph.cutPaths.map((cutPath) => (
                <path className="dieline-guide-line dieline-guide-cut" d={cutPath.d} key={cutPath.id} />
              ))}
            </g>
            <g>
              {graph.creases.map((crease) => (
                <line
                  className="dieline-guide-line dieline-guide-fold"
                  key={crease.id}
                  x1={crease.edgeStart.x}
                  x2={crease.edgeEnd.x}
                  y1={crease.edgeStart.y}
                  y2={crease.edgeEnd.y}
                />
              ))}
            </g>
          </>
        )}
        <g>
          {graph.faces.map((face) => (
            <text className="dieline-guide-label" key={face.id} x={face.centroid.x} y={face.centroid.y}>
              {face.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
