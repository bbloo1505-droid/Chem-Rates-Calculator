import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplet,
  Leaf,
  MapPin,
  Beaker,
  CheckCircle2,
  RotateCcw,
  Check,
} from "lucide-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import {
  fetchWeedRows,
  getWeedOptions,
  getWeedConditions,
  calculateSprayMixFromSheet,
  formatResultJson,
  type SheetWeedRow,
} from "../lib/calculator-logic";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type MixType =
  | "glyph"
  | "glyph-mets"
  | "mets"
  | "fluroxy-foliar"
  | "fluroxy-basal"
  | "other";

type ApplicationMethod = "foliar" | "dabber" | "basal";

type EditableResult = {
  ingredient: string;
  amount: number;
  unit: string;
};

const DAILY_SITE_STORAGE_KEY = "dailySiteName";
const DAILY_SITE_DATE_KEY = "dailySiteDate";

function getTodayString() {
  return new Date().toLocaleDateString("en-CA");
}

function getMixType(results: { ingredient: string }[]): MixType {
  const ingredients = results.map((r) => r.ingredient.toLowerCase());

  const hasGlyph = ingredients.includes("glyphosate");
  const hasMets = ingredients.includes("mets");
  const hasFluroxy = ingredients.includes("fluroxy");
  const hasBiodiesel = ingredients.includes("biodiesel");
  const hasDiesel = ingredients.includes("diesel / basal carrier");

  if (hasGlyph && hasMets) return "glyph-mets";
  if (hasGlyph) return "glyph";
  if (hasMets) return "mets";
  if (hasFluroxy && hasBiodiesel) return "fluroxy-basal";
  if (hasFluroxy) return "fluroxy-foliar";
  if (hasDiesel) return "fluroxy-basal";
  return "other";
}

function formatDisplayAmount(amount: number) {
  return amount % 1 === 0 ? amount.toString() : amount.toFixed(1);
}

