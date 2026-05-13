import { bodyStripPart } from "../parts/body/bodyStrip";
import { angledBottomDustFlapPart } from "../parts/closures/angledBottomDustFlap";
import { bottomLockFlapPart } from "../parts/closures/bottomLockFlap";
import { dustFlapPart } from "../parts/closures/dustFlap";
import { fullWidthTuckFlapPart } from "../parts/closures/fullWidthTuckFlap";
import { customDustFlapPart } from "../parts/closures/customDustFlap";
import { lockTabPart } from "../parts/closures/lockTab";
import { lockingLipFlapPart } from "../parts/closures/lockingLipFlap";
import { panelFlapPart } from "../parts/closures/panelFlap";
import { slottedTuckFlapPart } from "../parts/closures/slottedTuckFlap";
import { trapezoidTopDustFlapPart } from "../parts/closures/trapezoidTopDustFlap";
import { tuckFlapPart } from "../parts/closures/tuckFlap";
import { circularHoleCutoutPart } from "../parts/cutouts/circularHoleCutout";
import { euroSlotCutoutPart } from "../parts/cutouts/euroSlotCutout";
import { reliefNotchPart } from "../parts/cutouts/reliefNotch";
import { roundedSlotCutoutPart } from "../parts/cutouts/roundedSlotCutout";
import { slotCutoutPart } from "../parts/cutouts/slotCutout";
import { windowCutoutPart } from "../parts/cutouts/windowCutout";
import { hangTabPart } from "../parts/features/hangTab";
import { sideGlueTabPart } from "../parts/glue/sideGlueTab";
import { partialEdgeAnchorPart } from "../parts/guides/partialEdgeAnchor";
import { scoreLinePart } from "../parts/guides/scoreLine";
import { createOutputExpectations, getPartContract } from "../partLibrary/partContracts";
import type { ComponentRecipePart, DielinePartGenerator, PartRegistryEntry } from "./types";

type PartRegistrationSpec = {
  contractId: string;
  allowedContractIds?: string[];
  outputExpectations: PartRegistryEntry["outputExpectations"];
};

