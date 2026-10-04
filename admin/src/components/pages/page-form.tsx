"use client";

import { ReactNode, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  pagesService,
  FaqSection,
  PageDto,
} from "@/services/pages.service";
import "react-quill-new/dist/quill.snow.css";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";

// Quill touches the DOM on import, so keep it off the server render.
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

// The one slug whose body is structured Q&A rather than rich text.
const FAQ_SLUG = "faq";

const emptyItem = () => ({ question: "", answer: "" });
const emptySection = (): FaqSection => ({
  heading: "",
  items: [emptyItem()],
});

const getErrorMessage = (error: unknown) => {
  const apiError = error as {
    response?: { data?: { message?: unknown } };
    message?: unknown;
  };
  const raw = apiError.response?.data?.message || apiError.message;
  if (Array.isArray(raw)) return raw.join(", ");
  return typeof raw === "string"
    ? raw
    : "Something went wrong. Please try again.";
};

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must only contain lowercase letters, numbers, and hyphens",
    ),
  content: z.string(),
  status: z.enum(["active", "inactive"]),
});

type FormValues = z.infer<typeof formSchema>;

interface PageFormProps {
  initialData?: FormValues & { id?: string; faqSections?: FaqSection[] | null };
  isEdit?: boolean;
  extraFields?: ReactNode;
  transformValues?: (values: FormValues) => Promise<FormValues> | FormValues;
  /**
   * Saved alongside the page, for content a page owns that doesn't live on the
   * Page record — the About hero image, for instance. Runs before the page
   * write, so if it throws nothing is saved and the user stays on the form.
   */
  extraSave?: () => Promise<void>;
}

