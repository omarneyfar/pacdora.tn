import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { CropSettings } from "@/features/artwork/artwork";

/* ── Types ─────────────────────────────────────────────────────── */

export type ArtworkSource = {
  id: string;
  dataUrl: string;
  fileName: string;
  mimeType?: string;
  sourceType: "image" | "pdf";
};

export type FaceAsset = {
  sourceId: string;
  dataUrl: string;
  fileName: string;
  sourceType: "image" | "pdf";
  crop: CropSettings;
};

export type FaceAssets = Record<string, FaceAsset>;

/* ── State shape ───────────────────────────────────────────────── */

export type ArtworkState = {
  sources: ArtworkSource[];
  selectedSourceId: string;
  faces: FaceAssets;
  busyFace: string | null;
  isRecropping: boolean;
};

const initialState: ArtworkState = {
  sources: [],
  selectedSourceId: "",
  faces: {},
  busyFace: null,
  isRecropping: false,
};

/* ── Slice ─────────────────────────────────────────────────────── */

export const artworkSlice = createSlice({
  name: "artwork",
  initialState,
  reducers: {
    /** Add a new artwork source to the front of the library. */
    addSource(state, action: PayloadAction<ArtworkSource>) {
      state.sources.unshift(action.payload);
    },

    /** Replace the full sources list (used during hydration). */
    setSources(state, action: PayloadAction<ArtworkSource[]>) {
      state.sources = action.payload;
    },

    setSelectedSourceId(state, action: PayloadAction<string>) {
      state.selectedSourceId = action.payload;
    },

    /** Assign a rendered artwork asset to a specific face. */
    setFace(state, action: PayloadAction<{ face: string; asset: FaceAsset }>) {
      state.faces[action.payload.face] = action.payload.asset;
    },

    /** Batch-update multiple faces at once (used after dimension recrop). */
    batchUpdateFaces(state, action: PayloadAction<Array<{ face: string; asset: FaceAsset }>>) {
      for (const { face, asset } of action.payload) {
        // Only update if the source hasn't changed in the meantime.
        if (state.faces[face]?.sourceId === asset.sourceId) {
          state.faces[face] = asset;
        }
      }
    },

    /** Remove artwork from a specific face. */
    clearFace(state, action: PayloadAction<string>) {
      delete state.faces[action.payload];
    },

    setBusyFace(state, action: PayloadAction<string | null>) {
      state.busyFace = action.payload;
    },

    setIsRecropping(state, action: PayloadAction<boolean>) {
      state.isRecropping = action.payload;
    },

    /** Full workspace hydration from a loaded project. */
    hydrateArtwork(
      state,
      action: PayloadAction<{
        sources: ArtworkSource[];
        selectedSourceId: string;
        faces: FaceAssets;
      }>,
    ) {
      state.sources = action.payload.sources;
      state.selectedSourceId = action.payload.selectedSourceId;
      state.faces = action.payload.faces;
      state.busyFace = null;
      state.isRecropping = false;
    },

    /** Reset to empty workspace. */
    resetArtwork() {
      return initialState;
    },
  },
  selectors: {
    /** Derive face DataURL map used by the 3D preview (no crop settings, just the rendered image). */
    selectPreviewFaces(state): Record<string, string> {
      return Object.entries(state.faces).reduce<Record<string, string>>((acc, [face, asset]) => {
        if (asset) acc[face] = asset.dataUrl;
        return acc;
      }, {});
    },

    selectUploadedCount(state): number {
      return Object.keys(state.faces).length;
    },

    selectSelectedSource(state): ArtworkSource | undefined {
      return state.sources.find((s) => s.id === state.selectedSourceId);
    },
  },
});

export const {
  addSource,
  setSources,
  setSelectedSourceId,
  setFace,
  batchUpdateFaces,
  clearFace,
  setBusyFace,
  setIsRecropping,
  hydrateArtwork,
  resetArtwork,
} = artworkSlice.actions;

export const {
  selectPreviewFaces,
  selectUploadedCount,
  selectSelectedSource,
} = artworkSlice.selectors;

export const artworkReducer = artworkSlice.reducer;
