import type {
  V2Anchor,
  V2AnchorEdge,
  V2Face,
  V2GeometryLayer,
  V2PartBuildInput,
  V2PartImplementation,
  V2PartParameters,
  V2Point,
} from "../contracts/types";
import { midpoint, offset } from "../primitives/points";
import { createFace } from "../primitives/polygon";
import { roundedRectPrimitive } from "../primitives/roundedRect";
import { roundedSlotPrimitive } from "../primitives/slots";
import { assertBaseEdgeMatchesAnchor, assertPrimitiveInsideFace } from "../primitives/validation";
import {
  anchoredRectangleFace,
  anchoredTrapezoidFace,
  anchorsForFace,
  emptyPartResult,
  linePrimitive,
  numberParameter,
  polygonPrimitive,
  positiveParameter,
  structuralCrease,
} from "./buildingBlocks";

type EdgeRequirement = V2AnchorEdge | "any";

type WarningFactory = (input: V2PartBuildInput, anchorOrFace: V2Anchor | V2Face) => string[];

function requireAnchor(input: V2PartBuildInput, context: { getAnchor(anchorId: string): V2Anchor }, edge: EdgeRequirement = "any"): V2Anchor {
  if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
  const anchor = context.getAnchor(input.attachTo);
  if (edge !== "any" && anchor.edge !== edge) {
    throw new Error(`${input.id}: expected ${edge} attach anchor but received ${anchor.edge}.`);
  }
  return anchor;
}

function requireFace(input: V2PartBuildInput, context: { getFace(faceId: string): V2Face }): V2Face {
  const faceId = input.attachToFace ?? input.attachTo;
  if (!faceId) throw new Error(`${input.id}: attachToFace is required.`);
  return context.getFace(faceId);
}

function collectWarnings(input: V2PartBuildInput, target: V2Anchor | V2Face, factory?: WarningFactory): string[] {
  return factory ? factory(input, target) : [];
}

export function attachedRectanglePart(options: {
  id: string;
  label: string;
  contractId?: string;
  role: V2Face["role"];
  edge?: EdgeRequirement;
  depthParam?: string;
  defaultDepthRatio?: number;
  minDepth?: number;
  printable?: boolean;
  warningFactory?: WarningFactory;
}): V2PartImplementation<V2PartParameters> {
  return {
    id: options.id,
    label: options.label,
    contractId: options.contractId ?? options.id,
    build(input, context) {
      const anchor = requireAnchor(input, context, options.edge);
      const fallback = Math.max(options.minDepth ?? 8, anchor.length * (options.defaultDepthRatio ?? 0.35));
      const depth = positiveParameter(input, options.depthParam ?? "depth", fallback);
      const face = anchoredRectangleFace({
        id: `${input.id}.face`,
        label: options.label,
        sourcePartId: input.id,
        anchor,
        depth,
        role: options.role,
        printable: options.printable,
      });
      const result = emptyPartResult();

      result.faces.push(face);
      result.structuralCreases.push(structuralCrease({
        id: `${input.id}.hinge`,
        label: `${options.label} hinge`,
        anchor,
        childFaceId: face.id,
        foldAngleDegrees: 90,
        foldDirection: "inward",
      }));
      result.anchors.push(...anchorsForFace(input.id, face));

      return { ...result, warnings: collectWarnings(input, anchor, options.warningFactory) };
    },
  };
}

export function attachedTrapezoidPart(options: {
  id: string;
  label: string;
  contractId?: string;
  role: V2Face["role"];
  edge?: EdgeRequirement;
  depthParam?: string;
  defaultDepthRatio?: number;
  taperParam?: string;
  printable?: boolean;
  warningFactory?: WarningFactory;
}): V2PartImplementation<V2PartParameters> {
  return {
    id: options.id,
    label: options.label,
    contractId: options.contractId ?? options.id,
    build(input, context) {
      const anchor = requireAnchor(input, context, options.edge);
      const depth = positiveParameter(input, options.depthParam ?? "depth", Math.max(8, anchor.length * (options.defaultDepthRatio ?? 0.35)));
      const taper = Math.min(numberParameter(input, options.taperParam ?? "taper", anchor.length * 0.08), anchor.length * 0.35);
      const face = anchoredTrapezoidFace({
        id: `${input.id}.face`,
        label: options.label,
        sourcePartId: input.id,
        anchor,
        depth,
        startInset: Math.max(0, taper),
        endInset: Math.max(0, taper),
        role: options.role,
        printable: options.printable,
      });
      const result = emptyPartResult();

      result.faces.push(face);
      result.structuralCreases.push(structuralCrease({
        id: `${input.id}.hinge`,
        label: `${options.label} hinge`,
        anchor,
        childFaceId: face.id,
        foldAngleDegrees: 90,
        foldDirection: "inward",
      }));
      result.anchors.push(...anchorsForFace(input.id, face));

      return { ...result, warnings: collectWarnings(input, anchor, options.warningFactory) };
    },
  };
}

