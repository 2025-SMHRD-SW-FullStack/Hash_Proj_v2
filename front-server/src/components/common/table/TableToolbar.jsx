import React from 'react'


export function TableToolbar({
    children, // 필터 영역 (선택)
    searchPlaceholder = '검색',
    searchValue,
    onChangeSearch,
    onSubmitSearch,
    onReset,
    right,
    className = '',
}) {
    return (
        <div className={`mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between ${className}`}>
            <div className="flex flex-1 items-center gap-2">
                {children}
                <div className="flex flex-1 items-center gap-2">
                    <input
                        value={searchValue}
                        onChange={(e) => onChangeSearch?.(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSubmitSearch?.()}
                        placeholder={searchPlaceholder}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                    <button onClick={onSubmitSearch} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">조회</button>
                    <button onClick={onReset} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">초기화</button>
                </div>
            </div>
            <div className="shrink-0">{right}</div>
        </div>
    )
}