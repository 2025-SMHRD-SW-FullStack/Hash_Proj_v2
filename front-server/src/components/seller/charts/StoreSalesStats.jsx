// /src/components/seller/charts/StoreSalesStats.jsx
import React, { useEffect, useMemo, useState } from 'react'
import Button from '/src/components/common/Button'
import LineBase from './LineBase'
import { fetchSalesStats } from '/src/service/statsService'

/**
 * 스토어 매출 통계 카드 (Button 사용 + 백엔드 연동, 더미 없음)
 * props:
 *  - from?: 'YYYY-MM-DD'
 *  - to?:   'YYYY-MM-DD'
 *  - data?: [{ date, amount, orders, payers }]  // 외부 주입 시 fetch 생략
 *  - className?: string
 */
export default function StoreSalesStats({ from, to, data, className = '' }) {
  const [metric, setMetric] = useState('amount') // amount | orders | payers
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [rows, setRows] = useState([])

  const unitOf = { amount: '원', orders: '건', payers: '명' }
  const keyOf  = { amount: 'amount', orders: 'orders', payers: 'payers' }

  // 기본 14일 구간
  const { fromDef, toDef } = useMemo(() => {
    const end = new Date()
    const start = new Date(end.getTime() - 13 * 86400000)
    const ymd = (d) => {
      const yy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yy}-${mm}-${dd}`
    }
    return { fromDef: ymd(start), toDef: ymd(end) }
  }, [])

  const useData = data?.length ? data : rows

  useEffect(() => {
    if (data?.length) return // 외부 주입 데이터 우선 사용
    const run = async () => {
      setLoading(true)
      setErr(null)
      try {
        const result = await fetchSalesStats({
          from: from || fromDef,
          to: to   || toDef,
        })
        setRows(Array.isArray(result) ? result : [])
      } catch (e) {
        setErr(e)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [from, to, data, fromDef, toDef])

  return (
    <section className={`rounded-xl border bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[13px] font-semibold">스토어 매출 통계</h4>
        <span className="text-xs text-gray-500">Y축 단위: {unitOf[metric]}</span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {[
          { key: 'amount', label: '결제금액' },
          { key: 'orders', label: '결제건수' },
          { key: 'payers', label: '결제자수' },
        ].map((t) => {
          const active = metric === t.key
          return (
            <Button
              key={t.key}
              variant="admin"
              size="sm"
              className="rounded-full px-3"
              onClick={() => setMetric(t.key)}
            >
              {t.label}
            </Button>
          )
        })}
      </div>

      {/* 로딩/에러/빈 상태/차트 */}
      {loading ? (
        <div className="flex h-[260px] items-center justify-center rounded-md border text-sm text-gray-400">
          불러오는 중…
        </div>
      ) : err ? (
        <div className="flex h-[260px] items-center justify-center rounded-md border border-red-300 bg-red-50 text-sm text-red-500">
          통계 조회 실패: {err?.response?.data?.message || err.message}
        </div>
      ) : useData.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center rounded-md border text-sm text-gray-400">
          데이터가 없습니다
        </div>
      ) : (
        <div className="h-[260px]">
          <LineBase
            data={useData.map((d) => ({
              date: d.date,
              value: d[keyOf[metric]],
            }))}
            xKey="date"
            yKey="value"
            unit={unitOf[metric]}
          />
        </div>
      )}
    </section>
  )
}
