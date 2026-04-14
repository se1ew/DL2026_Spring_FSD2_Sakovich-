import { Router } from 'express'
import { generateQr } from '../controllers/qrController'
import { validate } from '../middleware/validate'
import { QrRequestSchema } from '../types/qr'

export const router = Router()

router.post('/', validate(QrRequestSchema), generateQr)
