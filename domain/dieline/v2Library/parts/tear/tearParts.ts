import type { V2PartImplementation } from "../../contracts/types";
import {
  emptyPartResult,
  linePrimitive,
  numberParameter,
  positiveParameter,
} from "../buildingBlocks";
import {
  attachedRectanglePart,
  attachedTonguePart,
  faceLinePrimitivePart,
  faceRoundedRectPrimitivePart,
} from "../parametricParts";

const tearWarning = () => ["Tear/perforation tooling is reference-pending; perforation pitch, nick size, and material tear behavior must be die-verified."];

export const tearStrip: V2PartImplementation = {
  id: "tearStrip",
  label: "Tear strip",
  contractId: "tearStrip",
  build(input, context) {
    const faceId = input.attachToFace ?? input.attachTo;
    if (!faceId) throw new Error(`${input.id}: attachToFace is required.`);
    const face = context.getFace(faceId);
    const stripWidth = positiveParameter(input, "stripWidth", 7);
    const y = face.bounds.y + numberParameter(input, "EXD", face.bounds.height * 0.55);
    const x1 = face.bounds.x + 4;
    const x2 = face.bounds.x + face.bounds.width - 4;
    const result = emptyPartResult();

    result.geometryPrimitives.push(
      linePrimitive({
        id: `${input.id}.lower-perforation`,
        label: "Lower tear perforation",
        layer: "perforation",
        start: { x: x1, y },
        end: { x: x2, y },
        ownerFaceId: face.id,
      }),
      linePrimitive({
        id: `${input.id}.upper-perforation`,
        label: "Upper tear perforation",
        layer: "perforation",
        start: { x: x1, y: y - stripWidth },
        end: { x: x2, y: y - stripWidth },
        ownerFaceId: face.id,
      }),
    );

    return { ...result, warnings: tearWarning() };
  },
};

export const perforationStrip = faceLinePrimitivePart({
  id: "perforationStrip",
  label: "Perforation strip line",
  layer: "perforation",
  orientation: "horizontal",
  warningFactory: tearWarning,
});

export const tearPullTab = attachedTonguePart({
  id: "tearPullTab",
  label: "Tear pull tab",
  role: "tear",
  edge: "any",
  bodyDepthParam: "tabBodyDepth",
  tongueDepthParam: "pullDepth",
  tongueWidthParam: "pullWidth",
  defaultBodyDepthRatio: 0.12,
  warningFactory: tearWarning,
});

export const tearNotch = faceRoundedRectPrimitivePart({
  id: "tearNotch",
  label: "Tear notch",
  layer: "hole",
  widthParam: "notchWidth",
  heightParam: "notchDepth",
  defaultWidthRatio: 0.08,
  defaultHeightRatio: 0.08,
  margin: 3,
  warningFactory: tearWarning,
});

export const sealFlap = attachedRectanglePart({
  id: "sealFlap",
  label: "Seal flap",
  role: "closure",
  edge: "top",
  depthParam: "sealDepth",
  defaultDepthRatio: 0.28,
  warningFactory: tearWarning,
});
