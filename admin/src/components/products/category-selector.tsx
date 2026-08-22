"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  parent: string;
  parentId?: string | null;
  productType?: string | null;
}

interface CategorySelectorProps {
  categories: Category[];
  value?: string;
  onChange: (value: string) => void;
  allowSelectParent?: boolean;
  mainLabel?: string;
  subLabel?: string;
  mainPlaceholder?: string;
  subPlaceholder?: string;
}

export function CategorySelector({
  categories,
  value,
  onChange,
  allowSelectParent = false,
  mainLabel = "Main Link",
  subLabel = "Sub Link",
  mainPlaceholder = "Select Link",
  subPlaceholder = "Select Sub Link",
}: CategorySelectorProps) {
  const [mainCategory, setMainCategory] = React.useState<string>("");

  // Group categories by parentId
  const { roots, childrenMap } = React.useMemo(() => {
    const roots = categories
      .filter((c) => !c.parentId && !c.parent.includes(" - "))
      .sort((a, b) => a.parent.localeCompare(b.parent));
    const childrenMap: Record<string, Category[]> = {};

    categories.forEach((cat) => {
      if (cat.parentId) {
        if (!childrenMap[cat.parentId]) childrenMap[cat.parentId] = [];
        childrenMap[cat.parentId].push(cat);
      }
      // Legacy handling
      else if (cat.parent.includes(" - ")) {
        const [main, sub] = cat.parent.split(" - ");
        const mainCat = roots.find((r) => r.parent === main);
        if (mainCat) {
          if (!childrenMap[mainCat.id]) childrenMap[mainCat.id] = [];
          // Avoid duplicates if migrated
          if (!childrenMap[mainCat.id].find((c) => c.id === cat.id)) {
            childrenMap[mainCat.id].push(cat);
          }
        }
      }
    });

    // Sort children
    Object.keys(childrenMap).forEach((key) => {
      childrenMap[key].sort((a, b) => a.parent.localeCompare(b.parent));
    });

    return { roots, childrenMap };
  }, [categories]);

  // Initialize state based on value
  React.useEffect(() => {
    if (value) {
      const selected = categories.find(
        (c) => c.id === value || c.parent === value,
      );

      if (selected) {
        if (selected.parentId) {
          setMainCategory(selected.parentId);
        } else if (selected.parent.includes(" - ")) {
          const mainName = selected.parent.split(" - ")[0];
          const main = roots.find((r) => r.parent === mainName);
          if (main) setMainCategory(main.id);
        } else {
          setMainCategory(selected.id);
        }
      }
    }
  }, [value, categories, roots]);

  const handleMainChange = (mainId: string) => {
    setMainCategory(mainId);
    const subs = childrenMap[mainId];
    if (!subs || subs.length === 0 || allowSelectParent) {
      onChange(mainId);
    } else {
      onChange("");
    }
  };

  const handleSubChange = (subId: string) => {
    onChange(subId);
  };

  const subCategories = mainCategory ? childrenMap[mainCategory] || [] : [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {mainLabel}
        </label>
        <Select value={mainCategory} onValueChange={handleMainChange}>
          <SelectTrigger>
            <SelectValue placeholder={mainPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {roots.map((root) => (
              <SelectItem key={root.id} value={root.id}>
                {root.parent}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {subCategories.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {subLabel}
          </label>
          <Select value={value} onValueChange={handleSubChange}>
            <SelectTrigger>
              <SelectValue placeholder={subPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {subCategories.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {sub.parent.replace(/^( - |- )/, "")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
