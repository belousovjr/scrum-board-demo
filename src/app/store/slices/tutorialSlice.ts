import { tutorialStatuses } from "@/app/lib/constants";
import { TutorialStatusOption, TutorialStatusState } from "@/app/lib/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface TutorialState {
  statuses: TutorialStatusState;
}

const initialState: TutorialState = {
  statuses: {
    ADD_TASK: false,
    CHANGE_TASK_STATUS: false,
    TURN_ON_OFFLINE_MODE: false,
    ADD_OFFLINE_TASK: false,
    TURN_OFF_OFFLINE_MODE: false,
    SYNC: false,
    ADD_MEMBER: false,
    FINAL: false,
  },
};

const tutorialSlice = createSlice({
  name: "tutorial",
  initialState,
  reducers: {
    markStatus: (state, action: PayloadAction<TutorialStatusOption>) => {
      if (!state.statuses[action.payload]) {
        for (const status of tutorialStatuses) {
          state.statuses[status] = true;
          if (action.payload === status) {
            break;
          }
        }
      }
    },
  },
});

export const { markStatus } = tutorialSlice.actions;
export default tutorialSlice.reducer;
