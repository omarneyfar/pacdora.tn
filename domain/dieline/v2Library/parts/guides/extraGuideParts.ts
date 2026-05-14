import {
  faceBandPrimitivePart,
  faceLinePrimitivePart,
  faceRoundedRectPrimitivePart,
} from "../parametricParts";

const guideWarning = () => ["Guide/print helper only; it must not create foldable faces or structural creases."];

export const internalScoreGuide = faceLinePrimitivePart({
  id: "internalScoreGuide",
  label: "Internal score guide",
  layer: "score",
  orientation: "horizontal",
  warningFactory: guideWarning,
});

export const noPrintZoneGuide = faceBandPrimitivePart({
  id: "noPrintZoneGuide",
  label: "No-print zone guide",
  layer: "no-print",
  heightParam: "zoneHeight",
  defaultHeightRatio: 0.18,
  warningFactory: guideWarning,
});

export const filmGlueZoneGuide = faceBandPrimitivePart({
  id: "filmGlueZoneGuide",
  label: "Film glue zone guide",
  layer: "glue",
  heightParam: "zoneHeight",
  defaultHeightRatio: 0.16,
  warningFactory: guideWarning,
});

export const windowFilmPatchGuide = faceRoundedRectPrimitivePart({
  id: "windowFilmPatchGuide",
  label: "Window film patch guide",
  layer: "film",
  widthParam: "patchWidth",
  heightParam: "patchHeight",
  defaultWidthRatio: 0.62,
  defaultHeightRatio: 0.42,
  margin: 4,
  warningFactory: guideWarning,
});

export const barcodeSafeZoneGuide = faceRoundedRectPrimitivePart({
  id: "barcodeSafeZoneGuide",
  label: "Barcode safe zone guide",
  layer: "safe-area",
  widthParam: "zoneWidth",
  heightParam: "zoneHeight",
  defaultWidthRatio: 0.38,
  defaultHeightRatio: 0.18,
  margin: 4,
  warningFactory: guideWarning,
});
