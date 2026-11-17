// แปลง error ทุกชนิดเป็น HTTP response รูปแบบเดียวกัน: { error: string, details?: unknown }
import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '../generated/prisma/client'

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
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // https://www.prisma.io/docs/orm/reference/error-reference
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'ไม่พบข้อมูล' })
      return
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'ข้อมูลซ้ำกับที่มีอยู่แล้ว' })
      return
    }
    if (err.code === 'P2003') {
      res.status(400).json({ error: 'อ้างอิงข้อมูลที่ไม่มีอยู่ (เช่น id ของแนวเกม/แพลตฟอร์ม/บริษัท/เกม)' })
      return
    }
  }
  console.error(err)
  res.status(500).json({ error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' })
}
