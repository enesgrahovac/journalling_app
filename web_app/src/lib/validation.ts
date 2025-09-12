import { z } from 'zod'

export const userIdHeader = z.string().min(1)

export const uploadRequestSchema = z.object({
  // For future: if we switch to presigned URL flow
})

export const ocrRequestSchema = z
  .object({
    urls: z.array(z.string().url()).optional(),
    mediaIds: z.array(z.string().uuid()).optional(),
  })
  .refine((v) => (v.urls && v.urls.length > 0) || (v.mediaIds && v.mediaIds.length > 0), {
    message: 'Provide urls or mediaIds',
    path: ['urls'],
  })

export const journalCreateSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1),
  mediaIds: z.array(z.string().uuid()).optional(),
})

export const journalUpdateSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  mediaIds: z.array(z.string().uuid()).optional(),
})