export function attachedTonguePart(options: {
  id: string;
  label: string;
  contractId?: string;
  role: V2Face["role"];
  edge?: EdgeRequirement;
  bodyDepthParam?: string;
  tongueDepthParam?: string;
  tongueWidthParam?: string;
  defaultBodyDepthRatio?: number;
  printable?: boolean;
  warningFactory?: WarningFactory;
}): V2PartImplementation<V2PartParameters> {
  return {
    id: options.id,
    label: options.label,
    contractId: options.contractId ?? options.id,
    build(input, context) {
      const anchor = requireAnchor(input, context, options.edge);
      const bodyDepth = positiveParameter(input, options.bodyDepthParam ?? "bodyDepth", Math.max(8, anchor.length * (options.defaultBodyDepthRatio ?? 0.32)));
      const tongueDepth = positiveParameter(input, options.tongueDepthParam ?? "tongueDepth", Math.max(4, anchor.length * 0.08));
      const tongueWidth = Math.min(
        positiveParameter(input, options.tongueWidthParam ?? "tongueWidth", anchor.length * 0.45),
        anchor.length * 0.82,
      );
      const face = createFace({
        id: `${input.id}.face`,
        label: options.label,
        role: options.role,
        sourcePartId: input.id,
        points: tonguePanelPoints(anchor, bodyDepth, tongueDepth, tongueWidth),
        printable: options.printable,
      });
      const result = emptyPartResult();

      assertBaseEdgeMatchesAnchor(face, anchor, input.id);
      result.faces.push(face);
      result.structuralCreases.push(structuralCrease({
        id: `${input.id}.hinge`,
        label: `${options.label} hinge`,
        anchor,
        childFaceId: face.id,
        foldAngleDegrees: 90,
        foldDirection: "inward",
      }));
      result.geometryPrimitives.push(linePrimitive({
        id: `${input.id}.tongue-shoulder-score`,
        label: "Geometry-only tongue shoulder score",
        layer: "score",
        start: offset(offset(anchor.start, anchor.tangent, (anchor.length - tongueWidth) / 2), anchor.normal, bodyDepth),
        end: offset(offset(anchor.end, anchor.tangent, -(anchor.length - tongueWidth) / 2), anchor.normal, bodyDepth),
        ownerFaceId: face.id,
      }));
      result.anchors.push(...anchorsForFace(input.id, face));

      return { ...result, warnings: collectWarnings(input, anchor, options.warningFactory) };
    },
  };
}

export function attachedTrianglePart(options: {
  id: string;
  label: string;
  contractId?: string;
  role: V2Face["role"];
  edge?: EdgeRequirement;
  depthParam?: string;
  defaultDepthRatio?: number;
  printable?: boolean;
  warningFactory?: WarningFactory;
}): V2PartImplementation<V2PartParameters> {
  return {
    id: options.id,
    label: options.label,
    contractId: options.contractId ?? options.id,
    build(input, context) {
      const anchor = requireAnchor(input, context, options.edge);
      const depth = positiveParameter(input, options.depthParam ?? "depth", Math.max(8, anchor.length * (options.defaultDepthRatio ?? 0.4)));
      const face = createFace({
        id: `${input.id}.face`,
        label: options.label,
        role: options.role,
        sourcePartId: input.id,
        points: [anchor.start, offset(midpoint(anchor.start, anchor.end), anchor.normal, depth), anchor.end],
        printable: options.printable,
      });
      const result = emptyPartResult();

      assertBaseEdgeMatchesAnchor(face, anchor, input.id);
      result.faces.push(face);
      result.structuralCreases.push(structuralCrease({
        id: `${input.id}.hinge`,
        label: `${options.label} hinge`,
        anchor,
        childFaceId: face.id,
        foldAngleDegrees: 90,
        foldDirection: "inward",
      }));
      result.anchors.push(...anchorsForFace(input.id, face));

      return { ...result, warnings: collectWarnings(input, anchor, options.warningFactory) };
    },
  };
}

