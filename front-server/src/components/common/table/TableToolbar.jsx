import React from 'react'
import { useMediaQuery } from 'react-responsive'
import Button from '../Button'
import StatusChips from '../../seller/StatusChips'
import CategorySelect from '../CategorySelect'

export function TableToolbar({
  searchPlaceholder = '검색',
  searchValue,
  onChangeSearch,
  onSubmitSearch,
  onReset,
  right,
  className = '',
  statusChips = [],
  selectedStatus = null,
  onSelectStatus,
}) {
  const isMobile = useMediaQuery({ maxWidth: 767 })

  return (
    <div className={`mb-3 flex flex-col gap-2 ${className}`}>
      {/* 모바일: 3줄, 데스크탑: 1줄 */}
      {isMobile ? (
        <>
          {/* 1줄: 카테고리 */}
          <CategorySelect
            categories={statusChips}
            selected={statusChips.find(s => s.value === selectedStatus)}
            onChange={(item) => onSelectStatus(item.value)}
            className="w-full"
          />

          {/* 2줄: 검색 input + 초기화 */}
          <div className="flex w-full items-center gap-2">
            <input
              value={searchValue}
              onChange={(e) => onChangeSearch?.(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmitSearch?.()}
              placeholder={searchPlaceholder}
              className="h-10 flex-1 rounded-lg border px-3 text-sm"
            />
            <Button
              variant="whiteBlack"
              size="md"
              onClick={onReset}
              className="shrink-0"
            >
              초기화
            </Button>
          </div>

          {/* 3줄: 오른쪽 버튼 */}
          {right && <div className="w-full">{right}</div>}
        </>
      ) : (
        // 데스크탑: 기존 1줄 구조
        <div className="flex w-full items-center justify-between gap-2">
          <StatusChips
            items={statusChips}
            value={selectedStatus}
            onChange={onSelectStatus}
            size="sm"
            variant="admin"
            className="shrink-0"
          />
          <div className="flex flex-1 items-center gap-2">
            <input
              value={searchValue}
              onChange={(e) => onChangeSearch?.(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmitSearch?.()}
              placeholder={searchPlaceholder}
              className="h-10 flex-1 rounded-lg border px-3 text-sm"
            />
            <Button
              variant="whiteBlack"
              size="md"
              onClick={onReset}
              className="shrink-0"
            >
              초기화
            </Button>
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      )}
    </div>
  )
}

