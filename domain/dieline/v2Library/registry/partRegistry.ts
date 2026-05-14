import { foldingBoxPartContracts, getFoldingBoxPartContract } from "../contracts/foldingBoxPartContracts";
import type { V2PartRegistryEntry } from "../contracts/types";
import { standardBodyStrip } from "../parts/body/standardBodyStrip";
import { sleeveBody } from "../parts/body/sleeveBody";
import { angledBottomDustFlap } from "../parts/closures/angledBottomDustFlap";
import { bottomLockFlap } from "../parts/closures/bottomLockFlap";
import { fullWidthTuckClosureFlap } from "../parts/closures/fullWidthTuckClosureFlap";
import { lockingLipClosureFlap } from "../parts/closures/lockingLipClosureFlap";
import { reverseTuckClosureFlap } from "../parts/closures/reverseTuckClosureFlap";
import { standardDustFlap } from "../parts/closures/standardDustFlap";
import { straightTuckClosureFlap } from "../parts/closures/straightTuckClosureFlap";
import { trapezoidDustFlap } from "../parts/closures/trapezoidDustFlap";
import { circularCutout } from "../parts/cutouts/circularCutout";
import { euroSlotCutout } from "../parts/cutouts/euroSlotCutout";
import { reliefNotch } from "../parts/cutouts/reliefNotch";
import { roundedSlotCutout } from "../parts/cutouts/roundedSlotCutout";
import { windowCutout } from "../parts/cutouts/windowCutout";
import { hangPanel } from "../parts/display/hangPanel";
import { hangTab } from "../parts/display/hangTab";
import { bleedGuide } from "../parts/guides/bleedGuide";
import { glueZoneGuide } from "../parts/guides/glueZoneGuide";
import { safeAreaGuide } from "../parts/guides/safeAreaGuide";
import { scoreGuide } from "../parts/guides/scoreGuide";
import { relievedGlueSeamTab } from "../parts/glue/relievedGlueSeamTab";
import { sideGlueSeamTab } from "../parts/glue/sideGlueSeamTab";

const implementations = [
  standardBodyStrip,
  sleeveBody,
  sideGlueSeamTab,
  relievedGlueSeamTab,
  reverseTuckClosureFlap,
  straightTuckClosureFlap,
  fullWidthTuckClosureFlap,
  lockingLipClosureFlap,
  standardDustFlap,
  trapezoidDustFlap,
  angledBottomDustFlap,
  bottomLockFlap,
  circularCutout,
  roundedSlotCutout,
  euroSlotCutout,
  windowCutout,
  reliefNotch,
  hangPanel,
  hangTab,
  scoreGuide,
  glueZoneGuide,
  safeAreaGuide,
  bleedGuide,
];

export const v2FoldingBoxPartRegistry = new Map<string, V2PartRegistryEntry>();

for (const implementation of implementations) {
  v2FoldingBoxPartRegistry.set(implementation.id, {
    id: implementation.id,
    label: implementation.label,
    contract: getFoldingBoxPartContract(implementation.contractId),
    implementation,
  });
}

for (const contract of foldingBoxPartContracts) {
  if (!v2FoldingBoxPartRegistry.has(contract.id)) {
    v2FoldingBoxPartRegistry.set(contract.id, {
      id: contract.id,
      label: contract.label,
      contract,
    });
  }
}

export const implementedV2PartIds = implementations.map((implementation) => implementation.id);

export function getV2FoldingBoxPart(id: string): V2PartRegistryEntry {
  const found = v2FoldingBoxPartRegistry.get(id);
  if (!found) {
    throw new Error(`Unknown V2 folding box part: ${id}`);
  }
  return found;
}
