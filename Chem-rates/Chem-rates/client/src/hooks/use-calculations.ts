import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Use precise validation by falling back to robust schemas
// The routes manifest says responses[200] is an array of inferSelect types
const SprayCalcSchema = z.object({
  id: z.number(),
  weed: z.string(),
  volume: z.number(),
  siteType: z.string(),
  dyeStrength: z.string(),
  results: z.any(),
  createdAt: z.coerce.date().nullable(),
});

const CalibrationCalcSchema = z.object({
  id: z.number(),
  distanceWalked: z.number(),
  sprayWidth: z.number(),
  volumeUsed: z.number(),
  packSize: z.number(),
  litresPer100m2: z.number(),
  areaPerPack: z.number(),
  createdAt: z.coerce.date().nullable(),
});

export function useSprayCalculations() {
  return useQuery({
    queryKey: [api.sprayCalculations.list.path],
    queryFn: async () => {
      const res = await fetch(api.sprayCalculations.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch spray calculations");
      const data = await res.json();
      return z.array(SprayCalcSchema).parse(data);
    },
  });
}

export function useCreateSprayCalculation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.sprayCalculations.create.input>) => {
      const res = await fetch(api.sprayCalculations.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create spray calculation");
      return SprayCalcSchema.parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sprayCalculations.list.path] });
      toast({
        title: "Saved!",
        description: "Spray calculation added to history.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save calculation.",
        variant: "destructive",
      });
    }
  });
}

export function useCalibrationCalculations() {
  return useQuery({
    queryKey: [api.calibrationCalculations.list.path],
    queryFn: async () => {
      const res = await fetch(api.calibrationCalculations.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch calibration calculations");
      const data = await res.json();
      return z.array(CalibrationCalcSchema).parse(data);
    },
  });
}

export function useCreateCalibrationCalculation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.calibrationCalculations.create.input>) => {
      const res = await fetch(api.calibrationCalculations.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create calibration calculation");
      return CalibrationCalcSchema.parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.calibrationCalculations.list.path] });
      toast({
        title: "Saved!",
        description: "Calibration added to history.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save calibration.",
        variant: "destructive",
      });
    }
  });
}
