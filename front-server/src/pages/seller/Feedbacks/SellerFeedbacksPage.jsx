import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import Modal from '/src/components/common/Modal'
import Button from '/src/components/common/Button'
import OrderDetailContent from '/src/components/product/OrderDetailContent'

import FeedbackFilterChips from '/src/components/seller/feedbacks/FeedbackFilterChips'
import FeedbackTable from '/src/components/seller/feedbacks/FeedbackTable'
import useFeedbackFilters from '/src/components/seller/feedbacks/useFeedbackFilters'

import { UI, TAB_KEYS } from '/src/constants/sellerfeedbacks'
import FEEDBACKS_MOCK from '/src/data/sellerFeedbacks' // 더미 데이터

export default function SellerFeedbacksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') || TAB_KEYS.ALL
  const setStatus = (v) => setSearchParams(v === TAB_KEYS.ALL ? {} : { status: v })

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [activeRow, setActiveRow] = useState(null)       // 주문상세 모달
  const [reportTarget, setReportTarget] = useState(null) // 신고 확인 모달
  const [reporting, setReporting] = useState(false)

  const { counts, filtered } = useFeedbackFilters(rows, status)

  useEffect(() => {
    setLoading(true)
    try {
      setRows(FEEDBACKS_MOCK) // ✅ 더미 로드
    } catch {
      setError('피드백 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleReport = async () => {
    if (!reportTarget) return
    try {
      setReporting(true)
      // 낙관적 업데이트
      setRows((prev) =>
        prev.map((r) => (r.feedbackId === reportTarget.feedbackId ? { ...r, reportStatus: 'PENDING' } : r))
      )
      setReportTarget(null)
      alert('신고가 접수되었습니다. (취소 불가)')
    } catch {
      alert('신고 접수 중 오류가 발생했습니다.')
    } finally {
      setReporting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4">
      <h1 className="mb-4 text-xl font-semibold">피드백 관리</h1>

      <section className={`${UI.box} mb-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <FeedbackFilterChips counts={counts} value={status} onChange={setStatus} variant="admin"/>
        </div>
      </section>

      <section className={UI.box}>
        <FeedbackTable
          rows={filtered}
          loading={loading}
          error={error}
          onOpenOrder={setActiveRow}
          onRequestReport={setReportTarget}
        />
      </section>

      {/* 주문 상세 모달 */}
      <Modal open={!!activeRow} onClose={() => setActiveRow(null)} title={`주문 상세: ${activeRow?.orderId || ''}`}>
        {activeRow && <OrderDetailContent order={activeRow} />}
      </Modal>

      {/* 신고 확인 모달 */}
      <Modal open={!!reportTarget} onClose={() => setReportTarget(null)} title="피드백 신고">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">신고 후 취소가 불가합니다. 신고하시겠습니까?</p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setReportTarget(null)} className="border">취소</Button>
            <Button onClick={handleReport} disabled={reporting} className="border border-red-300 text-red-600 hover:bg-red-50">
              {reporting ? '신고 중…' : '신고하기'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
