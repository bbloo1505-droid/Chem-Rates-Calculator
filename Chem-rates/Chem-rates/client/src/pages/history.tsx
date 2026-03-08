import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Clock, Loader2, MapPin, Package, Sprout } from "lucide-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { useSprayCalculations } from "@/hooks/use-spray-calculations";
import { useCalibrationCalculations } from "@/hooks/use-calibration-calculations";

export default function History() {
  const [tab, setTab] = useState<'spray' | 'calibration'>('spray');
  
  const { data: sprayData, isLoading: sprayLoading } = useSprayCalculations();
  const { data: calibData, isLoading: calibLoading } = useCalibrationCalculations();

  return (
    <MobileLayout title="History">
      <div className="space-y-6">
        
        {/* Custom Tabs */}
        <div className="flex bg-muted p-1.5 rounded-2xl">
          <button
            onClick={() => setTab('spray')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              tab === 'spray' 
                ? "bg-white shadow-md text-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Spray Mixes
          </button>
          <button
            onClick={() => setTab('calibration')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              tab === 'calibration' 
                ? "bg-white shadow-md text-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Calibrations
          </button>
        </div>

        {/* Content Area */}
        <div className="pb-20">
          <AnimatePresence mode="wait">
            
            {/* SPRAY HISTORY */}
            {tab === 'spray' && (
              <motion.div
                key="spray"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                {sprayLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary/50" /></div>
                ) : sprayData?.length === 0 ? (
                  <EmptyState message="No spray calculations saved yet." />
                ) : (
                  sprayData?.map((item) => (
                    <div key={item.id} className="tactile-card p-5 rounded-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-2 h-full bg-primary/20" />
                      <div className="flex justify-between items-start mb-3 border-b border-border/50 pb-3">
                        <div>
                          <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                            <Sprout className="w-4 h-4 text-primary" /> {item.weed}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {item.volume}L</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.siteType}</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                          {item.createdAt ? format(new Date(item.createdAt), "MMM d") : "Unknown"}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-2">
                        {Object.entries(item.results as Record<string, string>).map(([key, val]) => (
                          <div key={key} className="flex flex-col bg-background/50 p-2 rounded-lg border border-border/30">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">{key}</span>
                            <span className="font-bold text-sm text-foreground">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* CALIBRATION HISTORY */}
            {tab === 'calibration' && (
              <motion.div
                key="calib"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {calibLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary/50" /></div>
                ) : calibData?.length === 0 ? (
                  <EmptyState message="No calibrations saved yet." />
                ) : (
                  calibData?.map((item) => (
                    <div key={item.id} className="tactile-card p-5 rounded-2xl">
                      <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-3">
                        <span className="text-sm text-muted-foreground font-bold flex items-center gap-1.5">
                          <Clock className="w-4 h-4" /> 
                          {item.createdAt ? format(new Date(item.createdAt), "MMM d, yyyy") : "Unknown date"}
                        </span>
                        <span className="bg-secondary/20 text-primary px-2 py-1 rounded-md text-xs font-bold">
                          {item.packSize}L Pack
                        </span>
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="flex-1 bg-primary/5 rounded-xl p-3 border border-primary/10">
                          <span className="text-xs uppercase font-bold text-primary/70 block mb-1">App Rate</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold font-display text-primary">{item.litresPer100m2.toFixed(1)}</span>
                            <span className="text-xs font-bold text-primary/70">L/100m²</span>
                          </div>
                        </div>
                        <div className="flex-1 bg-muted/50 rounded-xl p-3 border border-border/50">
                          <span className="text-xs uppercase font-bold text-muted-foreground block mb-1">Coverage</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold font-display text-foreground">{Math.round(item.areaPerPack)}</span>
                            <span className="text-xs font-bold text-muted-foreground">m²/pack</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex gap-4 text-xs font-medium text-muted-foreground justify-center">
                        <span>Walked: {item.distanceWalked}m</span>
                        <span>Width: {item.sprayWidth}m</span>
                        <span>Used: {item.volumeUsed}L</span>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
            
          </AnimatePresence>
        </div>
      </div>
    </MobileLayout>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <History className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <p className="text-muted-foreground font-medium">{message}</p>
    </div>
  );
}
