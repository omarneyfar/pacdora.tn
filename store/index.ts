"use client";

import { useDispatch, useSelector } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import { builderReducer } from "./builderSlice";
import { artworkReducer } from "./artworkSlice";
import { uiReducer } from "./uiSlice";

/* ── Store ─────────────────────────────────────────────────────── */

export const store = configureStore({
  reducer: {
    builder: builderReducer,
    artwork: artworkReducer,
    ui: uiReducer,
  },
});

/* ── Typed helpers ─────────────────────────────────────────────── */

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Always use these typed hooks instead of the raw `useDispatch` / `useSelector`.
 * This gives full type inference for selectors and action creators.
 */
export function useAppDispatch() {
  return useDispatch<AppDispatch>();
}

export function useAppSelector<T>(selector: (state: RootState) => T): T {
  return useSelector(selector);
}
