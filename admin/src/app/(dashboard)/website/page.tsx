import { redirect } from "next/navigation";

/**
 * /website has no screen of its own — Home Setup, Static Pages and About each
 * own their route and render their own heading.
 *
 * It previously rendered the Header Menu editor here by sniffing the pathname,
 * but that editor was a kaybykhushie leftover: it saved through mockAxios to
 * `Settings` fields this backend doesn't have, and every link it produced
 * pointed at `/shop`, a route this storefront doesn't have. Jakalburg's header
 * is built from live categories and collections instead, so there is nothing
 * for an admin to edit. Send visitors to the first real screen.
 */
export default function WebsitePage() {
  redirect("/website/home");
}
