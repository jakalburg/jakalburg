// ---------------------------------------------------------------------------
// UI-only build: these standalone axios instances are backed by the mock API
// layer (see `@/lib/mock-api`) instead of the network. The public/auth split is
// preserved for API compatibility, but both resolve requests from local data.
//
// To reconnect a real backend later: restore `axios.create(...)` here.
// ---------------------------------------------------------------------------

import { createMockAxios } from "@/lib/mock-api";

export const axiosPublic = createMockAxios();
export const axiosAuth = createMockAxios();

// Default export for backward compatibility during refactor, but deprecated
export default axiosPublic;
