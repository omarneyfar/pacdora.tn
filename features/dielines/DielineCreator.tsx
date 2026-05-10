/**
 * DielineCreator.tsx — Interactive visual panel assembly tool.
 *
 * Users build a dieline by:
 *  1. Setting root panel dimensions (width × height)
 *  2. Clicking edges to attach new panels
 *  3. Configuring each panel's role, label, and dimensions
 *  4. The result is a valid DielineGraph
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { Layers, Plus, RotateCcw, Trash2 } from "lucide-react";

import type { DielineFace, DielineGraph } from "@/domain/dieline/types";
import {
  addPanel,
  createRootPanel,
  removePanel,
  updateFace,
  type AddPanelOptions,
  type EdgeSide,
} from "@/domain/dieline/manualBuilder";

type DielineCreatorProps = {
  /** Called when the user wants to use this dieline */
  onApply: (graph: DielineGraph) => void;
  /** Initial graph to edit (if restoring from saved state) */
  initialGraph?: DielineGraph;
};

const EDGE_LABELS: Record<EdgeSide, string> = {
  top: "Top",
  right: "Right",
  bottom: "Bottom",
  left: "Left",
};

const DEFAULT_ROOT_WIDTH = 200;
const DEFAULT_ROOT_HEIGHT = 200;
const DEFAULT_PANEL_HEIGHT = 60;
const MIN_DIMENSION = 10;
const MAX_DIMENSION = 600;

