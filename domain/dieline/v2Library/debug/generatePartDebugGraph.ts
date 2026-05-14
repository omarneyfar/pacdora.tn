import { createFaceEdgeAnchors } from "../anchors/createAnchors";
import type {
  V2Anchor,
  V2Face,
  V2PartBuildContext,
  V2PartDebugGraph,
  V2PartImplementation,
  V2PartResult,
} from "../contracts/types";
import { rectangleFace } from "../primitives/polygon";
import { getV2FoldingBoxPart, implementedV2PartIds } from "../registry/partRegistry";

type DebugContext = V2PartBuildContext & {
  faceList: V2Face[];
  anchorList: V2Anchor[];
  addPartResult(result: V2PartResult): void;
};

export { implementedV2PartIds };

export function generatePartDebugGraph(partId: string, anchorWidth: number): V2PartDebugGraph {
  const entry = getV2FoldingBoxPart(partId);
  if (!entry.implementation) {
    throw new Error(`${partId} has no implementation and cannot generate a debug graph.`);
  }

  const context = createDebugContext(anchorWidth);
  const result = buildPartDebugResult(entry.implementation, anchorWidth, context);
  context.addPartResult(result);

  return {
    id: `${partId}-${anchorWidth}`,
    label: `${entry.label} ${anchorWidth}`,
    faces: context.faceList,
    structuralCreases: result.structuralCreases,
    geometryPrimitives: result.geometryPrimitives,
    anchors: context.anchorList,
    warnings: [...context.warnings, ...result.warnings],
  };
}

function buildPartDebugResult(implementation: V2PartImplementation, anchorWidth: number, context: DebugContext): V2PartResult {
  const id = implementation.id;

  if (id === "standardBodyStrip") {
    return implementation.build({ id, parameters: { L: anchorWidth, W: Math.max(20, anchorWidth * 0.42), H: 90, topAllowance: anchorWidth * 0.35, bottomAllowance: anchorWidth * 0.35 } }, context);
  }

  if (id === "sleeveBody") {
    return implementation.build({ id, parameters: { L: anchorWidth, W: anchorWidth * 0.35, H: 70 } }, context);
  }

  if (standalonePartIds.has(id)) {
    return implementation.build({ id, parameters: parametersForPart(id, anchorWidth) }, context);
  }

  const attachTo = attachTargetForPart(id);
  return implementation.build({ id, attachTo, attachToFace: attachTo === "host" ? "host" : undefined, parameters: parametersForPart(id, anchorWidth) }, context);
}

const standalonePartIds = new Set([
  "trayBody",
  "skilletBody",
  "separatedSkilletBase",
  "separatedSkilletLid",
]);

function createDebugContext(anchorWidth: number): DebugContext {
  const faceList: V2Face[] = [];
  const anchorList: V2Anchor[] = [];
  const faces = new Map<string, V2Face>();
  const anchors = new Map<string, V2Anchor>();
  const warnings: string[] = [];
  const host = rectangleFace({
    id: "host",
    label: "Host Panel",
    role: "body",
    x: 40,
    y: 90,
    width: anchorWidth,
    height: 90,
    sourcePartId: "debug-host",
  });

  faceList.push(host);
  faces.set(host.id, host);
  for (const anchor of createFaceEdgeAnchors("debug-host", host)) {
    anchorList.push(anchor);
    anchors.set(anchor.id, anchor);
  }

  return {
    anchors,
    faces,
    warnings,
    faceList,
    anchorList,
    getAnchor(anchorId) {
      const found = anchors.get(anchorId);
      if (!found) throw new Error(`Missing debug anchor: ${anchorId}`);
      return found;
    },
    getFace(faceId) {
      const found = faces.get(faceId);
      if (!found) throw new Error(`Missing debug face: ${faceId}`);
      return found;
    },
    addWarning(message) {
      warnings.push(message);
    },
    addPartResult(result) {
      for (const face of result.faces) {
        faceList.push(face);
        faces.set(face.id, face);
      }
      for (const anchor of result.anchors) {
        anchorList.push(anchor);
        anchors.set(anchor.id, anchor);
      }
    },
  };
}

function attachTargetForPart(partId: string): string | undefined {
  if (partId === "sideGlueSeamTab" || partId === "relievedGlueSeamTab") return "host.right";
  if (partId === "sideCircularHangPanel") return "host.right";
  if (bottomAnchorPartIds.has(partId)) return "host.bottom";
  if (faceTargetPartIds.has(partId)) return "host";
  if (partId === "scoreGuide") return "host.top";
  if (partId.endsWith("Cutout") || partId.endsWith("Guide")) return "host";
  if (partId === "glueZoneGuide" || partId === "safeAreaGuide" || partId === "bleedGuide") return "host";
  return "host.top";
}

const bottomAnchorPartIds = new Set([
  "bottomLockFlap",
  "angledBottomDustFlap",
  "snapLockMajorFlap",
  "snapLockMinorFlap",
  "snapLockTongue",
  "autoLockMajorFlap",
  "autoLockMinorFlap",
  "autoLockGluePanel",
  "fullFlapBottomPanel",
  "snapLockingLip",
]);

