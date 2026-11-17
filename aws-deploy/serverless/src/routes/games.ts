// CRUD ของเกม: /api/games (รูปแบบ JSON เหมือน backend เดิมทุกฟิลด์)
import { Router } from 'express'
import type { z } from 'zod'
import {
  allGames,
  batchDelete,
  deleteItem,
  getItem,
  lookupMap,
  nextId,
  putItem,
  scanAll,
  T,
  type CollectionDoc,
  type GameDoc,
  type Lookup,
} from '../db'
import { ApiError, notFound } from '../errors'
import { gameBody, gamesQuery, gameUpdateBody, idParam, slugify } from '../validate'

export const games = Router()

interface Maps {
  genre: Map<number, Lookup>
  platform: Map<number, Lookup>
  company: Map<number, Lookup>
}

export async function loadMaps(): Promise<Maps> {
  const [genre, platform, company] = await Promise.all([lookupMap('genre'), lookupMap('platform'), lookupMap('company')])
  return { genre, platform, company }
}

const pick = (ids: number[], m: Map<number, Lookup>) => ids.map((id) => m.get(id)).filter((l): l is Lookup => !!l)

export const serializePrice = (g: GameDoc) => ({ id: g.id, gameId: g.id, ...g.price })

export function serializeGameSummary(g: GameDoc, m: Maps) {
  return {
    id: g.id,
    slug: g.slug,
    name: g.name,
    released: g.released,
    rating: g.rating,
    ratings_count: g.ratingsCount,
    added: g.added,
    metacritic: g.metacritic,
    background_image: g.backgroundImage,
    genres: pick(g.genreIds, m.genre).map(({ id, name, slug }) => ({ id, name, slug })),
    parent_platforms: pick(g.platformIds, m.platform).map(({ id, name, slug }) => ({ platform: { id, name, slug } })),
    price: serializePrice(g),
  }
}

export function serializeGameDetail(g: GameDoc, m: Maps) {
  return {
    ...serializeGameSummary(g, m),
    description_raw: g.description,
    website: g.website,
    developers: pick(g.developerIds, m.company).map(({ id, name }) => ({ id, name })),
    publishers: pick(g.publisherIds, m.company).map(({ id, name }) => ({ id, name })),
  }
}

const csv = (v?: string) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

/** เรียงแบบเดียวกับ ORDER BY เดิม (ค่า null ไปท้าย, เสมอกันเรียงตาม id) */
type Ordering = z.infer<typeof gamesQuery>['ordering']
const desc = (a: number | string | null, b: number | string | null) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? 1 : -1
const SORT: Record<Ordering, (a: GameDoc, b: GameDoc) => number> = {
  '-added': (a, b) => b.added - a.added,
  '-rating': (a, b) => b.rating - a.rating,
  '-released': (a, b) => desc(a.released, b.released),
  '-metacritic': (a, b) => desc(a.metacritic, b.metacritic),
  name: (a, b) => a.name.localeCompare(b.name),
  '-created': (a, b) => desc(a.createdAt, b.createdAt),
}

/** GET /api/games?page&page_size&search&genres&parent_platforms&ordering */
games.get('/', async (req, res) => {
  const q = gamesQuery.parse(req.query)
  const [rows, m] = await Promise.all([allGames(), loadMaps()])

  const genreKeys = csv(q.genres)
  const genreIds = new Set(
    [...m.genre.values()].filter((g) => genreKeys.includes(g.slug ?? '') || genreKeys.includes(String(g.id))).map((g) => g.id),
  )
  const platformIds = csv(q.parent_platforms).map(Number).filter(Number.isInteger)
  const search = q.search?.toLowerCase()

  const filtered = rows
    .filter((g) => !search || g.name.toLowerCase().includes(search))
    .filter((g) => !genreKeys.length || g.genreIds.some((id) => genreIds.has(id)))
    .filter((g) => !platformIds.length || g.platformIds.some((id) => platformIds.includes(id)))
    .sort((a, b) => SORT[q.ordering](a, b) || a.id - b.id)

  const count = filtered.length
  const page = filtered.slice((q.page - 1) * q.page_size, q.page * q.page_size)
  if (q.page > 1 && page.length === 0) throw notFound('หน้าที่ต้องการ')

  const url = (n: number) => {
    const params = new URLSearchParams(req.query as Record<string, string>)
    params.set('page', String(n))
    return `${req.baseUrl}?${params}`
  }
  res.json({
    count,
    next: q.page * q.page_size < count ? url(q.page + 1) : null,
    previous: q.page > 1 ? url(q.page - 1) : null,
    results: page.map((g) => serializeGameSummary(g, m)),
  })
})

