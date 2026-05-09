import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { FACE_KEYS, type CartonDimensions, type FaceKey, type Project, isFaceKey, normalizeDimensions } from "@/lib/carton";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "projects");
const LOCAL_DB_FILE = path.join(process.cwd(), "storage", "projects-db.json");
const PROJECT_ID_PATTERN = /^[a-zA-Z0-9_-]{10,40}$/;
const FACE_DATA_PATTERN = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/;
const MAX_FACE_BYTES = 5 * 1024 * 1024;
const SUPABASE_BUCKET = process.env.SUPABASE_PROJECTS_BUCKET ?? "project-faces";
const SUPABASE_TABLE = process.env.SUPABASE_PROJECTS_TABLE ?? "projects";
let localDbWriteQueue = Promise.resolve();

export type ProjectInput = {
  dimensions?: Partial<CartonDimensions>;
  faces?: Partial<Record<FaceKey, string>>;
};

type ProjectRow = {
  id: string;
  dimensions: Partial<CartonDimensions>;
  faces: Partial<Record<FaceKey, string>>;
  created_at: string;
};

type LocalProjectsDb = {
  projects: Record<string, Project>;
};

export async function createProject(input: ProjectInput): Promise<Project> {
  if (isSupabaseConfigured()) {
    return createSupabaseProject(input);
  }

  return createFileProject(input);
}

export async function readProject(id: string): Promise<Project | null> {
  if (isSupabaseConfigured()) {
    return readSupabaseProject(id);
  }

  return readFileProject(id);
}

export async function readFaceImage(id: string, face: string): Promise<Buffer | null> {
  if (isSupabaseConfigured()) {
    return readSupabaseFaceImage(id, face);
  }

  return readFileFaceImage(id, face);
}

async function createFileProject(input: ProjectInput): Promise<Project> {
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
    faces[face] = getFaceUrl(id, face);
  }

  const project: Project = {
    id,
    dimensions: normalizeDimensions(input.dimensions),
    faces,
    createdAt: new Date().toISOString()
  };

  await fs.writeFile(path.join(projectDir, "project.json"), JSON.stringify(project, null, 2), "utf8");
  await saveProjectToLocalDb(project);
  return project;
}

