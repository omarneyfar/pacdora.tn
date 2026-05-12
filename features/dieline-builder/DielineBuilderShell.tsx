"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Box, Boxes, ChevronRight, FileDown, Maximize2, PenTool, Rotate3D } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import {
  getDielineTemplateByRoute,
  mergeTemplateParameterValues,
  type RegisteredDielineTemplate,
} from "@/domain/dieline/templateRegistry";
import type { DielineLayer, DielineTemplateExportFormat, ParameterSpec, ParameterValueMap } from "@/domain/dieline/types";

import { ExportActions } from "./ExportActions";
import { createDefaultVisibleLayers, LayerControls } from "./LayerControls";
import { DielineViewport, getLayerPrimitiveCounts } from "./DielineViewport";
import { TemplateParameterPanel, type BuilderUnitMode } from "./TemplateParameterPanel";

const DielineCartonStage = dynamic(
  () => import("@/features/builder/DielineCartonStage").then((mod) => mod.DielineCartonStage),
  {
    ssr: false,
    loading: () => <div className="template-mockup-loading">Preparing mockup</div>,
  },
);

type DielineBuilderShellProps = {
  categorySlug: string;
  templateSlug: string;
};

type BuilderView = "dieline" | "mockup";

export function DielineBuilderShell({ categorySlug, templateSlug }: DielineBuilderShellProps) {
  const template = useMemo(() => getDielineTemplateByRoute(categorySlug, templateSlug), [categorySlug, templateSlug]);
  const [parameterValues, setParameterValues] = useState<ParameterValueMap>(() => template?.defaultValues ?? {});
  const [unitMode, setUnitMode] = useState<BuilderUnitMode>("mm");
  const [visibleLayers, setVisibleLayers] = useState<Record<DielineLayer, boolean>>(() => createDefaultVisibleLayers());
  const [view, setView] = useState<BuilderView>("dieline");
  const stageRef = useRef<HTMLElement>(null);

  const mergedValues = useMemo(
    () => template ? mergeTemplateParameterValues(template, parameterValues) : {},
    [parameterValues, template],
  );
  const graph = useMemo(() => template?.hasGenerator ? template.generate(mergedValues) : null, [mergedValues, template]);
  const displayValues = useMemo(
    () => {
      const generatedValues = graph?.metadata?.parameterValues ?? {};

      return {
        ...mergedValues,
        closureMode: generatedValues.closureMode ?? mergedValues.closureMode,
        TFW: generatedValues.TFW ?? mergedValues.TFW,
        TFR: generatedValues.TFR ?? mergedValues.TFR,
        GFW: generatedValues.GFW ?? mergedValues.GFW,
        DFW: generatedValues.DFW ?? mergedValues.DFW,
      };
    },
    [graph, mergedValues],
  );
  const layerCounts = useMemo(() => graph ? getLayerPrimitiveCounts(graph) : null, [graph]);
  const enabledFormats = useMemo(() => getEnabledFormats(template, mergedValues), [mergedValues, template]);

  if (!template) {
    return (
      <main className="template-builder-page">
        <TemplateBuilderTopbar />
        <section className="template-builder-missing">
          <strong>Template not found</strong>
          <Link className="secondary-button" href="/dielines/foldingBox">
            Back to Folding Box
          </Link>
        </section>
      </main>
    );
  }

  if (!template.hasGenerator) {
    return (
      <main className="template-builder-page">
        <TemplateBuilderTopbar template={template} />

        <section className="template-builder-grid">
          <nav className="template-builder-catalog-rail" aria-label="Template navigation">
            <Link href="/dielines">Dielines</Link>
            <ChevronRight aria-hidden size={15} />
            <Link href="/dielines/foldingBox">Folding Box</Link>
            <ChevronRight aria-hidden size={15} />
            <span>{template.label}</span>
          </nav>

          <section className="template-builder-stage" ref={stageRef} aria-label="Catalog template details">
            <div className="template-stage-toolbar">
              <div>
                <span className="eyebrow">Catalog Template</span>
                <h1>{template.label}</h1>
              </div>
              <span className="template-status-queued">Generator not implemented yet</span>
            </div>
            <TemplateCatalogOnlyDetails template={template} />
          </section>

          <TemplateParameterPanel
            template={template}
            unitMode={unitMode}
            values={displayValues}
            onChange={setParameterValue}
            onUnitModeChange={setUnitMode}
          />

          <aside className="template-builder-actions" aria-label="Template actions">
            <div className="template-action-block">
              <span className="eyebrow">Generation</span>
              <button className="secondary-button" disabled type="button">
                Generator missing
              </button>
            </div>
            <div className="template-action-grid">
              <Link className="secondary-button" href="/dielines/foldingBox">
                Back to catalog
              </Link>
            </div>
          </aside>
        </section>
      </main>
    );
  }

  if (!graph || !layerCounts) {
    return (
      <main className="template-builder-page">
        <TemplateBuilderTopbar template={template} />
        <section className="template-builder-missing">
          <strong>Template generator failed</strong>
          <Link className="secondary-button" href="/dielines/foldingBox">
            Back to Folding Box
          </Link>
        </section>
      </main>
    );
  }

  function setParameterValue(spec: ParameterSpec, value: string | number | boolean) {
    setParameterValues((current) => {
      if (spec.id === "closureMode" && value === "manual") {
        const currentClosureValues = graph?.metadata?.parameterValues ?? {};

        return {
          ...current,
          TFW: currentClosureValues.TFW ?? current.TFW,
          TFR: currentClosureValues.TFR ?? current.TFR,
          GFW: currentClosureValues.GFW ?? current.GFW,
          DFW: currentClosureValues.DFW ?? current.DFW,
          [spec.id]: value,
        };
      }

      return {
        ...current,
        [spec.id]: value,
      };
    });
  }

  function toggleLayer(layer: DielineLayer) {
    setVisibleLayers((current) => ({
      ...current,
      [layer]: !current[layer],
    }));
  }

  return (
    <main className="template-builder-page">
      <TemplateBuilderTopbar template={template} />

      <section className="template-builder-grid">
        <nav className="template-builder-catalog-rail" aria-label="Template navigation">
          <Link href="/dielines">Dielines</Link>
          <ChevronRight aria-hidden size={15} />
          <Link href="/dielines/foldingBox">Folding Box</Link>
          <ChevronRight aria-hidden size={15} />
          <span>{template.label}</span>
        </nav>

        <section className="template-builder-stage" ref={stageRef} aria-label="Dieline generator">
          <div className="template-stage-toolbar">
            <div>
              <span className="eyebrow">Packaging Box Design Template</span>
              <h1>{template.label}</h1>
            </div>
            <div className="template-stage-tabs" aria-label="Preview mode">
              <button className={view === "dieline" ? "is-active" : ""} type="button" onClick={() => setView("dieline")}>
                <FileDown aria-hidden size={16} />
                Dieline
              </button>
              <button className={view === "mockup" ? "is-active" : ""} type="button" onClick={() => setView("mockup")}>
                <Rotate3D aria-hidden size={16} />
                Mockup
              </button>
            </div>
          </div>

          <div className="template-stage-body">
            {view === "dieline" ? (
              <DielineViewport graph={graph} visibleLayers={visibleLayers} />
            ) : (
              <div className="template-mockup-shell">
                <DielineCartonStage graph={graph} faces={{}} />
              </div>
            )}
          </div>

          <div className="template-stage-footer">
            <LayerControls counts={layerCounts} visibleLayers={visibleLayers} onToggle={toggleLayer} />
            <div className="template-derived-stats" aria-label="Template stats">
              <span>{formatMetric(graph.size.width)} x {formatMetric(graph.size.height)} mm</span>
              <span>{graph.faces.length} faces</span>
              <span>{graph.creases.length} creases</span>
            </div>
          </div>
        </section>

        <TemplateParameterPanel
          template={template}
          unitMode={unitMode}
          values={displayValues}
          onChange={setParameterValue}
          onUnitModeChange={setUnitMode}
        />

        <aside className="template-builder-actions" aria-label="Template actions">
          <div className="template-action-block">
            <span className="eyebrow">Download the Dieline</span>
            <ExportActions enabledFormats={enabledFormats} fileName={template.id} graph={graph} />
          </div>
          <div className="template-action-grid">
            <button className="secondary-button" type="button" onClick={() => setView("mockup")}>
              <Boxes aria-hidden size={17} />
              Mockup
            </button>
            <button className="secondary-button" disabled type="button">
              <PenTool aria-hidden size={17} />
              Create Artwork
            </button>
            <button className="secondary-button" type="button" onClick={() => stageRef.current?.requestFullscreen()}>
              <Maximize2 aria-hidden size={17} />
              Full screen
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}

function TemplateCatalogOnlyDetails({ template }: { template: RegisteredDielineTemplate }) {
  const catalog = template.catalogTemplate;
  const warnings = [
    ...catalog.warnings.map((warning) => typeof warning === "string" ? warning : warning.message),
    ...(catalog.productionStatus.warning ? [catalog.productionStatus.warning] : []),
  ];

  return (
    <div className="template-catalog-only-details">
      <section>
        <h2>Catalog status</h2>
        <p>{catalog.description}</p>
        <div className="template-card-badges">
          <span>{catalog.runtime.status}</span>
          <span>{catalog.productionStatus.productionRiskLevel ?? "medium"} risk</span>
          <span>{catalog.source.website ?? "source recorded"}</span>
          <span>manual verification required</span>
        </div>
      </section>

      {warnings.length > 0 ? (
        <section>
          <h2>Warnings</h2>
          <ul>
            {warnings.slice(0, 5).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2>Manufacturing notes</h2>
        <p>{catalog.manufacturingRules.dieCuttingNotes ?? "Use named cut, crease, glue, bleed, and safe layers."}</p>
        <p>{catalog.manufacturingRules.assemblyNotes ?? "Prototype before production."}</p>
      </section>

      {catalog.variants.length > 0 ? (
        <section>
          <h2>Variants</h2>
          <div className="template-card-parameters">
            {catalog.variants.slice(0, 8).map((variant) => (
              <span key={variant.variantId}>{variant.variantName}</span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TemplateBuilderTopbar({ template }: { template?: RegisteredDielineTemplate }) {
  return (
    <header className="template-builder-topbar">
      <Link className="template-builder-brand" href="/dielines">
        <span className="brand-mark">
          <Box aria-hidden size={19} />
        </span>
        <span>
          <strong>FoldView</strong>
          <em>Dieline generator</em>
        </span>
      </Link>
      <div className="template-builder-topbar-actions">
        <Link className="secondary-button" href="/dielines/foldingBox">
          Folding Box
        </Link>
        <Link className="secondary-button" href="/projects">
          Projects
        </Link>
        {template ? <span className="dimension-pill">{template.exportFormats.map((format) => format.toUpperCase()).join(" / ")}</span> : null}
      </div>
    </header>
  );
}

function getEnabledFormats(template: RegisteredDielineTemplate | null, values: ParameterValueMap): DielineTemplateExportFormat[] {
  if (!template) return [];

  return template.exportFormats.filter((format) => {
    if (format === "dxf") return values.dxfExport !== false;
    if (format === "pdf") return values.pdfExport !== false;
    return true;
  });
}

function formatMetric(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
