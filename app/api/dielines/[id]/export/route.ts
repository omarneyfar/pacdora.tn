import { NextResponse } from "next/server";

import { graphToDxf, graphToPdf, graphToSvg } from "@/domain/dieline/canonicalGeometry";
import { readDielineTemplate } from "@/server/dielines/service";

export const runtime = "nodejs";

type ExportRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: ExportRouteContext) {
  const { id } = await params;
  const format = normalizeFormat(new URL(request.url).searchParams.get("format"));
  const template = await readDielineTemplate(id);

  if (!template) {
    return NextResponse.json({ error: "Dieline not found." }, { status: 404 });
  }

  const baseName = sanitizeFilename(template.fileName || template.name || id);

  if (format === "dxf") {
    return new NextResponse(graphToDxf(template.graph), {
      headers: {
        "content-disposition": `attachment; filename="${baseName}.dxf"`,
        "content-type": "application/dxf; charset=utf-8",
      },
    });
  }

  if (format === "pdf") {
    return new NextResponse(graphToPdf(template.graph), {
      headers: {
        "content-disposition": `attachment; filename="${baseName}.pdf"`,
        "content-type": "application/pdf",
      },
    });
  }

  return new NextResponse(graphToSvg(template.graph), {
    headers: {
      "content-disposition": `attachment; filename="${baseName}.svg"`,
      "content-type": "image/svg+xml; charset=utf-8",
    },
  });
}

function normalizeFormat(value: string | null): "svg" | "pdf" | "dxf" {
  return value === "pdf" || value === "dxf" ? value : "svg";
}

function sanitizeFilename(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "dieline";
}
