import React from 'react'
import { cva } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'


const chipBase = cva(
  'inline-flex select-none items-center rounded-full border transition-colors',
  {
    variants: {
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-3 text-sm',   // 보통 input/button md와 동일
        lg: 'h-10 px-4 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  }
)

// Button 팔레트와 동기화
const colorClass = (variant, active) => {
  if (variant === 'primary') {
    return active
      ? 'bg-[#9DD5E9] text-white border-[#9DD5E9]'
      : 'bg-white border border-[#C3C3C3] text-[#4CBDE6] hover:bg-gray-50'
  }
  if (variant === 'admin') {
    return active
      ? 'bg-black text-white border-black'
      : 'bg-white border border-[#C3C3C3] text-black hover:bg-gray-50'
  }
  return ''
}

export default function StatusChips({


    
  items = [],            // [{ key, label, count? }]
  value,                 // 현재 선택 key
  onChange,              // (key) => void
  className,
  size = 'md',
  variant = 'primary',   // 'primary' | 'admin' | 'neutral'
}) {
  const list = Array.isArray(items) ? items : []

  return (
    <div
      className={twMerge('flex flex-wrap items-center gap-2', className)}
      role="tablist"
      aria-label="status tabs"
    >
      {list.map((it) => {
        const active = it.key === value
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(it.key)}
            className={twMerge(chipBase({ size }), colorClass(variant, active))}
          >
            <span className="whitespace-nowrap">
              {it.label}{typeof it.count === 'number' ? ` ${it.count}` : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}
