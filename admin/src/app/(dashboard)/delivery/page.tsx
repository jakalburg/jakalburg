"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DeliveryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/logistics/delivery");
  }, [router]);

  return null;
}
