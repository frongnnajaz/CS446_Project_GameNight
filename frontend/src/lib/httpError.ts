import axios from 'axios'

/** error ที่มีรหัส HTTP (สร้างเองฝั่ง Frontend) */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message = `HTTP ${status}`,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/** ดึงรหัส HTTP ออกจาก error ใด ๆ (ไม่มีคืน undefined) */
export function statusOf(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) return error.response?.status
  if (error instanceof HttpError) return error.status
  return undefined
}