const PARTS = [
  registerPart(bodyStripPart, {
    contractId: "body-strip",
    outputExpectations: createOutputExpectations({
      faces: "one-or-more",
      structuralCreases: "one-or-more",
      anchors: "one-or-more",
    }),
  }),
  registerPart(sideGlueTabPart, {
    contractId: "side-glue-tab",
    outputExpectations: createOutputExpectations({
      faces: "one-or-more",
      structuralCreases: "one-or-more",
      anchors: "one-or-more",
    }),
  }),
  registerPart(tuckFlapPart, {
    contractId: "reverse-tuck-flap",
    allowedContractIds: ["tuck-flap", "straight-tuck-flap", "centered-tuck-flap"],
    outputExpectations: createOutputExpectations({
      faces: "one-or-more",
      structuralCreases: "one-or-more",
      geometryPrimitives: "one-or-more",
      anchors: "one-or-more",
    }),
  }),
  registerPart(fullWidthTuckFlapPart, {
    contractId: "full-width-tuck-flap",
    outputExpectations: createOutputExpectations({
      faces: "one-or-more",
      structuralCreases: "one-or-more",
      geometryPrimitives: "one-or-more",
      anchors: "one-or-more",
    }),
  }),
  registerPart(lockingLipFlapPart, {
    contractId: "locking-lip-flap",
    outputExpectations: createOutputExpectations({
      faces: "one-or-more",
      structuralCreases: "one-or-more",
      geometryPrimitives: "one-or-more",
      anchors: "one-or-more",
    }),
  }),
  registerPart(slottedTuckFlapPart, {
    contractId: "slotted-tuck-flap",
    outputExpectations: createOutputExpectations({
      faces: "one-or-more",
      structuralCreases: "one-or-more",
      geometryPrimitives: "one-or-more",
      anchors: "one-or-more",
    }),
  }),
  registerPart(lockTabPart, {
    contractId: "lock-tab",
    outputExpectations: createOutputExpectations({
      faces: "one-or-more",
      structuralCreases: "one-or-more",
      anchors: "one-or-more",
    }),
  }),
  registerPart(bottomLockFlapPart, {
    contractId: "bottom-lock-flap",
    outputExpectations: createOutputExpectations({
      faces: "one-or-more",
      structuralCreases: "one-or-more",
      geometryPrimitives: "one-or-more",
      anchors: "one-or-more",
    }),
  }),
  registerPart(dustFlapPart, {
    contractId: "dust-flap",
    outputExpectations: createOutputExpectations({
      faces: "one-or-more",
      structuralCreases: "one-or-more",
      anchors: "one-or-more",
    }),
  }),
  registerPart(trapezoidTopDustFlapPart, {
    contractId: "trapezoid-top-dust-flap",
    outputExpectations: createOutputExpectations({
      faces: "one-or-more",
      structuralCreases: "one-or-more",
      anchors: "one-or-more",
    }),
  }),
  registerPart(angledBottomDustFlapPart, {
    contractId: "angled-bottom-dust-flap",
    outputExpectations: createOutputExpectations({
      faces: "one-or-more",
      structuralCreases: "one-or-more",
      anchors: "one-or-more",
    }),
  }),
  registerPart(customDustFlapPart, {
    contractId: "custom-dust-flap",
    outputExpectations: createOutputExpectations({
      faces: "one-or-more",
      structuralCreases: "one-or-more",
      geometryPrimitives: "optional",
      anchors: "one-or-more",
    }),
  }),
  registerPart(panelFlapPart, {
    contractId: "panel-flap",
    outputExpectations: createOutputExpectations({
      faces: "one-or-more",
      structuralCreases: "one-or-more",
      anchors: "one-or-more",
    }),
  }),
  registerPart(slotCutoutPart, {
    contractId: "slot-cutout",
    outputExpectations: createOutputExpectations({
      geometryPrimitives: "one-or-more",
    }),
  }),
  registerPart(roundedSlotCutoutPart, {
    contractId: "rounded-slot-cutout",
    allowedContractIds: ["lock-slot"],
    outputExpectations: createOutputExpectations({
      geometryPrimitives: "one-or-more",
    }),
  }),
  registerPart(circularHoleCutoutPart, {
    contractId: "circular-hole-cutout",
    allowedContractIds: ["circular-hang-hole"],
    outputExpectations: createOutputExpectations({
      geometryPrimitives: "one-or-more",
    }),
  }),
  registerPart(euroSlotCutoutPart, {
    contractId: "euro-slot-cutout",
    outputExpectations: createOutputExpectations({
      geometryPrimitives: "one-or-more",
    }),
  }),
  registerPart(windowCutoutPart, {
    contractId: "window-cutout",
    outputExpectations: createOutputExpectations({
      geometryPrimitives: "one-or-more",
    }),
  }),
  registerPart(reliefNotchPart, {
    contractId: "relief-notch",
    outputExpectations: createOutputExpectations({
      geometryPrimitives: "one-or-more",
    }),
  }),
  registerPart(hangTabPart, {
    contractId: "hang-tab",
    outputExpectations: createOutputExpectations({
      faces: "one-or-more",
      structuralCreases: "one-or-more",
      anchors: "one-or-more",
    }),
  }),
  registerPart(partialEdgeAnchorPart, {
    contractId: "partial-edge-anchor",
    outputExpectations: createOutputExpectations({
      anchors: "one-or-more",
    }),
  }),
  registerPart(scoreLinePart, {
    contractId: "score-line",
    outputExpectations: createOutputExpectations({
      geometryPrimitives: "one-or-more",
    }),
  }),
];

export const partRegistry = new Map<string, PartRegistryEntry>(
  PARTS.map((part) => [part.type, part]),
);

function registerPart<Config extends ComponentRecipePart>(
  implementation: DielinePartGenerator<Config>,
  spec: PartRegistrationSpec,
): PartRegistryEntry<Config> {
  const allowedContractIds = Array.from(new Set([spec.contractId, ...(spec.allowedContractIds ?? [])]));
  for (const contractId of allowedContractIds) {
    getPartContract(contractId);
  }

  return {
    type: implementation.type,
    implementation,
    contractId: spec.contractId,
    allowedContractIds,
    outputExpectations: spec.outputExpectations,
  };
}

export function getPartRegistration(type: string): PartRegistryEntry {
  const registration = partRegistry.get(type);
  if (!registration) {
    throw new Error(`Unknown v2 dieline part type: ${type}`);
  }
  return registration;
}

export function getPartGenerator(type: string): DielinePartGenerator {
  return getPartRegistration(type).implementation;
}

export function resolvePartContractId(part: ComponentRecipePart, registration = getPartRegistration(part.type)): string {
  return part.contract ?? registration.contractId;
}

export function getPartContractForRecipePart(part: ComponentRecipePart, registration = getPartRegistration(part.type)) {
  const contractId = resolvePartContractId(part, registration);

  if (!registration.allowedContractIds.includes(contractId)) {
    throw new Error(
      `Part ${part.id || "(unknown)"} uses contract "${contractId}", but type "${part.type}" only supports: ${registration.allowedContractIds.join(", ")}`,
    );
  }

  return getPartContract(contractId);
}
