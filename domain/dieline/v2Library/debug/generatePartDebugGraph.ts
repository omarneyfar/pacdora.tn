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

  const attachTo = attachTargetForPart(id);
  return implementation.build({ id, attachTo, attachToFace: attachTo === "host" ? "host" : undefined, parameters: parametersForPart(id, anchorWidth) }, context);
}

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
  if (partId === "bottomLockFlap" || partId === "angledBottomDustFlap") return "host.bottom";
  if (partId === "scoreGuide") return "host.top";
  if (partId.endsWith("Cutout") || partId.endsWith("Guide")) return "host";
  if (partId === "glueZoneGuide" || partId === "safeAreaGuide" || partId === "bleedGuide") return "host";
  return "host.top";
}

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
    case "hangTab":
      return { TW: anchorWidth, SAL: Math.max(24, anchorWidth * 0.24), SL: anchorWidth * 0.42, SW: 6, FR: 3 };
    case "scoreGuide":
      return { offset: 20, length: anchorWidth * 0.72 };
    case "glueZoneGuide":
      return { inset: 3 };
    case "safeAreaGuide":
      return { inset: 7 };
    case "bleedGuide":
      return { bleed: 3 };
    default:
      return common;
  }
}
