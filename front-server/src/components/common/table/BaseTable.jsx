import React from 'react'


export default function BaseTable({
    columns = [],
    data = [],
    rowKey = 'id',
    className = '',
    emptyText = '데이터가 없습니다.',
    withCheckbox = false,
    selectedRowKeys = [],
    onToggleRow, // (key:boolean) => void
    onToggleAll, // (boolean) => void
    onRowClick, // (row) => void
}) {
    const getKey = (row, idx) => (typeof rowKey === 'function' ? rowKey(row, idx) : row[rowKey] ?? idx)
    const allSelected = withCheckbox && data.length > 0 && selectedRowKeys.length === data.length


    return (
        <div className={`overflow-x-auto rounded-xl border bg-white ${className}`}>
            <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs text-gray-600">
                    <tr className="border-b">
                        {withCheckbox && (
                            <th className="px-3 py-3 w-10 text-center">
                                <input type="checkbox" checked={allSelected} onChange={(e) => onToggleAll?.(e.target.checked)} />
                            </th>
                        )}
                        {columns.map((col, i) => (
                            <th key={i} className={`px-3 py-3 ${col.headerClassName || ''}`} style={{ width: col.width }}>
                                {col.renderHeader ? col.renderHeader(col) : col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={(withCheckbox ? 1 : 0) + columns.length} className="px-4 py-10 text-center text-gray-400">
                                {emptyText}
                            </td>
                        </tr>
                    )}


                    {data.map((row, idx) => {
                        const key = getKey(row, idx)
                        return (
                            <tr
                                key={key}
                                className="border-b last:border-b-0 hover:bg-gray-50"
                                onClick={() => onRowClick?.(row)}
                            >
                                {withCheckbox && (
                                    <td className="px-3 py-3 text-center align-middle">
                                        <input
                                            type="checkbox"
                                            checked={selectedRowKeys.includes(key)}
                                            onChange={(e) => onToggleRow?.(key, e.target.checked)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </td>
                                )}


                                {columns.map((col, i) => (
                                    <td key={i} className={`px-3 py-3 align-middle ${col.className || ''}`} style={{ width: col.width, textAlign: col.align }}>
                                        {col.render ? col.render(row, idx) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}