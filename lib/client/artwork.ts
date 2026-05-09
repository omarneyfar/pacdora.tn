"use client";

import { getFaceSpecs, type CartonDimensions, type FaceKey } from "@/lib/carton";

const MAX_LONG_EDGE = 1400;

export type CropSettings = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export type ArtworkImport = {
  dataUrl: string;
  fileName: string;
  sourceType: "image" | "pdf";
};

export const DEFAULT_CROP_SETTINGS: CropSettings = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0
};

export async function importArtworkFile(file: File): Promise<ArtworkImport> {
  const sourceUrl = file.type === "application/pdf" ? await renderPdfFirstPage(file) : await readImageFile(file);

  return {
    dataUrl: sourceUrl,
    fileName: file.name,
    sourceType: file.type === "application/pdf" ? "pdf" : "image"
  };
}

export async function cropArtworkToFace(
  sourceUrl: string,
  face: FaceKey,
  dimensions: CartonDimensions,
  settings: CropSettings = DEFAULT_CROP_SETTINGS
): Promise<string> {
  const image = await loadImage(sourceUrl);
  return cropToFace(image, face, dimensions, settings);
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

function cropToFace(
  image: HTMLImageElement,
  face: FaceKey,
  dimensions: CartonDimensions,
  settings: CropSettings
): string {
  const spec = getFaceSpecs(dimensions)[face];
  const targetAspect = spec.artworkWidth / spec.artworkHeight;
  const sourceAspect = image.naturalWidth / image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  const zoom = Math.min(3, Math.max(1, settings.zoom));

  if (sourceAspect > targetAspect) {
    sourceWidth = sourceHeight * targetAspect;
  } else {
    sourceHeight = sourceWidth / targetAspect;
  }

  sourceWidth /= zoom;
  sourceHeight /= zoom;
  sourceX = panToSourceCoordinate(image.naturalWidth, sourceWidth, settings.offsetX);
  sourceY = panToSourceCoordinate(image.naturalHeight, sourceHeight, settings.offsetY);

  const scale = MAX_LONG_EDGE / Math.max(spec.artworkWidth, spec.artworkHeight);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("This browser could not crop the artwork.");
  }

  canvas.width = Math.round(spec.artworkWidth * scale);
  canvas.height = Math.round(spec.artworkHeight * scale);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/png");
}

function panToSourceCoordinate(sourceSize: number, cropSize: number, offset: number): number {
  const maxOffset = Math.max(0, sourceSize - cropSize);
  const normalizedOffset = (Math.min(100, Math.max(-100, offset)) + 100) / 200;

  return maxOffset * normalizedOffset;
}
