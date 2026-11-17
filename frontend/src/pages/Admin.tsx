// หน้าจัดการข้อมูล (CRUD) ทุกการเปลี่ยนแปลงส่งไปที่ Backend API แล้วบันทึกลงฐานข้อมูลผ่าน Prisma
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { useCompanies, useGenres, usePlatforms, usePrices } from '../hooks/queries'
import * as api from '../services/api'
import { priceFor } from '../services/priceApi'
import { toast } from '../store/toastStore'
import { genreText } from '../utils/format'
import { TrashIcon } from '../components/Icons'
import { EmptyState, ErrorState, InlineError, PriceTag, btn } from '../components/ui'
import type { GameDetail, GameInput, GameSummary } from '../types/api'

const TABS = [
  { key: 'games', label: 'เกม' },
  { key: 'genres', label: 'แนวเกม' },
  { key: 'platforms', label: 'แพลตฟอร์ม' },
  { key: 'companies', label: 'บริษัท' },
] as const

type TabKey = (typeof TABS)[number]['key']
const isTab = (v: string | null): v is TabKey => TABS.some((t) => t.key === v)

/** หลังแก้ข้อมูลให้โหลด query ที่เกี่ยวข้องใหม่ทั้งหมด */
function useInvalidateAll() {
  const qc = useQueryClient()
  return () =>
    Promise.all(
      ['games', 'game', 'prices', 'picker-pool', 'genres', 'platforms', 'companies', 'wishlist', 'library', 'admin-games'].map(
        (k) => qc.invalidateQueries({ queryKey: [k] }),
      ),
    )
}

