import { Request, Response, NextFunction } from 'express'
import QRCode from 'qrcode'
import { qrService } from '../services/qrService'
import { emitQrCreated, emitQrViewed } from '../lib/realtime'
import { QrRequest } from '../types/qr'

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

    let imageData: string
    let mimeType: string

    if (format === 'svg') {
      imageData = await QRCode.toString(text, { ...options, type: 'svg' })
      mimeType = 'image/svg+xml'
    } else {
      imageData = precomposedImage ?? await QRCode.toDataURL(text, options)
      mimeType = 'image/png'
    }

    const qr = await qrService.create({
      data: text,
      color: req.body.color,
      background: req.body.background,
      size: req.body.size,
      format,
      errorCorrectionLevel: req.body.errorCorrectionLevel,
      margin: req.body.margin,
      imageUrl: imageData,
      userId,
    })

    res.status(201).json({
      qr,
      image: imageData,
      mimeType,
    })

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

    const items = await qrService.list(userId)
    res.json({ items })
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

    const viewCount = await qrService.incrementViews(qr.id)
    emitQrViewed(qr.userId, { qrId: qr.id, viewCount })

    const imgTag = qr.imageUrl.startsWith('data:')
      ? `<img src="${qr.imageUrl}" style="max-width:480px;border-radius:12px;" />`
      : `<pre style="color:#dff4ee;font-size:11px;overflow:auto;max-width:480px">${qr.imageUrl}</pre>`

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
<p>Content: <a href="${qr.data}" target="_blank" rel="noopener">${qr.data}</a></p>
<p>Views: ${viewCount}</p>
</body>
</html>`)
  } catch (err) {
    next(err)
  }
}
