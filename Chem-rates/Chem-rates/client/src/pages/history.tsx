import { useEffect, useMemo, useState } from "react";
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
  const match = String(value).match(/^([\d.]+)\s*([a-zA-Z]+)/);
  if (!match) return null;
  return { amount: Number(match[1]), unit: match[2] };
}

function buildMixLabel(results?: Record<string, string>) {
  if (!results) return "Unknown mix";
  const ingredients = Object.keys(results).filter((i) => i !== "Dye").sort();
  return ingredients.join(" + ");
}

function formatAmount(amount: number) {
  return amount % 1 === 0 ? String(amount) : amount.toFixed(1);
}

function loadDailySubmissionStatus(): DailySubmissionMap {
  try {
    const raw = localStorage.getItem(DAILY_STATUS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
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
      const stored = localStorage.getItem("sprayHistory");
      const parsed = stored ? JSON.parse(stored) : [];
      setSprayData(parsed);
    } catch {
      setSprayData([]);
    } finally {
      setSprayLoading(false);
    }
  };

  const updateSubmissionStatus = (date: string, record: DailySubmissionRecord) => {
    setSubmissionStatus((prev) => {
      const next = { ...prev, [date]: record };
      saveDailySubmissionStatus(next);
      return next;
    });
  };

  const handleFakeSubmit = async (summary: DailySummary) => {
    setSubmittingDate(summary.date);

    try {
      console.log("Zoho payload preview:", summary);

      await new Promise((resolve) => setTimeout(resolve, 800));

      updateSubmissionStatus(summary.date, {
        status: "submitted",
        submittedAt: new Date().toISOString(),
      });

      toast({
        title: "Submitted",
        description: "Daily summary prepared for Zoho.",
      });
    } catch {
      updateSubmissionStatus(summary.date, { status: "failed" });
    } finally {
      setSubmittingDate(null);
    }
  };

  const dailySummaries = useMemo<DailySummary[]>(() => {
    const grouped: Record<string, DailySummary> = {};

    for (const entry of sprayData) {
      const date = getEntryDate(entry);
      const site = entry.siteName || "Unknown site";
      const weed = entry.weed || "Unknown weed";
      const volume = Number(entry.volume || 0);
      const mix = buildMixLabel(entry.results);

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

      const g = grouped[date];

      g.entries.push(entry);
      g.entryCount += 1;
      g.totalVolume += volume;

      if (!g.sites.includes(site)) g.sites.push(site);
      if (!g.weeds.includes(weed)) g.weeds.push(weed);

      for (const [chem, val] of Object.entries(entry.results || {})) {
        const parsed = parseAmount(val);
        if (!parsed) continue;

        if (!g.chemicalTotals[chem]) {
          g.chemicalTotals[chem] = { amount: 0, unit: parsed.unit };
        }

        g.chemicalTotals[chem].amount += parsed.amount;
      }

      let mixEntry = g.mixBreakdown.find((m) => m.mixLabel === mix);

      if (!mixEntry) {
        mixEntry = { mixLabel: mix, weeds: [], sites: [], entries: 0, totalVolume: 0 };
        g.mixBreakdown.push(mixEntry);
      }

      mixEntry.entries++;
      mixEntry.totalVolume += volume;

      if (!mixEntry.weeds.includes(weed)) mixEntry.weeds.push(weed);
      if (!mixEntry.sites.includes(site)) mixEntry.sites.push(site);
    }

    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
  }, [sprayData]);

  return (
    <MobileLayout title="History">
      <div className="space-y-6">

        {/* TAB SWITCH */}
        <div className="flex bg-muted p-1.5 rounded-2xl">
          <button
            onClick={() => setTab("spray")}
            className={`flex-1 py-3 rounded-xl font-bold ${
              tab === "spray" ? "bg-white shadow text-primary" : ""
            }`}
          >
            Entries
          </button>
          <button
            onClick={() => setTab("summary")}
            className={`flex-1 py-3 rounded-xl font-bold ${
              tab === "summary" ? "bg-white shadow text-primary" : ""
            }`}
          >
            Daily Summary
          </button>
        </div>

        <AnimatePresence mode="wait">

          {tab === "summary" && (
            <motion.div key="summary" className="space-y-4">
              {dailySummaries.map((summary) => {
                const status = submissionStatus[summary.date]?.status || "not-submitted";

                return (
                  <div key={summary.date} className="tactile-card p-5 rounded-2xl space-y-4">

                    {/* HEADER */}
                    <div className="flex justify-between">
                      <h3 className="font-bold flex gap-2 items-center">
                        <CalendarDays className="w-4 h-4" />
                        {safeDateLabel(summary.date)}
                      </h3>

                      <StatusBadge status={status} />
                    </div>

                    {/* TOTAL VOLUME */}
                    <div className="text-sm">
                      Total Volume: <b>{formatAmount(summary.totalVolume)}L</b>
                    </div>

                    {/* CHEM TOTALS */}
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(summary.chemicalTotals).map(([k, v]) => (
                        <div key={k} className="border rounded p-2 text-sm">
                          <b>{k}</b>
                          <div>
                            {formatAmount(v.amount)} {v.unit}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* SUBMIT BUTTON */}
                    <button
                      onClick={() => setConfirmSubmitDate(summary.date)}
                      disabled={status === "submitted"}
                      className="w-full tactile-button bg-primary text-primary-foreground h-14 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      Submit to Zoho
                    </button>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONFIRM SUBMIT MODAL */}
        {confirmSubmitDate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">

              <h3 className="text-lg font-bold">Submit Daily Log?</h3>

              <p className="text-sm text-muted-foreground">
                Are you sure you want to submit this day's chemical usage?
                This should only be done once at the end of the day.
              </p>

              <div className="flex gap-3">

                <button
                  onClick={() => setConfirmSubmitDate(null)}
                  className="flex-1 bg-muted py-3 rounded-xl font-bold"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    const summary = dailySummaries.find(
                      (s) => s.date === confirmSubmitDate
                    );

                    if (summary) handleFakeSubmit(summary);

                    setConfirmSubmitDate(null);
                  }}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold"
                >
                  Yes Submit
                </button>

              </div>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  if (status === "submitted")
    return (
      <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
        <CheckCircle2 className="w-4 h-4" /> Submitted
      </div>
    );

  if (status === "failed")
    return (
      <div className="flex items-center gap-1 text-red-600 text-sm font-bold">
        <AlertCircle className="w-4 h-4" /> Failed
      </div>
    );

  return (
    <div className="flex items-center gap-1 text-amber-600 text-sm font-bold">
      <Clock3 className="w-4 h-4" /> Not submitted
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Archive className="w-10 h-10 mb-3 text-muted-foreground" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
