import React from 'react'
import { twMerge } from 'tailwind-merge'
import Button from '/src/components/common/Button'

/**
 * items: [{ key, label, count? }]
 * value: 현재 선택 key
 * onChange: (key) => void
 * size: 'sm' | 'md' | 'lg'  → Button 사이즈와 동일
 * variant:        선택된 칩에 적용할 Button variant (예: 'primary' | 'admin' | 'blueLine' ...)
 * idleVariant:    비선택 칩에 적용할 Button variant (예: 'signUp' | 'whiteBlack' | 'unselected' ...)
 */
export default function StatusChips({
  items = [],
  value,
  onChange,
  className = '',
  size = 'sm',
  variant = 'primary',
  idleVariant = 'signUp',
}) {
  const pillSize = size === 'lg'
    ? 'h-10 px-4 text-base'
    : size === 'md'
    ? 'h-9 px-3 text-sm'
    : 'h-8 px-3 text-[13px]'

  return (
    <div
      className={twMerge('flex flex-wrap items-center gap-2', className)}
      role="tablist"
      aria-label="status tabs"
    >
      {items.map((it) => {
        const active = it.key === value
        return (
          <Button
            key={it.key}
            role="tab"
            aria-selected={active}
            size={size}
            variant={active ? variant : idleVariant}
            className={twMerge('rounded-full', pillSize)}
            onClick={() => onChange?.(it.key)}
          >
            <span className="whitespace-nowrap">
              {it.label}{typeof it.count === 'number' ? ` ${it.count}` : ''}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
