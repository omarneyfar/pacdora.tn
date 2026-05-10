"use client";

import { Provider } from "react-redux";
import type { ReactNode } from "react";

import { store } from "./index";

/**
 * Client-side Redux Provider wrapper.
 * Must be a separate "use client" component because the root layout is a Server Component.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
