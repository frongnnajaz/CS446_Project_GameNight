import { EmptyState, LinkButton } from '../components/ui'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState title="ไม่พบหน้านี้" actions={<LinkButton to="/">กลับไปหน้า Store</LinkButton>}>
        ลิงก์อาจผิด หรือหน้านี้ถูกย้ายไปแล้ว
      </EmptyState>
    </div>
  )
}
