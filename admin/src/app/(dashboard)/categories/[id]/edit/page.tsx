"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/catalog/category-form";
import { useCategory } from "@/hooks/use-categories";

export default function EditCategoryPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const { data: category, isLoading, isError } = useCategory(id);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !category) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <div>
          <p className="font-medium">Category not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            It may have been deleted, or the categories table may not exist yet.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/categories">Back to categories</Link>
        </Button>
      </div>
    );
  }

  // Keyed on the row so the form's initial state is rebuilt if the query
  // refetches a different record into the same mounted component.
  return <CategoryForm key={category.id} category={category} />;
}
