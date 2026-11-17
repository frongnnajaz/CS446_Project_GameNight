// CRUD ของเกม: /api/games
import { Router } from 'express'
import { prisma } from '../db'
import type { Prisma } from '../generated/prisma/client'
import { notFound } from '../lib/errors'
import { gameInclude, serializeGameDetail, serializeGameSummary } from '../lib/serialize'
import { gameBody, gamesQuery, gameUpdateBody, idParam, slugify } from '../lib/validate'
import type { z } from 'zod'

export const games = Router()

const ORDER_BY: Record<z.infer<typeof gamesQuery>['ordering'], Prisma.GameOrderByWithRelationInput[]> = {
  '-added': [{ added: 'desc' }],
  '-rating': [{ rating: 'desc' }],
  '-released': [{ released: { sort: 'desc', nulls: 'last' } }],
  '-metacritic': [{ metacritic: { sort: 'desc', nulls: 'last' } }],
  name: [{ name: 'asc' }],
  '-created': [{ createdAt: 'desc' }],
}

const csv = (v?: string) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

/** GET /api/games?page&page_size&search&genres&parent_platforms&ordering */
games.get('/', async (req, res) => {
  const q = gamesQuery.parse(req.query)
  const genreKeys = csv(q.genres)
  const platformIds = csv(q.parent_platforms).map(Number).filter(Number.isInteger)

  const where: Prisma.GameWhereInput = {
    ...(q.search && { name: { contains: q.search, mode: 'insensitive' } }),
    ...(genreKeys.length && {
      genres: {
        some: {
          genre: {
            OR: [{ slug: { in: genreKeys } }, { id: { in: genreKeys.map(Number).filter(Number.isInteger) } }],
          },
        },
      },
    }),
    ...(platformIds.length && { platforms: { some: { platformId: { in: platformIds } } } }),
  }

  const [count, rows] = await prisma.$transaction([
    prisma.game.count({ where }),
    prisma.game.findMany({
      where,
      include: gameInclude,
      orderBy: [...ORDER_BY[q.ordering], { id: 'asc' }],
      skip: (q.page - 1) * q.page_size,
      take: q.page_size,
    }),
  ])

  if (q.page > 1 && rows.length === 0) throw notFound('หน้าที่ต้องการ')

  const url = (page: number) => {
    const params = new URLSearchParams(req.query as Record<string, string>)
    params.set('page', String(page))
    return `${req.baseUrl}?${params}`
  }
  res.json({
    count,
    next: q.page * q.page_size < count ? url(q.page + 1) : null,
    previous: q.page > 1 ? url(q.page - 1) : null,
    results: rows.map(serializeGameSummary),
  })
})

/** GET /api/games/:id */
games.get('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  const game = await prisma.game.findUnique({ where: { id }, include: gameInclude })
  if (!game) throw notFound('เกมนี้')
  res.json(serializeGameDetail(game))
})

/** GET /api/games/:id/screenshots */
games.get('/:id/screenshots', async (req, res) => {
  const { id } = idParam.parse(req.params)
  const game = await prisma.game.findUnique({ where: { id }, select: { screenshots: { orderBy: { id: 'asc' } } } })
  if (!game) throw notFound('เกมนี้')
  res.json(game.screenshots.map(({ id, image, width, height }) => ({ id, image, width, height })))
})

/** ฟิลด์ธรรมดาของตาราง Game จาก body (ชื่อแบบ API -> ชื่อคอลัมน์) */
function scalarFields(b: z.infer<typeof gameUpdateBody>) {
  return {
    ...(b.name !== undefined && { name: b.name }),
    ...(b.slug !== undefined && { slug: b.slug }),
    ...(b.released !== undefined && { released: b.released ? new Date(b.released) : null }),
    ...(b.rating !== undefined && { rating: b.rating }),
    ...(b.ratings_count !== undefined && { ratingsCount: b.ratings_count }),
    ...(b.added !== undefined && { added: b.added }),
    ...(b.metacritic !== undefined && { metacritic: b.metacritic }),
    ...(b.background_image !== undefined && { backgroundImage: b.background_image }),
    ...(b.description_raw !== undefined && { description: b.description_raw }),
    ...(b.website !== undefined && { website: b.website }),
  }
}

/** POST /api/games */
games.post('/', async (req, res) => {
  const b = gameBody.parse(req.body)
  const game = await prisma.game.create({
    data: {
      ...scalarFields(b),
      name: b.name,
      slug: b.slug ?? slugify(b.name),
      genres: { create: b.genreIds.map((genreId) => ({ genreId })) },
      platforms: { create: b.platformIds.map((platformId) => ({ platformId })) },
      developers: { create: b.developerIds.map((companyId) => ({ companyId })) },
      publishers: { create: b.publisherIds.map((companyId) => ({ companyId })) },
      price: { create: b.price ?? { price: 0 } },
    },
    include: gameInclude,
  })
  res.status(201).location(`${req.baseUrl}/${game.id}`).json(serializeGameDetail(game))
})

/** PUT /api/games/:id  (ส่งเฉพาะฟิลด์ที่ต้องการแก้ ถ้าส่ง genreIds ฯลฯ จะแทนที่ทั้งชุด) */
async function updateGame(id: number, b: z.infer<typeof gameUpdateBody>) {
  const replace = <K extends string>(list: number[] | undefined, key: K) =>
    list === undefined ? undefined : { deleteMany: {}, create: list.map((v) => ({ [key]: v }) as Record<K, number>) }

  return prisma.game.update({
    where: { id },
    data: {
      ...scalarFields(b),
      genres: replace(b.genreIds, 'genreId'),
      platforms: replace(b.platformIds, 'platformId'),
      developers: replace(b.developerIds, 'companyId'),
      publishers: replace(b.publisherIds, 'companyId'),
      ...(b.price && { price: { upsert: { create: b.price, update: b.price } } }),
    },
    include: gameInclude,
  })
}

games.put('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  res.json(serializeGameDetail(await updateGame(id, gameUpdateBody.parse(req.body))))
})

games.patch('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  res.json(serializeGameDetail(await updateGame(id, gameUpdateBody.parse(req.body))))
})

/** DELETE /api/games/:id (ราคา ภาพหน้าจอ และรายการในคอลเลกชันถูกลบตาม) */
games.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  await prisma.game.delete({ where: { id } })
  res.status(204).end()
})
