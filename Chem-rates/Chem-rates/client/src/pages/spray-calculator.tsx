import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplet, Leaf, MapPin, Beaker, CheckCircle2 } from "lucide-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { StatCard } from "@/components/ui/stat-card";
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
  const isValid = !isNaN(volumeNum) && volumeNum > 0 && weed && siteName.trim();

  const availableConditions = getWeedConditions(weedRows, weed);
  const showConditionSelector = availableConditions.length > 1;

  const results = isValid
    ? calculateSprayMixFromSheet(
        weed,
        volumeNum,
        siteType,
        dyeStrength,
        weedRows,
        showConditionSelector ? weedCondition : "normal"
      )
    : [];

  const handleSave = async () => {
    if (!isValid) return;

    const mixType = getMixType(results);

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
      results: formatResultJson(results),
      saved_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("spray_entries").insert(entry);

    if (error) {
      console.error("Supabase save failed:", error);
      toast({
        title: "Save failed",
        description: "Could not save entry to cloud.",
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
          {isValid && results.length > 0 && (
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

              <div className="grid grid-cols-2 gap-3">
                {results.map((res, i) => (
                  <StatCard
                    key={`${res.ingredient}-${i}`}
                    title={res.ingredient}
                    value={res.amount % 1 === 0 ? res.amount : res.amount.toFixed(1)}
                    unit={res.unit}
                    delay={i * 0.1}
                    highlight={
                      res.ingredient === "Glyphosate" ||
                      res.ingredient === "Fluroxy" ||
                      res.ingredient === "Mets"
                    }
                  />
                ))}
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
