// Suppress hydration warnings from browser extensions
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Hydration") ||
        args[0].includes("hydration") ||
        args[0].includes("fdprocessedid"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
}
