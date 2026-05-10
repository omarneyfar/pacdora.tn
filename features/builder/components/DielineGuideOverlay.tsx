"use client";

import { memo, useMemo } from "react";

import { getPackagingTemplate, type CartonDimensions } from "@/domain/packaging";

/* ── Props ─────────────────────────────────────────────────────── */

type DielineGuideOverlayProps = {
  dimensions: CartonDimensions;
};

/* ── Component ─────────────────────────────────────────────────── */

/**
 * SVG overlay that draws cut lines, fold lines, bleed zones,
 * safe areas, and face dimension labels on the flat dieline.
 *
 * Memoized by `dimensions` — the only input that changes the geometry.
 */
export const DielineGuideOverlay = memo(function DielineGuideOverlay({
  dimensions,
}: DielineGuideOverlayProps) {
  const dielineSpec = useMemo(
    () => getPackagingTemplate().getDielineSpec(dimensions),
    [dimensions],
  );

  const { size: dielineSize, guides } = dielineSpec;

  return (
    <svg
      aria-hidden
      className="dieline-guide-overlay"
      preserveAspectRatio="none"
      viewBox={`0 0 ${dielineSize.width} ${dielineSize.height}`}
    >
      {/* Bleed & safe area rectangles */}
      <g>
        {guides.rectangles.map((rect) => (
          <rect
            className={`dieline-guide-rect dieline-guide-${rect.kind}`}
            height={rect.height}
            key={`${rect.kind}-${rect.face}`}
            width={rect.width}
            x={rect.x}
            y={rect.y}
          />
        ))}
      </g>

      {/* Cut & fold line segments */}
      <g>
        {guides.segments.map((segment, index) => (
          <line
            className={`dieline-guide-line dieline-guide-${segment.kind}`}
            key={`${segment.kind}-${index}-${segment.x1}-${segment.y1}`}
            x1={segment.x1}
            x2={segment.x2}
            y1={segment.y1}
            y2={segment.y2}
          />
        ))}
      </g>

      {/* Face labels with dimensions */}
      <g>
        {guides.labels.map((label) => (
          <text
            className="dieline-guide-label"
            key={label.face}
            x={label.x}
            y={label.y}
          >
            {label.text}
          </text>
        ))}
      </g>
    </svg>
  );
});
