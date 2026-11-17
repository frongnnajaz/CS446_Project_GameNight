import type { ReactNode } from 'react'

export const Tag = ({ children }: { children: ReactNode }) => (
  <span className="badge badge-lg border-0 bg-base-300 text-chip">{children}</span>
)
