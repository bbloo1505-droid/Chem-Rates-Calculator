export interface MixResult {
  ingredient: string;
  amount: number;
  unit: string;
  note?: string;
}

export const WEED_OPTIONS = [
  "Madeira vine",
  "Singapore daisy",
  "Asparagus fern",
  "Blue billygoat weed",
  "Lantana",
  "Ochna (basal bark)",
  "Ochna (foliar)",
  "Syngonium"
] as const;

export function calculateSprayMix(
  weed: string, 
  volumeL: number, 
  siteType: 'bush' | 'coastal', 
  dyeStrength: 'none' | 'standard' | 'strong'
): MixResult[] {
  const results: MixResult[] = [];
  
  if (!volumeL || volumeL <= 0) return results;

  // Herbicide & Wetter logic
  switch (weed) {
    case "Madeira vine":
      results.push({ ingredient: "Fluroxy", amount: 3 * volumeL, unit: "ml" });
      results.push({ ingredient: "Wetter", amount: 4 * volumeL, unit: "ml" });
      break;
    case "Singapore daisy":
      results.push({ ingredient: "Mets", amount: 0.1 * volumeL, unit: "g" });
      results.push({ ingredient: "Wetter", amount: 2 * volumeL, unit: "ml" });
      break;
    case "Asparagus fern":
      results.push({ ingredient: "Mets", amount: 0.1 * volumeL, unit: "g" });
      if (siteType === 'coastal') {
        results.push({ ingredient: "Spreadwet", amount: 2 * volumeL, unit: "ml", note: "Required for beach sites" });
      } else {
        results.push({ ingredient: "Wetter", amount: 2 * volumeL, unit: "ml" });
      }
      break;
    case "Blue billygoat weed":
    case "Lantana":
      results.push({ ingredient: "Glyphosate", amount: 10 * volumeL, unit: "ml" });
      break;
    case "Ochna (basal bark)":
      results.push({ ingredient: "Fluroxy", amount: 30 * volumeL, unit: "ml" });
      results.push({ ingredient: "Biodiesel", amount: volumeL, unit: "L", note: "Carrier fluid" });
      break;
    case "Ochna (foliar)":
      results.push({ ingredient: "Fluroxy", amount: 8 * volumeL, unit: "ml" });
      break;
    case "Syngonium":
      results.push({ ingredient: "Glyphosate", amount: 10 * volumeL, unit: "ml" });
      results.push({ ingredient: "Mets", amount: 0.1 * volumeL, unit: "g" });
      results.push({ ingredient: "Triple Wetter", amount: 6 * volumeL, unit: "ml" });
      break;
  }

  // Dye logic
  if (dyeStrength === 'standard') {
    results.push({ ingredient: "Dye", amount: 1 * volumeL, unit: "ml" });
  } else if (dyeStrength === 'strong') {
    results.push({ ingredient: "Dye", amount: 2 * volumeL, unit: "ml" });
  }

  return results;
}

export function formatResultJson(results: MixResult[]): Record<string, string> {
  const formatted: Record<string, string> = {};
  results.forEach(r => {
    // Format nicely, e.g., "45 ml"
    const formattedAmount = r.amount % 1 === 0 ? r.amount.toString() : r.amount.toFixed(1);
    formatted[r.ingredient] = `${formattedAmount} ${r.unit}${r.note ? ` (${r.note})` : ''}`;
  });
  return formatted;
}
