import { checkIsOffline } from "@/app/lib/utils";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AppState {
  offline: boolean;
}

const initialState: AppState = {
  offline: checkIsOffline(),
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setOffline: (state, action: PayloadAction<boolean>) => {
      state.offline = action.payload;
    },
  },
});

export const { setOffline } = appSlice.actions;
export default appSlice.reducer;