export function DielineCreator({ onApply, initialGraph }: DielineCreatorProps) {
  const [graph, setGraph] = useState<DielineGraph>(
    () => initialGraph ?? createRootPanel(DEFAULT_ROOT_WIDTH, DEFAULT_ROOT_HEIGHT),
  );
  const [selectedFaceId, setSelectedFaceId] = useState<string>(graph.faces[0]?.id ?? "");
  const [addEdge, setAddEdge] = useState<EdgeSide | null>(null);
  const [newPanelWidth, setNewPanelWidth] = useState(DEFAULT_ROOT_WIDTH);
  const [newPanelHeight, setNewPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [newPanelLabel, setNewPanelLabel] = useState("");
  const [newPanelRole, setNewPanelRole] = useState<DielineFace["role"]>("panel");
  const [isTrapezoid, setIsTrapezoid] = useState(false);
  const [trapezoidTaper, setTrapezoidTaper] = useState(0.3);

  const selectedFace = useMemo(
    () => graph.faces.find((f) => f.id === selectedFaceId) ?? null,
    [graph.faces, selectedFaceId],
  );

  const canRemove = useMemo(() => {
    if (!selectedFaceId) return false;
    // Cannot remove root faces
    return !graph.faceTree.some((n) => n.faceId === selectedFaceId);
  }, [graph.faceTree, selectedFaceId]);

  const handleAddPanel = useCallback(() => {
    if (!selectedFaceId || !addEdge) return;

    const options: AddPanelOptions = {
      parentFaceId: selectedFaceId,
      edge: addEdge,
      width: newPanelWidth,
      height: newPanelHeight,
      label: newPanelLabel || undefined,
      role: newPanelRole,
      artworkEnabled: newPanelRole === "panel",
      isTrapezoid,
      trapezoidTaper,
    };

    const updated = addPanel(graph, options);
    setGraph(updated);
    setAddEdge(null);
    setNewPanelLabel("");

    // Select the newly added face
    const newFace = updated.faces[updated.faces.length - 1];
    if (newFace) setSelectedFaceId(newFace.id);
  }, [selectedFaceId, addEdge, graph, newPanelWidth, newPanelHeight, newPanelLabel, newPanelRole, isTrapezoid, trapezoidTaper]);

  const handleRemove = useCallback(() => {
    if (!selectedFaceId || !canRemove) return;
    const updated = removePanel(graph, selectedFaceId);
    setGraph(updated);
    setSelectedFaceId(graph.faceTree[0]?.faceId ?? "");
  }, [graph, selectedFaceId, canRemove]);

  const handleUpdateFace = useCallback(
    (patch: Partial<Pick<DielineFace, "label" | "role" | "artworkEnabled">>) => {
      if (!selectedFaceId) return;
      setGraph((g) => updateFace(g, selectedFaceId, patch));
    },
    [selectedFaceId],
  );

  const handleReset = useCallback(() => {
    const fresh = createRootPanel(DEFAULT_ROOT_WIDTH, DEFAULT_ROOT_HEIGHT);
    setGraph(fresh);
    setSelectedFaceId(fresh.faces[0]?.id ?? "");
    setAddEdge(null);
  }, []);

  return (
    <div className="dieline-creator">
      {/* ── Top row: stats + actions ──────────────────────── */}
      <div className="dieline-creator-header">
        <div className="dieline-creator-stats">
          <Layers aria-hidden size={15} />
          <span>{graph.faces.length} faces</span>
          <span>{graph.creases.length} creases</span>
          <span>{Math.round(graph.size.width)} × {Math.round(graph.size.height)} mm</span>
        </div>
        <div className="dieline-creator-actions">
          <button className="secondary-button dieline-creator-btn" type="button" onClick={handleReset}>
            <RotateCcw aria-hidden size={14} />
            Reset
          </button>
          <button
            className="primary-button dieline-creator-btn"
            disabled={graph.faces.length < 2}
            type="button"
            onClick={() => onApply(graph)}
          >
            Use this dieline
          </button>
        </div>
      </div>

      <div className="dieline-creator-body">
        {/* ── Preview ─────────────────────────────────────── */}
        <div className="dieline-creator-preview" aria-label="Dieline preview">
          <DielineCreatorSVG
            graph={graph}
            selectedFaceId={selectedFaceId}
            onSelectFace={setSelectedFaceId}
          />
        </div>

        {/* ── Panel editor ────────────────────────────────── */}
        <aside className="dieline-creator-sidebar">
          {/* Selected face info */}
          {selectedFace ? (
            <div className="dieline-studio-card">
              <span className="eyebrow">Selected: {selectedFace.label}</span>
              <div className="project-row-meta">
                <span>{Math.round(selectedFace.bounds.width)} × {Math.round(selectedFace.bounds.height)} mm</span>
                <span>Role: {selectedFace.role}</span>
              </div>

              {/* Edit face */}
              <label className="studio-field">
                Label
                <input
                  value={selectedFace.label}
                  onChange={(e) => handleUpdateFace({ label: e.currentTarget.value })}
                />
              </label>
              <label className="studio-field">
                Role
                <select
                  value={selectedFace.role}
                  onChange={(e) =>
                    handleUpdateFace({ role: e.currentTarget.value as DielineFace["role"] })
                  }
                >
                  <option value="panel">Panel</option>
                  <option value="flap">Flap</option>
                  <option value="glue">Glue</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <label className="toggle-row compact-toggle-row">
                <input
                  checked={selectedFace.artworkEnabled}
                  type="checkbox"
                  onChange={(e) => handleUpdateFace({ artworkEnabled: e.currentTarget.checked })}
                />
                Artwork enabled
              </label>

              {canRemove ? (
                <button
                  className="secondary-button dieline-creator-btn danger-button"
                  type="button"
                  onClick={handleRemove}
                >
                  <Trash2 aria-hidden size={14} />
                  Remove panel
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Add panel controls */}
          {selectedFace ? (
            <div className="dieline-studio-card">
              <span className="eyebrow">Attach new panel</span>
              <p className="helper-text" style={{ margin: 0 }}>
                Click an edge to add a panel adjacent to <strong>{selectedFace.label}</strong>.
              </p>

              <div className="dieline-creator-edge-buttons">
                {(["top", "right", "bottom", "left"] as EdgeSide[]).map((edge) => (
                  <button
                    className={`secondary-button dieline-creator-edge-btn ${addEdge === edge ? "is-active" : ""}`}
                    key={edge}
                    type="button"
                    onClick={() => setAddEdge(addEdge === edge ? null : edge)}
                  >
                    <Plus aria-hidden size={12} />
                    {EDGE_LABELS[edge]}
                  </button>
                ))}
              </div>

              {addEdge ? (
                <div className="dieline-creator-add-form">
                  <div className="dimension-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <label className="dimension-control">
                      <span>Width</span>
                      <input
                        type="number"
                        min={MIN_DIMENSION}
                        max={MAX_DIMENSION}
                        value={newPanelWidth}
                        onChange={(e) => setNewPanelWidth(Number(e.currentTarget.value))}
                      />
                      <em>mm</em>
                    </label>
                    <label className="dimension-control">
                      <span>Height</span>
                      <input
                        type="number"
                        min={MIN_DIMENSION}
                        max={MAX_DIMENSION}
                        value={newPanelHeight}
                        onChange={(e) => setNewPanelHeight(Number(e.currentTarget.value))}
                      />
                      <em>mm</em>
                    </label>
                  </div>

                  <label className="studio-field">
                    Label
                    <input
                      placeholder="Auto-generated if empty"
                      value={newPanelLabel}
                      onChange={(e) => setNewPanelLabel(e.currentTarget.value)}
                    />
                  </label>

                  <label className="studio-field">
                    Role
                    <select
                      value={newPanelRole}
                      onChange={(e) => setNewPanelRole(e.currentTarget.value as DielineFace["role"])}
                    >
                      <option value="panel">Panel</option>
                      <option value="flap">Flap</option>
                      <option value="glue">Glue</option>
                    </select>
                  </label>

                  <label className="toggle-row compact-toggle-row">
                    <input
                      checked={isTrapezoid}
                      type="checkbox"
                      onChange={(e) => setIsTrapezoid(e.currentTarget.checked)}
                    />
                    Trapezoid shape (flap)
                  </label>

                  {isTrapezoid ? (
                    <label className="dimension-control">
                      <span>Taper</span>
                      <input
                        type="range"
                        min={0.05}
                        max={0.8}
                        step={0.05}
                        value={trapezoidTaper}
                        onChange={(e) => setTrapezoidTaper(Number(e.currentTarget.value))}
                      />
                      <em>{Math.round(trapezoidTaper * 100)}%</em>
                    </label>
                  ) : null}

                  <button
                    className="primary-button dieline-creator-btn"
                    type="button"
                    onClick={handleAddPanel}
                  >
                    <Plus aria-hidden size={16} />
                    Add {EDGE_LABELS[addEdge]} panel
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Face list */}
          <div className="dieline-studio-card">
            <span className="eyebrow">All panels ({graph.faces.length})</span>
            <div className="dieline-face-list">
              {graph.faces.map((face) => (
                <button
                  className={`dieline-creator-face-item ${selectedFaceId === face.id ? "is-selected" : ""}`}
                  key={face.id}
                  type="button"
                  onClick={() => setSelectedFaceId(face.id)}
                >
                  <strong>{face.label}</strong>
                  <span>
                    {Math.round(face.bounds.width)} × {Math.round(face.bounds.height)} mm · {face.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ── SVG Preview with clickable faces ─────────────────────────── */

function DielineCreatorSVG({
  graph,
  selectedFaceId,
  onSelectFace,
}: {
  graph: DielineGraph;
  selectedFaceId: string;
  onSelectFace: (id: string) => void;
}) {
  const pad = 10;
  const vw = graph.size.width + pad * 2;
  const vh = graph.size.height + pad * 2;

  return (
    <div
      className="dieline-preview dieline-creator-canvas"
      style={{ aspectRatio: `${vw} / ${vh}` }}
    >
      <svg
        className="dieline-preview-svg"
        preserveAspectRatio="xMidYMid meet"
        viewBox={`${-pad} ${-pad} ${vw} ${vh}`}
      >
        {/* Face polygons */}
        <g>
          {graph.faces.map((face) => (
            <polygon
              className={`dieline-creator-face ${face.id === selectedFaceId ? "is-selected" : ""} dieline-face-role-${face.role}`}
              key={face.id}
              points={face.vertices.map((v) => `${v.x},${v.y}`).join(" ")}
              onClick={() => onSelectFace(face.id)}
            />
          ))}
        </g>

        {/* Cut paths */}
        <g>
          {graph.cutPaths.map((cp) => (
            <path className="dieline-guide-line dieline-guide-cut" d={cp.d} key={cp.id} />
          ))}
        </g>

        {/* Crease lines */}
        <g>
          {graph.creases.map((c) => (
            <line
              className="dieline-guide-line dieline-guide-fold"
              key={c.id}
              x1={c.edgeStart.x}
              y1={c.edgeStart.y}
              x2={c.edgeEnd.x}
              y2={c.edgeEnd.y}
            />
          ))}
        </g>

        {/* Labels */}
        <g>
          {graph.faces.map((face) => (
            <text
              className="dieline-guide-label"
              key={face.id}
              x={face.centroid.x}
              y={face.centroid.y}
            >
              {face.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
