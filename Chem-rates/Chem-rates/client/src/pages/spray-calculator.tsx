import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplet, Leaf, MapPin, Beaker, CheckCircle2, RotateCcw } from "lucide-react";
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

type EditableResult = {
  ingredient: string;
  amount: number;
  unit: string;
};

function getMixType(results: { ingredient: string }[]): MixType {
  const ingredients = results.map((r) => r.ingredient.toLowerCase());

  const hasGlyph = ingredients.includes("glyphosate");
  const hasMets = ingredients.includes("mets");
  const hasFluroxy = ingredients.includes("fluroxy");
  const hasBiodiesel = ingredients.includes("biodiesel");

  if (hasGlyph && hasMets) return "glyph-mets";
  if (hasGlyph) return "glyph";
  if (hasMets) return "mets";
  if (hasFluroxy && hasBiodiesel) return "fluroxy-basal";
  if (hasFluroxy) return "fluroxy-foliar";
  return "other";
}

function formatDisplayAmount(amount: number) {
  return amount % 1 === 0 ? amount.toString() : amount.toFixed(1);
}

export default function SprayCalculator() {
  const [weedRows, setWeedRows] = useState<SheetWeedRow[]>([]);
  const [weedOptions, setWeedOptions] = useState<string[]>([]);
  const [loadingWeeds, setLoadingWeeds] = useState(true);
  const [weedError, setWeedError] = useState("");

  const [siteName, setSiteName] = useState("");
  const [weed, setWeed] = useState("");
  const [volume, setVolume] = useState("");

  const [siteType, setSiteType] = useState<"bush" | "coastal">("bush");
  const [dyeStrength, setDyeStrength] = useState<"none" | "standard" | "strong">("standard");
  const [weedCondition, setWeedCondition] = useState<"normal" | "seeding">("normal");

  const [editableResults, setEditableResults] = useState<EditableResult[]>([]);

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

  const volumeNum = parseFloat(volume);
  const isValid = !isNaN(volumeNum) && volumeNum > 0 && Boolean(weed) && Boolean(siteName.trim());

  const availableConditions = getWeedConditions(weedRows, weed);
  const showConditionSelector = availableConditions.length > 1;

  const calculatedResults = useMemo(() => {
    if (!isValid) return [];

    return calculateSprayMixFromSheet(
      weed,
      volumeNum,
      siteType,
      dyeStrength,
      weedRows,
      showConditionSelector ? weedCondition : "normal"
    );
  }, [isValid, weed, volumeNum, siteType, dyeStrength, weedRows, showConditionSelector, weedCondition]);

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

  const handleSave = async () => {
    if (!isValid || editableResults.length === 0) return;

    const mixType = getMixType(editableResults);

    const entry = {
      user_id: "worker1",
      site_name: siteName.trim(),
      date: new Date().toLocaleDateString("en-CA"),
      weed,
      weed_condition: showConditionSelector ? weedCondition : "normal",
      mix_type: mixType,
      volume: volumeNum,
      site_type: siteType,
      dye_strength: dyeStrength,
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
      <MobileLayout title="Mix Calculator">
        <div className="p-4 text-center text-muted-foreground">
          Loading weed database...
        </div>
      </MobileLayout>
    );
  }

  if (weedError) {
    return (
      <MobileLayout title="Mix Calculator">
        <div className="p-4 text-center text-red-500">{weedError}</div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Mix Calculator">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider ml-1">
            <MapPin className="w-4 h-4 text-primary" /> Site Name
          </label>
          <input
            type="text"
            placeholder="e.g. Cooran, Mudjimba dune site"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="w-full outdoor-input h-14"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider ml-1">
            <Leaf className="w-4 h-4 text-primary" /> Target Weed
          </label>
          <select
            value={weed}
            onChange={(e) => {
              setWeed(e.target.value);
              setWeedCondition("normal");
            }}
            className="w-full outdoor-input h-14"
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
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider ml-1">
              <Leaf className="w-4 h-4 text-primary" /> Weed Condition
            </label>

            <div className="flex bg-muted/50 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setWeedCondition("normal")}
                className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold transition-all ${
                  weedCondition === "normal"
                    ? "bg-white shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Not Seeding
              </button>

              <button
                type="button"
                onClick={() => setWeedCondition("seeding")}
                className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold transition-all ${
                  weedCondition === "seeding"
                    ? "bg-white shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Seed Heads
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider ml-1">
            <Beaker className="w-4 h-4 text-primary" /> Spray Volume (Litres)
          </label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="15"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            className="w-full outdoor-input h-14"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider ml-1">
              <MapPin className="w-4 h-4 text-primary" /> Site Type
            </label>
            <div className="flex bg-muted/50 p-1 rounded-xl">
              {(["bush", "coastal"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSiteType(type)}
                  className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold capitalize transition-all ${
                    siteType === type
                      ? "bg-white shadow-sm text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider ml-1">
              <Droplet className="w-4 h-4 text-primary" /> Dye
            </label>
            <div className="flex bg-muted/50 p-1 rounded-xl">
              {(["none", "standard", "strong"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDyeStrength(type)}
                  className={`flex-1 py-2.5 px-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    dyeStrength === type
                      ? "bg-white shadow-sm text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type === "standard" ? "Std" : type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isValid && editableResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b-2 border-primary/20 pb-2">
                <h2 className="text-xl font-display font-bold text-foreground">
                  Required Mix
                </h2>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
                  {volumeNum}L Total
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Tap any value to adjust the calculated mix.
                </p>

                <button
                  type="button"
                  onClick={handleResetMix}
                  className="flex items-center gap-2 rounded-lg border border-primary/20 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {editableResults.map((res, i) => {
                  const highlight =
                    res.ingredient === "Glyphosate" ||
                    res.ingredient === "Fluroxy" ||
                    res.ingredient === "Mets";

                  return (
                    <motion.div
                      key={`${res.ingredient}-${i}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`rounded-3xl p-5 shadow-sm border ${
                        highlight
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-card-foreground border-border"
                      }`}
                    >
                      <div
                        className={`text-sm font-bold uppercase tracking-wide ${
                          highlight ? "text-primary-foreground/80" : "text-primary"
                        }`}
                      >
                        {res.ingredient}
                      </div>

                      <div className="mt-5 flex items-end gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          value={Number.isFinite(res.amount) ? res.amount : ""}
                          onChange={(e) => handleAmountChange(i, e.target.value)}
                          className={`w-full bg-transparent border-none outline-none text-4xl font-bold p-0 appearance-none ${
                            highlight
                              ? "text-primary-foreground placeholder:text-primary-foreground/40"
                              : "text-foreground placeholder:text-muted-foreground"
                          }`}
                        />
                        <span
                          className={`text-xl font-semibold mb-1 ${
                            highlight ? "text-primary-foreground/85" : "text-primary/75"
                          }`}
                        >
                          {res.unit}
                        </span>
                      </div>

                      {calculatedResults[i] && (
                        <p
                          className={`mt-3 text-xs ${
                            highlight ? "text-primary-foreground/75" : "text-muted-foreground"
                          }`}
                        >
                          Calculated: {formatDisplayAmount(calculatedResults[i].amount)}{" "}
                          {calculatedResults[i].unit}
                        </p>
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
                className="w-full mt-6 tactile-button bg-primary text-primary-foreground h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-6 h-6 text-secondary" />
                Save to Daily Log
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-8" />
      </motion.div>
    </MobileLayout>
  );
}
