"use client";

/* eslint-disable @next/next/no-img-element */

import dynamic from "next/dynamic";
import { ImageRestriction, type Coordinates, type CropperState } from "advanced-cropper";
import {
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Crop,
  ExternalLink,
  FileText,
  FlipHorizontal2,
  FlipVertical2,
  Image as ImageIcon,
  Link,
  LoaderCircle,
  Paintbrush,
  RotateCcw,
  RotateCw,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { Cropper, type CropperRef } from "react-advanced-cropper";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

import {
  DEFAULT_CROP_SETTINGS,
  cropArtworkToFace,
  importArtworkFile,
  normalizeCropSettings,
  type CropSettings
} from "@/lib/client/artwork";
import {
  DEFAULT_CARTON_DIMENSIONS,
  DIMENSION_LIMITS,
  FACE_KEYS,
  getDielineSize,
  getFaceSpecs,
  normalizeDimensions,
  type CartonDimensions,
  type FaceKey,
  type Project
} from "@/lib/carton";

const CartonStage = dynamic(() => import("@/components/CartonStage").then((mod) => mod.CartonStage), {
  ssr: false,
  loading: () => <div className="stage-loading">Preparing 3D preview</div>
});

type ArtworkSource = {
  id: string;
  dataUrl: string;
  fileName: string;
  sourceType: "image" | "pdf";
};

type FaceAsset = {
  sourceId: string;
  dataUrl: string;
  fileName: string;
  sourceType: "image" | "pdf";
  crop: CropSettings;
};

type FaceAssets = Partial<Record<FaceKey, FaceAsset>>;

type CropModalState = {
  face: FaceKey;
  sourceId: string;
  settings: CropSettings;
};

type ParameterSectionKey = "dimensions" | "dieline" | "library";

export function Builder() {
  const [dimensions, setDimensions] = useState<CartonDimensions>(DEFAULT_CARTON_DIMENSIONS);
  const [sources, setSources] = useState<ArtworkSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [faces, setFaces] = useState<FaceAssets>({});
  const [busyFace, setBusyFace] = useState<FaceKey | null>(null);
  const [isRecropping, setIsRecropping] = useState(false);
  const [cropModal, setCropModal] = useState<CropModalState | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openSections, setOpenSections] = useState<Record<ParameterSectionKey, boolean>>({
    dimensions: true,
    dieline: true,
    library: true
  });
  const facesRef = useRef(faces);
  const sourcesRef = useRef(sources);
  const skippedInitialDimensionSync = useRef(false);

  useEffect(() => {
    facesRef.current = faces;
  }, [faces]);

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  useEffect(() => {
    if (!skippedInitialDimensionSync.current) {
      skippedInitialDimensionSync.current = true;
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      const currentFaces = facesRef.current;
      const currentSources = new Map(sourcesRef.current.map((source) => [source.id, source]));
      const assignedFaces = FACE_KEYS.filter((face) => currentFaces[face]);

      if (assignedFaces.length === 0) {
        return;
      }

      setIsRecropping(true);

      try {
        const recroppedFaces = await Promise.all(
          assignedFaces.map(async (face) => {
            const assignment = currentFaces[face];
            const source = assignment ? currentSources.get(assignment.sourceId) : undefined;

            if (!assignment || !source) {
              return null;
            }

            const dataUrl = await cropArtworkToFace(source.dataUrl, face, dimensions, assignment.crop);
            return [face, { ...assignment, dataUrl }] as const;
          })
        );

        if (cancelled) {
          return;
        }

        setFaces((current) => {
          const next = { ...current };

          for (const update of recroppedFaces) {
            if (!update) {
              continue;
            }

            const [face, assignment] = update;
            if (current[face]?.sourceId === assignment.sourceId) {
              next[face] = assignment;
            }
          }

          return next;
        });
      } catch (syncError) {
        if (!cancelled) {
          setError(syncError instanceof Error ? syncError.message : "Could not update crops for the new size.");
        }
      } finally {
        if (!cancelled) {
          setIsRecropping(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [dimensions]);

  const previewFaces = useMemo(
    () =>
      FACE_KEYS.reduce<Partial<Record<FaceKey, string>>>((next, face) => {
        if (faces[face]) {
          next[face] = faces[face]?.dataUrl;
        }

        return next;
      }, {}),
    [faces]
  );
  const uploadedCount = Object.keys(faces).length;
  const selectedSource = sources.find((source) => source.id === selectedSourceId);
  const canShare = uploadedCount > 0 && !busyFace && !isSaving && !isRecropping;

  function handleDimensionChange(key: keyof CartonDimensions, value: string) {
    setShareUrl("");
    setDimensions((current) =>
      normalizeDimensions({
        ...current,
        [key]: Number(value)
      })
    );
  }

  function toggleSection(section: ParameterSectionKey) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section]
    }));
  }

  async function handleUpload(face: FaceKey, file: File) {
    setBusyFace(face);
    setError("");
    setShareUrl("");

    try {
      const imported = await importArtworkFile(file);
      const source: ArtworkSource = {
        id: createArtworkId(),
        ...imported
      };

      setSources((current) => [source, ...current]);
      setSelectedSourceId(source.id);
      setCropModal({ face, sourceId: source.id, settings: DEFAULT_CROP_SETTINGS });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not prepare the selected artwork.");
    } finally {
      setBusyFace(null);
    }
  }

  async function applySourceToFace(face: FaceKey, sourceId: string, crop = DEFAULT_CROP_SETTINGS) {
    const source = sources.find((candidate) => candidate.id === sourceId);

    if (!source) {
      return;
    }

    const nextCrop = normalizeCropSettings(crop);
    setBusyFace(face);
    setError("");
    setShareUrl("");

    try {
      const dataUrl = await cropArtworkToFace(source.dataUrl, face, dimensions, nextCrop);
      setFaces((current) => ({
        ...current,
        [face]: {
          sourceId: source.id,
          dataUrl,
          fileName: source.fileName,
          sourceType: source.sourceType,
          crop: nextCrop
        }
      }));
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Could not apply that artwork to this side.");
    } finally {
      setBusyFace(null);
    }
  }

  async function applyCrop(settings: CropSettings) {
    if (!cropModal) {
      return;
    }

    await applySourceToFace(cropModal.face, cropModal.sourceId, settings);
    setCropModal(null);
  }

  function clearFace(face: FaceKey) {
    setShareUrl("");
    setFaces((current) => {
      const next = { ...current };
      delete next[face];
      return next;
    });
  }

  async function createShareLink() {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dimensions,
          faces: Object.fromEntries(
            FACE_KEYS.flatMap((face) => (faces[face] ? [[face, faces[face]?.dataUrl]] : []))
          )
        })
      });

      if (!response.ok) {
        const problem = (await response.json()) as { error?: string };
        throw new Error(problem.error ?? "Could not create a share link.");
      }

      const project = (await response.json()) as Project;
      const nextUrl = `${window.location.origin}/view/${project.id}`;
      setShareUrl(nextUrl);
      await copyToClipboard(nextUrl);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not create a share link.");
    } finally {
      setIsSaving(false);
    }
  }

  async function copyToClipboard(value = shareUrl) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Box aria-hidden size={19} />
          </span>
          <div>
            <h1>FoldView</h1>
            <p>3D carton preview for fast client approvals</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="dimension-pill">
            {dimensions.width} x {dimensions.depth} x {dimensions.height} mm
          </div>
          <button className="primary-button header-share-button" disabled={!canShare} type="button" onClick={createShareLink}>
            {isSaving ? <LoaderCircle aria-hidden className="spin" size={18} /> : <Link aria-hidden size={18} />}
            Share
          </button>
          {shareUrl ? (
            <div className="header-share-result">
              <input aria-label="Share URL" readOnly value={shareUrl} />
              <button className="icon-button" title="Copy link" type="button" onClick={() => copyToClipboard()}>
                {copied ? <Check aria-hidden size={18} /> : <Copy aria-hidden size={18} />}
              </button>
              <a className="icon-button" href={shareUrl} rel="noreferrer" target="_blank" title="Open shared viewer">
                <ExternalLink aria-hidden size={18} />
              </a>
            </div>
          ) : null}
        </div>
      </header>

      <section className="builder-grid">
        <aside className="tool-panel" aria-label="Parameters">
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
            onToggle={() => toggleSection("dimensions")}
          >
            <DimensionControls dimensions={dimensions} onChange={handleDimensionChange} />
          </CollapsibleSection>

          <CollapsibleSection
            className="library-section"
            eyebrow="Artwork library"
            isOpen={openSections.library}
            title="Uploaded images"
            trailing={String(sources.length)}
            onToggle={() => toggleSection("library")}
          >
            <ArtworkLibrary selectedSourceId={selectedSourceId} sources={sources} onSelect={setSelectedSourceId} />
          </CollapsibleSection>

          <CollapsibleSection
            className="dieline-section"
            eyebrow="Flat dieline"
            isOpen={openSections.dieline}
            title="Fill exterior faces"
            trailing={`${uploadedCount}/6`}
            onToggle={() => toggleSection("dieline")}
          >
            <DielineUploader
              busyFace={busyFace}
              dimensions={dimensions}
              faces={faces}
              selectedSourceId={selectedSourceId}
              onApplySelected={(face) => {
                if (selectedSourceId) {
                  setCropModal({ face, sourceId: selectedSourceId, settings: DEFAULT_CROP_SETTINGS });
                }
              }}
              onClear={clearFace}
              onCrop={(face) => {
                const asset = faces[face];

                if (asset) {
                  setCropModal({ face, sourceId: asset.sourceId, settings: asset.crop });
                }
              }}
              onUpload={handleUpload}
            />
            <p className="helper-text">
              Hover a side to upload, reuse the selected artwork, crop, or delete the assigned image.
            </p>
          </CollapsibleSection>

          {error ? <div className="sidebar-error error-banner">{error}</div> : null}
        </aside>

        <section className="viewer-panel" aria-label="3D carton preview">
          <div className="viewer-toolbar">
            <div>
              <span className="eyebrow">Live 3D preview</span>
              <h2>Rotate and inspect the carton</h2>
            </div>
            <span className="viewer-hint">{selectedSource ? `Selected: ${selectedSource.fileName}` : "Drag to rotate"}</span>
          </div>
          <CartonStage dimensions={dimensions} faces={previewFaces} />
        </section>
      </section>

      {cropModal ? (
        <CropModal
          key={`${cropModal.face}-${cropModal.sourceId}`}
          dimensions={dimensions}
          face={cropModal.face}
          initialSettings={cropModal.settings}
          source={sources.find((candidate) => candidate.id === cropModal.sourceId)}
          onApply={applyCrop}
          onCancel={() => setCropModal(null)}
        />
      ) : null}
    </main>
  );
}

