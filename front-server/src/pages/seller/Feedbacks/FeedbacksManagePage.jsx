import React, { useMemo, useState } from 'react'
import ORDERS_MOCK from '/src/data/sellerOrders'
import Modal from '/src/components/common/Modal'
import OrderDetailContent from '/src/components/seller/OrderDetailContent'

const box = 'rounded-xl border bg-white p-4 shadow-sm'
const chip = (active) =>
  `rounded-full border px-3 py-1 text-sm ${active ? 'bg-black text-white border-black' : 'hover:bg-gray-50'}`
const badge = (cls) => `rounded-md px-2 py-1 text-[12px] ring-1 ${cls}`

const toDate = (s) => (s ? new Date(s) : null)                // feedbackAt은 ISO도 섞여있을 수 있으니 그대로 파싱
const toDateYMD = (s) => (s ? new Date(s + 'T00:00:00') : null)
const addDays = (d, n) => new Date(d.getTime() + n * 86400000)
const today0 = () => { const t = new Date(); t.setHours(0,0,0,0); return t }

function deriveRows(orderRows) {
  // 배송완료된 주문만 피드백 관리 대상
  return orderRows
    .filter(o => !!o.deliveredAt)
    .map(o => {
      const delivered = toDateYMD(o.deliveredAt)
      const deadline = delivered ? addDays(delivered, 7) : null
      const submitted = !!o.feedbackAt
      const reviewed = !!o.feedbackReviewed
      const d = deadline ? Math.ceil((deadline.getTime() - today0().getTime()) / 86400000) : null

      let status = { key: 'unknown', label: '-', cls: 'bg-gray-50 text-gray-700 ring-gray-200' }
      if (submitted) {
        status = reviewed
          ? { key: 'reviewed', label: '검토 완료', cls: 'bg-green-50 text-green-700 ring-green-200' }
          : { key: 'waiting',  label: '검토 대기', cls: 'bg-blue-50 text-blue-700 ring-blue-200' }
      } else if (deadline) {
        status = d < 0
          ? { key: 'expired', label: '기간 만료', cls: 'bg-rose-50 text-rose-700 ring-rose-200' }
          : { key: 'writing', label: `작성 대기 (D-${d})`, cls: 'bg-amber-50 text-amber-700 ring-amber-200' }
      }

      return { ...o, _deadline: deadline, _days: d, _status: status }
    })
}

export default function FeedbacksManagePage() {
  const [rows, setRows] = useState(() => deriveRows(ORDERS_MOCK))
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all') // all | writing | expired | waiting | reviewed | new
  const [detail, setDetail] = useState(null)

  // 신규 피드백 = 오늘 0시 이후 작성
  const counts = useMemo(() => {
    const c = { all: rows.length, writing: 0, expired: 0, waiting: 0, reviewed: 0, new: 0 }
    rows.forEach(r => {
      c[r._status.key] = (c[r._status.key] || 0) + 1
      if (r.feedbackAt && new Date(r.feedbackAt) >= today0()) c.new++
    })
    return c
  }, [rows])

  const filtered = rows.filter(r => {
    const passFilter = (filter === 'all') ? true
      : filter === 'new' ? (r.feedbackAt && new Date(r.feedbackAt) >= today0())
      : r._status.key === filter

    const passQ =
      q.trim() === '' ||
      r.id.toLowerCase().includes(q.toLowerCase()) ||
      r.product.toLowerCase().includes(q.toLowerCase()) ||
      r.buyer.includes(q) ||
      (r.phone || '').includes(q)

    return passFilter && passQ
  })

  const markReviewed = (id) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, feedbackReviewed: true,
      _status: { key: 'reviewed', label: '검토 완료', cls: 'bg-green-50 text-green-700 ring-green-200' }
    } : r))
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">피드백 관리</h1>
      </div>

      {/* 상단 집계/필터 */}
      <section className={`${box} mb-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <button className={chip(filter === 'all')}      onClick={() => setFilter('all')}>전체 {counts.all.toLocaleString()}</button>
          <button className={chip(filter === 'writing')}  onClick={() => setFilter('writing')}>작성 대기 {counts.writing.toLocaleString()}</button>
          <button className={chip(filter === 'expired')}  onClick={() => setFilter('expired')}>기간 만료 {counts.expired.toLocaleString()}</button>
          <button className={chip(filter === 'waiting')}  onClick={() => setFilter('waiting')}>검토 대기 {counts.waiting.toLocaleString()}</button>
          <button className={chip(filter === 'reviewed')} onClick={() => setFilter('reviewed')}>검토 완료 {counts.reviewed.toLocaleString()}</button>
          <button className={chip(filter === 'new')}      onClick={() => setFilter('new')}>신규 피드백 {counts.new.toLocaleString()}</button>

          <div className="ml-auto flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="주문번호 / 상품 / 구매자 / 연락처"
              className="w-72 rounded-lg border px-3 py-2 text-sm outline-none focus:ring"
            />
            <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => setQ('')}>초기화</button>
          </div>
        </div>
      </section>

      {/* 목록 */}
      <section className={box}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-[1] border-b bg-gray-50 text-[13px] text-gray-500">
              <tr>
                <th className="px-3 py-2">주문번호</th>
                <th className="px-3 py-2">상품</th>
                <th className="px-3 py-2">구매자</th>
                <th className="px-3 py-2">배송완료일</th>
                <th className="px-3 py-2">피드백 작성</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">액션</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:h-12">
              {filtered.map(r => (
                <tr key={r.id} className="border-b last:border-none">
                  <td className="px-3 py-2 font-mono text-[13px] text-blue-600 hover:underline cursor-pointer"
                      onClick={() => setDetail(r)}
                  >
                    {r.id}
                  </td>
                  <td className="px-3 py-2">{r.product}</td>
                  <td className="px-3 py-2">{r.buyer}</td>
                  <td className="px-3 py-2 text-gray-600">{r.deliveredAt || '-'}</td>
                  <td className="px-3 py-2 text-gray-600">{r.feedbackAt || '-'}</td>
                  <td className="px-3 py-2"><span className={badge(r._status.cls)}>{r._status.label}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => setDetail(r)}>상세</button>
                      {r.feedbackAt && !r.feedbackReviewed && (
                        <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                                onClick={() => markReviewed(r.id)}>
                          검토 완료
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="px-3 py-10 text-center text-gray-500" colSpan={7}>
                    검색 조건에 맞는 항목이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 상세 모달 */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`주문 상세 - ${detail?.id ?? ''}`} maxWidth="max-w-3xl">
        {detail && <OrderDetailContent row={detail} />}
      </Modal>

      <div className="h-8" />
    </div>
  )
}
