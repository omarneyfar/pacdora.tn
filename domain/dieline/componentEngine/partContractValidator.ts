import type { PartAttachTarget, PartContract, PartOutputCardinality } from "../partLibrary/partContracts";
import type {
  ComponentEngineValidationIssue,
  ComponentLayoutContext,
  ComponentRecipePart,
  PartRegistryEntry,
  PartResult,
} from "./types";

const NON_STRUCTURAL_CREASE_ID_PATTERNS = [
  /^score-/i,
  /(^|[-_])slot([-_]|$)/i,
  /(^|[-_])hole([-_]|$)/i,
  /(^|[-_])window([-_]|$)/i,
  /(^|[-_])relief([-_]|$)/i,
  /(^|[-_])perf(oration)?([-_]|$)/i,
  /(^|[-_])safe([-_]|$)/i,
  /(^|[-_])bleed([-_]|$)/i,
  /(^|[-_])glue-zone([-_]|$)/i,
];

export function validatePartAttachTarget(
  ctx: ComponentLayoutContext,
  part: ComponentRecipePart,
  contract: PartContract,
): ComponentEngineValidationIssue[] {
  const issues: ComponentEngineValidationIssue[] = [];
  const attachTo = stringValue(part.attachTo);
  const attachToFace = stringValue(part.attachToFace);

  for (const required of contract.requiredAnchors) {
    if (required === "attachTo" && !attachTo) {
      issues.push(error("missing-anchor", part, contract, `Part ${part.id} must declare attachTo for contract ${contract.id}.`));
    }

    if (required === "attachToFace" && !attachToFace) {
      issues.push(error("missing-anchor", part, contract, `Part ${part.id} must declare attachToFace for contract ${contract.id}.`));
    }

    if (required === "attachTo|attachToFace" && !attachTo && !attachToFace) {
      issues.push(error("missing-anchor", part, contract, `Part ${part.id} must declare attachTo or attachToFace for contract ${contract.id}.`));
    }
  }

  if (attachTo) {
    issues.push(...validateAttachTo(ctx, part, contract, attachTo));
  }

  if (attachToFace) {
    const face = ctx.faces.find((candidate) => candidate.id === attachToFace);
    if (!face) {
      issues.push(error("missing-anchor", part, contract, `Missing attachToFace target for part ${part.id}: ${attachToFace}.`));
    } else if (!allowsTarget(contract.allowedAttachTargets, "face")) {
      issues.push(error("invalid-attach-target", part, contract, `Part ${part.id} contract ${contract.id} cannot attach directly to a face.`));
    }
  }

  return issues;
}

export function validatePartResultAgainstContract(
  part: ComponentRecipePart,
  registration: PartRegistryEntry,
  contract: PartContract,
  result: PartResult,
): ComponentEngineValidationIssue[] {
  const issues: ComponentEngineValidationIssue[] = [];

  checkOutputExpectation(issues, part, contract, "faces", result.faces?.length ?? 0, contract.createsFaces, registration.outputExpectations.faces);
  checkOutputExpectation(
    issues,
    part,
    contract,
    "structuralCreases",
    result.structuralCreases?.length ?? 0,
    contract.createsStructuralCreases,
    registration.outputExpectations.structuralCreases,
  );
  checkOutputExpectation(
    issues,
    part,
    contract,
    "geometryPrimitives",
    result.geometry?.length ?? 0,
    contract.createsGeometryPrimitives,
    registration.outputExpectations.geometryPrimitives,
  );
  checkOutputExpectation(issues, part, contract, "anchors", result.anchors?.length ?? 0, contract.createsAnchors, registration.outputExpectations.anchors);

  for (const crease of result.structuralCreases ?? []) {
    if (crease.faceA === crease.faceB) {
      issues.push(
        error(
          "invalid-structural-crease",
          part,
          contract,
          `Part ${part.id} generated structural crease ${crease.id} that connects a face to itself. Internal score lines belong in geometry.`,
        ),
      );
    }

    if (NON_STRUCTURAL_CREASE_ID_PATTERNS.some((pattern) => pattern.test(crease.id))) {
      issues.push(
        error(
          "non-structural-crease",
          part,
          contract,
          `Part ${part.id} generated non-structural crease ${crease.id}. Slots, holes, windows, relief cuts, perforations, scores, glue zones, safe areas, and bleed areas must be GeometryPrimitive objects.`,
        ),
      );
    }
  }

  return issues;
}

