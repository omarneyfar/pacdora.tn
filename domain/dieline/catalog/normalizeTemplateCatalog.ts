import type {
  DielineTemplateCatalog,
  DielineTemplateDefinition,
  TemplateRuntime,
  TemplateVerification,
} from "./catalogTypes";

const IMPLEMENTED_GENERATOR_HINTS: Record<string, Pick<TemplateRuntime, "status" | "supports2D" | "supports3D">> = {
  reverseTuckEnd: { status: "ready", supports2D: true, supports3D: true },
  straightTuckEnd: { status: "beta", supports2D: true, supports3D: true },
};

export function normalizeTemplateCatalog(value: unknown): DielineTemplateCatalog {
  if (!value || typeof value !== "object") {
    throw new Error("Template catalog must be an object.");
  }

  const candidate = value as Partial<DielineTemplateCatalog>;
  const templates = Array.isArray(candidate.templates)
    ? candidate.templates.map((template) => normalizeTemplate(template))
    : [];

  return {
    databaseInfo: {
      name: String(candidate.databaseInfo?.name ?? "FoldView Dieline Catalog"),
      category: String(candidate.databaseInfo?.category ?? "Folding Box"),
      source: String(candidate.databaseInfo?.source ?? "unknown"),
      generatedOn: candidate.databaseInfo?.generatedOn,
      refactoredOn: candidate.databaseInfo?.refactoredOn,
      templateCount: Number(candidate.databaseInfo?.templateCount ?? templates.length),
      disclaimer: candidate.databaseInfo?.disclaimer,
      intendedUse: candidate.databaseInfo?.intendedUse,
    },
    units: candidate.units ?? {},
    lineTypeLegend: candidate.lineTypeLegend ?? {},
    globalDefaults: candidate.globalDefaults ?? {},
    globalManufacturingRules: candidate.globalManufacturingRules ?? {},
    globalValidationRules: candidate.globalValidationRules ?? [],
    templateSchemaVersion: String(candidate.templateSchemaVersion ?? "1.0.0"),
    templates,
  };
}

function normalizeTemplate(value: unknown): DielineTemplateDefinition {
  const template = value as Partial<DielineTemplateDefinition>;
  const slug = String(template.slug ?? template.id ?? "");
  const runtimeHint = IMPLEMENTED_GENERATOR_HINTS[slug];
  const runtime: TemplateRuntime = {
    generatorId: template.runtime?.generatorId ?? slug,
    geometrySource: template.runtime?.geometrySource ?? "typescript-generator",
    supports2D: template.runtime?.supports2D ?? runtimeHint?.supports2D ?? false,
    supports3D: template.runtime?.supports3D ?? runtimeHint?.supports3D ?? false,
    status: template.runtime?.status ?? runtimeHint?.status ?? "catalog-only",
  };
  const verification: TemplateVerification = {
    catalogNormalized: true,
    generatorImplemented: runtime.status !== "catalog-only",
    catalogReferencesValid: false,
    graphValidationPassed: false,
    visualComparedWithReference: false,
    dxfComparedWithReference: false,
    physicalPrototypeTested: Boolean(template.productionStatus?.prototypeTested),
    ...template.verification,
  };

  return {
    id: String(template.id ?? slug),
    name: String(template.name ?? template.templateType ?? slug),
    slug,
    category: String(template.category ?? "Folding Box"),
    family: String(template.family ?? "unknown"),
    templateType: String(template.templateType ?? template.name ?? slug),
    difficultyLevel: template.difficultyLevel,
    productionUseCase: template.productionUseCase,
    commonIndustries: template.commonIndustries ?? [],
    description: String(template.description ?? ""),
    source: template.source ?? {},
    productionStatus: {
      productionReady: Boolean(template.productionStatus?.productionReady),
      verifiedByPackagingEngineer: Boolean(template.productionStatus?.verifiedByPackagingEngineer),
      prototypeTested: Boolean(template.productionStatus?.prototypeTested),
      productionRiskLevel: template.productionStatus?.productionRiskLevel ?? "medium",
      warning: template.productionStatus?.warning,
    },
    dimensions: template.dimensions ?? {},
    derivedDimensions: template.derivedDimensions ?? {},
    editableParameters: template.editableParameters ?? [],
    components: template.components ?? [],
    geometry: template.geometry ?? {},
    paths: template.paths ?? [],
    foldingLogic: template.foldingLogic ?? {},
    mockup3D: template.mockup3D ?? {},
    variants: template.variants ?? [],
    manufacturingRules: template.manufacturingRules ?? {},
    validationRules: template.validationRules ?? [],
    formulas: normalizeStringRecord(template.formulas),
    warnings: template.warnings ?? [],
    requiresManualVerification: template.requiresManualVerification !== false,
    runtime,
    verification,
  };
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, rawValue]) => typeof rawValue === "string")
      .map(([key, rawValue]) => [key, rawValue as string]),
  );
}
