import { z } from 'zod'

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email обязателен')
  .email('Введите корректный email')
  .transform((value) => value.toLowerCase())

export const RegisterSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Минимум 6 символов'),
})

export const LoginSchema = RegisterSchema

export type RegisterRequest = z.infer<typeof RegisterSchema>
export type LoginRequest = z.infer<typeof LoginSchema>
