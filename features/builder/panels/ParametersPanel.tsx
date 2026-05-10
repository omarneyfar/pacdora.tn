"use client";

import { useCallback } from "react";

import type { CartonDimensions } from "@/domain/packaging";
import { useAppDispatch, useAppSelector } from "@/store";
import { markChanged, setDimensions } from "@/store/builderSlice";
import { setSelectedSourceId } from "@/store/artworkSlice";
import { clearShareUrl, toggleSection } from "@/store/uiSlice";

import { ArtworkLibrary } from "../components/ArtworkLibrary";
import { CollapsibleSection } from "../components/CollapsibleSection";
import { DimensionControls } from "../components/DimensionControls";

export function ParametersPanel() {
  const dispatch = useAppDispatch();

  const dimensions = useAppSelector((s) => s.builder.dimensions);
  const isRecropping = useAppSelector((s) => s.artwork.isRecropping);
  const sources = useAppSelector((s) => s.artwork.sources);
  const selectedSourceId = useAppSelector((s) => s.artwork.selectedSourceId);
  const openSections = useAppSelector((s) => s.ui.openSections);

  const handleDimensionChange = useCallback(
    (key: keyof CartonDimensions, value: string) => {
      dispatch(clearShareUrl());
      dispatch(markChanged());
      dispatch(
        setDimensions({
          ...dimensions,
          [key]: Number(value),
        } as CartonDimensions),
      );
    },
    [dimensions, dispatch],
  );

  const handleSourceSelect = useCallback(
    (sourceId: string) => {
      dispatch(markChanged({ forceDraft: false }));
      dispatch(setSelectedSourceId(sourceId));
    },
    [dispatch],
  );

  return (
    <>
      <div className="parameters-title">
        <div>
          <span className="eyebrow">Parameters</span>
          <h2>Box setup</h2>
        </div>
        {isRecropping ? <span className="count-badge">Updating</span> : null}
      </div>

      <CollapsibleSection
        className="dimension-section"
        eyebrow="Box size"
        isOpen={openSections.dimensions}
        title="Pizza carton dimensions"
        trailing={`${dimensions.width} x ${dimensions.depth} x ${dimensions.height}`}
        onToggle={() => dispatch(toggleSection("dimensions"))}
      >
        <DimensionControls dimensions={dimensions} onChange={handleDimensionChange} />
      </CollapsibleSection>

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
