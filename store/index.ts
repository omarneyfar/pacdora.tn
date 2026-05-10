"use client";

import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

import { artworkReducer } from "./artworkSlice";
import { builderReducer } from "./builderSlice";
import { uiReducer } from "./uiSlice";

export function makeStore() {
  return configureStore({
    reducer: {
      artwork: artworkReducer,
      builder: builderReducer,
      ui: uiReducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

export function useAppDispatch() {
  return useDispatch<AppDispatch>();
}

export function useAppSelector<T>(selector: (state: RootState) => T): T {
  return useSelector(selector);
}
