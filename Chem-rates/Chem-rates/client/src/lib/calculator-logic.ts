export interface MixResult {
  ingredient: string;
  amount: number;
  unit: string;
  note?: string;
}

export interface SheetWeedRow {
  weed: string;
  category: string;
  treatment: string;
  glyph_ml_L: string;
  mets_g_L: string;
  fluroxy_ml_L: string;
  wetter_ml_L: string;
  wetter_type: string;
  dye_ml_L: string;
  notes: string;
}

const SHEET_URL =
  "https://opensheet.elk.sh/1kFlHv57dZdQ8aLSvyPQ5ObhNzTyuRDBMxzdxuyKWyho/Sheet1";

export async function fetchWeedRows(): Promise<SheetWeedRow[]> {
  const response = await fetch(SHEET_URL);

  if (!response.ok) {
    throw new Error("Failed to load weed data from Google Sheets");
  }

  const data = await response.json();
  return data as SheetWeedRow[];
}

export function getWeedOptions(rows: SheetWeedRow[]): string[] {
  return rows.map((row) => row.weed);
}

export function calculateSprayMixFromSheet(
  weed: string,
  volumeL: number,
  siteType: "bush" | "coastal",
  dyeStrength: "none" | "standard" | "strong",
  rows: SheetWeedRow[],
  weedCondition: "normal" | "seeding" // NEW
): MixResult[] {
  const results: MixResult[] = [];

  if (!volumeL || volumeL <= 0) return results;

  const row = rows.find((r) => r.weed === weed);
  if (!row) return results;

  let glyphRate = Number(row.glyph_ml_L || 0);
  let metsRate = Number(row.mets_g_L || 0);
  const fluroxyRate = Number(row.fluroxy_ml_L || 0);
  const wetterRate = Number(row.wetter_ml_L || 0);

  const isBasal = row.treatment.toLowerCase() === "basal";

  // NEW CONDITION LOGIC
  // Example: if seeding we prioritise mets over glyph
  if (weedCondition === "seeding" && metsRate > 0) {
    glyphRate = 0;
  }

  if (glyphRate > 0) {
    results.push({
      ingredient: "Glyphosate",
      amount: glyphRate * volumeL,
      unit: "ml",
    });
  }

  if (metsRate > 0) {
    results.push({
      ingredient: "Mets",
      amount: metsRate * volumeL,
      unit: "g",
    });
  }

  if (fluroxyRate > 0) {
    results.push({
      ingredient: "Fluroxy",
      amount: fluroxyRate * volumeL,
      unit: "ml",
    });
  }

  if (wetterRate > 0) {
    let wetterName = "Wetter";
    let wetterNote: string | undefined;

    if (row.wetter_type === "site") {
      if (siteType === "coastal") {
        wetterName = "Spreadwet";
        wetterNote = "Coastal / beach sites";
      } else {
        wetterName = "Brushwet";
        wetterNote = "Bush sites";
      }
    }

    results.push({
      ingredient: wetterName,
      amount: wetterRate * volumeL,
      unit: "ml",
      note: wetterNote,
    });
  }

  if (dyeStrength === "standard") {
    results.push({
      ingredient: "Dye",
      amount: 2 * volumeL,
      unit: "ml",
    });
  } else if (dyeStrength === "strong") {
    results.push({
      ingredient: "Dye",
      amount: 4 * volumeL,
      unit: "ml",
    });
  }

  if (isBasal) {
    results.push({
      ingredient: "Biodiesel",
      amount: volumeL,
      unit: "L",
      note: "Carrier fluid",
    });
  }

  return results;
}

export function formatResultJson(results: MixResult[]): Record<string, string> {
  const formatted: Record<string, string> = {};

  results.forEach((r) => {
    const formattedAmount =
      r.amount % 1 === 0 ? r.amount.toString() : r.amount.toFixed(1);

    formatted[r.ingredient] = `${formattedAmount} ${r.unit}${
      r.note ? ` (${r.note})` : ""
    }`;
  });

  return formatted;
}
