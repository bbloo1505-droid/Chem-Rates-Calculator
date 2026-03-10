import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Loader2,
  MapPin,
  Package,
  Sprout,
  Archive,
  BarChart3,
  Trash2,
  CalendarDays,
  FlaskConical,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock3,
} from "lucide-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { useToast } from "@/hooks/use-toast";

type SprayHistoryItem = {
  siteName?: string;
  date?: string;
  weed?: string;
  weedCondition?: "normal" | "seeding";
  mixType?: string;
  volume?: number;
  siteType?: "bush" | "coastal";
  dyeStrength?: "none" | "standard" | "strong";
  results?: Record<string, string>;
  savedAt?: string;
};

type ChemicalTotal = {
  amount: number;
  unit: string;
};

type MixBreakdown = {
  mixLabel: string;
  weeds: string[];
  sites: string[];
  entries: number;
  totalVolume: number;
};

type DailySummary = {
  date: string;
  entries: SprayHistoryItem[];
  entryCount: number;
  totalVolume: number;
  sites: string[];
  weeds: string[];
  chemicalTotals: Record<string, ChemicalTotal>;
  mixBreakdown: MixBreakdown[];
};

type SubmissionStatus = "not-submitted" | "submitted" | "failed";

type DailySubmissionRecord = {
  status: SubmissionStatus;
  submittedAt?: string | null;
};

type DailySubmissionMap = Record<string, DailySubmissionRecord>;

const DAILY_STATUS_STORAGE_KEY = "dailySummaryStatus";

function safeDateLabel(dateString?: string) {
  if (!dateString) return "Unknown date";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "Unknown date" : format(date, "MMM d, yyyy");
}

function getEntryDate(entry: SprayHistoryItem) {
  return entry.date || (entry.savedAt ? entry.savedAt.slice(0, 10) : "Unknown date");
}

function parseAmount(value: string): { amount: number; unit: string } | null {
  const clean = String(value).trim();
  const match = clean.match(/^([\d.]+)\s*([a-zA-Z]+)\b/);
  if (!match) return null;

  return {
    amount: Number(match[1]),
    unit: match[2],
  };
}

function buildMixLabel(results?: Record<string, string>) {
  if (!results) return "Unknown mix";

  const hiddenIngredients = new Set(["Dye"]);
  const ingredients = Object.keys(results)
    .filter((name) => !hiddenIngredients.has(name))
    .sort((a, b) => a.localeCompare(b));

  if (ingredients.length === 0) {
    const allIngredients = Object.keys(results).sort((a, b) => a.localeCompare(b));
    return allIngredients.join(" + ") || "Unknown mix";
  }

  return ingredients.join(" + ");
}

function formatAmount(amount: number) {
  return amount % 1 === 0 ? String(amount) : amount.toFixed(1);
}

function buildDailySubmissionPayload(summary: DailySummary) {
  return {
    date: summary.date,
    entryCount: summary.entryCount,
    totalVolumeL: summary.totalVolume,
    sites: summary.sites,
    weeds: summary.weeds,
    chemicalTotals: summary.chemicalTotals,
    mixBreakdown: summary.mixBreakdown,
  };
}

function buildSummaryNotes(summary: DailySummary) {
  const chemicalLines = Object.entries(summary.chemicalTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([ingredient, total]) =>
        `${ingredient}: ${formatAmount(total.amount)} ${total.unit}`
    );

  const mixLines = summary.mixBreakdown.map(
    (mix) =>
      `${mix.mixLabel} — ${formatAmount(mix.totalVolume)}L — Weeds: ${mix.weeds.join(
        ", "
      )} — Sites: ${mix.sites.join(", ")}`
  );

  return [
    `Date: ${safeDateLabel(summary.date)}`,
    `Entries: ${summary.entryCount}`,
    `Sites: ${summary.sites.join(", ")}`,
    `Weeds: ${summary.weeds.join(", ")}`,
    `Total Volume: ${formatAmount(summary.totalVolume)} L`,
    "",
    "Chemical Totals:",
    ...chemicalLines,
    "",
    "Mixes Used:",
    ...mixLines,
  ].join("\n");
}

