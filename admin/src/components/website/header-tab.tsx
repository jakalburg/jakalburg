"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/data-table";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import {
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import { useCategories } from "@/hooks/use-categories";
import { CategorySelector } from "@/components/products/category-selector";
import { ImageUpload } from "@/components/products/image-upload";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { uploadService } from "@/services/upload.service";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MenuItem {
  id: string;
  title: string;
  link: string;
  children?: MenuItem[];
}

function EditLinkDialog({
  item,
  allMenuItems,
  onSave,
}: {
  item: MenuItem;
  allMenuItems: MenuItem[];
  onSave: (updated: { title: string; link: string }) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [link, setLink] = useState(item.link);
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    const isDuplicate = (items: MenuItem[]): boolean => {
      for (const curr of items) {
        if (curr.id !== item.id) {
          if (curr.title === title || curr.link === link) return true;
        }
        if (curr.children && isDuplicate(curr.children)) return true;
      }
      return false;
    };

    if (isDuplicate(allMenuItems)) {
      toast.error(`"${title}" or this link already exists in the menu`);
      return;
    }

    onSave({ title, link });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Link</DialogTitle>
          <DialogDescription>
            Update the title and path for this header link.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Link Path</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HeaderTab() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const { data: categories } = useCategories();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [includeSubcategories, setIncludeSubcategories] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );

  const [homeCategory, setHomeCategory] = useState("");
  const [homeImages, setHomeImages] = useState<any[]>([]);
  const [isSavingImages, setIsSavingImages] = useState(false);
  const api = useAxiosAuth();

  useEffect(() => {
    if (settings) {
      setHomeCategory(settings.homeCategory || "");
      if (settings.headerData) {
        let data = settings.headerData;
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch (e) {
            data = [];
          }
        }
        setMenuItems(Array.isArray(data) ? data : []);
      }
      if (settings.homeCategoryDatas) {
        let data = settings.homeCategoryDatas;
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch (e) {
            data = [];
          }
        }
        const validImages = (Array.isArray(data) ? data : [])
          .filter((img) => img && img.url)
          .slice(0, 4);
        setHomeImages(validImages);
      }
    }
  }, [settings]);

  const handleSaveHomeCategory = () => {
    updateSettings.mutate(
      { homeCategory },
      {
        onSuccess: () => {
          // toast.success("Homepage Category updated");
        },
        onError: () => {
          toast.error("Failed to update Homepage Category");
        },
      },
    );
  };

  const handleSaveHomeImages = async (newImages: any[]) => {
    const links = newImages
      .map((img) => img.link)
      .filter((link) => link && link.trim() !== "");
    const uniqueLinks = new Set(links);
    if (uniqueLinks.size !== links.length) {
      toast.error(
        "Duplicate link paths found in home images. Each image should have a unique link.",
      );
      return;
    }

    setIsSavingImages(true);
    try {
      const filesToUpload = newImages
        .filter((img) => img.file)
        .map((img) => img.file);
      let finalImages = newImages.filter((img) => !img.file);

      if (filesToUpload.length > 0) {
        const uploadPromises = newImages
          .filter((img) => img.file)
          .map(async (img) => {
            const res = await uploadService(api).uploadImage(img.file);
            return {
              id: res.id,
              url: res.publicUrl,
              link: img.link || "",
            };
          });
        const uploadedData = await Promise.all(uploadPromises);
        finalImages = [...finalImages, ...uploadedData];
      }

      const limitedImages = finalImages.slice(0, 4);

      updateSettings.mutate(
        { homeCategoryDatas: limitedImages },
        {
          onSuccess: () => {
            setHomeImages(limitedImages);
            toast.success("Home dropdown images updated");
          },
          onError: () => {
            toast.error("Failed to update home dropdown images");
          },
        },
      );
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images");
    } finally {
      setIsSavingImages(false);
    }
  };

  const updateImageField = (id: string, field: string, value: string) => {
    const updated = homeImages.map((img) =>
      img.id === id ? { ...img, [field]: value } : img,
    );
    setHomeImages(updated);
  };

  const triggerSaveImages = () => {
    handleSaveHomeImages(homeImages);
  };

  const saveSettings = (items: MenuItem[]) => {
    updateSettings.mutate(
      {
        headerData: items,
      },
      {
        onSuccess: () => {
          // toast.success("Header menu updated");
        },
        onError: () => {
          toast.error("Failed to update header menu");
        },
      },
    );
  };

  const handleAdd = () => {
    if (!selectedCategory) return;

    const category = categories?.find((c: any) => c.id === selectedCategory);
    if (!category) return;

    const isDuplicateTopLevel = (title: string, link: string) => {
      return menuItems.some(
        (item) => item.title === title || item.link === link,
      );
    };

    const isDuplicateChild = (
      parent: MenuItem,
      title: string,
      link: string,
    ) => {
      return parent.children?.some(
        (child) => child.title === title || child.link === link,
      );
    };

    if (category.parentId) {
      const parent = categories?.find((c: any) => c.id === category.parentId);
      if (!parent) return;

      const childTitle = category.parent.replace(/^( - |- )/, "");
      const childLink = `/shop?category=${parent.parent
        .toLowerCase()
        .replace(/\s+/g, "-")}&subcategory=${childTitle
        .toLowerCase()
        .replace(/\s+/g, "-")}`;

      const existingParentIndex = menuItems.findIndex(
        (item) => item.title === parent.parent,
      );

      if (existingParentIndex >= 0) {
        const updatedItems = [...menuItems];
        const existingParent = { ...updatedItems[existingParentIndex] };

        if (isDuplicateChild(existingParent, childTitle, childLink)) {
          toast.error(
            `"${childTitle}" or this link already exists in this category`,
          );
          return;
        }

        const newChild = {
          id: crypto.randomUUID(),
          title: childTitle,
          link: childLink,
        };

        existingParent.children = existingParent.children
          ? [...existingParent.children, newChild]
          : [newChild];
        updatedItems[existingParentIndex] = existingParent;

        setMenuItems(updatedItems);
        saveSettings(updatedItems);
        toast.success(`"${childTitle}" added to ${parent.parent}`);
      } else {
        const parentTitle = parent.parent;
        const parentLink = `/shop?category=${parentTitle
          .toLowerCase()
          .replace(/\s+/g, "-")}`;

        if (isDuplicateTopLevel(parentTitle, parentLink)) {
          toast.error(
            `"${parentTitle}" or this link already exists in the menu`,
          );
          return;
        }

        const newItem = {
          id: crypto.randomUUID(),
          title: parentTitle,
          link: parentLink,
          children: [
            {
              id: crypto.randomUUID(),
              title: childTitle,
              link: childLink,
            },
          ],
        };
        const updatedItems = [...menuItems, newItem];
        setMenuItems(updatedItems);
        saveSettings(updatedItems);
        toast.success(`"${parentTitle}" and "${childTitle}" added`);
      }
    } else {
      const parentTitle = category.parent;
      const parentLink = `/shop?category=${parentTitle
        .toLowerCase()
        .replace(/\s+/g, "-")}`;

      const existingParentIndex = menuItems.findIndex(
        (item) => item.title === parentTitle,
      );

      if (existingParentIndex >= 0) {
        const updatedItems = [...menuItems];
        const existingParent = { ...updatedItems[existingParentIndex] };

        if (includeSubcategories) {
          const subCats = categories?.filter(
            (c: any) => c.parentId === category.id,
          );
          if (subCats && subCats.length > 0) {
            const newChildren = subCats
              .map((sub: any) => {
                const subTitle = sub.parent.replace(/^( - |- )/, "");
                return {
                  id: crypto.randomUUID(),
                  title: subTitle,
                  link: `/shop?category=${parentTitle
                    .toLowerCase()
                    .replace(/\s+/g, "-")}&subcategory=${subTitle
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`,
                };
              })
              .filter(
                (newChild) =>
                  !isDuplicateChild(
                    existingParent,
                    newChild.title,
                    newChild.link,
                  ),
              );

            if (newChildren.length > 0) {
              existingParent.children = existingParent.children
                ? [...existingParent.children, ...newChildren]
                : newChildren;
              updatedItems[existingParentIndex] = existingParent;
              setMenuItems(updatedItems);
              saveSettings(updatedItems);
              toast.success(
                `Added ${newChildren.length} new subcategories to ${parentTitle}`,
              );
            } else {
              toast.info("All subcategories already exist for this category");
            }
          } else {
            toast.info(`"${parentTitle}" is already in the menu`);
          }
        } else {
          toast.info(`"${parentTitle}" is already in the menu`);
        }
      } else {
        if (menuItems.some((item) => item.link === parentLink)) {
          toast.error(
            `A menu item with the link "${parentLink}" already exists`,
          );
          return;
        }

        const newItem: MenuItem = {
          id: crypto.randomUUID(),
          title: parentTitle,
          link: parentLink,
          children: [],
        };

        if (includeSubcategories) {
          const subCats = categories?.filter(
            (c: any) => c.parentId === category.id,
          );
          if (subCats && subCats.length > 0) {
            newItem.children = subCats.map((sub: any) => {
              const subTitle = sub.parent.replace(/^( - |- )/, "");
              return {
                id: crypto.randomUUID(),
                title: subTitle,
                link: `/shop?category=${parentTitle.toLowerCase().replace(/\s+/g, "-")}&subcategory=${subTitle
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`,
              };
            });
          }
        }
        const updatedItems = [...menuItems, newItem];
        setMenuItems(updatedItems);
        saveSettings(updatedItems);
        toast.success(`"${parentTitle}" added to menu`);
      }
    }

    setSelectedCategory("");
    setIncludeSubcategories(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);

    let updatedItems = menuItems.filter((item) => item.id !== id);

    if (updatedItems.length === menuItems.length) {
      updatedItems = menuItems.map((item) => ({
        ...item,
        children: item.children
          ? item.children.filter((child) => child.id !== id)
          : [],
      }));
    }

    setMenuItems(updatedItems);
    saveSettings(updatedItems);
    setDeletingId(null);
  };

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredCategories = useMemo(() => {
    if (!categories) return [];

    const existingTitles = new Set<string>();
    const existingLinks = new Set<string>();

    const extractInfo = (items: MenuItem[]) => {
      items.forEach((item) => {
        existingTitles.add(item.title);
        existingLinks.add(item.link);
        if (item.children) extractInfo(item.children);
      });
    };
    extractInfo(menuItems);

    return categories.filter((cat: any) => {
      if (cat.parentId) {
        const title = cat.parent.replace(/^( - |- )/, "");
        const parent = categories.find((c: any) => c.id === cat.parentId);
        if (!parent) return true;

        const link = `/shop?category=${parent.parent
          .toLowerCase()
          .replace(/\s+/g, "-")}&subcategory=${title
          .toLowerCase()
          .replace(/\s+/g, "-")}`;

        return !existingTitles.has(title) && !existingLinks.has(link);
      }

      const title = cat.parent;
      const link = `/shop?category=${title.toLowerCase().replace(/\s+/g, "-")}`;

      if (!existingTitles.has(title) && !existingLinks.has(link)) return true;

      const menuParent = menuItems.find((m) => m.title === title);
      if (!menuParent) return true;

      const subInDb = categories.filter((c: any) => c.parentId === cat.id);
      if (subInDb.length === 0) return false;

      const missingSub = subInDb.some((sub: any) => {
        const subTitle = sub.parent.replace(/^( - |- )/, "");
        const subLink = `${link}&subcategory=${subTitle
          .toLowerCase()
          .replace(/\s+/g, "-")}`;
        return !existingTitles.has(subTitle) && !existingLinks.has(subLink);
      });

      return missingSub;
    });
  }, [categories, menuItems]);

  const tableData = (() => {
    const flat: any[] = [];
    menuItems.forEach((item) => {
      flat.push({
        ...item,
        isMain: true,
        hasChildren: item.children && item.children.length > 0,
      });
      if (expandedItems[item.id] && item.children) {
        item.children.forEach((child) => {
          flat.push({ ...child, isMain: false });
        });
      }
    });
    return flat;
  })();

  const columns = [
    {
      header: "Title",
      accessorKey: "title",
      className: "w-[300px]",
      cell: (item: any) => {
        if (item.isMain) {
          return (
            <div className="flex items-center gap-2">
              {item.hasChildren && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0"
                  onClick={() => toggleExpand(item.id)}
                >
                  {expandedItems[item.id] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              {!item.hasChildren && <span className="w-6" />}
              <span className="font-medium">{item.title}</span>
              {item.hasChildren && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({item.children.length} sub)
                </span>
              )}
            </div>
          );
        } else {
          return (
            <div className="flex items-center gap-2 ml-8">
              <span>{item.title}</span>
            </div>
          );
        }
      },
    },
    {
      header: "Link",
      accessorKey: "link",
    },
    {
      header: "Actions",
      className: "w-[120px]",
      cell: (item: any) => (
        <div className="flex items-center gap-1">
          <EditLinkDialog
            item={item}
            allMenuItems={menuItems}
            onSave={(updated) => {
              const updateInTree = (items: MenuItem[]): MenuItem[] => {
                return items.map((curr) => {
                  if (curr.id === item.id) {
                    return {
                      ...curr,
                      title: updated.title,
                      link: updated.link,
                    };
                  }
                  if (curr.children) {
                    return { ...curr, children: updateInTree(curr.children) };
                  }
                  return curr;
                });
              };
              const updatedItems = updateInTree(menuItems);
              setMenuItems(updatedItems);
              saveSettings(updatedItems);
            }}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the "{item.title}" link
                  {item.isMain ? " and its sub-links" : ""} from the header.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(item.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pt-4">
      <Card>
        <CardHeader>
          <CardTitle>Homepage Configuration</CardTitle>
          <CardDescription>
            Set the main category displayed on the homepage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 max-w-lg">
            <div className="space-y-2 flex-1">
              <Label htmlFor="homeCategory">Homepage Category</Label>
              <Input
                id="homeCategory"
                value={homeCategory}
                onChange={(e) => setHomeCategory(e.target.value)}
                placeholder="jewelry"
              />
              <p className="text-xs text-muted-foreground">
                This category controls the products shown in "New Arrivals",
                "Offer Products", etc.
              </p>
            </div>
            <Button
              onClick={handleSaveHomeCategory}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Home Dropdown Images</CardTitle>
          <CardDescription>
            Manage up to 4 featured images for the Home menu dropdown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Upload Images (Max 4)</Label>
            <ImageUpload
              images={homeImages}
              onChange={(imgs) => setHomeImages(imgs.slice(0, 4))}
              maxImages={4}
              showPrimary={false}
              showPreview={false}
            />
          </div>

          {homeImages.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 h-8">
                    <TableHead className="w-[50px] px-2 text-[10px] uppercase">
                      Image
                    </TableHead>
                    <TableHead className="text-[10px] uppercase">
                      Link Path
                    </TableHead>
                    <TableHead className="w-[40px] px-2 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {homeImages.slice(0, 4).map((img, index) => (
                    <TableRow key={img.id || index} className="h-12 text-xs">
                      <TableCell className="px-2">
                        <ImageShimmer
                          src={img.url}
                          alt=""
                          wrapperClassName="w-8 h-8 rounded border"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-xs font-mono"
                          value={img.link || ""}
                          onChange={(e) =>
                            updateImageField(img.id, "link", e.target.value)
                          }
                          placeholder="Enter path (e.g. /shop/category)"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            const updated = homeImages.filter(
                              (i) => i.id !== img.id,
                            );
                            setHomeImages(updated);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-muted-foreground">
              {homeImages.length} of 4 images uploaded
            </span>
            <Button
              onClick={triggerSaveImages}
              disabled={isSavingImages || updateSettings.isPending}
              size="sm"
            >
              {isSavingImages && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Menu Links</CardTitle>
            <CardDescription>
              Manage the main navigation categories.
            </CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-[500px]">
              <AlertDialogHeader>
                <AlertDialogTitle>Add New Header Link</AlertDialogTitle>
                <AlertDialogDescription>
                  Select a category to add to the navigation menu.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Category</Label>
                  <CategorySelector
                    categories={filteredCategories}
                    value={selectedCategory}
                    onChange={handleCategorySelect}
                    allowSelectParent={true}
                  />
                </div>

                {selectedCategory &&
                  categories?.find(
                    (c: any) => c.id === selectedCategory && !c.parentId,
                  ) && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="include-subcategories"
                        checked={includeSubcategories}
                        onCheckedChange={setIncludeSubcategories}
                      />
                      <Label htmlFor="include-subcategories">
                        Include All Subcategories
                      </Label>
                    </div>
                  )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setSelectedCategory("");
                  }}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleAdd}
                  disabled={!selectedCategory || updateSettings.isPending}
                >
                  Add to Menu
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <DataTable
              data={tableData}
              columns={columns}
              isLoading={isLoading}
              emptyMessage="No menu items added yet."
              getRowKey={(item) => item.id}
            />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : tableData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No menu items added yet.
              </div>
            ) : (
              tableData.map((item: any) => (
                <Card key={item.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {item.isMain && item.hasChildren && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpand(item.id)}
                            >
                              {expandedItems[item.id] ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {!item.isMain && (
                            <span className="w-6 text-muted-foreground">→</span>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">
                              {item.title}
                            </h4>
                            {item.isMain && item.hasChildren && (
                              <p className="text-xs text-muted-foreground">
                                {item.children.length} sub-links
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground break-all">
                      {item.link}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <EditLinkDialog
                        item={item}
                        allMenuItems={menuItems}
                        onSave={(updated) => {
                          const updateInTree = (
                            items: MenuItem[],
                          ): MenuItem[] => {
                            return items.map((curr) => {
                              if (curr.id === item.id) {
                                return {
                                  ...curr,
                                  title: updated.title,
                                  link: updated.link,
                                };
                              }
                              if (curr.children) {
                                return {
                                  ...curr,
                                  children: updateInTree(curr.children),
                                };
                              }
                              return curr;
                            });
                          };
                          const updatedItems = updateInTree(menuItems);
                          setMenuItems(updatedItems);
                          saveSettings(updatedItems);
                        }}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the "{item.title}" link
                              {item.isMain ? " and its sub-links" : ""} from the
                              header.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(item.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
