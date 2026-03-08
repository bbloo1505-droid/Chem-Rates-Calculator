import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

async function seedDatabase() {
  const existingSpray = await storage.getSprayCalculations();
  if (existingSpray.length === 0) {
    await storage.createSprayCalculation({
      weed: "Madeira vine",
      volume: 15,
      siteType: "bush",
      dyeStrength: "Standard (1ml/L)",
      results: { "Fluroxy": "45 ml", "Wetter": "60 ml", "Dye": "15 ml" }
    });
  }

  const existingCalibration = await storage.getCalibrationCalculations();
  if (existingCalibration.length === 0) {
    await storage.createCalibrationCalculation({
      distanceWalked: 100,
      sprayWidth: 2,
      volumeUsed: 5,
      packSize: 15,
      litresPer100m2: 2.5,
      areaPerPack: 600
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedDatabase();

  app.get(api.sprayCalculations.list.path, async (req, res) => {
    const calcs = await storage.getSprayCalculations();
    res.json(calcs);
  });

  app.post(api.sprayCalculations.create.path, async (req, res) => {
    try {
      const input = api.sprayCalculations.create.input.parse(req.body);
      const calc = await storage.createSprayCalculation(input);
      res.status(201).json(calc);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.get(api.calibrationCalculations.list.path, async (req, res) => {
    const calcs = await storage.getCalibrationCalculations();
    res.json(calcs);
  });

  app.post(api.calibrationCalculations.create.path, async (req, res) => {
    try {
      const input = api.calibrationCalculations.create.input.parse(req.body);
      const calc = await storage.createCalibrationCalculation(input);
      res.status(201).json(calc);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  return httpServer;
}
