import React from 'react'

const card = 'rounded-xl border bg-white p-4 shadow-sm'

export default function AdminMain() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className={`${card} md:col-span-3`}>
        <h2 className="mb-1 text-base font-semibold">빠른 링크</h2>
        <div className="flex flex-wrap gap-2">
          <a href="/admin/feedbacks/reports" className="rounded-md border px-3 py-1 text-sm">피드백 신고관리</a>
          {/* <a href="/admin/ads/review" className="rounded-md border px-3 py-1 text-sm">광고 심사</a> */}
        </div>
      </section>

      <section className={card}>
        <h3 className="mb-1 text-sm font-semibold">오늘 접수된 신고</h3>
        <p className="text-2xl font-bold">—</p>
      </section>
      <section className={card}>
        <h3 className="mb-1 text-sm font-semibold">미처리 신고</h3>
        <p className="text-2xl font-bold">—</p>
      </section>
      <section className={card}>
        <h3 className="mb-1 text-sm font-semibold">최근 7일 처리율</h3>
        <p className="text-2xl font-bold">—%</p>
      </section>
    </div>
  )
}