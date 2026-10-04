"use client";

import { CategoryForm } from "@/components/catalog/category-form";

/**
 * Create a category.
 *
 * Replaces the kaybykhushie form, which offered a "main vs subcategory" choice
 * and posted through the mock seam. A Jakalburg product stores one flat
 * category slug with gender held separately, so there is no parent to pick —
 * and nothing it saved was ever persisted.
 */
export default function NewCategoryPage() {
  return <CategoryForm />;
}
