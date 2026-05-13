"use client";

import { useEffect, useMemo, type CSSProperties, type ReactNode } from "react";

import type { Anchor } from "@/domain/dieline/componentEngine";
import type { DielineGraph, GeometryPrimitive, Point } from "@/domain/dieline/types";
import { DielineRenderer } from "@/features/builder/components/DielineRenderer";

type DebugGraphComparison = {
  ok: boolean;
  differences: string[];
};

type ReverseTuckEndV2DebugClientProps = {
  anchors: Anchor[];
  catalogComparison: DebugGraphComparison;
  catalogGraph: DielineGraph;
  catalogResolvedParameters: Record<string, string | number | boolean>;
  debugComparison: DebugGraphComparison;
  graph: DielineGraph;
  inputValues: Record<string, number>;
  recipeId: string;
  warnings: string[];
};

const noop = () => undefined;

export function ReverseTuckEndV2DebugClient({
  anchors,
  catalogComparison,
  catalogGraph,
  catalogResolvedParameters,
  debugComparison,
  graph,
  inputValues,
  recipeId,
  warnings,
}: ReverseTuckEndV2DebugClientProps) {
  const resolvedParameters = useMemo(() => graph.metadata?.parameterValues ?? {}, [graph.metadata?.parameterValues]);

  useEffect(() => {
    console.info("[dieline-v2-debug] generator", "generateFromRecipe");
    console.info("[dieline-v2-debug] recipe id", recipeId);
    console.info("[dieline-v2-debug] input parameters", inputValues);
    console.info("[dieline-v2-debug] resolved parameters", resolvedParameters);
    console.info("[dieline-v2-debug] catalog-path resolved parameters", catalogResolvedParameters);
    console.info("[dieline-v2-debug] direct-vs-debug comparison", debugComparison);
    console.info("[dieline-v2-debug] direct-vs-catalog comparison", catalogComparison);
  }, [catalogComparison, catalogResolvedParameters, debugComparison, inputValues, recipeId, resolvedParameters]);

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Hidden v2 diagnostics</p>
          <h1 style={titleStyle}>Reverse Tuck End v2</h1>
        </div>
        <StatusPill ok={debugComparison.ok} label={debugComparison.ok ? "script = dev page" : "script mismatch"} />
        <StatusPill ok={catalogComparison.ok} label={catalogComparison.ok ? "catalog = direct" : "catalog differs"} />
      </header>

      <section style={gridStyle}>
        <Panel title="Normal 2D Renderer">
          <DielineRenderer
            busyFace={null}
            dimensions={{ width: inputValues.L, depth: inputValues.W, height: inputValues.H }}
            faces={{}}
            graph={graph}
            selectedSourceId=""
            showPrintGuides
            onApplySelected={noop}
            onClear={noop}
            onCrop={noop}
            onUpload={noop}
          />
        </Panel>

        <Panel title="Debug SVG Overlay">
          <DebugSvg anchors={anchors} graph={graph} />
        </Panel>
      </section>

      <section style={gridStyle}>
        <Panel title="Direct v2 vs Debug Result">
          <ComparisonBlock comparison={debugComparison} />
        </Panel>

        <Panel title="Direct v2 vs Catalog Product Path">
          <ComparisonBlock comparison={catalogComparison} />
        </Panel>
      </section>

      <section style={gridStyle}>
        <Panel title="Graph Identity">
          <KeyValue label="generator" value="generateFromRecipe" />
          <KeyValue label="recipe id" value={recipeId} />
          <KeyValue label="graph size" value={`${format(graph.size.width)} x ${format(graph.size.height)}`} />
          <KeyValue label="graph.source" value={JSON.stringify(graph.source)} />
          <KeyValue label="catalog generatorId" value={String(catalogGraph.metadata?.catalog?.generatorId ?? "missing")} />
          <KeyValue label="catalog graph size" value={`${format(catalogGraph.size.width)} x ${format(catalogGraph.size.height)}`} />
        </Panel>

        <Panel title="Warnings">
          {warnings.length > 0 ? (
            <ul style={listStyle}>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p style={mutedStyle}>No v2 warnings for this input.</p>
          )}
        </Panel>
      </section>

      <section style={gridStyle}>
        <Panel title="Face IDs">
          <CodeList values={graph.faces.map((face) => face.id)} />
        </Panel>

        <Panel title="Crease IDs">
          <CodeList values={graph.creases.map((crease) => crease.id)} />
        </Panel>
      </section>

      <section style={gridStyle}>
        <Panel title="Input Parameters">
          <JsonBlock value={inputValues} />
        </Panel>

        <Panel title="Resolved Parameters">
          <JsonBlock value={resolvedParameters} />
        </Panel>
      </section>

      <section style={gridStyle}>
        <Panel title="Catalog Path Resolved Parameters">
          <JsonBlock value={catalogResolvedParameters} />
        </Panel>

        <Panel title="Graph JSON Preview">
          <JsonBlock value={graph} />
        </Panel>
      </section>
    </main>
  );
}

