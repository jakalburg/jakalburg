"use client";

import { useEffect } from "react";

export function PwaProvider() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let mounted = true;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        if (mounted) {
          await registration.update();
        }
      } catch (error) {
        console.error("Jakalburg Admin service worker registration failed:", error);
      }
    };

    const handleControllerChange = () => {
      console.info("Jakalburg Admin service worker updated.");
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    void registerServiceWorker();

    return () => {
      mounted = false;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  return null;
}