async function findGame(id: number) {
  const g = await getItem<GameDoc>(T.games, { id })
  if (!g) throw notFound('เกมนี้')
  return g
}

games.get('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  const [g, m] = await Promise.all([findGame(id), loadMaps()])
  res.json(serializeGameDetail(g, m))
})

games.get('/:id/screenshots', async (req, res) => {
  const { id } = idParam.parse(req.params)
  res.json((await findGame(id)).screenshots)
})

/** ตรวจว่า id ที่อ้างถึงมีอยู่จริง (แทน foreign key ของ PostgreSQL) */
function checkRefs(b: z.infer<typeof gameUpdateBody>, m: Maps) {
  const bad = (ids: number[] | undefined, map: Map<number, Lookup>) => (ids ?? []).some((id) => !map.has(id))
  if (
    bad(b.genreIds, m.genre) ||
    bad(b.platformIds, m.platform) ||
    bad(b.developerIds, m.company) ||
    bad(b.publisherIds, m.company)
  ) {
    throw new ApiError(400, 'อ้างอิงข้อมูลที่ไม่มีอยู่ (เช่น id ของแนวเกม/แพลตฟอร์ม/บริษัท/เกม)')
  }
}

async function assertSlugFree(slug: string, exceptId?: number) {
  const clash = (await allGames()).find((g) => g.slug === slug && g.id !== exceptId)
  if (clash) throw new ApiError(409, 'ข้อมูลซ้ำกับที่มีอยู่แล้ว')
}

function applyFields(g: GameDoc, b: z.infer<typeof gameUpdateBody>): GameDoc {
  return {
    ...g,
    ...(b.name !== undefined && { name: b.name }),
    ...(b.slug !== undefined && { slug: b.slug }),
    ...(b.released !== undefined && { released: b.released }),
    ...(b.rating !== undefined && { rating: b.rating }),
    ...(b.ratings_count !== undefined && { ratingsCount: b.ratings_count }),
    ...(b.added !== undefined && { added: b.added }),
    ...(b.metacritic !== undefined && { metacritic: b.metacritic }),
    ...(b.background_image !== undefined && { backgroundImage: b.background_image }),
    ...(b.description_raw !== undefined && { description: b.description_raw }),
    ...(b.website !== undefined && { website: b.website }),
    ...(b.genreIds && { genreIds: b.genreIds }),
    ...(b.platformIds && { platformIds: b.platformIds }),
    ...(b.developerIds && { developerIds: b.developerIds }),
    ...(b.publisherIds && { publisherIds: b.publisherIds }),
    ...(b.price && { price: b.price }),
    updatedAt: new Date().toISOString(),
  }
}

games.post('/', async (req, res) => {
  const b = gameBody.parse(req.body)
  const m = await loadMaps()
  checkRefs(b, m)
  const slug = b.slug ?? slugify(b.name)
  await assertSlugFree(slug)
  const now = new Date().toISOString()
  const base: GameDoc = {
    id: await nextId('game'),
    slug,
    name: b.name,
    released: null,
    rating: 0,
    ratingsCount: 0,
    added: 0,
    metacritic: null,
    backgroundImage: null,
    description: '',
    website: '',
    genreIds: [],
    platformIds: [],
    developerIds: [],
    publisherIds: [],
    price: { price: 0, discountPercent: 0, isFeatured: false },
    screenshots: [],
    createdAt: now,
    updatedAt: now,
  }
  const g = applyFields(base, { ...b, slug })
  await putItem(T.games, g, 'attribute_not_exists(id)')
  res.status(201).location(`${req.baseUrl}/${g.id}`).json(serializeGameDetail(g, m))
})

async function updateGame(id: number, body: unknown) {
  const b = gameUpdateBody.parse(body)
  const [g, m] = await Promise.all([findGame(id), loadMaps()])
  checkRefs(b, m)
  if (b.slug !== undefined) await assertSlugFree(b.slug, id)
  const next = applyFields(g, b)
  await putItem(T.games, next)
  return serializeGameDetail(next, m)
}

games.put('/:id', async (req, res) => res.json(await updateGame(idParam.parse(req.params).id, req.body)))
games.patch('/:id', async (req, res) => res.json(await updateGame(idParam.parse(req.params).id, req.body)))

/** DELETE /api/games/:id (ลบรายการใน Wishlist/คลังที่อ้างถึงเกมนี้ด้วย) */
games.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  await findGame(id)
  await deleteItem(T.games, { id })
  const refs = await scanAll<CollectionDoc>(T.collections, {
    FilterExpression: 'gameId = :g',
    ExpressionAttributeValues: { ':g': id },
  })
  await batchDelete(
    T.collections,
    refs.map((r) => ({ userId: r.userId, sk: r.sk })),
  )
  res.status(204).end()
})
