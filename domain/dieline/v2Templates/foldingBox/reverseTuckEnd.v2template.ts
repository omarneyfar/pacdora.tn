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
  const glueFlapWidth = positiveNumber(values.GFW, 12);
  const tuckDepth = positiveNumber(values.TFW, Math.max(16, width * 0.68));
  const tuckRadius = positiveNumber(values.TFR, 4);
  const dustDepth = positiveNumber(values.DFW, Math.max(8, width / 2 - 3));

  return assembleV2Template({
    id: "reverse-tuck-end-v2-template",
    label: "V2 Reverse Tuck End Folding Carton Box",
    rootFaceId: "body.front",
    parameters: {
      L: length,
      W: width,
      H: height,
      GFW: glueFlapWidth,
      TFW: tuckDepth,
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
          topAllowance: tuckDepth,
          bottomAllowance: tuckDepth,
        },
      },
      {
        id: "sideGlue",
        type: "sideGlueSeamTab",
        attachTo: "body.sideA.right",
        parameters: { GFW: glueFlapWidth },
      },
      {
        id: "topTuck",
        type: "reverseTuckClosureFlap",
        attachTo: "body.back.top",
        parameters: { TFW: tuckDepth, TFR: tuckRadius, DFW: dustDepth },
      },
      {
        id: "bottomTuck",
        type: "reverseTuckClosureFlap",
        attachTo: "body.front.bottom",
        parameters: { TFW: tuckDepth, TFR: tuckRadius, DFW: dustDepth },
      },
      {
        id: "topDustSideA",
        type: "standardDustFlap",
        attachTo: "body.sideA.top",
        parameters: { DFW: dustDepth },
      },
      {
        id: "topDustSideB",
        type: "standardDustFlap",
        attachTo: "body.sideB.top",
        parameters: { DFW: dustDepth },
      },
      {
        id: "bottomDustSideA",
        type: "standardDustFlap",
        attachTo: "body.sideA.bottom",
        parameters: { DFW: dustDepth },
      },
      {
        id: "bottomDustSideB",
        type: "standardDustFlap",
        attachTo: "body.sideB.bottom",
        parameters: { DFW: dustDepth },
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
