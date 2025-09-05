import React from 'react';

export default function BaseTable({
  columns = [],
  data = [],
  rowKey = 'id',
  className = '',
  emptyText = '데이터가 없습니다.',
  withCheckbox = false,
  selectedRowKeys = [],
  onToggleRow,   // (key:boolean) => void
  onToggleAll,   // (boolean) => void
  onRowClick,    // (row) => void
  scrollY = 600, // ✅ 추가: 세로 스크롤 높이(px, '50vh' 등). falsy면 제한 없음
}) {
  const getKey = (row, idx) =>
    (typeof rowKey === 'function' ? rowKey(row, idx) : row[rowKey]) ?? idx;

  const allSelected =
    withCheckbox && data.length > 0 && selectedRowKeys.length === data.length;

  // ✅ scrollY 적용 스타일
  const yStyle =
    scrollY
      ? {
          maxHeight:
            typeof scrollY === 'number' ? `${scrollY}px` : String(scrollY),
          overflowY: 'auto',
        }
      : {};

  return (
    <div
      className={`relative w-full overflow-x-auto rounded-xl border bg-white ${className}`} // 부모 div에 overflow-x-auto 유지
      style={yStyle}
    >
      <table className="w-max text-center text-sm min-w-full">
        <thead className="sticky top-0 bg-gray-50 text-xs text-gray-600">
          <tr className="border-b">
            {withCheckbox && (
              <th className="w-10 px-3 py-3 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleAll?.(e.target.checked)}
                />
              </th>
            )}
            {columns.map((col, i) => (
              <th
                key={i}
                className={`px-3 py-3 ${col.headerClassName || ''}`}
                style={{ width: col.width }} // ⬅️ 컬럼별 고정 너비 유지
              >
                {col.renderHeader ? col.renderHeader(col) : col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 && (
            <tr>
              <td
                colSpan={(withCheckbox ? 1 : 0) + columns.length}
                className="px-4 py-10 text-center text-gray-400"
              >
                {emptyText}
              </td>
            </tr>
          )}

          {data.map((row, idx) => {
            const key = getKey(row, idx);
            return (
              <tr
                key={key}
                className="border-b last:border-b-0 hover:bg-gray-50"
                onClick={() => onRowClick?.(row)}
              >
                {withCheckbox && (
                  <td className="px-3 py-3 align-middle text-center">
                    <input
                      type="checkbox"
                      checked={selectedRowKeys.includes(key)}
                      onChange={(e) => onToggleRow?.(key, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}

                {columns.map((col, i) => (
                  <td
                    key={i}
                    className={`px-3 py-3 align-middle ${col.className || ''}`}
                    style={{ width: col.width, textAlign: col.align }} // ⬅️ 컬럼별 고정 너비 유지
                  >
                    {col.render ? col.render(row, idx) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}