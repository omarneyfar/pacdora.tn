import { getDielineGenerator } from "../generators/generatorRegistry";
import { assertValidDielineGraph } from "../validation/validateDielineGraph";
import type { DielineCategory, DielineGraph, ParameterSpec, ParameterValueMap } from "../types";
import type { CatalogGraphResult, DielineTemplateDefinition } from "./catalogTypes";
import { getCatalogTemplateById, loadTemplateCatalog } from "./loadTemplateCatalog";
import { resolveTemplateParameters } from "./resolveTemplateParameters";
import { validateTemplateCatalogReferences } from "./validateTemplateCatalog";

export function generateGraphFromCatalogTemplate(
  templateId: string,
  userValues: Record<string, unknown> = {},
): CatalogGraphResult {
  const catalog = loadTemplateCatalog();
  const template = getCatalogTemplateById(templateId);

  if (!template) {
    throw new Error(`Unknown catalog template: ${templateId}`);
  }

  const catalogValidation = validateTemplateCatalogReferences(template);
  const catalogErrors = catalogValidation.filter((message) => message.level === "error");
  if (catalogErrors.length > 0) {
    throw new Error(`Catalog template ${template.id} is invalid: ${catalogErrors.map((message) => message.message).join("; ")}`);
  }

  const resolved = resolveTemplateParameters(template, userValues, catalog.globalDefaults);
  const generator = getDielineGenerator(template.runtime.generatorId);
  const graph = generator(resolved.generatorParameters);
  const graphValidation = assertValidDielineGraph(graph, template.name);

  return {
    template,
    resolvedParameters: resolved.generatorParameters,
    graph: attachCatalogMetadata(graph, template, resolved.generatorParameters, resolved.parameterSpecs),
    warnings: [
      ...resolved.warnings,
      ...catalogValidation.filter((message) => message.level === "warning").map((message) => message.message),
      ...graphValidation.warnings,
      ...template.warnings.map((warning) => typeof warning === "string" ? warning : warning.message),
      ...(template.productionStatus.warning ? [template.productionStatus.warning] : []),
    ],
  };
}

function attachCatalogMetadata(
  graph: DielineGraph,
  template: DielineTemplateDefinition,
  resolvedParameters: ParameterValueMap,
  parameterSpecs: ParameterSpec[] = [],
): DielineGraph {
  return {
    ...graph,
    metadata: {
      ...graph.metadata,
      category: graph.metadata?.category ?? categoryToDielineCategory(template.category),
      family: graph.metadata?.family ?? template.family,
      familyLabel: template.name,
      parts: graph.metadata?.parts ?? [],
      parameterSpecs: graph.metadata?.parameterSpecs ?? parameterSpecs,
      parameterValues: {
        ...(graph.metadata?.parameterValues ?? {}),
        ...resolvedParameters,
      },
      catalog: {
        templateId: template.id,
        templateSlug: template.slug,
        templateCatalogVersion: loadTemplateCatalog().templateSchemaVersion,
        generatorId: template.runtime.generatorId,
        status: template.runtime.status,
        requiresManualVerification: template.requiresManualVerification,
        productionReady: template.productionStatus.productionReady,
        source: template.source,
        warnings: [
          ...template.warnings.map((warning) => typeof warning === "string" ? warning : warning.message),
          ...(template.productionStatus.warning ? [template.productionStatus.warning] : []),
        ],
      },
    },
    source: { type: "template", templateId: template.id },
  };
}

function categoryToDielineCategory(category: string): DielineCategory {
  return category.toLowerCase().includes("folding") ? "folding-box" : "custom";
}
