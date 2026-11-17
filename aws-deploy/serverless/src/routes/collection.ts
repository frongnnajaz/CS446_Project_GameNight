// ราคา (/api/prices) และคอลเลกชันของผู้ใช้ (/api/wishlist, /api/library ต้องส่ง Authorization: Bearer <token>)
import { Router } from 'express'
import { currentUser, requireAuth } from '../auth'
import { allGames, deleteItem, getItem, isConditionFailed, putItem, queryAll, T, type CollectionDoc, type GameDoc } from '../db'
import { ApiError, notFound } from '../errors'
import { gameIdParam, libraryBody, libraryUpdateBody, priceBody, wishlistBody } from '../validate'
import { serializePrice } from './games'

export const prices = Router()

prices.get('/', async (_req, res) => {
  const rows = await allGames()
  res.json(rows.sort((a, b) => a.id - b.id).map(serializePrice))
})
prices.get('/:gameId', async (req, res) => {
  const { gameId } = gameIdParam.parse(req.params)
  const g = await getItem<GameDoc>(T.games, { id: gameId })
  if (!g) throw notFound('ราคาของเกมนี้')
  res.json(serializePrice(g))
})
/** PUT /api/prices/:gameId แก้ราคา (ถ้าส่วนลดเพิ่มขึ้น Lambda gamenight-deals จะส่งอีเมลแจ้งคนที่ใส่ Wishlist ไว้) */
prices.put('/:gameId', async (req, res) => {
  const { gameId } = gameIdParam.parse(req.params)
  const data = priceBody.parse(req.body)
  const g = await getItem<GameDoc>(T.games, { id: gameId })
  if (!g) throw new ApiError(400, 'อ้างอิงข้อมูลที่ไม่มีอยู่ (เช่น id ของแนวเกม/แพลตฟอร์ม/บริษัท/เกม)')
  const next = { ...g, price: data, updatedAt: new Date().toISOString() }
  await putItem(T.games, next)
  res.json(serializePrice(next))
})

const key = (userId: number, type: 'wishlist' | 'library', gameId: number) => ({ userId, sk: `${type}#${gameId}` })

async function list(userId: number, type: 'wishlist' | 'library') {
  return queryAll<CollectionDoc>(T.collections, 'userId = :u AND begins_with(sk, :p)', { ':u': userId, ':p': `${type}#` })
}

async function assertGame(gameId: number) {
  if (!(await getItem<GameDoc>(T.games, { id: gameId }))) {
    throw new ApiError(400, 'อ้างอิงข้อมูลที่ไม่มีอยู่ (เช่น id ของแนวเกม/แพลตฟอร์ม/บริษัท/เกม)')
  }
}

async function createUnique(doc: CollectionDoc) {
  try {
    await putItem(T.collections, doc, 'attribute_not_exists(sk)')
  } catch (e) {
    if (isConditionFailed(e)) throw new ApiError(409, 'ข้อมูลซ้ำกับที่มีอยู่แล้ว')
    throw e
  }
}

async function removeExisting(userId: number, type: 'wishlist' | 'library', gameId: number) {
  if (!(await getItem(T.collections, key(userId, type, gameId)))) throw notFound()
  await deleteItem(T.collections, key(userId, type, gameId))
}

const newest = (a: CollectionDoc, b: CollectionDoc) => b.addedAt.localeCompare(a.addedAt)
const toWishlist = (w: CollectionDoc) => ({ id: w.gameId, addedAt: w.addedAt })
const toLibrary = (l: CollectionDoc) => ({ id: l.gameId, status: l.status, myRating: l.myRating, purchasedAt: l.addedAt })

export const wishlist = Router()
wishlist.use(requireAuth)

wishlist.get('/', async (req, res) => {
  res.json((await list(currentUser(req).id, 'wishlist')).sort(newest).map(toWishlist))
})
wishlist.post('/', async (req, res) => {
  const { id: userId, email } = currentUser(req)
  const { gameId } = wishlistBody.parse(req.body)
  if (await getItem(T.collections, key(userId, 'library', gameId))) throw new ApiError(409, 'เกมนี้อยู่ในคลังแล้ว')
  await assertGame(gameId)
  const doc: CollectionDoc = { ...key(userId, 'wishlist', gameId), type: 'wishlist', gameId, email, addedAt: new Date().toISOString() }
  await createUnique(doc)
  res.status(201).json(toWishlist(doc))
})
wishlist.delete('/:gameId', async (req, res) => {
  const { gameId } = gameIdParam.parse(req.params)
  await removeExisting(currentUser(req).id, 'wishlist', gameId)
  res.status(204).end()
})

export const library = Router()
library.use(requireAuth)

library.get('/', async (req, res) => {
  res.json((await list(currentUser(req).id, 'library')).sort(newest).map(toLibrary))
})
/** POST /api/library { gameId } = "ซื้อ" เกม: เพิ่มเข้าคลังแล้วเอาออกจาก Wishlist */
library.post('/', async (req, res) => {
  const { id: userId, email } = currentUser(req)
  const { gameId } = libraryBody.parse(req.body)
  await assertGame(gameId)
  const doc: CollectionDoc = {
    ...key(userId, 'library', gameId),
    type: 'library',
    gameId,
    email,
    addedAt: new Date().toISOString(),
    status: 'unplayed',
    myRating: 0,
  }
  await createUnique(doc)
  await deleteItem(T.collections, key(userId, 'wishlist', gameId))
  res.status(201).json(toLibrary(doc))
})
library.patch('/:gameId', async (req, res) => {
  const { gameId } = gameIdParam.parse(req.params)
  const userId = currentUser(req).id
  const row = await getItem<CollectionDoc>(T.collections, key(userId, 'library', gameId))
  if (!row) throw notFound()
  const next = { ...row, ...libraryUpdateBody.parse(req.body) }
  await putItem(T.collections, next)
  res.json(toLibrary(next))
})
library.delete('/:gameId', async (req, res) => {
  const { gameId } = gameIdParam.parse(req.params)
  await removeExisting(currentUser(req).id, 'library', gameId)
  res.status(204).end()
})
