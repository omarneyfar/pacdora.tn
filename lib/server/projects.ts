import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  FACE_KEYS,
  isFaceKey,
  normalizeDimensions,
  normalizeProjectStatus,
  type ArtworkSourceType,
  type CartonDimensions,
  type FaceKey,
  type Project,
  type ProjectArtworkSource,
  type ProjectCropSettings,
  type ProjectFaceAsset,
  type ProjectStatus,
  type ProjectWorkspace
} from "@/lib/carton";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "projects");
const LOCAL_DB_FILE = path.join(process.cwd(), "storage", "projects-db.json");
const PROJECT_ID_PATTERN = /^[a-zA-Z0-9_-]{10,40}$/;
const ASSET_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;
const FACE_DATA_PATTERN = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/;
const IMAGE_DATA_PATTERN = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/;
const MAX_FACE_BYTES = 5 * 1024 * 1024;
const MAX_ASSET_BYTES = 12 * 1024 * 1024;
const SUPABASE_BUCKET = process.env.SUPABASE_PROJECTS_BUCKET ?? "project-faces";
const SUPABASE_TABLE = process.env.SUPABASE_PROJECTS_TABLE ?? "projects";
const DEFAULT_PROJECT_NAME = "Untitled carton";
let localDbWriteQueue = Promise.resolve();

export type ProjectInput = {
  name?: string;
  status?: ProjectStatus;
  dimensions?: Partial<CartonDimensions>;
  faces?: Partial<Record<FaceKey, string | null>>;
  workspace?: ProjectWorkspaceInput;
};

export type ProjectListOptions = {
  limit?: number;
  query?: string;
  status?: ProjectStatus | "all";
};

export type ProjectImage = {
  buffer: Buffer;
  contentType: string;
};

type ProjectWorkspaceInput = {
  sources?: ProjectArtworkSourceInput[];
  selectedSourceId?: string | null;
  faceAssets?: Partial<Record<FaceKey, ProjectFaceAssetInput | null>>;
};

type ProjectArtworkSourceInput = {
  id?: string;
  dataUrl?: string;
  fileName?: string;
  mimeType?: string;
  sourceType?: ArtworkSourceType;
  url?: string;
};

type ProjectFaceAssetInput = {
  sourceId?: string;
  dataUrl?: string;
  fileName?: string;
  sourceType?: ArtworkSourceType;
  crop?: Partial<ProjectCropSettings>;
  url?: string;
};

type ProjectRow = {
  id: string;
  name?: string | null;
  status?: string | null;
  dimensions: Partial<CartonDimensions>;
  faces: Partial<Record<FaceKey, string>>;
  workspace?: unknown;
  created_at: string;
  updated_at?: string | null;
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

export async function updateProject(id: string, input: ProjectInput): Promise<Project | null> {
  if (isSupabaseConfigured()) {
    return updateSupabaseProject(id, input);
  }

  return updateFileProject(id, input);
}

export async function listProjects(options: ProjectListOptions = {}): Promise<Project[]> {
  if (isSupabaseConfigured()) {
    return listSupabaseProjects(options);
  }

  return listFileProjects(options);
}

export async function readProject(id: string): Promise<Project | null> {
  if (isSupabaseConfigured()) {
    return readSupabaseProject(id);
  }

  return readFileProject(id);
}

export async function duplicateProject(id: string): Promise<Project | null> {
  const project = await readProject(id);
  if (!project) {
    return null;
  }

  return createProject(await createDuplicateProjectInput(project));
}

export async function deleteProject(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    return deleteSupabaseProject(id);
  }

  return deleteFileProject(id);
}

export async function readFaceImage(id: string, face: string): Promise<Buffer | null> {
  if (isSupabaseConfigured()) {
    return readSupabaseFaceImage(id, face);
  }

  return readFileFaceImage(id, face);
}

export async function readProjectAssetImage(id: string, assetId: string): Promise<ProjectImage | null> {
  if (isSupabaseConfigured()) {
    return readSupabaseAssetImage(id, assetId);
  }

  return readFileAssetImage(id, assetId);
}

async function createFileProject(input: ProjectInput): Promise<Project> {
  const id = await createUniqueId();
  return writeFileProjectSnapshot(id, input);
}

