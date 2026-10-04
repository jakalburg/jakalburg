import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";

/**
 * Icon and label for each social account an admin can set in Settings → Store.
 *
 * Shared by the footer and the mobile drawer so the two can't drift — the keys
 * here must match those `useSiteSettings().socials` emits.
 */
export const SOCIAL_META = {
  instagram: { Icon: Instagram, label: "Instagram" },
  facebook: { Icon: Facebook, label: "Facebook" },
  twitter: { Icon: Twitter, label: "X" },
  youtube: { Icon: Youtube, label: "YouTube" },
  linkedin: { Icon: Linkedin, label: "LinkedIn" },
} as const;

export type SocialKey = keyof typeof SOCIAL_META;
