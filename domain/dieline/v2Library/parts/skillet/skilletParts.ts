import { createFaceEdgeAnchors } from "../../anchors/createAnchors";
import type { V2PartImplementation } from "../../contracts/types";
import { rectangleFace } from "../../primitives/polygon";
import { emptyPartResult, positiveParameter } from "../buildingBlocks";
import {
  attachedRectanglePart,
  attachedTonguePart,
  faceSlotPrimitivePart,
} from "../parametricParts";

const skilletWarning = () => ["Skillet/two-piece geometry is partial-experimental; shallow side-wall clearances and lid/base registration need physical validation."];

function standaloneSkilletPanel(id: string, label: string): V2PartImplementation {
  return {
    id,
    label,
    contractId: id,
    build(input) {
      const length = positiveParameter(input, "L", 140);
      const width = positiveParameter(input, "W", Math.max(35, length * 0.32));
      const face = rectangleFace({
        id: `${input.id}.face`,
        label,
        role: "skillet",
        x: 0,
        y: 0,
        width: length,
        height: width,
        sourcePartId: input.id,
      });
      const result = emptyPartResult();
      result.faces.push(face);
      result.anchors.push(...createFaceEdgeAnchors(input.id, face));
      return { ...result, warnings: skilletWarning() };
    },
  };
}

export const skilletBody = standaloneSkilletPanel("skilletBody", "Skillet body");

export const skilletLid = attachedRectanglePart({
  id: "skilletLid",
  label: "Skillet lid",
  role: "skillet",
  edge: "top",
  depthParam: "lidDepth",
  defaultDepthRatio: 0.42,
  warningFactory: skilletWarning,
});

export const separatedSkilletBase = standaloneSkilletPanel("separatedSkilletBase", "Separated skillet base");

export const separatedSkilletLid = standaloneSkilletPanel("separatedSkilletLid", "Separated skillet lid");

export const skilletSideWall = attachedRectanglePart({
  id: "skilletSideWall",
  label: "Skillet side wall",
  role: "skillet",
  edge: "any",
  depthParam: "wallHeight",
  defaultDepthRatio: 0.22,
  warningFactory: skilletWarning,
});

export const skilletCornerLock = attachedTonguePart({
  id: "skilletCornerLock",
  label: "Skillet corner lock",
  role: "locking",
  edge: "any",
  bodyDepthParam: "lockBodyDepth",
  tongueDepthParam: "lockDepth",
  tongueWidthParam: "lockWidth",
  defaultBodyDepthRatio: 0.12,
  warningFactory: skilletWarning,
});

export const skilletInsertPanel = attachedRectanglePart({
  id: "skilletInsertPanel",
  label: "Skillet insert panel",
  role: "skillet",
  edge: "any",
  depthParam: "insertDepth",
  defaultDepthRatio: 0.45,
  warningFactory: skilletWarning,
});

export const skilletSnapSlot = faceSlotPrimitivePart({
  id: "skilletSnapSlot",
  label: "Skillet snap slot",
  widthParam: "SL",
  heightParam: "SW1",
  defaultWidthRatio: 0.32,
  defaultHeightRatio: 0.08,
  margin: 5,
  warningFactory: skilletWarning,
});
