import { configureStore } from "@reduxjs/toolkit";
import { hcmApi } from "./hcmApi";
import { balancesRootReducer, type BalancesState } from "./balancesSlice";
import { requestsRootReducer, type RequestsState } from "./requestsSlice";
import { hcmQueryListener } from "./hcmQueryListeners";

export type RootState = {
  [hcmApi.reducerPath]: ReturnType<typeof hcmApi.reducer>;
  balances: BalancesState;
  requests: RequestsState;
};

/** For tests / Storybook: partial of app state. */
export type StorePreloaded = Partial<RootState>;

export const makeStore = (preloadedState?: StorePreloaded) => {
  const reducer = {
    [hcmApi.reducerPath]: hcmApi.reducer,
    balances: balancesRootReducer,
    requests: requestsRootReducer,
  };
  // getDefaultMiddleware callback — exact RTK type is verbose here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const middleware = (gdm: any) =>
    gdm().concat(hcmApi.middleware, hcmQueryListener.middleware);
  if (preloadedState) {
    /* RTK: partial preloaded is valid at runtime; the generic overload is strict. */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return configureStore({
      reducer,
      middleware,
      preloadedState: preloadedState as any,
    } as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }
  return configureStore({ reducer, middleware });
};

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