export default function Admin() {
  const [sp, setSp] = useSearchParams()
  const raw = sp.get('tab')
  const tab: TabKey = isTab(raw) ? raw : 'games'

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">จัดการข้อมูล</h1>
        <p className="mt-1 text-muted">เพิ่ม แก้ไข และลบข้อมูลในฐานข้อมูล ผ่าน Backend RESTful API</p>
      </div>

      <div role="tablist" aria-label="ตารางข้อมูล" className="tabs tabs-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setSp(t.key === 'games' ? {} : { tab: t.key })}
            className={`tab shrink-0 px-5 ${tab === t.key ? 'tab-active font-semibold text-white' : 'text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'games' ? <GamesAdmin /> : <LookupAdmin kind={tab} />}
    </div>
  )
}

// ---------------------------------------------------------------- เกม

function GamesAdmin() {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const prices = usePrices()
  const invalidate = useInvalidateAll()

  const gamesQ = useQuery({
    queryKey: ['admin-games', search],
    queryFn: () => api.getGames({ search, page_size: 100, ordering: 'name' }),
  })

  const del = useMutation({
    mutationFn: (g: GameSummary) => api.deleteGame(g.id),
    onSuccess: (_d, g) => toast(`ลบ ${g.name} แล้ว`),
    onError: (e) => toast(`ลบไม่สำเร็จ: ${api.errorText(e)}`),
    onSettled: invalidate,
  })

  const confirmDelete = (g: GameSummary) => {
    if (window.confirm(`ลบเกม "${g.name}" ?\nราคา ภาพหน้าจอ และรายการใน Wishlist/คลังของเกมนี้จะถูกลบด้วย`)) del.mutate(g)
  }

  const rows = gamesQ.data?.results ?? []

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="input min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">ค้นหาเกม</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อเกม..." />
        </label>
        <span className="text-sm text-muted">{gamesQ.data ? `${gamesQ.data.count} เกม` : ''}</span>
        <button type="button" onClick={() => setEditing('new')} className={`${btn.primary} ml-auto`}>
          + เพิ่มเกม
        </button>
      </div>

      {gamesQ.isError ? (
        <ErrorState error={gamesQ.error} onRetry={() => void gamesQ.refetch()} />
      ) : gamesQ.isPending ? (
        <div className="skeleton h-64 rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState title="ไม่พบเกม">{search ? 'ลองค้นหาด้วยคำอื่น' : 'กด "เพิ่มเกม" เพื่อสร้างเกมแรก'}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-base-200">
          <table className="table">
            <thead>
              <tr className="text-muted">
                <th>ID</th>
                <th>ชื่อเกม</th>
                <th className="hidden md:table-cell">แนวเกม</th>
                <th>ราคา</th>
                <th className="hidden sm:table-cell">เรตติ้ง</th>
                <th className="text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id} className="hover:bg-panel-hover">
                  <td className="text-muted">{g.id}</td>
                  <td>
                    <Link to={`/game/${g.id}`} className="font-semibold text-white hover:text-primary">
                      {g.name}
                    </Link>
                    {g.price?.isFeatured && <span className="badge badge-primary badge-sm ml-2">แนะนำ</span>}
                  </td>
                  <td className="hidden text-sub md:table-cell">{genreText(g, 3)}</td>
                  <td>
                    <PriceTag price={priceFor(g, prices)} compact />
                  </td>
                  <td className="hidden text-star sm:table-cell">★ {g.rating.toFixed(1)}</td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditing(g.id)} className="btn btn-sm">
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(g)}
                        disabled={del.isPending && del.variables?.id === g.id}
                        aria-label={`ลบ ${g.name}`}
                        className="btn btn-sm btn-error btn-outline"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && <GameDialog id={editing} onClose={() => setEditing(null)} />}
    </section>
  )
}

const EMPTY_GAME: GameInput = {
  name: '',
  released: null,
  rating: 0,
  metacritic: null,
  background_image: null,
  description_raw: '',
  website: '',
  genreIds: [],
  platformIds: [],
  developerIds: [],
  publisherIds: [],
  price: { price: 0, discountPercent: 0, isFeatured: false },
}

function toInput(g: GameDetail): GameInput {
  return {
    name: g.name,
    slug: g.slug,
    released: g.released,
    rating: g.rating,
    metacritic: g.metacritic,
    background_image: g.background_image,
    description_raw: g.description_raw,
    website: g.website,
    genreIds: g.genres.map((x) => x.id),
    platformIds: (g.parent_platforms ?? []).map((x) => x.platform.id),
    developerIds: g.developers.map((x) => x.id),
    publisherIds: g.publishers.map((x) => x.id),
    price: {
      price: g.price?.price ?? 0,
      discountPercent: g.price?.discountPercent ?? 0,
      isFeatured: g.price?.isFeatured ?? false,
    },
  }
}

/** ฟอร์มเพิ่ม/แก้ไขเกมใน <dialog> */
function GameDialog({ id, onClose }: { id: number | 'new'; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const isNew = id === 'new'
  const gameQ = useQuery({ queryKey: ['game', String(id)], queryFn: () => api.getGame(id), enabled: !isNew })

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog ref={ref} className="modal" onClose={onClose} aria-labelledby="game-dialog-title">
      <div className="modal-box max-w-3xl bg-base-200">
        <h2 id="game-dialog-title" className="font-display text-2xl font-semibold text-white">
          {isNew ? 'เพิ่มเกมใหม่' : `แก้ไขเกม #${id}`}
        </h2>
        {isNew ? (
          <GameForm initial={EMPTY_GAME} id={null} onDone={() => ref.current?.close()} />
        ) : gameQ.isError ? (
          <div className="mt-4">
            <InlineError error={gameQ.error} onRetry={() => void gameQ.refetch()} />
          </div>
        ) : gameQ.data ? (
          <GameForm initial={toInput(gameQ.data)} id={gameQ.data.id} onDone={() => ref.current?.close()} />
        ) : (
          <div className="skeleton mt-4 h-96" />
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">ปิด</button>
      </form>
    </dialog>
  )
}

const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v))

