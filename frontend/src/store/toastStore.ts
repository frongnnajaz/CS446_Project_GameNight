// Toast เก็บใน Zustand เรียก toast('ข้อความ') ได้จากที่ไหนก็ได้ (ไม่ต้องอยู่ใน component)
import { create } from 'zustand'
import type { ToastState } from '../types/collection'

export const useToastStore = create<ToastState>()(() => ({ toast: null }))

let timer: ReturnType<typeof setTimeout> | undefined

export function toast(text: string): void {
  useToastStore.setState({ toast: { text, key: Date.now() } })
  clearTimeout(timer)
  timer = setTimeout(() => useToastStore.setState({ toast: null }), 2600)
}
