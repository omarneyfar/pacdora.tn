"use client";

import Link from "next/link";
import { Box, FileUp, LoaderCircle, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { importSvgDieline } from "@/domain/dieline/svgImporter";
import type { DielineFace, DielineGraph } from "@/domain/dieline/types";
import type { DielineTemplate, DielineTemplateStatus } from "@/domain/dielines";
import { createDieline, readDieline, updateDieline } from "./dielineClient";
import { DielinePreview } from "./DielinePreview";

type DielineStudioProps = {
  dielineId?: string;
};

const MAX_SVG_BYTES = 700_000;

export function DielineStudio({ dielineId }: DielineStudioProps) {
  const [templateId, setTemplateId] = useState(dielineId ?? "");
  const [name, setName] = useState("Untitled dieline");
  const [status, setStatus] = useState<DielineTemplateStatus>("draft");
  const [sourceFileName, setSourceFileName] = useState("");
  const [graph, setGraph] = useState<DielineGraph | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(dielineId));
  const [isSaving, setIsSaving] = useState(false);

  const artworkFaceCount = useMemo(() => graph?.faces.filter((face) => face.artworkEnabled).length ?? 0, [graph]);

  const hydrateTemplate = useCallback((template: DielineTemplate) => {
    setTemplateId(template.id);
    setName(template.name);
    setStatus(template.status);
    setSourceFileName(template.fileName ?? "");
    setGraph(template.graph);
    setWarnings([]);
    setError("");
  }, []);

  useEffect(() => {
    if (!dielineId) {
      return;
    }

    let isMounted = true;
    const loadDielineId = dielineId;

    async function loadTemplate() {
      setIsLoading(true);
      setError("");

      try {
        const template = await readDieline(loadDielineId);
        if (isMounted) {
          hydrateTemplate(template);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Could not open this dieline.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTemplate();

    return () => {
      isMounted = false;
    };
  }, [dielineId, hydrateTemplate]);

  async function importFile(file: File) {
    setError("");
    setNotice("");

    if (file.size > MAX_SVG_BYTES) {
      setError("SVG dieline is too large. Please use a file under 700 KB.");
      return;
    }

    try {
      const svgText = await file.text();
      const result = importSvgDieline(svgText);
      setGraph(result.graph);
      setWarnings(result.warnings);
      setSourceFileName(file.name);

      if (!name || name === "Untitled dieline") {
        setName(file.name.replace(/\.svg$/i, ""));
      }
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Could not import this SVG dieline.");
    }
  }

  function updateFace(faceId: string, patch: Partial<Pick<DielineFace, "label" | "role" | "artworkEnabled">>) {
    setGraph((current) => {
      if (!current) return current;

      return {
        ...current,
        faces: current.faces.map((face) => (face.id === faceId ? { ...face, ...patch } : face)),
      };
    });
  }

  async function saveTemplate() {
    if (!graph) {
      setError("Import an SVG dieline before saving.");
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        name,
        status,
        source: "svg-upload" as const,
        fileName: sourceFileName,
        graph,
      };
      const saved = templateId ? await updateDieline(templateId, payload) : await createDieline(payload);
      hydrateTemplate(saved);
      setNotice(`Saved "${saved.name}".`);

      if (!templateId) {
        window.history.replaceState(null, "", `/dielines/${saved.id}/edit`);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this dieline.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="dieline-studio-page">
      <header className="topbar projects-topbar">
        <div className="brand">
          <span className="brand-mark">
            <Box aria-hidden size={19} />
          </span>
          <div className="brand-copy">
            <h1>FoldView</h1>
            <p>Dieline studio</p>
          </div>
        </div>
        <div className="header-actions">
          <Link className="secondary-button dashboard-header-button" href="/dielines">
            Library
          </Link>
          {templateId ? (
            <Link className="primary-button dashboard-header-button" href={`/?dielineId=${templateId}`}>
              Start project
            </Link>
          ) : null}
          <button className="primary-button dashboard-header-button" disabled={isSaving || isLoading} type="button" onClick={saveTemplate}>
            {isSaving ? <LoaderCircle aria-hidden className="spin" size={18} /> : <Save aria-hidden size={18} />}
            Save dieline
          </button>
        </div>
      </header>

      <section className="dieline-studio-grid">
        <aside className="dieline-studio-sidebar">
          <div className="dieline-studio-card">
            <span className="eyebrow">Setup</span>
            <label className="studio-field">
              Name
              <input value={name} onChange={(event) => setName(event.currentTarget.value)} />
            </label>
            <div className="studio-status-control" aria-label="Dieline status">
              {(["draft", "ready"] as const).map((nextStatus) => (
                <button className={status === nextStatus ? "is-active" : ""} key={nextStatus} type="button" onClick={() => setStatus(nextStatus)}>
                  {nextStatus === "ready" ? "Ready" : "Draft"}
                </button>
              ))}
            </div>
            <label className="primary-button dieline-studio-import">
              <FileUp aria-hidden size={18} />
              Import SVG
              <input accept=".svg,image/svg+xml" type="file" onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void importFile(file);
              }} />
            </label>
            {sourceFileName ? <p className="dieline-source-note">Source: <strong>{sourceFileName}</strong></p> : null}
          </div>

          <div className="dieline-studio-card">
            <span className="eyebrow">Structure</span>
            {graph ? (
              <div className="project-row-meta">
                <span>{graph.faces.length} faces</span>
                <span>{artworkFaceCount} artwork zones</span>
                <span>{graph.creases.length} creases</span>
                <span>{Math.round(graph.size.width)} x {Math.round(graph.size.height)} mm</span>
              </div>
            ) : (
              <p className="helper-text">Import an SVG that uses face ids like <code>face-front</code> and crease lines with <code>data-face-a</code>.</p>
            )}
          </div>

          {error ? <div className="error-banner">{error}</div> : null}
          {notice ? <div className="success-banner">{notice}</div> : null}
          {warnings.length > 0 ? (
            <div className="warning-banner">
              {warnings.slice(0, 3).map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          ) : null}
        </aside>

        <section className="dieline-studio-preview" aria-label="Dieline preview">
          {isLoading ? (
            <div className="projects-empty">
              <LoaderCircle aria-hidden className="spin" size={26} />
              Opening dieline
            </div>
          ) : graph ? (
            <DielinePreview graph={graph} />
          ) : (
            <div className="projects-empty">
              <strong>No dieline imported</strong>
              <span>Upload an SVG to begin preparing faces and flaps.</span>
            </div>
          )}
        </section>

        <aside className="dieline-face-editor" aria-label="Detected faces">
          <div className="dieline-studio-card">
            <span className="eyebrow">Detected parts</span>
            {graph ? (
              <div className="dieline-face-list">
                {graph.faces.map((face) => (
                  <article className="dieline-face-editor-row" key={face.id}>
                    <div>
                      <strong>{face.id}</strong>
                      <span>{Math.round(face.bounds.width)} x {Math.round(face.bounds.height)} mm</span>
                    </div>
                    <input aria-label={`Label for ${face.id}`} value={face.label} onChange={(event) => updateFace(face.id, { label: event.currentTarget.value })} />
                    <select aria-label={`Role for ${face.id}`} value={face.role} onChange={(event) => updateFace(face.id, { role: event.currentTarget.value as DielineFace["role"] })}>
                      <option value="panel">Panel</option>
                      <option value="flap">Flap</option>
                      <option value="glue">Glue</option>
                      <option value="unknown">Unknown</option>
                    </select>
                    <label className="toggle-row compact-toggle-row">
                      <input checked={face.artworkEnabled} type="checkbox" onChange={(event) => updateFace(face.id, { artworkEnabled: event.currentTarget.checked })} />
                      Artwork
                    </label>
                  </article>
                ))}
              </div>
            ) : (
              <p className="helper-text">Detected faces will appear here after import.</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
