import { NextResponse } from "next/server";

import {
  deleteDielineTemplate,
  readDielineTemplate,
  updateDielineTemplate,
  type DielineTemplateInput,
} from "@/server/dielines/service";

export const runtime = "nodejs";

type DielineRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: DielineRouteContext) {
  const { id } = await params;
  const template = await readDielineTemplate(id);

  if (!template) {
    return NextResponse.json({ error: "Dieline not found." }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PATCH(request: Request, { params }: DielineRouteContext) {
  try {
    const { id } = await params;
    const body = (await request.json()) as DielineTemplateInput;
    const template = await updateDielineTemplate(id, body);

    if (!template) {
      return NextResponse.json({ error: "Dieline not found." }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update this dieline." },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, { params }: DielineRouteContext) {
  const { id } = await params;
  const deleted = await deleteDielineTemplate(id);

  if (!deleted) {
    return NextResponse.json({ error: "Dieline not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
