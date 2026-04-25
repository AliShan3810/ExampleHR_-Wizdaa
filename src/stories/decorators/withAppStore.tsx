import { useMemo, type ReactNode } from "react";
import { Provider } from "react-redux";
import type { Decorator, StoryContext } from "@storybook/react";
import { makeStore, type StorePreloaded } from "@/store";

function AppStoreContext({
  storyId,
  preloaded,
  children,
}: {
  storyId: string;
  preloaded: StorePreloaded | undefined;
  children: ReactNode;
}) {
  const store = useMemo(
    () => makeStore(preloaded),
    // Reset store for each story (preloaded is stable per static story)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only story identity
    [storyId],
  );
  return <Provider store={store}>{children}</Provider>;
}

export const withAppStore: Decorator = (Story, context: StoryContext) => {
  const preloaded = context.parameters.preloadedState as
    | StorePreloaded
    | undefined;
  return (
    <div className="antialiased p-4">
      <AppStoreContext
        key={context.id}
        storyId={context.id}
        preloaded={preloaded}
      >
        <Story />
      </AppStoreContext>
    </div>
  );
};
