"use client";

import { Download } from "lucide-react";

import { graphToDxf, graphToPdf, graphToSvg } from "@/domain/dieline/canonicalGeometry";
import type { DielineGraph, DielineTemplateExportFormat } from "@/domain/dieline/types";

type ExportActionsProps = {
  enabledFormats: DielineTemplateExportFormat[];
  fileName: string;
  graph: DielineGraph;
};

export function ExportActions({ enabledFormats, fileName, graph }: ExportActionsProps) {
  return (
    <div className="template-export-actions" aria-label="Download formats">
      {(["dxf", "pdf", "svg"] as const).map((format) => (
        <button
          className={format === "dxf" ? "primary-button template-download-main" : "secondary-button template-download-secondary"}
          disabled={!enabledFormats.includes(format)}
          key={format}
          type="button"
          onClick={() => downloadGraph(graph, fileName, format)}
        >
          <Download aria-hidden size={17} />
          {format.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function downloadGraph(graph: DielineGraph, fileName: string, format: DielineTemplateExportFormat) {
  const content = format === "dxf"
    ? graphToDxf(graph)
    : format === "pdf"
      ? graphToPdf(graph)
      : graphToSvg(graph);
  const mime = format === "dxf"
    ? "application/dxf;charset=utf-8"
    : format === "pdf"
      ? "application/pdf"
      : "image/svg+xml;charset=utf-8";
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${fileName}.${format}`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 250);
}

