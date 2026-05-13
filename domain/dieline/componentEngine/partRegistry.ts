import { bodyStripPart } from "../parts/body/bodyStrip";
import { dustFlapPart } from "../parts/closures/dustFlap";
import { panelFlapPart } from "../parts/closures/panelFlap";
import { tuckFlapPart } from "../parts/closures/tuckFlap";
import { sideGlueTabPart } from "../parts/glue/sideGlueTab";
import { scoreLinePart } from "../parts/guides/scoreLine";
import type { DielinePartGenerator } from "./types";

const PARTS = [
  bodyStripPart,
  sideGlueTabPart,
  tuckFlapPart,
  dustFlapPart,
  panelFlapPart,
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
