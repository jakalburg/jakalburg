import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My account — Jakalburg" },
      { name: "description", content: "Manage your Jakalburg account (demo)." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <SiteLayout hideNewsletter>
      <Outlet />
    </SiteLayout>
  ),
});
