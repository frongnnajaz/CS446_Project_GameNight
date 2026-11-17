// แปลง error ทุกชนิดเป็น HTTP response รูปแบบเดียวกับ backend เดิม: { error: string, details?: unknown }
import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export const notFound = (what = 'ข้อมูล') => new ApiError(404, `ไม่พบ${what}`)

export const notFoundRoute: RequestHandler = (req) => {
  throw new ApiError(404, `ไม่พบเส้นทาง ${req.method} ${req.originalUrl}`)
}

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message })
    return
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง', details: err.issues })
    return
  }
  if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
    res.status(409).json({ error: 'ข้อมูลซ้ำกับที่มีอยู่แล้ว' })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' })
}
