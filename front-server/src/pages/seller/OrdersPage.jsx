import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ORDERS_MOCK from '../../data/sellerOrders'
import StatusChips from '../../components/seller/StatusChips'
import Button from '../../components/common/Button'
import { carrierOptions, carrierLabel } from '/src/constants/carriers'
import OrderDetailContent from '../../components/seller/OrderDetailContent'
import Modal from '../../components/common/Modal'

// 주문관리 페이지

// ---- UI 토큰
const box   = 'rounded-xl border bg-white p-4 shadow-sm'
const pill  = 'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[12px] font-medium'

const BUYER_COL_W     = 'w-[120px] min-w-[120px]'  // 받는이 5자 기준 폭
const STATUS_COL_W    = 'w-[120px] min-w-[120px]'  // 상태
const DEADLINE_COL_W  = 'w-[110px] min-w-[110px]'  // 피드백 마감
const ADDRESS_COL_W   = 'min-w-[360px] max-w-[520px]'   // 주소
const REQNOTE_COL_W   = 'min-w-[220px] max-w-[320px]'   // 배송요청사항

// 열 너비(px)
const COLW = {
  CHECK: 40,
  ORDER_ID: 170,
  ORDERED_AT: 110,
  STATUS: 120,
  CARRIER: 130,
  TRACKING: 200,
  DEADLINE: 110,
  PRODUCT: 300,
  BUYER: 120,
  ADDRESS: 520,
  PHONE: 140,
  REQNOTE: 280,
}
const TABLE_W =
  COLW.CHECK+COLW.ORDER_ID+COLW.ORDERED_AT+COLW.STATUS+COLW.CARRIER+COLW.TRACKING+
  COLW.DEADLINE+COLW.PRODUCT+COLW.BUYER+COLW.ADDRESS+COLW.PHONE+COLW.REQNOTE

// ---- 유틸
const toDate   = (s) => (s ? new Date(s + 'T00:00:00') : null)
const addDays  = (d, n) => new Date(d.getTime() + n * 86400000)
const today0   = () => { const t = new Date(); t.setHours(0,0,0,0); return t }
const truncate = (s, n) => (s && s.length > n ? s.slice(0, n) + '…' : s || '')

// 피드백 마감 = 배송완료일 + 7일
const feedbackDeadline = (deliveredAt) => {
  const d = toDate(deliveredAt)
  return d ? addDays(d, 7) : null
}

// 구매확정 판정 (요구사항 반영)
// - deliveredAt이 있어야 함
// - now > deadline(자동확정) 또는 feedbackAt ≤ deadline(작성완료 확정)
const isPurchaseConfirmed = (o) => {
  if (!o.deliveredAt) return false
  const deadline = feedbackDeadline(o.deliveredAt)
  if (!deadline) return false
  const now = today0()
  if (now > deadline) return true
  if (o.feedbackAt) return new Date(o.feedbackAt) <= deadline
  return false
}

// 상태 뱃지
const statusKind = (s) => {
  if (!s) return 'other'
  if (s === '구매확정') return 'confirmed'
  if (s.includes('준비') || s === '배송준비중') return 'ready'
  if (s === '배송중') return 'shipping'
  if (s === '배송완료') return 'delivered'
  return 'other'
}
const StatusPill = ({ status }) => {
  const kind = statusKind(status)
  const cls =
    kind === 'ready'
      ? `${pill} bg-amber-50 text-amber-700 ring-1 ring-amber-200`
      : kind === 'shipping'
      ? `${pill} bg-blue-50 text-blue-700 ring-1 ring-blue-200`
      : kind === 'delivered'
      ? `${pill} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`
      : kind === 'confirmed'
      ? `${pill} bg-violet-50 text-violet-700 ring-1 ring-violet-200`
      : `${pill} bg-slate-50 text-slate-700 ring-1 ring-slate-200`
  return <span className={cls}>{status || '-'}</span>
}

// 마감 라벨(목록/CSV 공통 사용)
const getDeadlineLabel = (o) => {
  if (!o.deliveredAt) return '-'
  const deadline = feedbackDeadline(o.deliveredAt)
  if (!deadline) return '-'
  // 피드백 작성되면 즉시 작성완료
  if (o.feedbackAt && new Date(o.feedbackAt) <= deadline) return '작성완료'
  const days = Math.ceil((deadline.getTime() - today0().getTime()) / 86400000)
  // 마감 지났고 미작성 → 미작성
  if (days < 0) return '미작성'
  return `D-${days}`
}

// 마감 Pill (요구사항에 맞게 변경)
const DeadlinePill = ({ deliveredAt, feedbackAt }) => {
  if (!deliveredAt) return <span className={`${pill} bg-gray-100 text-gray-600`}>-</span>
  const deadline = feedbackDeadline(deliveredAt)
  if (!deadline) return <span className={`${pill} bg-gray-100 text-gray-600`}>-</span>
  if (feedbackAt && new Date(feedbackAt) <= deadline) {
    return <span className={`${pill} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`}>작성완료</span>
  }
  const dday = Math.ceil((deadline.getTime() - today0().getTime()) / 86400000)
  if (dday < 0) {
    return <span className={`${pill} bg-rose-50 text-rose-700 ring-1 ring-rose-200`}>미작성</span>
  }
  return <span className={`${pill} bg-slate-50 text-slate-700 ring-1 ring-slate-200`}>D-{dday}</span>
}

