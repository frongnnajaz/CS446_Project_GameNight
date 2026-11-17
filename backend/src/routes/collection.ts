// ราคา (/api/prices) และคอลเลกชันของผู้ใช้ที่ล็อกอิน (/api/wishlist, /api/library ต้องส่ง Authorization: Bearer <token>)
import { Router } from 'express'
import { prisma } from '../db'
import { currentUser, requireAuth } from '../lib/auth'
import { ApiError, notFound } from '../lib/errors'
import { serializePrice } from '../lib/serialize'
import { gameIdParam, libraryBody, libraryUpdateBody, priceBody, wishlistBody } from '../lib/validate'

export const prices = Router()

/** GET /api/prices ตารางราคาทั้งหมด */
prices.get('/', async (_req, res) => {
  const rows = await prisma.price.findMany({ orderBy: { gameId: 'asc' } })
  res.json(rows.map(serializePrice))
})
prices.get('/:gameId', async (req, res) => {
  const { gameId } = gameIdParam.parse(req.params)
  const row = await prisma.price.findUnique({ where: { gameId } })
  if (!row) throw notFound('ราคาของเกมนี้')
  res.json(serializePrice(row))
})
/** PUT /api/prices/:gameId สร้างหรือแก้ราคา */
prices.put('/:gameId', async (req, res) => {
  const { gameId } = gameIdParam.parse(req.params)
  const data = priceBody.parse(req.body)
  const row = await prisma.price.upsert({ where: { gameId }, create: { gameId, ...data }, update: data })
  res.json(serializePrice(row))
})

const toWishlist = (w: { gameId: number; addedAt: Date }) => ({ id: w.gameId, addedAt: w.addedAt.toISOString() })
const toLibrary = (l: { gameId: number; status: string; myRating: number; purchasedAt: Date }) => ({
  id: l.gameId,
  status: l.status,
  myRating: l.myRating,
  purchasedAt: l.purchasedAt.toISOString(),
})

export const wishlist = Router()
wishlist.use(requireAuth)

wishlist.get('/', async (req, res) => {
  const userId = currentUser(req).id
  const rows = await prisma.wishlistItem.findMany({ where: { userId }, orderBy: { addedAt: 'desc' } })
  res.json(rows.map(toWishlist))
})
/** POST /api/wishlist { gameId } */
wishlist.post('/', async (req, res) => {
  const userId = currentUser(req).id
  const { gameId } = wishlistBody.parse(req.body)
  if (await prisma.libraryItem.findUnique({ where: { userId_gameId: { userId, gameId } } })) {
    throw new ApiError(409, 'เกมนี้อยู่ในคลังแล้ว')
  }
  const row = await prisma.wishlistItem.create({ data: { userId, gameId } })
  res.status(201).json(toWishlist(row))
})
wishlist.delete('/:gameId', async (req, res) => {
  const { gameId } = gameIdParam.parse(req.params)
  await prisma.wishlistItem.delete({ where: { userId_gameId: { userId: currentUser(req).id, gameId } } })
  res.status(204).end()
})

export const library = Router()
library.use(requireAuth)

library.get('/', async (req, res) => {
  const userId = currentUser(req).id
  const rows = await prisma.libraryItem.findMany({ where: { userId }, orderBy: { purchasedAt: 'desc' } })
  res.json(rows.map(toLibrary))
})
/** POST /api/library { gameId } = "ซื้อ" เกม: เพิ่มเข้าคลังและเอาออกจาก Wishlist ใน transaction เดียว */
library.post('/', async (req, res) => {
  const userId = currentUser(req).id
  const { gameId } = libraryBody.parse(req.body)
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.libraryItem.create({ data: { userId, gameId } })
    await tx.wishlistItem.deleteMany({ where: { userId, gameId } })
    return created
  })
  res.status(201).json(toLibrary(row))
})
/** PATCH /api/library/:gameId { status?, myRating? } */
library.patch('/:gameId', async (req, res) => {
  const { gameId } = gameIdParam.parse(req.params)
  const row = await prisma.libraryItem.update({
    where: { userId_gameId: { userId: currentUser(req).id, gameId } },
    data: libraryUpdateBody.parse(req.body),
  })
  res.json(toLibrary(row))
})
library.delete('/:gameId', async (req, res) => {
  const { gameId } = gameIdParam.parse(req.params)
  await prisma.libraryItem.delete({ where: { userId_gameId: { userId: currentUser(req).id, gameId } } })
  res.status(204).end()
})
