import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { normalizeDielineGraph } from "@/domain/dieline/validation";
import {
  getDielineCategory,
  getDielineCategoryLabel,
  getDielineFamilyLabel,
  getDielineParts,
} from "@/domain/dieline/structure";
import {
  normalizeDielineTemplateSource,
  normalizeDielineTemplateStatus,
  type DielineTemplate,
  type DielineTemplateListOptions,
  type DielineTemplateSource,
  type DielineTemplateStatus,
} from "@/domain/dielines";
import { getSeedDielines } from "./seedDielines";

const STORAGE_ROOT = path.join(process.cwd(), "storage");
const LOCAL_DB_FILE = path.join(STORAGE_ROOT, "dielines-db.json");
const DIELINE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,50}$/;

let localDbWriteQueue = Promise.resolve();

export type DielineTemplateInput = {
  name?: string;
  status?: DielineTemplateStatus;
  source?: DielineTemplateSource;
  fileName?: string;
  graph?: unknown;
};

type LocalDielinesDb = {
  dielines: Record<string, DielineTemplate>;
};

export async function createDielineTemplate(input: DielineTemplateInput): Promise<DielineTemplate> {
  const id = await createUniqueId();
  const now = new Date().toISOString();
  const graph = normalizeDielineGraph(input.graph);

  if (!graph) {
    throw new Error("Dieline graph is missing or invalid.");
  }

  const template: DielineTemplate = {
    id,
    name: normalizeTemplateName(input.name),
    status: normalizeDielineTemplateStatus(input.status),
    source: normalizeDielineTemplateSource(input.source),
    ...(normalizeFileName(input.fileName) ? { fileName: normalizeFileName(input.fileName) } : {}),
    graph,
    createdAt: now,
    updatedAt: now,
  };

  await saveDielineTemplate(template);
  return template;
}

export async function updateDielineTemplate(id: string, input: DielineTemplateInput): Promise<DielineTemplate | null> {
  if (!isValidDielineId(id)) {
    return null;
  }

  const existing = await readDielineTemplate(id);
  if (!existing) {
    return null;
  }

  const graph = input.graph === undefined ? existing.graph : normalizeDielineGraph(input.graph);

  if (!graph) {
    throw new Error("Dieline graph is missing or invalid.");
  }

  const template: DielineTemplate = {
    ...existing,
    name: input.name === undefined ? existing.name : normalizeTemplateName(input.name, existing.name),
    status: input.status === undefined ? existing.status : normalizeDielineTemplateStatus(input.status, existing.status),
    source: input.source === undefined ? existing.source : normalizeDielineTemplateSource(input.source, existing.source),
    fileName: input.fileName === undefined ? existing.fileName : normalizeFileName(input.fileName),
    graph,
    updatedAt: new Date().toISOString(),
  };

  await saveDielineTemplate(template);
  return template;
}

export async function listDielineTemplates(options: DielineTemplateListOptions = {}): Promise<DielineTemplate[]> {
  const db = await readLocalDb();

  await seedInitialDielines(db);

  return filterDielineList(Object.values(db.dielines), options);
}

export async function readDielineTemplate(id: string): Promise<DielineTemplate | null> {
  if (!isValidDielineId(id)) {
    return null;
  }

  const db = await readLocalDb();
  return normalizeDielineTemplateRecord(db.dielines[id]);
}

export async function deleteDielineTemplate(id: string): Promise<boolean> {
  if (!isValidDielineId(id)) {
    return false;
  }

  const db = await readLocalDb();
  if (!db.dielines[id]) {
    return false;
  }

  delete db.dielines[id];
  await writeLocalDb(db);
  return true;
}

async function seedInitialDielines(db: LocalDielinesDb): Promise<void> {
  const seeds = getSeedDielines();
  const activeSeedIds = new Set(seeds.map((seed) => seed.id));
  const now = new Date().toISOString();
  let inserted = false;

  for (const id of Object.keys(db.dielines)) {
    if (id.startsWith("seed-") && !activeSeedIds.has(id)) {
      delete db.dielines[id];
      inserted = true;
    }
  }

  for (const seed of seeds) {
    if (!db.dielines[seed.id]) {
      db.dielines[seed.id] = {
        id: seed.id,
        name: seed.name,
        status: "ready",
        source: "template",
        fileName: seed.fileName,
        graph: seed.graph,
        createdAt: now,
        updatedAt: now,
      };
      inserted = true;
    }
  }

  if (inserted) {
    await writeLocalDb(db);
  }
}

