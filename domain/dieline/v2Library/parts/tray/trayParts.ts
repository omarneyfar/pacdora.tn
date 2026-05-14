import { createFaceEdgeAnchors } from "../../anchors/createAnchors";
import type { V2PartImplementation } from "../../contracts/types";
import { rectangleFace } from "../../primitives/polygon";
import { emptyPartResult, positiveParameter } from "../buildingBlocks";
import {
  attachedRectanglePart,
  attachedTrapezoidPart,
} from "../parametricParts";

const trayWarning = () => ["Tray geometry is partial-experimental; wall height, corner tab sequence, and lid clearance must be prototype checked."];

export const trayBody: V2PartImplementation = {
  id: "trayBody",
  label: "Tray body base",
  contractId: "trayBody",
  build(input) {
    const length = positiveParameter(input, "L", 120);
    const width = positiveParameter(input, "W", Math.max(40, length * 0.45));
    const face = rectangleFace({
      id: `${input.id}.base`,
      label: "Tray Base",
      role: "tray",
      x: 0,
      y: 0,
      width: length,
      height: width,
      sourcePartId: input.id,
    });
    const result = emptyPartResult();
    result.faces.push(face);
    result.anchors.push(...createFaceEdgeAnchors(input.id, face));
    return { ...result, warnings: trayWarning() };
  },
};

export const traySideWall = attachedRectanglePart({
  id: "traySideWall",
  label: "Tray side wall",
  role: "tray",
  edge: "any",
  depthParam: "wallHeight",
  defaultDepthRatio: 0.28,
  warningFactory: trayWarning,
});

export const trayCornerTab = attachedTrapezoidPart({
  id: "trayCornerTab",
  label: "Tray corner tab",
  role: "glue",
  edge: "any",
  depthParam: "tabDepth",
  defaultDepthRatio: 0.18,
  taperParam: "tabTaper",
  printable: false,
  warningFactory: trayWarning,
});
