import React, { useEffect, useMemo, useState, memo } from 'react'
import { useSearchParams } from 'react-router-dom'
import StatusChips from '/src/components/seller/StatusChips'
import Button from '/src/components/common/Button'
import Modal from '/src/components/common/Modal'
import OrderDetailContent from '/src/components/seller/OrderDetailContent'

import { FEEDBACK_FILTERS } from '/src/constants/sellerfeedbacks'
import FeedbackRow from '/src/components/seller/feedbacks/FeedbackRow'
import ReportModal from '/src/components/seller/feedbacks/ReportModal'
import { fetchSellerFeedbacks } from '/src/service/feedbackService'
import { computeFeedbackState } from '/src/util/feedbacksStatus'

// ---- UI 토큰
const box   = 'rounded-xl border bg-white p-4 shadow-sm'
const ROW_H = 48
const HEADER_H = 44
const MAX_ROWS = 10
const tableMaxH = `${ROW_H * MAX_ROWS + HEADER_H}px`

// colgroup 안전 렌더
const ColGroup = memo(function ColGroup({ widths = [] }) {
  const list = Array.isArray(widths) ? widths : []
  return (
    <colgroup>
      {list.map((w, i) => (
        <col key={i} style={{ width: typeof w === 'number' ? `${w}px` : w }} />
      ))}
    </colgroup>
  )
})

// 주문번호/상품명/구매자/작성일/상태/내용/관리
const COL_WIDTHS = [140, 220, 120, 130, 140, 300, 120]

export default function SellerFeedbacksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = searchParams.get('filter') || 'ALL'
  const q      = searchParams.get('q') || ''

  // --- 검색 입력: IME 대응 + 디바운스 ---
  const [qInput, setQInput] = useState(q)
  const [isComp, setIsComp] = useState(false)
  useEffect(() => setQInput(q), [q])

  const setParam = (patch) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') next.delete(k)
      else next.set(k, String(v))
    })
    setSearchParams(next)
  }

  useEffect(() => {
    if (isComp) return
    const id = setTimeout(() => {
      if (qInput !== q) setParam({ q: qInput })
    }, 400)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput, isComp])

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 상세 모달
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState(null)

  // 신고 모달
  const [reportOpen, setReportOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState(null)

  const handleReset = () => setParam({ filter: 'ALL', q: '' })

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const data = await fetchSellerFeedbacks({ page: 0, size: 200 })
      const list = (data?.content ?? data ?? []).map(d => ({
        id: d.id,
        orderId: d.orderUid,                 // 표: 주문번호
        product: d.productName,              // 표: 상품명
        buyer: d.buyer,                      // 표: 구매자
        feedbackContent: d.feedbackContent,  // 표: 피드백 내용
        feedbackCreatedAt: d.feedbackCreatedAt, // 표: 피드백 작성일
        deliveredAt: d.deliveredAt,          // 상태 계산용
        deadlineAt: d.deadlineAt,            // 상태 계산용
        reportStatus: d.reportStatus ?? null // 상태 계산/신고 버튼 제어
      }))
      setRows(list)
    }catch(e) {
      setError(e?.message || String(e))
    }
  }

  useEffect(() => { load() }, [filter, q])

  const filtered = useMemo(() => {
    if (!rows?.length) return []
    if (filter === 'ALL') return rows
    return rows.filter(r => computeFeedbackState(r).key === filter)
  }, [rows, filter])

  const onOpenOrder = (row) => {
    setSelectedRow(row)
    setDetailOpen(true)
  }

  // Row → Page 신고 요청 핸들러
  const onRequestReport = (row) => {
    const feedbackId = row.feedbackId ?? row.id ?? row.orderItemId ?? row.orderId
    setReportTarget({ ...row, feedbackId })
    setReportOpen(true)
  }

  // 신고 완료 후 목록 상태 반영 & 모달 닫기
  const handleReported = () => {
    const targetKey = reportTarget?.feedbackId ?? reportTarget?.id
    if (targetKey) {
      setRows(prev =>
        prev.map(r => {
          const key = r.feedbackId ?? r.id ?? r.orderItemId ?? r.orderId
          return key === targetKey ? { ...r, reportStatus: 'PENDING' } : r
        })
      )
    }
    setReportOpen(false)
    setReportTarget(null)
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">피드백 관리</h1>
      </div>

      {/* 필터/검색 바 */}
      <section className={`${box} mb-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChips
            items={FEEDBACK_FILTERS}
            value={filter}
            onChange={(key) => setParam({ filter: key })}
            size="sm"
            variant="admin"
          />
          {/* 검색 입력 – IME 조합 처리 + Enter 즉시 확정 */}
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onCompositionStart={() => setIsComp(true)}
            onCompositionEnd={() => setIsComp(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                setParam({ q: qInput })
              }
            }}
            placeholder="주문번호/수취인/연락처 검색"
            className="w-64 rounded-lg border px-3 py-2 text-sm outline-none focus:ring"
          />
          <Button size="sm" onClick={handleReset} variant="admin">
            초기화
          </Button>
        </div>
      </section>

      {/* 목록 테이블 */}
      <section className={box}>
        <div className="overflow-x-auto" style={{ maxHeight: tableMaxH }}>
          <table className="w-full table-fixed text-sm text-center">
            <ColGroup widths={[140, 220, 120, 130, 140, 300, 120]} />
            <thead className="sticky top-0 z-10 border-b bg-gray-50 text-left text-[13px] text-gray-500">
              <tr className="h-11 text-center">
                <th className="px-3 font-medium">주문번호</th>
                <th className="px-3 font-medium">상품명</th>
                <th className="px-3 font-medium">구매자</th>
                <th className="px-3 font-medium">피드백 작성일</th>
                <th className="px-3 font-medium">상태</th>
                <th className="px-3 font-medium">피드백 내용</th>
                <th className="px-3 text-right font-medium">신고</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-500">불러오는 중…</td></tr>
              )}
              {error && !loading && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-rose-600">{String(error)}</td></tr>
              )}
              {!loading && !error && filtered.map((row, idx) => (
                <FeedbackRow
                  key={row.id ?? row.feedbackId ?? row.orderItemId ?? idx}
                  row={row}
                  onOpenOrder={onOpenOrder}
                  onRequestReport={onRequestReport}
                />
              ))}
              {!loading && !error && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-500">데이터가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 상세 모달 */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="주문 상세">
        <div className="p-4">
          <OrderDetailContent row={selectedRow} />
        </div>
      </Modal>

      {/* 신고 모달 */}
      <ReportModal
        open={reportOpen}
        onClose={() => { setReportOpen(false); setReportTarget(null) }}
        feedbackId={reportTarget?.feedbackId}
        onReported={handleReported}
      />
    </div>
  )
}