function DebugSvg({ anchors, graph }: { anchors: Anchor[]; graph: DielineGraph }) {
  const padding = 36;
  const width = graph.size.width + padding * 2;
  const height = graph.size.height + padding * 2;
  const scoreLines = (graph.geometry ?? []).filter(isScoreLine);

  return (
    <svg
      aria-label="Reverse tuck end v2 debug overlay"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      style={debugSvgStyle}
      viewBox={`0 0 ${format(width)} ${format(height)}`}
    >
      <rect fill="#fbfaf7" height={format(height)} width={format(width)} x="0" y="0" />
      <g transform={`translate(${format(padding)} ${format(padding)})`}>
        <g fill="none" stroke="#d12f2f" strokeWidth="0.45">
          {graph.cutPaths.map((cutPath) =>
            cutPath.points?.length ? (
              <polyline key={cutPath.id} points={pointsAttr(cutPath.points)} />
            ) : cutPath.d ? (
              <path d={cutPath.d} key={cutPath.id} />
            ) : null,
          )}
        </g>

        <g fill="rgba(255,255,255,0.64)" stroke="#2f3437" strokeWidth="0.35">
          {graph.faces.map((face) => (
            <polygon key={face.id} points={pointsAttr(face.vertices)} />
          ))}
        </g>

        <g fill="none" stroke="#2364aa" strokeDasharray="2 1" strokeWidth="0.55">
          {graph.creases.map((crease) => (
            <line
              key={crease.id}
              x1={format(crease.edgeStart.x)}
              x2={format(crease.edgeEnd.x)}
              y1={format(crease.edgeStart.y)}
              y2={format(crease.edgeEnd.y)}
            />
          ))}
        </g>

        <g fill="none" stroke="#d88400" strokeDasharray="1.4 1" strokeWidth="0.45">
          {scoreLines.map((primitive) => (
            <line
              key={primitive.id}
              x1={format(primitive.start.x)}
              x2={format(primitive.end.x)}
              y1={format(primitive.start.y)}
              y2={format(primitive.end.y)}
            />
          ))}
        </g>

        <g fill="#198754" stroke="#198754" strokeWidth="0.35">
          {anchors.map((anchor) => (
            <g key={anchor.id}>
              <line x1={format(anchor.start.x)} x2={format(anchor.end.x)} y1={format(anchor.start.y)} y2={format(anchor.end.y)} />
              <circle cx={format(anchor.start.x)} cy={format(anchor.start.y)} r="1.25" />
              <circle cx={format(anchor.end.x)} cy={format(anchor.end.y)} r="1.25" />
            </g>
          ))}
        </g>

        <g fill="#111827" style={svgLabelStyle}>
          {graph.faces.map((face) => (
            <text key={face.id} textAnchor="middle" x={format(face.centroid.x)} y={format(face.centroid.y)}>
              {face.id}
            </text>
          ))}
        </g>

        <g fill="#174a7c" style={svgLabelStyle}>
          {graph.creases.map((crease) => {
            const midpoint = midpointOf(crease.edgeStart, crease.edgeEnd);
            return (
              <text key={crease.id} textAnchor="middle" x={format(midpoint.x)} y={format(midpoint.y - 1.6)}>
                {crease.id}
              </text>
            );
          })}
        </g>

        <g fill="#0f6b3f" style={svgLabelStyle}>
          {anchors.map((anchor) => {
            const midpoint = midpointOf(anchor.start, anchor.end);
            return (
              <text
                key={anchor.id}
                textAnchor="middle"
                x={format(midpoint.x + anchor.normal.x * 3)}
                y={format(midpoint.y + anchor.normal.y * 3)}
              >
                {anchor.id}
              </text>
            );
          })}
        </g>
      </g>
    </svg>
  );
}

