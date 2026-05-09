"use client";

import { FACE_SPECS, type FaceKey } from "@/lib/carton";

const MAX_LONG_EDGE = 1400;

export async function createCroppedFaceArtwork(file: File, face: FaceKey): Promise<string> {
  const sourceUrl = file.type === "application/pdf" ? await renderPdfFirstPage(file) : await readImageFile(file);
  const image = await loadImage(sourceUrl);
  return cropToFace(image, face);
}

function readImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Upload a PNG, JPG, or PDF file."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

async function renderPdfFirstPage(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/webpack.mjs");
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, MAX_LONG_EDGE / Math.max(viewport.width, viewport.height));
  const scaledViewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("This browser could not prepare the PDF preview.");
  }

  canvas.width = Math.round(scaledViewport.width);
  canvas.height = Math.round(scaledViewport.height);

  await page.render({
    canvas,
    canvasContext: context,
    viewport: scaledViewport
  }).promise;

  return canvas.toDataURL("image/png");
}

function loadImage(sourceUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the selected artwork."));
    image.src = sourceUrl;
  });
}

function cropToFace(image: HTMLImageElement, face: FaceKey): string {
  const spec = FACE_SPECS[face];
  const targetAspect = spec.width / spec.height;
  const sourceAspect = image.naturalWidth / image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;

  if (sourceAspect > targetAspect) {
    sourceWidth = sourceHeight * targetAspect;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = sourceWidth / targetAspect;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }

  const scale = MAX_LONG_EDGE / Math.max(spec.width, spec.height);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("This browser could not crop the artwork.");
  }

  canvas.width = Math.round(spec.width * scale);
  canvas.height = Math.round(spec.height * scale);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/png");
}
