import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import {
  DEFAULT_CARTON_DIMENSIONS,
  normalizeDimensions,
  type CartonDimensions,
  type ProjectStatus,
} from "@/domain/packaging";

export type SaveStatus = "idle" | "saving" | "saved" | "published" | "unsaved";

export type BuilderState = {
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  dimensions: CartonDimensions;
  saveStatus: SaveStatus;
  isProjectLoading: boolean;
  isProjectSaving: boolean;
  isSharing: boolean;
};

const initialState: BuilderState = {
  projectId: "",
  projectName: "Untitled carton",
  projectStatus: "draft",
  dimensions: DEFAULT_CARTON_DIMENSIONS,
  saveStatus: "idle",
  isProjectLoading: false,
  isProjectSaving: false,
  isSharing: false,
};

type MarkChangedPayload = {
  forceDraft: boolean;
};

export const builderSlice = createSlice({
  name: "builder",
  initialState,
  reducers: {
    setProjectId(state, action: PayloadAction<string>) {
      state.projectId = action.payload;
    },

    setProjectName(state, action: PayloadAction<string>) {
      state.projectName = action.payload;
    },

    setProjectStatus(state, action: PayloadAction<ProjectStatus>) {
      state.projectStatus = action.payload;
    },

    setDimensions(state, action: PayloadAction<CartonDimensions>) {
      state.dimensions = normalizeDimensions(action.payload);
    },

    setSaveStatus(state, action: PayloadAction<SaveStatus>) {
      state.saveStatus = action.payload;
    },

    setIsProjectLoading(state, action: PayloadAction<boolean>) {
      state.isProjectLoading = action.payload;
    },

    setIsProjectSaving(state, action: PayloadAction<boolean>) {
      state.isProjectSaving = action.payload;
    },

    setIsSharing(state, action: PayloadAction<boolean>) {
      state.isSharing = action.payload;
    },

    markChanged: {
      reducer(state, action: PayloadAction<MarkChangedPayload>) {
        if (action.payload.forceDraft) {
          state.projectStatus = "draft";
        }

        state.saveStatus = state.projectId ? "unsaved" : "idle";
      },
      prepare(payload?: Partial<MarkChangedPayload>) {
        return {
          payload: {
            forceDraft: payload?.forceDraft ?? true,
          },
        };
      },
    },

    hydrateBuilder(
      state,
      action: PayloadAction<{
        projectId: string;
        name: string;
        status: ProjectStatus;
        dimensions: CartonDimensions;
      }>,
    ) {
      const { projectId, name, status, dimensions } = action.payload;
      state.projectId = projectId;
      state.projectName = name;
      state.projectStatus = status;
      state.dimensions = normalizeDimensions(dimensions);
      state.saveStatus = status === "published" ? "published" : "saved";
      state.isProjectLoading = false;
      state.isProjectSaving = false;
      state.isSharing = false;
    },

    resetBuilder() {
      return initialState;
    },
  },
});

export const {
  setProjectId,
  setProjectName,
  setProjectStatus,
  setDimensions,
  setSaveStatus,
  setIsProjectLoading,
  setIsProjectSaving,
  setIsSharing,
  markChanged,
  hydrateBuilder,
  resetBuilder,
} = builderSlice.actions;

export const builderReducer = builderSlice.reducer;
