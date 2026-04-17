import { Router } from 'express'
import { login, logout, refreshAccessToken, register, verifyToken } from '../controllers/authController'
import { validate } from '../middleware/validate'
import { noStore } from '../middleware/cache'
import { authLimiter } from '../middleware/rateLimit'
import { LoginSchema, RegisterSchema } from '../types/auth'

export const router = Router()

router.post('/register', authLimiter, noStore, validate(RegisterSchema), register)
router.post('/login', authLimiter, noStore, validate(LoginSchema), login)
router.get('/me', noStore, verifyToken)
router.post('/refresh', noStore, refreshAccessToken)
router.post('/logout', noStore, logout)
