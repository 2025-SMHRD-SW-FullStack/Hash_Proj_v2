// src/components/seller/product/options/OptionTable.jsx
// OptionTable.jsx — 3등분 + 내부 스크롤 + 셀 전체 폭 입력 UI

import React from 'react'

export default function OptionTable({
  combos = [],
  rowMap,
  onChange,
  maxHeight = 320,
}) {
  if (!combos.length) {
    return (
      <p className="text-sm text-gray-500">
        옵션값을 입력하면 아래 목록이 자동으로 생성됩니다.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="overflow-y-auto" style={{ maxHeight }}>
        <table className="w-full table-fixed text-sm">
          <colgroup>
            {[33.3333, 33.3333, 33.3333].map((pct, i) => (
              <col key={i} style={{ width: `${pct}%` }} />
            ))}
          </colgroup>

          <thead className="sticky top-0 z-10 bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-center">옵션</th>
              <th className="p-2 text-center">추가금(원)</th>
              <th className="p-2 text-center">재고</th>
            </tr>
          </thead>

          <tbody>
            {combos.map((c, i) => {
              const row = rowMap.get(c.key) || { addPrice: 0, stock: 0 }
              return (
                <tr key={c.key} className={i % 2 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-3 py-2 text-center truncate" title={c.label}>
                    {c.label}
                  </td>

                  <td className="p-0">
                    <input
                      type="number"
                      inputMode="numeric"
                      className="block h-10 w-full rounded-none border-0 bg-transparent px-3 text-center outline-none"
                      value={row.addPrice}
                      onChange={(e) =>
                        onChange(c.key, { addPrice: Number(e.target.value || 0) })
                      }
                      placeholder="0"
                    />
                  </td>

                  <td className="p-0">
                    <input
                      type="number"
                      inputMode="numeric"
                      className="block h-10 w-full rounded-none border-0 bg-transparent px-3 text-center outline-none"
                      value={row.stock}
                      onChange={(e) =>
                        onChange(c.key, { stock: Number(e.target.value || 0) })
                      }
                      placeholder="0"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
