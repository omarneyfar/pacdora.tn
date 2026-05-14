import type { V2PartImplementation } from "../../contracts/types";
import { buildTuckClosureFlap, type TuckClosureParameters } from "./standardTuckClosureFlap";

export const reverseTuckClosureFlap: V2PartImplementation<TuckClosureParameters> = {
  id: "reverseTuckClosureFlap",
  label: "Reverse tuck closure flap",
  contractId: "reverseTuckClosureFlap",
  build(input, context) {
    return buildTuckClosureFlap(input, context, {
      label: "Reverse Tuck Closure Flap",
      includeLockNotches: false,
      includeLipScore: true,
    });
  },
};
