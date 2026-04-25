"use client";

import { useEffect, useState } from "react";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { startBrowserMocks } from "@/mocks/enableBrowserMocks";

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(
    process.env.NEXT_PUBLIC_ENABLE_MSW !== "true",
  );

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_MSW !== "true") {
      return;
    }

    let cancelled = false;

    void startBrowserMocks()
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch((err: unknown) => {
        console.error("[MSW] Failed to start mock Service Worker:", err);
        if (!cancelled) {
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <LoadingBlock
        fullPage
        title="Starting API mocks"
        description="Registering the Mock Service Worker so local requests can be intercepted. This usually takes a moment."
      />
    );
  }

  return <>{children}</>;
}
