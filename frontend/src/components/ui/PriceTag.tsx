import { usePricesQuery } from '../../hooks/queries'
import { baht } from '../../utils/format'
import type { Price } from '../../types/api'

interface PriceTagProps {
  price: Price | null
  size?: 'md' | 'lg'
  compact?: boolean
}

/** แสดงราคา ส่วนลด และ Free to Play (null = กำลังโหลด แสดง skeleton หรือโหลดไม่สำเร็จ) */
export function PriceTag({ price, size = 'md', compact = false }: PriceTagProps) {
  const pricesFailed = usePricesQuery().isError // อ่านจาก cache เดียวกันทั้งแอป ไม่ยิงซ้ำ
  if (!price && pricesFailed) return <span className="text-sm text-muted">ราคาไม่พร้อมใช้งาน</span>
  if (!price) return <span aria-label="กำลังโหลดราคา" className="skeleton inline-block h-5 w-16" />
  const big = size === 'lg' ? 'text-2xl' : ''
  if (price.free) return <span className={`font-semibold text-white ${big}`}>Free to Play</span>
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {price.discount > 0 && (
        <span className="badge border-0 bg-deal font-semibold text-deal-fg">-{price.discount}%</span>
      )}
      {price.discount > 0 && !compact && (
        <span className="text-sm text-muted line-through">
          <span className="sr-only">ราคาปกติ </span>
          {baht(price.base)}
        </span>
      )}
      <span className={`font-semibold text-white ${big}`}>{baht(price.final)}</span>
    </span>
  )
}

/** แถบแจ้งเมื่อโหลดตารางราคาไม่สำเร็จ พร้อมปุ่มลองใหม่ (แสดงครั้งเดียวใต้ Navbar) */
export function PriceErrorBanner() {
  const pricesQ = usePricesQuery()
  if (!pricesQ.isError) return null
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-8">
      <div role="alert" className="alert alert-warning alert-soft flex flex-wrap justify-between gap-3 text-sm">
        <span>โหลดข้อมูลราคาเกมไม่สำเร็จ ราคาจะยังไม่แสดงจนกว่าจะโหลดได้</span>
        <button
          type="button"
          onClick={() => void pricesQ.refetch()}
          disabled={pricesQ.isFetching}
          className="btn btn-sm btn-warning btn-outline"
        >
          {pricesQ.isFetching && <span className="loading loading-spinner loading-xs" />}
          ลองใหม่
        </button>
      </div>
    </div>
  )
}
