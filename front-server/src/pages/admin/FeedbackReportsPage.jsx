import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '/src/components/common/Button'
import Modal from '/src/components/common/Modal'
import { fetchFeedbackReports, approveReport, rejectReport } from '/src/service/adminFeedbackService'

const box = 'rounded-xl border bg-white p-4 shadow-sm'
const pill = 'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[12px] font-medium'

const STATUSES = [
  { key: 'ALL', label: '전체' },
  { key: 'PENDING', label: '신고대기' },
  { key: 'APPROVED', label: '신고완료' },
  { key: 'REJECTED', label: '신고거절' },
]

// 주문번호 포맷 (로컬)
const toOrderNo16Local = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.slice(0, 16) || '-'
}

export default function FeedbackReportsPage() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'PENDING'
  const q = params.get('q') || ''
  const page = Number(params.get('page') || 0)
  const size = Number(params.get('size') || 20)

  const [rows, setRows] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const [selected, setSelected] = useState(null) // 행 상세 모달
  const [note, setNote] = useState('') // 처리 메모/사유

  const updateParam = (kv) => {
    const next = new URLSearchParams(params)
    Object.entries(kv).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') next.delete(k)
      else next.set(k, String(v))
    })
    setParams(next, { replace: true })
  }

  const load = async () => {
    setLoading(true)
    setErr('')
    try {
      const { content, totalElements: total } = await fetchFeedbackReports({ status, q, page, size })
      setRows(content)
      setTotalElements(total)
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [status, q, page, size])

  const totalPages = Math.max(1, Math.ceil(totalElements / size))

  const onApprove = async (id) => {
    try {
      await approveReport(id, { note })
      setSelected(null)
      setNote('')
      await load()
    } catch (e) {
      alert(e?.response?.data?.message || e.message || '승인 실패')
    }
  }

  const onReject = async (id) => {
    try {
      await rejectReport(id, { reason: note })
      setSelected(null)
      setNote('')
      await load()
    } catch (e) {
      alert(e?.response?.data?.message || e.message || '거절 실패')
    }
  }

  return (
    <div className="space-y-4">
      {/* 헤더/필터 */}
      <section className={`${box}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-base font-semibold">피드백 신고관리</h1>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map(s => (
              <button
                key={s.key}
                onClick={() => updateParam({ status: s.key, page: 0 })}
                className={`${pill} ${status === s.key ? 'bg-[#9DD5E9] text-white' : 'bg-white border text-gray-700'}`}
              >{s.label}</button>
            ))}
          </div>
        </div>

        {/* 검색 */}
        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            placeholder="주문번호/상품/구매자 검색"
            defaultValue={q}
            onKeyDown={(e) => { if (e.key === 'Enter') updateParam({ q: e.currentTarget.value, page: 0 }) }}
            className="w-full rounded-md border px-3 py-2 text-sm md:w-[320px]"
          />
          <div className="text-[12px] text-gray-500">총 {totalElements.toLocaleString()}건</div>
        </div>
      </section>

      {/* 테이블 */}
      <section className={`${box}`}>
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full table-fixed">
            <colgroup>
              <col className="w-[140px]" />
              <col className="w-[220px]" />
              <col className="w-[160px]" />
              <col />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
            </colgroup>
            <thead>
              <tr className="border-b bg-gray-50 text-left text-sm">
                <th className="px-3 py-2">주문번호</th>
                <th className="px-3 py-2">상품</th>
                <th className="px-3 py-2">구매자</th>
                <th className="px-3 py-2">신고사유/내용</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">불러오는 중…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-500">신고 내역이 없습니다.</td></tr>
              )}
              {!loading && rows.map((r) => (
                <tr key={r.id || r.reportId} className="border-t">
                  <td className="px-3 py-2">{toOrderNo16Local(r.orderId ?? r.orderUid ?? r.id)}</td>
                  <td className="truncate px-3 py-2" title={r.productName}>{r.productName || '-'}</td>
                  <td className="px-3 py-2">{r.buyerName || r.buyer || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="line-clamp-2">{r.reason || r.reportReason || r.feedbackContent || '-'}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`${pill} ${
                      r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
                      r.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' :
                      'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    }`}>{r.status || 'PENDING'}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" onClick={() => { setSelected(r); setNote('') }}>검토</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-gray-500">페이지 {page + 1} / {totalPages}</div>
          <div className="flex gap-2">
            <button className="rounded-md border px-2 py-1 disabled:opacity-50" disabled={page <= 0} onClick={() => updateParam({ page: page - 1 })}>이전</button>
            <button className="rounded-md border px-2 py-1 disabled:opacity-50" disabled={page + 1 >= totalPages} onClick={() => updateParam({ page: page + 1 })}>다음</button>
            <select className="rounded-md border px-2 py-1 text-sm" value={size} onChange={(e) => updateParam({ size: Number(e.target.value), page: 0 })}>
              {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n}/페이지</option>)}
            </select>
          </div>
        </div>

        {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
      </section>

      {/* 상세 모달 */}
      {selected && (
        <Modal isOpen={true} title="신고 상세" onClose={() => setSelected(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-500">주문번호</div>
              <div>{toOrderNo16Local(selected.orderId ?? selected.orderUid ?? selected.id)}</div>
              <div className="text-gray-500">상품</div>
              <div className="truncate" title={selected.productName}>{selected.productName || '-'}</div>
              <div className="text-gray-500">구매자</div>
              <div>{selected.buyerName || selected.buyer || '-'}</div>
              <div className="text-gray-500">신고상태</div>
              <div>{selected.status || 'PENDING'}</div>
            </div>
            <div>
              <div className="mb-1 text-sm font-medium">신고사유/내용</div>
              <div className="rounded-md border bg-gray-50 p-3 text-sm whitespace-pre-wrap min-h-[80px]">{selected.reason || selected.reportReason || selected.feedbackContent || '-'}</div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">처리 메모/사유</label>
              <textarea className="w-full rounded-md border px-3 py-2 text-sm" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="승인/거절 사유를 입력하세요" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="rounded-md border px-3 py-2 text-sm" onClick={() => setSelected(null)}>닫기</button>
              <button className="rounded-md border px-3 py-2 text-sm" onClick={() => onReject(selected.id || selected.reportId)}>거절</button>
              <Button onClick={() => onApprove(selected.id || selected.reportId)}>승인</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}