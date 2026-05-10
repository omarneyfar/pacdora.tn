"use client";

import { useCallback } from "react";
import {
  Box,
  Check,
  Copy,
  ExternalLink,
  FolderOpen,
  Link,
  LoaderCircle,
  Save,
} from "lucide-react";

import type { ProjectStatus } from "@/domain/packaging";
import { useAppDispatch, useAppSelector } from "@/store";
import { markChanged, setProjectName, setProjectStatus } from "@/store/builderSlice";
import { clearShareUrl } from "@/store/uiSlice";
import { StatusControl } from "../components/StatusControl";

/* ── Props ─────────────────────────────────────────────────────── */

type BuilderTopbarProps = {
  onSave: () => Promise<unknown>;
  onPublish: () => Promise<void>;
  copyShareUrl: () => Promise<void>;
};

/* ── Component ─────────────────────────────────────────────────── */

/**
 * Top navigation bar for the builder — brand, project name input,
 * status toggle, save/publish buttons, and share URL display.
 */
export function BuilderTopbar({ onSave, onPublish, copyShareUrl }: BuilderTopbarProps) {
  const dispatch = useAppDispatch();

  const projectId = useAppSelector((s) => s.builder.projectId);
  const projectName = useAppSelector((s) => s.builder.projectName);
  const projectStatus = useAppSelector((s) => s.builder.projectStatus);
  const dimensions = useAppSelector((s) => s.builder.dimensions);
  const saveStatus = useAppSelector((s) => s.builder.saveStatus);
  const isProjectSaving = useAppSelector((s) => s.builder.isProjectSaving);
  const isSharing = useAppSelector((s) => s.builder.isSharing);
  const isProjectLoading = useAppSelector((s) => s.builder.isProjectLoading);

  const busyFace = useAppSelector((s) => s.artwork.busyFace);
  const isRecropping = useAppSelector((s) => s.artwork.isRecropping);
  const uploadedCount = Object.keys(useAppSelector((s) => s.artwork.faces)).length;

  const shareUrl = useAppSelector((s) => s.ui.shareUrl);
  const copied = useAppSelector((s) => s.ui.copied);

  const canSave = !busyFace && !isProjectLoading && !isProjectSaving && !isRecropping && !isSharing;
  const canShare = uploadedCount > 0 && canSave;

  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(markChanged());
      dispatch(setProjectName(event.currentTarget.value));
    },
    [dispatch],
  );

  const handleStatusChange = useCallback(
    (status: ProjectStatus) => {
      if (status === projectStatus) return;
      dispatch(clearShareUrl());
      dispatch(setProjectStatus(status));
      dispatch(markChanged());
    },
    [dispatch, projectStatus],
  );

  const saveStatusLabel = getSaveStatusLabel(saveStatus);

  return (
    <header className="topbar">
      {/* ── Brand ──────────────────────────────────────────────── */}
      <div className="brand">
        <span className="brand-mark">
          <Box aria-hidden size={19} />
        </span>
        <div className="brand-copy">
          <h1>FoldView</h1>
          <input
            aria-label="Project name"
            className="project-name-input"
            value={projectName}
            onChange={handleNameChange}
          />
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────────── */}
      <div className="header-actions">
        <div className="dimension-pill">
          {dimensions.width} x {dimensions.depth} x {dimensions.height} mm
        </div>

        <StatusControl
          disabled={!canSave}
          value={projectStatus}
          onChange={handleStatusChange}
        />

        <a className="secondary-button header-projects-button" href="/projects">
          <FolderOpen aria-hidden size={18} />
          Projects
        </a>

        {saveStatusLabel ? (
          <span className="save-status">{saveStatusLabel}</span>
        ) : null}

        <button
          className="secondary-button header-save-button"
          disabled={!canSave}
          type="button"
          onClick={() => onSave()}
        >
          {isProjectSaving ? (
            <LoaderCircle aria-hidden className="spin" size={18} />
          ) : (
            <Save aria-hidden size={18} />
          )}
          {projectId ? "Save" : "Save project"}
        </button>

        <button
          className="primary-button header-share-button"
          disabled={!canShare}
          type="button"
          onClick={onPublish}
        >
          {isSharing ? (
            <LoaderCircle aria-hidden className="spin" size={18} />
          ) : (
            <Link aria-hidden size={18} />
          )}
          Publish
        </button>

        {/* ── Share URL display ────────────────────────────────── */}
        {shareUrl ? (
          <div className="header-share-result">
            <input aria-label="Share URL" readOnly value={shareUrl} />
            <button
              className="icon-button"
              title="Copy link"
              type="button"
              onClick={copyShareUrl}
            >
              {copied ? (
                <Check aria-hidden size={18} />
              ) : (
                <Copy aria-hidden size={18} />
              )}
            </button>
            <a
              className="icon-button"
              href={shareUrl}
              rel="noreferrer"
              target="_blank"
              title="Open shared viewer"
            >
              <ExternalLink aria-hidden size={18} />
            </a>
          </div>
        ) : null}
      </div>
    </header>
  );
}

/* ── Helpers ──────────────────────────────────────────────────── */

function getSaveStatusLabel(status: string): string {
  switch (status) {
    case "saved":
      return "Saved";
    case "published":
      return "Published";
    case "unsaved":
      return "Unsaved changes";
    case "saving":
      return "Saving…";
    default:
      return "";
  }
}