async function updateFileProject(id: string, input: ProjectInput): Promise<Project | null> {
  if (!isValidProjectId(id)) {
    return null;
  }

  const existing = await readFileProject(id);
  if (!existing) {
    return null;
  }

  return writeFileProjectSnapshot(id, input, existing);
}

async function listFileProjects(options: ProjectListOptions): Promise<Project[]> {
  const projects = new Map(Object.entries((await readLocalDb()).projects));

  try {
    const entries = await fs.readdir(STORAGE_ROOT, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || projects.has(entry.name) || !isValidProjectId(entry.name)) {
        continue;
      }

      const project = await readFileProject(entry.name);
      if (project) {
        projects.set(project.id, project);
      }
    }
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  return filterProjectList(Array.from(projects.values()), options);
}

async function deleteFileProject(id: string): Promise<boolean> {
  if (!isValidProjectId(id)) {
    return false;
  }

  const existing = await readFileProject(id);
  if (!existing) {
    return false;
  }

  await fs.rm(getProjectDir(id), { recursive: true, force: true });
  await deleteProjectFromLocalDb(id);
  return true;
}

async function writeFileProjectSnapshot(id: string, input: ProjectInput, existing?: Project): Promise<Project> {
  const projectDir = getProjectDir(id);
  await fs.mkdir(projectDir, { recursive: true });

  const faces =
    input.faces === undefined
      ? (existing?.faces ?? {})
      : await writeFaceImages(id, input.faces, existing?.faces ?? {}, async (face, buffer) => {
          await fs.writeFile(path.join(projectDir, `${face}.png`), buffer);
        });

  const workspace =
    input.workspace === undefined
      ? existing?.workspace
      : await prepareWorkspace(id, input.workspace, existing?.workspace, async (assetId, image) => {
          await fs.mkdir(path.join(projectDir, "assets"), { recursive: true });
          await fs.writeFile(path.join(projectDir, "assets", assetId), image.buffer);
        });

  const createdAt = existing?.createdAt ?? new Date().toISOString();
  const project: Project = {
    id,
    name: normalizeProjectName(input.name, existing?.name),
    status: normalizeProjectStatus(input.status, existing?.status),
    dimensions: normalizeDimensions(input.dimensions ?? existing?.dimensions),
    faces,
    createdAt,
    updatedAt: new Date().toISOString(),
    ...(workspace ? { workspace } : {})
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
    const project = normalizeProjectRecord(JSON.parse(content), id);
    if (!project) {
      return null;
    }

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

async function readFileAssetImage(id: string, assetId: string): Promise<ProjectImage | null> {
  if (!isValidProjectId(id) || !isValidAssetId(assetId)) {
    return null;
  }

  const project = await readFileProject(id);
  const source = project?.workspace?.sources.find((candidate) => candidate.id === assetId);
  if (!source) {
    return null;
  }

  try {
    return {
      buffer: await fs.readFile(path.join(getProjectDir(id), "assets", assetId)),
      contentType: source.mimeType
    };
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
  return writeSupabaseProjectSnapshot(id, input);
}

async function updateSupabaseProject(id: string, input: ProjectInput): Promise<Project | null> {
  if (!isValidProjectId(id)) {
    return null;
  }

  const existing = await readSupabaseProject(id);
  if (!existing) {
    return null;
  }

  return writeSupabaseProjectSnapshot(id, input, existing);
}

async function listSupabaseProjects(options: ProjectListOptions): Promise<Project[]> {
  const supabase = getSupabaseClient();
  const limit = normalizeListLimit(options.limit);
  const query = normalizeSearchQuery(options.query);
  let request = supabase
    .from(SUPABASE_TABLE)
    .select("id, name, status, dimensions, faces, workspace, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (query) {
    request = request.ilike("name", `%${query}%`);
  }

  const status = normalizeListStatus(options.status);
  if (status) {
    request = request.eq("status", status);
  }

  const { data, error } = await request.returns<ProjectRow[]>();

  if (error) {
    if (isMissingSupabaseTableOrColumnError(error)) {
      throw new Error(
        `Supabase projects table is missing required columns. Run supabase/schema.sql in your Supabase SQL editor. Original error: ${error.message}`
      );
    }

    throw new Error(`Could not list projects from Supabase: ${error.message}`);
  }

  return (data ?? []).flatMap((row) => {
    const project = projectFromRow(row);
    return project ? [project] : [];
  });
}

async function deleteSupabaseProject(id: string): Promise<boolean> {
  if (!isValidProjectId(id)) {
    return false;
  }

  const supabase = getSupabaseClient();
  const existing = await readSupabaseProject(id);
  if (!existing) {
    return false;
  }

  const storagePaths = await listSupabaseStoragePaths(supabase, id);
  if (storagePaths.length > 0) {
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove(storagePaths);

    if (error) {
      throw new Error(`Could not delete project artwork from Supabase Storage: ${error.message}`);
    }
  }

  const { error } = await supabase.from(SUPABASE_TABLE).delete().eq("id", id);

  if (error) {
    throw new Error(`Could not delete project metadata from Supabase: ${error.message}`);
  }

  return true;
}

async function writeSupabaseProjectSnapshot(id: string, input: ProjectInput, existing?: Project): Promise<Project> {
  const supabase = getSupabaseClient();
  await ensureSupabaseBucket(supabase);

  const faces =
    input.faces === undefined
      ? (existing?.faces ?? {})
      : await writeFaceImages(id, input.faces, existing?.faces ?? {}, async (face, buffer) => {
          const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(getSupabaseFacePath(id, face), buffer, {
            cacheControl: "31536000",
            contentType: "image/png",
            upsert: true
          });

          if (error) {
            throw new Error(`Could not upload ${face} artwork to Supabase Storage: ${error.message}`);
          }
        });

  const workspace =
    input.workspace === undefined
      ? existing?.workspace
      : await prepareWorkspace(id, input.workspace, existing?.workspace, async (assetId, image) => {
          const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(getSupabaseAssetPath(id, assetId), image.buffer, {
            cacheControl: "31536000",
            contentType: image.contentType,
            upsert: true
          });

          if (error) {
            throw new Error(`Could not upload source artwork to Supabase Storage: ${error.message}`);
          }
        });

  const createdAt = existing?.createdAt ?? new Date().toISOString();
  const project: Project = {
    id,
    name: normalizeProjectName(input.name, existing?.name),
    status: normalizeProjectStatus(input.status, existing?.status),
    dimensions: normalizeDimensions(input.dimensions ?? existing?.dimensions),
    faces,
    createdAt,
    updatedAt: new Date().toISOString(),
    ...(workspace ? { workspace } : {})
  };

  await writeSupabaseProject(project);
  return project;
}

async function writeSupabaseProject(project: Project): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from(SUPABASE_TABLE).upsert(
    {
      created_at: project.createdAt,
      dimensions: project.dimensions,
      faces: project.faces,
      id: project.id,
      name: project.name,
      status: project.status,
      updated_at: project.updatedAt,
      workspace: project.workspace ?? null
    },
    { onConflict: "id" }
  );

  if (!error) {
    return;
  }

  if (isMissingSupabaseTableOrColumnError(error)) {
    throw new Error(
      `Supabase projects table is missing required columns. Run supabase/schema.sql in your Supabase SQL editor. Original error: ${error.message}`
    );
  }

  throw new Error(`Could not save project metadata to Supabase: ${error.message}`);
}

async function readSupabaseProject(id: string): Promise<Project | null> {
  if (!isValidProjectId(id)) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(SUPABASE_TABLE)
    .select("id, name, status, dimensions, faces, workspace, created_at, updated_at")
    .eq("id", id)
    .maybeSingle<ProjectRow>();

  if (error) {
    if (isMissingSupabaseTableOrColumnError(error)) {
      throw new Error(
        `Supabase projects table is missing required columns. Run supabase/schema.sql in your Supabase SQL editor. Original error: ${error.message}`
      );
    }

    throw new Error(`Could not read project from Supabase: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return projectFromRow(data);
}

async function readSupabaseFaceImage(id: string, face: string): Promise<Buffer | null> {
  if (!isValidProjectId(id) || !isFaceKey(face)) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(getSupabaseFacePath(id, face));

  if (error) {
    if (isMissingSupabaseObjectError(error)) {
      return null;
    }

    throw new Error(`Could not read ${face} artwork from Supabase Storage: ${error.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

async function readSupabaseAssetImage(id: string, assetId: string): Promise<ProjectImage | null> {
  if (!isValidProjectId(id) || !isValidAssetId(assetId)) {
    return null;
  }

  const project = await readSupabaseProject(id);
  const source = project?.workspace?.sources.find((candidate) => candidate.id === assetId);
  if (!source) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(getSupabaseAssetPath(id, assetId));

  if (error) {
    if (isMissingSupabaseObjectError(error)) {
      return null;
    }

    throw new Error(`Could not read source artwork from Supabase Storage: ${error.message}`);
  }

  return {
    buffer: Buffer.from(await data.arrayBuffer()),
    contentType: source.mimeType
  };
}

async function createDuplicateProjectInput(project: Project): Promise<ProjectInput> {
  const sources = await Promise.all(
    (project.workspace?.sources ?? []).map(async (source) => {
      const image = await readProjectAssetImage(project.id, source.id);
      if (!image) {
        throw new Error(`Could not copy source artwork "${source.fileName}".`);
      }

      return {
        id: source.id,
        dataUrl: imageToDataUrl(image),
        fileName: source.fileName,
        mimeType: image.contentType,
        sourceType: source.sourceType
      };
    })
  );
  const faceAssets = FACE_KEYS.reduce<Partial<Record<FaceKey, ProjectFaceAssetInput>>>((next, face) => {
    const asset = project.workspace?.faceAssets[face];

    if (asset) {
      next[face] = {
        sourceId: asset.sourceId,
        fileName: asset.fileName,
        sourceType: asset.sourceType,
        crop: cloneCropSettings(asset.crop)
      };
    }

    return next;
  }, {});
  const faces = await createDuplicateFaceInput(project);

  return {
    name: `${project.name} copy`,
    status: "draft",
    dimensions: project.dimensions,
    ...(Object.keys(faces).length > 0 ? { faces } : {}),
    ...(sources.length > 0
      ? {
          workspace: {
            sources,
            selectedSourceId: project.workspace?.selectedSourceId,
            faceAssets
          }
        }
      : {})
  };
}

async function createDuplicateFaceInput(project: Project): Promise<Partial<Record<FaceKey, string>>> {
  const faces: Partial<Record<FaceKey, string>> = {};

  await Promise.all(
    FACE_KEYS.map(async (face) => {
      if (!project.faces[face]) {
        return;
      }

      const buffer = await readFaceImage(project.id, face);
      if (!buffer) {
        throw new Error(`Could not copy ${face} artwork.`);
      }

      faces[face] = `data:image/png;base64,${buffer.toString("base64")}`;
    })
  );

  return faces;
}

async function writeFaceImages(
  id: string,
  inputFaces: Partial<Record<FaceKey, string | null>>,
  existingFaces: Partial<Record<FaceKey, string>>,
  writeImage: (face: FaceKey, buffer: Buffer) => Promise<void>
): Promise<Partial<Record<FaceKey, string>>> {
  const faces: Partial<Record<FaceKey, string>> = { ...existingFaces };

  for (const face of FACE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(inputFaces, face)) {
      continue;
    }

    const value = inputFaces[face];
    if (!value) {
      delete faces[face];
      continue;
    }

    if (isOwnFaceUrl(id, face, value)) {
      faces[face] = getFaceUrl(id, face);
      continue;
    }

    const buffer = decodeFaceImage(value);
    await writeImage(face, buffer);
    faces[face] = getFaceUrl(id, face);
  }

  return faces;
}

async function prepareWorkspace(
  id: string,
  input: ProjectWorkspaceInput,
  existing: ProjectWorkspace | undefined,
  writeAsset: (assetId: string, image: ProjectImage) => Promise<void>
): Promise<ProjectWorkspace> {
  const sourceMap = new Map((existing?.sources ?? []).map((source) => [source.id, source]));

  for (const rawSource of input.sources ?? []) {
    const sourceId = normalizeAssetId(rawSource.id);
    if (!sourceId) {
      throw new Error("Artwork source is missing a valid ID.");
    }

    const existingSource = sourceMap.get(sourceId);
    const sourceValue = rawSource.dataUrl ?? rawSource.url ?? existingSource?.url;
    let mimeType = normalizeImageMimeType(rawSource.mimeType ?? existingSource?.mimeType);

    if (sourceValue && isImageDataUrl(sourceValue)) {
      const image = decodeProjectAsset(sourceValue);
      await writeAsset(sourceId, image);
      mimeType = image.contentType;
    } else if (!sourceValue || !isOwnAssetUrl(id, sourceId, sourceValue)) {
      throw new Error("Artwork source image is missing. Upload the source image again.");
    }

    sourceMap.set(sourceId, {
      id: sourceId,
      fileName: normalizeFileName(rawSource.fileName, existingSource?.fileName ?? "Artwork"),
      mimeType,
      sourceType: normalizeSourceType(rawSource.sourceType ?? existingSource?.sourceType),
      url: getAssetUrl(id, sourceId)
    });
  }

  const sources = Array.from(sourceMap.values());
  const faceAssets: Partial<Record<FaceKey, ProjectFaceAsset>> = { ...(existing?.faceAssets ?? {}) };

  for (const face of FACE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(input.faceAssets ?? {}, face)) {
      continue;
    }

    const rawAsset = input.faceAssets?.[face];
    if (!rawAsset || !rawAsset.sourceId) {
      delete faceAssets[face];
      continue;
    }

    const source = sourceMap.get(rawAsset.sourceId);
    if (!source) {
      delete faceAssets[face];
      continue;
    }

    faceAssets[face] = {
      sourceId: source.id,
      fileName: normalizeFileName(rawAsset.fileName, source.fileName),
      sourceType: normalizeSourceType(rawAsset.sourceType ?? source.sourceType),
      crop: normalizeCropSettings(rawAsset.crop)
    };
  }

  const selectedSourceId =
    typeof input.selectedSourceId === "string" && sourceMap.has(input.selectedSourceId)
      ? input.selectedSourceId
      : input.selectedSourceId === null
        ? undefined
        : existing?.selectedSourceId && sourceMap.has(existing.selectedSourceId)
          ? existing.selectedSourceId
          : sources[0]?.id;

  return {
    sources,
    ...(selectedSourceId ? { selectedSourceId } : {}),
    faceAssets
  };
}

function decodeProjectAsset(dataUrl: string): ProjectImage {
  const match = dataUrl.match(IMAGE_DATA_PATTERN);
  if (!match) {
    throw new Error("Source artwork must be a PNG or JPG image.");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_ASSET_BYTES) {
    throw new Error("Source artwork is too large. Please use an image under 12 MB.");
  }

  return {
    buffer,
    contentType: match[1]
  };
}

function imageToDataUrl(image: ProjectImage): string {
  return `data:${normalizeImageMimeType(image.contentType)};base64,${image.buffer.toString("base64")}`;
}

function cloneCropSettings(crop: ProjectCropSettings): ProjectCropSettings {
  return {
    coordinates: crop.coordinates ? { ...crop.coordinates } : null,
    transforms: {
      flip: { ...crop.transforms.flip },
      rotate: crop.transforms.rotate
    }
  };
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

    if (error && !isMissingSupabaseTableOrColumnError(error)) {
      throw new Error(`Could not check Supabase project ID: ${error.message}`);
    }

    if (data) {
      continue;
    }

    return id;
  }

  throw new Error("Could not create a unique project ID.");
}

async function listSupabaseStoragePaths(supabase: SupabaseClient, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  await collectSupabaseStoragePaths(supabase, prefix, paths);
  return paths;
}

async function collectSupabaseStoragePaths(supabase: SupabaseClient, prefix: string, paths: string[]): Promise<void> {
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).list(prefix, { limit: 1000 });

  if (error) {
    if (isMissingSupabaseObjectError(error)) {
      return;
    }

    throw new Error(`Could not list project artwork in Supabase Storage: ${error.message}`);
  }

  await Promise.all(
    (data ?? []).map(async (item) => {
      const fullPath = `${prefix}/${item.name}`;

      if (isSupabaseStorageFolder(item)) {
        await collectSupabaseStoragePaths(supabase, fullPath, paths);
        return;
      }

      paths.push(fullPath);
    })
  );
}

function projectFromRow(row: ProjectRow): Project | null {
  return normalizeProjectRecord(
    {
      createdAt: row.created_at,
      dimensions: row.dimensions,
      faces: row.faces,
      id: row.id,
      name: row.name ?? undefined,
      status: row.status ?? undefined,
      updatedAt: row.updated_at ?? undefined,
      workspace: row.workspace
    },
    row.id
  );
}

function normalizeProjectRecord(value: unknown, fallbackId?: string): Project | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Project>;
  const id = typeof candidate.id === "string" ? candidate.id : fallbackId;
  const createdAt = typeof candidate.createdAt === "string" ? candidate.createdAt : undefined;

  if (!id || !isValidProjectId(id) || !createdAt) {
    return null;
  }

  const faces = normalizeFaces(candidate.faces);

  return {
    id,
    name: normalizeProjectName(candidate.name),
    status: normalizeProjectStatus(candidate.status),
    dimensions: normalizeDimensions(candidate.dimensions),
    faces,
    createdAt,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : createdAt,
    ...(candidate.workspace ? { workspace: normalizeWorkspace(candidate.workspace, id) } : {})
  };
}

function normalizeWorkspace(value: unknown, projectId: string): ProjectWorkspace | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Partial<ProjectWorkspace>;
  const sources: ProjectArtworkSource[] = Array.isArray(candidate.sources)
    ? candidate.sources.flatMap((source) => normalizeStoredSource(source, projectId))
    : [];
  const sourceIds = new Set(sources.map((source) => source.id));
  const selectedSourceId =
    typeof candidate.selectedSourceId === "string" && sourceIds.has(candidate.selectedSourceId)
      ? candidate.selectedSourceId
      : sources[0]?.id;
  const faceAssets: Partial<Record<FaceKey, ProjectFaceAsset>> = {};
  const storedFaceAssets =
    candidate.faceAssets && typeof candidate.faceAssets === "object"
      ? (candidate.faceAssets as Partial<Record<FaceKey, Partial<ProjectFaceAsset>>>)
      : {};

  for (const face of FACE_KEYS) {
    const asset = storedFaceAssets[face];
    if (!asset?.sourceId || !sourceIds.has(asset.sourceId)) {
      continue;
    }

    const source = sources.find((candidateSource) => candidateSource.id === asset.sourceId);
    faceAssets[face] = {
      sourceId: asset.sourceId,
      fileName: normalizeFileName(asset.fileName, source?.fileName ?? "Artwork"),
      sourceType: normalizeSourceType(asset.sourceType ?? source?.sourceType),
      crop: normalizeCropSettings(asset.crop)
    };
  }

  return {
    sources,
    ...(selectedSourceId ? { selectedSourceId } : {}),
    faceAssets
  };
}