function CollapsibleSection({
  children,
  className,
  eyebrow,
  isOpen,
  title,
  trailing,
  onToggle
}: {
  children: ReactNode;
  className?: string;
  eyebrow: string;
  isOpen: boolean;
  title: string;
  trailing?: string;
  onToggle: () => void;
}) {
  return (
    <section className={`panel-section collapsible-section ${className ?? ""} ${isOpen ? "" : "is-collapsed"}`}>
      <button className="collapsible-heading" type="button" aria-expanded={isOpen} onClick={onToggle}>
        <span className="collapsible-title">
          <span className="eyebrow">{eyebrow}</span>
          <strong>{title}</strong>
        </span>
        <span className="collapsible-meta">
          {trailing ? <span className="count-badge">{trailing}</span> : null}
          {isOpen ? <ChevronDown aria-hidden size={18} /> : <ChevronRight aria-hidden size={18} />}
        </span>
      </button>
      {isOpen ? <div className="collapsible-body">{children}</div> : null}
    </section>
  );
}

function DimensionControls({
  dimensions,
  onChange
}: {
  dimensions: CartonDimensions;
  onChange: (key: keyof CartonDimensions, value: string) => void;
}) {
  const controls: Array<{ key: keyof CartonDimensions; label: string }> = [
    { key: "width", label: "Width" },
    { key: "depth", label: "Depth" },
    { key: "height", label: "Side height" }
  ];

  return (
    <div className="dimension-grid">
      {controls.map((control) => (
        <label className="dimension-control" key={control.key}>
          <span>{control.label}</span>
          <input
            max={DIMENSION_LIMITS.max}
            min={DIMENSION_LIMITS.min}
            step="1"
            type="number"
            value={dimensions[control.key]}
            onChange={(event) => onChange(control.key, event.currentTarget.value)}
          />
          <em>mm</em>
        </label>
      ))}
    </div>
  );
}

