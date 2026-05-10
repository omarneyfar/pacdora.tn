"use client";

import { prepareSource, updateCanvas, type Coordinates, type Transforms } from "advanced-cropper";

import { FACE_KEYS, getFaceSpecs, type CartonDimensions, type FaceKey, type Project } from "@/domain/packaging";

const MAX_LONG_EDGE = 1400;

export type CropSettings = {
  coordinates: Coordinates | null;
  transforms: Transforms;
};

export type ArtworkImport = {
  dataUrl: string;
  fileName: string;
  sourceType: "image" | "pdf";
};

export const DEFAULT_CROP_SETTINGS: CropSettings = {
  coordinates: null,
  transforms: {
    flip: {
      horizontal: false,
      vertical: false
    },
    rotate: 0
  }
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
  return cropToFace(image, face, dimensions, normalizeCropSettings(settings));
}

export async function renderProjectFaces(project: Project): Promise<Partial<Record<FaceKey, string>>> {
  if (!project.workspace?.sources.length) {
    return project.faces;
  }

  const sourceById = new Map(project.workspace.sources.map((source) => [source.id, source]));
  const renderedFaces: Partial<Record<FaceKey, string>> = {};

  await Promise.all(
    FACE_KEYS.map(async (face) => {
      const assignment = project.workspace?.faceAssets[face];
      const source = assignment ? sourceById.get(assignment.sourceId) : undefined;

      if (!assignment || !source) {
        return;
      }

      renderedFaces[face] = await cropArtworkToFace(source.url, face, project.dimensions, assignment.crop);
    })
  );

  return renderedFaces;
}

export function normalizeCropSettings(settings: Partial<CropSettings> | undefined | null): CropSettings {
  return {
    coordinates: normalizeCoordinates(settings?.coordinates),
    transforms: normalizeTransforms(settings?.transforms)
  };
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
  const scale = MAX_LONG_EDGE / Math.max(spec.artworkWidth, spec.artworkHeight);
  const canvas = document.createElement("canvas");
  const sourceCanvas = document.createElement("canvas");
  const transformedSource = getTransformedSource(sourceCanvas, image, settings.transforms);
  const coordinates = fitCoordinatesToAspect(
    settings.coordinates ?? getCenteredCoordinates(transformedSource.width, transformedSource.height, targetAspect),
    targetAspect,
    transformedSource.width,
    transformedSource.height
  );

  if (!canvas.getContext("2d")) {
    throw new Error("This browser could not crop the artwork.");
  }

  updateCanvas(
    canvas,
    transformedSource.source,
    coordinates,
    {
      height: Math.round(spec.artworkHeight * scale),
      width: Math.round(spec.artworkWidth * scale)
    },
    {
      fillColor: "#ffffff",
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high"
    }
  );

  return canvas.toDataURL("image/png");
}

function getTransformedSource(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  transforms: Transforms
): { source: HTMLCanvasElement | HTMLImageElement; width: number; height: number } {
  if (transforms.rotate === 0 && !transforms.flip.horizontal && !transforms.flip.vertical) {
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight
    };
  }

  const source = prepareSource(canvas, image, transforms);

  return {
    source,
    width: source.width,
    height: source.height
  };
}

function getCenteredCoordinates(width: number, height: number, targetAspect: number): Coordinates {
  const sourceAspect = width / height;
  const cropWidth = sourceAspect > targetAspect ? height * targetAspect : width;
  const cropHeight = sourceAspect > targetAspect ? height : width / targetAspect;

  return {
    height: cropHeight,
    left: (width - cropWidth) / 2,
    top: (height - cropHeight) / 2,
    width: cropWidth
  };
}

function fitCoordinatesToAspect(
  coordinates: Coordinates,
  targetAspect: number,
  sourceWidth: number,
  sourceHeight: number
): Coordinates {
  if (Math.abs(coordinates.width / coordinates.height - targetAspect) < 0.001) {
    return {
      height: Math.max(1, coordinates.height),
      left: coordinates.left,
      top: coordinates.top,
      width: Math.max(1, coordinates.width)
    };
  }

  const centerX = coordinates.left + coordinates.width / 2;
  const centerY = coordinates.top + coordinates.height / 2;
  let width = coordinates.width;
  let height = width / targetAspect;

  if (height > coordinates.height) {
    height = coordinates.height;
    width = height * targetAspect;
  }

  width = Math.min(width, sourceWidth);
  height = Math.min(height, sourceHeight);

  if (width / height > targetAspect) {
    width = height * targetAspect;
  } else {
    height = width / targetAspect;
  }

  const left = Math.min(sourceWidth - width, Math.max(0, centerX - width / 2));
  const top = Math.min(sourceHeight - height, Math.max(0, centerY - height / 2));

  return {
    height: Math.max(1, height),
    left,
    top,
    width: Math.max(1, width)
  };
}

function normalizeCoordinates(value: unknown): Coordinates | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Coordinates>;
  const width = Number(candidate.width);
  const height = Number(candidate.height);
  const left = Number(candidate.left);
  const top = Number(candidate.top);

  if (![width, height, left, top].every(Number.isFinite) || width <= 0 || height <= 0) {
    return null;
  }

  return { height, left, top, width };
}

function normalizeTransforms(value: unknown): Transforms {
  if (!value || typeof value !== "object") {
    return DEFAULT_CROP_SETTINGS.transforms;
  }

  const candidate = value as Partial<Transforms>;

  return {
    flip: {
      horizontal: Boolean(candidate.flip?.horizontal),
      vertical: Boolean(candidate.flip?.vertical)
    },
    rotate: normalizeRotation(Number(candidate.rotate))
  };
}

function normalizeRotation(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return ((Math.round(value / 90) * 90) % 360 + 360) % 360;
}
