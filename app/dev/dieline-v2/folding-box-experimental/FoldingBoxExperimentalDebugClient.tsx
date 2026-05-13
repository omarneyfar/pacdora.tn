"use client";

import { useEffect, type CSSProperties } from "react";

import type { Anchor } from "@/domain/dieline/componentEngine";
import { primitiveToSvgPath } from "@/domain/dieline/canonicalGeometry";
import type { DielineGraph, Point } from "@/domain/dieline/types";
import { DielineRenderer } from "@/features/builder/components/DielineRenderer";

type ExperimentalTemplateDebug = {
  anchors: Anchor[];
  graph: DielineGraph;
  inputValues: { L: number; W: number; H: number };
  recipeId: string;
  slug: string;
  status: {
    experimentalStatus: string;
    implementationStatus: string;
    productionReady: boolean;
    verificationStatus: string;
  };
  warnings: string[];
};

type FoldingBoxExperimentalDebugClientProps = {
  templates: ExperimentalTemplateDebug[];
};

const noop = () => undefined;

export function FoldingBoxExperimentalDebugClient({ templates }: FoldingBoxExperimentalDebugClientProps) {
  useEffect(() => {
    for (const template of templates) {
      console.info("[dieline-v2-experimental]", template.slug, {
        generator: "generateFromRecipeDebug",
        recipeId: template.recipeId,
        inputValues: template.inputValues,
        resolvedParameters: template.graph.metadata?.parameterValues,
        status: template.status,
        warnings: template.warnings,
      });
    }
  }, [templates]);

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Hidden v2 diagnostics</p>
          <h1 style={titleStyle}>Folding Box Experimental Recipes</h1>
        </div>
        <div style={badgeRowStyle}>
          <Badge label="Experimental" tone="warning" />
          <Badge label="Reference pending" tone="warning" />
          <Badge label="Not production-ready" tone="danger" />
        </div>
      </header>

      <section style={templateListStyle}>
        {templates.map((template) => (
          <article key={template.slug} style={templateSectionStyle}>
            <header style={templateHeaderStyle}>
              <div>
                <p style={slugStyle}>{template.slug}</p>
                <h2 style={sectionTitleStyle}>{template.graph.metadata?.familyLabel ?? template.recipeId}</h2>
              </div>
              <div style={badgeRowStyle}>
                <Badge label={template.status.experimentalStatus} tone="warning" />
                <Badge label={template.status.verificationStatus} tone="neutral" />
              </div>
            </header>

            <div style={gridStyle}>
              <section style={panelStyle}>
                <h3 style={panelTitleStyle}>Normal Renderer</h3>
                <DielineRenderer
                  busyFace={null}
                  dimensions={{
                    width: template.inputValues.L,
                    depth: template.inputValues.W,
                    height: template.inputValues.H,
                  }}
                  faces={{}}
                  graph={template.graph}
                  selectedSourceId=""
                  showPrintGuides
                  onApplySelected={noop}
                  onClear={noop}
                  onCrop={noop}
                  onUpload={noop}
                />
              </section>

              <section style={panelStyle}>
                <h3 style={panelTitleStyle}>Debug Overlay</h3>
                <DebugSvg anchors={template.anchors} graph={template.graph} />
              </section>
            </div>

            <div style={metaGridStyle}>
              <InfoBlock label="Graph size" value={`${format(template.graph.size.width)} x ${format(template.graph.size.height)}`} />
              <InfoBlock label="Faces" value={String(template.graph.faces.length)} />
              <InfoBlock label="Creases" value={String(template.graph.creases.length)} />
              <InfoBlock label="Geometry" value={String(template.graph.geometry?.length ?? 0)} />
              <InfoBlock label="Anchors" value={String(template.anchors.length)} />
              <InfoBlock label="Production ready" value={String(template.status.productionReady)} />
            </div>

            <section style={panelStyle}>
              <h3 style={panelTitleStyle}>Warnings</h3>
              {template.warnings.length > 0 ? (
                <ul style={listStyle}>
                  {template.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p style={mutedStyle}>No warnings for this input.</p>
              )}
            </section>
          </article>
        ))}
      </section>
    </main>
  );
}

