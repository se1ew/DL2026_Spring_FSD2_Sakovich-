import { Router } from 'express'
import { generateQr } from '../controllers/qrController'

export const router = Router()

router.post('/generate', generateQr)
