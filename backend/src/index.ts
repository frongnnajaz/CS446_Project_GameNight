// Backend RESTful API ของ Game Night (Express 5 + Prisma ORM + PostgreSQL)
// Express 5 ส่ง error จาก async handler ไปที่ errorHandler ให้อัตโนมัติ
import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { prisma } from './db'
import { errorHandler, notFoundRoute } from './lib/errors'
import { auth } from './routes/auth'
import { games } from './routes/games'
import { companies, genres, platforms } from './routes/lookups'
import { library, prices, wishlist } from './routes/collection'

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`
  res.json({ ok: true })
})

app.use('/api/auth', auth)
app.use('/api/games', games)
app.use('/api/genres', genres)
app.use('/api/platforms', platforms)
app.use('/api/companies', companies)
app.use('/api/prices', prices)
app.use('/api/wishlist', wishlist)
app.use('/api/library', library)

app.use(notFoundRoute)
app.use(errorHandler)

// API_PORT ก่อน (กันชนกับ PORT ที่เครื่องมืออื่นตั้งไว้), ไม่มีค่อยใช้ PORT ที่โฮสต์อย่าง Render/Railway ตั้งให้
const port = Number(process.env.API_PORT ?? process.env.PORT) || 3000
const server = app.listen(port, () => console.log(`Game Night API พร้อมใช้งานที่ http://localhost:${port}/api`))

const shutdown = () => server.close(() => void prisma.$disconnect())
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
