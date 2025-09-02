// /src/pages/seller/PayoutsPage.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '/src/components/common/Button'
import { fetchDailySettlementSummary, fetchDailySettlementList } from '/src/service/settlementService'
import { fmtYmd as _fmtYmd } from '/src/util/orderUtils'

// ---- UI 토큰(기존 톤 유지)
const box  = 'rounded-xl border bg-white p-4 shadow-sm'
const wrap = 'mx-auto w-full max-w-[1120px] px-6'

// colgroup 안전 렌더(공백 텍스트 노드 방지)
const ColGroup = React.memo(({ widths = [] }) => (
  <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
))

// ---- 유틸
const pad2 = (n) => String(n).padStart(2, '0')
const addDays = (ymd, delta) => {
  const [y, m, d] = (ymd || '').split('-').map(Number)
  const dt = new Date(y || 2000, (m || 1) - 1, d || 1)
  dt.setDate(dt.getDate() + delta)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}
const todayYmd = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
const fmtYmd = (d) => { try { return _fmtYmd?.(d) || todayYmd() } catch { return todayYmd() } }
const fmtWon = (v) => (Number(v || 0)).toLocaleString()
const fmtDateTime = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export default function PayoutsPage() {
  const [sp, setSp] = useSearchParams()
  const initDate = sp.get('date') || fmtYmd(new Date())

  const [date, setDate] = useState(initDate)
  const [summary, setSummary] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 라우터 파라미터 동기화
  useEffect(() => {
    const current = sp.get('date')
    if (current !== date) {
      const next = new URLSearchParams(sp)
      next.set('date', date)
      setSp(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  // 데이터 로드
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [s, list] = await Promise.all([
          fetchDailySettlementSummary(date),
          fetchDailySettlementList(date),
        ])
        if (!alive) return
        setSummary(s)
        setRows(list)
      } catch (e) {
        if (!alive) return
        console.error('[Payouts load error]', e)
        setError(e?.response?.data?.message || e.message || '불러오기에 실패했습니다.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [date])

  const cards = useMemo(() => ([
    { key: 'ordersCount',   label: '확정 주문수',        value: summary?.ordersCount ?? 0 },
    { key: 'itemTotal',     label: '상품금액 합계',      value: `₩ ${fmtWon(summary?.itemTotal)}` },
    { key: 'platformFee',   label: '플랫폼 수수료(3%)',  value: `₩ ${fmtWon(summary?.platformFee)}` },
    { key: 'feedbackTotal', label: '피드백 원고료 합계', value: `₩ ${fmtWon(summary?.feedbackTotal)}` },
    { key: 'payoutTotal',   label: '정산 예정 합계',     value: `₩ ${fmtWon(summary?.payoutTotal)}` },
  ]), [summary])

  const widths = ['160px','200px','160px','160px','160px','160px','120px']

  return (
    <div className="py-6">
      <div className={wrap}>
        {/* 헤더 */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-xl font-semibold">정산 관리</h1>
          <div className="flex items-center gap-2">
            {/* 이전 날짜 */}
            <Button
              variant="admin"
              aria-label="이전 날짜"
              onClick={() => setDate(addDays(date, -1))}
              className="w-10"
            >
              &lt;
            </Button>

            {/* 날짜 입력 */}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-basic h-10 rounded-lg border px-3"
            />

            {/* 다음 날짜 */}
            <Button
              variant="admin"
              aria-label="다음 날짜"
              onClick={() => setDate(addDays(date, 1))}
              className="w-10"
            >
              &gt;
            </Button>

            {/* 오늘로 이동 */}
            <Button variant="admin" onClick={() => setDate(todayYmd())}>
              오늘
            </Button>
          </div>
        </div>

        {/* 요약 카드 */}
        <div className={box}>
          {loading && !summary ? (
            <div className="py-8 text-center text-sm text-gray-500">불러오는 중…</div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600">{error}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {cards.map((c) => (
                <div key={c.key} className="rounded-xl border p-4">
                  <div className="text-xs text-gray-500">{c.label}</div>
                  <div className="mt-1 text-lg font-semibold">{c.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 상세 리스트 */}
        <div className={`${box} mt-4`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">일별 정산 상세</h2>
            <div className="text-xs text-gray-500">기준: 구매확정(00:00~24:00) 건</div>
          </div>

          {/* 데스크톱: 테이블 */}
          <div className="hidden md:block">
            <div className="overflow-auto">
              <table className="w-full table-fixed border-collapse text-sm">
                <ColGroup widths={widths} />
                <thead className="sticky top-0 bg-gray-50 text-center">
                  <tr className="h-11 border-b text-gray-600">
                    <th className="px-3">주문번호</th>
                    <th className="px-3">구매확정일시</th>
                    <th className="px-3">상품금액 합계</th>
                    <th className="px-3">플랫폼 수수료</th>
                    <th className="px-3">피드백 원고료</th>
                    <th className="px-3">정산 금액</th>
                    <th className="px-3">피드백</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !rows.length && (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-500">불러오는 중…</td></tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-500">해당 날짜의 정산 건이 없습니다.</td></tr>
                  )}
                  {rows.map((r) => (
                    <tr key={`${r.orderId}-${r.confirmedAt}`} className="h-12 border-b last:border-0">
                      <td className="px-3 align-middle">{r.orderNo || r.orderId}</td>
                      <td className="px-3 align-middle">{fmtDateTime(r.confirmedAt)}</td>
                      <td className="px-3 align-middle">₩ {fmtWon(r.itemTotal)}</td>
                      <td className="px-3 align-middle">₩ {fmtWon(r.platformFee)}</td>
                      <td className="px-3 align-middle">₩ {fmtWon(r.feedbackTotal)}</td>
                      <td className="px-3 align-middle font-semibold">₩ {fmtWon(r.payout)}</td>
                      <td className="px-3 align-middle">
                        {r.feedbackDone ? (
                          <span className="inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">완료</span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">미작성</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 모바일: 카드 리스트 */}
          <div className="md:hidden">
            {loading && !rows.length && (
              <div className="py-6 text-center text-gray-500">불러오는 중…</div>
            )}
            {!loading && rows.length === 0 && (
              <div className="py-6 text-center text-gray-500">해당 날짜의 정산 건이 없습니다.</div>
            )}
            <ul className="space-y-3">
              {rows.map((r) => (
                <li key={`${r.orderId}-${r.confirmedAt}`} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{r.orderNo || r.orderId}</div>
                    {r.feedbackDone ? (
                      <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">완료</span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">미작성</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">{fmtDateTime(r.confirmedAt)}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-gray-50 p-2">
                      <div className="text-xs text-gray-500">상품 합계</div>
                      <div className="font-medium">₩ {fmtWon(r.itemTotal)}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <div className="text-xs text-gray-500">수수료</div>
                      <div className="font-medium">₩ {fmtWon(r.platformFee)}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <div className="text-xs text-gray-500">원고료</div>
                      <div className="font-medium">₩ {fmtWon(r.feedbackTotal)}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <div className="text-xs text-gray-500">정산 예정</div>
                      <div className="font-semibold">₩ {fmtWon(r.payout)}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  )
}
