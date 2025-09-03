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
        console.warn('매출 통계 로드 실패:', e)
        setRows([]) // 에러 시 빈 배열로 설정
        setErr(e)
      } finally {
        setLoading(false)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, fromDef, toDef])

  // 데이터가 없을 때 기본 차트 데이터 생성
  const chartData = useMemo(() => {
    if (rows.length > 0) return rows
    
    // 데이터가 없을 때 기본 14일 차트 생성
    const defaultData = []
    const end = new Date()
    const start = new Date(end.getTime() - 13 * 86400000)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ymd = d.toISOString().split('T')[0]
      defaultData.push({
        date: ymd,
        itemTotal: 0,
        ordersCount: 0,
        payoutTotal: 0
      })
    }
    
    return defaultData
  }, [rows])

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
        <div className="flex h-[260px] items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-500">
          <div className="text-center">
            <div>통계 데이터를 불러오지 못했습니다.</div>
            <div className="mt-1 text-xs">기본 차트를 표시합니다.</div>
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed text-sm text-gray-400">
          데이터가 없습니다.
        </div>
      ) : (
        <LineBase
          data={chartData}
          xKey="date"
          yKey={metric}
          xFormatter={toMMDD}
          yFormatter={(v) => {
            if (metric === 'ordersCount') return v.toLocaleString()
            return `${v.toLocaleString()}원`
          }}
          height={260}
        />
      )}

      {/* 하단 요약 */}
      {!loading && chartData.length > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-xs">
          <span className="text-gray-600">
            {from || fromDef} ~ {to || toDef}
          </span>
          <span className="font-medium text-gray-900">
            총 {labelOf[metric]}: {
              metric === 'ordersCount' 
                ? chartData.reduce((sum, r) => sum + (r[metric] || 0), 0).toLocaleString()
                : `${chartData.reduce((sum, r) => sum + (r[metric] || 0), 0).toLocaleString()}원`
            }
          </span>
        </div>
      )}
    </section>
  )
}
