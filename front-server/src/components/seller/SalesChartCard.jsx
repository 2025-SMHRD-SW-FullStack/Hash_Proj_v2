// /src/components/seller/SalesChartCard.jsx
import React from 'react'
import Button from '../common/Button'

/**
 * items: [{ key, label, count? }]
 * value: 선택된 key
 * onChange: (key) => void
 * size: 'sm' | 'md'
 * variant: 'admin' | 'signUp' | 'default'
 */
export default function StatusChips({
  items = [],
  value,
  onChange,
  size = 'sm',
  variant = 'default',
  className = '',
}) {
  const isActive = (k) => k === value

  const theme = {
    // 관리자 톤: 선택=검정, 비활성=흰배경/회색테두리
    admin:   { idle: 'outline', active: 'dark' },
    // 회원가입·포인트 톤: 선택=초록(primary), 비활성=outine
    signUp:  { idle: 'outline', active: 'primary' },
    // 무난 톤
    default: { idle: 'outline', active: 'dark' },
  }

  const map = theme[variant] ?? theme.default

  // 둥근 알약 형태 유지
  const pill = size === 'sm' ? 'rounded-full h-8 px-3 text-[13px]' : 'rounded-full h-9 px-3 text-sm'

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {items.map((it) => {
        const v = isActive(it.key) ? map.active : map.idle
        return (
          <Button
            key={it.key}
            variant={v}          // Button 변형 사용
            size={size}
            className={pill}     // 알약 모양
            onClick={() => onChange?.(it.key)}
          >
            {it.label}
            {typeof it.count === 'number' && (
              <span className="ml-1 text-gray-500">({it.count})</span>
            )}
          </Button>
        )
      })}
    </div>
  )
}