export function contractWarnings(part: ComponentRecipePart, contract: PartContract): ComponentEngineValidationIssue[] {
  if (contract.implementationStatus === "implemented") {
    return [];
  }

  const fallback = `${part.id}: contract ${contract.id} is ${contract.implementationStatus} and must be verified before production use.`;
  const messages = contract.warningRules.length > 0 ? contract.warningRules : [fallback];

  return messages.map((message) => ({
    severity: "warning",
    code: "contract-warning",
    partId: part.id,
    contractId: contract.id,
    message: message.includes(part.id) ? message : `${part.id}: ${message}`,
  }));
}

export function throwIfValidationErrors(issues: ComponentEngineValidationIssue[], label: string): void {
  const errors = issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new Error(`${label}: ${errors.map((issue) => issue.message).join("; ")}`);
  }
}

export function issueMessages(issues: ComponentEngineValidationIssue[], severity: "error" | "warning"): string[] {
  return issues.filter((issue) => issue.severity === severity).map((issue) => issue.message);
}

function validateAttachTo(
  ctx: ComponentLayoutContext,
  part: ComponentRecipePart,
  contract: PartContract,
  attachTo: string,
): ComponentEngineValidationIssue[] {
  const anchor = ctx.anchors.get(attachTo);
  if (anchor) {
    const target = `anchor:${anchor.edge}` as const;
    if (!allowsTarget(contract.allowedAttachTargets, target) && !allowsTarget(contract.allowedAttachTargets, "anchor:any")) {
      return [
        error(
          "invalid-attach-target",
          part,
          contract,
          `Part ${part.id} contract ${contract.id} cannot attach to ${anchor.edge} anchor ${attachTo}.`,
        ),
      ];
    }
    return [];
  }

  const face = ctx.faces.find((candidate) => candidate.id === attachTo);
  if (face) {
    if (!allowsTarget(contract.allowedAttachTargets, "face")) {
      return [
        error(
          "invalid-attach-target",
          part,
          contract,
          `Part ${part.id} contract ${contract.id} cannot attach directly to face ${attachTo}.`,
        ),
      ];
    }
    return [];
  }

  return [error("missing-anchor", part, contract, `Missing attach target for part ${part.id}: ${attachTo}.`)];
}

function checkOutputExpectation(
  issues: ComponentEngineValidationIssue[],
  part: ComponentRecipePart,
  contract: PartContract,
  outputName: "faces" | "structuralCreases" | "geometryPrimitives" | "anchors",
  count: number,
  contractAllowsOutput: boolean,
  cardinality: PartOutputCardinality,
) {
  if (!contractAllowsOutput && count > 0) {
    issues.push(
      error(
        "unexpected-output",
        part,
        contract,
        `Part ${part.id} contract ${contract.id} must not create ${outputName}, but implementation created ${count}.`,
      ),
    );
    return;
  }

  if (cardinality === "none" && count > 0) {
    issues.push(error("unexpected-output", part, contract, `Part ${part.id} must not create ${outputName}, but created ${count}.`));
  }

  if (cardinality === "one-or-more" && count === 0) {
    issues.push(error("missing-output", part, contract, `Part ${part.id} contract ${contract.id} expected ${outputName}, but none were created.`));
  }
}

function allowsTarget(allowed: PartAttachTarget[], target: PartAttachTarget): boolean {
  return allowed.includes(target);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function error(
  code: string,
  part: ComponentRecipePart,
  contract: PartContract,
  message: string,
): ComponentEngineValidationIssue {
  return {
    severity: "error",
    code,
    partId: part.id,
    contractId: contract.id,
    message,
  };
}
