import type { AuthUser, BackendUser } from "@/types";

// The backend has no `name` column — derive a display name from the first
// profile (firstName + lastName), falling back to the email local-part.
export function normalizeUser(u: BackendUser): AuthUser {
  const p = u.profiles?.[0];
  const first = (p?.firstName ?? "").trim();
  const last = (p?.lastName ?? "").trim();
  const full = [first, last].filter(Boolean).join(" ").trim();
  const email = u.email ?? "";
  const name = full || (email ? email.split("@")[0] : "there");

  return {
    id: u.id,
    email,
    name,
    image: u.image,
    role: u.role,
    emailVerified: u.emailVerified,
    hasPassword: u.hasPassword,
    providers: u.providers,
    profiles: u.profiles,
  };
}
