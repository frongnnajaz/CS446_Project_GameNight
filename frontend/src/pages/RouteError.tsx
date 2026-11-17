// errorElement ของ Router: แสดงเมื่อหน้าใดหน้าหนึ่งเกิด error ระหว่าง render แทนการแสดงหน้าขาว
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { EmptyState, LinkButton } from '../components/ui'

export default function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState
        title={notFound ? 'ไม่พบหน้านี้' : 'เกิดข้อผิดพลาดในการแสดงหน้านี้'}
        actions={
          <>
            {!notFound && (
              <button type="button" onClick={() => window.location.reload()} className="btn btn-primary">
                โหลดหน้าใหม่
              </button>
            )}
            <LinkButton to="/" variant={notFound ? 'primary' : 'ghost'}>
              กลับไปหน้า Store
            </LinkButton>
          </>
        }
      >
        {notFound ? 'ลิงก์อาจผิด หรือหน้านี้ถูกย้ายไปแล้ว' : 'ลองโหลดหน้าใหม่ หรือกลับไปหน้า Store'}
      </EmptyState>
    </div>
  )
}
