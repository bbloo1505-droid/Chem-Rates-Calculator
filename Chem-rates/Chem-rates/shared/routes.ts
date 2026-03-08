import { z } from 'zod';
import { insertSpraySchema, insertCalibrationSchema, sprayCalculations, calibrationCalculations } from './schema';

export const api = {
  sprayCalculations: {
    list: {
      method: 'GET' as const,
      path: '/api/spray-calculations' as const,
      responses: {
        200: z.array(z.custom<typeof sprayCalculations.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/spray-calculations' as const,
      input: insertSpraySchema,
      responses: {
        201: z.custom<typeof sprayCalculations.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
  },
  calibrationCalculations: {
    list: {
      method: 'GET' as const,
      path: '/api/calibration-calculations' as const,
      responses: {
        200: z.array(z.custom<typeof calibrationCalculations.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/calibration-calculations' as const,
      input: insertCalibrationSchema,
      responses: {
        201: z.custom<typeof calibrationCalculations.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
