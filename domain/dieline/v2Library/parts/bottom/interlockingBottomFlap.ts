import type { V2Anchor, V2PartImplementation, V2Point } from "../../contracts/types";
import { offset } from "../../primitives/points";
import { createFace } from "../../primitives/polygon";
import { assertBaseEdgeMatchesAnchor } from "../../primitives/validation";
import {
  anchorsForFace,
  emptyPartResult,
  linePrimitive,
  numberParameter,
  positiveParameter,
  structuralCrease,
} from "../buildingBlocks";

type InterlockingBottomFlapParameters = {
  role?: "major-insert" | "major-lock" | "minor-dust-left" | "minor-dust-right";
  handedness?: "left" | "right";
  bottomFlapDepth?: number;
  insertLength?: number;
  notchWidth?: number;
  notchDepth?: number;
  diagonalInset?: number;
  notchCenter?: number;
};

export const interlockingBottomFlap: V2PartImplementation<InterlockingBottomFlapParameters> = {
  id: "interlockingBottomFlap",
  label: "Interlocking bottom flap",
  contractId: "interlockingBottomFlap",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    if (anchor.edge !== "bottom") {
      throw new Error(`${input.id}: interlocking bottom flap must attach to a bottom anchor.`);
    }

    const role = typeof input.parameters.role === "string" ? input.parameters.role : "major-insert";
    const handedness = input.parameters.handedness === "right" ? "right" : "left";
    const bottomFlapDepth = positiveParameter(input, "bottomFlapDepth", anchor.length * 0.45);
    const insertLength = positiveParameter(input, "insertLength", bottomFlapDepth * 1.12);
    const notchWidth = clamp(positiveParameter(input, "notchWidth", anchor.length * 0.18), 4, anchor.length * 0.45);
    const notchDepth = clamp(positiveParameter(input, "notchDepth", bottomFlapDepth * 0.16), 2, bottomFlapDepth * 0.45);
    const diagonalInset = clamp(numberParameter(input, "diagonalInset", bottomFlapDepth * 0.55), 0, anchor.length * 0.42);
    const notchCenter = clamp(numberParameter(input, "notchCenter", anchor.length / 2), notchWidth / 2 + 1, anchor.length - notchWidth / 2 - 1);
    const warnings = [
      `${input.id}: interlocking bottom geometry is an exploratory coordinated approximation; lock fit is not CAD/prototype verified.`,
    ];

    const face = createFace({
      id: `${input.id}.face`,
      label: labelForRole(role),
      role: role.startsWith("minor") ? "dust" : "bottom",
      sourcePartId: input.id,
      printable: false,
      points: role.startsWith("minor")
        ? minorDustPoints(anchor, bottomFlapDepth, diagonalInset)
        : majorLockPoints(anchor, insertLength, notchWidth, notchDepth, diagonalInset, notchCenter, handedness),
    });
    assertBaseEdgeMatchesAnchor(face, anchor, input.id);

    const result = emptyPartResult();
    result.faces.push(face);
    result.structuralCreases.push(structuralCrease({
      id: `${input.id}.hinge`,
      label: `${labelForRole(role)} hinge`,
      anchor,
      childFaceId: face.id,
      foldAngleDegrees: 90,
      foldDirection: "inward",
    }));

    if (!role.startsWith("minor")) {
      const diagonalScore = majorDiagonalScoreLine(anchor, bottomFlapDepth, insertLength, notchWidth, notchCenter, diagonalInset, handedness);
      result.geometryPrimitives.push(linePrimitive({
        id: `${input.id}.diagonal-score-guide`,
        label: "Geometry-only bottom lock diagonal score",
        layer: "score",
        start: diagonalScore.start,
        end: diagonalScore.end,
        ownerFaceId: face.id,
      }));

      const notchCenterPoint = offset(offset(anchor.start, anchor.tangent, notchCenter), anchor.normal, insertLength - notchDepth);
      result.geometryPrimitives.push(linePrimitive({
        id: `${input.id}.notch-center-guide`,
        label: "Geometry-only notch alignment guide",
        layer: "guide",
        start: offset(notchCenterPoint, anchor.normal, -notchDepth * 0.45),
        end: offset(notchCenterPoint, anchor.normal, notchDepth * 0.45),
        ownerFaceId: face.id,
      }));
    }

    result.anchors.push(...anchorsForFace(input.id, face));

    return { ...result, warnings };
  },
};

