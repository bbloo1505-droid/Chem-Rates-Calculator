import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplet, Leaf, MapPin, Beaker, CheckCircle2 } from "lucide-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { StatCard } from "@/components/ui/stat-card";
import { useCreateSprayCalculation } from "@/hooks/use-spray-calculations";
import {
  fetchWeedRows,
  getWeedOptions,
  calculateSprayMixFromSheet,
  type SheetWeedRow,
} from "../lib/calculator-logic";
import { useToast } from "@/hooks/use-toast";

export default function SprayCalculator() {
  const [weed, setWeed] = useState<string>(WEED_OPTIONS[0]);
  const [volume, setVolume] = useState<string>("");
  const [siteType, setSiteType] = useState<'bush' | 'coastal'>('bush');
  const [dyeStrength, setDyeStrength] = useState<'none' | 'standard' | 'strong'>('standard');
  
  const { toast } = useToast();
  const createMutation = useCreateSprayCalculation();

  const volumeNum = parseFloat(volume);
  const isValid = !isNaN(volumeNum) && volumeNum > 0 && weed;
  
  const results = isValid ? calculateSprayMix(weed, volumeNum, siteType, dyeStrength) : [];

  const handleSave = () => {
    if (!isValid) return;
    
    createMutation.mutate({
      weed,
      volume: volumeNum,
      siteType,
      dyeStrength,
      results: formatResultJson(results)
    }, {
      onSuccess: () => {
        toast({
          title: "Saved to History",
          description: "Mix calculation successfully recorded.",
          duration: 3000,
        });
      }
    });
  };

  return (
    <MobileLayout title="Mix Calculator">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* WEED SELECTION */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider ml-1">
            <Leaf className="w-4 h-4 text-primary" /> Target Weed
          </label>
          <div className="relative">
            <select
              value={weed}
              onChange={(e) => setWeed(e.target.value)}
              className="w-full outdoor-input h-14 appearance-none pr-10"
            >
              <option value="" disabled>Select a weed...</option>
              {WEED_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* VOLUME INPUT */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider ml-1">
            <Beaker className="w-4 h-4 text-primary" /> Spray Volume (Litres)
          </label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="e.g. 15"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            className="w-full outdoor-input h-14"
          />
        </div>

        {/* SITE TYPE & DYE GRID */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider ml-1">
              <MapPin className="w-4 h-4 text-primary" /> Site Type
            </label>
            <div className="flex bg-muted/50 p-1 rounded-xl">
              {(['bush', 'coastal'] as const).map(type => (
                <button
                  key={type}
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
              {(['none', 'standard', 'strong'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setDyeStrength(type)}
                  className={`flex-1 py-2.5 px-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    dyeStrength === type 
                      ? "bg-white shadow-sm text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type === 'standard' ? 'Std' : type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RESULTS AREA */}
        <AnimatePresence>
          {isValid && results.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b-2 border-primary/20 pb-2">
                <h2 className="text-xl font-display font-bold text-foreground">Required Mix</h2>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
                  {volumeNum}L Total
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {results.map((res, i) => (
                  <StatCard 
                    key={res.ingredient}
                    title={res.ingredient}
                    value={res.amount % 1 === 0 ? res.amount : res.amount.toFixed(1)}
                    unit={res.unit}
                    delay={i * 0.1}
                    highlight={res.ingredient === 'Glyphosate' || res.ingredient === 'Fluroxy' || res.ingredient === 'Mets'}
                  />
                ))}
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={handleSave}
                disabled={createMutation.isPending}
                className="w-full mt-6 tactile-button bg-primary text-primary-foreground h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
              >
                {createMutation.isPending ? "Saving..." : (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-secondary" />
                    Save to History
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Bottom spacer for scroll */}
        <div className="h-8" />
      </motion.div>
    </MobileLayout>
  );
}
