"use client";

import { memo, useId, useMemo } from "react";
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
  PRINT_GUIDE_OFFSETS,
  getPackagingTemplate,
  type CartonDimensions,
  type FaceKey,
  type FaceSpec,
} from "@/domain/packaging";
import type { DielineFace, DielineGraph } from "@/domain/dieline/types";
import { getFaceKeyFromGraphFaceId } from "@/domain/dieline/compat";
import type { FaceAssets } from "@/store/artworkSlice";

type DielineRendererProps = {
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

type RenderableFace = {
  asset: FaceAssets[FaceKey];
  face: DielineFace;
  faceKey: FaceKey;
  inputId: string;
  isBusy: boolean;
  spec: FaceSpec;
};

export const DielineRenderer = memo(function DielineRenderer({
  busyFace,
  dimensions,
  faces,
  selectedSourceId,
  showPrintGuides,
  onApplySelected,
  onClear,
  onCrop,
  onUpload,
}: DielineRendererProps) {
  const rawId = useId();
  const idPrefix = useMemo(() => rawId.replace(/[^a-zA-Z0-9_-]/g, ""), [rawId]);
  const template = getPackagingTemplate();
  const graph = useMemo(() => template.getDielineGraph(dimensions), [dimensions, template]);
  const faceSpecs = useMemo(() => template.getFaceSpecs(dimensions), [dimensions, template]);
  const renderableFaces = useMemo(
    () =>
      graph.faces.flatMap<RenderableFace>((face) => {
        const faceKey = getFaceKeyFromGraphFaceId(face.id);

        if (!faceKey) {
          return [];
        }

        return [
          {
            asset: faces[faceKey],
            face,
            faceKey,
            inputId: `${idPrefix}-face-upload-${faceKey}`,
            isBusy: busyFace === faceKey,
            spec: faceSpecs[faceKey],
          },
        ];
      }),
    [busyFace, faceSpecs, faces, graph.faces, idPrefix],
  );

  return (
    <div className="dieline-fit">
      <div
        className="dieline-board dieline-renderer"
        style={{ aspectRatio: `${graph.size.width} / ${graph.size.height}` }}
      >
        <svg
          aria-label="Flat dieline artwork preview"
          className="dieline-svg"
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${graph.size.width} ${graph.size.height}`}
        >
          <defs>
            {renderableFaces.map(({ face }) => (
              <clipPath id={getClipPathId(idPrefix, face.id)} key={face.id}>
                <polygon points={getPolygonPoints(face)} />
              </clipPath>
            ))}
          </defs>

          <g className="dieline-face-fill-layer">
            {renderableFaces.map(({ asset, face }) => (
              <polygon
                className={`dieline-face-fill ${asset ? "is-filled" : ""}`}
                key={face.id}
                points={getPolygonPoints(face)}
              />
            ))}
          </g>

          <g className="dieline-artwork-layer">
            {renderableFaces.map(({ asset, face, spec }) =>
              asset ? (
                <ArtworkImage
                  assetUrl={asset.dataUrl}
                  face={face}
                  idPrefix={idPrefix}
                  isRotated={spec.width !== spec.artworkWidth || spec.height !== spec.artworkHeight}
                  key={face.id}
                />
              ) : null,
            )}
          </g>

          {showPrintGuides ? <GraphGuideLayer graph={graph} /> : null}
        </svg>

        {renderableFaces.map(({ asset, face, faceKey, inputId, isBusy, spec }) => (
          <div
            className={`dieline-face-hotspot ${asset ? "is-filled" : ""}`}
            key={face.id}
            style={getHotspotStyle(face, graph)}
          >
            <input
              accept="image/png,image/jpeg,application/pdf"
              aria-label={`Upload ${face.label} artwork`}
              disabled={Boolean(busyFace)}
              id={inputId}
              type="file"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) onUpload(faceKey, file);
              }}
            />

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
              <strong>{face.label}</strong>
              <span className="face-file">
                {asset ? asset.fileName : `${spec.artworkWidth} x ${spec.artworkHeight} mm`}
              </span>
            </span>

            <div className="face-actions" aria-label={`${face.label} actions`}>
              <button
                className="face-action"
                disabled={!selectedSourceId || Boolean(busyFace)}
                title="Use selected artwork"
                type="button"
                onClick={() => onApplySelected(faceKey)}
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
                    onClick={() => onCrop(faceKey)}
                  >
                    <Crop aria-hidden size={15} />
                  </button>
                  <button
                    className="face-action danger"
                    disabled={Boolean(busyFace)}
                    title="Delete this side image"
                    type="button"
                    onClick={() => onClear(faceKey)}
                  >
                    <Trash2 aria-hidden size={15} />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

function ArtworkImage({
  assetUrl,
  face,
  idPrefix,
  isRotated,
}: {
  assetUrl: string;
  face: DielineFace;
  idPrefix: string;
  isRotated: boolean;
}) {
  const clipPath = `url(#${getClipPathId(idPrefix, face.id)})`;
  const { bounds } = face;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  if (isRotated) {
    const imageWidth = bounds.height;
    const imageHeight = bounds.width;

    return (
      <g clipPath={clipPath}>
        <image
          className="dieline-face-artwork"
          height={imageHeight}
          href={assetUrl}
          preserveAspectRatio="xMidYMid slice"
          transform={`rotate(90 ${centerX} ${centerY})`}
          width={imageWidth}
          x={centerX - imageWidth / 2}
          y={centerY - imageHeight / 2}
        />
      </g>
    );
  }

  return (
    <image
      className="dieline-face-artwork"
      clipPath={clipPath}
      height={bounds.height}
      href={assetUrl}
      preserveAspectRatio="xMidYMid slice"
      width={bounds.width}
      x={bounds.x}
      y={bounds.y}
    />
  );
}

function GraphGuideLayer({ graph }: { graph: DielineGraph }) {
  return (
    <g className="dieline-graph-guides">
      <g>
        {graph.faces.map((face) => {
          const bleed = getResponsiveGuideOffset(PRINT_GUIDE_OFFSETS.bleed, face.bounds.width, face.bounds.height);
          const safe = getResponsiveGuideOffset(PRINT_GUIDE_OFFSETS.safe, face.bounds.width, face.bounds.height);

          return (
            <g key={face.id}>
              <rect
                className="dieline-guide-rect dieline-guide-bleed"
                height={Math.min(graph.size.height - Math.max(0, face.bounds.y - bleed), face.bounds.height + bleed * 2)}
                width={Math.min(graph.size.width - Math.max(0, face.bounds.x - bleed), face.bounds.width + bleed * 2)}
                x={Math.max(0, face.bounds.x - bleed)}
                y={Math.max(0, face.bounds.y - bleed)}
              />
              <rect
                className="dieline-guide-rect dieline-guide-safe"
                height={Math.max(1, face.bounds.height - safe * 2)}
                width={Math.max(1, face.bounds.width - safe * 2)}
                x={face.bounds.x + safe}
                y={face.bounds.y + safe}
              />
            </g>
          );
        })}
      </g>

      <g>
        {graph.cutPaths.map((cutPath) => (
          <path className="dieline-guide-line dieline-guide-cut" d={cutPath.d} key={cutPath.id} />
        ))}
      </g>

      <g>
        {graph.creases.map((crease) => (
          <line
            className="dieline-guide-line dieline-guide-fold"
            key={crease.id}
            x1={crease.edgeStart.x}
            x2={crease.edgeEnd.x}
            y1={crease.edgeStart.y}
            y2={crease.edgeEnd.y}
          />
        ))}
      </g>

      <g>
        {graph.faces.map((face) => (
          <text className="dieline-guide-label" key={face.id} x={face.centroid.x} y={face.centroid.y}>
            {face.label} {Math.round(face.bounds.width)} x {Math.round(face.bounds.height)} mm
          </text>
        ))}
      </g>
    </g>
  );
}

function getClipPathId(idPrefix: string, faceId: string): string {
  return `${idPrefix}-clip-${faceId}`;
}

function getPolygonPoints(face: DielineFace): string {
  return face.vertices.map((vertex) => `${vertex.x},${vertex.y}`).join(" ");
}

function getHotspotStyle(face: DielineFace, graph: DielineGraph) {
  return {
    height: `${(face.bounds.height / graph.size.height) * 100}%`,
    left: `${(face.bounds.x / graph.size.width) * 100}%`,
    top: `${(face.bounds.y / graph.size.height) * 100}%`,
    width: `${(face.bounds.width / graph.size.width) * 100}%`,
  };
}

function getResponsiveGuideOffset(offset: number, width: number, height: number): number {
  return Math.min(offset, Math.max(1, Math.floor(Math.min(width, height) / 5)));
}
