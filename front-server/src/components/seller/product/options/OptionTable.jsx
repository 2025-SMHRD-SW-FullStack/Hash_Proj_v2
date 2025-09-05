// src/components/seller/product/options/OptionTable.jsx
// 3등분 + 내부 스크롤 + 셀 전체 폭 입력 UI (견고한 키 매칭)

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

  // 부모 onChange 안전 패처
  const patchRow = (key, patch) => {
    if (typeof onChange === 'function') onChange(key, patch)
    else console.warn('OptionTable: onChange prop is missing')
  }

  // ✅ 키 미스매치 대비: key → label → (key의 마지막 값) 순으로 매칭
  const pickRow = (c) => {
    if (!rowMap || typeof rowMap.get !== 'function') return null

    // 1) 정확히 key
    if (rowMap.has(c.key)) return rowMap.get(c.key)

    // 2) label 폴백
    if (rowMap.has(c.label)) return rowMap.get(c.label)

    // 3) 마지막 값(예: '옵션명:값|옵션명2:값2' → '값2')이 label과 같은 것 찾기
    const label = String(c.label || '').trim()
    for (const [k, v] of rowMap.entries()) {
      const lastSeg = String(k).split('|').pop() || ''
      const lastVal = lastSeg.includes(':') ? lastSeg.split(':').slice(1).join(':') : lastSeg
      if (String(lastVal).trim() === label) return v
    }

    return null
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
              const found = pickRow(c)
              const row = found ?? { addPrice: 0, stock: 0 }

              // 디버깅이 필요하면 주석 해제
               if (i < 3) console.log('[KEYMAP]', { key: c.key, label: c.label, hasKey: !!rowMap?.has?.(c.key), hasLabel: !!rowMap?.has?.(c.label), row })
              console.log('[RM-keys]', Array.from(rowMap?.keys?.() || []).slice(0, 10))
              return (
                <tr key={c.key} className={i % 2 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-3 py-2 text-center truncate" title={c.label}>
                    {c.label}
                  </td>

                  <td className="p-0">
                    +{' '}
                    <input
                      type="number"
                      value={row.addPrice ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        // rowMap의 실제 key가 무엇이든 pickRow가 찾아준 그대로 업데이트
                        // (가능하면 c.key로, 못 찾을 때도 c.key로 세팅 → 이후 일관화)
                        patchRow(c.key, { addPrice: v === '' ? '' : Number(v) })
                      }}
                    />
                  </td>

                  <td className="p-0">
                    <input
                      type="number"
                      value={row.stock ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        patchRow(c.key, { stock: v === '' ? '' : Number(v) })
                      }}
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
