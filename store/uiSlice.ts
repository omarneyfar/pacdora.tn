import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { FaceKey } from "@/domain/packaging";
import type { CropSettings } from "@/features/artwork/artwork";

/* ── Types ─────────────────────────────────────────────────────── */

export type CropModalState = {
  face: FaceKey;
  sourceId: string;
  settings: CropSettings;
};

export type ParameterSectionKey = "dimensions" | "templateParameters" | "dieline" | "library";

/* ── State shape ───────────────────────────────────────────────── */

export type UiState = {
  openSections: Record<ParameterSectionKey, boolean>;
  cropModal: CropModalState | null;
  shareUrl: string;
  copied: boolean;
  showDielineGuides: boolean;
  error: string;
  notice: string;
  confirmDialog: {
    open: boolean;
    title: string;
    message: string;
  } | null;
};

const initialState: UiState = {
  openSections: {
    dimensions: true,
    templateParameters: true,
    dieline: true,
    library: true,
  },
  cropModal: null,
  shareUrl: "",
  copied: false,
  showDielineGuides: true,
  error: "",
  notice: "",
  confirmDialog: null,
};

/* ── Slice ─────────────────────────────────────────────────────── */

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSection(state, action: PayloadAction<ParameterSectionKey>) {
      const key = action.payload;
      state.openSections[key] = !state.openSections[key];
    },

    openCropModal(state, action: PayloadAction<CropModalState>) {
      state.cropModal = action.payload;
    },

    closeCropModal(state) {
      state.cropModal = null;
    },

    setShareUrl(state, action: PayloadAction<string>) {
      state.shareUrl = action.payload;
    },

    clearShareUrl(state) {
      state.shareUrl = "";
    },

    setCopied(state, action: PayloadAction<boolean>) {
      state.copied = action.payload;
    },

    setShowDielineGuides(state, action: PayloadAction<boolean>) {
      state.showDielineGuides = action.payload;
    },

    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },

    clearError(state) {
      state.error = "";
    },

    setNotice(state, action: PayloadAction<string>) {
      state.notice = action.payload;
    },

    clearNotice(state) {
      state.notice = "";
    },

    openConfirmDialog(
      state,
      action: PayloadAction<{ title: string; message: string }>,
    ) {
      state.confirmDialog = {
        open: true,
        title: action.payload.title,
        message: action.payload.message,
      };
    },

    closeConfirmDialog(state) {
      state.confirmDialog = null;
    },

    /** Reset all UI state. */
    resetUi() {
      return initialState;
    },
  },
});

export const {
  toggleSection,
  openCropModal,
  closeCropModal,
  setShareUrl,
  clearShareUrl,
  setCopied,
  setShowDielineGuides,
  setError,
  clearError,
  setNotice,
  clearNotice,
  openConfirmDialog,
  closeConfirmDialog,
  resetUi,
} = uiSlice.actions;

export const uiReducer = uiSlice.reducer;
