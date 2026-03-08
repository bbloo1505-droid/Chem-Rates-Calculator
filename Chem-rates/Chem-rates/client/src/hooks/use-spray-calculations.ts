import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { z } from "zod";

type InsertSprayInput = z.infer<typeof api.sprayCalculations.create.input>;

export function useSprayCalculations() {
  return useQuery({
    queryKey: [api.sprayCalculations.list.path],
    queryFn: async () => {
      const res = await fetch(api.sprayCalculations.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch spray calculations");
      const data = await res.json();
      return api.sprayCalculations.list.responses[200].parse(data);
    },
  });
}

export function useCreateSprayCalculation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSprayInput) => {
      const validated = api.sprayCalculations.create.input.parse(data);
      const res = await fetch(api.sprayCalculations.create.path, {
        method: api.sprayCalculations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const errData = await res.json();
          throw new Error(errData.message || "Validation failed");
        }
        throw new Error("Failed to create calculation");
      }
      
      const responseData = await res.json();
      return api.sprayCalculations.create.responses[201].parse(responseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sprayCalculations.list.path] });
    },
  });
}
