import { SnackbarData } from "@/app/lib/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface NotificationsState {
  notification: SnackbarData | null;
}

const initialState: NotificationsState = {
  notification: null,
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotification: (state, action: PayloadAction<SnackbarData | null>) => {
      state.notification = action.payload;
    },
  },
});

export const { setNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