function DebugSvg({ anchors, graph }: { anchors: Anchor[]; graph: DielineGraph }) {
  const padding = 30;
  const width = graph.size.width + padding * 2;
  const height = graph.size.height + padding * 2;
  const guides = graph.geometry?.filter((primitive) => primitive.layer !== "label") ?? [];

  return (
    <svg
      aria-label={`${graph.metadata?.familyLabel ?? "Experimental dieline"} debug overlay`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      style={debugSvgStyle}
      viewBox={`0 0 ${format(width)} ${format(height)}`}
    >
      <rect fill="#fbfaf7" height={format(height)} width={format(width)} x="0" y="0" />
      <g transform={`translate(${padding} ${padding})`}>
        <g fill="rgba(255,255,255,0.64)" stroke="#2f3437" strokeWidth="0.35">
          {graph.faces.map((face) => (
            <polygon key={face.id} points={pointsAttr(face.vertices)} />
          ))}
        </g>
        <g fill="none">
          {guides.map((primitive) => (
            <path
              d={primitiveToSvgPath(primitive)}
              key={primitive.id}
              stroke={guideColor(primitive.layer)}
              strokeDasharray={primitive.layer === "crease" ? "2 1" : undefined}
              strokeWidth={primitive.layer === "hole" || primitive.layer === "window" ? "0.7" : "0.45"}
            />
          ))}
        </g>
        <g fill="#198754" stroke="#198754" strokeWidth="0.35">
          {anchors.map((anchor) => (
            <g key={anchor.id}>
              <line x1={format(anchor.start.x)} x2={format(anchor.end.x)} y1={format(anchor.start.y)} y2={format(anchor.end.y)} />
              <circle cx={format(anchor.start.x)} cy={format(anchor.start.y)} r="1.1" />
              <circle cx={format(anchor.end.x)} cy={format(anchor.end.y)} r="1.1" />
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

function Badge({ label, tone }: { label: string; tone: "danger" | "neutral" | "warning" }) {
  const style = tone === "danger" ? dangerBadgeStyle : tone === "warning" ? warningBadgeStyle : neutralBadgeStyle;
  return <span style={{ ...badgeStyle, ...style }}>{label}</span>;
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoBlockStyle}>
      <span style={mutedStyle}>{label}</span>
      <code>{value}</code>
    </div>
  );
}

function guideColor(layer: string) {
  if (layer === "crease") return "#2364aa";
  if (layer === "hole" || layer === "window") return "#0f8f57";
  if (layer === "perf") return "#8a5a00";
  return "#d12f2f";
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
  gap: 22,
  minHeight: "100dvh",
  padding: 24,
};

const headerStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
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

const templateListStyle: CSSProperties = {
  display: "grid",
  gap: 24,
};

const templateSectionStyle: CSSProperties = {
  borderTop: "1px solid #d8d2c5",
  display: "grid",
  gap: 16,
  paddingTop: 20,
};

const templateHeaderStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  justifyContent: "space-between",
};

const slugStyle: CSSProperties = {
  color: "#69746c",
  fontSize: 13,
  margin: 0,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 20,
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
  minHeight: 360,
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

const badgeRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const badgeStyle: CSSProperties = {
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 12,
  fontWeight: 700,
  padding: "7px 9px",
};

const warningBadgeStyle: CSSProperties = {
  background: "#fff4df",
  color: "#8a5a00",
};

const dangerBadgeStyle: CSSProperties = {
  background: "#fdecec",
  color: "#9b1c1c",
};

const neutralBadgeStyle: CSSProperties = {
  background: "#edf1f5",
  color: "#354152",
};

const metaGridStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
};

const infoBlockStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #ddd8cd",
  borderRadius: 8,
  display: "grid",
  gap: 4,
  padding: 12,
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
