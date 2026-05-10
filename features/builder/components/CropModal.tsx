"use client";

import { useMemo, useRef, useState } from "react";
import { ImageRestriction, type Coordinates, type CropperState } from "advanced-cropper";
import { Cropper, type CropperRef } from "react-advanced-cropper";
import {
  FlipHorizontal2,
  FlipVertical2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { getPackagingTemplate, type CartonDimensions, type FaceKey } from "@/domain/packaging";
import { normalizeCropSettings, type CropSettings } from "@/features/artwork/artwork";
import type { ArtworkSource } from "@/store/artworkSlice";

/* ── Props ─────────────────────────────────────────────────────── */

type CropModalProps = {
  dimensions: CartonDimensions;
  face: FaceKey;
  initialSettings: CropSettings;
  source: ArtworkSource | undefined;
  onApply: (settings: CropSettings) => void;
  onCancel: () => void;
};

/* ── Component ─────────────────────────────────────────────────── */

/**
 * Full-screen modal for cropping artwork before applying to a face.
 * Manages its own local cropper state — does not use Redux.
 */
export function CropModal({
  dimensions,
  face,
  initialSettings,
  source,
  onApply,
  onCancel,
}: CropModalProps) {
  const cropperRef = useRef<CropperRef>(null);

  const initialCrop = useMemo(
    () => normalizeCropSettings(initialSettings),
    [initialSettings],
  );

  const [settings, setSettings] = useState<CropSettings>(initialCrop);

  const spec = getPackagingTemplate().getFaceSpecs(dimensions)[face];
  const targetAspect = spec.artworkWidth / spec.artworkHeight;

  const defaultCoordinates = useMemo(
    () => createDefaultCropCoordinates(initialCrop.coordinates, targetAspect),
    [initialCrop.coordinates, targetAspect],
  );

  const transformState = settings.transforms;

  /* ── Cropper sync helpers ────────────────────────────────────── */

  function syncCropperSettings(cropper = cropperRef.current) {
    if (cropper) {
      setSettings(readCropperSettings(cropper));
    }
  }

  function updateCropper(action: (cropper: CropperRef) => void) {
    const cropper = cropperRef.current;
    if (!cropper) return;

    action(cropper);
    window.requestAnimationFrame(() => syncCropperSettings(cropper));
  }

  function resetCrop() {
    updateCropper((cropper) => cropper.reset());
  }

  function rotateCrop() {
    updateCropper((cropper) => cropper.rotateImage(90));
  }

  function toggleFlip(axis: "horizontal" | "vertical") {
    updateCropper((cropper) =>
      cropper.flipImage(axis === "horizontal", axis === "vertical"),
    );
  }

  function zoomCrop(factor: number) {
    updateCropper((cropper) => cropper.zoomImage(factor));
  }

  function applyCurrentCrop() {
    const cropper = cropperRef.current;
    onApply(cropper ? readCropperSettings(cropper) : settings);
  }

  if (!source) return null;

  return (
    <div
      className="crop-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Crop ${spec.label} artwork`}
    >
      <div className="crop-dialog">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="crop-header">
          <div>
            <span className="eyebrow">{spec.label} crop</span>
            <h2>{source.fileName}</h2>
          </div>
          <div className="crop-header-actions">
            <button
              className="icon-button"
              title="Reset crop"
              type="button"
              onClick={resetCrop}
            >
              <RotateCcw aria-hidden size={18} />
            </button>
          </div>
        </div>

        {/* ── Tool bar ────────────────────────────────────────── */}
        <div className="crop-tools" aria-label="Crop tools">
          <button
            className="crop-tool-button"
            title="Rotate 90 degrees"
            type="button"
            onClick={rotateCrop}
          >
            <RotateCw aria-hidden size={17} />
            Rotate
          </button>
          <button
            className={`crop-tool-button ${transformState.flip.horizontal ? "is-active" : ""}`}
            title="Reflect horizontally"
            type="button"
            onClick={() => toggleFlip("horizontal")}
          >
            <FlipHorizontal2 aria-hidden size={17} />
            Reflect X
          </button>
          <button
            className={`crop-tool-button ${transformState.flip.vertical ? "is-active" : ""}`}
            title="Reflect vertically"
            type="button"
            onClick={() => toggleFlip("vertical")}
          >
            <FlipVertical2 aria-hidden size={17} />
            Reflect Y
          </button>
          <button
            className="crop-tool-button"
            title="Zoom out"
            type="button"
            onClick={() => zoomCrop(0.88)}
          >
            <ZoomOut aria-hidden size={17} />
            Zoom out
          </button>
          <button
            className="crop-tool-button"
            title="Zoom in"
            type="button"
            onClick={() => zoomCrop(1.12)}
          >
            <ZoomIn aria-hidden size={17} />
            Zoom in
          </button>
        </div>

        {/* ── Cropper ─────────────────────────────────────────── */}
        <Cropper
          ref={cropperRef}
          className="crop-preview"
          defaultCoordinates={defaultCoordinates}
          defaultTransforms={initialCrop.transforms}
          imageRestriction={ImageRestriction.none}
          minHeight={24}
          minWidth={24}
          src={source.dataUrl}
          stencilProps={{
            aspectRatio: targetAspect,
            className: "crop-stencil",
            draggableAreaClassName: "crop-stencil-drag",
            grid: true,
            gridClassName: "crop-stencil-grid",
            handlerClassNames: { default: "crop-stencil-handler" },
            lineClassNames: { default: "crop-stencil-line" },
            lines: { east: false, north: false, south: false, west: false },
            movable: true,
            overlayClassName: "crop-stencil-overlay",
            previewClassName: "crop-stencil-preview",
            resizable: true,
          }}
          transitions
          onChange={syncCropperSettings}
          onReady={syncCropperSettings}
        />

        {/* ── Status bar ──────────────────────────────────────── */}
        <div className="crop-status">
          <span>
            Output {spec.artworkWidth} x {spec.artworkHeight} mm
          </span>
          <span>
            Crop{" "}
            {Math.round(settings.coordinates?.width ?? 0)} x{" "}
            {Math.round(settings.coordinates?.height ?? 0)} px
          </span>
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="crop-footer">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={applyCurrentCrop}
          >
            Apply crop
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Pure helpers (no React) ─────────────────────────────────── */

function readCropperSettings(cropper: CropperRef): CropSettings {
  return normalizeCropSettings({
    coordinates: cropper.getCoordinates(),
    transforms: cropper.getTransforms(),
  });
}

function createDefaultCropCoordinates(
  savedCoordinates: Coordinates | null,
  targetAspect: number,
) {
  return (state: CropperState): Coordinates => {
    if (savedCoordinates) {
      return fitCoordinatesToAspect(
        savedCoordinates,
        targetAspect,
        state.imageSize.width,
        state.imageSize.height,
      );
    }

    return createCenteredCropCoordinates(
      state.imageSize.width,
      state.imageSize.height,
      targetAspect,
      0.8,
    );
  };
}

function createCenteredCropCoordinates(
  sourceWidth: number,
  sourceHeight: number,
  targetAspect: number,
  scale: number,
): Coordinates {
  const safeScale = Math.min(0.9, Math.max(0.2, scale));
  const maxWidth = sourceWidth * safeScale;
  const maxHeight = sourceHeight * safeScale;
  let width = maxWidth;
  let height = width / targetAspect;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * targetAspect;
  }

  return {
    height,
    left: (sourceWidth - width) / 2,
    top: (sourceHeight - height) / 2,
    width,
  };
}

function fitCoordinatesToAspect(
  coordinates: Coordinates,
  targetAspect: number,
  sourceWidth: number,
  sourceHeight: number,
): Coordinates {
  if (
    Math.abs(coordinates.width / coordinates.height - targetAspect) < 0.001
  ) {
    return {
      height: Math.max(1, coordinates.height),
      left: coordinates.left,
      top: coordinates.top,
      width: Math.max(1, coordinates.width),
    };
  }

  const centerX = coordinates.left + coordinates.width / 2;
  const centerY = coordinates.top + coordinates.height / 2;
  let width = Math.min(coordinates.width, sourceWidth);
  let height = width / targetAspect;

  if (height > Math.min(coordinates.height, sourceHeight)) {
    height = Math.min(coordinates.height, sourceHeight);
    width = height * targetAspect;
  }

  width = Math.min(width, sourceWidth);
  height = Math.min(height, sourceHeight);

  const left = Math.min(
    sourceWidth - width,
    Math.max(0, centerX - width / 2),
  );
  const top = Math.min(
    sourceHeight - height,
    Math.max(0, centerY - height / 2),
  );

  return {
    height: Math.max(1, height),
    left,
    top,
    width: Math.max(1, width),
  };
}
