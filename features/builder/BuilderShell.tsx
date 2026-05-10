"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import { LoaderCircle } from "lucide-react";

import { FACE_KEYS, type FaceKey } from "@/domain/packaging";
import { getDielineGraph } from "@/domain/packaging";
import { useAppDispatch, useAppSelector } from "@/store";
import { useProjectPersistence } from "@/hooks/useProjectPersistence";
import { useArtworkWorkspace } from "@/hooks/useArtworkWorkspace";
import { useDimensionSync } from "@/hooks/useDimensionSync";
import { useInitialDieline } from "@/hooks/useInitialDieline";
import { useShareLink } from "@/hooks/useShareLink";
import { closeCropModal } from "@/store/uiSlice";

import { BuilderTopbar } from "./toolbar/BuilderTopbar";
import { ParametersPanel } from "./panels/ParametersPanel";
import { DielinePanel } from "./panels/DielinePanel";
import { CropModal } from "./components/CropModal";

const CartonStage = dynamic(
  () => import("@/features/builder/CartonStage").then((mod) => mod.CartonStage),
  {
    ssr: false,
    loading: () => <div className="stage-loading">Preparing 3D preview</div>,
  },
);

const DielineCartonStage = dynamic(
  () => import("@/features/builder/DielineCartonStage").then((mod) => mod.DielineCartonStage),
  {
    ssr: false,
    loading: () => <div className="stage-loading">Preparing 3D preview</div>,
  },
);

/* ── Component ─────────────────────────────────────────────────── */

/**
 * Root builder shell — pure layout orchestration.
 * All business logic lives in hooks; all rendering lives in child components.
 */
export function BuilderShell({ projectId: initialProjectId, initialDielineId }: { projectId?: string; initialDielineId?: string } = {}) {
  /* ── Hooks ─────────────────────────────────────────────────────── */

  const dispatch = useAppDispatch();
  const { saveProject, suppressDimSyncRef } = useProjectPersistence(initialProjectId);
  const { handleUpload, applySourceToFace, clearFace } = useArtworkWorkspace();
  const { createShareLink, copyShareUrl } = useShareLink(saveProject);

  useDimensionSync(suppressDimSyncRef);
  useInitialDieline(initialDielineId);

  /* ── State from Redux ──────────────────────────────────────────── */

  const isProjectLoading = useAppSelector((s) => s.builder.isProjectLoading);
  const dimensions = useAppSelector((s) => s.builder.dimensions);
  const dielineGraph = useAppSelector((s) => s.builder.dielineGraph);
  const faces = useAppSelector((s) => s.artwork.faces);
  const sources = useAppSelector((s) => s.artwork.sources);
  const selectedSource = useAppSelector((s) =>
    s.artwork.sources.find((src) => src.id === s.artwork.selectedSourceId),
  );
  const error = useAppSelector((s) => s.ui.error);
  const cropModal = useAppSelector((s) => s.ui.cropModal);

  /* ── Derived values ─────────────────────────────────────────────── */

  const previewFaces = useMemo(
    () =>
      FACE_KEYS.reduce<Partial<Record<FaceKey, string>>>((acc, face) => {
        const asset = faces[face];
        if (asset) acc[face] = asset.dataUrl;
        return acc;
      }, {}),
    [faces],
  );

  /** Use DielineCartonStage for custom dielines, legacy CartonStage for default template */
  const activeGraph = useMemo(
    () => dielineGraph ?? getDielineGraph(dimensions),
    [dielineGraph, dimensions],
  );
  const useCustom3D = Boolean(dielineGraph);

  /* ── Callbacks ──────────────────────────────────────────────────── */

  const handleCropApply = useCallback(
    async (settings: Parameters<typeof applySourceToFace>[2]) => {
      if (!cropModal) return;
      await applySourceToFace(cropModal.face, cropModal.sourceId, settings);
      dispatch(closeCropModal());
    },
    [cropModal, applySourceToFace, dispatch],
  );

  const handleCropCancel = useCallback(() => {
    dispatch(closeCropModal());
  }, [dispatch]);

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <main className="app-shell">
      <BuilderTopbar
        onSave={() => saveProject()}
        onPublish={createShareLink}
        copyShareUrl={copyShareUrl}
      />

      {isProjectLoading ? (
        <section className="builder-loading">
          <div className="empty-state">
            <LoaderCircle aria-hidden className="spin" size={26} />
            Opening project
          </div>
        </section>
      ) : (
        <section className="builder-grid">
          {/* ── Sidebar ──────────────────────────────────────── */}
          <aside className="tool-panel" aria-label="Parameters">
            <ParametersPanel />

            <DielinePanel
              onUpload={handleUpload}
              onClear={clearFace}
            />

            {error ? (
              <div className="sidebar-error error-banner">{error}</div>
            ) : null}
          </aside>

          {/* ── 3D Preview ───────────────────────────────────── */}
          <section className="viewer-panel" aria-label="3D carton preview">
            <div className="viewer-toolbar">
              <div>
                <span className="eyebrow">Live 3D preview</span>
                <h2>Rotate and inspect the carton</h2>
              </div>
              <span className="viewer-hint">
                {selectedSource
                  ? `Selected: ${selectedSource.fileName}`
                  : useCustom3D
                    ? `Custom dieline · ${activeGraph.faces.length} faces`
                    : "Drag to rotate"}
              </span>
            </div>
            {useCustom3D ? (
              <DielineCartonStage graph={activeGraph} faces={previewFaces} />
            ) : (
              <CartonStage dimensions={dimensions} faces={previewFaces} />
            )}
          </section>
        </section>
      )}

      {/* ── Crop Modal ───────────────────────────────────────── */}
      {cropModal ? (
        <CropModal
          key={`${cropModal.face}-${cropModal.sourceId}`}
          dimensions={dimensions}
          dielineGraph={dielineGraph}
          face={cropModal.face}
          initialSettings={cropModal.settings}
          source={sources.find((s) => s.id === cropModal.sourceId)}
          onApply={handleCropApply}
          onCancel={handleCropCancel}
        />
      ) : null}
    </main>
  );
}
