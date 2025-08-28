// src/components/seller/charts/StoreSalesStats.jsx
import React, { useState } from 'react'
import LineBase from './LineBase'

/**
 * 스토어 매출 통계 카드
 * - 탭 버튼 항상 노출 (결제금액 / 결제건수 / 결제자수)
 * - Y축 단위 표시 ('원' / '건' / '명')
 * - data 스키마: [{ date, amount, orders, payers }]
 */
export default function StoreSalesStats({ data = [] }) {
  const [metric, setMetric] = useState('amount') // 'amount' | 'orders' | 'payers'
  const unitOf = { amount: '원', orders: '건', payers: '명' }
  const keyOf  = { amount: 'amount', orders: 'orders', payers: 'payers' }

  const ds = data.length ? data : DEFAULT_DATA

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[13px] font-semibold">스토어 매출 통계</h4>
      </div>

      {/* ✅ 항상 보이는 탭 버튼 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {[
          { key: 'amount', label: '결제금액' },
          { key: 'orders', label: '결제건수' },
          { key: 'payers', label: '결제자수' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setMetric(t.key)}
            className={`rounded-full border px-3 py-1 text-xs
              ${metric === t.key
                ? 'bg-[#9DD5E9] text-white border-[#9DD5E9]'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            type="button"
          >
            {t.label}
          </button>
        ))}

        {/* 현재 단위 안내 (선택) */}
        <span className="ml-auto text-xs text-gray-500">
          Y축 단위: {unitOf[metric]}
        </span>
      </div>

      <div className="h-[260px]">
        <LineBase
          data={ds}
          xKey="date"
          yKey={keyOf[metric]}
          unit={unitOf[metric]}
        />
      </div>
    </section>
  )
}

const DEFAULT_DATA = [
  { date: '08/14', amount: 0,     orders: 0, payers: 0 },
  { date: '08/16', amount: 0,     orders: 0, payers: 0 },
  { date: '08/18', amount: 0,     orders: 0, payers: 0 },
  { date: '08/20', amount: 12000, orders: 4, payers: 3 },
  { date: '08/22', amount: 34000, orders: 6, payers: 5 },
  { date: '08/24', amount: 0,     orders: 0, payers: 0 },
  { date: '08/26', amount: 98000, orders: 8, payers: 7 },
  { date: '08/27', amount: 1000,  orders: 1, payers: 1 },
]
