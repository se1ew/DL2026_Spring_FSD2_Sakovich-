import { Router } from 'express'
import { login, register, verifyToken } from '../controllers/authController'
import { validate } from '../middleware/validate'
import { noStore } from '../middleware/cache'
import { LoginSchema, RegisterSchema } from '../types/auth'

export const router = Router()

router.post('/register', noStore, validate(RegisterSchema), register)
router.post('/login', noStore, validate(LoginSchema), login)
router.get('/me', noStore, verifyToken)
