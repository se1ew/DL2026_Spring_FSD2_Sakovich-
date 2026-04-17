import { z } from 'zod'

export const QrRequestSchema = z.object({
  text: z.string().min(1, 'text is required').max(2000, 'text is too long'),
  size: z.number().int().min(100).max(1000).optional().default(300),
  format: z.enum(['png', 'svg', 'base64']).optional().default('png'),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional().default('M'),
  margin: z.number().int().min(0).max(10).optional().default(2),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, 'color must be a hex value')
    .optional()
    .default('#000000'),
  background: z
    .string()
    .regex(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, 'background must be a hex value')
    .optional()
    .default('#ffffff'),
  precomposedImage: z
    .string()
    .regex(/^data:image\/png;base64,/, 'precomposedImage must be a PNG data URL')
    .optional(),
  dynamic: z.boolean().optional().default(false),
  dynamicUrl: z.string().url('dynamicUrl must be a valid URL').optional(),
  projectId: z.string().uuid().optional(),
})

export const PatchQrSchema = z.object({
  dynamicUrl: z.string().url().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
})

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'name is required').max(100, 'name too long'),
})

export type PatchQrRequest = z.infer<typeof PatchQrSchema>
export type CreateProjectRequest = z.infer<typeof CreateProjectSchema>

export type QrRequest = z.infer<typeof QrRequestSchema>
