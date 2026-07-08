import { z } from 'zod';

/**
 * Shared validation for NewsletterPayload — used by the send, preview, and
 * edit routes so all three accept/reject the exact same shape.
 */
export const newsletterPayloadSchema = z.object({
  subject: z.string().min(1).max(200),
  intro: z.string().optional(),
  parkrun: z.object({
    text: z.string(),
    totalRuns: z.number().optional(),
    venues: z.number().optional(),
    avgTime: z.string().optional(),
  }).optional(),
  news: z.array(z.object({ title: z.string(), url: z.string().url(), source: z.string(), imageUrl: z.string().url().optional(), description: z.string().optional() })).optional(),
  blogPost: z.object({ title: z.string(), url: z.string().url(), snippet: z.string(), imageUrl: z.string().url().optional() }).optional(),
  videoOfTheWeek: z.object({ title: z.string(), url: z.string().url(), description: z.string(), thumbnailUrl: z.string().url() }).optional(),
  appOfTheWeek: z.object({ name: z.string(), url: z.string().url(), description: z.string() }).optional(),
  sessionOfTheWeek: z.object({ title: z.string(), description: z.string() }).optional(),
  trainingTip: z.object({ text: z.string(), citation: z.string().optional() }).optional(),
  scienceSection: z.object({ text: z.string(), citation: z.string().optional() }).optional(),
  nutritionTip: z.object({ text: z.string(), citation: z.string().optional() }).optional(),
  fromTheArchives: z.object({ title: z.string(), url: z.string().url(), description: z.string(), imageUrl: z.string().url().optional() }).optional(),
  whatsNew: z.object({ text: z.string() }).optional(),
});
