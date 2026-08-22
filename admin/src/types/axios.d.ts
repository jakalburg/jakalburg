import "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    /** Set by a call site that does its own richer reportError() call, to
     * suppress the generic api_failure report the response interceptor
     * would otherwise also fire for the same failure. */
    skipErrorReport?: boolean;
  }
}