function DielineUploader({
  busyFace,
  dimensions,
  faces,
  selectedSourceId,
  onApplySelected,
  onClear,
  onCrop,
  onUpload
}: {
  busyFace: FaceKey | null;
  dimensions: CartonDimensions;
  faces: FaceAssets;
  selectedSourceId: string;
  onApplySelected: (face: FaceKey) => void;
  onClear: (face: FaceKey) => void;
  onCrop: (face: FaceKey) => void;
  onUpload: (face: FaceKey, file: File) => void;
}) {
  const dielineSize = getDielineSize(dimensions);
  const faceSpecs = getFaceSpecs(dimensions);

  return (
    <div className="dieline-fit">
      <div className="dieline-board" style={{ aspectRatio: `${dielineSize.width} / ${dielineSize.height}` }}>
        {FACE_KEYS.map((face) => {
          const spec = faceSpecs[face];
          const asset = faces[face];
          const isBusy = busyFace === face;
          const inputId = `face-upload-${face}`;
          const isRotatedOnDieline = spec.width !== spec.artworkWidth || spec.height !== spec.artworkHeight;
          const style = {
            left: `${(spec.x / dielineSize.width) * 100}%`,
            top: `${(spec.y / dielineSize.height) * 100}%`,
            width: `${(spec.width / dielineSize.width) * 100}%`,
            height: `${(spec.height / dielineSize.height) * 100}%`
          };

          return (
            <div className={`dieline-face ${asset ? "is-filled" : ""}`} key={face} style={style}>
              <input
                accept="image/png,image/jpeg,application/pdf"
                aria-label={`Upload ${spec.label} artwork`}
                disabled={Boolean(busyFace)}
                id={inputId}
                type="file"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";

                  if (file) {
                    onUpload(face, file);
                  }
                }}
              />
              {asset ? (
                <img
                  alt=""
                  className={`face-preview ${isRotatedOnDieline ? "is-rotated-on-dieline" : ""}`}
                  src={asset.dataUrl}
                />
              ) : null}
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
                  {asset ? asset.fileName : `${spec.artworkWidth} x ${spec.artworkHeight} mm`}
                </span>
              </span>
              <div className="face-actions" aria-label={`${spec.label} actions`}>
                <button
                  className="face-action"
                  disabled={!selectedSourceId || Boolean(busyFace)}
                  title="Use selected artwork"
                  type="button"
                  onClick={() => onApplySelected(face)}
                >
                  <Paintbrush aria-hidden size={15} />
                </button>
                <label className="face-action" htmlFor={inputId} title={asset ? "Upload another image" : "Upload image"}>
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
      </div>
    </div>
  );
}

function ArtworkLibrary({
  selectedSourceId,
  sources,
  onSelect
}: {
  selectedSourceId: string;
  sources: ArtworkSource[];
  onSelect: (sourceId: string) => void;
}) {
  if (sources.length === 0) {
    return <p className="empty-library">Uploaded images will appear here and can be reused on other sides.</p>;
  }

  return (
    <div className="artwork-library">
      {sources.map((source) => (
        <button
          className={`artwork-thumb ${selectedSourceId === source.id ? "is-selected" : ""}`}
          key={source.id}
          title={source.fileName}
          type="button"
          onClick={() => onSelect(source.id)}
        >
          <img alt="" src={source.dataUrl} />
          <span>{source.fileName}</span>
        </button>
      ))}
    </div>
  );
}

function CropModal({
  dimensions,
  face,
  initialSettings,
  source,
  onApply,
  onCancel
}: {
  dimensions: CartonDimensions;
  face: FaceKey;
  initialSettings: CropSettings;
  source: ArtworkSource | undefined;
  onApply: (settings: CropSettings) => void;
  onCancel: () => void;
}) {
  const cropperRef = useRef<CropperRef>(null);
  const initialCrop = useMemo(() => normalizeCropSettings(initialSettings), [initialSettings]);
  const [settings, setSettings] = useState<CropSettings>(initialCrop);
  const spec = getFaceSpecs(dimensions)[face];
  const targetAspect = spec.artworkWidth / spec.artworkHeight;
  const defaultCoordinates = useMemo(
    () => createDefaultCropCoordinates(initialCrop.coordinates, targetAspect),
    [initialCrop.coordinates, targetAspect]
  );
  const transformState = settings.transforms;

  function syncCropperSettings(cropper = cropperRef.current) {
    if (cropper) {
      setSettings(readCropperSettings(cropper));
    }
  }

  function updateCropper(action: (cropper: CropperRef) => void) {
    const cropper = cropperRef.current;

    if (!cropper) {
      return;
    }

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
    updateCropper((cropper) => cropper.flipImage(axis === "horizontal", axis === "vertical"));
  }

  function zoomCrop(factor: number) {
    updateCropper((cropper) => cropper.zoomImage(factor));
  }

  function applyCurrentCrop() {
    const cropper = cropperRef.current;
    onApply(cropper ? readCropperSettings(cropper) : settings);
  }

  if (!source) {
    return null;
  }

  return (
    <div className="crop-overlay" role="dialog" aria-modal="true" aria-label={`Crop ${spec.label} artwork`}>
      <div className="crop-dialog">
        <div className="crop-header">
          <div>
            <span className="eyebrow">{spec.label} crop</span>
            <h2>{source.fileName}</h2>
          </div>
          <div className="crop-header-actions">
            <button className="icon-button" title="Reset crop" type="button" onClick={resetCrop}>
              <RotateCcw aria-hidden size={18} />
            </button>
          </div>
        </div>

        <div className="crop-tools" aria-label="Crop tools">
          <button className="crop-tool-button" title="Rotate 90 degrees" type="button" onClick={rotateCrop}>
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
          <button className="crop-tool-button" title="Zoom out" type="button" onClick={() => zoomCrop(0.88)}>
            <ZoomOut aria-hidden size={17} />
            Zoom out
          </button>
          <button className="crop-tool-button" title="Zoom in" type="button" onClick={() => zoomCrop(1.12)}>
            <ZoomIn aria-hidden size={17} />
            Zoom in
          </button>
        </div>

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
            handlerClassNames: {
              default: "crop-stencil-handler"
            },
            lineClassNames: {
              default: "crop-stencil-line"
            },
            lines: {
              east: false,
              north: false,
              south: false,
              west: false
            },
            movable: true,
            overlayClassName: "crop-stencil-overlay",
            previewClassName: "crop-stencil-preview",
            resizable: true
          }}
          transitions
          onChange={syncCropperSettings}
          onReady={syncCropperSettings}
        />

        <div className="crop-status">
          <span>
            Output {spec.artworkWidth} x {spec.artworkHeight} mm
          </span>
          <span>
            Crop {Math.round(settings.coordinates?.width ?? 0)} x {Math.round(settings.coordinates?.height ?? 0)} px
          </span>
        </div>

        <div className="crop-footer">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-button" type="button" onClick={applyCurrentCrop}>
            Apply crop
          </button>
        </div>
      </div>
    </div>
  );
}

