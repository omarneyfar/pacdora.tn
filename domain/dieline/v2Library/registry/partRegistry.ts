import { foldingBoxPartContracts, getFoldingBoxPartContract } from "../contracts/foldingBoxPartContracts";
import type { V2PartRegistryEntry } from "../contracts/types";
import { standardBodyStrip } from "../parts/body/standardBodyStrip";
import { sleeveBody } from "../parts/body/sleeveBody";
import {
  autoLockDiagonalScore,
  autoLockGluePanel,
  autoLockMajorFlap,
  autoLockMinorFlap,
  bottomGlueZone,
  fullFlapBottomPanel,
  snapLockMajorFlap,
  snapLockMinorFlap,
  snapLockReceiverSlot,
  snapLockTongue,
} from "../parts/bottom/bottomParts";
import { angledBottomDustFlap } from "../parts/closures/angledBottomDustFlap";
import { bottomLockFlap } from "../parts/closures/bottomLockFlap";
import { centeredTuckClosureFlap } from "../parts/closures/centeredTuckClosureFlap";
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
import { hangPanel } from "../parts/display/hangPanel";
import { hangTab } from "../parts/display/hangTab";
import { gussetCover, gussetDiagonalScore, gussetSidePanel, gussetTrianglePanel } from "../parts/gusset/gussetParts";
import { bleedGuide } from "../parts/guides/bleedGuide";
import {
  barcodeSafeZoneGuide,
  filmGlueZoneGuide,
  internalScoreGuide,
  noPrintZoneGuide,
  windowFilmPatchGuide,
} from "../parts/guides/extraGuideParts";
import { glueZoneGuide } from "../parts/guides/glueZoneGuide";
import { safeAreaGuide } from "../parts/guides/safeAreaGuide";
import { scoreGuide } from "../parts/guides/scoreGuide";
import { relievedGlueSeamTab } from "../parts/glue/relievedGlueSeamTab";
import { sideGlueSeamTab } from "../parts/glue/sideGlueSeamTab";
import { arcHandle, foldedHandle, handleBridge, handleCutout, handleReinforcementPanel } from "../parts/handles/handleParts";
import {
  builtInInsert,
  centeredDivider,
  compartmentGrid,
  integratedPartition,
  internalHolder,
  partitionGlueZone,
  partitionLockSlot,
  productMount,
} from "../parts/internal/internalParts";
import { catalogLockFlap, lockingTuckFlap, lockReliefNotch, lockSlot, lockTab, snapLockingLip } from "../parts/locking/lockingParts";
import { lidInsertPanel, reversibleLid, reversibleLidLockTab, reversibleLidReceiverSlot } from "../parts/reversible/reversibleParts";
import {
  separatedSkilletBase,
  separatedSkilletLid,
  skilletBody,
  skilletCornerLock,
  skilletInsertPanel,
  skilletLid,
  skilletSideWall,
  skilletSnapSlot,
} from "../parts/skillet/skilletParts";
import { tearNotch, tearPullTab, tearStrip, perforationStrip, sealFlap } from "../parts/tear/tearParts";
import { trayBody, trayCornerTab, traySideWall } from "../parts/tray/trayParts";
import { windowCutout } from "../parts/windows/windowCutout";

const implementations = [
  standardBodyStrip,
  sleeveBody,
  sideGlueSeamTab,
  relievedGlueSeamTab,
  reverseTuckClosureFlap,
  straightTuckClosureFlap,
  centeredTuckClosureFlap,
  fullWidthTuckClosureFlap,
  lockingLipClosureFlap,
  standardDustFlap,
  trapezoidDustFlap,
  angledBottomDustFlap,
  bottomLockFlap,
  snapLockMajorFlap,
  snapLockMinorFlap,
  snapLockTongue,
  snapLockReceiverSlot,
  autoLockMajorFlap,
  autoLockMinorFlap,
  autoLockGluePanel,
  autoLockDiagonalScore,
  fullFlapBottomPanel,
  bottomGlueZone,
  circularCutout,
  roundedSlotCutout,
  euroSlotCutout,
  windowCutout,
  reliefNotch,
  hangPanel,
  hangTab,
  lockTab,
  lockSlot,
  lockingTuckFlap,
  catalogLockFlap,
  snapLockingLip,
  lockReliefNotch,
  foldedHandle,
  arcHandle,
  handleBridge,
  handleCutout,
  handleReinforcementPanel,
  tearStrip,
  perforationStrip,
  tearPullTab,
  tearNotch,
  sealFlap,
  centeredDivider,
  integratedPartition,
  builtInInsert,
  productMount,
  internalHolder,
  compartmentGrid,
  partitionLockSlot,
  partitionGlueZone,
  trayBody,
  traySideWall,
  trayCornerTab,
  skilletBody,
  skilletLid,
  separatedSkilletBase,
  separatedSkilletLid,
  skilletSideWall,
  skilletCornerLock,
  skilletInsertPanel,
  skilletSnapSlot,
  reversibleLid,
  reversibleLidLockTab,
  reversibleLidReceiverSlot,
  lidInsertPanel,
  gussetTrianglePanel,
  gussetCover,
  gussetSidePanel,
  gussetDiagonalScore,
  scoreGuide,
  glueZoneGuide,
  safeAreaGuide,
  bleedGuide,
  internalScoreGuide,
  noPrintZoneGuide,
  filmGlueZoneGuide,
  windowFilmPatchGuide,
  barcodeSafeZoneGuide,
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