async function readFileProject(id: string): Promise<Project | null> {
  if (!isValidProjectId(id)) {
    return null;
  }

  const db = await readLocalDb();
  const dbProject = db.projects[id];
  if (dbProject) {
    return dbProject;
  }

  try {
    const content = await fs.readFile(path.join(getProjectDir(id), "project.json"), "utf8");
    const project = JSON.parse(content) as Project;
    await saveProjectToLocalDb(project);
    return project;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function readFileFaceImage(id: string, face: string): Promise<Buffer | null> {
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

async function createSupabaseProject(input: ProjectInput): Promise<Project> {
  const supabase = getSupabaseClient();
  await ensureSupabaseBucket(supabase);

  const id = await createUniqueSupabaseId(supabase);
  const faces: Partial<Record<FaceKey, string>> = {};

  for (const face of FACE_KEYS) {
    const value = input.faces?.[face];
    if (!value) {
      continue;
    }

    const buffer = decodeFaceImage(value);
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(getSupabaseFacePath(id, face), buffer, {
      cacheControl: "31536000",
      contentType: "image/png",
      upsert: false
    });

    if (error) {
      throw new Error(`Could not upload ${face} artwork to Supabase Storage: ${error.message}`);
    }

    faces[face] = getFaceUrl(id, face);
  }

  const project: Project = {
    id,
    dimensions: normalizeDimensions(input.dimensions),
    faces,
    createdAt: new Date().toISOString()
  };

  await writeSupabaseProject(project);
  return project;
}

async function writeSupabaseProject(project: Project): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from(SUPABASE_TABLE).insert({
    created_at: project.createdAt,
    dimensions: project.dimensions,
    faces: project.faces,
    id: project.id
  });

  if (!error) {
    return;
  }

  if (!isMissingSupabaseTableError(error)) {
    throw new Error(`Could not save project metadata to Supabase: ${error.message}`);
  }

  await writeSupabaseProjectJson(project);
}

async function readSupabaseProject(id: string): Promise<Project | null> {
  if (!isValidProjectId(id)) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(SUPABASE_TABLE)
    .select("id, dimensions, faces, created_at")
    .eq("id", id)
    .maybeSingle<ProjectRow>();

  if (error) {
    if (isMissingSupabaseTableError(error)) {
      return readSupabaseProjectJson(id);
    }

    throw new Error(`Could not read project from Supabase: ${error.message}`);
  }

  if (!data) {
    return readSupabaseProjectJson(id);
  }

  return {
    id: data.id,
    dimensions: normalizeDimensions(data.dimensions),
    faces: normalizeFaces(data.faces),
    createdAt: data.created_at
  };
}

async function readSupabaseFaceImage(id: string, face: string): Promise<Buffer | null> {
  if (!isValidProjectId(id) || !isFaceKey(face)) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(getSupabaseFacePath(id, face));

  if (error) {
    if ("statusCode" in error && String(error.statusCode) === "404") {
      return null;
    }

    throw new Error(`Could not read ${face} artwork from Supabase Storage: ${error.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

async function writeSupabaseProjectJson(project: Project): Promise<void> {
  const supabase = getSupabaseClient();
  const body = Buffer.from(JSON.stringify(project, null, 2), "utf8");
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(getSupabaseProjectPath(project.id), body, {
    cacheControl: "60",
    contentType: "application/json",
    upsert: true
  });

  if (error) {
    throw new Error(`Could not save project metadata to Supabase Storage: ${error.message}`);
  }
}

async function readSupabaseProjectJson(id: string): Promise<Project | null> {
  if (!isValidProjectId(id)) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(getSupabaseProjectPath(id));

  if (error) {
    if (isMissingSupabaseObjectError(error)) {
      return null;
    }

    throw new Error(`Could not read project metadata from Supabase Storage: ${error.message}`);
  }

  const parsed = JSON.parse(await data.text()) as Partial<Project>;

  if (parsed.id !== id || typeof parsed.createdAt !== "string") {
    return null;
  }

  return {
    id,
    dimensions: normalizeDimensions(parsed.dimensions),
    faces: normalizeFaces(parsed.faces),
    createdAt: parsed.createdAt
  };
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
  const db = await readLocalDb();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomBytes(9).toString("base64url");
    if (db.projects[id]) {
      continue;
    }

    try {
      await fs.access(getProjectDir(id));
    } catch {
      return id;
    }
  }

  throw new Error("Could not create a unique project ID.");
}

async function createUniqueSupabaseId(supabase: SupabaseClient): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomBytes(9).toString("base64url");
    const { data, error } = await supabase.from(SUPABASE_TABLE).select("id").eq("id", id).maybeSingle();

    if (error && !isMissingSupabaseTableError(error)) {
      throw new Error(`Could not check Supabase project ID: ${error.message}`);
    }

    if (data) {
      continue;
    }

    const storageProject = await readSupabaseProjectJson(id);
    if (!storageProject) {
      return id;
    }
  }

  throw new Error("Could not create a unique project ID.");
}

function getProjectDir(id: string): string {
  return path.join(STORAGE_ROOT, id);
}

function getSupabaseFacePath(id: string, face: FaceKey): string {
  return `${id}/${face}.png`;
}

function getFaceUrl(id: string, face: FaceKey): string {
  return `/api/project-faces/${id}/${face}`;
}

function getSupabaseProjectPath(id: string): string {
  return `${id}/project.json`;
}

async function ensureSupabaseBucket(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase.storage.listBuckets();

  if (error) {
    throw new Error(`Could not list Supabase Storage buckets: ${error.message}`);
  }

  if (data.some((bucket) => bucket.id === SUPABASE_BUCKET || bucket.name === SUPABASE_BUCKET)) {
    return;
  }

  const created = await supabase.storage.createBucket(SUPABASE_BUCKET, { public: false });
  if (created.error) {
    throw new Error(`Could not create Supabase Storage bucket: ${created.error.message}`);
  }
}

async function readLocalDb(): Promise<LocalProjectsDb> {
  try {
    const content = await fs.readFile(LOCAL_DB_FILE, "utf8");
    const parsed = JSON.parse(content) as Partial<LocalProjectsDb>;

    return {
      projects: normalizeLocalProjects(parsed.projects)
    };
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return { projects: {} };
    }

    throw error;
  }
}

async function saveProjectToLocalDb(project: Project): Promise<void> {
  const writeOperation = localDbWriteQueue.catch(() => undefined).then(async () => {
    const db = await readLocalDb();
    db.projects[project.id] = project;
    await writeLocalDb(db);
  });

  localDbWriteQueue = writeOperation.catch(() => undefined);
  await writeOperation;
}

async function writeLocalDb(db: LocalProjectsDb): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_DB_FILE), { recursive: true });
  const tempFile = `${LOCAL_DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tempFile, LOCAL_DB_FILE);
}

function normalizeLocalProjects(value: unknown): Record<string, Project> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const projects: Record<string, Project> = {};

  for (const [id, project] of Object.entries(value as Record<string, Partial<Project>>)) {
    if (!isValidProjectId(id) || !project || typeof project.createdAt !== "string") {
      continue;
    }

    projects[id] = {
      id,
      dimensions: normalizeDimensions(project.dimensions),
      faces: normalizeFaces(project.faces),
      createdAt: project.createdAt
    };
  }

  return projects;
}

function isValidProjectId(id: string): boolean {
  return PROJECT_ID_PATTERN.test(id);
}

function normalizeFaces(value: unknown): Partial<Record<FaceKey, string>> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const nextFaces: Partial<Record<FaceKey, string>> = {};
  const candidate = value as Partial<Record<FaceKey, unknown>>;

  for (const face of FACE_KEYS) {
    const faceUrl = candidate[face];
    if (typeof faceUrl === "string") {
      nextFaces[face] = faceUrl;
    }
  }

  return nextFaces;
}

function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });
}

function getSupabaseUrl(): string | undefined {
  const rawUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

  return rawUrl?.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

function isMissingSupabaseTableError(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "PGRST205" || candidate.message?.includes("Could not find the table") === true;
}

function isMissingSupabaseObjectError(error: unknown): boolean {
  const candidate = error as { statusCode?: number | string; message?: string };
  return String(candidate.statusCode) === "404" || candidate.message?.toLowerCase().includes("not found") === true;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
