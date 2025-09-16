import { configureStore, combineReducers } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
import { persistReducer, persistStore, WebStorage } from "redux-persist";
import appReducer from "./slices/appSlice";
import tutorialReducer from "./slices/tutorialSlice";

const reducers = {
  app: appReducer,
  tutorial: tutorialReducer,
} as const;

const rootReducer = combineReducers(reducers);

const persistConfig: {
  key: "root";
  storage: WebStorage;
  whitelist: (keyof typeof reducers)[];
} = {
  key: "root",
  storage,
  whitelist: ["app", "tutorial"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
