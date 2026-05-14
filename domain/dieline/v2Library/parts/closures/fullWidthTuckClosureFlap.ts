import type { V2PartImplementation } from "../../contracts/types";
import { buildTuckClosureFlap } from "./reverseTuckClosureFlap";

type FullWidthTuckClosureParameters = {
  TFW?: number;
  TFR?: number;
  DFW?: number;
  lipScoreOffset?: number;
};

export const fullWidthTuckClosureFlap: V2PartImplementation<FullWidthTuckClosureParameters> = {
  id: "fullWidthTuckClosureFlap",
  label: "Full-width tuck closure flap",
  contractId: "fullWidthTuckClosureFlap",
  build(input, context) {
    const result = buildTuckClosureFlap(input, context, {
      label: "Full Width Tuck Closure Flap",
      contractPartId: "fullWidthTuckClosureFlap",
      includeLockNotches: false,
      includeLipScore: true,
    });

    if (context.getAnchor(input.attachTo ?? "").length > 220) {
      result.warnings.push(`${input.id}: wide full-width flap needs stiffness verification.`);
    }

    return result;
  },
};
