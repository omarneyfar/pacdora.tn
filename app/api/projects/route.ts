import { NextResponse } from "next/server";

import { createProject, listProjects, type ProjectInput } from "@/lib/server/projects";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projects = await listProjects({
      limit: Number(url.searchParams.get("limit") ?? 50),
      query: url.searchParams.get("q") ?? "",
      status: normalizeStatusFilter(url.searchParams.get("status"))
    });

    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load projects." },
      { status: 400 }
    );
  }
}

function normalizeStatusFilter(value: string | null) {
  return value === "draft" || value === "published" ? value : "all";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProjectInput;
    const project = await createProject(body);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save the project." },
      { status: 400 }
    );
  }
}
