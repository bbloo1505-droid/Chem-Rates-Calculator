import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { z } from "zod";

type InsertCalibrationInput = z.infer<typeof api.calibrationCalculations.create.input>;

export function useCalibrationCalculations() {
  return useQuery({
    queryKey: [api.calibrationCalculations.list.path],
    queryFn: async () => {
      const res = await fetch(api.calibrationCalculations.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch calibration calculations");
      const data = await res.json();
      return api.calibrationCalculations.list.responses[200].parse(data);
    },
  });
}

export function useCreateCalibrationCalculation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCalibrationInput) => {
      const validated = api.calibrationCalculations.create.input.parse(data);
      const res = await fetch(api.calibrationCalculations.create.path, {
        method: api.calibrationCalculations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const errData = await res.json();
          throw new Error(errData.message || "Validation failed");
        }
        throw new Error("Failed to create calibration");
      }
      
      const responseData = await res.json();
      return api.calibrationCalculations.create.responses[201].parse(responseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.calibrationCalculations.list.path] });
    },
  });
}
