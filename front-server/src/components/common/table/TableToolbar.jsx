import React from 'react'
import Button from '/src/components/common/Button'

export function TableToolbar({
  children,
  searchPlaceholder = '검색',
  searchValue,
  onChangeSearch,
  onSubmitSearch,
  onReset,
  right,
  className = '',
}) {
  return (
    <div className={`mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      {/* 왼쪽: 필터 + 검색 */}
      <div className="flex w-full items-center gap-2">
        {children}

        {/* 입력창은 가로 꽉, 버튼들은 가로로 */}
        <input
          value={searchValue}
          onChange={(e) => onChangeSearch?.(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmitSearch?.()}
          placeholder={searchPlaceholder}
          className="h-10 w-full flex-1 rounded-lg border px-3 text-sm"
        />

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="admin" size="md" onClick={onSubmitSearch}>조회</Button>
          <Button variant="whiteBlack" size="md" onClick={onReset}>초기화</Button>
        </div>
      </div>

      {/* 오른쪽 영역(선택) */}
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}
