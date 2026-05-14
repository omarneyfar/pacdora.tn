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
  const notchChamfer = Math.min(notchWidth * 0.22, notchDepth * 0.7);
  const freeStart = handedness === "left"
    ? offset(offset(anchor.start, anchor.tangent, diagonalInset), anchor.normal, depth)
    : offset(anchor.start, anchor.normal, depth);
  const freeEnd = handedness === "left"
    ? offset(anchor.end, anchor.normal, depth)
    : offset(offset(anchor.end, anchor.tangent, -diagonalInset), anchor.normal, depth);

  return [
    anchor.start,
    freeStart,
    offset(offset(anchor.start, anchor.tangent, notchStart), anchor.normal, depth),
    offset(offset(anchor.start, anchor.tangent, notchStart + notchChamfer), anchor.normal, depth - notchDepth),
    offset(offset(anchor.start, anchor.tangent, notchEnd - notchChamfer), anchor.normal, depth - notchDepth),
    offset(offset(anchor.start, anchor.tangent, notchEnd), anchor.normal, depth),
    freeEnd,
    anchor.end,
  ];
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
