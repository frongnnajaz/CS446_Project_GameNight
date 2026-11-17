// Root Layout: โครงหน้าที่ทุกหน้าใช้ร่วมกัน (Navbar, Footer, Toast) หน้าลูกแสดงที่ <Outlet />
import { Outlet, ScrollRestoration, type Location } from 'react-router'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ToastViewport from '../components/ToastViewport'
import { PriceErrorBanner } from '../components/ui'
import { useHydrated } from '../store/collectionStore'

// จำตำแหน่ง scroll ตาม path (ไม่รวม query string) เปลี่ยนตัวกรองในหน้า Store แล้วหน้าไม่เด้งขึ้นบน
const scrollKey = (location: Location) => location.pathname

export default function RootLayout() {
  const hydrated = useHydrated() // รอโหลดคอลเลกชันที่บันทึกไว้ก่อนแสดงหน้า

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-content"
      >
        ข้ามไปเนื้อหาหลัก
      </a>
      <Navbar />
      <PriceErrorBanner />
      <main id="main" className="flex-1">
        {hydrated ? (
          <Outlet />
        ) : (
          <div role="status" className="flex justify-center py-24">
            <span className="loading loading-spinner loading-lg text-primary" aria-label="กำลังโหลด" />
          </div>
        )}
      </main>
      <Footer />
      <ToastViewport />
      <ScrollRestoration getKey={scrollKey} />
    </div>
  )
}
