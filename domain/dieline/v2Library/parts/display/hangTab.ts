import { createFaceEdgeAnchor, createFaceEdgeAnchors } from "../../anchors/createAnchors";
import type { V2PartImplementation } from "../../contracts/types";
import { euroSlotPrimitive } from "../../primitives/slots";
import { assertPrimitiveInsideFace } from "../../primitives/validation";
import {
  anchoredRectangleFace,
  emptyPartResult,
  numberParameter,
  positiveParameter,
  structuralCrease,
} from "../buildingBlocks";

type HangTabParameters = {
  TW?: number;
  SAL?: number;
  SL?: number;
  SW?: number;
  FR?: number;
};

export const hangTab: V2PartImplementation<HangTabParameters> = {
  id: "hangTab",
  label: "Folded hang tab",
  contractId: "hangTab",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    if (anchor.edge !== "top") {
      throw new Error(`${input.id}: hang tab must attach to a top anchor.`);
    }

    const requestedWidth = positiveParameter(input, "TW", anchor.length);
    const tabDepth = positiveParameter(input, "SAL", Math.max(24, anchor.length * 0.28));
    const warnings: string[] = [];
    if (Math.abs(requestedWidth - anchor.length) > 0.001) {
      warnings.push(`${input.id}: attachTo anchor length should already equal TW; using anchor length as the tab base.`);
    }

    const inner = anchoredRectangleFace({
      id: `${input.id}.inner`,
      label: "Hang Tab Inner Half",
      sourcePartId: input.id,
      anchor,
      depth: tabDepth,
      role: "display",
      printable: true,
    });
    const innerTop = createFaceEdgeAnchor(input.id, inner, "top", `${input.id}.inner.top`);
    const outer = anchoredRectangleFace({
      id: `${input.id}.outer`,
      label: "Hang Tab Outer Half",
      sourcePartId: input.id,
      anchor: innerTop,
      depth: tabDepth,
      role: "display",
      printable: true,
    });
    const slotWidth = positiveParameter(input, "SL", anchor.length * 0.48);
    const slotHeight = positiveParameter(input, "SW", Math.max(4, tabDepth * 0.14));
    const slot = euroSlotPrimitive({
      id: `${input.id}.euro-slot`,
      label: "Hang tab euro slot",
      x: outer.bounds.x + outer.bounds.width / 2 - slotWidth / 2,
      y: outer.bounds.y + numberParameter(input, "slotCenterY", outer.bounds.height * 0.45) - slotHeight / 2,
      width: slotWidth,
      height: slotHeight,
      radius: numberParameter(input, "FR", slotHeight / 2),
      crownRadius: slotHeight * 0.82,
      ownerFaceId: outer.id,
    });
    const result = emptyPartResult();

    assertPrimitiveInsideFace(slot, outer, 4);
    if (slotWidth + 16 > anchor.length) {
      warnings.push(`${input.id}: TW should be at least SL plus 8mm margin on each side.`);
    }

    result.faces.push(inner, outer);
    result.structuralCreases.push(
      structuralCrease({
        id: `${input.id}.attach-hinge`,
        label: "Hang tab attachment hinge",
        anchor,
        childFaceId: inner.id,
        foldAngle: 90,
        foldDirection: "outward",
      }),
      structuralCrease({
        id: `${input.id}.mid-fold`,
        label: "Hang tab midpoint fold hinge",
        anchor: innerTop,
        childFaceId: outer.id,
        foldAngle: 180,
        foldDirection: "inward",
      }),
    );
    result.geometryPrimitives.push(slot);
    result.anchors.push(...createFaceEdgeAnchors(input.id, inner), ...createFaceEdgeAnchors(input.id, outer));

    return { ...result, warnings };
  },
};
