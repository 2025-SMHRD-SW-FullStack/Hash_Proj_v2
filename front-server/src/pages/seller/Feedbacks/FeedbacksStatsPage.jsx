import React, { useMemo } from 'react'
import ORDERS_MOCK from '/src/data/sellerOrders'

const box = 'rounded-xl border bg-white p-4 shadow-sm'
const toDate = (s) => (s ? new Date(s + (s.length === 10 ? 'T00:00:00' : '')) : null)
const addDays = (d, n) => new Date(d.getTime() + n * 86400000)
const today0 = () => { const t = new Date(); t.setHours(0,0,0,0); return t }

export default function FeedbacksStatsPage() {
  const stats = useMemo(() => {
    const delivered = ORDERS_MOCK.filter(o => !!o.deliveredAt)
    const submitted  = delivered.filter(o => !!o.feedbackAt)
    const reviewed   = submitted.filter(o => !!o.feedbackReviewed)

    const expired = delivered.filter(o => {
      const d = toDate(o.deliveredAt); if (!d || o.feedbackAt) return false
      return today0() > addDays(d, 7)
    })

    // 평균 작성 소요(D)
    const deltas = submitted
      .map(o => (toDate(o.feedbackAt).getTime() - toDate(o.deliveredAt).getTime()) / 86400000)
      .filter(n => Number.isFinite(n))
    const avgDays = deltas.length ? (deltas.reduce((a,b)=>a+b,0) / deltas.length) : 0

    // 상품별 제출 건수 Top 5
    const byProduct = {}
    submitted.forEach(o => { byProduct[o.product] = (byProduct[o.product] || 0) + 1 })
    const topProducts = Object.entries(byProduct)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 5)

    const rate = (num, den) => (den ? Math.round((num/den)*100) : 0)

    return {
      totalDelivered: delivered.length,
      totalSubmitted: submitted.length,
      totalReviewed: reviewed.length,
      totalExpired: expired.length,
      submitRate: rate(submitted.length, delivered.length),
      reviewRate: rate(reviewed.length, submitted.length),
      avgDays: Number(avgDays.toFixed(1)),
      topProducts,
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">피드백 통계</h1>
      </div>

      {/* KPI 카드 */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={box}>
          <div className="text-sm text-gray-500">배송완료 건</div>
          <div className="mt-1 text-2xl font-semibold">{stats.totalDelivered.toLocaleString()}</div>
        </div>
        <div className={box}>
          <div className="text-sm text-gray-500">피드백 작성</div>
          <div className="mt-1 text-2xl font-semibold">{stats.totalSubmitted.toLocaleString()}</div>
          <div className="mt-2 text-sm text-gray-500">작성률 {stats.submitRate}%</div>
        </div>
        <div className={box}>
          <div className="text-sm text-gray-500">검토 완료</div>
          <div className="mt-1 text-2xl font-semibold">{stats.totalReviewed.toLocaleString()}</div>
          <div className="mt-2 text-sm text-gray-500">검토율 {stats.reviewRate}%</div>
        </div>
        <div className={box}>
          <div className="text-sm text-gray-500">기간 만료(미작성)</div>
          <div className="mt-1 text-2xl font-semibold">{stats.totalExpired.toLocaleString()}</div>
          <div className="mt-2 text-sm text-gray-500">평균 작성 소요 {stats.avgDays}일</div>
        </div>
      </section>

      {/* 상품별 작성 Top5 */}
      <section className={`${box} mt-4`}>
        <div className="mb-3 text-base font-semibold">상품별 작성 Top 5</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-[13px] text-gray-500">
              <tr>
                <th className="px-3 py-2 w-12">#</th>
                <th className="px-3 py-2">상품명</th>
                <th className="px-3 py-2">작성 수</th>
              </tr>
            </thead>
            <tbody>
              {stats.topProducts.length === 0 && (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-500">데이터가 없습니다.</td></tr>
              )}
              {stats.topProducts.map(([name, count], idx) => (
                <tr key={name} className="border-b last:border-none">
                  <td className="px-3 py-2">{idx+1}</td>
                  <td className="px-3 py-2">{name}</td>
                  <td className="px-3 py-2">{count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="h-8" />
    </div>
  )
}
