import { NextResponse } from "next/server";

import { readProjectAssetImage } from "@/server/projects/service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; asset: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id, asset } = await context.params;
  const image = await readProjectAssetImage(id, asset);

  if (!image) {
    return NextResponse.json({ error: "Artwork source not found." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(image.buffer), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": image.contentType
    }
  });
}
