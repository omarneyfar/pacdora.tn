"use client";

/* eslint-disable @next/next/no-img-element */

import dynamic from "next/dynamic";
import {
  Box,
  Check,
  Copy,
  Crop,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link,
  LoaderCircle,
  Paintbrush,
  RotateCcw,
  Trash2,
  Upload
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_CROP_SETTINGS,
  cropArtworkToFace,
  importArtworkFile,
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
      const dataUrl = await cropArtworkToFace(source.dataUrl, face, dimensions, DEFAULT_CROP_SETTINGS);

      setSources((current) => [source, ...current]);
      setSelectedSourceId(source.id);
      setFaces((current) => ({
        ...current,
        [face]: {
          sourceId: source.id,
          dataUrl,
          fileName: source.fileName,
          sourceType: source.sourceType,
          crop: DEFAULT_CROP_SETTINGS
        }
      }));
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

    setBusyFace(face);
    setError("");
    setShareUrl("");

    try {
      const dataUrl = await cropArtworkToFace(source.dataUrl, face, dimensions, crop);
      setFaces((current) => ({
        ...current,
        [face]: {
          sourceId: source.id,
          dataUrl,
          fileName: source.fileName,
          sourceType: source.sourceType,
          crop
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
        <div className="dimension-pill">
          {dimensions.width} x {dimensions.depth} x {dimensions.height} mm
        </div>
      </header>

      <section className="builder-grid">
        <aside className="tool-panel" aria-label="Artwork uploads">
          <div className="panel-section dimension-section">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Box size</span>
                <h2>Pizza carton dimensions</h2>
              </div>
              {isRecropping ? <span className="count-badge">Updating</span> : null}
            </div>
            <DimensionControls dimensions={dimensions} onChange={handleDimensionChange} />
          </div>

          <div className="panel-section dieline-section">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Flat dieline</span>
                <h2>Fill exterior faces</h2>
              </div>
              <span className="count-badge">{uploadedCount}/6</span>
            </div>
            <DielineUploader
              busyFace={busyFace}
              dimensions={dimensions}
              faces={faces}
              selectedSourceId={selectedSourceId}
              onApplySelected={(face) => {
                if (selectedSourceId) {
                  applySourceToFace(face, selectedSourceId);
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
          </div>

          <div className="panel-section library-section">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Artwork library</span>
                <h2>Reuse uploaded images</h2>
              </div>
              <span className="count-badge">{sources.length}</span>
            </div>
            <ArtworkLibrary selectedSourceId={selectedSourceId} sources={sources} onSelect={setSelectedSourceId} />
          </div>

          <div className="panel-section share-section">
            <button className="primary-button" disabled={!canShare} type="button" onClick={createShareLink}>
              {isSaving ? <LoaderCircle aria-hidden className="spin" size={18} /> : <Link aria-hidden size={18} />}
              Create view-only link
            </button>

            {shareUrl ? (
              <div className="share-result">
                <input aria-label="Share URL" readOnly value={shareUrl} />
                <button className="icon-button" title="Copy link" type="button" onClick={() => copyToClipboard()}>
                  {copied ? <Check aria-hidden size={18} /> : <Copy aria-hidden size={18} />}
                </button>
                <a className="icon-button" href={shareUrl} rel="noreferrer" target="_blank" title="Open shared viewer">
                  <ExternalLink aria-hidden size={18} />
                </a>
              </div>
            ) : null}

            {error ? <div className="error-banner">{error}</div> : null}
          </div>
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
  const [settings, setSettings] = useState<CropSettings>(initialSettings);
  const [preview, setPreview] = useState("");
  const spec = getFaceSpecs(dimensions)[face];

  useEffect(() => {
    let cancelled = false;

    if (!source) {
      return;
    }

    cropArtworkToFace(source.dataUrl, face, dimensions, settings)
      .then((dataUrl) => {
        if (!cancelled) {
          setPreview(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreview("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dimensions, face, settings, source]);

  function updateSetting(key: keyof CropSettings, value: string) {
    setSettings((current) => ({
      ...current,
      [key]: Number(value)
    }));
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
          <button className="icon-button" title="Reset crop" type="button" onClick={() => setSettings(DEFAULT_CROP_SETTINGS)}>
            <RotateCcw aria-hidden size={18} />
          </button>
        </div>

        <div className="crop-preview" style={{ aspectRatio: `${spec.artworkWidth} / ${spec.artworkHeight}` }}>
          {preview ? <img alt="" src={preview} /> : null}
          {!preview ? (
            <span className="crop-loading">
              <LoaderCircle aria-hidden className="spin" size={18} />
            </span>
          ) : null}
        </div>

        <div className="crop-controls">
          <label>
            <span>Zoom</span>
            <input
              max="3"
              min="1"
              step="0.05"
              type="range"
              value={settings.zoom}
              onChange={(event) => updateSetting("zoom", event.currentTarget.value)}
            />
          </label>
          <label>
            <span>Horizontal</span>
            <input
              max="100"
              min="-100"
              step="1"
              type="range"
              value={settings.offsetX}
              onChange={(event) => updateSetting("offsetX", event.currentTarget.value)}
            />
          </label>
          <label>
            <span>Vertical</span>
            <input
              max="100"
              min="-100"
              step="1"
              type="range"
              value={settings.offsetY}
              onChange={(event) => updateSetting("offsetY", event.currentTarget.value)}
            />
          </label>
        </div>

        <div className="crop-footer">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-button" type="button" onClick={() => onApply(settings)}>
            Apply crop
          </button>
        </div>
      </div>
    </div>
  );
}

function createArtworkId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `artwork-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
