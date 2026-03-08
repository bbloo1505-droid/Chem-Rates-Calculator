import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Loader2, MapPin, Package, Sprout, Archive, BarChart3, Trash2 } from "lucide-react";
import { MobileLayout } from "@/components/layout/mobile-layout";

type SprayHistoryItem = {
  siteName?: string;
  date?: string;
  weed?: string;
  mixType?: string;
  volume?: number;
  siteType?: "bush" | "coastal";
  dyeStrength?: "none" | "standard" | "strong";
  results?: Record<string, string>;
  savedAt?: string;
};

type SummaryGroup = {
  key: string;
  siteName: string;
  date: string;
  entries: SprayHistoryItem[];
  mixTotals: Record<string, number>;
  weedsByMix: Record<string, string[]>;
};

function safeDateLabel(dateString?: string) {
  if (!dateString) return "Unknown date";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "Unknown date" : format(date, "MMM d, yyyy");
}

export default function HistoryPage() {
  const [tab, setTab] = useState<"spray" | "summary">("spray");
  const [sprayData, setSprayData] = useState<SprayHistoryItem[]>([]);
  const [sprayLoading, setSprayLoading] = useState(true);

  useEffect(() => {
    loadSprayHistory();
  }, []);

  const loadSprayHistory = () => {
    try {
      const storedSpray = localStorage.getItem("sprayHistory");
      const parsedSpray = storedSpray ? JSON.parse(storedSpray) : [];
      setSprayData(Array.isArray(parsedSpray) ? parsedSpray : []);
    } catch (error) {
      console.error("Could not load spray history:", error);
      setSprayData([]);
    } finally {
      setSprayLoading(false);
    }
  };

  const deleteSprayEntry = (savedAt?: string, index?: number) => {
    const existing = localStorage.getItem("sprayHistory");
    const history = existing ? JSON.parse(existing) : [];

    const updated = history.filter((item: SprayHistoryItem, i: number) => {
      if (savedAt) {
        return item.savedAt !== savedAt;
      }
      return i !== index;
    });

    localStorage.setItem("sprayHistory", JSON.stringify(updated));
    setSprayData(updated);
  };

  const clearAllSprayHistory = () => {
    localStorage.removeItem("sprayHistory");
    setSprayData([]);
  };

  const summaries = useMemo<SummaryGroup[]>(() => {
    const grouped: Record<string, SummaryGroup> = {};

    for (const entry of sprayData) {
      const siteName = entry.siteName?.trim() || "Unknown site";
      const date =
        entry.date ||
        (entry.savedAt ? entry.savedAt.slice(0, 10) : "Unknown date");
      const mixType = entry.mixType || "other";
      const weed = entry.weed || "Unknown weed";
      const volume = Number(entry.volume || 0);

      const key = `${date}__${siteName}`;

      if (!grouped[key]) {
        grouped[key] = {
          key,
          siteName,
          date,
          entries: [],
          mixTotals: {},
          weedsByMix: {},
        };
      }

      grouped[key].entries.push(entry);

      grouped[key].mixTotals[mixType] =
        (grouped[key].mixTotals[mixType] || 0) + volume;

      if (!grouped[key].weedsByMix[mixType]) {
        grouped[key].weedsByMix[mixType] = [];
      }

      if (!grouped[key].weedsByMix[mixType].includes(weed)) {
        grouped[key].weedsByMix[mixType].push(weed);
      }
    }

    return Object.values(grouped).sort((a, b) => {
      return `${b.date}`.localeCompare(`${a.date}`);
    });
  }, [sprayData]);

  return (
    <MobileLayout title="History">
      <div className="space-y-6">
        <div className="flex bg-muted p-1.5 rounded-2xl">
          <button
            onClick={() => setTab("spray")}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              tab === "spray"
                ? "bg-white shadow-md text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Entries
          </button>
          <button
            onClick={() => setTab("summary")}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              tab === "summary"
                ? "bg-white shadow-md text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Daily Summary
          </button>
        </div>

        {tab === "spray" && sprayData.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={clearAllSprayHistory}
              className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 bg-red-50 px-3 py-2 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
              Clear all
            </button>
          </div>
        )}

        <div className="pb-20">
          <AnimatePresence mode="wait">
            {tab === "spray" && (
              <motion.div
                key="spray"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                {sprayLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                  </div>
                ) : sprayData.length === 0 ? (
                  <EmptyState message="No spray calculations saved yet." />
                ) : (
                  sprayData.map((item, index) => (
                    <div
                      key={`${item.savedAt || "unknown"}-${index}`}
                      className="tactile-card p-5 rounded-2xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-2 h-full bg-primary/20" />

                      <div className="flex justify-between items-start mb-3 border-b border-border/50 pb-3">
                        <div>
                          <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                            <Sprout className="w-4 h-4 text-primary" /> {item.weed || "Unknown weed"}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {item.siteName || "Unknown site"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" /> {item.volume || 0}L
                            </span>
                            <span>{item.mixType || "other"}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                            {safeDateLabel(item.savedAt)}
                          </span>
                          <button
                            onClick={() => deleteSprayEntry(item.savedAt, index)}
                            className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded-md"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-2">
                        {Object.entries(item.results || {}).map(([key, val]) => (
                          <div
                            key={key}
                            className="flex flex-col bg-background/50 p-2 rounded-lg border border-border/30"
                          >
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">
                              {key}
                            </span>
                            <span className="font-bold text-sm text-foreground">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {tab === "summary" && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {sprayLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                  </div>
                ) : summaries.length === 0 ? (
                  <EmptyState message="No daily summaries yet." />
                ) : (
                  summaries.map((group) => (
                    <div key={group.key} className="tactile-card p-5 rounded-2xl">
                      <div className="flex justify-between items-start mb-4 border-b border-border/50 pb-3">
                        <div>
                          <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            {group.siteName}
                          </h3>
                          <div className="text-sm text-muted-foreground mt-1">
                            {safeDateLabel(group.date)}
                          </div>
                        </div>
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                          {group.entries.length} entries
                        </span>
                      </div>

                      <div className="space-y-3">
                        {Object.entries(group.mixTotals).map(([mixType, totalVolume]) => (
                          <div
                            key={mixType}
                            className="rounded-xl border border-border/40 p-3 bg-background/50"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-foreground uppercase text-sm">
                                {mixType}
                              </span>
                              <span className="font-bold text-primary">
                                {totalVolume} L
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Weeds: {group.weedsByMix[mixType]?.join(", ") || "None"}
                            </div>
                          </div>
                        ))}
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
        <Archive className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <p className="text-muted-foreground font-medium">{message}</p>
    </div>
  );
}