function StatusPill({ label, ok }: { label: string; ok: boolean }) {
  return <span style={{ ...pillStyle, background: ok ? "#e7f5ed" : "#fff4df", color: ok ? "#17603a" : "#8a5a00" }}>{label}</span>;
}

function Panel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section style={panelStyle}>
      <h2 style={panelTitleStyle}>{title}</h2>
      {children}
    </section>
  );
}

function ComparisonBlock({ comparison }: { comparison: DebugGraphComparison }) {
  if (comparison.ok) {
    return <p style={okStyle}>All asserted graph fields match.</p>;
  }

  return (
    <ul style={listStyle}>
      {comparison.differences.map((difference) => (
        <li key={difference}>{difference}</li>
      ))}
    </ul>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div style={keyValueStyle}>
      <span style={mutedStyle}>{label}</span>
      <code>{value}</code>
    </div>
  );
}

function CodeList({ values }: { values: string[] }) {
  return (
    <div style={codeListStyle}>
      {values.map((value) => (
        <code key={value}>{value}</code>
      ))}
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return <pre style={preStyle}>{JSON.stringify(value, null, 2)}</pre>;
}

function isScoreLine(primitive: GeometryPrimitive): primitive is Extract<GeometryPrimitive, { type: "line" }> {
  return primitive.type === "line" && primitive.id.startsWith("score-");
}

function midpointOf(start: Point, end: Point): Point {
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

function pointsAttr(points: Point[]) {
  return points.map((point) => `${format(point.x)},${format(point.y)}`).join(" ");
}

function format(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

const pageStyle: CSSProperties = {
  background: "#f6f4ef",
  color: "#1f2a24",
  display: "grid",
  gap: 18,
  minHeight: "100dvh",
  padding: 24,
};

const headerStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  justifyContent: "space-between",
};

const eyebrowStyle: CSSProperties = {
  color: "#69746c",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0,
  margin: 0,
  textTransform: "uppercase",
};

const titleStyle: CSSProperties = {
  fontSize: 28,
  letterSpacing: 0,
  margin: 0,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
};

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #ddd8cd",
  borderRadius: 8,
  display: "grid",
  gap: 12,
  minWidth: 0,
  padding: 16,
};

const panelTitleStyle: CSSProperties = {
  fontSize: 15,
  letterSpacing: 0,
  margin: 0,
};

const debugSvgStyle: CSSProperties = {
  background: "#fbfaf7",
  border: "1px solid #e5dfd4",
  borderRadius: 6,
  minHeight: 420,
  width: "100%",
};

const svgLabelStyle: CSSProperties = {
  fontFamily: "Arial, sans-serif",
  fontSize: 4,
  paintOrder: "stroke",
  stroke: "#fff",
  strokeLinejoin: "round",
  strokeWidth: "1.2px",
};

const pillStyle: CSSProperties = {
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 13,
  fontWeight: 700,
  padding: "8px 10px",
};

const okStyle: CSSProperties = {
  color: "#17603a",
  fontWeight: 700,
  margin: 0,
};

const mutedStyle: CSSProperties = {
  color: "#69746c",
};

const listStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  margin: 0,
  paddingLeft: 18,
};

const keyValueStyle: CSSProperties = {
  display: "grid",
  gap: 4,
};

const codeListStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const preStyle: CSSProperties = {
  background: "#f7f4ee",
  border: "1px solid #e5dfd4",
  borderRadius: 6,
  fontSize: 12,
  lineHeight: 1.45,
  margin: 0,
  maxHeight: 420,
  overflow: "auto",
  padding: 12,
  whiteSpace: "pre-wrap",
};
