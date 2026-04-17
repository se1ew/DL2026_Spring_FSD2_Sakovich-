import { Request, Response, NextFunction } from 'express'

export const noStore = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Cache-Control', 'no-store')
  next()
}

export const publicShortCache = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  next()
}
