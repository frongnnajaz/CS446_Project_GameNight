import { QueryClient } from '@tanstack/react-query'
import { statusOf } from './httpError'

// ไม่ลองซ้ำเมื่อ error ที่ลองใหม่ก็ไม่หาย (key ผิด, ไม่พบข้อมูล, โดน rate limit)
const NO_RETRY = [401, 403, 404, 429]

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (count, error) => !NO_RETRY.includes(statusOf(error) ?? 0) && count < 1,
    },
  },
})
