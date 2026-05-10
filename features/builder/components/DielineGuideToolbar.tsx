"use client";

import { memo } from "react";

/* ── Props ─────────────────────────────────────────────────────── */

type DielineGuideToolbarProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/* ── Component ─────────────────────────────────────────────────── */

/**
 * Toggle for showing print guides on the flat dieline, with a color legend.
 */
export const DielineGuideToolbar = memo(function DielineGuideToolbar({
  checked,
  onChange,
}: DielineGuideToolbarProps) {
  return (
    <div className="dieline-guide-toolbar">
      <label className="toggle-row">
        <input
          checked={checked}
          type="checkbox"
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span>Print guides</span>
      </label>
      <div className="dieline-guide-legend" aria-hidden>
        <span className="legend-cut">Cut</span>
        <span className="legend-fold">Fold</span>
        <span className="legend-bleed">Bleed</span>
        <span className="legend-safe">Safe</span>
      </div>
    </div>
  );
});
