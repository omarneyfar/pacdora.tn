import { NextResponse } from "next/server";

import { createDielineTemplate, listDielineTemplates, type DielineTemplateInput } from "@/server/dielines/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const templates = await listDielineTemplates({
      limit: Number(url.searchParams.get("limit") ?? 80),
      query: url.searchParams.get("q") ?? "",
      status: normalizeStatusFilter(url.searchParams.get("status")),
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load dielines." },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DielineTemplateInput;
    const template = await createDielineTemplate(body);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save the dieline." },
      { status: 400 }
    );
  }
}

function normalizeStatusFilter(value: string | null) {
  return value === "draft" || value === "ready" ? value : "all";
}
