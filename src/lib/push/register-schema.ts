import { z } from 'zod';

// The app's FMRAPIClient.post sends a flat JSON map of strings, so news is "true"/"false".
export const registerSchema = z.object({
  token: z.string().regex(/^[0-9a-fA-F]{64,200}$/),
  environment: z.enum(['sandbox', 'production']),
  news: z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]),
});
