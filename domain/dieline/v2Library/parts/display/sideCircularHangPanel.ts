import type { V2Anchor, V2PartImplementation, V2Point } from "../../contracts/types";
import { offset } from "../../primitives/points";
import { createFace } from "../../primitives/polygon";
import { assertBaseEdgeMatchesAnchor } from "../../primitives/validation";
import {
  anchorsForFace,
  emptyPartResult,
  numberParameter,
  positiveParameter,
  structuralCrease,
} from "../buildingBlocks";

type SideCircularHangPanelParameters = {
  extensionWidth?: number;
  neckWidth?: number;
  outerRadius?: number;
  centerY?: number;
};

const ARC_START_ANGLE = -2.08;
const ARC_END_ANGLE = 2.08;

export const sideCircularHangPanel: V2PartImplementation<SideCircularHangPanelParameters> = {
  id: "sideCircularHangPanel",
  label: "Side circular hang panel",
  contractId: "sideCircularHangPanel",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    if (anchor.edge !== "right") {
      throw new Error(`${input.id}: side circular hang panel currently attaches to a right edge anchor.`);
    }

    const extensionWidth = positiveParameter(input, "extensionWidth", Math.max(32, anchor.length * 0.7));
    const outerRadius = clamp(
      positiveParameter(input, "outerRadius", Math.min(extensionWidth * 0.36, anchor.length * 0.28)),
      4,
      Math.min(extensionWidth * 0.48, anchor.length * 0.48),
    );
    const neckWidth = clamp(
      numberParameter(input, "neckWidth", extensionWidth * 0.36),
      4,
      Math.max(4, extensionWidth - outerRadius * 0.75),
    );
    const centerY = clamp(
      numberParameter(input, "centerY", anchor.length / 2),
      outerRadius + 1,
      anchor.length - outerRadius - 1,
    );
    const centerX = extensionWidth - outerRadius;
    const face = createFace({
      id: `${input.id}.face`,
      label: "Side Circular Hang Panel",
      role: "display",
      sourcePartId: input.id,
      printable: true,
      points: sideHangPoints(anchor, neckWidth, outerRadius, centerX, centerY),
    });
    assertBaseEdgeMatchesAnchor(face, anchor, input.id);

    const result = emptyPartResult();
    result.faces.push(face);
    result.structuralCreases.push(structuralCrease({
      id: `${input.id}.hinge`,
      label: "Side circular hang panel hinge",
      anchor,
      childFaceId: face.id,
      foldAngleDegrees: 180,
      foldDirection: "inward",
    }));
    result.anchors.push(...anchorsForFace(input.id, face));
    result.warnings.push(`${input.id}: side hang strength, board grain, and tear resistance require prototype validation.`);

    return result;
  },
};

function sideHangPoints(anchor: V2Anchor, neckWidth: number, outerRadius: number, centerX: number, centerY: number): V2Point[] {
  return [
    anchor.start,
    localPoint(anchor, neckWidth, 0),
    ...arcPoints(anchor, centerX, centerY, outerRadius, ARC_START_ANGLE, ARC_END_ANGLE, 12),
    localPoint(anchor, neckWidth, anchor.length),
    anchor.end,
  ];
}

function arcPoints(anchor: V2Anchor, centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number, segments: number): V2Point[] {
  const points: V2Point[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const angle = startAngle + (endAngle - startAngle) * t;
    points.push(localPoint(anchor, centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius));
  }
  return points;
}

function localPoint(anchor: V2Anchor, normalDistance: number, tangentDistance: number): V2Point {
  return offset(offset(anchor.start, anchor.normal, normalDistance), anchor.tangent, tangentDistance);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
