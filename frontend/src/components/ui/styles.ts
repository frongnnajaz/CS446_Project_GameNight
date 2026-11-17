// คลาสของ daisyUI ที่ใช้ซ้ำหลายจุด (ขนาดปุ่ม 44px ตั้งไว้ที่ธีมใน index.css)

export const selectCls = 'select w-auto'

export const btn = {
  primary: 'btn btn-primary',
  buy: 'btn btn-success',
  outline: 'btn btn-outline btn-primary',
  ghost: 'btn',
} as const

export type ButtonVariant = keyof typeof btn
