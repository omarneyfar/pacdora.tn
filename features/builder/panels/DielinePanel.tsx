"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Library, LoaderCircle, RotateCcw } from "lucide-react";

import {
  DIELINE_CATEGORY_ORDER,
  getDielineCategory,
  getDielineCategoryLabel,
  getDielineFamilyLabel,
  getDielineParts,
} from "@/domain/dieline/structure";
import type { DielineCategory } from "@/domain/dieline/types";
import type { FaceKey } from "@/domain/packaging";
import type { DielineTemplate } from "@/domain/dielines";
import { DEFAULT_CROP_SETTINGS } from "@/features/artwork/artwork";
import { listDielines } from "@/features/dielines/dielineClient";
import { useAppDispatch, useAppSelector } from "@/store";
import { markChanged, resetDieline, setLibraryDieline } from "@/store/builderSlice";
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
  const dielineSource = useAppSelector((s) => s.builder.dielineSource);
  const dielineTemplateId = useAppSelector((s) => s.builder.dielineTemplateId);
  const dielineTemplateName = useAppSelector((s) => s.builder.dielineTemplateName);
  const dielineFileName = useAppSelector((s) => s.builder.dielineFileName);
  const dielineGraph = useAppSelector((s) => s.builder.dielineGraph);
  const faces = useAppSelector((s) => s.artwork.faces);
  const sources = useAppSelector((s) => s.artwork.sources);
  const busyFace = useAppSelector((s) => s.artwork.busyFace);
  const selectedSourceId = useAppSelector((s) => s.artwork.selectedSourceId);

  const openSections = useAppSelector((s) => s.ui.openSections);
  const showDielineGuides = useAppSelector((s) => s.ui.showDielineGuides);

  const uploadedCount = Object.keys(faces).length;
  const [templates, setTemplates] = useState<DielineTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templateError, setTemplateError] = useState("");
  const groupedTemplates = useMemo(() => groupTemplatesByCategory(templates), [templates]);
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === dielineTemplateId),
    [dielineTemplateId, templates],
  );

  useEffect(() => {
    let isMounted = true;

    listDielines({ limit: 24, status: "ready" })
      .then((nextTemplates) => {
        if (isMounted) {
          setTemplates(nextTemplates);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setTemplateError(error instanceof Error ? error.message : "Could not load dielines.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingTemplates(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleTemplateChange = useCallback(
    (templateId: string) => {
      if (!templateId) {
        dispatch(resetDieline());
        dispatch(markChanged());
        return;
      }

      const template = templates.find((candidate) => candidate.id === templateId);
      if (!template) {
        return;
      }

      dispatch(
        setLibraryDieline({
          templateId: template.id,
          name: template.name,
          fileName: template.fileName,
          graph: template.graph,
        }),
      );
      dispatch(markChanged());
    },
    [dispatch, templates],
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

      <div className="dieline-library-picker">
        <label>
          <span>Prepared dieline</span>
          <select value={dielineSource === "library" ? dielineTemplateId : ""} onChange={(event) => handleTemplateChange(event.currentTarget.value)}>
            <option value="">Default folding carton</option>
            {groupedTemplates.map((group) => (
              <optgroup key={group.category} label={group.label}>
                {group.templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="dieline-library-actions">
          <Link className="secondary-button dieline-library-link" href="/dielines">
            <Library aria-hidden size={16} />
            Library
          </Link>
          {dielineSource !== "template" ? (
            <button className="secondary-button dieline-template-button" type="button" onClick={() => handleTemplateChange("")}>
              <RotateCcw aria-hidden size={16} />
              Default
            </button>
          ) : null}
        </div>
      </div>

      {isLoadingTemplates ? (
        <p className="dieline-source-note">
          <LoaderCircle aria-hidden className="spin" size={13} /> Loading dielines
        </p>
      ) : null}
      {templateError ? <p className="dieline-source-note error-state">{templateError}</p> : null}

      {dielineSource === "library" ? (
        <>
          <p className="dieline-source-note">
            Using: <strong>{dielineTemplateName || dielineFileName || "library dieline"}</strong>
          </p>
          {selectedTemplate ? (
            <p className="dieline-source-note">
              {getDielineFamilyLabel(selectedTemplate.graph)} / {getDielineParts(selectedTemplate.graph).length} structural parts
            </p>
          ) : null}
        </>
      ) : dielineSource === "svg-upload" ? (
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

function groupTemplatesByCategory(templates: DielineTemplate[]): Array<{
  category: DielineCategory;
  label: string;
  templates: DielineTemplate[];
}> {
  const groups = new Map<DielineCategory, DielineTemplate[]>();

  for (const template of templates) {
    const category = getDielineCategory(template.graph);
    groups.set(category, [...(groups.get(category) ?? []), template]);
  }

  return DIELINE_CATEGORY_ORDER
    .filter((category) => groups.has(category))
    .map((category) => ({
      category,
      label: getDielineCategoryLabel(category),
      templates: groups.get(category) ?? [],
    }));
}
