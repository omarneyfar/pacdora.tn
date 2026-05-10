"use client";

import { useCallback } from "react";

import type { FaceKey } from "@/domain/packaging";
import { DEFAULT_CROP_SETTINGS } from "@/features/artwork/artwork";
import { useAppDispatch, useAppSelector } from "@/store";
import { openCropModal, setShowDielineGuides, toggleSection } from "@/store/uiSlice";

import { CollapsibleSection } from "../components/CollapsibleSection";
import { DielineGuideToolbar } from "../components/DielineGuideToolbar";
import { DielineRenderer } from "../components/DielineRenderer";

/* ── Props ─────────────────────────────────────────────────────── */

type DielinePanelProps = {
  onUpload: (face: FaceKey, file: File) => void;
  onClear: (face: FaceKey) => void;
};

/* ── Component ─────────────────────────────────────────────────── */

/**
 * Sidebar panel containing:
 * - Dieline guide toggle
 * - Flat dieline uploader board
 */
export function DielinePanel({ onUpload, onClear }: DielinePanelProps) {
  const dispatch = useAppDispatch();

  const dimensions = useAppSelector((s) => s.builder.dimensions);
  const faces = useAppSelector((s) => s.artwork.faces);
  const sources = useAppSelector((s) => s.artwork.sources);
  const busyFace = useAppSelector((s) => s.artwork.busyFace);
  const selectedSourceId = useAppSelector((s) => s.artwork.selectedSourceId);

  const openSections = useAppSelector((s) => s.ui.openSections);
  const showDielineGuides = useAppSelector((s) => s.ui.showDielineGuides);

  const uploadedCount = Object.keys(faces).length;

  /* ── Stable callbacks ────────────────────────────────────────── */

  const handleApplySelected = useCallback(
    (face: FaceKey) => {
      if (selectedSourceId) {
        dispatch(
          openCropModal({
            face,
            sourceId: selectedSourceId,
            settings: DEFAULT_CROP_SETTINGS,
          }),
        );
      }
    },
    [dispatch, selectedSourceId],
  );

  const handleCrop = useCallback(
    (face: FaceKey) => {
      const asset = faces[face];
      if (asset && sources.some((s) => s.id === asset.sourceId)) {
        dispatch(
          openCropModal({
            face,
            sourceId: asset.sourceId,
            settings: asset.crop,
          }),
        );
      }
    },
    [dispatch, faces, sources],
  );

  const handleGuideChange = useCallback(
    (checked: boolean) => dispatch(setShowDielineGuides(checked)),
    [dispatch],
  );

  return (
    <CollapsibleSection
      className="dieline-section"
      eyebrow="Flat dieline"
      isOpen={openSections.dieline}
      title="Fill exterior faces"
      trailing={`${uploadedCount}/6`}
      onToggle={() => dispatch(toggleSection("dieline"))}
    >
      <DielineGuideToolbar
        checked={showDielineGuides}
        onChange={handleGuideChange}
      />

      <DielineRenderer
        busyFace={busyFace}
        dimensions={dimensions}
        faces={faces}
        selectedSourceId={selectedSourceId}
        showPrintGuides={showDielineGuides}
        onApplySelected={handleApplySelected}
        onClear={onClear}
        onCrop={handleCrop}
        onUpload={onUpload}
      />

      <p className="helper-text">
        Hover a side to upload, reuse the selected artwork, crop, or delete the
        assigned image.
      </p>
    </CollapsibleSection>
  );
}
