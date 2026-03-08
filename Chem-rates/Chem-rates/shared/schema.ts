import { pgTable, text, serial, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const sprayCalculations = pgTable("spray_calculations", {
  id: serial("id").primaryKey(),
  weed: text("weed").notNull(),
  volume: real("volume").notNull(),
  siteType: text("site_type").notNull(),
  dyeStrength: text("dye_strength").notNull(),
  results: jsonb("results").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calibrationCalculations = pgTable("calibration_calculations", {
  id: serial("id").primaryKey(),
  distanceWalked: real("distance_walked").notNull(),
  sprayWidth: real("spray_width").notNull(),
  volumeUsed: real("volume_used").notNull(),
  packSize: real("pack_size").notNull(),
  litresPer100m2: real("litres_per_100m2").notNull(),
  areaPerPack: real("area_per_pack").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSpraySchema = createInsertSchema(sprayCalculations).omit({ id: true, createdAt: true });
export const insertCalibrationSchema = createInsertSchema(calibrationCalculations).omit({ id: true, createdAt: true });

export type SprayCalculation = typeof sprayCalculations.$inferSelect;
export type CalibrationCalculation = typeof calibrationCalculations.$inferSelect;
