"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// The Logistics tabs are real routes (/logistics/orders|delivery|alerts), each
// rendered by its own page. The base /logistics path just lands on Orders so the
// sidebar can highlight the correct sub-tab from the pathname.
export default function LogisticsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/logistics/orders");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