const faceTargetPartIds = new Set([
  "snapLockReceiverSlot",
  "autoLockDiagonalScore",
  "bottomGlueZone",
  "lockSlot",
  "lockReliefNotch",
  "handleCutout",
  "tearStrip",
  "perforationStrip",
  "tearNotch",
  "compartmentGrid",
  "partitionLockSlot",
  "partitionGlueZone",
  "skilletSnapSlot",
  "reversibleLidReceiverSlot",
  "gussetDiagonalScore",
  "internalScoreGuide",
  "noPrintZoneGuide",
  "filmGlueZoneGuide",
  "windowFilmPatchGuide",
  "barcodeSafeZoneGuide",
]);

function parametersForPart(partId: string, anchorWidth: number): Record<string, number | string> {
  const common = {
    TFW: Math.max(18, anchorWidth * 0.42),
    TFR: Math.max(2, anchorWidth * 0.055),
    DFW: Math.max(12, anchorWidth * 0.38),
  };

  switch (partId) {
    case "sideGlueSeamTab":
    case "relievedGlueSeamTab":
      return { GFW: Math.max(10, Math.min(20, anchorWidth * 0.12)), reliefDepth: 3, reliefInset: 8 };
    case "lockingLipClosureFlap":
      return { ...common, TL: anchorWidth * 0.45, TD1: Math.max(6, anchorWidth * 0.08), TR: 2 };
    case "bottomLockFlap":
      return { bodyDepth: Math.max(20, anchorWidth * 0.42), tongueDepth: Math.max(6, anchorWidth * 0.08), tongueWidth: anchorWidth * 0.5 };
    case "snapLockMajorFlap":
    case "autoLockMajorFlap":
      return { flapDepth: Math.max(18, anchorWidth * 0.48), majorDepth: Math.max(20, anchorWidth * 0.54), overlap: 5 };
    case "snapLockMinorFlap":
    case "autoLockMinorFlap":
      return { DFW: Math.max(12, anchorWidth * 0.34), clearanceTaper: anchorWidth * 0.08 };
    case "snapLockTongue":
      return { bodyDepth: Math.max(12, anchorWidth * 0.22), tongueDepth: Math.max(5, anchorWidth * 0.07), tongueWidth: anchorWidth * 0.42 };
    case "snapLockReceiverSlot":
      return { slotWidth: anchorWidth * 0.44, slotHeight: 6, radius: 3, margin: 5 };
    case "autoLockGluePanel":
      return { GFW: Math.max(10, Math.min(18, anchorWidth * 0.14)) };
    case "autoLockDiagonalScore":
    case "gussetDiagonalScore":
      return { inset: Math.max(6, anchorWidth * 0.08) };
    case "fullFlapBottomPanel":
      return { fullFlapDepth: Math.max(24, anchorWidth * 0.86) };
    case "bottomGlueZone":
    case "partitionGlueZone":
      return { glueHeight: 12 };
    case "centeredTuckClosureFlap":
      return { TFW1: Math.max(18, anchorWidth * 0.35), TFW2: Math.max(12, anchorWidth * 0.22), D1: Math.max(6, anchorWidth * 0.07) };
    case "lockTab":
      return { tabShoulderDepth: 8, TD1: Math.max(5, anchorWidth * 0.08), TL: anchorWidth * 0.38 };
    case "lockSlot":
      return { TL: anchorWidth * 0.4, TD1: 6, margin: 5 };
    case "lockingTuckFlap":
      return { TFW: Math.max(18, anchorWidth * 0.36), TD1: Math.max(5, anchorWidth * 0.08), TL: anchorWidth * 0.4 };
    case "catalogLockFlap":
      return { TFW: Math.max(18, anchorWidth * 0.36) };
    case "snapLockingLip":
      return { lipDepth: Math.max(8, anchorWidth * 0.14), snapDepth: 5, snapWidth: anchorWidth * 0.36 };
    case "lockReliefNotch":
      return { notchWidth: Math.max(4, anchorWidth * 0.08), notchDepth: 5, margin: 3 };
    case "trapezoidDustFlap":
      return { DFW: Math.max(12, anchorWidth * 0.34), taper: anchorWidth * 0.12 };
    case "angledBottomDustFlap":
      return { DFW: Math.max(12, anchorWidth * 0.34), startInset: anchorWidth * 0.08, endInset: anchorWidth * 0.16 };
    case "circularCutout":
      return { OD: Math.max(6, anchorWidth * 0.07), margin: 5 };
    case "roundedSlotCutout":
      return { width: anchorWidth * 0.45, height: 6, radius: 3, margin: 5 };
    case "euroSlotCutout":
      return { SL: anchorWidth * 0.42, SW: 7, FR: 3.5, margin: 4 };
    case "windowCutout":
      return { WL: anchorWidth * 0.45, WH: 36, WR: 3, margin: 8 };
    case "reliefNotch":
      return { width: Math.max(2, anchorWidth * 0.04), depth: 2, position: "both" };
    case "hangPanel":
      return { HL: Math.max(24, anchorWidth * 0.25) };
    case "sideCircularHangPanel":
      return { extensionWidth: Math.max(30, anchorWidth * 0.7), neckWidth: anchorWidth * 0.24, outerRadius: anchorWidth * 0.24 };
    case "hangTab":
      return { TW: anchorWidth, SAL: Math.max(24, anchorWidth * 0.24), SL: anchorWidth * 0.42, SW: 6, FR: 3 };
    case "foldedHandle":
      return { HL: Math.max(24, anchorWidth * 0.3), HW: anchorWidth * 0.48, HT: 16 };
    case "arcHandle":
      return { HT: Math.max(20, anchorWidth * 0.24), shoulderInset: anchorWidth * 0.12 };
    case "handleBridge":
      return { bridgeDepth: Math.max(12, anchorWidth * 0.16) };
    case "handleCutout":
      return { HW: anchorWidth * 0.46, HT: 18, radius: 8, margin: 8 };
    case "handleReinforcementPanel":
      return { reinforcementDepth: Math.max(16, anchorWidth * 0.2) };
    case "tearStrip":
      return { EXD: 58, stripWidth: 7 };
    case "perforationStrip":
      return { inset: 10 };
    case "tearPullTab":
      return { tabBodyDepth: 8, pullDepth: 5, pullWidth: anchorWidth * 0.28 };
    case "tearNotch":
      return { notchWidth: Math.max(4, anchorWidth * 0.08), notchDepth: 5, margin: 3 };
    case "sealFlap":
      return { sealDepth: Math.max(16, anchorWidth * 0.24) };
    case "centeredDivider":
      return { DL: Math.max(40, anchorWidth * 0.7) };
    case "integratedPartition":
      return { PD1: Math.max(30, anchorWidth * 0.55) };
    case "builtInInsert":
      return { D1: Math.max(18, anchorWidth * 0.36) };
    case "productMount":
      return { D1: Math.max(18, anchorWidth * 0.34), mountTaper: anchorWidth * 0.08 };
    case "internalHolder":
      return { holderDepth: Math.max(18, anchorWidth * 0.32) };
    case "compartmentGrid":
    case "internalScoreGuide":
      return { inset: 9 };
    case "partitionLockSlot":
      return { slotWidth: Math.max(5, anchorWidth * 0.08), slotHeight: 34, margin: 5 };
    case "trayBody":
    case "skilletBody":
    case "separatedSkilletBase":
    case "separatedSkilletLid":
      return { L: anchorWidth, W: Math.max(30, anchorWidth * 0.42), H: 55 };
    case "traySideWall":
    case "skilletSideWall":
      return { wallHeight: Math.max(14, anchorWidth * 0.22) };
    case "trayCornerTab":
      return { tabDepth: Math.max(10, anchorWidth * 0.16), tabTaper: anchorWidth * 0.06 };
    case "skilletLid":
      return { lidDepth: Math.max(22, anchorWidth * 0.36) };
    case "skilletCornerLock":
      return { lockBodyDepth: 8, lockDepth: 5, lockWidth: anchorWidth * 0.3 };
    case "skilletInsertPanel":
      return { insertDepth: Math.max(18, anchorWidth * 0.32) };
    case "skilletSnapSlot":
      return { SL: anchorWidth * 0.32, SW1: 6, margin: 5 };
    case "reversibleLid":
      return { lidDepth: Math.max(34, anchorWidth * 0.55) };
    case "reversibleLidLockTab":
      return { tabBodyDepth: 8, TD1: 6, TL: anchorWidth * 0.36 };
    case "reversibleLidReceiverSlot":
      return { SL1: anchorWidth * 0.34, SW2: 6, margin: 5 };
    case "lidInsertPanel":
      return { insertDepth: Math.max(18, anchorWidth * 0.3) };
    case "gussetTrianglePanel":
      return { triangleDepth: Math.max(18, anchorWidth * 0.36) };
    case "gussetCover":
      return { TFW: Math.max(20, anchorWidth * 0.38) };
    case "gussetSidePanel":
      return { sideDepth: Math.max(16, anchorWidth * 0.32) };
    case "scoreGuide":
      return { offset: 20, length: anchorWidth * 0.72 };
    case "glueZoneGuide":
      return { inset: 3 };
    case "safeAreaGuide":
      return { inset: 7 };
    case "bleedGuide":
      return { bleed: 3 };
    case "noPrintZoneGuide":
      return { zoneHeight: 16 };
    case "filmGlueZoneGuide":
      return { zoneHeight: 12 };
    case "windowFilmPatchGuide":
      return { patchWidth: anchorWidth * 0.58, patchHeight: 42, margin: 4 };
    case "barcodeSafeZoneGuide":
      return { zoneWidth: anchorWidth * 0.36, zoneHeight: 20, margin: 4 };
    default:
      return common;
  }
}
