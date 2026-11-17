// สถานะ error และสถานะว่างที่ใช้ร่วมกันทุกหน้า
import type { ReactNode } from 'react'
import { errorText } from '../../services/api'

interface ErrorProps {
  error: unknown
  onRetry?: () => void
}

/** error ขนาดใหญ่สำหรับเนื้อหาหลักของหน้า */
export function ErrorState({ error, onRetry }: ErrorProps) {
  return (
    <div role="alert" className="alert alert-error alert-soft alert-vertical px-6 py-10 text-center">
      <p className="font-semibold text-white">{errorText(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-error btn-outline">
          ลองใหม่
        </button>
      )}
    </div>
  )
}

/** error ขนาดเล็กสำหรับส่วนย่อย (ตัวกรอง แกลเลอรี แถวในคอลเลกชัน) */
export function InlineError({ error, onRetry, label }: ErrorProps & { label?: string }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-error">
      <span>{label ?? errorText(error)}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-xs btn-error btn-outline">
          ลองใหม่
        </button>
      )}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  children?: ReactNode
  actions?: ReactNode
}

export function EmptyState({ title, children, actions }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-base-300 px-6 py-14 text-center">
      <p className="font-display text-xl font-medium text-white">{title}</p>
      {children && <p className="max-w-md text-sub">{children}</p>}
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  )
}
