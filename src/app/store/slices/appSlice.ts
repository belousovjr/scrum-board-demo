import { SnackbarData } from "@/app/lib/types";
import { checkIsOffline } from "@/app/lib/utils";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AppState {
  offline: boolean;
  notification: SnackbarData | null;
}

const initialState: AppState = {
  offline: checkIsOffline(),
  notification: null,
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setOffline: (state, action: PayloadAction<boolean>) => {
      state.offline = action.payload;
    },
    setNotification: (state, action: PayloadAction<SnackbarData | null>) => {
      state.notification = action.payload;
    },
  },
});

export const { setOffline, setNotification } = appSlice.actions;
export default appSlice.reducer;