async function saveDielineTemplate(template: DielineTemplate): Promise<void> {
  const writeOperation = localDbWriteQueue.catch(() => undefined).then(async () => {
    const db = await readLocalDb();
    db.dielines[template.id] = template;
    await writeLocalDb(db);
  });

  localDbWriteQueue = writeOperation.catch(() => undefined);
  await writeOperation;
}

async function readLocalDb(): Promise<LocalDielinesDb> {
  try {
    const content = await fs.readFile(LOCAL_DB_FILE, "utf8");
    const parsed = JSON.parse(content) as Partial<LocalDielinesDb>;

    return {
      dielines: normalizeLocalDielines(parsed.dielines),
    };
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return { dielines: {} };
    }

    throw error;
  }
}

async function writeLocalDb(db: LocalDielinesDb): Promise<void> {
  await fs.mkdir(STORAGE_ROOT, { recursive: true });
  const tempFile = `${LOCAL_DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tempFile, LOCAL_DB_FILE);
}

function normalizeLocalDielines(value: unknown): Record<string, DielineTemplate> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const templates: Record<string, DielineTemplate> = {};

  for (const [id, template] of Object.entries(value as Record<string, unknown>)) {
    const normalized = normalizeDielineTemplateRecord(template, id);
    if (normalized) {
      templates[normalized.id] = normalized;
    }
  }

  return templates;
}

function normalizeDielineTemplateRecord(value: unknown, fallbackId?: string): DielineTemplate | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<DielineTemplate>;
  const id = typeof candidate.id === "string" ? candidate.id : fallbackId;
  const createdAt = typeof candidate.createdAt === "string" ? candidate.createdAt : undefined;
  const graph = normalizeDielineGraph(candidate.graph);

  if (!id || !isValidDielineId(id) || !createdAt || !graph) {
    return null;
  }

  return {
    id,
    name: normalizeTemplateName(candidate.name),
    status: normalizeDielineTemplateStatus(candidate.status),
    source: normalizeDielineTemplateSource(candidate.source),
    ...(normalizeFileName(candidate.fileName) ? { fileName: normalizeFileName(candidate.fileName) } : {}),
    graph,
    createdAt,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : createdAt,
  };
}

function filterDielineList(
  templates: DielineTemplate[],
  { limit = 80, query = "", status = "all" }: DielineTemplateListOptions
): DielineTemplate[] {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedStatus = status === "ready" || status === "draft" ? status : "all";

  return templates
    .filter((template) => normalizedStatus === "all" || template.status === normalizedStatus)
    .filter((template) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        template.name.toLowerCase().includes(normalizedQuery) ||
        template.id.toLowerCase().includes(normalizedQuery) ||
        template.fileName?.toLowerCase().includes(normalizedQuery) ||
        getDielineStructureSearchText(template).includes(normalizedQuery)
      );
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, Math.min(200, Math.max(1, limit)));
}

function getDielineStructureSearchText(template: DielineTemplate): string {
  return [
    getDielineCategoryLabel(getDielineCategory(template.graph)),
    getDielineFamilyLabel(template.graph),
    ...getDielineParts(template.graph).map((part) => part.label),
  ].join(" ").toLowerCase();
}

async function createUniqueId(): Promise<string> {
  const db = await readLocalDb();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomBytes(9).toString("base64url");
    if (!db.dielines[id]) {
      return id;
    }
  }

  throw new Error("Could not create a unique dieline ID.");
}

function normalizeTemplateName(value: unknown, fallback = "Untitled dieline"): string {
  const candidate = typeof value === "string" ? value.trim() : "";
  return (candidate || fallback).slice(0, 120);
}

function normalizeFileName(value: unknown): string | undefined {
  const candidate = typeof value === "string" ? value.trim() : "";
  return candidate ? candidate.slice(0, 180) : undefined;
}

function isValidDielineId(id: string): boolean {
  return DIELINE_ID_PATTERN.test(id);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
