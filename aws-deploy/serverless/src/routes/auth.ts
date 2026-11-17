// สมัครสมาชิก / เข้าสู่ระบบ / ออกจากระบบ: /api/auth
import { Router } from 'express'
import { bearerToken, createSession, currentUser, hashPassword, requireAuth, verifyPassword } from '../auth'
import { deleteItem, getItem, isConditionFailed, nextId, putItem, T, type UserDoc } from '../db'
import { ApiError } from '../errors'
import { loginBody, registerBody } from '../validate'

export const auth = Router()

const publicUser = (u: { id: number; email: string; name: string }) => ({ id: u.id, email: u.email, name: u.name })

auth.post('/register', async (req, res) => {
  const { email, password, name } = registerBody.parse(req.body)
  if (await getItem<UserDoc>(T.users, { email })) throw new ApiError(409, 'อีเมลนี้สมัครสมาชิกแล้ว')
  const user: UserDoc = {
    email,
    id: await nextId('user'),
    name: name ?? '',
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  }
  try {
    await putItem(T.users, user, 'attribute_not_exists(email)')
  } catch (e) {
    if (isConditionFailed(e)) throw new ApiError(409, 'อีเมลนี้สมัครสมาชิกแล้ว')
    throw e
  }
  res.status(201).json({ token: await createSession(user), user: publicUser(user) })
})

auth.post('/login', async (req, res) => {
  const { email, password } = loginBody.parse(req.body)
  const user = await getItem<UserDoc>(T.users, { email })
  if (!user || !verifyPassword(password, user.passwordHash)) throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
  res.json({ token: await createSession(user), user: publicUser(user) })
})

auth.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(currentUser(req)))
})

auth.post('/logout', async (req, res) => {
  const token = bearerToken(req.headers.authorization)
  if (token) await deleteItem(T.sessions, { token })
  res.status(204).end()
})
