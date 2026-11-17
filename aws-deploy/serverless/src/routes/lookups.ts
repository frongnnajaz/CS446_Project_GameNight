// CRUD ของข้อมูลอ้างอิง: /api/genres, /api/platforms, /api/companies
import { Router } from 'express'
import { allGames, deleteItem, getItem, listLookups, nextId, putItem, T, type GameDoc, type Lookup, type LookupKind } from '../db'
import { ApiError, notFound } from '../errors'
import { companyBody, idParam, namedBody, slugify } from '../validate'

const strip = ({ kind: _k, ...rest }: Lookup) => rest
const byName = (a: Lookup, b: Lookup) => a.name.localeCompare(b.name)
const byId = (a: Lookup, b: Lookup) => a.id - b.id

async function find(kind: LookupKind, id: number, what: string) {
  const row = await getItem<Lookup>(T.lookups, { kind, id })
  if (!row) throw notFound(what)
  return row
}

async function assertUnique(kind: LookupKind, field: 'slug' | 'name', value: string, exceptId?: number) {
  if ((await listLookups(kind)).some((l) => l[field] === value && l.id !== exceptId)) {
    throw new ApiError(409, 'ข้อมูลซ้ำกับที่มีอยู่แล้ว')
  }
}

/** ลบ id ออกจากทุกเกมที่อ้างถึง (แทน ON DELETE CASCADE ของตารางเชื่อม) */
async function detach(field: keyof Pick<GameDoc, 'genreIds' | 'platformIds' | 'developerIds' | 'publisherIds'>, id: number, games: GameDoc[]) {
  for (const g of games.filter((g) => g[field].includes(id))) {
    await putItem(T.games, { ...g, [field]: g[field].filter((x) => x !== id) })
  }
}

/** สร้าง router ของแนวเกมหรือแพลตฟอร์ม (โครงเหมือนกัน ต่างกันแค่ชนิดและฟิลด์ในเกม) */
function namedRouter(kind: 'genre' | 'platform', what: string, field: 'genreIds' | 'platformIds', sort: typeof byId) {
  const r = Router()
  const withCount = (l: Lookup, games: GameDoc[]) => ({ ...strip(l), games_count: games.filter((g) => g[field].includes(l.id)).length })

  r.get('/', async (_req, res) => {
    const [rows, games] = await Promise.all([listLookups(kind), allGames()])
    res.json(rows.sort(sort).map((l) => withCount(l, games)))
  })
  r.get('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params)
    const [row, games] = await Promise.all([find(kind, id, what), allGames()])
    res.json(withCount(row, games))
  })
  r.post('/', async (req, res) => {
    const b = namedBody.parse(req.body)
    const slug = b.slug ?? slugify(b.name)
    await assertUnique(kind, 'slug', slug)
    const row: Lookup = { kind, id: await nextId(kind), name: b.name, slug }
    await putItem(T.lookups, row)
    res.status(201).json(strip(row))
  })
  r.put('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params)
    const b = namedBody.partial().parse(req.body)
    const row = await find(kind, id, what)
    if (b.slug) await assertUnique(kind, 'slug', b.slug, id)
    const next = { ...row, ...b }
    await putItem(T.lookups, next)
    res.json(strip(next))
  })
  r.delete('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params)
    await find(kind, id, what)
    await deleteItem(T.lookups, { kind, id })
    await detach(field, id, await allGames())
    res.status(204).end()
  })
  return r
}

export const genres = namedRouter('genre', 'แนวเกมนี้', 'genreIds', byName)
export const platforms = namedRouter('platform', 'แพลตฟอร์มนี้', 'platformIds', byId)

export const companies = Router()

companies.get('/', async (_req, res) => {
  const [rows, games] = await Promise.all([listLookups('company'), allGames()])
  res.json(
    rows.sort(byName).map((c) => ({
      id: c.id,
      name: c.name,
      developed_count: games.filter((g) => g.developerIds.includes(c.id)).length,
      published_count: games.filter((g) => g.publisherIds.includes(c.id)).length,
    })),
  )
})
companies.get('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  const { id: _id, name } = await find('company', id, 'บริษัทนี้')
  res.json({ id, name })
})
companies.post('/', async (req, res) => {
  const { name } = companyBody.parse(req.body)
  await assertUnique('company', 'name', name)
  const row: Lookup = { kind: 'company', id: await nextId('company'), name }
  await putItem(T.lookups, row)
  res.status(201).json({ id: row.id, name })
})
companies.put('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  const { name } = companyBody.parse(req.body)
  await find('company', id, 'บริษัทนี้')
  await assertUnique('company', 'name', name, id)
  await putItem(T.lookups, { kind: 'company', id, name })
  res.json({ id, name })
})
companies.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params)
  await find('company', id, 'บริษัทนี้')
  await deleteItem(T.lookups, { kind: 'company', id })
  const games = await allGames()
  await detach('developerIds', id, games)
  await detach('publisherIds', id, await allGames())
  res.status(204).end()
})
