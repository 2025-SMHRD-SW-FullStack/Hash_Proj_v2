// /src/components/seller/charts/StoreSalesStats.jsx
import React, { useEffect, useMemo, useState } from 'react'
import Button from '/src/components/common/Button'
import LineBase from './LineBase'
import { fetchSellerMainStats } from '/src/service/statsService'

// 'YYYY-MM-DD' -> 'MM/DD'
const toMMDD = (ymd) => {
  const s = String(ymd || '').replace(/[^0-9]/g, '')
  return s.length >= 8 ? `${s.slice(4, 6)}/${s.slice(6, 8)}` : (ymd || '')
}

/**
 * 스토어 매출 통계 카드 (정산 요약 API 사용)
 * props:
 *  - from?: 'YYYY-MM-DD'
 *  - to?:   'YYYY-MM-DD'
 *  - className?: string
 */
export default function StoreSalesStats({ from, to, className = '' }) {
  // 선택 가능한 지표: 정산 요약 스키마 기준
  const METRICS = [
    { key: 'itemTotal',   label: '판매금액' },
    { key: 'ordersCount', label: '결제건수' },
    { key: 'payoutTotal', label: '정산금액' },
  ]

  const [metric, setMetric] = useState(METRICS[0].key) // 기본: 판매금액
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [rows, setRows] = useState([]) // [{date:'YYYY-MM-DD', itemTotal, ordersCount, payoutTotal}]

  const unitOf = useMemo(() => Object.fromEntries(METRICS.map(m => [m.key, m.unit])), [])
  const labelOf = useMemo(() => Object.fromEntries(METRICS.map(m => [m.key, m.label])), [])

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

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setErr(null)
      try {
        const { rows } = await fetchSellerMainStats({
          from: from || fromDef,
          to:   to   || toDef,
        })
        setRows(Array.isArray(rows) ? rows : [])
      } catch (e) {
        setErr(e)
      } finally {
        setLoading(false)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, fromDef, toDef])

  return (
    <section className={`rounded-xl border bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[13px] font-semibold">스토어 매출 통계</h4>
        <span className="text-xs text-gray-500">
          Y축 단위: {unitOf[metric]}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {METRICS.map((m) => (
          <Button
            key={m.key}
            variant="admin" // 프로젝트 'admin' 톤 재사용
            size="sm"
            className="rounded-full px-3"
            onClick={() => setMetric(m.key)}
          >
            {m.label}
          </Button>
        ))}
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
      ) : rows.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center rounded-md border text-sm text-gray-400">
          데이터가 없습니다
        </div>
      ) : (
        <div className="h-[260px]">
          <LineBase
            data={rows.map((d) => ({
              date: toMMDD(d.date),        // X축: MM/DD
              value: Number(d[metric] ?? 0),
            }))}
            xKey="date"
            yKey="value"
            unit={unitOf[metric]}
            title={labelOf[metric]}
          />
        </div>
      )}
    </section>
  )
}
