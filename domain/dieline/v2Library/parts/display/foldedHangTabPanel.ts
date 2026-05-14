import { createAnchor, createFaceEdgeAnchor, createFaceEdgeAnchors } from "../../anchors/createAnchors";
import type { V2GeometryPrimitive, V2PartImplementation, V2Point } from "../../contracts/types";
import { sampleArc } from "../../primitives/arcs";
import { roundedSlotPrimitive } from "../../primitives/slots";
import { assertBaseEdgeMatchesAnchor, assertPrimitiveInsideFace } from "../../primitives/validation";
import { emptyPartResult, numberParameter, positiveParameter, structuralCrease } from "../buildingBlocks";
import { createFace } from "../../primitives/polygon";

type FoldedHangTabPanelParameters = {
  lowerHeight?: number;
  upperHeight?: number;
  capHeight?: number;
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
    const capHeight = positiveParameter(input, "capHeight", Math.max(14, anchor.length * 0.153));
    const cornerRadius = clamp(numberParameter(input, "cornerRadius", Math.min(10, lowerHeight * 0.2)), 0, Math.min(anchor.length * 0.12, lowerHeight * 0.35));
    const shoulderInset = clamp(numberParameter(input, "shoulderInset", Math.min(10, anchor.length * 0.09)), 0, anchor.length * 0.18);
    const euroSlotWidth = positiveParameter(input, "euroSlotWidth", anchor.length * 0.41);
    const euroSlotHeight = positiveParameter(input, "euroSlotHeight", Math.max(12, lowerHeight * 0.295));
    const euroSlotOffsetFromBase = positiveParameter(input, "euroSlotOffsetFromBase", lowerHeight * 0.435);
    const upperSlotWidth = positiveParameter(input, "upperSlotWidth", euroSlotWidth);
    const upperSlotHeight = positiveParameter(input, "upperSlotHeight", Math.max(7, capHeight * 0.8));
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
      points: lowerHangPanelPoints(anchor.start, anchor.end, lowerHeight, cornerRadius, shoulderInset),
    });
    assertBaseEdgeMatchesAnchor(lower, anchor, input.id);

    const lowerTopY = anchor.start.y - lowerHeight;
    const upperAnchor = createAnchor({
      id: `${input.id}.lower.fold`,
      ownerPartId: input.id,
      faceId: lower.id,
      edge: "top",
      start: { x: anchor.start.x + shoulderInset, y: lowerTopY },
      end: { x: anchor.end.x - shoulderInset, y: lowerTopY },
      normal: { x: 0, y: -1 },
    });
    const upper = createFace({
      id: `${input.id}.upper`,
      label: "Fold-Over Hang Panel",
      role: "display",
      sourcePartId: input.id,
      printable: true,
      points: upperFoldOverPanelPoints(anchor.start, anchor.end, upperAnchor.start, upperAnchor.end, upperHeight, cornerRadius),
    });
    assertBaseEdgeMatchesAnchor(upper, upperAnchor, `${input.id}.upper`);

    const capAnchor = createFaceEdgeAnchor(input.id, upper, "top", `${input.id}.upper.top`);
    const cap = createFace({
      id: `${input.id}.cap`,
      label: "Top Insert Cap",
      role: "display",
      sourcePartId: input.id,
      printable: true,
      points: [
        capAnchor.start,
        { x: capAnchor.start.x, y: capAnchor.start.y - capHeight },
        { x: capAnchor.end.x, y: capAnchor.end.y - capHeight },
        capAnchor.end,
      ],
    });
    assertBaseEdgeMatchesAnchor(cap, capAnchor, `${input.id}.cap`);

    const lowerSlotBottomY = anchor.start.y - euroSlotOffsetFromBase;
    const lowerSlot = euroKeyholePrimitive({
      id: `${input.id}.lower-euro-slot`,
      label: "Lower hang euro/keyhole slot",
      centerX: lower.bounds.x + lower.bounds.width / 2,
      bottomY: lowerSlotBottomY,
      width: euroSlotWidth,
      height: euroSlotHeight,
      crownRadius: Math.min(euroSlotHeight * 0.5, euroSlotWidth * 0.18),
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
    result.faces.push(lower, upper, cap);
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
        id: `${input.id}.panel-fold`,
        label: "Hang tab fold-over panel hinge",
        anchor: upperAnchor,
        childFaceId: upper.id,
        foldAngleDegrees: 180,
        foldDirection: "inward",
      }),
      structuralCrease({
        id: `${input.id}.cap-fold`,
        label: "Top insert cap hinge",
        anchor: capAnchor,
        childFaceId: cap.id,
        foldAngleDegrees: 90,
        foldDirection: "inward",
      }),
    );
    result.geometryPrimitives.push(lowerSlot, upperSlot);
    result.anchors.push(...createFaceEdgeAnchors(input.id, lower), upperAnchor, ...createFaceEdgeAnchors(input.id, upper), ...createFaceEdgeAnchors(input.id, cap));

    return { ...result, warnings };
  },
};

function lowerHangPanelPoints(start: V2Point, end: V2Point, height: number, radius: number, shoulderInset: number): V2Point[] {
  const topY = start.y - height;
  const shoulderY = topY + Math.min(radius, height * 0.28);
  if (radius <= 0.000001) {
    return [start, { x: start.x + shoulderInset, y: topY }, { x: end.x - shoulderInset, y: topY }, end];
  }

  return [
    start,
    { x: start.x, y: shoulderY },
    { x: start.x + shoulderInset, y: topY },
    { x: end.x - shoulderInset, y: topY },
    { x: end.x, y: shoulderY },
    end,
  ];
}

function upperFoldOverPanelPoints(start: V2Point, end: V2Point, baseStart: V2Point, baseEnd: V2Point, height: number, radius: number): V2Point[] {
  const topY = baseStart.y - height;
  const shoulderY = baseStart.y - Math.min(radius, height * 0.28);
  return [
    baseStart,
    { x: start.x, y: shoulderY },
    { x: start.x, y: topY },
    { x: end.x, y: topY },
    { x: end.x, y: shoulderY },
    baseEnd,
  ];
}

function euroKeyholePrimitive(input: {
  id: string;
  label: string;
  centerX: number;
  bottomY: number;
  width: number;
  height: number;
  crownRadius: number;
  ownerFaceId?: string;
}): V2GeometryPrimitive {
  const radius = Math.min(input.height / 2, input.width / 2);
  const left = input.centerX - input.width / 2;
  const right = input.centerX + input.width / 2;
  const top = input.bottomY - input.height;
  const centerY = top + input.height / 2;
  const crownRadius = Math.min(input.crownRadius, input.width * 0.25);

  return {
    id: input.id,
    label: input.label,
    type: "polygon",
    layer: "hole",
    ownerFaceId: input.ownerFaceId,
    points: [
      { x: left + radius, y: top },
      { x: input.centerX - crownRadius, y: top },
      ...sampleArc({ x: input.centerX, y: top }, crownRadius, Math.PI, Math.PI * 2, 8).slice(1),
      { x: right - radius, y: top },
      ...sampleArc({ x: right - radius, y: centerY }, radius, -Math.PI / 2, Math.PI / 2, 8).slice(1),
      { x: left + radius, y: input.bottomY },
      ...sampleArc({ x: left + radius, y: centerY }, radius, Math.PI * 0.5, Math.PI * 1.5, 8).slice(1),
    ],
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
