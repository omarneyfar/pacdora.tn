"use client";

import Link from "next/link";
import { Box, CheckCircle2, ChevronRight, Clock3, FileUp } from "lucide-react";
import { useMemo } from "react";

import { generateCefBoxFoldingBoxGraph } from "@/domain/dieline/templates/foldingBoxVariants";
import {
  getDielineTemplateCategories,
  getFoldingBoxDefinition,
  getImplementedFoldingBoxCount,
  listDielineTemplateSummaries,
} from "@/domain/dieline/templateRegistry";
import { DielinePreview } from "@/features/dielines/DielinePreview";

type DielineTemplateCategoryPageProps = {
  categorySlug: string;
};

export function DielineTemplateCategoryPage({ categorySlug }: DielineTemplateCategoryPageProps) {
  const category = getDielineTemplateCategories().find((candidate) => candidate.slug === categorySlug);
  const templates = useMemo(() => listDielineTemplateSummaries(categorySlug), [categorySlug]);
  const implementedCount = getImplementedFoldingBoxCount();

  if (!category) {
    return (
      <main className="template-catalog-page">
        <TemplateCatalogTopbar />
        <section className="template-catalog-empty">
          <strong>Category not found</strong>
          <Link className="secondary-button" href="/dielines">
            Back to Dielines
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="template-catalog-page">
      <TemplateCatalogTopbar />

      <section className="template-catalog-main" aria-label={`${category.label} templates`}>
        <nav className="template-builder-catalog-rail" aria-label="Template navigation">
          <Link href="/dielines">Dielines</Link>
          <ChevronRight aria-hidden size={15} />
          <span>{category.label}</span>
        </nav>

        <header className="template-catalog-header">
          <div>
            <span className="eyebrow">Collection of Product Packaging Templates</span>
            <h1>{category.label}</h1>
            <p>{category.description}</p>
          </div>
          <div className="template-catalog-stats">
            <span>{category.totalTemplates} templates</span>
            <span>{implementedCount} active generator</span>
          </div>
        </header>

        <div className="template-catalog-grid">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      </section>
    </main>
  );
}

function TemplateCard({ template }: { template: ReturnType<typeof listDielineTemplateSummaries>[number] }) {
  const definition = getFoldingBoxDefinition(template.id);
  const graph = definition ? generateCefBoxFoldingBoxGraph(definition) : null;

  return (
    <article className={template.isImplemented ? "template-card is-active" : "template-card"}>
      {graph ? <DielinePreview className="template-card-preview" graph={graph} /> : <div className="template-card-preview" />}
      <div className="template-card-body">
        <div className="template-card-title">
          <h2>{template.label}</h2>
          <span className={template.isImplemented ? "template-status-ready" : "template-status-queued"}>
            {template.isImplemented ? <CheckCircle2 aria-hidden size={15} /> : <Clock3 aria-hidden size={15} />}
            {template.isImplemented ? "Generator" : "Queued"}
          </span>
        </div>
        <p>{template.description}</p>
        <div className="template-card-parameters">
          {template.parameters.slice(0, 8).map((parameter) => (
            <span key={parameter}>{parameter}</span>
          ))}
          {template.parameters.length > 8 ? <span>+{template.parameters.length - 8}</span> : null}
        </div>
      </div>
      {template.href ? (
        <Link className="primary-button template-card-action" href={template.href}>
          Open generator
        </Link>
      ) : (
        <button className="secondary-button template-card-action" disabled type="button">
          Prepare later
        </button>
      )}
    </article>
  );
}

function TemplateCatalogTopbar() {
  return (
    <header className="template-builder-topbar">
      <Link className="template-builder-brand" href="/dielines">
        <span className="brand-mark">
          <Box aria-hidden size={19} />
        </span>
        <span>
          <strong>FoldView</strong>
          <em>Dielines</em>
        </span>
      </Link>
      <div className="template-builder-topbar-actions">
        <Link className="secondary-button" href="/dielines">
          Library
        </Link>
        <Link className="primary-button" href="/dielines/new">
          <FileUp aria-hidden size={17} />
          Import dieline
        </Link>
      </div>
    </header>
  );
}

