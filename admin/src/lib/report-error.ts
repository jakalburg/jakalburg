// ---------------------------------------------------------------------------
// UI-only build: the error-reporting backend (POST /logs) is intentionally not
// migrated. This keeps the original `reportError` surface so every caller
// (api client, axios interceptors) compiles and behaves identically, but the
// implementation is a no-op that never makes a network request and never throws.
// ---------------------------------------------------------------------------

export interface ErrorReportInput {
  message: string;
  errorType: string;
  severity?: "info" | "warning" | "error" | "critical";
  stack?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export async function reportError(_input: ErrorReportInput): Promise<void> {
  // Intentionally disabled in the UI-only build.
}