function loadDailySubmissionStatus(): DailySubmissionMap {
  try {
    const raw = localStorage.getItem(DAILY_STATUS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveDailySubmissionStatus(map: DailySubmissionMap) {
  localStorage.setItem(DAILY_STATUS_STORAGE_KEY, JSON.stringify(map));
}

export default function HistoryPage() {
  const [tab, setTab] = useState<"spray" | "summary">("spray");
  const [sprayData, setSprayData] = useState<SprayHistoryItem[]>([]);
  const [sprayLoading, setSprayLoading] = useState(true);
  const [submissionStatus, setSubmissionStatus] = useState<DailySubmissionMap>({});
  const [submittingDate, setSubmittingDate] = useState<string | null>(null);
  const [confirmSubmitDate, setConfirmSubmitDate] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadSprayHistory();
    setSubmissionStatus(loadDailySubmissionStatus());
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

  const updateSubmissionStatus = (date: string, record: DailySubmissionRecord) => {
    setSubmissionStatus((prev) => {
      const next = {
        ...prev,
        [date]: record,
      };
      saveDailySubmissionStatus(next);
      return next;
    });
  };

  const handleFakeSubmit = async (summary: DailySummary) => {
    setSubmittingDate(summary.date);

    try {
      const payload = buildDailySubmissionPayload(summary);
      const notes = buildSummaryNotes(summary);

      console.log("Zoho submission payload preview:", payload);
      console.log("Zoho summary notes preview:", notes);

      await new Promise((resolve) => setTimeout(resolve, 700));

      updateSubmissionStatus(summary.date, {
        status: "submitted",
        submittedAt: new Date().toISOString(),
      });

      toast({
        title: "Submit ready",
        description: "Daily summary payload prepared. Real Zoho submit can be connected tomorrow.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Fake submit failed:", error);

      updateSubmissionStatus(summary.date, {
        status: "failed",
        submittedAt: null,
      });

      toast({
        title: "Submit failed",
        description: "Could not prepare this daily summary.",
        duration: 3000,
      });
    } finally {
      setSubmittingDate(null);
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

  const dailySummaries = useMemo<DailySummary[]>(() => {
    const grouped: Record<string, DailySummary> = {};

    for (const entry of sprayData) {
      const date = getEntryDate(entry);
      const siteName = entry.siteName?.trim() || "Unknown site";
      const weedName = entry.weed?.trim() || "Unknown weed";
      const volume = Number(entry.volume || 0);
      const mixLabel = buildMixLabel(entry.results);

      if (!grouped[date]) {
        grouped[date] = {
          date,
          entries: [],
          entryCount: 0,
          totalVolume: 0,
          sites: [],
          weeds: [],
          chemicalTotals: {},
          mixBreakdown: [],
        };
      }

      const summary = grouped[date];
      summary.entries.push(entry);
      summary.entryCount += 1;
      summary.totalVolume += volume;

      if (!summary.sites.includes(siteName)) {
        summary.sites.push(siteName);
      }

      if (!summary.weeds.includes(weedName)) {
        summary.weeds.push(weedName);
      }

      for (const [ingredient, value] of Object.entries(entry.results || {})) {
        const parsed = parseAmount(value);
        if (!parsed) continue;

        if (!summary.chemicalTotals[ingredient]) {
          summary.chemicalTotals[ingredient] = {
            amount: 0,
            unit: parsed.unit,
          };
        }

        summary.chemicalTotals[ingredient].amount += parsed.amount;
      }

      let existingMix = summary.mixBreakdown.find((mix) => mix.mixLabel === mixLabel);

      if (!existingMix) {
        existingMix = {
          mixLabel,
          weeds: [],
          sites: [],
          entries: 0,
          totalVolume: 0,
        };
        summary.mixBreakdown.push(existingMix);
      }

      existingMix.entries += 1;
      existingMix.totalVolume += volume;

      if (!existingMix.weeds.includes(weedName)) {
        existingMix.weeds.push(weedName);
      }

      if (!existingMix.sites.includes(siteName)) {
        existingMix.sites.push(siteName);
      }
    }

    return Object.values(grouped)
      .map((summary) => ({
        ...summary,
        sites: [...summary.sites].sort((a, b) => a.localeCompare(b)),
        weeds: [...summary.weeds].sort((a, b) => a.localeCompare(b)),
        mixBreakdown: [...summary.mixBreakdown].sort((a, b) =>
          a.mixLabel.localeCompare(b.mixLabel)
        ),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
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
                            {item.weedCondition && item.weedCondition !== "normal" && (
                              <span>{item.weedCondition}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                            {safeDateLabel(item.savedAt || item.date)}
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
                ) : dailySummaries.length === 0 ? (
                  <EmptyState message="No daily summaries yet." />
                ) : (
                  dailySummaries.map((summary) => {
                    const statusRecord = submissionStatus[summary.date] || {
                      status: "not-submitted" as SubmissionStatus,
                      submittedAt: null,
                    };

                    return (
                      <div key={summary.date} className="tactile-card p-5 rounded-2xl space-y-4">
                        <div className="flex justify-between items-start border-b border-border/50 pb-3 gap-3">
                          <div>
                            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                              <CalendarDays className="w-4 h-4 text-primary" />
                              {safeDateLabel(summary.date)}
                            </h3>
                            <div className="text-sm text-muted-foreground mt-1">
                              {summary.entryCount} entries across {summary.sites.length} site
                              {summary.sites.length === 1 ? "" : "s"}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                              {formatAmount(summary.totalVolume)}L total
                            </span>
                            <StatusBadge
                              status={statusRecord.status}
                              submittedAt={statusRecord.submittedAt}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <SummaryStat
                            label="Entries"
                            value={String(summary.entryCount)}
                            icon={<Archive className="w-4 h-4 text-primary" />}
                          />
                          <SummaryStat
                            label="Sites"
                            value={String(summary.sites.length)}
                            icon={<MapPin className="w-4 h-4 text-primary" />}
                          />
                          <SummaryStat
                            label="Volume"
                            value={`${formatAmount(summary.totalVolume)}L`}
                            icon={<Package className="w-4 h-4 text-primary" />}
                          />
                        </div>

                        <div className="rounded-xl border border-border/40 p-4 bg-background/50">
                          <div className="flex items-center gap-2 mb-3">
                            <FlaskConical className="w-4 h-4 text-primary" />
                            <h4 className="font-bold text-foreground">Chemical Totals</h4>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(summary.chemicalTotals)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([ingredient, total]) => (
                                <div
                                  key={ingredient}
                                  className="rounded-lg border border-border/30 p-3 bg-white/60"
                                >
                                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                                    {ingredient}
                                  </div>
                                  <div className="font-bold text-foreground">
                                    {formatAmount(total.amount)} {total.unit}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>

                        <div className="rounded-xl border border-border/40 p-4 bg-background/50">
                          <h4 className="font-bold text-foreground mb-3">Sites Worked</h4>
                          <div className="flex flex-wrap gap-2">
                            {summary.sites.map((site) => (
                              <Tag key={site} label={site} />
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl border border-border/40 p-4 bg-background/50">
                          <h4 className="font-bold text-foreground mb-3">Weeds Treated</h4>
                          <div className="flex flex-wrap gap-2">
                            {summary.weeds.map((weed) => (
                              <Tag key={weed} label={weed} />
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl border border-border/40 p-4 bg-background/50">
                          <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            <h4 className="font-bold text-foreground">Mixes Used</h4>
                          </div>

                          <div className="space-y-3">
                            {summary.mixBreakdown.map((mix) => (
                              <div
                                key={mix.mixLabel}
                                className="rounded-xl border border-border/30 p-3 bg-white/60"
                              >
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <div className="font-bold text-foreground text-sm">
                                    {mix.mixLabel}
                                  </div>
                                  <div className="text-sm font-bold text-primary">
                                    {formatAmount(mix.totalVolume)}L
                                  </div>
                                </div>

                                <div className="text-sm text-muted-foreground">
                                  <span className="font-semibold text-foreground">Weeds:</span>{" "}
                                  {mix.weeds.join(", ")}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-semibold text-foreground">Sites:</span>{" "}
                                  {mix.sites.join(", ")}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-semibold text-foreground">Entries:</span>{" "}
                                  {mix.entries}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => setConfirmSubmitDate(summary.date)}
                          disabled={
                            submittingDate === summary.date ||
                            statusRecord.status === "submitted"
                          }
                          className="w-full mt-2 tactile-button bg-primary text-primary-foreground h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {submittingDate === summary.date ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Preparing Submit...
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5" />
                              Submit to Zoho
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {confirmSubmitDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">
                  Submit Daily Log?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to submit this day’s chemical usage to Zoho?
                  This should only be done once at the end of the day.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmSubmitDate(null)}
                  className="flex-1 rounded-xl bg-muted py-3 font-bold text-foreground"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    const selectedSummary = dailySummaries.find(
                      (s) => s.date === confirmSubmitDate
                    );

                    if (selectedSummary) {
                      handleFakeSubmit(selectedSummary);
                    }

                    setConfirmSubmitDate(null);
                  }}
                  className="flex-1 rounded-xl bg-primary py-3 font-bold text-primary-foreground"
                >
                  Yes, Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}

function SummaryStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/40 p-3 bg-background/50">
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <div className="text-[10px] uppercase font-bold text-muted-foreground">{label}</div>
      <div className="font-bold text-foreground">{value}</div>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
      {label}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: SubmissionStatus;
  submittedAt?: string | null;
}) {
  if (status === "submitted") {
    return (
      <div className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1.5 rounded-xl">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Submitted
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1.5 rounded-xl">
        <AlertCircle className="w-3.5 h-3.5" />
        Failed
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-xl">
      <Clock3 className="w-3.5 h-3.5" />
      Not submitted
    </div>
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