function GameForm({ initial, id, onDone }: { initial: GameInput; id: number | null; onDone: () => void }) {
  const [f, setF] = useState<GameInput>(initial)
  const genresQ = useGenres()
  const platformsQ = usePlatforms()
  const companiesQ = useCompanies()
  const invalidate = useInvalidateAll()

  const set = <K extends keyof GameInput>(k: K, v: GameInput[K]) => setF((s) => ({ ...s, [k]: v }))
  const setPrice = (patch: Partial<GameInput['price']>) => setF((s) => ({ ...s, price: { ...s.price, ...patch } }))

  const save = useMutation({
    mutationFn: (input: GameInput) => (id === null ? api.createGame(input) : api.updateGame(id, input)),
    onSuccess: (g) => {
      toast(id === null ? `เพิ่ม ${g.name} แล้ว` : `บันทึก ${g.name} แล้ว`)
      onDone()
    },
    onSettled: invalidate,
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({ ...f, slug: f.slug?.trim() || undefined, background_image: f.background_image?.trim() || null })
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ชื่อเกม *">
          <input required maxLength={200} value={f.name} onChange={(e) => set('name', e.target.value)} className="input w-full" />
        </Field>
        <Field label="Slug (เว้นว่างให้สร้างจากชื่อ)">
          <input
            value={f.slug ?? ''}
            onChange={(e) => set('slug', e.target.value)}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="my-game"
            className="input w-full"
          />
        </Field>
        <Field label="วันวางขาย">
          <input
            type="date"
            value={f.released ?? ''}
            onChange={(e) => set('released', e.target.value || null)}
            className="input w-full"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="เรตติ้ง (0–5)">
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={f.rating}
              onChange={(e) => set('rating', Number(e.target.value))}
              className="input w-full"
            />
          </Field>
          <Field label="Metacritic">
            <input
              type="number"
              min={0}
              max={100}
              value={f.metacritic ?? ''}
              onChange={(e) => set('metacritic', numOrNull(e.target.value))}
              className="input w-full"
            />
          </Field>
        </div>
      </div>

      <fieldset className="grid gap-4 rounded-xl border border-base-300 p-4 sm:grid-cols-3">
        <legend className="px-1 text-sm text-muted">ราคา</legend>
        <Field label="ราคาปกติ (บาท, 0 = ฟรี)">
          <input
            type="number"
            min={0}
            value={f.price.price}
            onChange={(e) => setPrice({ price: Math.round(Number(e.target.value)) })}
            className="input w-full"
          />
        </Field>
        <Field label="ส่วนลด (%)">
          <input
            type="number"
            min={0}
            max={100}
            value={f.price.discountPercent}
            onChange={(e) => setPrice({ discountPercent: Math.round(Number(e.target.value)) })}
            className="input w-full"
          />
        </Field>
        <label className="flex items-center gap-3 self-end pb-2.5">
          <input
            type="checkbox"
            checked={f.price.isFeatured}
            onChange={(e) => setPrice({ isFeatured: e.target.checked })}
            className="checkbox checkbox-primary"
          />
          <span className="text-sub">เกมแนะนำ</span>
        </label>
      </fieldset>

      <CheckGroup
        legend="แนวเกม"
        query={genresQ}
        value={f.genreIds}
        onChange={(v) => set('genreIds', v)}
      />
      <CheckGroup
        legend="แพลตฟอร์ม"
        query={platformsQ}
        value={f.platformIds}
        onChange={(v) => set('platformIds', v)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <CheckGroup
          legend="ผู้พัฒนา"
          query={companiesQ}
          value={f.developerIds}
          onChange={(v) => set('developerIds', v)}
          scroll
        />
        <CheckGroup
          legend="ผู้จัดจำหน่าย"
          query={companiesQ}
          value={f.publisherIds}
          onChange={(v) => set('publisherIds', v)}
          scroll
        />
      </div>

      <Field label="คำอธิบาย">
        <textarea
          rows={4}
          value={f.description_raw}
          onChange={(e) => set('description_raw', e.target.value)}
          className="textarea w-full"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="URL ภาพปก">
          <input
            type="url"
            value={f.background_image ?? ''}
            onChange={(e) => set('background_image', e.target.value)}
            placeholder="https://..."
            className="input w-full"
          />
        </Field>
        <Field label="เว็บไซต์">
          <input
            type="url"
            value={f.website}
            onChange={(e) => set('website', e.target.value)}
            placeholder="https://..."
            className="input w-full"
          />
        </Field>
      </div>

      {save.isError && <InlineError error={save.error} />}

      <div className="modal-action mt-2">
        <button type="button" onClick={onDone} className={btn.ghost}>
          ยกเลิก
        </button>
        <button type="submit" disabled={save.isPending} className={btn.primary}>
          {save.isPending && <span className="loading loading-spinner loading-sm" />}
          {id === null ? 'เพิ่มเกม' : 'บันทึก'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </label>
  )
}

interface CheckGroupProps {
  legend: string
  query: { data?: { id: number; name: string }[]; isError: boolean; error: unknown; refetch: () => unknown }
  value: number[]
  onChange: (v: number[]) => void
  scroll?: boolean
}

function CheckGroup({ legend, query, value, onChange, scroll = false }: CheckGroupProps) {
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  return (
    <fieldset className="rounded-xl border border-base-300 p-4">
      <legend className="px-1 text-sm text-muted">
        {legend} ({value.length})
      </legend>
      {query.isError ? (
        <InlineError error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <div className={`flex flex-wrap gap-x-5 gap-y-2 ${scroll ? 'max-h-40 overflow-y-auto' : ''}`}>
          {(query.data ?? []).map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sub">
              <input
                type="checkbox"
                checked={value.includes(o.id)}
                onChange={() => toggle(o.id)}
                className="checkbox checkbox-sm checkbox-primary"
              />
              {o.name}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}

// ---------------------------------------------------------------- แนวเกม / แพลตฟอร์ม / บริษัท

interface LookupRow {
  id: number
  name: string
  slug?: string
  games_count?: number
  developed_count?: number
  published_count?: number
}

const LOOKUP_LABEL: Record<api.LookupKind, string> = { genres: 'แนวเกม', platforms: 'แพลตฟอร์ม', companies: 'บริษัท' }

function LookupAdmin({ kind }: { kind: api.LookupKind }) {
  const genresQ = useGenres()
  const platformsQ = usePlatforms()
  const companiesQ = useCompanies()
  const query = kind === 'genres' ? genresQ : kind === 'platforms' ? platformsQ : companiesQ
  const rows: LookupRow[] = query.data ?? []
  const hasSlug = kind !== 'companies'
  const invalidate = useInvalidateAll()
  const label = LOOKUP_LABEL[kind]

  const [name, setName] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const onError = (e: unknown) => toast(`ไม่สำเร็จ: ${api.errorText(e)}`)

  const create = useMutation({
    mutationFn: (n: string) => api.createLookup(kind, { name: n }),
    onSuccess: () => {
      toast(`เพิ่ม${label} "${name}" แล้ว`)
      setName('')
    },
    onError,
    onSettled: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, n }: { id: number; n: string }) => api.updateLookup(kind, id, { name: n }),
    onSuccess: () => setEditId(null),
    onError,
    onSettled: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.deleteLookup(kind, id),
    onError,
    onSettled: invalidate,
  })

  const usage = (r: LookupRow) =>
    kind === 'companies' ? `พัฒนา ${r.developed_count ?? 0} · จัดจำหน่าย ${r.published_count ?? 0}` : `${r.games_count ?? 0} เกม`

  return (
    <section className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) create.mutate(name.trim())
        }}
        className="flex flex-wrap gap-3"
      >
        <label className="input min-w-0 flex-1 sm:max-w-sm">
          <span className="sr-only">ชื่อ{label}ใหม่</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`ชื่อ${label}ใหม่`} maxLength={120} />
        </label>
        <button type="submit" disabled={create.isPending || !name.trim()} className={btn.primary}>
          + เพิ่ม{label}
        </button>
      </form>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <div className="skeleton h-48 rounded-xl" />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-base-200">
          <table className="table">
            <thead>
              <tr className="text-muted">
                <th>ID</th>
                <th>ชื่อ</th>
                {hasSlug && <th className="hidden sm:table-cell">Slug</th>}
                <th>ใช้งาน</th>
                <th className="text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-panel-hover">
                  <td className="text-muted">{r.id}</td>
                  <td>
                    {editId === r.id ? (
                      <form
                        id={`edit-${r.id}`}
                        onSubmit={(e) => {
                          e.preventDefault()
                          if (editName.trim()) update.mutate({ id: r.id, n: editName.trim() })
                        }}
                      >
                        <input
                          autoFocus
                          aria-label="ชื่อใหม่"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="input input-sm w-full"
                        />
                      </form>
                    ) : (
                      <span className="font-semibold text-white">{r.name}</span>
                    )}
                  </td>
                  {hasSlug && <td className="hidden text-muted sm:table-cell">{r.slug}</td>}
                  <td className="text-sub">{usage(r)}</td>
                  <td>
                    <div className="flex justify-end gap-2">
                      {editId === r.id ? (
                        <>
                          <button type="submit" form={`edit-${r.id}`} disabled={update.isPending} className="btn btn-sm btn-primary">
                            บันทึก
                          </button>
                          <button type="button" onClick={() => setEditId(null)} className="btn btn-sm">
                            ยกเลิก
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditId(r.id)
                            setEditName(r.name)
                          }}
                          className="btn btn-sm"
                        >
                          แก้ไข
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`ลบ ${r.name}`}
                        onClick={() => {
                          if (window.confirm(`ลบ${label} "${r.name}" ?\nเกมที่ใช้${label}นี้จะไม่ถูกลบ แต่จะไม่มี${label}นี้แล้ว`)) {
                            remove.mutate(r.id)
                          }
                        }}
                        className="btn btn-sm btn-error btn-outline"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
