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
  // 반응형 상태 칩/드롭다운용 데이터
  statusChips = [],
  selectedStatus = null,     // 문자열 value만 관리
  onSelectStatus,
}) {
  const isMobile = useMediaQuery({ maxWidth: 767 })

  return (
    <div
      className={`mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      {/* 왼쪽: 상태칩/카테고리 + 검색 */}
      <div className="flex w-full items-center gap-2">
        {/* 모바일: 드롭다운, 데스크탑: 칩 */}
        {isMobile ? (
          <CategorySelect
            categories={statusChips}
            selected={statusChips.find(s => s.value === selectedStatus)}
            onChange={(item) => onSelectStatus(item.value)}
            className="w-full"
          />
        ) : (
          <StatusChips
            items={statusChips}
            value={selectedStatus}
            onChange={onSelectStatus}
            size="sm"
            variant="admin"
            className="shrink-0"
          />
        )}

        {/* 검색 input + 초기화 버튼 */}
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
      </div>

      {/* 오른쪽 영역 (선택적) */}
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}
