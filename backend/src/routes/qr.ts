import { Router } from 'express'
import { createQr, getQrById, listQr } from '../controllers/qrController'
import { validate } from '../middleware/validate'
import { QrRequestSchema } from '../types/qr'

export const router = Router()

router.post('/', validate(QrRequestSchema), createQr)
router.get('/', listQr)
router.get('/:id', getQrById)
