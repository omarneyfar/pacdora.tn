"use client";

import { memo } from "react";

import { DIMENSION_LIMITS, type CartonDimensions } from "@/domain/packaging";

/* ── Props ─────────────────────────────────────────────────────── */

type DimensionControlsProps = {
  dimensions: CartonDimensions;
  onChange: (key: keyof CartonDimensions, value: string) => void;
};

/* ── Static data ───────────────────────────────────────────────── */

const CONTROLS: Array<{ key: keyof CartonDimensions; label: string }> = [
  { key: "width", label: "Width" },
  { key: "depth", label: "Depth" },
  { key: "height", label: "Side height" },
];

/* ── Component ─────────────────────────────────────────────────── */

/**
 * Three numeric inputs for carton width, depth, and height in millimeters.
 * Memoized — only re-renders when `dimensions` or `onChange` change.
 */
export const DimensionControls = memo(function DimensionControls({
  dimensions,
  onChange,
}: DimensionControlsProps) {
  return (
    <div className="dimension-grid">
      {CONTROLS.map((control) => (
        <label className="dimension-control" key={control.key}>
          <span>{control.label}</span>
          <input
            max={DIMENSION_LIMITS.max}
            min={DIMENSION_LIMITS.min}
            step="1"
            type="number"
            value={dimensions[control.key]}
            onChange={(event) => onChange(control.key, event.currentTarget.value)}
          />
          <em>mm</em>
        </label>
      ))}
    </div>
  );
});
