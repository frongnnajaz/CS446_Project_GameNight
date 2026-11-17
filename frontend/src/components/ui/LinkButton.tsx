import type { ComponentProps } from 'react'
import { Link } from 'react-router'
import { btn, type ButtonVariant } from './styles'

type LinkButtonProps = Omit<ComponentProps<typeof Link>, 'className'> & { variant?: ButtonVariant }

/** ลิงก์ที่หน้าตาเป็นปุ่ม */
export const LinkButton = ({ variant = 'primary', children, ...rest }: LinkButtonProps) => (
  <Link className={btn[variant]} {...rest}>
    {children}
  </Link>
)