function normalizeStoredSource(value: unknown, projectId: string): ProjectArtworkSource[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const source = value as Partial<ProjectArtworkSource>;
  const id = normalizeAssetId(source.id);
  if (!id) {
    return [];
  }

  return [
    {
      id,
      fileName: normalizeFileName(source.fileName, "Artwork"),
      mimeType: normalizeImageMimeType(source.mimeType),
      sourceType: normalizeSourceType(source.sourceType),
      url: getAssetUrl(projectId, id)
    }
  ];
}

function normalizeCropSettings(value: unknown): ProjectCropSettings {
  const candidate = value && typeof value === "object" ? (value as Partial<ProjectCropSettings>) : {};
  const coordinates =
    candidate.coordinates && typeof candidate.coordinates === "object"
      ? normalizeCoordinates(candidate.coordinates)
      : null;
  const transforms =
    candidate.transforms && typeof candidate.transforms === "object" ? candidate.transforms : undefined;

  return {
    coordinates,
    transforms: {
      flip: {
        horizontal: Boolean(transforms?.flip?.horizontal),
        vertical: Boolean(transforms?.flip?.vertical)
      },
      rotate: normalizeRotation(Number(transforms?.rotate))
    }
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

function normalizeCoordinates(value: unknown): ProjectCropSettings["coordinates"] {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<NonNullable<ProjectCropSettings["coordinates"]>>;
  const width = Number(candidate.width);
  const height = Number(candidate.height);
  const left = Number(candidate.left);
  const top = Number(candidate.top);

  if (![width, height, left, top].every(Number.isFinite) || width <= 0 || height <= 0) {
    return null;
  }

  return { height, left, top, width };
}

function normalizeRotation(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return ((Math.round(value / 90) * 90) % 360 + 360) % 360;
}

function getProjectDir(id: string): string {
  return path.join(STORAGE_ROOT, id);
}

function getSupabaseFacePath(id: string, face: FaceKey): string {
  return `${id}/${face}.png`;
}

function getSupabaseAssetPath(id: string, assetId: string): string {
  return `${id}/assets/${assetId}`;
}

function getFaceUrl(id: string, face: FaceKey): string {
  return `/api/project-faces/${id}/${face}`;
}

function getAssetUrl(id: string, assetId: string): string {
  return `/api/project-assets/${id}/${assetId}`;
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

async function deleteProjectFromLocalDb(id: string): Promise<void> {
  const writeOperation = localDbWriteQueue.catch(() => undefined).then(async () => {
    const db = await readLocalDb();
    delete db.projects[id];
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

  for (const [id, project] of Object.entries(value as Record<string, unknown>)) {
    const normalizedProject = normalizeProjectRecord(project, id);
    if (normalizedProject) {
      projects[id] = normalizedProject;
    }
  }

  return projects;
}

function isValidProjectId(id: string): boolean {
  return PROJECT_ID_PATTERN.test(id);
}

function isValidAssetId(id: string): boolean {
  return ASSET_ID_PATTERN.test(id);
}

function normalizeAssetId(value: unknown): string | null {
  return typeof value === "string" && isValidAssetId(value) ? value : null;
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

function normalizeProjectName(value: unknown, fallback = DEFAULT_PROJECT_NAME): string {
  const candidate = typeof value === "string" ? value.trim() : "";
  const name = candidate || fallback;
  return name.slice(0, 80);
}

function normalizeListLimit(value: unknown): number {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return 50;
  }

  return Math.min(100, Math.max(1, Math.round(numericValue)));
}

function normalizeSearchQuery(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

function normalizeListStatus(value: unknown): ProjectStatus | undefined {
  if (value === "all" || value === undefined || value === null || value === "") {
    return undefined;
  }

  const status = normalizeProjectStatus(value, "draft");
  return status === value ? status : undefined;
}

function normalizeFileName(value: unknown, fallback: string): string {
  const candidate = typeof value === "string" ? value.trim() : "";
  return (candidate || fallback).slice(0, 140);
}

function normalizeSourceType(value: unknown): ArtworkSourceType {
  return value === "pdf" ? "pdf" : "image";
}

function normalizeImageMimeType(value: unknown): string {
  return value === "image/jpeg" ? "image/jpeg" : "image/png";
}

function isImageDataUrl(value: string): boolean {
  return IMAGE_DATA_PATTERN.test(value);
}

function isOwnFaceUrl(projectId: string, face: FaceKey, value: string): boolean {
  return getUrlPath(value) === getFaceUrl(projectId, face) || getUrlPath(value) === `/api/projects/${projectId}/faces/${face}`;
}

function isOwnAssetUrl(projectId: string, assetId: string, value: string): boolean {
  return getUrlPath(value) === getAssetUrl(projectId, assetId);
}

function getUrlPath(value: string): string {
  try {
    return new URL(value, "http://local.foldview").pathname;
  } catch {
    return value;
  }
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

function isMissingSupabaseTableOrColumnError(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string };
  const message = candidate.message?.toLowerCase() ?? "";

  return (
    candidate.code === "PGRST204" ||
    candidate.code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("could not find the") ||
    message.includes("column")
  );
}

function isMissingSupabaseObjectError(error: unknown): boolean {
  const candidate = error as { statusCode?: number | string; message?: string };
  return String(candidate.statusCode) === "404" || candidate.message?.toLowerCase().includes("not found") === true;
}

function isSupabaseStorageFolder(item: { id?: string | null; metadata?: unknown }): boolean {
  return item.id === null || (!item.id && !item.metadata);
}

function filterProjectList(projects: Project[], options: ProjectListOptions): Project[] {
  const query = normalizeSearchQuery(options.query).toLowerCase();
  const limit = normalizeListLimit(options.limit);
  const status = normalizeListStatus(options.status);

  return projects
    .filter((project) => {
      if (status && project.status !== status) {
        return false;
      }

      return !query || project.name.toLowerCase().includes(query) || project.id.toLowerCase().includes(query);
    })
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, limit);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
