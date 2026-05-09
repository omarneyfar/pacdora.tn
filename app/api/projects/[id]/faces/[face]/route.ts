import { NextResponse } from "next/server";

import { readFaceImage } from "@/lib/server/projects";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; face: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id, face } = await context.params;
  const image = await readFaceImage(id, face);

  if (!image) {
    return NextResponse.json({ error: "Artwork not found." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/png"
    }
  });
}
