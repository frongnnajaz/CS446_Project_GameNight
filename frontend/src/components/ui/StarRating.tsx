import { useId } from 'react'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  label: string
}

/** ให้ดาวด้วย daisyUI rating (คลิกดาวที่เลือกอยู่ซ้ำเพื่อล้างคะแนน) */
export function StarRating({ value, onChange, label }: StarRatingProps) {
  const name = useId()
  return (
    <div role="radiogroup" aria-label={label} className="rating rating-lg">
      {[1, 2, 3, 4, 5].map((n) => (
        <input
          key={n}
          type="radio"
          name={name}
          aria-label={`${n} ดาว`}
          className="mask mask-star-2 bg-star"
          checked={value === n}
          onChange={() => onChange(n)}
          onClick={() => value === n && onChange(0)}
        />
      ))}
    </div>
  )
}
