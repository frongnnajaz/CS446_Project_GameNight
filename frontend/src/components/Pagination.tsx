import { ChevronLeft, ChevronRight } from './Icons'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  const pages: number[] = []
  for (let p = start; p <= end; p++) pages.push(p)
  return (
    <nav aria-label="แบ่งหน้า" className="flex justify-center">
      <div className="join">
        <button type="button" className="btn join-item" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="หน้าก่อน">
          <ChevronLeft className="h-5 w-5" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
            className={`btn join-item ${p === page ? 'btn-primary' : ''}`}
          >
            {p}
          </button>
        ))}
        <button type="button" className="btn join-item" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="หน้าถัดไป">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </nav>
  )
}
