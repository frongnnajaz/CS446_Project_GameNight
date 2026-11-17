// Express app ของ Game Night (ใช้ทั้งใน Lambda และตอนรันทดสอบในเครื่อง)
import cors from 'cors'
import express from 'express'
import { errorHandler, notFoundRoute } from './errors'
import { alerts } from './routes/alerts'
import { auth } from './routes/auth'
import { library, prices, wishlist } from './routes/collection'
import { games } from './routes/games'
import { companies, genres, platforms } from './routes/lookups'

export const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
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
app.use('/api/alerts', alerts)

app.use(notFoundRoute)
app.use(errorHandler)
