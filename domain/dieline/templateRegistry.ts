import {
  CEFBOX_FOLDING_BOX_DEFINITIONS,
  type FoldingBoxVariantDefinition,
} from "./templates/foldingBoxVariants";
import {
  generateReverseTuckEnd,
  normalizeReverseTuckEndParameters,
  REVERSE_TUCK_END_PARAMETER_SPECS,
  type ReverseTuckEndParameters,
} from "./templates/reverseTuckEnd";
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
};

export const DIELINE_TEMPLATE_CATEGORIES: DielineCategoryDefinition[] = [
  {
    id: "folding-box",
    slug: "foldingBox",
    label: "Folding Box",
    description: "Retail carton dielines with tuck ends, lock bottoms, hang tabs, handles, windows, inserts, and tear strips.",
    totalTemplates: CEFBOX_FOLDING_BOX_DEFINITIONS.length,
  },
];

export const REVERSE_TUCK_END_PARAMETER_GROUPS: DielineParameterGroup[] = [
  {
    id: "custom-size",
    label: "Custom Size",
    description: "Primary product dimensions. Auto closure mode derives the tuck, dust, and glue geometry from these values.",
    parameterIds: ["L", "W", "H"],
    columns: 3,
  },
  {
    id: "basic",
    label: "Basic",
    parameterIds: ["outputSizeMode", "materialThickness", "material", "bleeds"],
    columns: 2,
  },
  {
    id: "closure-mode",
    label: "Closure",
    description: "Auto is recommended. Manual unlocks the advanced closure values on the right.",
    parameterIds: ["closureMode"],
    columns: 1,
  },
  {
    id: "download-formats",
    label: "Download Formats",
    parameterIds: ["pdfExport", "dxfExport"],
    columns: 2,
  },
  {
    id: "advanced-closure",
    label: "Advanced Closure",
    description: "Editable in manual mode for dieline technicians who need exact closure control.",
    parameterIds: ["TFW", "TFR", "GFW", "DFW"],
    columns: 2,
  },
];

const TEMPLATE_REGISTRY: RegisteredDielineTemplate[] = [
  {
    id: "reverse-tuck-end",
    slug: "reverseTuckEnd",
    category: "folding-box",
    categorySlug: "foldingBox",
    label: "Reverse Tuck End Folding Carton Box",
    description: "A folding carton with tuck ends on the top and bottom opening from opposite sides.",
    parameterSpecs: REVERSE_TUCK_END_PARAMETER_SPECS,
    parameterGroups: REVERSE_TUCK_END_PARAMETER_GROUPS,
    exportFormats: ["dxf", "pdf", "svg"],
    defaultValues: normalizeReverseTuckEndParameters(),
    capabilities: ["canonical-2d", "svg-export", "dxf-export", "pdf-export", "folded-3d"],
    generate: (values = {}) => generateReverseTuckEnd(values as ReverseTuckEndParameters),
  },
];

export function getDielineTemplateCategories(): DielineCategoryDefinition[] {
  return DIELINE_TEMPLATE_CATEGORIES;
}

export function getDielineTemplateByRoute(categorySlug: string, templateSlug: string): RegisteredDielineTemplate | null {
  return TEMPLATE_REGISTRY.find((template) => template.categorySlug === categorySlug && template.slug === templateSlug) ?? null;
}

export function getDielineTemplateById(templateId: string): RegisteredDielineTemplate | null {
  return TEMPLATE_REGISTRY.find((template) => template.id === templateId) ?? null;
}

export function listRegisteredDielineTemplates(categorySlug?: string): RegisteredDielineTemplate[] {
  return categorySlug
    ? TEMPLATE_REGISTRY.filter((template) => template.categorySlug === categorySlug)
    : TEMPLATE_REGISTRY;
}

export function listDielineTemplateSummaries(categorySlug: string): DielineTemplateSummary[] {
  if (categorySlug !== "foldingBox") {
    return [];
  }

  return CEFBOX_FOLDING_BOX_DEFINITIONS.map((definition) => {
    const registered = getDielineTemplateById(definition.id);
    const slug = registered?.slug ?? toTemplateSlug(definition.id);
    return {
      id: definition.id,
      slug,
      categorySlug,
      label: definition.label,
      description: definition.description,
      parameters: definition.parameters,
      isImplemented: Boolean(registered),
      ...(registered ? { href: `/dielines/${categorySlug}/${slug}` } : {}),
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
  return listDielineTemplateSummaries("foldingBox").filter((template) => template.isImplemented).length;
}

export function getFoldingBoxDefinition(templateId: string): FoldingBoxVariantDefinition | null {
  return CEFBOX_FOLDING_BOX_DEFINITIONS.find((definition) => definition.id === templateId) ?? null;
}

function toTemplateSlug(templateId: string): string {
  return templateId.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}