function majorLockPoints(
  anchor: V2Anchor,
  depth: number,
  notchWidth: number,
  notchDepth: number,
  diagonalInset: number,
  notchCenter: number,
  handedness: "left" | "right",
): V2Point[] {
  const notchStart = notchCenter - notchWidth / 2;
  const notchEnd = notchCenter + notchWidth / 2;
  const sideReliefInset = clamp(Math.max(diagonalInset, anchor.length * 0.045), 1.5, anchor.length * 0.12);
  const sideReliefDepth = clamp(depth * 0.16, 5, 10);
  const leftRunEnd = clamp(notchStart - notchWidth * 0.75, sideReliefInset + 4, notchStart - 1);
  const notchReturn = clamp(notchEnd + notchWidth * 0.78, notchEnd + 1, anchor.length - sideReliefInset - 3);
  const notchStepDepth = clamp(notchDepth * 0.58, 3, notchDepth);
  const rightReliefInset = sideReliefInset;
  const localPoints = [
    { x: 0, y: 0 },
    { x: sideReliefInset * 1.28, y: sideReliefDepth * 0.72 },
    { x: sideReliefInset * 0.25, y: sideReliefDepth },
    { x: sideReliefInset * 0.25, y: depth },
    { x: leftRunEnd, y: depth },
    { x: notchStart, y: depth - notchDepth },
    { x: notchEnd, y: depth - notchDepth },
    { x: notchEnd, y: depth - notchDepth + notchStepDepth },
    { x: notchReturn, y: depth },
    { x: anchor.length - rightReliefInset, y: depth },
    { x: anchor.length, y: 0 },
  ];

  return (handedness === "left" ? localPoints.map((point) => ({ x: anchor.length - point.x, y: point.y })) : localPoints)
    .map((point) => offset(offset(anchor.start, anchor.tangent, point.x), anchor.normal, point.y));
}

function majorDiagonalScoreLine(
  anchor: V2Anchor,
  dustFlapDepth: number,
  insertLength: number,
  notchWidth: number,
  notchCenter: number,
  diagonalInset: number,
  handedness: "left" | "right",
): { start: V2Point; end: V2Point } {
  const startDepth = Math.min(dustFlapDepth * 0.135, insertLength * 0.12);
  const scoreDepth = Math.min(dustFlapDepth, insertLength);
  const startInset = clamp(Math.max(diagonalInset, anchor.length * 0.045), 1, anchor.length * 0.18);
  const endInset = clamp(notchCenter - notchWidth * 0.72, startInset + 1, anchor.length - 1);
  const interiorStartLocal = startInset * 0.45 + 0.75;
  const interiorStartDepth = Math.max(startDepth, Math.min(dustFlapDepth * 0.22, insertLength * 0.18));
  const startLocal = handedness === "left" ? anchor.length - interiorStartLocal : interiorStartLocal;
  const endLocal = handedness === "left" ? anchor.length - endInset : endInset;

  return {
    start: offset(offset(anchor.start, anchor.tangent, startLocal), anchor.normal, interiorStartDepth),
    end: offset(offset(anchor.start, anchor.tangent, endLocal), anchor.normal, scoreDepth),
  };
}

function minorDustPoints(anchor: V2Anchor, depth: number, diagonalInset: number): V2Point[] {
  const endReliefInset = Math.min(anchor.length * 0.055, Math.max(2, depth * 0.12));

  return [
    anchor.start,
    offset(offset(anchor.start, anchor.tangent, diagonalInset), anchor.normal, depth),
    offset(offset(anchor.end, anchor.tangent, -endReliefInset), anchor.normal, depth),
    anchor.end,
  ];
}

function labelForRole(role: string): string {
  if (role === "major-lock") return "Major Bottom Lock Flap";
  if (role === "minor-dust-left") return "Left Minor Bottom Dust Flap";
  if (role === "minor-dust-right") return "Right Minor Bottom Dust Flap";
  return "Major Bottom Insert Flap";
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
