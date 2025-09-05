// /src/components/seller/charts/StoreSalesStats.jsx
import React, { useEffect, useMemo, useState } from 'react'
import Button from '../../common/Button'
import LineBase from './LineBase'
import { fetchSalesStats } from '../../../../src/service/statsService'  // 주문 그리드 집계 기반 사용

// 'YYYY-MM-DD' -> 'MM/DD'
const toMMDD = (ymd) => {
  const s = String(ymd || '').replace(/[^0-9]/g, '')
  return s.length >= 8 ? `${s.slice(4, 6)}/${s.slice(6, 8)}` : (ymd || '')
}

/**
 * 스토어 매출 통계 카드 (Button 사용 + 백엔드 연동, 더미 없음)
 * props:
 *  - from?: 'YYYY-MM-DD'
 *  - to?:   'YYYY-MM-DD'
 *  - className?: string
 */
export default function StoreSalesStats({ from, to, className = '' }) {
  // 표시 지표: 판매금액, 결제건수 (단위 표시는 제거)
  const METRICS = [
    { key: 'amount', label: '판매금액' },
    { key: 'orders', label: '결제건수' },
  ]

  const [metric, setMetric] = useState(METRICS[0].key) // amount | orders
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [rows, setRows] = useState([]) // [{ date:'MM/DD', amount, orders }]

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
        const data = await fetchSalesStats({
          from: from || fromDef,
          to:   to   || toDef,
        })
        setRows(Array.isArray(data) ? data : [])
      } catch (e) {
        console.warn('매출 통계 로드 실패:', e)
        setRows([])
        setErr(e)
      } finally {
        setLoading(false)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, fromDef, toDef])

  const chartData = useMemo(() => rows, [rows])

  return (
    <section className={`rounded-xl border bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[13px] font-semibold">스토어 매출 통계</h4>
        {/* 단위 텍스트 제거 */}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {METRICS.map((m) => (
          <Button
            key={m.key}
            variant="admin"   // 기존 보라 톤 유지
            size="sm"
            className={`rounded-full px-3 ${metric === m.key ? '' : 'opacity-70'}`}
            onClick={() => setMetric(m.key)}
          >
            {m.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-[260px] items-center justify-center rounded-md border text-sm text-gray-400">
          불러오는 중…
        </div>
      ) : err ? (
        <div className="flex h-[260px] items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-500">
          통계 데이터를 불러오지 못했습니다.
        </div>
      ) : (!chartData || chartData.length === 0) ? (
        <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed text-sm text-gray-400">
          데이터가 없습니다.
        </div>
      ) : (
        <LineBase
          data={chartData}
          xKey="date"
          yKey={metric}
          unit=""          // ✅ 축/툴팁 단위 제거
          height={260}
        />
      )}

      {!loading && chartData && chartData.length > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-xs">
          <span className="text-gray-600">{(from || fromDef)} ~ {(to || toDef)}</span>
          <span className="font-medium text-gray-900">
            총 {labelOf[metric]}:{' '}
            {chartData.reduce((s, r) => s + (Number(r[metric]) || 0), 0).toLocaleString()}
            {/* ✅ 합계에서도 '원'/'건' 제거 */}
          </span>
        </div>
      )}
    </section>
  )
}
