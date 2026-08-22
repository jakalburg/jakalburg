/**
 * Admin Configuration
 * Centralized configuration files
 */

const isProduction = process.env.NODE_ENV === "production";
const productionApiUrl =
  process.env.NEXT_PUBLIC_API_URL_PROD ||
  "https://kaybykhushieapi.vercel.app/api";
const localApiUrl =
  process.env.NEXT_PUBLIC_API_URL_DEV || "http://localhost:8080/api";

const config = {
  // API Configuration
  api: {
    baseURL: isProduction ? productionApiUrl : localApiUrl,
    timeout: 40000,
  },

  // Authentication
  auth: {
    nextAuthSecret: process.env.NEXTAUTH_SECRET,
  },
};

export default config;