export default function OrdersPage() {
  const [rows, setRows] = useState(ORDERS_MOCK)
  const [sp, setSp] = useSearchParams()
  const initialTab = sp.get('tab') || 'all'

  const [tab, setTab] = useState(initialTab)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [detail, setDetail] = useState(null)

  const setTabAndQuery = (t) => {
    setTab(t)
    setSp((p) => { const next = new URLSearchParams(p); next.set('tab', t); return next })
  }

  const counts = useMemo(() => {
    const f = (fn) => rows.filter(fn).length
    return {
      all:       rows.length,
      ready:     f((o) => statusKind(o.status) === 'ready'),
      shipping:  f((o) => o.status === '배송중'),
      delivered: f((o) => o.status === '배송완료' && !isPurchaseConfirmed(o)),
      confirmed: f(isPurchaseConfirmed),
      exchange:  f((o) => o.exchangeRequested),
    }
  }, [rows])

  const filtered = rows.filter((o) => {
    const passTab =
      tab === 'all'       ? true
    : tab === 'ready'     ? statusKind(o.status) === 'ready'
    : tab === 'shipping'  ? o.status === '배송중'
    : tab === 'delivered' ? (o.status === '배송완료' && !isPurchaseConfirmed(o))
    : tab === 'confirmed' ? isPurchaseConfirmed(o)
    : tab === 'exchange'  ? o.exchangeRequested
    : true

    const carrierText = carrierLabel(o.carrierCode || '')
    const passQ =
      q.trim() === '' ||
      o.id.toLowerCase().includes(q.toLowerCase()) ||
      o.product.toLowerCase().includes(q.toLowerCase()) ||
      o.buyer.includes(q) ||
      o.address.toLowerCase().includes(q.toLowerCase()) ||
      o.phone.includes(q) ||
      (o.trackingNo || '').toLowerCase().includes(q.toLowerCase()) ||
      (o.carrierCode || '').toLowerCase().includes(q.toLowerCase()) ||
      (carrierText || '').toLowerCase().includes(q.toLowerCase())

    return passTab && passQ
  })

  const toggleAll = (checked) =>
    setSelected(checked ? new Set(filtered.map((r) => r.id)) : new Set())
  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // CSV 다운로드
  const downloadCSV = () => {
    const header = [
      '주문번호','주문일','상태','택배사','송장번호','피드백 마감',
      '상품명','받는이','주소','연락처','배송요청사항'
    ]

    // 엑셀에서 숫자처럼 보이는 값 보존
    const asText = (s = '') => '\u200E' + String(s)

    const lines = filtered.map((r) => {
      const statusLabel = isPurchaseConfirmed(r) ? '구매확정' : (r.status || '')
      const deadlineLabel = getDeadlineLabel(r)
      const carrier = carrierLabel(r.carrierCode || '')

      return [
        asText(r.id),                // 주문번호
        r.orderedAt || '',           // 주문일
        statusLabel,                 // 상태
        carrier,                     // 택배사
        asText(r.trackingNo || ''),  // 송장번호
        deadlineLabel,               // 피드백 마감
        r.product,                   // 상품명
        r.buyer,                     // 받는이
        r.address,                   // 주소
        asText(r.phone || ''),       // 연락처
        r.requestNote || '',         // 배송요청사항
      ]
    })

    const toCell = (cell) => {
      const s = String(cell ?? '')
      return s.includes('"') || s.includes(',') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }
    const csv = [header, ...lines].map((row) => row.map(toCell).join(',')).join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 칩 아이템
  const chipItems = [
    { key: 'all',       label: '전체',       count: counts.all },
    { key: 'ready',     label: '배송준비중', count: counts.ready },
    { key: 'shipping',  label: '배송중',     count: counts.shipping },
    { key: 'delivered', label: '배송완료',   count: counts.delivered },
    { key: 'confirmed', label: '구매확정',   count: counts.confirmed },
    { key: 'exchange',  label: '교환요청',   count: counts.exchange },
  ]

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">주문관리</h1>
      </div>

      {/* 탭/검색 */}
      <section className={`${box} mb-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChips
            items={chipItems}
            value={tab}
            onChange={(k) => setTabAndQuery(k)}
            variant="primary"
            size="md"
          />

          <div className="ml-auto flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="주문번호 / 상품 / 받는이 / 주소 / 연락처 / 송장번호 / 택배사"
              className="h-9 w-80 rounded-lg border px-3 text-sm outline-none focus:ring"
            />
            <Button variant="signUp" size="sm" onClick={() => setQ('')}>
              초기화
            </Button>
            <Button variant="signUp" size="sm" onClick={downloadCSV}>
              엑셀 다운로드(CSV)
            </Button>
          </div>
        </div>
      </section>

      {/* 목록 */}
      <section className={box}>
        <div className="overflow-x-auto">
          <div className="max-h-[560px] overflow-y-auto [scrollbar-gutter:stable]">
            <table
              className="min-w-full table-fixed text-center text-sm"
              style={{ width: TABLE_W }}
            >
              <colgroup>
                <col style={{ width: COLW.CHECK }} />
                <col style={{ width: COLW.ORDER_ID }} />
                <col style={{ width: COLW.ORDERED_AT }} />
                <col style={{ width: COLW.STATUS }} />
                <col style={{ width: COLW.CARRIER }} />
                <col style={{ width: COLW.TRACKING }} />
                <col style={{ width: COLW.DEADLINE }} />
                <col style={{ width: COLW.PRODUCT }} />
                <col style={{ width: COLW.BUYER }} />
                <col style={{ width: COLW.ADDRESS }} />
                <col style={{ width: COLW.PHONE }} />
                <col style={{ width: COLW.REQNOTE }} />
              </colgroup>

              <thead className="sticky top-0 z-[1] border-b bg-gray-50 text-[13px] text-gray-500">
                <tr>
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every((r) => selected.has(r.id))}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  </th>
                  <th className="px-3 py-2">주문번호</th>
                  <th className="px-3 py-2">주문일</th>
                  <th className="px-3 py-2 text-center">상태</th>
                  <th className="px-3 py-2">택배사</th>
                  <th className="px-3 py-2">송장번호</th>
                  <th className="px-3 py-2 text-center">피드백 마감</th>
                  <th className="px-3 py-2">상품명</th>
                  <th className="px-3 py-2 text-center">받는이</th>
                  <th className="px-3 py-2">주소</th>
                  <th className="px-3 py-2">연락처</th>
                  <th className="px-3 py-2">배송요청사항</th>
                </tr>
              </thead>

              <tbody className="[&>tr]:h-12">
                {filtered.map((o) => {
                  const carrierCode = o.carrierCode || ''
                  const displayStatus = isPurchaseConfirmed(o) ? '구매확정' : (o.status || '-')
                  return (
                    <tr key={o.id} className="border-b last:border-none">
                      {/* 체크박스 */}
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(o.id)}
                          onChange={() => toggleOne(o.id)}
                        />
                      </td>

                      {/* 주문번호(모달) */}
                      <td
                        className="px-3 py-2 font-mono text-[13px] text-blue-600 hover:underline cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                        onClick={() => setDetail(o)}
                        title="상세 보기"
                      >
                        {o.id}
                      </td>

                      {/* 주문일 */}
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis">
                        {o.orderedAt}
                      </td>

                      {/* 상태(구매확정 반영) */}
                      <td className="px-3 py-2 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                        <StatusPill status={displayStatus} />
                      </td>

                      {/* 택배사 */}
                      <td className="px-3 py-2">
                        <select
                          value={carrierCode}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === o.id
                                  ? { ...r, carrierCode: e.target.value }
                                  : r
                              )
                            )
                          }
                          className="block w-full rounded-md border px-2 py-1 text-sm"
                        >
                          {!carrierCode && <option value="" disabled>택배사 선택</option>}
                          {carrierOptions.map((opt) => (
                            <option key={opt.code} value={opt.code}>{opt.label}</option>
                          ))}
                        </select>
                      </td>

                      {/* 송장번호 */}
                      <td className="px-3 py-2">
                        <input
                          value={o.trackingNo || ''}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) => (r.id === o.id ? { ...r, trackingNo: e.target.value } : r))
                            )
                          }
                          placeholder="예: 6123-4567-8901"
                          className="block w-full rounded-md border px-2 py-1 text-sm"
                        />
                      </td>

                      {/* 피드백 마감(작성완료/미작성/D-n) */}
                      <td className="px-3 py-2 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                        <DeadlinePill deliveredAt={o.deliveredAt} feedbackAt={o.feedbackAt} />
                      </td>

                      {/* 상품명 */}
                      <td className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis" title={o.product}>
                        {truncate(o.product, 20)}
                      </td>

                      {/* 받는이 */}
                      <td className="px-3 py-2 text-center whitespace-nowrap overflow-hidden text-ellipsis" title={o.buyer}>
                        {truncate(o.buyer, 5)}
                      </td>

                      {/* 주소 */}
                      <td className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis" title={o.address}>
                        {o.address}
                      </td>

                      {/* 연락처 */}
                      <td className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis">
                        {o.phone}
                      </td>

                      {/* 배송요청사항 */}
                      <td className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis" title={o.requestNote || '-'}>
                        {o.requestNote || '-'}
                      </td>
                    </tr>
                  )
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-3 py-10 text-center text-gray-500">결과가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 상세 모달 */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`주문 상세 - ${detail?.id ?? ''}`}>
        {detail && <OrderDetailContent row={detail} />}
      </Modal>

      <div className="h-8" />
    </div>
  )
}
