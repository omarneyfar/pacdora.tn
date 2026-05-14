import { toDielineGraph } from "../../v2Library/adapters/toDielineGraph";
import { assembleV2Template } from "../../v2Library/assembly/assembleV2Template";
import type { V2TemplateAssembly } from "../../v2Library/assembly/types";
import type { DielineGraph, ParameterValueMap } from "../../types";

export type V2ReverseTuckEndParameters = {
  L?: number;
  W?: number;
  H?: number;
  GFW?: number;
  TFW?: number;
  TFR?: number;
  DFW?: number;
};

export function generateV2ReverseTuckEndAssembly(values: V2ReverseTuckEndParameters = {}): V2TemplateAssembly {
  const length = positiveNumber(values.L, 120);
  const width = positiveNumber(values.W, 60);
  const height = positiveNumber(values.H, 160);
  const minimumDimension = Math.min(length, width, height);
  const glueFlapWidth = positiveNumber(values.GFW, clamp(minimumDimension * 0.25, 1.5, Math.max(3, minimumDimension * 0.35)));
  const tuckLipDepth = positiveNumber(values.TFW, clamp(width * 0.32, Math.max(1, minimumDimension * 0.08), Math.max(2, minimumDimension * 0.5)));
  const tuckDepth = width + tuckLipDepth;
  const tuckRadius = positiveNumber(values.TFR, clamp(width * 0.18, 0.5, Math.min(width * 0.25, length * 0.18, height * 0.18)));
  const dustDepth = positiveNumber(values.DFW, clamp(width * 0.58, Math.max(1, width * 0.25), Math.max(2, Math.min(width * 0.75, height * 0.75, length * 0.75))));

  return assembleV2Template({
    id: "reverse-tuck-end-v2-template",
    label: "V2 Reverse Tuck End Folding Carton Box",
    rootFaceId: "body.front",
    parameters: {
      L: length,
      W: width,
      H: height,
      GFW: glueFlapWidth,
      TFW: tuckLipDepth,
      tuckDepth,
      TFR: tuckRadius,
      DFW: dustDepth,
    },
    parts: [
      {
        id: "body",
        type: "standardBodyStrip",
        parameters: {
          L: length,
          W: width,
          H: height,
          panelOrder: "side-front-side-back",
          topAllowance: tuckDepth,
          bottomAllowance: tuckDepth,
        },
      },
      {
        id: "sideGlue",
        type: "sideGlueSeamTab",
        attachTo: "body.back.right",
        parameters: { GFW: glueFlapWidth, reliefBevel: glueFlapWidth * 0.34 },
      },
      {
        id: "topTuck",
        type: "reverseTuckClosureFlap",
        attachTo: "body.front.top",
        parameters: { TFW: tuckDepth, TFR: tuckRadius, DFW: dustDepth, lipScoreOffset: tuckLipDepth },
      },
      {
        id: "bottomTuck",
        type: "reverseTuckClosureFlap",
        attachTo: "body.back.bottom",
        parameters: { TFW: tuckDepth, TFR: tuckRadius, DFW: dustDepth, lipScoreOffset: tuckLipDepth },
      },
      {
        id: "topDustSideA",
        type: "standardDustFlap",
        attachTo: "body.sideA.top",
        parameters: { DFW: dustDepth, sidePosition: "right" },
      },
      {
        id: "topDustSideB",
        type: "standardDustFlap",
        attachTo: "body.sideB.top",
        parameters: { DFW: dustDepth, sidePosition: "left" },
      },
      {
        id: "bottomDustSideA",
        type: "standardDustFlap",
        attachTo: "body.sideA.bottom",
        parameters: { DFW: dustDepth, sidePosition: "right" },
      },
      {
        id: "bottomDustSideB",
        type: "standardDustFlap",
        attachTo: "body.sideB.bottom",
        parameters: { DFW: dustDepth, sidePosition: "left" },
      },
    ],
  });
}

export function generateV2ReverseTuckEndDielineGraph(values: ParameterValueMap = {}): DielineGraph {
  return toDielineGraph(generateV2ReverseTuckEndAssembly({
    L: numericValue(values.L),
    W: numericValue(values.W),
    H: numericValue(values.H),
    GFW: numericValue(values.GFW),
    TFW: numericValue(values.TFW),
    TFR: numericValue(values.TFR),
    DFW: numericValue(values.DFW),
  }));
}

function numericValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function positiveNumber(value: number | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
