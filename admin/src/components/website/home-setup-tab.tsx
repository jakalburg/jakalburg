"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { websiteService } from "@/services";
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
import { ShopCategoryConfigModal } from "@/components/home-setup/shop-category-config";
import { AnimatedBannerConfigModal } from "@/components/home-setup/animated-banner-config";
import { AgirlInKayConfigModal } from "@/components/home-setup/agirl-in-kay-config";
import { GiftWrappingConfigModal } from "@/components/home-setup/gift-wrapping-config";
import { CategoryStoriesConfigModal } from "@/components/home-setup/category-stories-config";
import { ReviewsConfigModal } from "@/components/home-setup/reviews-config";
import { FounderConfigModal } from "@/components/home-setup/founder-config";
import { FooterConfigModal } from "@/components/home-setup/footer-config";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Layers } from "lucide-react";

const SECTION_DISPLAY_NAMES: Record<string, string> = {
  JewelryCollection: "Shop Collection",
  ShopByCategory: "ShopByCollection",
};

export function HomeSetupTab() {
  const api = useAxiosAuth();
  const queryClient = useQueryClient();
  const [localSections, setLocalSections] = useState<any[]>([]);

  // Settings
  const { data: storeSettings } = useSettings();
  const updateSettingsMutation = useUpdateSettings();

  // Config Modals
  const [sliderConfigOpen, setSliderConfigOpen] = useState(false);
  const [activeSliderSection, setActiveSliderSection] = useState<any>(null);

  const [shopCategoryConfigOpen, setShopCategoryConfigOpen] = useState(false);
  const [activeShopCategorySection, setActiveShopCategorySection] =
    useState<any>(null);

  const [animatedBannerConfigOpen, setAnimatedBannerConfigOpen] =
    useState(false);
  const [activeAnimatedBannerSection, setActiveAnimatedBannerSection] =
    useState<any>(null);

  const [agirlInKayConfigOpen, setAgirlInKayConfigOpen] = useState(false);
  const [activeAgirlInKaySection, setActiveAgirlInKaySection] =
    useState<any>(null);

  const [giftWrappingConfigOpen, setGiftWrappingConfigOpen] = useState(false);
  const [activeGiftWrappingSection, setActiveGiftWrappingSection] =
    useState<any>(null);

  const [categoryStoriesConfigOpen, setCategoryStoriesConfigOpen] =
    useState(false);
  const [activeCategoryStoriesSection, setActiveCategoryStoriesSection] =
    useState<any>(null);

  const [reviewsConfigOpen, setReviewsConfigOpen] = useState(false);
  const [activeReviewsSection, setActiveReviewsSection] = useState<any>(null);

  const [founderConfigOpen, setFounderConfigOpen] = useState(false);
  const [activeFounderSection, setActiveFounderSection] = useState<any>(null);

  const [footerConfigOpen, setFooterConfigOpen] = useState(false);
  const [activeFooterSection, setActiveFooterSection] = useState<any>(null);

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
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      websiteService(api).updateHomeSection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-sections"] });
    },
    onError: () => {
      toast.error("Failed to update section");
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => websiteService(api).seedHomeSections(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-sections"] });
      toast.success("Default sections seeded!");
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

  // Sections where gridBg doesn't make sense (full-bleed)
  const NO_GRID_TYPES = ["", ""];

  const handleGridBgToggle = async (id: string, currentGridBg: boolean) => {
    toast.promise(
      updateMutation.mutateAsync({ id, data: { gridBg: !currentGridBg } }),
      {
        loading: "Updating grid background...",
        success: "Grid background updated",
        error: "Failed to update",
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
      if (sec.order !== sections.find((s: any) => s.id === sec.id)?.order) {
        updateMutation.mutate({ id: sec.id, data: { order: sec.order } });
      }
    }
    toast.success("Order updated!");
  };

  const handleTitleChange = (id: string, newTitle: string) => {
    setLocalSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, title: newTitle } : sec)),
    );
  };

  const handleEyebrowChange = (id: string, newEyebrow: string) => {
    setLocalSections((prev) =>
      prev.map((sec) =>
        sec.id === id ? { ...sec, eyebrow: newEyebrow } : sec,
      ),
    );
  };

  const handleSubtitleChange = (id: string, newSubtitle: string) => {
    setLocalSections((prev) =>
      prev.map((sec) =>
        sec.id === id ? { ...sec, subtitle: newSubtitle } : sec,
      ),
    );
  };

  const handleSaveTitle = (id: string, title: string) => {
    toast.promise(updateMutation.mutateAsync({ id, data: { title } }), {
      loading: "Saving title...",
      success: "Title saved successfully",
      error: "Failed to save title",
    });
  };

  const handleSaveEyebrow = (id: string, eyebrow: string) => {
    toast.promise(updateMutation.mutateAsync({ id, data: { eyebrow } }), {
      loading: "Saving eyebrow...",
      success: "Eyebrow saved successfully",
      error: "Failed to save eyebrow",
    });
  };

  const handleSaveSubtitle = (id: string, subtitle: string) => {
    toast.promise(updateMutation.mutateAsync({ id, data: { subtitle } }), {
      loading: "Saving subtitle...",
      success: "Subtitle saved successfully",
      error: "Failed to save subtitle",
    });
  };

  const handleSaveSliderConfig = async (data: any) => {
    if (!activeSliderSection) return;
    const promise = updateMutation.mutateAsync({
      id: activeSliderSection.id,
      data: { data },
    });
    toast.promise(promise, {
      loading: "Saving slider configuration...",
      success: "Slider configuration saved successfully",
      error: "Failed to save configuration",
    });
    await promise;
  };

  const handleSaveShopCategoryConfig = async (data: any) => {
    if (!activeShopCategorySection) return;
    toast.promise(
      updateMutation.mutateAsync({
        id: activeShopCategorySection.id,
        data: { data },
      }),
      {
        loading: "Saving Shop By Collection configuration...",
        success: "Configuration saved successfully",
        error: "Failed to save configuration",
      },
    );
  };

  const handleSaveAnimatedBannerConfig = async (data: any) => {
    if (!activeAnimatedBannerSection) return;
    toast.promise(
      updateMutation.mutateAsync({
        id: activeAnimatedBannerSection.id,
        data: { data },
      }),
      {
        loading: "Saving Animated Banner configuration...",
        success: "Configuration saved successfully",
        error: "Failed to save configuration",
      },
    );
  };

  const handleSaveAgirlInKayConfig = async (data: any) => {
    if (!activeAgirlInKaySection) return;
    toast.promise(
      updateMutation.mutateAsync({
        id: activeAgirlInKaySection.id,
        data: { data },
      }),
      {
        loading: "Saving Trends configuration...",
        success: "Configuration saved successfully",
        error: "Failed to save configuration",
      },
    );
  };

  const handleSaveGiftWrappingConfig = async (data: any) => {
    if (!activeGiftWrappingSection) return;
    toast.promise(
      updateMutation.mutateAsync({
        id: activeGiftWrappingSection.id,
        data: { data },
      }),
      {
        loading: "Saving Gift Wrapping configuration...",
        success: "Configuration saved successfully",
        error: "Failed to save configuration",
      },
    );
  };

  const handleSaveCategoryStoriesConfig = async (
    data: any,
    enabled: boolean,
  ) => {
    if (!activeCategoryStoriesSection) return;
    const promise = updateMutation.mutateAsync({
      id: activeCategoryStoriesSection.id,
      data: { data, enabled },
    });
    toast.promise(promise, {
      loading: "Saving Category Stories configuration...",
      success: "Configuration saved successfully",
      error: "Failed to save configuration",
    });
    await promise;
  };

  const handleSaveReviewsConfig = async (data: any) => {
    if (!activeReviewsSection) return;
    toast.promise(
      updateMutation.mutateAsync({
        id: activeReviewsSection.id,
        data: { data },
      }),
      {
        loading: "Saving Reviews configuration...",
        success: "Configuration saved successfully",
        error: "Failed to save configuration",
      },
    );
  };

  const handleSaveFounderConfig = async (data: any) => {
    if (!activeFounderSection) return;
    toast.promise(
      updateMutation.mutateAsync({
        id: activeFounderSection.id,
        data: { data },
      }),
      {
        loading: "Saving Founder configuration...",
        success: "Configuration saved successfully",
        error: "Failed to save configuration",
      },
    );
  };

  const handleSaveFooterConfig = async (data: any) => {
    if (!activeFooterSection) return;
    toast.promise(
      updateMutation.mutateAsync({
        id: activeFooterSection.id,
        data: { data },
      }),
      {
        loading: "Saving Footer configuration...",
        success: "Footer configuration saved successfully",
        error: "Failed to save Footer configuration",
      },
    );
  };

  const handleGlobalAlternatingBgToggle = (enabled: boolean) => {
    updateSettingsMutation.mutate({ enableAlternatingBg: enabled });
  };

  const handleGlobalPlainBgToggle = (enabled: boolean) => {
    updateSettingsMutation.mutate({ enablePlainBg: enabled });
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
            It looks like your database doesn't have the default home page
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
              ? "Seeding..."
              : "Seed Default Configuration"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-muted/30 p-4 border rounded-xl shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Missing Sections?
              </h3>
              <p className="text-xs text-muted-foreground">
                Click here to restore any default sections that might have been
                deleted (e.g. Category Stories).
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-2 ${seedMutation.isPending ? "animate-spin" : ""}`}
              />
              Restore Defaults
            </Button>
          </div>

          <div className="flex justify-between items-center bg-primary/5 p-5 border border-primary/10 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  Global Appearance
                </h3>
                <p className="text-xs text-muted-foreground">
                  Control homepage background pattern for all sections.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 bg-background px-4 py-2 rounded-lg border shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                  Alternating Bg
                </span>
                <Switch
                  checked={storeSettings?.enableAlternatingBg !== false}
                  onCheckedChange={handleGlobalAlternatingBgToggle}
                  disabled={
                    updateSettingsMutation.isPending ||
                    storeSettings?.enablePlainBg === true
                  }
                />
              </div>
              <div className="flex items-center gap-3 bg-background px-4 py-2 rounded-lg border shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                  Plain Bg
                </span>
                <Switch
                  checked={storeSettings?.enablePlainBg === true}
                  onCheckedChange={handleGlobalPlainBgToggle}
                  disabled={updateSettingsMutation.isPending}
                />
              </div>
            </div>
          </div>
          {localSections.map((section, index) => (
            <div
              key={section.id}
              className={`flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-xl bg-card shadow-sm transition-all gap-4 md:gap-0 ${!section.enabled && "opacity-60 grayscale-[50%]"}`}
            >
              {/* Top section: Order controls and type info */}
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

                <div className="flex flex-col gap-1 flex-1 md:w-[200px]">
                  <h4 className="font-semibold text-lg">
                    {SECTION_DISPLAY_NAMES[section.type] || section.type}
                  </h4>
                  <Badge
                    variant={section.enabled ? "default" : "secondary"}
                    className="w-fit"
                  >
                    {section.enabled ? "Visible" : "Hidden"}
                  </Badge>
                </div>
              </div>

              {/* Middle section: Title input */}
              <div className="flex flex-col flex-1 gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={section.title || ""}
                    onChange={(e) =>
                      handleTitleChange(section.id, e.target.value)
                    }
                    placeholder="Displayed Title (e.g. Shop By Collection)"
                    disabled={!section.enabled}
                    className="text-sm font-medium"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSaveTitle(section.id, section.title)}
                    disabled={!section.enabled}
                    className="flex-shrink-0"
                  >
                    <Save className="w-4 h-4 text-primary" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={section.eyebrow || ""}
                    onChange={(e) =>
                      handleEyebrowChange(section.id, e.target.value)
                    }
                    placeholder="Eyebrow / blue label (optional)"
                    disabled={!section.enabled}
                    className="text-xs text-primary h-8"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      handleSaveEyebrow(section.id, section.eyebrow)
                    }
                    disabled={!section.enabled}
                    className="flex-shrink-0 h-8 w-8"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={section.subtitle || ""}
                    onChange={(e) =>
                      handleSubtitleChange(section.id, e.target.value)
                    }
                    placeholder="Subtitle/Description (optional)"
                    disabled={!section.enabled}
                    className="text-xs text-muted-foreground h-8"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      handleSaveSubtitle(section.id, section.subtitle)
                    }
                    disabled={!section.enabled}
                    className="flex-shrink-0 h-8 w-8"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Bottom section: Configure and Enable/Disable buttons */}
              <div className="flex flex-row flex-wrap items-center justify-center gap-2">
                {/* Grid BG toggle */}
                <div className="flex flex-col items-center gap-1 min-w-[80px]">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    Grid BG
                  </span>
                  <Switch
                    checked={!!section.gridBg}
                    onCheckedChange={() =>
                      handleGridBgToggle(section.id, !!section.gridBg)
                    }
                    disabled={!section.enabled}
                  />
                </div>
                {/* Padding Top Toggle */}
                <div className="flex flex-col items-center gap-1 min-w-[50px]">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    PT
                  </span>
                  <Switch
                    checked={section.paddingTop !== false} // default to true if undefined
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
                {/* Padding Bottom Toggle */}
                <div className="flex flex-col items-center gap-1 min-w-[50px]">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    PB
                  </span>
                  <Switch
                    checked={section.paddingBottom !== false} // default to true if undefined
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
                {section.type === "HeroSlider" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveSliderSection(section);
                      setSliderConfigOpen(true);
                    }}
                    className="gap-2 w-full md:w-auto text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configure
                  </Button>
                )}
                {section.type === "ShopByCategory" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveShopCategorySection(section);
                      setShopCategoryConfigOpen(true);
                    }}
                    className="gap-2 w-full md:w-auto text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configure
                  </Button>
                )}
                {section.type === "AnimatedBanner" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveAnimatedBannerSection(section);
                      setAnimatedBannerConfigOpen(true);
                    }}
                    className="gap-2 w-full md:w-auto text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configure
                  </Button>
                )}
                {section.type === "AGirlInKay" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveAgirlInKaySection(section);
                      setAgirlInKayConfigOpen(true);
                    }}
                    className="gap-2 w-full md:w-auto text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configure
                  </Button>
                )}
                {section.type === "GiftWrapping" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveGiftWrappingSection(section);
                      setGiftWrappingConfigOpen(true);
                    }}
                    className="gap-2 w-full md:w-auto text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configure
                  </Button>
                )}
                {section.type === "CategoryStories" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveCategoryStoriesSection(section);
                      setCategoryStoriesConfigOpen(true);
                    }}
                    className="gap-2 w-full md:w-auto text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configure
                  </Button>
                )}
                {section.type === "Reviews" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveReviewsSection(section);
                      setReviewsConfigOpen(true);
                    }}
                    className="gap-2 w-full md:w-auto text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configure
                  </Button>
                )}
                {section.type === "KnowOurFounder" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveFounderSection(section);
                      setFounderConfigOpen(true);
                    }}
                    className="gap-2 w-full md:w-auto text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configure
                  </Button>
                )}
                {section.type === "Footer" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveFooterSection(section);
                      setFooterConfigOpen(true);
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
          ))}
        </div>
      )}

      {activeSliderSection && (
        <HeroSliderConfigModal
          open={sliderConfigOpen}
          onOpenChange={setSliderConfigOpen}
          sectionData={activeSliderSection.data}
          onSave={handleSaveSliderConfig}
        />
      )}

      {activeShopCategorySection && (
        <ShopCategoryConfigModal
          open={shopCategoryConfigOpen}
          onOpenChange={setShopCategoryConfigOpen}
          sectionData={activeShopCategorySection.data}
          onSave={handleSaveShopCategoryConfig}
        />
      )}

      {activeAnimatedBannerSection && (
        <AnimatedBannerConfigModal
          open={animatedBannerConfigOpen}
          onOpenChange={setAnimatedBannerConfigOpen}
          sectionData={activeAnimatedBannerSection.data}
          onSave={handleSaveAnimatedBannerConfig}
        />
      )}

      {activeAgirlInKaySection && (
        <AgirlInKayConfigModal
          open={agirlInKayConfigOpen}
          onOpenChange={setAgirlInKayConfigOpen}
          sectionData={activeAgirlInKaySection.data}
          onSave={handleSaveAgirlInKayConfig}
        />
      )}

      {activeGiftWrappingSection && (
        <GiftWrappingConfigModal
          open={giftWrappingConfigOpen}
          onOpenChange={setGiftWrappingConfigOpen}
          sectionData={activeGiftWrappingSection.data}
          onSave={handleSaveGiftWrappingConfig}
        />
      )}

      {activeCategoryStoriesSection && (
        <CategoryStoriesConfigModal
          open={categoryStoriesConfigOpen}
          onOpenChange={setCategoryStoriesConfigOpen}
          sectionData={activeCategoryStoriesSection.data}
          sectionEnabled={activeCategoryStoriesSection.enabled}
          onSave={handleSaveCategoryStoriesConfig}
        />
      )}

      {activeReviewsSection && (
        <ReviewsConfigModal
          open={reviewsConfigOpen}
          onOpenChange={setReviewsConfigOpen}
          sectionData={activeReviewsSection.data}
          onSave={handleSaveReviewsConfig}
        />
      )}

      {activeFounderSection && (
        <FounderConfigModal
          open={founderConfigOpen}
          onOpenChange={setFounderConfigOpen}
          sectionData={activeFounderSection.data}
          onSave={handleSaveFounderConfig}
        />
      )}

      {activeFooterSection && (
        <FooterConfigModal
          open={footerConfigOpen}
          onOpenChange={setFooterConfigOpen}
          sectionData={activeFooterSection.data}
          onSave={handleSaveFooterConfig}
        />
      )}
    </div>
  );
}
