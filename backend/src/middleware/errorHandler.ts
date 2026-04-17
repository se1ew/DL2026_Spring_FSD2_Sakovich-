import { Request, Response, NextFunction } from 'express'

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error(err.stack)
  const isProd = process.env.NODE_ENV === 'production'
  res.status(500).json({ error: isProd ? 'Internal Server Error' : (err.message || 'Internal Server Error') })
}
