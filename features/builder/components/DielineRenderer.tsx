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
  CartonDimensions,
  PRINT_GUIDE_OFFSETS,
  getPackagingTemplate,
} from "@/domain/packaging";
import { primitiveToSvgPath } from "@/domain/dieline/canonicalGeometry";
import type { DielineFace, DielineGraph, GeometryPrimitive } from "@/domain/dieline/types";
import type { FaceAsset, FaceAssets } from "@/store/artworkSlice";

type DielineRendererProps = {
  busyFace: string | null;
  dimensions: CartonDimensions;
  graph?: DielineGraph | null;
  faces: FaceAssets;
  selectedSourceId: string;
  showPrintGuides: boolean;
  onApplySelected: (face: string) => void;
  onClear: (face: string) => void;
  onCrop: (face: string) => void;
  onUpload: (face: string, file: File) => void;
};

type RenderableFace = {
  asset: FaceAsset | undefined;
  face: DielineFace;
  faceId: string;
  inputId: string;
  isBusy: boolean;
  isRotated: boolean;
  outputHeight: number;
  outputWidth: number;
};

export const DielineRenderer = memo(function DielineRenderer({
  busyFace,
  dimensions,
  graph: importedGraph,
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
  const graph = useMemo(() => importedGraph ?? template.getDielineGraph(dimensions), [dimensions, importedGraph, template]);
  const faceSpecs = useMemo(() => template.getFaceSpecs(dimensions), [dimensions, template]);
  const isImportedGraph = Boolean(importedGraph);
  const renderableFaces = useMemo(
    () =>
      graph.faces.flatMap<RenderableFace>((face) => {
        if (!face.artworkEnabled) {
          return [];
        }

        const spec = faceSpecs[face.id as keyof typeof faceSpecs];
        const outputWidth = isImportedGraph || !spec ? face.bounds.width : spec.artworkWidth;
        const outputHeight = isImportedGraph || !spec ? face.bounds.height : spec.artworkHeight;

        return [
          {
            asset: faces[face.id],
            face,
            faceId: face.id,
            inputId: `${idPrefix}-face-upload-${face.id}`,
            isBusy: busyFace === face.id,
            isRotated: !isImportedGraph && spec && (spec.width !== spec.artworkWidth || spec.height !== spec.artworkHeight),
            outputHeight,
            outputWidth,
          },
        ];
      }),
    [busyFace, faceSpecs, faces, graph.faces, idPrefix, isImportedGraph],
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
            {graph.faces.map((face) => {
              const hasAsset = Boolean(faces[face.id]);

              return (
                <polygon
                  className={`dieline-face-fill dieline-face-role-${face.role} ${hasAsset ? "is-filled" : ""}`}
                  key={face.id}
                  points={getPolygonPoints(face)}
                />
              );
            })}
          </g>

          <g className="dieline-artwork-layer">
            {renderableFaces.map(({ asset, face, isRotated }) =>
              asset ? (
                <ArtworkImage
                  assetUrl={asset.dataUrl}
                  face={face}
                  idPrefix={idPrefix}
                  isRotated={isRotated}
                  key={face.id}
                />
              ) : null,
            )}
          </g>

          {showPrintGuides ? <GraphGuideLayer graph={graph} /> : null}
        </svg>

        {renderableFaces.map(({ asset, face, faceId, inputId, isBusy, outputHeight, outputWidth }) => (
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
                if (file) onUpload(faceId, file);
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
                {asset ? asset.fileName : `${Math.round(outputWidth)} x ${Math.round(outputHeight)} mm`}
              </span>
            </span>

            <div className="face-actions" aria-label={`${face.label} actions`}>
              <button
                className="face-action"
                disabled={!selectedSourceId || Boolean(busyFace)}
                title="Use selected artwork"
                type="button"
                onClick={() => onApplySelected(faceId)}
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
                    onClick={() => onCrop(faceId)}
                  >
                    <Crop aria-hidden size={15} />
                  </button>
                  <button
                    className="face-action danger"
                    disabled={Boolean(busyFace)}
                    title="Delete this side image"
                    type="button"
                    onClick={() => onClear(faceId)}
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
  const geometricGuides = graph.geometry?.filter((primitive) => primitive.layer !== "label") ?? [];
  const labels = graph.geometry?.filter((primitive): primitive is Extract<GeometryPrimitive, { type: "label" }> => primitive.type === "label") ?? [];

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

      {geometricGuides.length > 0 ? (
        <g>
          {geometricGuides.map((primitive) => (
            <path className={getGuideClassName(primitive)} d={primitiveToSvgPath(primitive)} key={primitive.id} />
          ))}
        </g>
      ) : (
        <>
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
        </>
      )}

      <g>
        {(labels.length > 0 ? labels : graph.faces.map((face) => ({ id: `label-${face.id}`, position: face.centroid, text: `${face.label} ${Math.round(face.bounds.width)} x ${Math.round(face.bounds.height)} mm` }))).map((label) => (
          <text className="dieline-guide-label" key={label.id} x={label.position.x} y={label.position.y}>
            {label.text}
          </text>
        ))}
      </g>
    </g>
  );
}

function getGuideClassName(primitive: GeometryPrimitive): string {
  if (primitive.layer === "crease") return "dieline-guide-line dieline-guide-fold";
  if (primitive.layer === "bleed") return "dieline-guide-line dieline-guide-bleed";
  if (primitive.layer === "safe") return "dieline-guide-line dieline-guide-safe";
  if (primitive.layer === "window" || primitive.layer === "hole") return "dieline-guide-line dieline-guide-window";
  return "dieline-guide-line dieline-guide-cut";
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
