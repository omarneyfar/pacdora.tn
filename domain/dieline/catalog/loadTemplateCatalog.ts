import foldingBoxCatalogJson from "./foldingBoxCatalog.json";
import type { DielineTemplateCatalog, DielineTemplateDefinition } from "./catalogTypes";
import { normalizeTemplateCatalog } from "./normalizeTemplateCatalog";

const catalog = normalizeTemplateCatalog(foldingBoxCatalogJson);

export function loadTemplateCatalog(): DielineTemplateCatalog {
  return catalog;
}

export function listCatalogTemplates(categorySlug?: string): DielineTemplateDefinition[] {
  const templates = loadTemplateCatalog().templates;

  if (!categorySlug) {
    return templates;
  }

  return templates.filter((template) => getCatalogCategorySlug(template) === categorySlug);
}

export function getCatalogTemplateById(templateId: string): DielineTemplateDefinition | null {
  return loadTemplateCatalog().templates.find((template) => template.id === templateId || template.slug === templateId) ?? null;
}

export function getCatalogTemplateByRoute(categorySlug: string, templateSlug: string): DielineTemplateDefinition | null {
  return listCatalogTemplates(categorySlug).find((template) => template.slug === templateSlug) ?? null;
}

export function getCatalogCategorySlug(template: Pick<DielineTemplateDefinition, "category">): string {
  const compact = template.category.replace(/\s+/g, "");
  return compact ? compact[0].toLowerCase() + compact.slice(1) : "";
}
