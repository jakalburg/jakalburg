"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { websiteService, type WebsiteHomeSection } from "@/services";
import useAxiosAuth from "@/hooks/use-axios-auth";
import {
  RefreshCw,
  Save,
  ArrowDown,
  ArrowUp,
  Power,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { HeroSliderConfigModal } from "@/components/home-setup/hero-slider-config";
import { EssentialsFeatureConfigModal } from "@/components/home-setup/essentials-feature-config";
import { FooterConfigModal } from "@/components/home-setup/footer-config";
import { AnnouncementBarConfigModal } from "@/components/home-setup/announcement-bar-config";

/**
 * Website → Home Setup: the storefront's home page, section by section.
 *
 * Every row here is a block the storefront actually renders (the Footer row is
 * the one exception — it carries the site-wide footer background, which is
 * configured here because it belongs with the rest of the layout). Enabling,
 * reordering and retitling a section changes the live page.
 *
 * The canonical list lives in `server/src/website/home-sections.defaults.ts`;
 * "Sync to site" adds anything missing and removes rows the storefront has no
 * renderer for.
 */

/** Friendly names for the section types the storefront renders. */
const SECTION_DISPLAY_NAMES: Record<string, string> = {
  AnnouncementBar: "Announcement Bar",
  HeroSlider: "Hero",
  JustArrived: "New Arrivals Row",
  ShopByMood: "Shop by Mood",
  EssentialsFeature: "Essentials Feature",
  EverydayEdit: "Everyday Edit Row",
  Footer: "Footer",
};

/** One line of orientation per section, so the list isn't guesswork. */
const SECTION_HINTS: Record<string, string> = {
  AnnouncementBar: "The thin strip above the header — shows on every page.",
  HeroSlider: "The top of the page — slide images and their links.",
  JustArrived: "A row of the four newest products.",
  ShopByMood: "Three collection tiles.",
  EssentialsFeature: "The editorial band: image, paragraph and button.",
  EverydayEdit: "A row of four essentials.",
  Footer: "Site-wide footer background image.",
};

/**
 * Neither the Announcement Bar nor the Footer is a home-page block — both are
 * site-wide chrome drawn by SiteLayout — so page-level controls don't apply.
 */
const LAYOUT_CONTROL_TYPES = [
  "HeroSlider",
  "JustArrived",
  "ShopByMood",
  "EssentialsFeature",
  "EverydayEdit",
];

/** Sections that have no heading/eyebrow on the storefront. */
const NO_HEADING_TYPES = ["AnnouncementBar", "HeroSlider", "Footer"];

export function HomeSetupTab() {
  const api = useAxiosAuth();
  const queryClient = useQueryClient();
  const [localSections, setLocalSections] = useState<WebsiteHomeSection[]>([]);

  // Config modals — only three section types have settings beyond the inline
  // heading fields and the toggles on the row.
  const [sliderConfigOpen, setSliderConfigOpen] = useState(false);
  const [activeSliderSection, setActiveSliderSection] =
    useState<WebsiteHomeSection | null>(null);

  const [essentialsConfigOpen, setEssentialsConfigOpen] = useState(false);
  const [activeEssentialsSection, setActiveEssentialsSection] =
    useState<WebsiteHomeSection | null>(null);

  const [announcementConfigOpen, setAnnouncementConfigOpen] = useState(false);
  const [activeAnnouncementSection, setActiveAnnouncementSection] =
    useState<WebsiteHomeSection | null>(null);

  const [footerConfigOpen, setFooterConfigOpen] = useState(false);
  const [activeFooterSection, setActiveFooterSection] =
    useState<WebsiteHomeSection | null>(null);

  const {
    data: sections = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["home-sections"],
    queryFn: () => websiteService(api).getAllHomeSections(),
  });

  useEffect(() => {
    if (sections.length > 0) {
      setLocalSections([...sections].sort((a, b) => a.order - b.order));
    }
  }, [sections]);

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<WebsiteHomeSection>;
    }) => websiteService(api).updateHomeSection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-sections"] });
    },
    onError: () => {
      toast.error("Failed to update section");
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => websiteService(api).seedHomeSections(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["home-sections"] });
      const added = result?.seeded ?? 0;
      const removed = result?.removed ?? 0;
      if (!added && !removed) {
        toast.success("Already in sync with the site.");
      } else {
        toast.success(
          [
            added ? `${added} section${added === 1 ? "" : "s"} restored` : "",
            removed
              ? `${removed} unused section${removed === 1 ? "" : "s"} removed`
              : "",
          ]
            .filter(Boolean)
            .join(", "),
        );
      }
    },
    onError: () => {
      toast.error("Failed to sync sections");
    },
  });

  const handleToggle = async (id: string, currentStatus: boolean) => {
    toast.promise(
      updateMutation.mutateAsync({ id, data: { enabled: !currentStatus } }),
      {
        loading: "Updating status...",
        success: "Section visibility updated",
        error: "Failed to update visibility",
      },
    );
  };

  const handlePaddingToggle = async (
    id: string,
    field: "paddingTop" | "paddingBottom",
    currentValue: boolean,
  ) => {
    toast.promise(
      updateMutation.mutateAsync({ id, data: { [field]: !currentValue } }),
      {
        loading: `Updating ${field === "paddingTop" ? "top" : "bottom"} padding...`,
        success: "Padding updated",
        error: "Failed to update padding",
      },
    );
  };

  const moveOrder = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localSections.length) return;

    const newSections = [...localSections];
    const temp = newSections[index];
    newSections[index] = newSections[newIndex];
    newSections[newIndex] = temp;

    const updatedPayload = newSections.map((sec, idx) => ({
      ...sec,
      order: idx + 1,
    }));

    setLocalSections(updatedPayload);

    for (const sec of updatedPayload) {
      if (sec.order !== sections.find((s) => s.id === sec.id)?.order) {
        updateMutation.mutate({ id: sec.id, data: { order: sec.order } });
      }
    }
    toast.success("Order updated!");
  };

  const patchLocal = (id: string, patch: Partial<WebsiteHomeSection>) =>
    setLocalSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, ...patch } : sec)),
    );

  const saveField = (
    id: string,
    field: "title" | "eyebrow" | "subtitle",
    value: string | undefined,
  ) => {
    toast.promise(
      updateMutation.mutateAsync({ id, data: { [field]: value ?? "" } }),
      {
        loading: `Saving ${field}...`,
        success: `${field[0].toUpperCase()}${field.slice(1)} saved successfully`,
        error: `Failed to save ${field}`,
      },
    );
  };

  const saveConfig = async (
    section: WebsiteHomeSection | null,
    data: unknown,
    label: string,
    extra?: Partial<WebsiteHomeSection>,
  ) => {
    if (!section) return;
    const promise = updateMutation.mutateAsync({
      id: section.id,
      data: { data, ...extra },
    });
    toast.promise(promise, {
      loading: `Saving ${label} configuration...`,
      success: `${label} configuration saved successfully`,
      error: "Failed to save configuration",
    });
    await promise;
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading configuration...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load configuration.
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      {localSections.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-card">
          <h3 className="text-lg font-semibold mb-2">No Sections Found</h3>
          <p className="text-muted-foreground mb-4">
            It looks like your database doesn&apos;t have the home page
            configuration yet.
          </p>
          <Button
            onClick={() => seedMutation.mutate()}
            className="gap-2"
            disabled={seedMutation.isPending}
          >
            <RefreshCw
              className={`w-4 h-4 ${seedMutation.isPending ? "animate-spin" : ""}`}
            />
            {seedMutation.isPending
              ? "Setting up..."
              : "Set Up Home Page Sections"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center bg-muted/30 p-4 border rounded-xl shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Sections out of step?
              </h3>
              <p className="text-xs text-muted-foreground">
                Restores any section missing from the list, and removes rows the
                storefront no longer renders. Your own titles and settings are
                kept.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="w-full md:w-auto"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-2 ${seedMutation.isPending ? "animate-spin" : ""}`}
              />
              Sync to site
            </Button>
          </div>

          {localSections.map((section, index) => {
            const hasHeadings = !NO_HEADING_TYPES.includes(section.type);
            const hasLayoutControls = LAYOUT_CONTROL_TYPES.includes(
              section.type,
            );
            const isConfigurable = [
              "AnnouncementBar",
              "HeroSlider",
              "EssentialsFeature",
              "Footer",
            ].includes(section.type);

            return (
              <div
                key={section.id}
                className={`flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-xl bg-card shadow-sm transition-all gap-4 md:gap-0 ${!section.enabled && "opacity-60 grayscale-[50%]"}`}
              >
                {/* Order controls and type info */}
                <div className="flex items-start gap-3 md:gap-6 flex-1">
                  <div className="flex flex-col gap-1 items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === 0}
                      onClick={() => moveOrder(index, "up")}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                      {section.order}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === localSections.length - 1}
                      onClick={() => moveOrder(index, "down")}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-1 flex-1 md:w-[220px]">
                    <h4 className="font-semibold text-lg">
                      {SECTION_DISPLAY_NAMES[section.type] || section.type}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {SECTION_HINTS[section.type]}
                    </p>
                    <Badge
                      variant={section.enabled ? "default" : "secondary"}
                      className="w-fit mt-1"
                    >
                      {section.enabled ? "Visible" : "Hidden"}
                    </Badge>
                  </div>
                </div>

                {/* Headings — only for sections that show one */}
                <div className="flex flex-col flex-1 gap-2">
                  {hasHeadings ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Input
                          value={section.eyebrow || ""}
                          onChange={(e) =>
                            patchLocal(section.id, { eyebrow: e.target.value })
                          }
                          placeholder="Eyebrow (e.g. New arrivals)"
                          disabled={!section.enabled}
                          className="text-xs h-8"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            saveField(section.id, "eyebrow", section.eyebrow)
                          }
                          disabled={!section.enabled}
                          className="flex-shrink-0 h-8 w-8"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={section.title || ""}
                          onChange={(e) =>
                            patchLocal(section.id, { title: e.target.value })
                          }
                          placeholder="Heading (e.g. Just arrived)"
                          disabled={!section.enabled}
                          className="text-sm font-medium"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            saveField(section.id, "title", section.title)
                          }
                          disabled={!section.enabled}
                          className="flex-shrink-0"
                        >
                          <Save className="w-4 h-4 text-primary" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {section.type === "HeroSlider"
                        ? "Copy is part of the slide artwork — configure the slides instead."
                        : "No heading — configure the background image."}
                    </p>
                  )}
                </div>

                {/* Padding toggles and actions */}
                <div className="flex flex-row flex-wrap items-center justify-center gap-2">
                  {hasLayoutControls && (
                    <>
                      <div className="flex flex-col items-center gap-1 min-w-[50px]">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          PT
                        </span>
                        <Switch
                          checked={section.paddingTop !== false}
                          onCheckedChange={() =>
                            handlePaddingToggle(
                              section.id,
                              "paddingTop",
                              section.paddingTop !== false,
                            )
                          }
                          disabled={!section.enabled}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1 min-w-[50px]">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          PB
                        </span>
                        <Switch
                          checked={section.paddingBottom !== false}
                          onCheckedChange={() =>
                            handlePaddingToggle(
                              section.id,
                              "paddingBottom",
                              section.paddingBottom !== false,
                            )
                          }
                          disabled={!section.enabled}
                        />
                      </div>
                    </>
                  )}

                  {isConfigurable && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Explicit per type: a trailing `else` would silently
                        // open the Footer modal for any new configurable
                        // section someone adds later.
                        if (section.type === "AnnouncementBar") {
                          setActiveAnnouncementSection(section);
                          setAnnouncementConfigOpen(true);
                        } else if (section.type === "HeroSlider") {
                          setActiveSliderSection(section);
                          setSliderConfigOpen(true);
                        } else if (section.type === "EssentialsFeature") {
                          setActiveEssentialsSection(section);
                          setEssentialsConfigOpen(true);
                        } else if (section.type === "Footer") {
                          setActiveFooterSection(section);
                          setFooterConfigOpen(true);
                        }
                      }}
                      className="gap-2 w-full md:w-auto text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Configure
                    </Button>
                  )}

                  <Button
                    variant={section.enabled ? "destructive" : "default"}
                    onClick={() => handleToggle(section.id, section.enabled)}
                    className="gap-2 w-full md:w-[120px]"
                  >
                    <Power className="w-4 h-4" />
                    {section.enabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeSliderSection && (
        <HeroSliderConfigModal
          open={sliderConfigOpen}
          onOpenChange={setSliderConfigOpen}
          sectionData={activeSliderSection.data}
          sectionFullBleed={activeSliderSection.fullBleed}
          onSave={(data, fullBleed) =>
            saveConfig(activeSliderSection, data, "Hero", { fullBleed })
          }
        />
      )}

      {activeEssentialsSection && (
        <EssentialsFeatureConfigModal
          open={essentialsConfigOpen}
          onOpenChange={setEssentialsConfigOpen}
          sectionData={activeEssentialsSection.data}
          onSave={(data) =>
            saveConfig(activeEssentialsSection, data, "Essentials Feature")
          }
        />
      )}

      {activeAnnouncementSection && (
        <AnnouncementBarConfigModal
          open={announcementConfigOpen}
          onOpenChange={setAnnouncementConfigOpen}
          sectionData={activeAnnouncementSection.data}
          onSave={(data) =>
            saveConfig(activeAnnouncementSection, data, "Announcement Bar")
          }
        />
      )}

      {activeFooterSection && (
        <FooterConfigModal
          open={footerConfigOpen}
          onOpenChange={setFooterConfigOpen}
          sectionData={activeFooterSection.data}
          onSave={(data) => saveConfig(activeFooterSection, data, "Footer")}
        />
      )}
    </div>
  );
}
