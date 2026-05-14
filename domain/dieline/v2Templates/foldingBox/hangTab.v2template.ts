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
  const upperCapHeight = lowerHangHeight;
  const topTuckLipDepth = positiveNumber(values.TFW, clamp(width * 0.32, Math.max(1, minimumDimension * 0.08), Math.max(2, minimumDimension * 0.5)));
  const topTuckDepth = width + topTuckLipDepth;
  const topTuckRadius = positiveNumber(values.TFR, clamp(length * 0.08, 6, 11));
  const slotWidth = positiveNumber(values.slotWidth, clamp(length * 0.41, 36, 50));
  const slotHeight = positiveNumber(values.slotHeight, clamp(length * 0.123, 10, 15));
  const lowerSlotOffsetFromBase = clamp(lowerHangHeight * 0.435, slotHeight / 2 + 4, lowerHangHeight - slotHeight / 2 - 4);
  const upperSlotOffsetFromFold = lowerHangHeight - lowerSlotOffsetFromBase;
  const bottomDustDepth = clamp(width * 0.45, 28, 40);
  const bottomMajorDepth = positiveNumber(values.bottomDepth, clamp(width * 0.68, 44, 58));
  const notchWidth = clamp(width * 0.26, 18, 24);
  const notchDepth = clamp(bottomMajorDepth * 0.16, 6, 10);
  const diagonalInset = clamp(width * 0.34, 22, 32);

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
      upperCapHeight,
      slotWidth,
      slotHeight,
      bottomDustDepth,
      bottomMajorDepth,
      notchWidth,
      notchDepth,
      diagonalInset,
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
          topAllowance: Math.max(lowerHangHeight + upperCapHeight, topTuckDepth),
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
          upperHeight: upperCapHeight,
          cornerRadius: 8,
          euroSlotWidth: slotWidth,
          euroSlotHeight: slotHeight,
          euroSlotOffsetFromBase: lowerSlotOffsetFromBase,
          upperSlotWidth: slotWidth,
          upperSlotHeight: slotHeight,
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
          diagonalInset,
        },
      },
      {
        id: "bottomMajorFront",
        type: "interlockingBottomFlap",
        attachTo: "body.front.bottom",
        parameters: {
          role: "major-insert",
          handedness: "left",
          bottomFlapDepth: bottomDustDepth,
          insertLength: bottomMajorDepth,
          notchWidth,
          notchDepth,
          diagonalInset,
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
          diagonalInset,
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
          diagonalInset,
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
