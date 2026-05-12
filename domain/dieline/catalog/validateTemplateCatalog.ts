import type {
  CatalogValidationMessage,
  CatalogValidationResult,
  DielineTemplateCatalog,
  DielineTemplateDefinition,
} from "./catalogTypes";
import { extractFormulaReferences } from "./formulaEngine";

export function validateTemplateCatalog(catalog: DielineTemplateCatalog): CatalogValidationResult {
  const messages: CatalogValidationMessage[] = [];
  const ids = new Set<string>();

  for (const template of catalog.templates) {
    if (ids.has(template.id)) {
      error(messages, template.id, `Duplicate template id "${template.id}".`);
    }

    ids.add(template.id);
    messages.push(...validateTemplateCatalogReferences(template));
  }

  if (catalog.databaseInfo.templateCount !== catalog.templates.length) {
    warning(
      messages,
      undefined,
      `Catalog declares ${catalog.databaseInfo.templateCount} templates but contains ${catalog.templates.length}.`,
    );
  }

  return toResult(messages);
}

export function validateTemplateCatalogReferences(template: DielineTemplateDefinition): CatalogValidationMessage[] {
  const messages: CatalogValidationMessage[] = [];
  const componentIds = new Set(template.components.map((component) => component.id));
  const pathIds = new Set(template.paths.map((path) => path.id));
  const parameterIds = new Set([
    ...Object.keys(template.dimensions),
    ...Object.keys(template.derivedDimensions),
    ...template.editableParameters.map((parameter) => parameter.key),
    ...Object.keys(template.formulas),
  ]);

  assertUnique(template.components.map((component) => component.id), "component", template.id, messages);
  assertUnique(template.paths.map((path) => path.id), "path", template.id, messages);

  for (const path of template.paths) {
    for (const componentId of path.componentIds ?? []) {
      if (!componentIds.has(componentId)) {
        warning(messages, template.id, `Path "${path.id}" references missing component "${componentId}".`);
      }
    }
  }

  for (const step of template.foldingLogic.foldSequence ?? []) {
    if (!componentIds.has(step.componentId)) {
      warning(messages, template.id, `Folding step ${step.step} references missing component "${step.componentId}".`);
    }

    if (!pathIds.has(step.foldLineId)) {
      warning(messages, template.id, `Folding step ${step.step} references missing fold path "${step.foldLineId}".`);
    }
  }

  for (const mapped of Object.values(template.mockup3D.faces ?? {})) {
    const ids = Array.isArray(mapped) ? mapped : [mapped];
    for (const componentId of ids) {
      if (!componentIds.has(componentId)) {
        warning(messages, template.id, `mockup3D references missing component "${componentId}".`);
      }
    }
  }

  for (const uv of template.mockup3D.uvMapping ?? []) {
    if (!componentIds.has(uv.componentId)) {
      warning(messages, template.id, `UV mapping references missing component "${uv.componentId}".`);
    }
  }

  for (const variant of template.variants) {
    for (const componentId of variant.removedComponents ?? []) {
      if (!componentIds.has(componentId)) {
        warning(messages, template.id, `Variant "${variant.variantId}" removes missing component "${componentId}".`);
      }
    }

    for (const componentId of variant.addedComponents ?? []) {
      if (!componentIds.has(componentId)) {
        warning(messages, template.id, `Variant "${variant.variantId}" declares variant-only component "${componentId}".`);
      }
    }
  }

  for (const rule of template.validationRules) {
    for (const parameterId of rule.affectedParameters ?? []) {
      if (!parameterIds.has(parameterId)) {
        warning(messages, template.id, `Validation rule "${rule.ruleId}" references unknown parameter "${parameterId}".`);
      }
    }
  }

  for (const [formulaId, formula] of Object.entries(template.formulas)) {
    for (const reference of extractFormulaReferences(formula)) {
      if (!parameterIds.has(reference)) {
        warning(messages, template.id, `Formula "${formulaId}" references unknown parameter "${reference}".`);
      }
    }
  }

  if (!template.requiresManualVerification) {
    error(messages, template.id, "Template must keep requiresManualVerification true until CAD and prototype verification pass.");
  }

  if (
    template.productionStatus.productionReady &&
    (!template.productionStatus.verifiedByPackagingEngineer || !template.productionStatus.prototypeTested)
  ) {
    error(messages, template.id, "productionReady requires packaging engineer verification and prototype testing.");
  }

  return messages;
}

function assertUnique(ids: string[], label: string, templateId: string, messages: CatalogValidationMessage[]) {
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      error(messages, templateId, `Duplicate ${label} id "${id}".`);
    }

    seen.add(id);
  }
}

function toResult(messages: CatalogValidationMessage[]): CatalogValidationResult {
  return {
    ok: !messages.some((message) => message.level === "error"),
    messages,
  };
}

function error(messages: CatalogValidationMessage[], templateId: string | undefined, message: string) {
  messages.push({ level: "error", templateId, message });
}

function warning(messages: CatalogValidationMessage[], templateId: string | undefined, message: string) {
  messages.push({ level: "warning", templateId, message });
}
