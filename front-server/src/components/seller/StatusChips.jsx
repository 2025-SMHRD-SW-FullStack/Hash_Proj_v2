// /src/components/seller/StatusChips.jsx
import React, { useEffect, useRef, useState } from 'react'

const cx = (...xs) => xs.filter(Boolean).join(' ')

export default function StatusChips({
  items = [],            // [{ key, label, count? }]
  value,
  onChange,
  className = '',
  size = 'sm',           // 'sm' | 'md'
  activeClassName,       // 선택 칩 스타일 커스텀(선택)
  idleClassName,         // 비선택 칩 스타일 커스텀(선택)
}) {
  const wrapRef = useRef(null)
  const [shadow, setShadow] = useState({ left: false, right: false })

  // ▶ Button admin 팔레트에 맞춘 기본값
  const ADMIN_ACTIVE = 'bg-[#ADD973] border-[#ADD973] text-white hover:brightness-95'
  const ADMIN_IDLE   = 'bg-white border border-[#ADD973] text-[#ADD973] hover:bg-[#F3F9E9]'

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el
      setShadow({
        left: scrollLeft > 0,
        right: scrollLeft + clientWidth < scrollWidth - 1,
      })
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(onScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [])

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
  }

  return (
    <div className={cx('relative', className)}>
      {/* 모바일 좌/우 페이드 (배경색 바꾸면 from-* 조정) */}
      <div
        className={cx(
          'pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-gray-50 to-transparent md:hidden transition-opacity',
          shadow.left ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        className={cx(
          'pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-gray-50 to-transparent md:hidden transition-opacity',
          shadow.right ? 'opacity-100' : 'opacity-0'
        )}
      />

      <div
        ref={wrapRef}
        role="tablist"
        aria-label="상태 필터"
        className={cx(
          // 모바일: 가로 스크롤 + 스냅, 데스크톱: 줄바꿈
          'flex gap-2 overflow-x-auto md:overflow-visible',
          'whitespace-nowrap md:whitespace-normal',
          'snap-x snap-mandatory md:snap-none',
          'md:flex-wrap',
          '-mx-4 px-4 md:mx-0 md:px-0',
          // 스크롤바 숨김
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        )}
      >
        {items.map(({ value: itemValue, label, count }) => {
          const selected = value === itemValue
          const base =
            'shrink-0 snap-start rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30'
          const tone = selected
            ? (activeClassName || ADMIN_ACTIVE)
            : (idleClassName   || ADMIN_IDLE)

          return (
            <button
              key={itemValue}               // ← 수정
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange?.(itemValue)} // ← 수정
              className={cx(base, sizes[size], tone)}
            >
              <span>{label}</span>
              {typeof count === 'number' && (
                <span
                  className={cx(
                    'ml-2 inline-flex items-center justify-center rounded-full leading-none',
                    selected ? 'bg-white/20 text-white' : 'bg-[#EAF6D9] text-[#5E7F33]',
                    size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}

      </div>
    </div>
  )
}
