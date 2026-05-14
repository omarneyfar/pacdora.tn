import { toDielineGraph } from "../../v2Library/adapters/toDielineGraph";
import { assembleV2Template } from "../../v2Library/assembly/assembleV2Template";
import type { V2TemplateAssembly } from "../../v2Library/assembly/types";
import type { DielineGraph, ParameterValueMap } from "../../types";

export type V2HangTabParameters = {
  L?: number;
  W?: number;
  H?: number;
  GFW?: number;
  DFW?: number;
  TFW?: number;
  TFR?: number;
  lowerHangHeight?: number;
  upperCapHeight?: number;
  foldOverHeight?: number;
  slotWidth?: number;
  slotHeight?: number;
  bottomDepth?: number;
};

export function generateV2HangTabAssembly(values: V2HangTabParameters = {}): V2TemplateAssembly {
  const length = positiveNumber(values.L, 110);
  const width = positiveNumber(values.W, 80);
  const height = positiveNumber(values.H, 150);
  const minimumDimension = Math.min(length, width, height);
  const glueFlapWidth = positiveNumber(values.GFW, clamp(width * 0.18, 12, 18));
  const topDustDepth = positiveNumber(values.DFW, clamp(width * 0.45, 24, 42));
  const lowerHangHeight = positiveNumber(values.lowerHangHeight, clamp(length * 0.477, 40, 58));
  const foldOverHeight = positiveNumber(values.foldOverHeight, lowerHangHeight);
  const upperCapHeight = positiveNumber(values.upperCapHeight, clamp(length * 0.153, 14, 22));
  const topTuckLipDepth = positiveNumber(values.TFW, clamp(18, Math.max(1, minimumDimension * 0.08), Math.max(2, minimumDimension * 0.5)));
  const topTuckDepth = width + topTuckLipDepth;
  const topTuckRadius = positiveNumber(values.TFR, clamp(length * 0.08, 6, 11));
  const slotWidth = positiveNumber(values.slotWidth, clamp(length * 0.411, 36, 50));
  const lowerSlotHeight = positiveNumber(values.slotHeight, clamp(length * 0.141, 12, 17));
  const upperSlotHeight = clamp(length * 0.123, 10, 15);
  const lowerSlotBottomOffsetFromBase = clamp(22.8, lowerSlotHeight + 4, lowerHangHeight - 4);
  const upperSlotOffsetFromFold = lowerHangHeight - lowerSlotBottomOffsetFromBase - lowerSlotHeight / 2;
  const bottomDustDepth = clamp(width * 0.5, 34, 42);
  const bottomMajorDepth = positiveNumber(values.bottomDepth, clamp(width * 0.66, 48, 56));
  const notchWidth = clamp(width * 0.26, 18, 24);
  const notchDepth = clamp(bottomMajorDepth * 0.16, 6, 10);
  const minorDiagonalInset = clamp(width * 0.5, 34, 42);
  const majorEndInset = clamp(width * 0.055, 3, 6);

  return assembleV2Template({
    id: "hang-tab-v2-template",
    label: "V2 Folding Carton Box with Hang Tab",
    rootFaceId: "body.front",
    parameters: {
      L: length,
      W: width,
      H: height,
      GFW: glueFlapWidth,
      DFW: topDustDepth,
      TFW: topTuckLipDepth,
      tuckDepth: topTuckDepth,
      TFR: topTuckRadius,
      lowerHangHeight,
      foldOverHeight,
      upperCapHeight,
      slotWidth,
      lowerSlotHeight,
      upperSlotHeight,
      lowerSlotBottomOffsetFromBase,
      upperSlotOffsetFromFold,
      bottomDustDepth,
      bottomMajorDepth,
      notchWidth,
      notchDepth,
      minorDiagonalInset,
      majorEndInset,
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
          topAllowance: Math.max(lowerHangHeight + foldOverHeight + upperCapHeight, topTuckDepth),
          bottomAllowance: bottomMajorDepth,
        },
      },
      {
        id: "topDustSideA",
        type: "standardDustFlap",
        attachTo: "body.sideA.top",
        parameters: { DFW: topDustDepth, sidePosition: "left", taper: width * 0.08, shoulder: topDustDepth * 0.15 },
      },
      {
        id: "topDustSideB",
        type: "standardDustFlap",
        attachTo: "body.sideB.top",
        parameters: { DFW: topDustDepth, sidePosition: "right", taper: width * 0.08, shoulder: topDustDepth * 0.15 },
      },
      {
        id: "foldedHangTab",
        type: "foldedHangTabPanel",
        attachTo: "body.front.top",
        parameters: {
          lowerHeight: lowerHangHeight,
          upperHeight: foldOverHeight,
          capHeight: upperCapHeight,
          cornerRadius: 10,
          euroSlotWidth: slotWidth,
          euroSlotHeight: lowerSlotHeight,
          euroSlotOffsetFromBase: lowerSlotBottomOffsetFromBase,
          upperSlotWidth: slotWidth,
          upperSlotHeight,
          upperSlotOffsetFromFold,
        },
      },
      {
        id: "topTuck",
        type: "standardTuckClosureFlap",
        attachTo: "body.back.top",
        parameters: { TFW: topTuckDepth, TFR: topTuckRadius, DFW: topDustDepth, lipScoreOffset: topTuckLipDepth },
      },
      {
        id: "bottomMinorSideA",
        type: "interlockingBottomFlap",
        attachTo: "body.sideA.bottom",
        parameters: {
          role: "minor-dust-left",
          bottomFlapDepth: bottomDustDepth,
          diagonalInset: minorDiagonalInset,
        },
      },
      {
        id: "bottomMajorFront",
        type: "interlockingBottomFlap",
        attachTo: "body.front.bottom",
        parameters: {
          role: "major-insert",
          handedness: "right",
          bottomFlapDepth: bottomDustDepth,
          insertLength: bottomMajorDepth,
          notchWidth,
          notchDepth,
          diagonalInset: majorEndInset,
          notchCenter: length / 2,
        },
      },
      {
        id: "bottomMinorSideB",
        type: "interlockingBottomFlap",
        attachTo: "body.sideB.bottom",
        parameters: {
          role: "minor-dust-right",
          bottomFlapDepth: bottomDustDepth,
          diagonalInset: minorDiagonalInset,
        },
      },
      {
        id: "bottomMajorBack",
        type: "interlockingBottomFlap",
        attachTo: "body.back.bottom",
        parameters: {
          role: "major-lock",
          handedness: "right",
          bottomFlapDepth: bottomDustDepth,
          insertLength: bottomMajorDepth,
          notchWidth,
          notchDepth,
          diagonalInset: majorEndInset,
          notchCenter: length / 2,
        },
      },
      {
        id: "sideGlue",
        type: "sideGlueSeamTab",
        attachTo: "body.back.right",
        parameters: { GFW: glueFlapWidth, reliefBevel: glueFlapWidth * 0.34 },
      },
    ],
  });
}

export function generateV2HangTabDielineGraph(values: ParameterValueMap = {}): DielineGraph {
  return toDielineGraph(generateV2HangTabAssembly({
    L: numericValue(values.L),
    W: numericValue(values.W),
    H: numericValue(values.H),
    GFW: numericValue(values.GFW),
    DFW: numericValue(values.DFW),
    TFW: numericValue(values.TFW),
    TFR: numericValue(values.TFR),
    lowerHangHeight: numericValue(values.lowerHangHeight),
    upperCapHeight: numericValue(values.upperCapHeight),
    foldOverHeight: numericValue(values.foldOverHeight),
    slotWidth: numericValue(values.slotWidth),
    slotHeight: numericValue(values.slotHeight),
    bottomDepth: numericValue(values.bottomDepth),
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
