import { bodyStripPart } from "../parts/body/bodyStrip";
import { dustFlapPart } from "../parts/closures/dustFlap";
import { customDustFlapPart } from "../parts/closures/customDustFlap";
import { lockTabPart } from "../parts/closures/lockTab";
import { panelFlapPart } from "../parts/closures/panelFlap";
import { slottedTuckFlapPart } from "../parts/closures/slottedTuckFlap";
import { tuckFlapPart } from "../parts/closures/tuckFlap";
import { circularHoleCutoutPart } from "../parts/cutouts/circularHoleCutout";
import { euroSlotCutoutPart } from "../parts/cutouts/euroSlotCutout";
import { reliefNotchPart } from "../parts/cutouts/reliefNotch";
import { roundedSlotCutoutPart } from "../parts/cutouts/roundedSlotCutout";
import { slotCutoutPart } from "../parts/cutouts/slotCutout";
import { windowCutoutPart } from "../parts/cutouts/windowCutout";
import { hangTabPart } from "../parts/features/hangTab";
import { sideGlueTabPart } from "../parts/glue/sideGlueTab";
import { partialEdgeAnchorPart } from "../parts/guides/partialEdgeAnchor";
import { scoreLinePart } from "../parts/guides/scoreLine";
import type { DielinePartGenerator } from "./types";

const PARTS = [
  bodyStripPart,
  sideGlueTabPart,
  tuckFlapPart,
  slottedTuckFlapPart,
  lockTabPart,
  dustFlapPart,
  customDustFlapPart,
  panelFlapPart,
  slotCutoutPart,
  roundedSlotCutoutPart,
  circularHoleCutoutPart,
  euroSlotCutoutPart,
  windowCutoutPart,
  reliefNotchPart,
  hangTabPart,
  partialEdgeAnchorPart,
  scoreLinePart,
];

export const partRegistry = new Map<string, DielinePartGenerator>(
  PARTS.map((part) => [part.type, part]),
);

export function getPartGenerator(type: string): DielinePartGenerator {
  const generator = partRegistry.get(type);
  if (!generator) {
    throw new Error(`Unknown v2 dieline part type: ${type}`);
  }
  return generator;
}
