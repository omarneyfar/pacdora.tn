import type { V2PartImplementation } from "../../contracts/types";
import { buildTuckClosureFlap } from "./standardTuckClosureFlap";

type StraightTuckClosureParameters = {
  TFW?: number;
  TFR?: number;
  DFW?: number;
};

export const straightTuckClosureFlap: V2PartImplementation<StraightTuckClosureParameters> = {
  id: "straightTuckClosureFlap",
  label: "Straight tuck closure flap",
  contractId: "straightTuckClosureFlap",
  build(input, context) {
    return buildTuckClosureFlap(input, context, {
      label: "Straight Tuck Closure Flap",
      includeLockNotches: true,
    });
  },
};
