import { db } from "./db";
import {
  sprayCalculations,
  calibrationCalculations,
  type SprayCalculation,
  type CalibrationCalculation,
  type insertSpraySchema,
  type insertCalibrationSchema
} from "@shared/schema";
import { z } from "zod";

export interface IStorage {
  getSprayCalculations(): Promise<SprayCalculation[]>;
  createSprayCalculation(calc: z.infer<typeof insertSpraySchema>): Promise<SprayCalculation>;
  getCalibrationCalculations(): Promise<CalibrationCalculation[]>;
  createCalibrationCalculation(calc: z.infer<typeof insertCalibrationSchema>): Promise<CalibrationCalculation>;
}

export class DatabaseStorage implements IStorage {
  async getSprayCalculations(): Promise<SprayCalculation[]> {
    return await db.select().from(sprayCalculations).orderBy(sprayCalculations.id);
  }

  async createSprayCalculation(calc: z.infer<typeof insertSpraySchema>): Promise<SprayCalculation> {
    const [newCalc] = await db.insert(sprayCalculations).values(calc).returning();
    return newCalc;
  }

  async getCalibrationCalculations(): Promise<CalibrationCalculation[]> {
    return await db.select().from(calibrationCalculations).orderBy(calibrationCalculations.id);
  }

  async createCalibrationCalculation(calc: z.infer<typeof insertCalibrationSchema>): Promise<CalibrationCalculation> {
    const [newCalc] = await db.insert(calibrationCalculations).values(calc).returning();
    return newCalc;
  }
}

export const storage = new DatabaseStorage();
