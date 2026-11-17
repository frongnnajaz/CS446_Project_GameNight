// CRUD ของตารางข้อมูลอ้างอิง: /api/genres, /api/platforms, /api/companies
import { Router } from 'express'
import { prisma } from '../db'
import { notFound } from '../lib/errors'
import { companyBody, idParam, namedBody, slugify } from '../lib/validate'

const withCount = { _count: { select: { games: true } } } as const
const countOf = <T extends { _count: { games: number } }>({ _count, ...rest }: T) => ({ ...rest, games_count: _count.games })

export const genres = Router()

genres.get('/', async (_req, res) => {
  const rows = await prisma.genre.findMany({ orderBy: { name: 'asc' }, include: withCount })
  res.json(rows.map(countOf))
})
genres.get('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  const row = await prisma.genre.findUnique({ where: { id }, include: withCount })
  if (!row) throw notFound('แนวเกมนี้')
  res.json(countOf(row))
})
genres.post('/', async (req, res) => {
  const b = namedBody.parse(req.body)
  res.status(201).json(await prisma.genre.create({ data: { name: b.name, slug: b.slug ?? slugify(b.name) } }))
})
genres.put('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  res.json(await prisma.genre.update({ where: { id }, data: namedBody.partial().parse(req.body) }))
})
genres.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  await prisma.genre.delete({ where: { id } })
  res.status(204).end()
})

export const platforms = Router()

platforms.get('/', async (_req, res) => {
  const rows = await prisma.platform.findMany({ orderBy: { id: 'asc' }, include: withCount })
  res.json(rows.map(countOf))
})
platforms.get('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  const row = await prisma.platform.findUnique({ where: { id }, include: withCount })
  if (!row) throw notFound('แพลตฟอร์มนี้')
  res.json(countOf(row))
})
platforms.post('/', async (req, res) => {
  const b = namedBody.parse(req.body)
  res.status(201).json(await prisma.platform.create({ data: { name: b.name, slug: b.slug ?? slugify(b.name) } }))
})
platforms.put('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  res.json(await prisma.platform.update({ where: { id }, data: namedBody.partial().parse(req.body) }))
})
platforms.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  await prisma.platform.delete({ where: { id } })
  res.status(204).end()
})

export const companies = Router()

companies.get('/', async (_req, res) => {
  const rows = await prisma.company.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { developed: true, published: true } } },
  })
  res.json(
    rows.map(({ _count, ...c }) => ({ ...c, developed_count: _count.developed, published_count: _count.published })),
  )
})
companies.get('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  const row = await prisma.company.findUnique({ where: { id } })
  if (!row) throw notFound('บริษัทนี้')
  res.json(row)
})
companies.post('/', async (req, res) => {
  res.status(201).json(await prisma.company.create({ data: companyBody.parse(req.body) }))
})
companies.put('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  res.json(await prisma.company.update({ where: { id }, data: companyBody.parse(req.body) }))
})
companies.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  await prisma.company.delete({ where: { id } })
  res.status(204).end()
})
