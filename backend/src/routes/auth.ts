// สมัครสมาชิก / เข้าสู่ระบบ / ออกจากระบบ: /api/auth
import { Router } from 'express'
import { prisma } from '../db'
import { bearerToken, createSession, currentUser, hashPassword, requireAuth, verifyPassword } from '../lib/auth'
import { ApiError } from '../lib/errors'
import { loginBody, registerBody } from '../lib/validate'

export const auth = Router()

const publicUser = (u: { id: number; email: string; name: string }) => ({ id: u.id, email: u.email, name: u.name })

/** POST /api/auth/register { email, password, name? } -> { token, user } */
auth.post('/register', async (req, res) => {
  const { email, password, name } = registerBody.parse(req.body)
  if (await prisma.user.findUnique({ where: { email } })) throw new ApiError(409, 'อีเมลนี้สมัครสมาชิกแล้ว')
  const user = await prisma.user.create({ data: { email, name: name ?? '', passwordHash: hashPassword(password) } })
  res.status(201).json({ token: await createSession(user.id), user: publicUser(user) })
})

/** POST /api/auth/login { email, password } -> { token, user } */
auth.post('/login', async (req, res) => {
  const { email, password } = loginBody.parse(req.body)
  const user = await prisma.user.findUnique({ where: { email } })
  // ข้อความเดียวกันทั้งกรณีไม่มีอีเมลและรหัสผิด เพื่อไม่บอกใบ้ว่าอีเมลไหนมีบัญชี
  if (!user || !verifyPassword(password, user.passwordHash)) throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
  res.json({ token: await createSession(user.id), user: publicUser(user) })
})

/** GET /api/auth/me -> ผู้ใช้ปัจจุบัน */
auth.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(currentUser(req)))
})

/** POST /api/auth/logout ลบ session นี้ */
auth.post('/logout', async (req, res) => {
  const token = bearerToken(req.headers.authorization)
  if (token) await prisma.session.deleteMany({ where: { token } })
  res.status(204).end()
})
