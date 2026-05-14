import { toDielineGraph } from "../../v2Library/adapters/toDielineGraph";
import { assembleV2Template } from "../../v2Library/assembly/assembleV2Template";
import type { V2TemplateAssembly } from "../../v2Library/assembly/types";
import type { DielineGraph, ParameterValueMap } from "../../types";

export type V2CircularHangHoleParameters = {
  L?: number;
  W?: number;
  H?: number;
  GFW?: number;
  TFW?: number;
  TFR?: number;
  DFW?: number;
  HL?: number;
  OD?: number;
  hangExtensionWidth?: number;
  hangOuterRadius?: number;
};

export function generateV2CircularHangHoleAssembly(values: V2CircularHangHoleParameters = {}): V2TemplateAssembly {
  const length = positiveNumber(values.L, 150);
  const width = positiveNumber(values.W, 25);
  const height = positiveNumber(values.H, 100);
  const minimumDimension = Math.min(length, width, height);
  const glueFlapWidth = positiveNumber(values.GFW, clamp(minimumDimension * 0.6, 10, 20));
  const tuckLipDepth = positiveNumber(values.TFW, clamp(18, Math.max(1, minimumDimension * 0.4), Math.max(2, minimumDimension * 0.8)));
  const tuckDepth = width + tuckLipDepth;
  const tuckRadius = positiveNumber(values.TFR, clamp(9, 0.5, Math.min(width * 0.45, length * 0.18, height * 0.18)));
  const dustDepth = positiveNumber(values.DFW, clamp(width * 0.84, Math.max(1, width * 0.25), Math.max(2, Math.min(width * 1.1, height * 0.75, length * 0.75))));
  const hangExtensionWidth = positiveNumber(values.hangExtensionWidth ?? values.HL, 70);
  const hangOuterRadius = positiveNumber(values.hangOuterRadius, 25);
  const holeDiameter = positiveNumber(values.OD, 20);
  const holeCenterX = hangExtensionWidth - hangOuterRadius;
  const holeCenterY = height / 2;

  return assembleV2Template({
    id: "circular-hang-hole-v2-template",
    label: "V2 Circular Hang Hole Box",
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
      hangExtensionWidth,
      hangOuterRadius,
      OD: holeDiameter,
    },
    parts: [
      {
        id: "body",
        type: "standardBodyStrip",
        parameters: {
          L: length,
          W: width,
          H: height,
          panelOrder: "back-side-front-side",
          xOffset: glueFlapWidth,
          topAllowance: tuckDepth,
          bottomAllowance: tuckDepth,
        },
      },
      {
        id: "sideGlue",
        type: "sideGlueSeamTab",
        attachTo: "body.back.left",
        parameters: { GFW: glueFlapWidth, reliefBevel: glueFlapWidth * 0.34 },
      },
      {
        id: "topTuck",
        type: "standardTuckClosureFlap",
        attachTo: "body.front.top",
        parameters: { TFW: tuckDepth, TFR: tuckRadius, DFW: dustDepth, lipScoreOffset: tuckLipDepth },
      },
      {
        id: "bottomTuck",
        type: "standardTuckClosureFlap",
        attachTo: "body.front.bottom",
        parameters: { TFW: tuckDepth, TFR: tuckRadius, DFW: dustDepth, lipScoreOffset: tuckLipDepth },
      },
      {
        id: "topDustSideA",
        type: "standardDustFlap",
        attachTo: "body.sideA.top",
        parameters: { DFW: dustDepth, sidePosition: "left" },
      },
      {
        id: "topDustSideB",
        type: "standardDustFlap",
        attachTo: "body.sideB.top",
        parameters: { DFW: dustDepth, sidePosition: "right" },
      },
      {
        id: "bottomDustSideA",
        type: "standardDustFlap",
        attachTo: "body.sideA.bottom",
        parameters: { DFW: dustDepth, sidePosition: "left" },
      },
      {
        id: "bottomDustSideB",
        type: "standardDustFlap",
        attachTo: "body.sideB.bottom",
        parameters: { DFW: dustDepth, sidePosition: "right" },
      },
      {
        id: "sideHangPanel",
        type: "sideCircularHangPanel",
        attachTo: "body.sideA.right",
        parameters: {
          extensionWidth: hangExtensionWidth,
          neckWidth: width * 0.95,
          outerRadius: hangOuterRadius,
          centerY: holeCenterY,
        },
      },
      {
        id: "circularCutout",
        type: "circularCutout",
        attachTo: "sideHangPanel.face",
        parameters: { OD: holeDiameter, centerX: holeCenterX, centerY: holeCenterY, margin: 3 },
      },
    ],
  });
}

export function generateV2CircularHangHoleDielineGraph(values: ParameterValueMap = {}): DielineGraph {
  return toDielineGraph(generateV2CircularHangHoleAssembly({
    L: numericValue(values.L),
    W: numericValue(values.W),
    H: numericValue(values.H),
    GFW: numericValue(values.GFW),
    TFW: numericValue(values.TFW),
    TFR: numericValue(values.TFR),
    DFW: numericValue(values.DFW),
    HL: numericValue(values.HL),
    OD: numericValue(values.OD),
    hangExtensionWidth: numericValue(values.hangExtensionWidth),
    hangOuterRadius: numericValue(values.hangOuterRadius),
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