function WeedMultiPicker({
  title,
  options,
  selected,
  onChange,
  helperText,
}: {
  title: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  helperText: string;
}) {
  const toggle = (weed: string) => {
    if (selected.includes(weed)) {
      onChange(selected.filter((w) => w !== weed));
    } else {
      onChange([...selected, weed]);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-2">
      <label className="ml-1 flex min-w-0 items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
        <Leaf className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">{title}</span>
      </label>

      <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-card p-3">
        <div className="max-h-56 w-full min-w-0 overflow-y-auto pr-1">
          <div className="grid w-full min-w-0 grid-cols-1 gap-2">
            {options.map((opt) => {
              const isSelected = selected.includes(opt);

              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className={`w-full min-w-0 max-w-full overflow-hidden rounded-xl border px-3 py-3 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <div className="flex w-full min-w-0 items-center gap-3">
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-white"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>

                    <span className="block w-full min-w-0 truncate text-sm font-semibold">
                      {opt}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{helperText}</p>

      {selected.length > 0 && (
        <div className="flex w-full min-w-0 max-w-full flex-wrap gap-2 pt-1">
          {selected.map((weed) => (
            <div
              key={weed}
              className="flex min-w-0 max-w-full items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-sm font-semibold text-primary"
            >
              <span className="truncate">{weed}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SprayCalculator() {
  const [weedRows, setWeedRows] = useState<SheetWeedRow[]>([]);
  const [weedOptions, setWeedOptions] = useState<string[]>([]);
  const [loadingWeeds, setLoadingWeeds] = useState(true);
  const [weedError, setWeedError] = useState("");

  const [siteName, setSiteName] = useState("");
  const [weed, setWeed] = useState("");
  const [volume, setVolume] = useState("");

  const [applicationMethod, setApplicationMethod] =
    useState<ApplicationMethod>("foliar");

  const [siteType, setSiteType] = useState<"bush" | "coastal">("bush");
  const [dyeStrength, setDyeStrength] = useState<"none" | "standard" | "strong">(
    "standard"
  );
  const [weedCondition, setWeedCondition] = useState<"normal" | "seeding">(
    "normal"
  );

  const [editableResults, setEditableResults] = useState<EditableResult[]>([]);
  const [additionalWeeds, setAdditionalWeeds] = useState<string[]>([]);
  const [dabberWeeds, setDabberWeeds] = useState<string[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    fetchWeedRows()
      .then((rows) => {
        setWeedRows(rows);
        const options = getWeedOptions(rows);
        setWeedOptions(options);
        setWeed(options[0] || "");
        setLoadingWeeds(false);
      })
      .catch((error) => {
        console.error(error);
        setWeedError("Could not load weeds from Google Sheets.");
        setLoadingWeeds(false);
      });
  }, []);

  useEffect(() => {
    const savedSiteName = localStorage.getItem(DAILY_SITE_STORAGE_KEY);
    const savedSiteDate = localStorage.getItem(DAILY_SITE_DATE_KEY);
    const today = getTodayString();

    if (savedSiteName && savedSiteDate === today) {
      setSiteName(savedSiteName);
    } else {
      localStorage.removeItem(DAILY_SITE_STORAGE_KEY);
      localStorage.removeItem(DAILY_SITE_DATE_KEY);
    }
  }, []);

  const volumeNum = parseFloat(volume);

  const availableConditions = getWeedConditions(weedRows, weed);
  const showConditionSelector =
    applicationMethod === "foliar" && availableConditions.length > 1;

  const isFoliarValid =
    applicationMethod === "foliar" &&
    !isNaN(volumeNum) &&
    volumeNum > 0 &&
    Boolean(weed) &&
    Boolean(siteName.trim());

  const isDabberValid =
    applicationMethod === "dabber" &&
    !isNaN(volumeNum) &&
    volumeNum > 0 &&
    dabberWeeds.length > 0 &&
    Boolean(siteName.trim());

  const isBasalValid =
    applicationMethod === "basal" &&
    !isNaN(volumeNum) &&
    volumeNum > 0 &&
    Boolean(siteName.trim());

  const isValid = isFoliarValid || isDabberValid || isBasalValid;

  const calculatedResults = useMemo(() => {
    if (applicationMethod === "foliar") {
      if (!isFoliarValid) return [];

      return calculateSprayMixFromSheet(
        weed,
        volumeNum,
        siteType,
        dyeStrength,
        weedRows,
        showConditionSelector ? weedCondition : "normal"
      );
    }

    if (applicationMethod === "dabber") {
      if (!isDabberValid) return [];

      return [
        {
          ingredient: "Glyphosate",
          amount: volumeNum / 2,
          unit: "ml",
        },
        {
          ingredient: "Water",
          amount: volumeNum / 2,
          unit: "ml",
        },
      ];
    }

    if (applicationMethod === "basal") {
      if (!isBasalValid) return [];

      return [
        {
          ingredient: "Garlon / Triclopyr",
          amount: volumeNum * 0.25,
          unit: "L",
        },
        {
          ingredient: "Diesel / Basal carrier",
          amount: volumeNum * 0.75,
          unit: "L",
        },
      ];
    }

    return [];
  }, [
    applicationMethod,
    isFoliarValid,
    isDabberValid,
    isBasalValid,
    weed,
    volumeNum,
    siteType,
    dyeStrength,
    weedRows,
    showConditionSelector,
    weedCondition,
  ]);

  useEffect(() => {
    if (!isValid || calculatedResults.length === 0) {
      setEditableResults([]);
      return;
    }

    setEditableResults(
      calculatedResults.map((res) => ({
        ingredient: res.ingredient,
        amount: res.amount,
        unit: res.unit,
      }))
    );
  }, [calculatedResults, isValid]);

  const handleAmountChange = (index: number, value: string) => {
    setEditableResults((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const parsed = parseFloat(value);

        return {
          ...item,
          amount: value === "" || Number.isNaN(parsed) ? 0 : parsed,
        };
      })
    );
  };

  const handleResetMix = () => {
    setEditableResults(
      calculatedResults.map((res) => ({
        ingredient: res.ingredient,
        amount: res.amount,
        unit: res.unit,
      }))
    );

    toast({
      title: "Mix reset",
      description: "Values restored to calculated amounts.",
      duration: 2500,
    });
  };

  const handleMethodChange = (method: ApplicationMethod) => {
    setApplicationMethod(method);

    if (method !== "foliar") {
      setAdditionalWeeds([]);
    }

    if (method !== "dabber") {
      setDabberWeeds([]);
    }

    if (method === "basal") {
      setWeed("Ochna");
      setWeedCondition("normal");
    }
  };

  const clearTodaysSite = () => {
    setSiteName("");
    localStorage.removeItem(DAILY_SITE_STORAGE_KEY);
    localStorage.removeItem(DAILY_SITE_DATE_KEY);

    toast({
      title: "Site cleared",
      description: "Today's saved site has been cleared.",
      duration: 2500,
    });
  };

  const handleSave = async () => {
    if (!isValid || editableResults.length === 0) return;

    const mixType = getMixType(editableResults);

    const entry = {
      user_id: "worker1",
      site_name: siteName.trim(),
      date: getTodayString(),
      application_method: applicationMethod,
      weed:
        applicationMethod === "basal"
          ? "Ochna"
          : applicationMethod === "dabber"
            ? dabberWeeds.length === 1
              ? dabberWeeds[0]
              : dabberWeeds.length > 1
                ? "Mixed"
                : "Unknown"
            : additionalWeeds.length > 0
              ? "Mixed"
              : weed,
      additional_weeds: applicationMethod === "foliar" ? additionalWeeds : [],
      dabber_weeds: applicationMethod === "dabber" ? dabberWeeds : [],
      weed_condition:
        applicationMethod === "foliar"
          ? showConditionSelector
            ? weedCondition
            : "normal"
          : null,
      mix_type: mixType,
      volume: volumeNum,
      site_type: applicationMethod === "foliar" ? siteType : null,
      dye_strength: applicationMethod === "foliar" ? dyeStrength : null,
      results: formatResultJson(editableResults),
      saved_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("spray_entries").insert([entry]);

    if (error) {
      console.error("Supabase save failed:", error);
      toast({
        title: "Save failed",
        description: error.message || "Could not save entry to cloud.",
        duration: 3000,
      });
      return;
    }

    toast({
      title: "Saved to Cloud",
      description: "Spray entry saved and synced.",
      duration: 3000,
    });
  };

  if (loadingWeeds) {
    return (
      <MobileLayout title="Weed Treatment Log">
        <div className="w-full min-w-0 p-4 text-center text-muted-foreground">
          Loading weed database...
        </div>
      </MobileLayout>
    );
  }

  if (weedError) {
    return (
      <MobileLayout title="Weed Treatment Log">
        <div className="w-full min-w-0 p-4 text-center text-red-500">
          {weedError}
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Weed Treatment Log">
      <div className="w-full min-w-0 max-w-full overflow-x-hidden">
        <div className="w-full min-w-0 max-w-full overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden"
          >
            <div className="w-full min-w-0 max-w-full space-y-2">
              <div className="flex w-full min-w-0 items-center justify-between gap-3">
                <label className="ml-1 flex min-w-0 items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">Site Name</span>
                </label>

                {!!siteName.trim() && (
                  <button
                    type="button"
                    onClick={clearTodaysSite}
                    className="shrink-0 text-xs font-bold text-primary hover:text-primary/80"
                  >
                    Clear today
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="e.g. Cooran, Mudjimba dune site"
                value={siteName}
                onChange={(e) => {
                  const value = e.target.value;
                  setSiteName(value);

                  if (value.trim()) {
                    localStorage.setItem(DAILY_SITE_STORAGE_KEY, value);
                    localStorage.setItem(DAILY_SITE_DATE_KEY, getTodayString());
                  } else {
                    localStorage.removeItem(DAILY_SITE_STORAGE_KEY);
                    localStorage.removeItem(DAILY_SITE_DATE_KEY);
                  }
                }}
                className="outdoor-input h-14 w-full min-w-0 max-w-full"
              />

              {!!siteName.trim() && (
                <p className="text-sm text-muted-foreground">
                  This site will stay filled in on this phone for today.
                </p>
              )}
            </div>

            <div className="w-full min-w-0 max-w-full space-y-2">
              <label className="ml-1 flex min-w-0 items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
                <Beaker className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Application Method</span>
              </label>

              <div className="grid w-full min-w-0 max-w-full grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleMethodChange("foliar")}
                  className={`w-full min-w-0 overflow-hidden rounded-2xl border p-4 text-center transition-all active:scale-95 ${
                    applicationMethod === "foliar"
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="mb-1 text-2xl">🌿</div>
                  <div className="truncate text-sm font-bold">Foliar</div>
                  <div className="truncate text-xs opacity-70">Spray pack</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodChange("dabber")}
                  className={`w-full min-w-0 overflow-hidden rounded-2xl border p-4 text-center transition-all active:scale-95 ${
                    applicationMethod === "dabber"
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="mb-1 text-2xl">🖊</div>
                  <div className="truncate text-sm font-bold">Dabber</div>
                  <div className="truncate text-xs opacity-70">Cut & paint</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodChange("basal")}
                  className={`w-full min-w-0 overflow-hidden rounded-2xl border p-4 text-center transition-all active:scale-95 ${
                    applicationMethod === "basal"
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="mb-1 text-2xl">🪵</div>
                  <div className="truncate text-sm font-bold">Basal</div>
                  <div className="truncate text-xs opacity-70">Basal bark</div>
                </button>
              </div>
            </div>

            <div className="w-full min-w-0 max-w-full overflow-x-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {applicationMethod === "foliar" && (
                  <motion.div
                    key="foliar-fields"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full min-w-0 max-w-full space-y-6"
                  >
                    <div className="w-full min-w-0 max-w-full space-y-2">
                      <label className="ml-1 flex min-w-0 items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
                        <Leaf className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">Target Weed</span>
                      </label>
                      <select
                        value={weed}
                        onChange={(e) => {
                          setWeed(e.target.value);
                          setWeedCondition("normal");
                          setAdditionalWeeds([]);
                        }}
                        className="outdoor-input h-14 w-full min-w-0 max-w-full"
                      >
                        <option value="" disabled>
                          Select a weed...
                        </option>
                        {weedOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    {showConditionSelector && (
                      <div className="w-full min-w-0 max-w-full space-y-2">
                        <label className="ml-1 flex min-w-0 items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
                          <Leaf className="h-4 w-4 shrink-0 text-primary" />
                          <span className="truncate">Weed Condition</span>
                        </label>

                        <div className="flex w-full min-w-0 max-w-full rounded-xl bg-muted/50 p-1">
                          <button
                            type="button"
                            onClick={() => setWeedCondition("normal")}
                            className={`flex-1 min-w-0 rounded-lg px-2 py-2.5 text-sm font-bold transition-all ${
                              weedCondition === "normal"
                                ? "bg-white text-primary shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="block truncate">Not Seeding</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setWeedCondition("seeding")}
                            className={`flex-1 min-w-0 rounded-lg px-2 py-2.5 text-sm font-bold transition-all ${
                              weedCondition === "seeding"
                                ? "bg-white text-primary shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="block truncate">Seed Heads</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <WeedMultiPicker
                      title="Additional Weeds With This Pack"
                      options={weedOptions.filter((opt) => opt !== weed)}
                      selected={additionalWeeds}
                      onChange={setAdditionalWeeds}
                      helperText="Select all extra weeds treated with this same spray pack."
                    />

                    <div className="w-full min-w-0 max-w-full space-y-2">
                      <label className="ml-1 flex min-w-0 items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
                        <Beaker className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">Spray Volume (Litres)</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="15"
                        value={volume}
                        onChange={(e) => setVolume(e.target.value)}
                        className="outdoor-input h-14 w-full min-w-0 max-w-full"
                      />
                    </div>

                    <div className="grid w-full min-w-0 max-w-full grid-cols-2 gap-4">
                      <div className="min-w-0 space-y-2">
                        <label className="ml-1 flex min-w-0 items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
                          <MapPin className="h-4 w-4 shrink-0 text-primary" />
                          <span className="truncate">Site Type</span>
                        </label>
                        <div className="flex w-full min-w-0 max-w-full rounded-xl bg-muted/50 p-1">
                          {(["bush", "coastal"] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setSiteType(type)}
                              className={`flex-1 min-w-0 rounded-lg px-2 py-2.5 text-sm font-bold capitalize transition-all ${
                                siteType === type
                                  ? "bg-white text-primary shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span className="block truncate">{type}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="min-w-0 space-y-2">
                        <label className="ml-1 flex min-w-0 items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
                          <Droplet className="h-4 w-4 shrink-0 text-primary" />
                          <span className="truncate">Dye</span>
                        </label>
                        <div className="flex w-full min-w-0 max-w-full rounded-xl bg-muted/50 p-1">
                          {(["none", "standard", "strong"] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setDyeStrength(type)}
                              className={`flex-1 min-w-0 rounded-lg px-1 py-2.5 text-xs font-bold capitalize transition-all ${
                                dyeStrength === type
                                  ? "bg-white text-primary shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span className="block truncate">
                                {type === "standard" ? "Std" : type}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {applicationMethod === "dabber" && (
                  <motion.div
                    key="dabber-fields"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full min-w-0 max-w-full space-y-6"
                  >
                    <WeedMultiPicker
                      title="Weeds Targeted With Dabber"
                      options={weedOptions}
                      selected={dabberWeeds}
                      onChange={setDabberWeeds}
                      helperText="Select all weeds treated with the dabber."
                    />

                    <div className="w-full min-w-0 max-w-full space-y-2">
                      <label className="ml-1 flex min-w-0 items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
                        <Beaker className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">Dabber Volume Used (ml)</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="50"
                        placeholder="200"
                        value={volume}
                        onChange={(e) => setVolume(e.target.value)}
                        className="outdoor-input h-14 w-full min-w-0 max-w-full"
                      />
                    </div>
                  </motion.div>
                )}

                {applicationMethod === "basal" && (
                  <motion.div
                    key="basal-fields"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full min-w-0 max-w-full space-y-6"
                  >
                    <div className="w-full min-w-0 max-w-full rounded-2xl border border-primary/10 bg-primary/5 p-4">
                      <p className="text-sm font-semibold text-primary">
                        Basal bark is set to Ochna only.
                      </p>
                    </div>

                    <div className="w-full min-w-0 max-w-full space-y-2">
                      <label className="ml-1 flex min-w-0 items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
                        <Leaf className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">Target Weed</span>
                      </label>
                      <input
                        type="text"
                        value="Ochna"
                        disabled
                        className="outdoor-input h-14 w-full min-w-0 max-w-full opacity-70"
                      />
                    </div>

                    <div className="w-full min-w-0 max-w-full space-y-2">
                      <label className="ml-1 flex min-w-0 items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
                        <Beaker className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">Basal Mix Volume (Litres)</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="5"
                        value={volume}
                        onChange={(e) => setVolume(e.target.value)}
                        className="outdoor-input h-14 w-full min-w-0 max-w-full"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {isValid && editableResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pt-6"
                >
                  <div className="flex w-full min-w-0 items-center justify-between gap-3 border-b-2 border-primary/20 pb-2">
                    <h2 className="min-w-0 truncate text-xl font-bold text-foreground">
                      {applicationMethod === "dabber"
                        ? "Dabber Mix"
                        : applicationMethod === "basal"
                          ? "Basal Bark Mix"
                          : "Required Mix"}
                    </h2>
                    <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                      {applicationMethod === "dabber"
                        ? `${volumeNum}ml Total`
                        : `${volumeNum}L Total`}
                    </span>
                  </div>

                  <div className="flex w-full min-w-0 items-center justify-between gap-3">
                    <p className="min-w-0 text-sm text-muted-foreground">
                      Tap any value to adjust the mix before saving.
                    </p>

                    <button
                      type="button"
                      onClick={handleResetMix}
                      className="flex shrink-0 items-center gap-2 rounded-lg border border-primary/20 px-3 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </button>
                  </div>

                  <div className="grid w-full min-w-0 max-w-full grid-cols-2 gap-3">
                    {editableResults.map((res, i) => {
                      const ingredientStyles: Record<
                        string,
                        {
                          card: string;
                          badge: string;
                          unit: string;
                          input: string;
                          note: string;
                          icon: string;
                        }
                      > = {
                        Glyphosate: {
                          card: "bg-emerald-50 border-emerald-200 text-emerald-950",
                          badge: "bg-emerald-100 text-emerald-700",
                          unit: "text-emerald-700",
                          input: "text-emerald-950 placeholder:text-emerald-300",
                          note: "text-emerald-700/80",
                          icon: "🌿",
                        },
                        Mets: {
                          card: "bg-violet-50 border-violet-200 text-violet-950",
                          badge: "bg-violet-100 text-violet-700",
                          unit: "text-violet-700",
                          input: "text-violet-950 placeholder:text-violet-300",
                          note: "text-violet-700/80",
                          icon: "🧪",
                        },
                        Fluroxy: {
                          card: "bg-amber-50 border-amber-200 text-amber-950",
                          badge: "bg-amber-100 text-amber-700",
                          unit: "text-amber-700",
                          input: "text-amber-950 placeholder:text-amber-300",
                          note: "text-amber-700/80",
                          icon: "🍂",
                        },
                        "Garlon / Triclopyr": {
                          card: "bg-orange-50 border-orange-200 text-orange-950",
                          badge: "bg-orange-100 text-orange-700",
                          unit: "text-orange-700",
                          input: "text-orange-950 placeholder:text-orange-300",
                          note: "text-orange-700/80",
                          icon: "🪵",
                        },
                        "Diesel / Basal carrier": {
                          card: "bg-stone-50 border-stone-200 text-stone-950",
                          badge: "bg-stone-200 text-stone-700",
                          unit: "text-stone-700",
                          input: "text-stone-950 placeholder:text-stone-400",
                          note: "text-stone-700/80",
                          icon: "⛽",
                        },
                        Water: {
                          card: "bg-sky-50 border-sky-200 text-sky-950",
                          badge: "bg-sky-100 text-sky-700",
                          unit: "text-sky-700",
                          input: "text-sky-950 placeholder:text-sky-300",
                          note: "text-sky-700/80",
                          icon: "💧",
                        },
                        Dye: {
                          card: "bg-pink-50 border-pink-200 text-pink-950",
                          badge: "bg-pink-100 text-pink-700",
                          unit: "text-pink-700",
                          input: "text-pink-950 placeholder:text-pink-300",
                          note: "text-pink-700/80",
                          icon: "🎨",
                        },
                      };

                      const style = ingredientStyles[res.ingredient] ?? {
                        card: "bg-card border-border text-card-foreground",
                        badge: "bg-muted text-muted-foreground",
                        unit: "text-primary/75",
                        input: "text-foreground placeholder:text-muted-foreground",
                        note: "text-muted-foreground",
                        icon: "🧴",
                      };

                      return (
                        <motion.div
                          key={`${res.ingredient}-${i}`}
                          initial={{ opacity: 0, y: 12, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: i * 0.08 }}
                          className={`relative min-w-0 max-w-full overflow-hidden rounded-3xl border p-4 shadow-sm ${style.card}`}
                        >
                          <div className="pointer-events-none absolute right-0 top-0 pr-3 pt-2 text-4xl opacity-10">
                            {style.icon}
                          </div>

                          <div className="mb-4 flex w-full min-w-0 items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div
                                className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${style.badge}`}
                              >
                                <span className="truncate">{res.ingredient}</span>
                              </div>
                            </div>

                            <div className="shrink-0 text-lg leading-none">
                              {style.icon}
                            </div>
                          </div>

                          <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/50 bg-white/60 px-3 py-4">
                            <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                              Amount
                            </div>

                            <div className="flex w-full min-w-0 items-end gap-2">
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.1"
                                value={Number.isFinite(res.amount) ? res.amount : ""}
                                onChange={(e) => handleAmountChange(i, e.target.value)}
                                className={`w-full min-w-0 appearance-none border-none bg-transparent p-0 text-4xl font-black outline-none ${style.input}`}
                              />
                              <span className={`mb-1 shrink-0 text-lg font-bold ${style.unit}`}>
                                {res.unit}
                              </span>
                            </div>
                          </div>

                          {calculatedResults[i] && (
                            <div className={`mt-3 break-words text-xs font-medium ${style.note}`}>
                              Calculated: {formatDisplayAmount(calculatedResults[i].amount)}{" "}
                              {calculatedResults[i].unit}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    onClick={handleSave}
                    className="tactile-button mt-6 flex h-14 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-primary text-lg font-bold text-primary-foreground"
                  >
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-secondary" />
                    <span className="truncate">Save to Daily Log</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="h-8" />
          </motion.div>
        </div>
      </div>
    </MobileLayout>
  );
}
