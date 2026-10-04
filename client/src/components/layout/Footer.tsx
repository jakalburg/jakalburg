import Link from "next/link";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  findSection,
  resolveFooterBackground,
  useHomeSections,
  type FooterBackgroundData,
} from "@/hooks/useHomeSections";
// Shared with the mobile drawer so the two renderings of the same accounts
// can't drift apart.
import { SOCIAL_META } from "./social-meta";

export function Footer() {
  const { storeName, tagline, logo, socials } = useSiteSettings();
  // The footer background lives on the Footer home-section row, configured in
  // the admin's Website → Home Setup tab. Fetched client-side like the rest of
  // the site settings, so the first paint is the plain footer.
  const { sections } = useHomeSections();
  const background = resolveFooterBackground(
    findSection(sections, "Footer")?.data as FooterBackgroundData | undefined,
  );

  return (
    <footer className="relative border-t bg-background">
      {background && (
        // Two fixed layers rather than one responsive element: a CSS background
        // can't swap source per breakpoint, and the desktop/mobile images are
        // cropped differently. Behind the content, and never interactive.
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 hidden bg-cover bg-center md:block"
            style={{ backgroundImage: `url(${background.desktopImage})` }}
          >
            {/* The admin's opacity slider means "how strongly the image
                shows", which both sides render as a veil of the footer's own
                background colour at `1 - opacity`. Keep the two in step. */}
            <div
              className="absolute inset-0 bg-background"
              style={{ opacity: background.desktopVeil }}
            />
          </div>
          <div
            className="absolute inset-0 bg-cover bg-center md:hidden"
            style={{ backgroundImage: `url(${background.mobileImage})` }}
          >
            <div
              className="absolute inset-0 bg-background"
              style={{ opacity: background.mobileVeil }}
            />
          </div>
        </div>
      )}
      <div className="relative container-vh grid gap-10 py-14 md:grid-cols-4">
        <div>
          <Link href="/" className="inline-flex" aria-label={`${storeName} home`}><img src={logo} alt={storeName} className="h-12 w-auto mix-blend-multiply" /></Link>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            {tagline}
          </p>
          {/* Only the accounts an admin has filled in get an icon. */}
          {socials.length > 0 && (
            <ul className="mt-5 flex items-center gap-4">
              {socials.map(({ key, url }) => {
                const { Icon, label } = SOCIAL_META[key];
                return (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`${storeName} on ${label}`}
                      className="text-mute-text transition-colors hover:text-foreground"
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div>
          <p className="eyebrow text-mute-text">Shop</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/women">Women</Link></li>
            <li><Link href="/men">Men</Link></li>
            <li><Link href="/new-arrivals">New arrivals</Link></li>
            <li><Link href="/collections">Collections</Link></li>
            <li><Link href="/essentials">Essentials</Link></li>
            <li><Link href="/sale">Sale</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-mute-text">Help</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/shipping-policy">Shipping</Link></li>
            <li><Link href="/returns-policy">Returns</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-mute-text">About</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/about">Our story</Link></li>
            <li><Link href="/privacy-policy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
            <li><Link href="/account">My account</Link></li>
          </ul>
        </div>
      </div>
      <div className="relative border-t">
        <div className="container-vh flex flex-col items-center justify-center gap-3 py-6 text-center text-xs text-mute-text md:flex-row">
          <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
