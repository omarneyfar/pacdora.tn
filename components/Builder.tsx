"use client";

import dynamic from "next/dynamic";
import { Box, Check, Copy, ExternalLink, FileText, Image as ImageIcon, Link, LoaderCircle, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import { createCroppedFaceArtwork } from "@/lib/client/artwork";
import { DIELINE_SIZE, FACE_KEYS, FACE_SPECS, type FaceKey, type Project } from "@/lib/carton";

const CartonStage = dynamic(() => import("@/components/CartonStage").then((mod) => mod.CartonStage), {
  ssr: false,
  loading: () => <div className="stage-loading">Preparing 3D preview</div>
});

type FaceAsset = {
  dataUrl: string;
  fileName: string;
  sourceType: "image" | "pdf";
};

type FaceAssets = Partial<Record<FaceKey, FaceAsset>>;

export function Builder() {
  const [faces, setFaces] = useState<FaceAssets>({});
  const [busyFace, setBusyFace] = useState<FaceKey | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

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
  const canShare = uploadedCount > 0 && !busyFace && !isSaving;

  async function handleUpload(face: FaceKey, file: File) {
    setBusyFace(face);
    setError("");
    setShareUrl("");

    try {
      const dataUrl = await createCroppedFaceArtwork(file, face);
      setFaces((current) => ({
        ...current,
        [face]: {
          dataUrl,
          fileName: file.name,
          sourceType: file.type === "application/pdf" ? "pdf" : "image"
        }
      }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not prepare the selected artwork.");
    } finally {
      setBusyFace(null);
    }
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
        <div className="dimension-pill">100 x 160 x 60</div>
      </header>

      <section className="builder-grid">
        <aside className="tool-panel" aria-label="Artwork uploads">
          <div className="panel-section">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Flat dieline</span>
                <h2>Upload exterior faces</h2>
              </div>
              <span className="count-badge">{uploadedCount}/6</span>
            </div>
            <DielineUploader busyFace={busyFace} faces={faces} onUpload={handleUpload} />
            <p className="helper-text">
              PNG, JPG, and PDF files are accepted. Each upload is center-cropped to the selected carton side.
            </p>
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
            <span className="viewer-hint">Drag to rotate</span>
          </div>
          <CartonStage faces={previewFaces} />
        </section>
      </section>
    </main>
  );
}

function DielineUploader({
  busyFace,
  faces,
  onUpload
}: {
  busyFace: FaceKey | null;
  faces: FaceAssets;
  onUpload: (face: FaceKey, file: File) => void;
}) {
  return (
    <div className="dieline-board" style={{ aspectRatio: `${DIELINE_SIZE.width} / ${DIELINE_SIZE.height}` }}>
      {FACE_KEYS.map((face) => {
        const spec = FACE_SPECS[face];
        const asset = faces[face];
        const isBusy = busyFace === face;
        const style = {
          left: `${(spec.x / DIELINE_SIZE.width) * 100}%`,
          top: `${(spec.y / DIELINE_SIZE.height) * 100}%`,
          width: `${(spec.width / DIELINE_SIZE.width) * 100}%`,
          height: `${(spec.height / DIELINE_SIZE.height) * 100}%`,
          backgroundImage: asset ? `url(${asset.dataUrl})` : undefined
        };

        return (
          <label className={`dieline-face ${asset ? "is-filled" : ""}`} key={face} style={style}>
            <input
              accept="image/png,image/jpeg,application/pdf"
              aria-label={`Upload ${spec.label} artwork`}
              disabled={Boolean(busyFace)}
              type="file"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";

                if (file) {
                  onUpload(face, file);
                }
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
              <strong>{spec.label}</strong>
              <span className="face-file">{asset ? asset.fileName : `${spec.width} x ${spec.height}`}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
