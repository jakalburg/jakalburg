"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { ProductForm } from "@/components/products/product-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAdminQuery } from "@/hooks/use-admin-query";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { productsService } from "@/services";
import Loader from "@/components/ui/loader";
import { useSession } from "@/lib/mock-auth";

function EditStealDealPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const api = useAxiosAuth();
  const { status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const returnQuery = searchParams.toString();
  const backHref = returnQuery ? `/steal-deals?${returnQuery}` : "/steal-deals";

  const { data: product, isPending } = useAdminQuery(["product", id], () =>
    productsService(api).getById(id),
  );

  if (sessionStatus !== "authenticated" || isPending) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Steal Deal not found</h2>
          <p className="text-muted-foreground mb-4">
            The Steal Deal you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link href={backHref}>Back to Steal Deals</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 ">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref}>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Steal Deal</h1>
          <p className="text-muted-foreground mt-1">
            Update Steal Deal information
          </p>
        </div>
      </div>

      <ProductForm mode="edit" dealMode product={product} backHref={backHref} />
    </div>
  );
}

export default function EditStealDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[50vh]">
          <Loader size="lg" />
        </div>
      }
    >
      <EditStealDealPageContent params={params} />
    </Suspense>
  );
}
