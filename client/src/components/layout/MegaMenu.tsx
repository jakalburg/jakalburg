import Link from "next/link";
import { useCollections } from "@/hooks/useCollections";
import { useNavCategories } from "@/hooks/useNavCategories";
import { collections as staticCollections } from "@/data/collections";
import { ImageShimmer } from "@/components/ui/image-shimmer";

interface Props {
  section: "women" | "men";
  onNavigate?: () => void;
}

/**
 * Desktop mega-menu. Reads the same live categories and collections the mobile
 * drawer does — when these were two hardcoded lists the two menus could, and
 * did, disagree about what the shop sells.
 */
export function MegaMenu({ section, onNavigate }: Props) {
  const { categories: cats } = useNavCategories(section);
  const { data: apiCollections } = useCollections();

  // The shipped set only stands in when the API gives us nothing, so the menu
  // never renders an empty column. Tiles need an image, which the API may not
  // have for every collection.
  const tiles = (apiCollections ?? []).length
    ? (apiCollections ?? []).map((c) => ({
        slug: c.slug,
        title: c.title,
        tagline: c.subtitle ?? "",
        image: c.image ?? undefined,
      }))
    : staticCollections.map((c) => ({
        slug: c.slug,
        title: c.title,
        tagline: c.tagline,
        image: c.image as string | undefined,
      }));
  return (
    <div className="hidden lg:block">
      <div className="grid grid-cols-4 gap-10 p-8">
        <div>
          <p className="eyebrow mb-4 text-mute-text">Shop {section}</p>
          <ul className="space-y-2 text-sm">
            {cats.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  onClick={onNavigate}
                  className="hover:underline underline-offset-4"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4 text-mute-text">Featured</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/new-arrivals" onClick={onNavigate} className="hover:underline underline-offset-4">
                New arrivals
              </Link>
            </li>
            <li>
              <Link href="/essentials" onClick={onNavigate} className="hover:underline underline-offset-4">
                The Essentials
              </Link>
            </li>
            <li>
              <Link href="/sale" onClick={onNavigate} className="hover:underline underline-offset-4">
                Sale
              </Link>
            </li>
            <li>
              <Link
                href={section === "women" ? "/women" : "/men"}
                onClick={onNavigate}
                className="hover:underline underline-offset-4"
              >
                View all {section}
              </Link>
            </li>
          </ul>
        </div>
        <div className="col-span-2">
          <p className="eyebrow mb-4 text-mute-text">Collections</p>
          <div className="grid grid-cols-2 gap-4">
            {tiles.slice(0, 4).map((c) => (
              <Link
                key={c.slug}
                href={`/collections/${c.slug}`}
                onClick={onNavigate}
                className="group block"
              >
                <div className="aspect-[4/3] overflow-hidden bg-stone">
                  {c.image && (
                    <ImageShimmer
                      src={c.image}
                      alt={c.title}
                      wrapperClassName="h-full w-full transition duration-500 group-hover:scale-[1.02]"
                    />
                  )}
                </div>
                <p className="mt-2 text-sm font-medium">{c.title}</p>
                <p className="text-xs text-mute-text">{c.tagline}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
