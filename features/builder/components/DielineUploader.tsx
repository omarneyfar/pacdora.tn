"use client";

/* eslint-disable @next/next/no-img-element */

import { memo, useMemo } from "react";
import {
  Crop,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Paintbrush,
  Trash2,
  Upload,
} from "lucide-react";

import {
  FACE_KEYS,
  getPackagingTemplate,
  type CartonDimensions,
  type FaceKey,
} from "@/domain/packaging";
import type { FaceAssets } from "@/store/artworkSlice";
import { DielineGuideOverlay } from "./DielineGuideOverlay";

/* ── Props ─────────────────────────────────────────────────────── */

type DielineUploaderProps = {
  busyFace: FaceKey | null;
  dimensions: CartonDimensions;
  faces: FaceAssets;
  selectedSourceId: string;
  showPrintGuides: boolean;
  onApplySelected: (face: FaceKey) => void;
  onClear: (face: FaceKey) => void;
  onCrop: (face: FaceKey) => void;
  onUpload: (face: FaceKey, file: File) => void;
};

/* ── Component ─────────────────────────────────────────────────── */

/**
 * Visual flat dieline board with per-face upload, crop, apply, and delete actions.
 * Each face is positioned proportionally within the dieline layout.
 *
 * Memoized — the most expensive component in the sidebar.
 */
export const DielineUploader = memo(function DielineUploader({
  busyFace,
  dimensions,
  faces,
  selectedSourceId,
  showPrintGuides,
  onApplySelected,
  onClear,
  onCrop,
  onUpload,
}: DielineUploaderProps) {
  const dielineSpec = useMemo(
    () => getPackagingTemplate().getDielineSpec(dimensions),
    [dimensions],
  );

  const { size: dielineSize, faces: faceSpecs } = dielineSpec;

  return (
    <div className="dieline-fit">
      <div
        className="dieline-board"
        style={{ aspectRatio: `${dielineSize.width} / ${dielineSize.height}` }}
      >
        {FACE_KEYS.map((face) => {
          const spec = faceSpecs[face];
          const asset = faces[face];
          const isBusy = busyFace === face;
          const inputId = `face-upload-${face}`;
          const isRotatedOnDieline =
            spec.width !== spec.artworkWidth || spec.height !== spec.artworkHeight;

          const style = {
            left: `${(spec.x / dielineSize.width) * 100}%`,
            top: `${(spec.y / dielineSize.height) * 100}%`,
            width: `${(spec.width / dielineSize.width) * 100}%`,
            height: `${(spec.height / dielineSize.height) * 100}%`,
          };

          return (
            <div
              className={`dieline-face ${asset ? "is-filled" : ""}`}
              key={face}
              style={style}
            >
              {/* Hidden file input */}
              <input
                accept="image/png,image/jpeg,application/pdf"
                aria-label={`Upload ${spec.label} artwork`}
                disabled={Boolean(busyFace)}
                id={inputId}
                type="file"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) onUpload(face, file);
                }}
              />

              {/* Artwork preview thumbnail */}
              {asset ? (
                <img
                  alt=""
                  className={`face-preview ${isRotatedOnDieline ? "is-rotated-on-dieline" : ""}`}
                  src={asset.dataUrl}
                />
              ) : null}

              {/* Face label and icon */}
              <span className="face-content">
                {isBusy ? (
                  <LoaderCircle aria-hidden className="spin" size={17} />
                ) : asset?.sourceType === "pdf" ? (
                  <FileText aria-hidden size={17} />
                ) : asset ? (
                  <ImageIcon aria-hidden size={17} />
                ) : (
                  <Upload aria-hidden size={17} />
                )}
                <strong>{spec.label}</strong>
                <span className="face-file">
                  {asset
                    ? asset.fileName
                    : `${spec.artworkWidth} x ${spec.artworkHeight} mm`}
                </span>
              </span>

              {/* Hover action bar */}
              <div
                className="face-actions"
                aria-label={`${spec.label} actions`}
              >
                <button
                  className="face-action"
                  disabled={!selectedSourceId || Boolean(busyFace)}
                  title="Use selected artwork"
                  type="button"
                  onClick={() => onApplySelected(face)}
                >
                  <Paintbrush aria-hidden size={15} />
                </button>

                <label
                  className="face-action"
                  htmlFor={inputId}
                  title={asset ? "Upload another image" : "Upload image"}
                >
                  <Upload aria-hidden size={15} />
                </label>

                {asset ? (
                  <>
                    <button
                      className="face-action"
                      disabled={Boolean(busyFace)}
                      title="Crop this side"
                      type="button"
                      onClick={() => onCrop(face)}
                    >
                      <Crop aria-hidden size={15} />
                    </button>
                    <button
                      className="face-action danger"
                      disabled={Boolean(busyFace)}
                      title="Delete this side image"
                      type="button"
                      onClick={() => onClear(face)}
                    >
                      <Trash2 aria-hidden size={15} />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}

        {showPrintGuides ? (
          <DielineGuideOverlay dimensions={dimensions} />
        ) : null}
      </div>
    </div>
  );
});
