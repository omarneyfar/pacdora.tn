"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Provider } from "react-redux";

import { makeStore } from "./index";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);

  return <Provider store={store}>{children}</Provider>;
}
