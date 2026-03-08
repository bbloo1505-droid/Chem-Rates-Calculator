import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ruler, Activity, CheckCircle2, Package } from "lucide-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { StatCard } from "@/components/ui/stat-card";
import { useCreateCalibrationCalculation } from "@/hooks/use-calibration-calculations";
import { useToast } from "@/hooks/use-toast";

export default function Calibration() {
  const [distance, setDistance] = useState<string>("");
  const [width, setWidth] = useState<string>("");
  const [volume, setVolume] = useState<string>("");
  const [packSize, setPackSize] = useState<string>("15"); // Default 15L pack
  
  const { toast } = useToast();
  const createMutation = useCreateCalibrationCalculation();

  const d = parseFloat(distance);
  const w = parseFloat(width);
  const v = parseFloat(volume);
  const p = parseFloat(packSize);

  const isValid = !isNaN(d) && !isNaN(w) && !isNaN(v) && !isNaN(p) && d > 0 && w > 0 && v > 0 && p > 0;
  
  // Calculations
  const areaCovered = isValid ? d * w : 0;
  const litresPer100m2 = isValid ? (v / areaCovered) * 100 : 0;
  const areaPerPack = isValid && litresPer100m2 > 0 ? (p / litresPer100m2) * 100 : 0;

  const handleSave = () => {
    if (!isValid) return;
    
    createMutation.mutate({
      distanceWalked: d,
      sprayWidth: w,
      volumeUsed: v,
      packSize: p,
      litresPer100m2,
      areaPerPack
    }, {
      onSuccess: () => {
        toast({
          title: "Calibration Saved",
          description: "Your equipment calibration has been recorded.",
          duration: 3000,
        });
      }
    });
  };

  return (
    <MobileLayout title="Calibration">
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-5"
      >
        <div className="bg-secondary/20 border border-secondary/50 rounded-xl p-4 text-sm text-secondary-foreground flex items-start gap-3">
          <Activity className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
          <p>Walk a measured test strip spraying at your normal pace. Enter the details below.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider ml-1">
              <Ruler className="w-3 h-3 text-primary" /> Distance (m)
            </label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 50"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full outdoor-input h-14 text-center"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider ml-1">
              <Activity className="w-3 h-3 text-primary" /> Width (m)
            </label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 1.5"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-full outdoor-input h-14 text-center"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider ml-1">
              <Activity className="w-3 h-3 text-primary" /> Vol Used (L)
            </label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 2.5"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="w-full outdoor-input h-14 text-center"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider ml-1">
              <Package className="w-3 h-3 text-primary" /> Pack Size (L)
            </label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="15"
              value={packSize}
              onChange={(e) => setPackSize(e.target.value)}
              className="w-full outdoor-input h-14 text-center"
            />
          </div>
        </div>

        {/* RESULTS AREA */}
        <AnimatePresence>
          {isValid && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="pt-4 space-y-4"
            >
              <div className="flex flex-col gap-3">
                <StatCard 
                  title="Application Rate"
                  value={litresPer100m2.toFixed(2)}
                  unit="L / 100m²"
                  highlight={true}
                  delay={0}
                />
                <StatCard 
                  title="Coverage Per Pack"
                  value={Math.round(areaPerPack)}
                  unit="m²"
                  delay={0.1}
                />
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={handleSave}
                disabled={createMutation.isPending}
                className="w-full mt-4 tactile-button bg-primary text-primary-foreground h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
              >
                {createMutation.isPending ? "Saving..." : (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-secondary" />
                    Save Calibration
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="h-8" />
      </motion.div>
    </MobileLayout>
  );
}
