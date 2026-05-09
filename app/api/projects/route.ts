import { NextResponse } from "next/server";

import { createProject, type ProjectInput } from "@/lib/server/projects";

export const runtime = "nodejs";

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