export default function PageForm({
  initialData,
  isEdit = false,
  extraFields,
  transformValues,
  extraSave,
}: PageFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // FAQ content is held as structured state, NOT serialised into `content`
  // HTML the way the kaybykhushie reference does — so editing can't mangle it.
  const [sections, setSections] = useState<FaqSection[]>(() =>
    initialData?.faqSections?.length
      ? initialData.faqSections
      : [emptySection()],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ?? {
      title: "",
      slug: "",
      content: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (!initialData) return;
    form.reset({
      title: initialData.title,
      slug: initialData.slug,
      content: initialData.content,
      status: initialData.status,
    });
    if (initialData.faqSections?.length) setSections(initialData.faqSections);
  }, [form, initialData]);

  const isFaqPage = form.watch("slug") === FAQ_SLUG;

  // ---- FAQ section helpers -------------------------------------------------
  const patchSection = (index: number, patch: Partial<FaqSection>) =>
    setSections((current) =>
      current.map((section, i) =>
        i === index ? { ...section, ...patch } : section,
      ),
    );

  const moveSection = (index: number, delta: number) =>
    setSections((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const removeSection = (index: number) =>
    setSections((current) =>
      current.length === 1
        ? [emptySection()]
        : current.filter((_, i) => i !== index),
    );

  const patchItem = (
    sectionIndex: number,
    itemIndex: number,
    patch: Partial<{ question: string; answer: string }>,
  ) =>
    setSections((current) =>
      current.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              items: section.items.map((item, j) =>
                j === itemIndex ? { ...item, ...patch } : item,
              ),
            }
          : section,
      ),
    );

  const addItem = (sectionIndex: number) =>
    patchSection(sectionIndex, {
      items: [...sections[sectionIndex].items, emptyItem()],
    });

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    const items = sections[sectionIndex].items;
    patchSection(sectionIndex, {
      items:
        items.length === 1
          ? [emptyItem()]
          : items.filter((_, j) => j !== itemIndex),
    });
  };

  /** Drops blank headings and blank Q&A rows before saving. */
  const cleanSections = (): FaqSection[] =>
    sections
      .map((section) => ({
        heading: section.heading.trim(),
        items: section.items
          .map((item) => ({
            question: item.question.trim(),
            answer: item.answer.trim(),
          }))
          .filter((item) => item.question && item.answer),
      }))
      .filter((section) => section.heading && section.items.length > 0);

  async function onSubmit(values: FormValues) {
    const faqSections = isFaqPage ? cleanSections() : undefined;

    if (isFaqPage && faqSections!.length === 0) {
      toast.error("Add at least one heading with a question and answer");
      return;
    }
    if (!isFaqPage && values.content.trim().length < 10) {
      form.setError("content", {
        message: "Content must be at least 10 characters",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (extraSave) await extraSave();

      const base = transformValues ? await transformValues(values) : values;
      const payload: PageDto = { ...base, ...(faqSections ? { faqSections } : {}) };

      if (isEdit && initialData?.id) {
        await pagesService.update(initialData.id, payload);
        toast.success("Page updated successfully");
      } else {
        await pagesService.create(payload);
        toast.success("Page created successfully");
      }
      router.push("/website/pages");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save page", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Page Title"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (!isEdit) {
                            const slug = e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/(^-|-$)+/g, "");
                            form.setValue("slug", slug);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="page-slug" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      This is the storefront URL — /{field.value || "page-slug"}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Inactive pages are hidden from the storefront.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isFaqPage ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">FAQ sections</h3>
                  <p className="text-sm text-muted-foreground">
                    Each heading becomes a group on the storefront, with its
                    questions listed underneath it.
                  </p>
                </div>

                {sections.map((section, sectionIndex) => (
                  <Card key={sectionIndex} className="border-muted">
                    <CardContent className="space-y-4 pt-6">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-2">
                          <FormLabel>Heading</FormLabel>
                          <Input
                            value={section.heading}
                            onChange={(e) =>
                              patchSection(sectionIndex, {
                                heading: e.target.value,
                              })
                            }
                            placeholder="e.g. Orders"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => moveSection(sectionIndex, -1)}
                          disabled={sectionIndex === 0}
                          aria-label="Move section up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => moveSection(sectionIndex, 1)}
                          disabled={sectionIndex === sections.length - 1}
                          aria-label="Move section down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSection(sectionIndex)}
                          aria-label="Remove section"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-3 border-l-2 pl-4">
                        {section.items.map((item, itemIndex) => (
                          <div
                            key={itemIndex}
                            className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                          >
                            <div className="space-y-2">
                              <FormLabel className="text-xs">
                                Question {itemIndex + 1}
                              </FormLabel>
                              <Input
                                value={item.question}
                                onChange={(e) =>
                                  patchItem(sectionIndex, itemIndex, {
                                    question: e.target.value,
                                  })
                                }
                                placeholder="Enter question"
                              />
                            </div>
                            <div className="space-y-2">
                              <FormLabel className="text-xs">Answer</FormLabel>
                              <Textarea
                                value={item.answer}
                                onChange={(e) =>
                                  patchItem(sectionIndex, itemIndex, {
                                    answer: e.target.value,
                                  })
                                }
                                placeholder="Enter answer"
                                rows={3}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="self-end"
                              onClick={() => removeItem(sectionIndex, itemIndex)}
                              aria-label={`Remove question ${itemIndex + 1}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addItem(sectionIndex)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add question
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setSections((current) => [...current, emptySection()])
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add heading
                  </Button>
                </div>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <div className="mb-12 h-96">
                        <ReactQuill
                          theme="snow"
                          value={field.value}
                          onChange={field.onChange}
                          className="h-full"
                          modules={{
                            toolbar: [
                              [{ header: [1, 2, 3, false] }],
                              [
                                "bold",
                                "italic",
                                "underline",
                                "strike",
                                "blockquote",
                              ],
                              [
                                { list: "ordered" },
                                { list: "bullet" },
                                { indent: "-1" },
                                { indent: "+1" },
                              ],
                              ["link", "image"],
                              ["clean"],
                            ],
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {extraFields}

            <div className="flex justify-end space-x-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Update Page" : "Create Page"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