export function faceRoundedRectPrimitivePart(options: {
  id: string;
  label: string;
  contractId?: string;
  layer: Extract<V2GeometryLayer, "hole" | "window" | "glue" | "safe-area" | "bleed" | "no-print" | "film" | "guide">;
  widthParam?: string;
  heightParam?: string;
  radiusParam?: string;
  defaultWidthRatio?: number;
  defaultHeightRatio?: number;
  margin?: number;
  warningFactory?: WarningFactory;
}): V2PartImplementation<V2PartParameters> {
  return {
    id: options.id,
    label: options.label,
    contractId: options.contractId ?? options.id,
    build(input, context) {
      const face = requireFace(input, context);
      const margin = Math.max(0, numberParameter(input, "margin", options.margin ?? 4));
      const width = Math.min(
        positiveParameter(input, options.widthParam ?? "width", face.bounds.width * (options.defaultWidthRatio ?? 0.45)),
        Math.max(1, face.bounds.width - margin * 2),
      );
      const height = Math.min(
        positiveParameter(input, options.heightParam ?? "height", face.bounds.height * (options.defaultHeightRatio ?? 0.15)),
        Math.max(1, face.bounds.height - margin * 2),
      );
      const primitive = roundedRectPrimitive({
        id: `${input.id}.${options.layer}`,
        label: options.label,
        layer: options.layer,
        x: face.bounds.x + face.bounds.width / 2 - width / 2,
        y: face.bounds.y + face.bounds.height / 2 - height / 2,
        width,
        height,
        radius: numberParameter(input, options.radiusParam ?? "radius", Math.min(width, height) * 0.2),
        ownerFaceId: face.id,
      });

      assertPrimitiveInsideFace(primitive, face, margin);
      return {
        ...emptyPartResult(),
        geometryPrimitives: [primitive],
        warnings: collectWarnings(input, face, options.warningFactory),
      };
    },
  };
}

export function faceSlotPrimitivePart(options: {
  id: string;
  label: string;
  contractId?: string;
  widthParam?: string;
  heightParam?: string;
  radiusParam?: string;
  defaultWidthRatio?: number;
  defaultHeightRatio?: number;
  margin?: number;
  warningFactory?: WarningFactory;
}): V2PartImplementation<V2PartParameters> {
  return {
    id: options.id,
    label: options.label,
    contractId: options.contractId ?? options.id,
    build(input, context) {
      const face = requireFace(input, context);
      const margin = Math.max(0, numberParameter(input, "margin", options.margin ?? 5));
      const width = Math.min(
        positiveParameter(input, options.widthParam ?? "slotWidth", face.bounds.width * (options.defaultWidthRatio ?? 0.42)),
        Math.max(1, face.bounds.width - margin * 2),
      );
      const height = Math.min(
        positiveParameter(input, options.heightParam ?? "slotHeight", Math.max(4, face.bounds.height * (options.defaultHeightRatio ?? 0.08))),
        Math.max(1, face.bounds.height - margin * 2),
      );
      const primitive = roundedSlotPrimitive({
        id: `${input.id}.slot`,
        label: options.label,
        x: face.bounds.x + face.bounds.width / 2 - width / 2,
        y: face.bounds.y + face.bounds.height / 2 - height / 2,
        width,
        height,
        radius: numberParameter(input, options.radiusParam ?? "radius", height / 2),
        ownerFaceId: face.id,
      });

      assertPrimitiveInsideFace(primitive, face, margin);
      return {
        ...emptyPartResult(),
        geometryPrimitives: [primitive],
        warnings: collectWarnings(input, face, options.warningFactory),
      };
    },
  };
}

