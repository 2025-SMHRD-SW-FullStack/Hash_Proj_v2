// /src/pages/seller/SellerMain.jsx
import React, { useMemo, useState, useEffect, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import StoreSalesStats from '/src/components/seller/charts/StoreSalesStats'
import ChatList from '../../components/chat/ChatList'
const ChatRoom = React.lazy(() => import('../../components/chat/ChatRoom'))
import useAppModeStore from '../../stores/appModeStore'

const box = 'rounded-xl border bg-white p-4 shadow-sm'
const kpi = 'flex items-center justify-between py-2 text-sm'

const SellerMain = () => {
  const navigate = useNavigate()
  const { setMode } = useAppModeStore()

  // ✅ 이 페이지는 항상 셀러 모드
  useEffect(() => { setMode('seller') }, [setMode])

  // ─ 채팅 패널 상태 ─
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const openRoom = (roomId) => {
    const rid = Number(roomId)
    if (Number.isFinite(rid) && rid > 0) setSelectedRoomId(rid)
  }
  const closeRoom = () => setSelectedRoomId(null)

  // ✅ ESC 눌러 닫기
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeRoom() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // --- (목업 데이터) ---
  const orders = [
    { id: 'O-001', status: '발송대기', price: 39000, exchangeRequested: false, returnRequested: false, cancelRequested: false, deliveredAt: null, purchaseConfirmed: false, feedbackSubmitted: false, feedbackReviewed: false },
    { id: 'O-002', status: '배송중',   price: 59000, exchangeRequested: false, returnRequested: false, cancelRequested: false, deliveredAt: null, purchaseConfirmed: false, feedbackSubmitted: false, feedbackReviewed: false },
    { id: 'O-003', status: '배송완료', price: 42000, exchangeRequested: true,  returnRequested: false, cancelRequested: false, deliveredAt: '2025-08-22', purchaseConfirmed: false, feedbackSubmitted: true,  feedbackReviewed: false },
    { id: 'O-004', status: '배송완료', price: 29000, exchangeRequested: false, returnRequested: true,  cancelRequested: false, deliveredAt: '2025-08-21', purchaseConfirmed: true,  feedbackSubmitted: true,  feedbackReviewed: true  },
  ]

  const counts = useMemo(() => {
    const by = (fn) => orders.filter(fn).length
    return {
      newOrders: by(o => o.status === '발송대기'),
      shipReady: by(o => o.status === '발송대기'),
      shipping:  by(o => o.status === '배송중'),
      shipped:   by(o => o.status === '배송완료'),
      exchange:  by(o => o.exchangeRequested),
      returns:   by(o => o.returnRequested),
      cancels:   by(o => o.cancelRequested),
      newFeedbacks: by(o => o.feedbackSubmitted && !o.feedbackReviewed),
      purchaseConfirmed: by(o => o.purchaseConfirmed),
    }
  }, [orders])

  const settlement = useMemo(() => {
    const feeRate = 0.03
    const writerFee = 2000
    const delivered = orders.filter(o => o.status === '배송완료')
    const sales = delivered.reduce((s, o) => s + o.price, 0)
    const fee = Math.round(sales * feeRate)
    const holdWriterFees = delivered.length * writerFee
    const net = sales - fee - holdWriterFees
    return { sales, fee, feeRate, writerFee, deliveredCount: delivered.length, net }
  }, [orders])

  const fmt = n => typeof n === 'number' ? n.toLocaleString() : n

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 상단 요약 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 주문 */}
        <section className={box}>
          <h2 className="mb-2 text-base font-semibold">주문</h2>
          <button className={`${kpi} w-full text-left hover:bg-gray-50`} onClick={() => navigate('/seller/orders')}>
            <span>신규주문</span><strong>{fmt(counts.newOrders)}건</strong>
          </button>
          <button className={`${kpi} w-full text-left hover:bg-gray-50`} onClick={() => navigate('/seller/orders?tab=exchange')}>
            <span>교환요청</span><strong>{fmt(counts.exchange)}건</strong>
          </button>
          <button className={`${kpi} w-full text-left hover:bg-gray-50`} onClick={() => navigate('/seller/feedbacks')}>
            <span>신규 피드백</span><strong>{fmt(counts.newFeedbacks)}건</strong>
          </button>
        </section>

        {/* 배송 */}
        <section className={box}>
          <h2 className="mb-2 text-base font-semibold">배송</h2>
          <button className={`${kpi} w-full text-left hover:bg-gray-50`} onClick={() => navigate('/seller/orders?tab=ready')}>
            <span>배송준비</span><strong>{fmt(counts.shipReady)}건</strong>
          </button>
          <button className={`${kpi} w-full text-left hover:bg-gray-50`} onClick={() => navigate('/seller/orders?tab=shipping')}>
            <span>배송중</span><strong>{fmt(counts.shipping)}건</strong>
          </button>
          <button className={`${kpi} w-full text-left hover:bg-gray-50`} onClick={() => navigate('/seller/orders?tab=delivered')}>
            <span>배송완료</span><strong>{fmt(counts.shipped)}건</strong>
          </button>
        </section>

        {/* 정산 */}
        <section className={box}>
          <h2 className="mb-2 text-base font-semibold">정산</h2>
          <div className={kpi}><span>정산예정</span><strong className="text-lg">{fmt(settlement.net)}원</strong></div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500"></div>
          <button
            className="mt-3 w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => navigate('/seller/payouts')}
          >
            정산 내역 보기
          </button>
        </section>
      </div>

      {/* 중간: 좌(그래프) — 우(상품문의/톡톡) */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* 그래프 영역 */}
        <section className={`${box} md:col-span-2`}>
          <h2 className="mb-2 text-base font-semibold">스토어 매출 통계</h2>
          <div className="mb-2 flex flex-wrap gap-2">
            <button className="rounded-md border px-3 py-1 text-sm">결제금액</button>
            <button className="rounded-md border px-3 py-1 text-sm">결제건수</button>
            <button className="rounded-md border px-3 py-1 text-sm">결제자수</button>
          </div>
          <div className="h-[220px] rounded-md border border-dashed text-center text-sm text-gray-500 leading-[220px]">
            그래프 영역
          </div>
        </section>

        {/* 상품문의/채팅(셀러) */}
        <section className={box}>
          <h2 className="mb-2 text-base font-semibold">상품문의 (셀러 채팅)</h2>
          <div className="rounded-lg border p-3">
            <ChatList onOpenRoom={openRoom} />
          </div>
          <button
            className="mt-3 w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => navigate('/seller/chat')}
          >
            채팅 전체 페이지로 이동
          </button>
        </section>
      </div>

      {/* ✅ 오버레이 (배경 클릭으로 닫힘) */}
      {selectedRoomId && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px]"
          onClick={closeRoom}
        />
      )}

      {/* ✅ 슬라이드 채팅 패널 + 닫기 버튼 */}
      <div
        className={`fixed top-0 right-0 z-40 h-full w-full max-w-md transform bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          selectedRoomId ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!selectedRoomId}
      >
        {/* Close(X) */}
        <button
          aria-label="채팅 닫기"
          onClick={closeRoom}
          className="absolute right-3 top-3 rounded-full border px-2 py-1 text-sm hover:bg-gray-100"
        >
          ×
        </button>

        {selectedRoomId && (
          <Suspense fallback={<div className="p-4">채팅방 불러오는 중…</div>}>
            <ChatRoom roomId={selectedRoomId} onClose={closeRoom} />
          </Suspense>
        )}
      </div>

      <div className="h-8" />
    </div>
  )
}

export default SellerMain
