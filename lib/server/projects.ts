import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { CARTON_DIMENSIONS, FACE_KEYS, type FaceKey, type Project, isFaceKey } from "@/lib/carton";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "projects");
const PROJECT_ID_PATTERN = /^[a-zA-Z0-9_-]{10,40}$/;
const FACE_DATA_PATTERN = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/;
const MAX_FACE_BYTES = 5 * 1024 * 1024;

export type ProjectInput = {
  faces?: Partial<Record<FaceKey, string>>;
};

export async function createProject(input: ProjectInput): Promise<Project> {
  const id = await createUniqueId();
  const projectDir = getProjectDir(id);
  await fs.mkdir(projectDir, { recursive: true });

  const faces: Partial<Record<FaceKey, string>> = {};

  for (const face of FACE_KEYS) {
    const value = input.faces?.[face];
    if (!value) {
      continue;
    }

    const buffer = decodeFaceImage(value);
    await fs.writeFile(path.join(projectDir, `${face}.png`), buffer);
    faces[face] = `/api/projects/${id}/faces/${face}`;
  }

  const project: Project = {
    id,
    dimensions: CARTON_DIMENSIONS,
    faces,
    createdAt: new Date().toISOString()
  };

  await fs.writeFile(path.join(projectDir, "project.json"), JSON.stringify(project, null, 2), "utf8");
  return project;
}

export async function readProject(id: string): Promise<Project | null> {
  if (!isValidProjectId(id)) {
    return null;
  }

  try {
    const content = await fs.readFile(path.join(getProjectDir(id), "project.json"), "utf8");
    return JSON.parse(content) as Project;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function readFaceImage(id: string, face: string): Promise<Buffer | null> {
  if (!isValidProjectId(id) || !isFaceKey(face)) {
    return null;
  }

  try {
    return await fs.readFile(path.join(getProjectDir(id), `${face}.png`));
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function decodeFaceImage(dataUrl: string): Buffer {
  const match = dataUrl.match(FACE_DATA_PATTERN);
  if (!match) {
    throw new Error("Face artwork must be a cropped PNG data URL.");
  }

  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length > MAX_FACE_BYTES) {
    throw new Error("Face artwork is too large. Please use an image under 5 MB after crop.");
  }

  return buffer;
}

async function createUniqueId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomBytes(9).toString("base64url");
    try {
      await fs.access(getProjectDir(id));
    } catch {
      return id;
    }
  }

  throw new Error("Could not create a unique project ID.");
}

function getProjectDir(id: string): string {
  return path.join(STORAGE_ROOT, id);
}

function isValidProjectId(id: string): boolean {
  return PROJECT_ID_PATTERN.test(id);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
