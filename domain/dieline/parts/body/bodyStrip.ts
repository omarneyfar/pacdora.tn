import { createDielineFace } from "../../geometry";
import type { DielineCrease, DielineFace, Point } from "../../types";
import { createFaceEdgeAnchors } from "../../componentEngine/anchorResolver";
import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";

type BodyPanelConfig = {
  id: string;
  label?: string;
  width: string | number;
  height: string | number;
};

type BodyStripPartConfig = ComponentRecipePart & {
  panels?: BodyPanelConfig[];
  topBand?: string | number;
  bottomBand?: string | number;
  offsetX?: string | number;
};

const RIGHT_ANGLE = Math.PI / 2;

export const bodyStripPart: DielinePartGenerator<BodyStripPartConfig> = {
  type: "body-strip",
  build(ctx, config) {
    const panels = config.panels ?? [];
    if (panels.length < 2) {
      throw new Error(`body-strip part ${config.id} must declare at least two panels.`);
    }

    const topBand = ctx.numberValue(config.topBand ?? 0, `${config.id}.topBand`);
    const offsetX = ctx.numberValue(config.offsetX ?? 0, `${config.id}.offsetX`);
    let x = offsetX;
    const faces: DielineFace[] = [];
    const creases: DielineCrease[] = [];
    const anchors = [];
    const hints = [];

    for (const panel of panels) {
      const width = ctx.numberValue(panel.width, `${config.id}.${panel.id}.width`);
      const height = ctx.numberValue(panel.height, `${config.id}.${panel.id}.height`);
      if (width <= 0 || height <= 0) {
        throw new Error(`Body panel ${panel.id} must have positive width and height.`);
      }

      const face = createRectFace(panel.id, x, topBand, width, height, "panel", panel.label ?? capitalize(panel.id), true);
      faces.push(face);
      anchors.push(...createFaceEdgeAnchors(config.id, face));
      x += width;
    }

    for (let index = 0; index < faces.length - 1; index += 1) {
      const left = faces[index];
      const right = faces[index + 1];
      const edgeX = right.bounds.x;
      const structuralCrease = crease(
        `cr-${left.id}-${right.id}`,
        left.id,
        right.id,
        { x: edgeX, y: left.bounds.y },
        { x: edgeX, y: left.bounds.y + left.bounds.height },
      );
      creases.push(structuralCrease);
      hints.push({ parentFaceId: left.id, childFaceId: right.id, creaseId: structuralCrease.id });
    }

    return {
      faces,
      structuralCreases: creases,
      anchors,
      faceTreeHints: hints,
      part: {
        id: config.id,
        label: "Body panels",
        role: "body",
        faceIds: faces.map((face) => face.id),
        creaseIds: creases.map((crease) => crease.id),
      },
    };
  },
};

export function createRectFace(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  role: DielineFace["role"],
  label: string,
  artworkEnabled = false,
): DielineFace {
  return createDielineFace({
    id,
    label,
    vertices: [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ],
    role,
    artworkEnabled: artworkEnabled || role === "panel",
  });
}

export function crease(
  id: string,
  faceA: string,
  faceB: string,
  edgeStart: Point,
  edgeEnd: Point,
): DielineCrease {
  return { id, faceA, faceB, edgeStart, edgeEnd, foldAngle: RIGHT_ANGLE, direction: 1 };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
