"use client";

import { useCallback } from "react";
import { FileUp, RotateCcw } from "lucide-react";

import type { FaceKey } from "@/domain/packaging";
import { DEFAULT_CROP_SETTINGS } from "@/features/artwork/artwork";
import { useDielineImport } from "@/hooks/useDielineImport";
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
  const { importDielineFile, useTemplateDieline } = useDielineImport();

  const dimensions = useAppSelector((s) => s.builder.dimensions);
  const dielineSource = useAppSelector((s) => s.builder.dielineSource);
  const dielineFileName = useAppSelector((s) => s.builder.dielineFileName);
  const dielineGraph = useAppSelector((s) => s.builder.dielineGraph);
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

      <div className="dieline-import-row">
        <label className="secondary-button dieline-import-button" title="Import SVG dieline">
          <FileUp aria-hidden size={16} />
          Import SVG
          <input
            accept=".svg,image/svg+xml"
            type="file"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) {
                void importDielineFile(file);
              }
            }}
          />
        </label>

        {dielineSource === "svg-upload" ? (
          <button className="secondary-button dieline-template-button" type="button" onClick={useTemplateDieline}>
            <RotateCcw aria-hidden size={16} />
            Template
          </button>
        ) : null}
      </div>

      {dielineSource === "svg-upload" ? (
        <p className="dieline-source-note">
          Imported: <strong>{dielineFileName || "custom dieline"}</strong>
        </p>
      ) : null}

      <DielineRenderer
        busyFace={busyFace}
        dimensions={dimensions}
        graph={dielineGraph}
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
