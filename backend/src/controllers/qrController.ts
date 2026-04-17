import { Request, Response, NextFunction } from 'express'
import QRCode from 'qrcode'
import crypto from 'crypto'
import { qrService } from '../services/qrService'
import { emitQrCreated, emitQrViewed } from '../lib/realtime'
import { QrRequest, PatchQrRequest } from '../types/qr'

const getAppUrl = () => process.env.APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`

type QrCreateResponse = {
  qr: Awaited<ReturnType<typeof qrService.create>>
  image: string
  mimeType: string
}

type QrPublicView = Pick<
  NonNullable<Awaited<ReturnType<typeof qrService.getByIdPublic>>>,
  'id' | 'data' | 'imageUrl' | 'userId'
>

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

const buildQrOptions = (body: QrRequest): QRCode.QRCodeToDataURLOptions => {
  return {
    width: body.size,
    margin: body.margin,
    errorCorrectionLevel: body.errorCorrectionLevel,
    color: {
      dark: body.color,
      light: body.background,
    },
  }
}

export const createQr = async (
  req: Request<object, unknown, QrRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ error: 'Не авторизован' })
      return
    }

    const { text, format, precomposedImage } = req.body
    const options = buildQrOptions(req.body)

    const isDynamic = req.body.dynamic === true && !!req.body.dynamicUrl
    const qrId = isDynamic ? crypto.randomUUID() : undefined
    const qrContent = isDynamic ? `${getAppUrl()}/r/${qrId}` : text

    let imageData: string
    let mimeType: string

    if (format === 'svg') {
      imageData = await QRCode.toString(qrContent, { ...options, type: 'svg' })
      mimeType = 'image/svg+xml'
    } else {
      imageData = (isDynamic ? undefined : precomposedImage) ?? await QRCode.toDataURL(qrContent, options)
      mimeType = 'image/png'
    }

    const qr = await qrService.create({
      ...(qrId ? { id: qrId } : {}),
      data: text,
      color: req.body.color,
      background: req.body.background,
      size: req.body.size,
      format,
      errorCorrectionLevel: req.body.errorCorrectionLevel,
      margin: req.body.margin,
      imageUrl: imageData,
      userId,
      dynamicUrl: isDynamic ? req.body.dynamicUrl : undefined,
      projectId: req.body.projectId,
    })

    const body: QrCreateResponse = { qr, image: imageData, mimeType }
    res.status(201).json(body)

    emitQrCreated(userId, qr)
  } catch (err) {
    next(err)
  }
}

export const listQr = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ error: 'Не авторизован' })
      return
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 6))
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined

    const result = await qrService.list(userId, page, limit, projectId)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export const getQrById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ error: 'Не авторизован' })
      return
    }

    const qr = await qrService.getById(req.params.id, userId)

    if (!qr) {
      res.status(404).json({ error: 'QR code not found' })
      return
    }

    res.json(qr)
  } catch (err) {
    next(err)
  }
}

export const deleteQr = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ error: 'Не авторизован' })
      return
    }

    const deleted = await qrService.deleteById(req.params.id, userId)
    if (!deleted) {
      res.status(404).json({ error: 'QR code not found' })
      return
    }

    res.status(200).json({ id: deleted.id })
  } catch (err) {
    next(err)
  }
}

export const patchQr = async (
  req: Request<{ id: string }, unknown, PatchQrRequest>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) { res.status(401).json({ error: 'Не авторизован' }); return }
    const updated = await qrService.updateById(req.params.id, userId, req.body)
    if (!updated) { res.status(404).json({ error: 'QR code not found' }); return }
    void qrService.list(userId)
    res.json(updated)
  } catch (err) { next(err) }
}

export const redirectDynamic = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const qr = await qrService.getByIdPublic(req.params.id)
    if (!qr || !qr.dynamicUrl) { res.status(404).send('Not found'); return }
    res.redirect(302, qr.dynamicUrl)
  } catch (err) { next(err) }
}

export const viewQrPublic = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const qr = await qrService.getByIdPublic(req.params.id)
    if (!qr) {
      res.status(404).send('QR code not found')
      return
    }

    const { id, data, imageUrl, userId }: QrPublicView = qr
    const viewCount = await qrService.incrementViews(id)
    emitQrViewed(userId, { qrId: id, viewCount })

    const imgTag = imageUrl.startsWith('data:')
      ? `<img src="${imageUrl}" style="max-width:480px;border-radius:12px;" />`
      : `<pre style="color:#dff4ee;font-size:11px;overflow:auto;max-width:480px">${imageUrl}</pre>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>QR Code</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0c1a18;display:flex;flex-direction:column;align-items:center;
justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;gap:20px;padding:24px}
p{color:#6a9e97;font-size:14px}
a{color:#00d4aa;text-decoration:none}
</style>
</head>
<body>
${imgTag}
<p>Content: <a href="${escapeHtml(data)}" target="_blank" rel="noopener">${escapeHtml(data)}</a></p>
<p>Views: ${viewCount}</p>
</body>
</html>`)
  } catch (err) {
    next(err)
  }
}
