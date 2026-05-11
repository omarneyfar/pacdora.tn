"use client";

import type { DielineLayer } from "@/domain/dieline/types";

export const BUILDER_LAYER_ORDER: DielineLayer[] = ["cut", "crease", "perf", "window", "hole", "bleed", "safe", "label"];

const LAYER_LABELS: Record<DielineLayer, string> = {
  cut: "Cut",
  crease: "Crease",
  perf: "Perf",
  window: "Window",
  hole: "Hole",
  bleed: "Bleed",
  safe: "Safe",
  label: "Labels",
};

type LayerControlsProps = {
  counts: Record<DielineLayer, number>;
  visibleLayers: Record<DielineLayer, boolean>;
  onToggle: (layer: DielineLayer) => void;
};

export function LayerControls({ counts, onToggle, visibleLayers }: LayerControlsProps) {
  return (
    <div className="template-layer-controls" aria-label="Dieline layers">
      {BUILDER_LAYER_ORDER.filter((layer) => counts[layer] > 0).map((layer) => (
        <button
          className={visibleLayers[layer] ? `is-active layer-${layer}` : `layer-${layer}`}
          key={layer}
          type="button"
          onClick={() => onToggle(layer)}
        >
          <span>{LAYER_LABELS[layer]}</span>
          <em>{counts[layer]}</em>
        </button>
      ))}
    </div>
  );
}

export function createDefaultVisibleLayers(): Record<DielineLayer, boolean> {
  return {
    cut: true,
    crease: true,
    perf: true,
    window: true,
    hole: true,
    bleed: true,
    safe: true,
    label: false,
  };
}
