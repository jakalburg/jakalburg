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
import { pagesService } from "@/services/pages.service";
import "react-quill-new/dist/quill.snow.css";
import { Loader2, Plus, Trash2 } from "lucide-react";
import useAxiosAuth from "@/hooks/use-axios-auth";

// Dynamic import for React Quill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

type FaqItem = {
  question: string;
  answer: string;
};

const emptyFaqItem = (): FaqItem => ({ question: "", answer: "" });

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const plainTextToHtml = (value: string) =>
  escapeHtml(value.trim()).replace(/\n/g, "<br />");

const getErrorMessage = (error: unknown) => {
  const apiError = error as {
    response?: { data?: { message?: unknown } };
    message?: unknown;
  };

  return (
    apiError.response?.data?.message ||
    apiError.message ||
    "Something went wrong. Please try again."
  );
};

const buildFaqContent = (items: FaqItem[]) => {
  const faqMarkup = items
    .map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
    }))
    .filter((item) => item.question && item.answer)
    .map(
      (item) => `
          <div class="faq-page__item">
            <h3>${escapeHtml(item.question)}</h3>
            <p>${plainTextToHtml(item.answer)}</p>
          </div>`,
    )
    .join("");

  return `
        <div class="faq-page">
          
          <p>Find answers to common questions about our jewellery, orders, shipping, and more.</p>
          ${faqMarkup}
        </div>
        `;
};

const extractFaqItems = (content = ""): FaqItem[] => {
  if (typeof window === "undefined" || !content) {
    return [emptyFaqItem()];
  }

  const template = document.createElement("template");
  template.innerHTML = content;
  const faqContainer =
    template.content.querySelector(".faq-page") || template.content;
  const headings = Array.from(faqContainer.querySelectorAll("h3"));

  const items = headings
    .map((heading) => {
      const answerParts: string[] = [];
      let sibling = heading.nextElementSibling;

      while (sibling && sibling.tagName.toLowerCase() !== "h3") {
        if (!sibling.classList.contains("faq-page__item")) {
          answerParts.push((sibling.textContent || "").trim());
        }
        sibling = sibling.nextElementSibling;
      }

      const nestedAnswer = heading.parentElement?.classList.contains(
        "faq-page__item",
      )
        ? heading.parentElement.querySelector("p")?.textContent || ""
        : "";

      return {
        question: (heading.textContent || "").trim(),
        answer: (nestedAnswer || answerParts.join("\n")).trim(),
      };
    })
    .filter((item) => item.question || item.answer);

  return items.length ? items : [emptyFaqItem()];
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
  content: z.string().min(10, "Content must be at least 10 characters"),
  status: z.enum(["active", "inactive"]),
});

interface PageFormProps {
  initialData?: z.infer<typeof formSchema> & { id?: string };
  isEdit?: boolean;
  extraFields?: ReactNode;
  transformValues?: (
    values: z.infer<typeof formSchema>,
  ) => Promise<z.infer<typeof formSchema>> | z.infer<typeof formSchema>;
}

export default function PageForm({
  initialData,
  isEdit = false,
  extraFields,
  transformValues,
}: PageFormProps) {
  const router = useRouter();
  const api = useAxiosAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [faqItems, setFaqItems] = useState<FaqItem[]>(() =>
    initialData?.slug === "faqs"
      ? extractFaqItems(initialData.content)
      : [emptyFaqItem()],
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      title: "",
      slug: "",
      content: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
      if (initialData.slug === "faqs") {
        setFaqItems(extractFaqItems(initialData.content));
      }
    }
  }, [form, initialData]);

  const watchedSlug = form.watch("slug");
  const isFaqPage = watchedSlug === "faqs";

  useEffect(() => {
    if (isFaqPage) {
      form.setValue("content", buildFaqContent(faqItems), {
        shouldValidate: true,
      });
    }
  }, [faqItems, form, isFaqPage]);

  const updateFaqItem = (
    index: number,
    field: keyof FaqItem,
    value: string,
  ) => {
    setFaqItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addFaqItem = () => {
    setFaqItems((current) => [...current, emptyFaqItem()]);
  };

  const removeFaqItem = (index: number) => {
    setFaqItems((current) =>
      current.length === 1
        ? [emptyFaqItem()]
        : current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const pageValues = isFaqPage
        ? { ...values, content: buildFaqContent(faqItems) }
        : values;
      const finalValues = transformValues
        ? await transformValues(pageValues)
        : pageValues;

      if (isEdit && initialData?.id) {
        await pagesService(api).update(initialData.id, finalValues);
        toast.success("Page updated successfully");
      } else {
        await pagesService(api).create(finalValues);
        toast.success("Page created successfully");
      }
      router.push("/website/pages");
      router.refresh();
    } catch (error) {
      console.error(error);
      const message = getErrorMessage(error);
      toast.error("Failed to save page", {
        description:
          typeof message === "string" ? message : "Please try again.",
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
                            // Auto-generate slug from title
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {isFaqPage ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">FAQ Items</h3>
                    <p className="text-sm text-muted-foreground">
                      Add each question and answer separately.
                    </p>
                  </div>
                </div>

                {faqItems.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="space-y-4 pt-6">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">FAQ {index + 1}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFaqItem(index)}
                          aria-label={`Remove FAQ ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <FormLabel>Question</FormLabel>
                          <Input
                            value={item.question}
                            onChange={(event) =>
                              updateFaqItem(
                                index,
                                "question",
                                event.target.value,
                              )
                            }
                            placeholder="Enter question"
                          />
                        </div>
                        <div className="space-y-2">
                          <FormLabel>Answer</FormLabel>
                          <Textarea
                            value={item.answer}
                            onChange={(event) =>
                              updateFaqItem(index, "answer", event.target.value)
                            }
                            placeholder="Enter answer"
                            rows={3}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={addFaqItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add FAQ
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => <input type="hidden" {...field} />}
                />
              </div>
            ) : (
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <div className="h-96 mb-12">
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