function readCropperSettings(cropper: CropperRef): CropSettings {
  return normalizeCropSettings({
    coordinates: cropper.getCoordinates(),
    transforms: cropper.getTransforms()
  });
}

function createDefaultCropCoordinates(savedCoordinates: Coordinates | null, targetAspect: number) {
  return (state: CropperState): Coordinates => {
    if (savedCoordinates) {
      return fitCoordinatesToAspect(savedCoordinates, targetAspect, state.imageSize.width, state.imageSize.height);
    }

    return createCenteredCropCoordinates(state.imageSize.width, state.imageSize.height, targetAspect, 0.8);
  };
}

function createCenteredCropCoordinates(
  sourceWidth: number,
  sourceHeight: number,
  targetAspect: number,
  scale: number
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
    width
  };
}

function fitCoordinatesToAspect(
  coordinates: Coordinates,
  targetAspect: number,
  sourceWidth: number,
  sourceHeight: number
): Coordinates {
  if (Math.abs(coordinates.width / coordinates.height - targetAspect) < 0.001) {
    return {
      height: Math.max(1, coordinates.height),
      left: coordinates.left,
      top: coordinates.top,
      width: Math.max(1, coordinates.width)
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

  const left = Math.min(sourceWidth - width, Math.max(0, centerX - width / 2));
  const top = Math.min(sourceHeight - height, Math.max(0, centerY - height / 2));

  return {
    height: Math.max(1, height),
    left,
    top,
    width: Math.max(1, width)
  };
}

function createArtworkId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `artwork-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
