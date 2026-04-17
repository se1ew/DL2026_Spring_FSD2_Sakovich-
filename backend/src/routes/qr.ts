import { Router } from 'express'
import { createQr, deleteQr, getQrById, listQr, patchQr, viewQrPublic } from '../controllers/qrController'
import { authMiddleware } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { noStore, publicShortCache } from '../middleware/cache'
import { qrCreateLimiter } from '../middleware/rateLimit'
import { QrRequestSchema, PatchQrSchema } from '../types/qr'

export const router = Router()

router.get('/:id/view', publicShortCache, viewQrPublic)

router.use(authMiddleware)

router.post('/', qrCreateLimiter, noStore, validate(QrRequestSchema), createQr)
router.get('/', noStore, listQr)
router.get('/:id', noStore, getQrById)
router.patch('/:id', noStore, validate(PatchQrSchema), patchQr)
router.delete('/:id', noStore, deleteQr)
