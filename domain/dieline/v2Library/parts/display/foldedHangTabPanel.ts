import { createAnchor, createFaceEdgeAnchor, createFaceEdgeAnchors } from "../../anchors/createAnchors";
import type { V2GeometryPrimitive, V2PartImplementation, V2Point } from "../../contracts/types";
import { sampleArc } from "../../primitives/arcs";
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

    const lowerSlotCenterY = anchor.start.y - euroSlotOffsetFromBase - euroSlotHeight / 2;
    const slotReliefRadius = upperSlotHeight * 0.34;
    const lowerSlot = slotWithHalfCirclePrimitive({
      id: `${input.id}.lower-euro-slot`,
      label: "Lower hang rounded slot with half-circle relief",
      x: lower.bounds.x + lower.bounds.width / 2 - upperSlotWidth / 2,
      y: lowerSlotCenterY - upperSlotHeight / 2,
      width: upperSlotWidth,
      height: upperSlotHeight,
      reliefRadius: slotReliefRadius,
      reliefDirection: "up",
      ownerFaceId: lower.id,
    });
    const upperSlotCenterY = upperAnchor.start.y - upperSlotOffsetFromFold;
    const upperSlot = slotWithHalfCirclePrimitive({
      id: `${input.id}.upper-rounded-slot`,
      label: "Upper cap rounded slot with half-circle relief",
      x: upper.bounds.x + upper.bounds.width / 2 - upperSlotWidth / 2,
      y: upperSlotCenterY - upperSlotHeight / 2,
      width: upperSlotWidth,
      height: upperSlotHeight,
      reliefRadius: slotReliefRadius,
      reliefDirection: "down",
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
  const arcRadius = Math.min(radius, shoulderInset, height * 0.28);
  if (arcRadius <= 0.000001) {
    return [start, { x: start.x + shoulderInset, y: topY }, { x: end.x - shoulderInset, y: topY }, end];
  }

  const leftCenter = { x: start.x + arcRadius, y: topY + arcRadius };
  const rightCenter = { x: end.x - arcRadius, y: topY + arcRadius };

  return [
    start,
    ...sampleArc(leftCenter, arcRadius, Math.PI, Math.PI * 1.5, 8),
    { x: end.x - shoulderInset, y: topY },
    ...sampleArc(rightCenter, arcRadius, Math.PI * 1.5, Math.PI * 2, 8).slice(1),
    end,
  ];
}

function upperFoldOverPanelPoints(start: V2Point, end: V2Point, baseStart: V2Point, baseEnd: V2Point, height: number, radius: number): V2Point[] {
  const topY = baseStart.y - height;
  const arcRadius = Math.min(radius, baseStart.x - start.x, baseEnd.x - baseStart.x, height * 0.28);
  if (arcRadius <= 0.000001) {
    return [
      baseStart,
      { x: start.x, y: baseStart.y - radius },
      { x: start.x, y: topY },
      { x: end.x, y: topY },
      { x: end.x, y: baseEnd.y - radius },
      baseEnd,
    ];
  }

  const leftCenter = { x: baseStart.x, y: baseStart.y - arcRadius };
  const rightCenter = { x: baseEnd.x, y: baseEnd.y - arcRadius };
  return [
    baseStart,
    ...sampleArc(leftCenter, arcRadius, Math.PI / 2, Math.PI, 8).slice(1),
    { x: start.x, y: topY },
    { x: end.x, y: topY },
    ...sampleArc(rightCenter, arcRadius, 0, Math.PI / 2, 8).slice(1),
  ];
}

function slotWithHalfCirclePrimitive(input: {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  reliefRadius: number;
  reliefDirection: "up" | "down";
  ownerFaceId?: string;
}): V2GeometryPrimitive {
  const radius = input.height / 2;
  const reliefRadius = Math.min(input.reliefRadius, input.width * 0.18, input.height * 0.48);
  const centerX = input.x + input.width / 2;
  const centerY = input.y + input.height / 2;
  const leftCenter = { x: input.x + radius, y: centerY };
  const rightCenter = { x: input.x + input.width - radius, y: centerY };
  const reliefLeft = centerX - reliefRadius;
  const reliefRight = centerX + reliefRadius;
  const topY = input.y;
  const bottomY = input.y + input.height;
  const topLeft = { x: input.x + radius, y: topY };
  const topRight = { x: input.x + input.width - radius, y: topY };
  const bottomRight = { x: input.x + input.width - radius, y: bottomY };
  const bottomLeft = { x: input.x + radius, y: bottomY };
  const rightArc = sampleArc(rightCenter, radius, -Math.PI / 2, Math.PI / 2, 10).slice(1);
  const leftArc = sampleArc(leftCenter, radius, Math.PI / 2, Math.PI * 1.5, 10).slice(1);
  const points = input.reliefDirection === "down"
    ? [
        topLeft,
        topRight,
        ...rightArc,
        { x: reliefRight, y: bottomY },
        ...sampleArc({ x: centerX, y: bottomY }, reliefRadius, 0, Math.PI, 12).slice(1),
        { x: reliefLeft, y: bottomY },
        bottomLeft,
        ...leftArc,
      ]
    : [
        topLeft,
        { x: reliefLeft, y: topY },
        ...sampleArc({ x: centerX, y: topY }, reliefRadius, Math.PI, Math.PI * 2, 12).slice(1),
        { x: reliefRight, y: topY },
        topRight,
        ...rightArc,
        bottomRight,
        bottomLeft,
        ...leftArc,
      ];

  return {
    id: input.id,
    label: input.label,
    type: "polygon",
    layer: "hole",
    ownerFaceId: input.ownerFaceId,
    points,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
