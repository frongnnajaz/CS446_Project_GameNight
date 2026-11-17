import type { UseQueryResult } from '@tanstack/react-query'
import { InlineError } from './ui'
import type { Genre, Platform } from '../types/api'

interface GenreChipsProps {
  query: UseQueryResult<Genre[]>
  value: string
  onChange: (slug: string) => void
  allLabel?: string
  label?: string
}

/** ปุ่มเลือกแนวเกม (เลื่อนแนวนอนได้บนมือถือ) */
export function GenreChips({ query, value, onChange, allLabel = 'ทั้งหมด', label = 'แนวเกม' }: GenreChipsProps) {
  if (query.isError) {
    return <InlineError error={query.error} onRetry={() => void query.refetch()} label="โหลดรายชื่อแนวเกมไม่สำเร็จ" />
  }
  const items = [{ slug: '', name: allLabel }, ...(query.data ?? [])]
  return (
    <div role="group" aria-label={label} className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
      <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {query.isPending
          ? Array.from({ length: 8 }, (_, i) => <span key={i} className="skeleton h-10 w-24 rounded-full" />)
          : items.map((g) => {
              const on = g.slug === value
              return (
                <button
                  key={g.slug || 'all'}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange(g.slug)}
                  className={`btn h-10 min-h-10 shrink-0 rounded-full px-4 font-normal ${on ? 'btn-primary font-semibold' : 'text-chip'}`}
                >
                  {g.name}
                </button>
              )
            })}
      </div>
    </div>
  )
}

interface PlatformSelectProps {
  id: string
  query: UseQueryResult<Platform[]>
  value: string
  onChange: (platformId: string) => void
  className: string
}

/** ตัวเลือกแพลตฟอร์ม พร้อมสถานะกำลังโหลดและปุ่มลองใหม่ */
export function PlatformSelect({ id, query, value, onChange, className }: PlatformSelectProps) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={query.isPending} className={className}>
        <option value="">{query.isPending ? 'กำลังโหลด...' : 'ทั้งหมด'}</option>
        {(query.data ?? []).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {query.isError && <InlineError error={query.error} onRetry={() => void query.refetch()} label="โหลดแพลตฟอร์มไม่สำเร็จ" />}
    </span>
  )
}