export function faceLinePrimitivePart(options: {
  id: string;
  label: string;
  contractId?: string;
  layer: Extract<V2GeometryLayer, "score" | "perforation" | "guide">;
  orientation?: "horizontal" | "vertical" | "diagonal-down" | "diagonal-up";
  warningFactory?: WarningFactory;
}): V2PartImplementation<V2PartParameters> {
  return {
    id: options.id,
    label: options.label,
    contractId: options.contractId ?? options.id,
    build(input, context) {
      const face = requireFace(input, context);
      const inset = Math.max(3, numberParameter(input, "inset", 8));
      const [start, end] = primitiveLinePoints(face, inset, options.orientation ?? "horizontal");

      return {
        ...emptyPartResult(),
        geometryPrimitives: [linePrimitive({
          id: `${input.id}.${options.layer}`,
          label: options.label,
          layer: options.layer,
          start,
          end,
          ownerFaceId: face.id,
        })],
        warnings: collectWarnings(input, face, options.warningFactory),
      };
    },
  };
}

export function faceBandPrimitivePart(options: {
  id: string;
  label: string;
  contractId?: string;
  layer: V2GeometryLayer;
  heightParam?: string;
  defaultHeightRatio?: number;
  warningFactory?: WarningFactory;
}): V2PartImplementation<V2PartParameters> {
  return {
    id: options.id,
    label: options.label,
    contractId: options.contractId ?? options.id,
    build(input, context) {
      const face = requireFace(input, context);
      const height = Math.min(
        positiveParameter(input, options.heightParam ?? "height", Math.max(5, face.bounds.height * (options.defaultHeightRatio ?? 0.12))),
        Math.max(1, face.bounds.height - 8),
      );
      const y = face.bounds.y + face.bounds.height / 2 - height / 2;
      return {
        ...emptyPartResult(),
        geometryPrimitives: [polygonPrimitive({
          id: `${input.id}.${options.layer}`,
          label: options.label,
          layer: options.layer,
          ownerFaceId: face.id,
          points: [
            { x: face.bounds.x + 4, y },
            { x: face.bounds.x + face.bounds.width - 4, y },
            { x: face.bounds.x + face.bounds.width - 4, y: y + height },
            { x: face.bounds.x + 4, y: y + height },
          ],
        })],
        warnings: collectWarnings(input, face, options.warningFactory),
      };
    },
  };
}

function tonguePanelPoints(anchor: V2Anchor, bodyDepth: number, tongueDepth: number, tongueWidth: number): V2Point[] {
  const inset = (anchor.length - tongueWidth) / 2;
  const bodyStart = offset(anchor.start, anchor.normal, bodyDepth);
  const bodyEnd = offset(anchor.end, anchor.normal, bodyDepth);
  return [
    anchor.start,
    bodyStart,
    offset(bodyStart, anchor.tangent, inset),
    offset(offset(bodyStart, anchor.tangent, inset), anchor.normal, tongueDepth),
    offset(offset(bodyEnd, anchor.tangent, -inset), anchor.normal, tongueDepth),
    offset(bodyEnd, anchor.tangent, -inset),
    bodyEnd,
    anchor.end,
  ];
}

function primitiveLinePoints(face: V2Face, inset: number, orientation: "horizontal" | "vertical" | "diagonal-down" | "diagonal-up"): [V2Point, V2Point] {
  if (orientation === "vertical") {
    const x = face.bounds.x + face.bounds.width / 2;
    return [{ x, y: face.bounds.y + inset }, { x, y: face.bounds.y + face.bounds.height - inset }];
  }
  if (orientation === "diagonal-down") {
    return [
      { x: face.bounds.x + inset, y: face.bounds.y + inset },
      { x: face.bounds.x + face.bounds.width - inset, y: face.bounds.y + face.bounds.height - inset },
    ];
  }
  if (orientation === "diagonal-up") {
    return [
      { x: face.bounds.x + inset, y: face.bounds.y + face.bounds.height - inset },
      { x: face.bounds.x + face.bounds.width - inset, y: face.bounds.y + inset },
    ];
  }
  const y = face.bounds.y + face.bounds.height / 2;
  return [{ x: face.bounds.x + inset, y }, { x: face.bounds.x + face.bounds.width - inset, y }];
}
