import {
  catalogTemplateToParameterGroups,
  generateGraphFromCatalogTemplate,
  getCatalogCategorySlug,
  getCatalogTemplateById as getCatalogTemplate,
  getCatalogTemplateByRoute,
  listCatalogTemplates,
  loadTemplateCatalog,
  resolveTemplateParameters,
  type DielineTemplateDefinition as CatalogTemplateDefinition,
} from "./catalog";
import { hasDielineGenerator } from "./generators/generatorRegistry";
import type {
  DielineCategory,
  DielineGraph,
  DielineParameterGroup,
  DielineTemplateExportFormat,
  ParameterSpec,
  ParameterValueMap,
} from "./types";

export type DielineCategoryDefinition = {
  id: DielineCategory;
  slug: string;
  label: string;
  description: string;
  totalTemplates: number;
};

export type RegisteredDielineTemplate = {
  id: string;
  slug: string;
  category: DielineCategory;
  categorySlug: string;
  label: string;
  description: string;
  parameterSpecs: ParameterSpec[];
  parameterGroups: DielineParameterGroup[];
  exportFormats: DielineTemplateExportFormat[];
  defaultValues: ParameterValueMap;
  capabilities: string[];
  hasGenerator: boolean;
  runtimeStatus: string;
  productionRiskLevel?: string;
  requiresManualVerification: boolean;
  catalogTemplate: CatalogTemplateDefinition;
  generate: (values?: ParameterValueMap) => DielineGraph;
};

export type DielineTemplateSummary = {
  id: string;
  slug: string;
  categorySlug: string;
  label: string;
  description: string;
  parameters: string[];
  isImplemented: boolean;
  href?: string;
  runtimeStatus: string;
  productionRiskLevel?: string;
  sourceWebsite?: string;
  requiresManualVerification: boolean;
};

const catalog = loadTemplateCatalog();

export const DIELINE_TEMPLATE_CATEGORIES: DielineCategoryDefinition[] = [
  {
    id: "folding-box",
    slug: "foldingBox",
    label: catalog.databaseInfo.category,
    description:
      catalog.databaseInfo.intendedUse ??
      "Folding carton dielines with template metadata, parameters, manufacturing notes, and generator status.",
    totalTemplates: catalog.templates.length,
  },
];

const TEMPLATE_REGISTRY: RegisteredDielineTemplate[] = catalog.templates.map((template) => createRegisteredTemplate(template));

export function getDielineTemplateCategories(): DielineCategoryDefinition[] {
  return DIELINE_TEMPLATE_CATEGORIES;
}

export function getDielineTemplateByRoute(categorySlug: string, templateSlug: string): RegisteredDielineTemplate | null {
  const catalogTemplate = getCatalogTemplateByRoute(categorySlug, templateSlug);
  return catalogTemplate ? getDielineTemplateById(catalogTemplate.id) : null;
}

export function getDielineTemplateById(templateId: string): RegisteredDielineTemplate | null {
  return TEMPLATE_REGISTRY.find((template) => template.id === templateId || template.slug === templateId) ?? null;
}

export function listRegisteredDielineTemplates(categorySlug?: string): RegisteredDielineTemplate[] {
  return categorySlug
    ? TEMPLATE_REGISTRY.filter((template) => template.categorySlug === categorySlug)
    : TEMPLATE_REGISTRY;
}

export function listDielineTemplateSummaries(categorySlug: string): DielineTemplateSummary[] {
  return listCatalogTemplates(categorySlug).map((template) => {
    const registered = getDielineTemplateById(template.id);
    const hasGenerator = Boolean(registered?.hasGenerator);

    return {
      id: template.id,
      slug: template.slug,
      categorySlug,
      label: template.name,
      description: template.description,
      parameters: template.editableParameters.map((parameter) => parameter.label || parameter.key),
      isImplemented: hasGenerator,
      href: `/dielines/${categorySlug}/${template.slug}`,
      runtimeStatus: hasGenerator ? template.runtime.status : "catalog-only",
      productionRiskLevel: template.productionStatus.productionRiskLevel,
      sourceWebsite: template.source.website,
      requiresManualVerification: template.requiresManualVerification,
    };
  });
}

export function createDefaultParameterValues(specs: ParameterSpec[]): ParameterValueMap {
  return Object.fromEntries(specs.map((spec) => [spec.id, spec.defaultValue]));
}

export function mergeTemplateParameterValues(template: RegisteredDielineTemplate, values: ParameterValueMap): ParameterValueMap {
  return {
    ...template.defaultValues,
    ...values,
  };
}

export function getParameterSpecsByGroup(template: RegisteredDielineTemplate) {
  const specsById = new Map(template.parameterSpecs.map((spec) => [spec.id, spec]));

  return template.parameterGroups.map((group) => ({
    ...group,
    specs: group.parameterIds.flatMap((id) => {
      const spec = specsById.get(id);
      return spec ? [spec] : [];
    }),
  }));
}

export function getImplementedFoldingBoxCount(): number {
  return listRegisteredDielineTemplates("foldingBox").filter((template) => template.hasGenerator).length;
}

export function getFoldingBoxDefinition(templateId: string): CatalogTemplateDefinition | null {
  return getCatalogTemplate(templateId);
}

function createRegisteredTemplate(template: CatalogTemplateDefinition): RegisteredDielineTemplate {
  const hasGenerator = hasDielineGenerator(template.runtime.generatorId);
  const resolved = resolveTemplateParameters(template, {}, catalog.globalDefaults);

  return {
    id: template.id,
    slug: template.slug,
    category: toDielineCategory(template.category),
    categorySlug: getCatalogCategorySlug(template),
    label: template.name,
    description: template.description,
    parameterSpecs: resolved.parameterSpecs,
    parameterGroups: catalogTemplateToParameterGroups(template),
    exportFormats: hasGenerator ? ["dxf", "pdf", "svg"] : [],
    defaultValues: resolved.generatorParameters,
    capabilities: [
      "catalog-driven-ui",
      ...(hasGenerator ? ["typescript-generator", "canonical-2d", "folded-3d"] : ["catalog-only"]),
    ],
    hasGenerator,
    runtimeStatus: hasGenerator ? template.runtime.status : "catalog-only",
    productionRiskLevel: template.productionStatus.productionRiskLevel,
    requiresManualVerification: template.requiresManualVerification,
    catalogTemplate: template,
    generate: (values = {}) => generateGraphFromCatalogTemplate(template.id, values).graph,
  };
}

function toDielineCategory(category: string): DielineCategory {
  return category.toLowerCase().includes("folding") ? "folding-box" : "custom";
}
