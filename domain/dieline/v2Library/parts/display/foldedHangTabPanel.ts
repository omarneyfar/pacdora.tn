import { createFaceEdgeAnchor, createFaceEdgeAnchors } from "../../anchors/createAnchors";
import type { V2PartImplementation, V2Point } from "../../contracts/types";
import { euroSlotPrimitive, roundedSlotPrimitive } from "../../primitives/slots";
import { assertBaseEdgeMatchesAnchor, assertPrimitiveInsideFace } from "../../primitives/validation";
import { emptyPartResult, numberParameter, positiveParameter, structuralCrease } from "../buildingBlocks";
import { createFace } from "../../primitives/polygon";

type FoldedHangTabPanelParameters = {
  lowerHeight?: number;
  upperHeight?: number;
  cornerRadius?: number;
  euroSlotWidth?: number;
  euroSlotHeight?: number;
  euroSlotOffsetFromBase?: number;
  upperSlotWidth?: number;
  upperSlotHeight?: number;
  upperSlotOffsetFromFold?: number;
};

export const foldedHangTabPanel: V2PartImplementation<FoldedHangTabPanelParameters> = {
  id: "foldedHangTabPanel",
  label: "Folded hang tab panel",
  contractId: "foldedHangTabPanel",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    if (anchor.edge !== "top") {
      throw new Error(`${input.id}: folded hang tab must attach to a top anchor.`);
    }

    const lowerHeight = positiveParameter(input, "lowerHeight", anchor.length * 0.48);
    const upperHeight = positiveParameter(input, "upperHeight", lowerHeight);
    const cornerRadius = clamp(numberParameter(input, "cornerRadius", Math.min(8, lowerHeight * 0.18)), 0, Math.min(anchor.length * 0.12, lowerHeight * 0.35));
    const euroSlotWidth = positiveParameter(input, "euroSlotWidth", anchor.length * 0.41);
    const euroSlotHeight = positiveParameter(input, "euroSlotHeight", Math.max(7, lowerHeight * 0.26));
    const euroSlotOffsetFromBase = positiveParameter(input, "euroSlotOffsetFromBase", lowerHeight * 0.44);
    const upperSlotWidth = positiveParameter(input, "upperSlotWidth", euroSlotWidth);
    const upperSlotHeight = positiveParameter(input, "upperSlotHeight", Math.max(6, upperHeight * 0.8));
    const upperSlotOffsetFromFold = positiveParameter(input, "upperSlotOffsetFromFold", lowerHeight - euroSlotOffsetFromBase);
    const warnings = [
      `${input.id}: folded hang tab is an exploratory V2 reference match; display load and slot reinforcement are not production verified.`,
    ];
    if (Math.abs(lowerHeight - upperHeight) > 0.001) {
      warnings.push(`${input.id}: lower and upper hang-tab panels should normally be equal height so slots overlay after folding.`);
    }

    const lower = createFace({
      id: `${input.id}.lower`,
      label: "Lower Hang Panel",
      role: "display",
      sourcePartId: input.id,
      printable: true,
      points: lowerHangPanelPoints(anchor.start, anchor.end, lowerHeight, cornerRadius),
    });
    assertBaseEdgeMatchesAnchor(lower, anchor, input.id);

    const upperAnchor = createFaceEdgeAnchor(input.id, lower, "top", `${input.id}.lower.top`);
    const upper = createFace({
      id: `${input.id}.upper`,
      label: "Fold-Over Hang Cap",
      role: "display",
      sourcePartId: input.id,
      printable: true,
      points: [
        upperAnchor.start,
        { x: upperAnchor.start.x, y: upperAnchor.start.y - upperHeight },
        { x: upperAnchor.end.x, y: upperAnchor.end.y - upperHeight },
        upperAnchor.end,
      ],
    });
    assertBaseEdgeMatchesAnchor(upper, upperAnchor, `${input.id}.upper`);

    const lowerSlotCenterY = anchor.start.y - euroSlotOffsetFromBase;
    const lowerSlot = euroSlotPrimitive({
      id: `${input.id}.lower-euro-slot`,
      label: "Lower hang euro/keyhole slot",
      x: lower.bounds.x + lower.bounds.width / 2 - euroSlotWidth / 2,
      y: lowerSlotCenterY - euroSlotHeight / 2,
      width: euroSlotWidth,
      height: euroSlotHeight,
      radius: euroSlotHeight / 2,
      crownRadius: euroSlotHeight * 0.75,
      ownerFaceId: lower.id,
    });
    const upperSlotCenterY = upperAnchor.start.y - upperSlotOffsetFromFold;
    const upperSlot = roundedSlotPrimitive({
      id: `${input.id}.upper-rounded-slot`,
      label: "Upper cap rounded slot",
      x: upper.bounds.x + upper.bounds.width / 2 - upperSlotWidth / 2,
      y: upperSlotCenterY - upperSlotHeight / 2,
      width: upperSlotWidth,
      height: upperSlotHeight,
      radius: upperSlotHeight / 2,
      ownerFaceId: upper.id,
    });

    assertPrimitiveInsideFace(lowerSlot, lower, 4);
    assertPrimitiveInsideFace(upperSlot, upper, 1);

    const result = emptyPartResult();
    result.faces.push(lower, upper);
    result.structuralCreases.push(
      structuralCrease({
        id: `${input.id}.attach-hinge`,
        label: "Lower hang panel hinge",
        anchor,
        childFaceId: lower.id,
        foldAngleDegrees: 90,
        foldDirection: "outward",
      }),
      structuralCrease({
        id: `${input.id}.cap-fold`,
        label: "Upper fold-over cap hinge",
        anchor: upperAnchor,
        childFaceId: upper.id,
        foldAngleDegrees: 180,
        foldDirection: "inward",
      }),
    );
    result.geometryPrimitives.push(lowerSlot, upperSlot);
    result.anchors.push(...createFaceEdgeAnchors(input.id, lower), ...createFaceEdgeAnchors(input.id, upper));

    return { ...result, warnings };
  },
};

function lowerHangPanelPoints(start: V2Point, end: V2Point, height: number, radius: number): V2Point[] {
  const topY = start.y - height;
  if (radius <= 0.000001) {
    return [start, { x: start.x, y: topY }, { x: end.x, y: topY }, end];
  }

  return [
    start,
    { x: start.x, y: start.y - radius },
    { x: start.x, y: topY },
    { x: end.x, y: topY },
    { x: end.x, y: start.y - radius },
    end,
  ];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
