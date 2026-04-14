import { Router } from 'express'
import { login, register, verifyToken } from '../controllers/authController'
import { validate } from '../middleware/validate'
import { LoginSchema, RegisterSchema } from '../types/auth'

export const router = Router()

router.post('/register', validate(RegisterSchema), register)
router.post('/login', validate(LoginSchema), login)
router.get('/me', verifyToken)
