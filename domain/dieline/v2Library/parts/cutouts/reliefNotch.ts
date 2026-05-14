import type { V2PartImplementation, V2Point } from "../../contracts/types";
import { offset } from "../../primitives/points";
import { emptyPartResult, polygonPrimitive, positiveParameter } from "../buildingBlocks";

type ReliefNotchParameters = {
  width?: number;
  depth?: number;
  position?: "start" | "end" | "both";
};

export const reliefNotch: V2PartImplementation<ReliefNotchParameters> = {
  id: "reliefNotch",
  label: "Relief notch",
  contractId: "reliefNotch",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    const width = positiveParameter(input, "width", Math.max(2, anchor.length * 0.04));
    const depth = positiveParameter(input, "depth", Math.max(1.5, width * 0.8));
    const position = input.parameters.position ?? "both";
    const endpoints = position === "both" ? ["start", "end"] as const : [position];
    const result = emptyPartResult();

    for (const endpoint of endpoints) {
      const base = endpoint === "start" ? anchor.start : anchor.end;
      const tangent = endpoint === "start" ? anchor.tangent : { x: -anchor.tangent.x, y: -anchor.tangent.y };
      result.geometryPrimitives.push(polygonPrimitive({
        id: `${input.id}.${endpoint}`,
        label: `${endpoint} relief notch cut`,
        layer: "cut",
        points: notchPoints(base, tangent, { x: -anchor.normal.x, y: -anchor.normal.y }, width, depth),
        ownerFaceId: anchor.faceId,
      }));
    }

    result.warnings.push(`${input.id}: exact relief notch style is reference-pending in the documentation.`);
    return result;
  },
};

function notchPoints(base: V2Point, tangent: V2Point, normal: V2Point, width: number, depth: number): V2Point[] {
  return [
    base,
    offset(base, tangent, width),
    offset(offset(base, tangent, width), normal, depth),
    offset(base, normal, depth),
  ];
}
