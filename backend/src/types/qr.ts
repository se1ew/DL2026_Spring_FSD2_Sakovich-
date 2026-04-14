import { z } from 'zod'

export const QrRequestSchema = z.object({
  text: z.string().min(1, 'text is required').max(2000, 'text is too long'),
  size: z.number().int().min(100).max(1000).optional().default(300),
  format: z.enum(['png', 'svg', 'base64']).optional().default('png'),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional().default('M'),
  margin: z.number().int().min(0).max(10).optional().default(2),
})

export type QrRequest = z.infer<typeof QrRequestSchema>
