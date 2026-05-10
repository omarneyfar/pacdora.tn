"use client";

import { useCallback } from "react";

import type { CartonDimensions } from "@/domain/packaging";
import { useAppDispatch, useAppSelector } from "@/store";
import { markChanged, setDimensions } from "@/store/builderSlice";
import { setSelectedSourceId } from "@/store/artworkSlice";
import { toggleSection } from "@/store/uiSlice";

import { CollapsibleSection } from "../components/CollapsibleSection";
import { DimensionControls } from "../components/DimensionControls";
import { ArtworkLibrary } from "../components/ArtworkLibrary";

/* ── Component ─────────────────────────────────────────────────── */

/**
 * Left sidebar panel containing:
 * - Box dimensions section
 * - Artwork library section
 */
export function ParametersPanel() {
  const dispatch = useAppDispatch();

  const dimensions = useAppSelector((s) => s.builder.dimensions);
  const isRecropping = useAppSelector((s) => s.artwork.isRecropping);
  const sources = useAppSelector((s) => s.artwork.sources);
  const selectedSourceId = useAppSelector((s) => s.artwork.selectedSourceId);

  const openSections = useAppSelector((s) => s.ui.openSections);

  /* ── Callbacks (stable references for memoized children) ─────── */

  const handleDimensionChange = useCallback(
    (key: keyof CartonDimensions, value: string) => {
      dispatch(markChanged());
      dispatch(
        setDimensions({
          ...dimensions,
          [key]: Number(value),
        } as CartonDimensions),
      );
    },
    [dispatch, dimensions],
  );

  const handleSourceSelect = useCallback(
    (sourceId: string) => {
      dispatch(markChanged());
      dispatch(setSelectedSourceId(sourceId));
    },
    [dispatch],
  );

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="parameters-title">
        <div>
          <span className="eyebrow">Parameters</span>
          <h2>Box setup</h2>
        </div>
        {isRecropping ? <span className="count-badge">Updating</span> : null}
      </div>

      {/* ── Dimensions ─────────────────────────────────────────── */}
      <CollapsibleSection
        className="dimension-section"
        eyebrow="Box size"
        isOpen={openSections.dimensions}
        title="Pizza carton dimensions"
        trailing={`${dimensions.width} x ${dimensions.depth} x ${dimensions.height}`}
        onToggle={() => dispatch(toggleSection("dimensions"))}
      >
        <DimensionControls
          dimensions={dimensions}
          onChange={handleDimensionChange}
        />
      </CollapsibleSection>

      {/* ── Artwork library ────────────────────────────────────── */}
      <CollapsibleSection
        className="library-section"
        eyebrow="Artwork library"
        isOpen={openSections.library}
        title="Uploaded images"
        trailing={String(sources.length)}
        onToggle={() => dispatch(toggleSection("library"))}
      >
        <ArtworkLibrary
          selectedSourceId={selectedSourceId}
          sources={sources}
          onSelect={handleSourceSelect}
        />
      </CollapsibleSection>
    </>
  );
}
