import Link from "next/link";
import {
  findSection,
  useHomeSections,
  type AnnouncementBarData,
} from "@/hooks/useHomeSections";

/**
 * The copy this bar shipped with, used whenever the configured text is blank
 * or the section list hasn't resolved. Kept identical to the server's seed in
 * `home-sections.defaults.ts` so an unconfigured store looks unchanged.
 */
const DEFAULT_TEXT =
  "Complimentary shipping on orders over ₹2,499 · Easy 30-day returns";

/**
 * The thin bar above the header, editable from the admin's Website → Home
 * Setup screen.
 *
 * It renders on EVERY page via SiteLayout, not just the home page — the same
 * arrangement as Footer, which also takes its configuration from a home
 * section row. Both share one react-query cache entry, so this costs no extra
 * request.
 */
export function AnnouncementBar() {
  const { sections } = useHomeSections();
  const section = findSection(sections, "AnnouncementBar");

  // `sections` is empty both while the fetch is in flight and when the API is
  // unreachable, and neither is distinguishable from "the admin disabled it".
  // So only hide the bar once we have rows that genuinely exclude it: a strip
  // at the very top of every page must not appear late — shoving the page
  // down — or vanish because the backend blipped.
  if (sections.length > 0 && !section) return null;

  const data = (section?.data ?? {}) as AnnouncementBarData;
  const text = data.text?.trim() || DEFAULT_TEXT;
  const href = data.linkHref?.trim();

  return (
    <div className="bg-ink text-primary-foreground text-xs">
      <div className="container-vh flex items-center justify-center py-2 text-center tracking-wide">
        {href ? (
          <Link href={href} className="hover:underline">
            {text}
          </Link>
        ) : (
          <p>{text}</p>
        )}
      </div>
    </div>
  );
}
