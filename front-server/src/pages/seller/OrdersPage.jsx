// /src/pages/seller/SellerOrdersPage.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {  fetchSellerOrders,  registerShipment,  buildOrdersCsvUrl } from '/src/service/orderService'
import StatusChips from '/src/components/seller/StatusChips'
import Button from '/src/components/common/Button'
import Modal from '/src/components/common/Modal'
import OrderDetailContent from '/src/components/seller/OrderDetailContent'
import { carrierOptions, carrierLabel, resolveCarrier } from '/src/constants/carriers'

// ---- UI 토큰
const box   = 'rounded-xl border bg-white p-4 shadow-sm'
const pill  = 'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[12px] font-medium'
const BUYER_COL_W     = 'w-[120px] min-w-[120px]'
const STATUS_COL_W    = 'w-[120px] min-w-[120px]'
const DEADLINE_COL_W  = 'w-[110px] min-w-[110px]'
const ADDRESS_COL_W   = 'min-w-[360px] max-w-[520px]'

// 10행 기준 고정 높이(대략 56px * 10 = 560px)
const LIST_FIXED_H = 'h-[560px]' // 필요하면 px 조절

// 서버 enum에 맞춘 칩(ALL 제외)
const STATUS_ITEMS = [
  { key: 'ALL',          label: '전체' },
  { key: 'PAID',         label: '결제완료' },
  { key: 'READY',        label: '배송준비중' }, // (= 발송대기)
  { key: 'IN_TRANSIT',   label: '배송중' },
  { key: 'DELIVERED',    label: '배송완료' },
  { key: 'CONFIRMED',    label: '구매확정' },
]

const fmtDateTime = (s) => (s ? new Date(s).toLocaleString('ko-KR') : '-')
const onlyDigits16 = (v) => String(v ?? '').replace(/\D/g, '').slice(0, 16) || '-'

export default function SellerOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status  = searchParams.get('status') || 'ALL'
  const q       = searchParams.get('q') || ''
  const from    = searchParams.get('from') || ''
  const to      = searchParams.get('to') || ''

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 상세 모달
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState(null)

  // 송장 입력 폼(행별)
  const [shipForm, setShipForm] = useState({}) // { [orderId]: { carrierCode, trackingNo } }

  const setParam = (patch) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') next.delete(k)
      else next.set(k, String(v))
    })
    setSearchParams(next)
  }

  const load = async () => {
    setLoading(true); setError(null)
    try {
      // 페이지네이션 제거 → 서버 요청은 넉넉히 size=200 등으로 가져오고 화면에서 스크롤 처리
      const { items } = await fetchSellerOrders({ status, from, to, q, page: 0, size: 200 })
      setRows(items || [])
    } catch (e) {
      console.error(e)
      setError(e?.response?.data?.message || e.message || '주문을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [status, from, to, q])

  const openDetail = (gridRow) => {
    const carrier = resolveCarrier(gridRow.courierName || '')
    const mapped = {
      id: gridRow.id,
      orderedAt: gridRow.orderDate ? new Date(gridRow.orderDate).toISOString().slice(0,10) : null,
      status: gridRow.statusText,
      deliveredAt: null,
      feedbackAt: null,
      carrierCode: carrier?.code || '',
      trackingNo: gridRow.trackingNo || '',
      buyerName: gridRow.receiver || '',
      phone: gridRow.phone || '',
      address1: gridRow.address || '',
      address2: '',
      zonecode: '',
      requestMemo: gridRow.requestMemo || '',
      productName: gridRow.productName || '',
    }
    setDetailRow(mapped)
    setDetailOpen(true)
  }

  const onSubmitShipment = async (gridRow) => {
    const id = gridRow.id
    const f = shipForm[id] || {}
    if (!f.carrierCode || !f.trackingNo) return alert('택배사와 운송장 번호를 입력하세요.')

    try {
      await registerShipment(id, {
        carrierCode: f.carrierCode,
        carrierName: carrierLabel(f.carrierCode) || '',
        trackingNo: f.trackingNo,
      })
      // 성공 시 화면 갱신
      setRows((prev) => prev.map(r =>
        r.id === id ? { ...r, statusText: '배송준비중', courierName: carrierLabel(f.carrierCode), trackingNo: f.trackingNo } : r
      ))
      alert('운송장이 등록되었습니다.')
    } catch (e) {
      alert(e?.response?.data?.message || '운송장 등록 실패')
    }
  }

  const csvUrl = useMemo(() => buildOrdersCsvUrl({ status, from, to, q }), [status, from, to, q])

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4">
      <h1 className="mb-4 text-xl font-semibold">주문관리</h1>

      {/* 필터 라인 */}
      <section className={`${box} mb-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChips
            items={STATUS_ITEMS}
            value={status}
            onChange={(v) => setParam({ status: v })}
            size="sm"
            variant="admin"
          />

          <div className="ml-auto flex items-center gap-2">
            <input
              className="h-9 rounded-lg border px-3 text-sm"
              placeholder="주문번호/받는이/연락처 검색"
              value={q}
              onChange={(e) => setParam({ q: e.target.value })}
            />
            {/* 버튼은 전부 Button 사용 */}
            <Button
              size="sm"
              variant="admin"
              onClick={() => { window.location.href = csvUrl }}
            >
               다운로드
            </Button>
          </div>
        </div>
      </section>

      {/* 목록 영역: 가로 스크롤 + (본문)세로 스크롤 고정 높이 */}
      <section className={`${box}`}>
        <div className="overflow-x-auto">
          <div className={`min-w-[960px] ${LIST_FIXED_H} overflow-y-auto`}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">주문번호</th>
                  <th className="px-3 py-2 text-left">상품</th>
                  <th className={`px-3 py-2 ${BUYER_COL_W} text-left`}>받는이</th>
                  <th className={`px-3 py-2 ${ADDRESS_COL_W} text-left`}>주소</th>
                  <th className="px-3 py-2 text-right">결제금액</th>
                  <th className={`px-3 py-2 ${STATUS_COL_W} text-center`}>상태</th>
                  <th className={`px-3 py-2 ${DEADLINE_COL_W} text-center`}>피드백 마감</th>
                  <th className="px-3 py-2 text-center">관리</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr><td className="px-3 py-6 text-center" colSpan={8}>불러오는 중…</td></tr>
                )}
                {(!loading && rows.length === 0) && (
                  <tr><td className="px-3 py-6 text-center" colSpan={8}>데이터가 없습니다.</td></tr>
                )}

                {rows.map((r) => {
                  const id = r.id
                  const canShip = (r.statusText === '배송준비중') // READY
                  const f = shipForm[id] || {}

                  return (
                    <tr key={id} className="border-t">
                      <td className="px-3 py-2">
                        {/* 주문번호도 Button 사용 (링크 스타일) */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-blue-600 hover:underline"
                          onClick={() => openDetail(r)}
                        >
                          {onlyDigits16(r.orderUid ?? id)}
                        </Button>
                        <div className="text-xs text-gray-500">{fmtDateTime(r.orderDate)}</div>
                      </td>

                      <td className="px-3 py-2">{r.productName || '-'}</td>
                      <td className={`px-3 py-2 ${BUYER_COL_W}`}>{r.receiver || '-'}</td>

                      <td className={`px-3 py-2 ${ADDRESS_COL_W}`}>
                        <div className="truncate">{r.address || '-'}</div>
                        {r.courierName && r.trackingNo && (
                          <div className="mt-1 text-xs text-gray-500">
                            {r.courierName} / {r.trackingNo}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2 text-right">-</td>

                      <td className={`px-3 py-2 ${STATUS_COL_W} text-center`}>
                        <span className={`${pill} bg-gray-100 text-gray-800`}>{r.statusText || '-'}</span>
                      </td>

                      <td className={`px-3 py-2 ${DEADLINE_COL_W} text-center`}>{r.feedbackDue || '-'}</td>

                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2 justify-center">
                          {canShip && (
                            <>
                              <select
                                className="h-9 rounded-md border px-2 text-sm"
                                value={f.carrierCode || ''}
                                onChange={(e) =>
                                  setShipForm((s) => ({ ...s, [id]: { ...s[id], carrierCode: e.target.value }}))
                                }
                              >
                                <option value="">택배사</option>
                                {carrierOptions.map((c) => (
                                  <option key={c.code || c.value} value={c.code || c.value}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>

                              <input
                                className="h-9 w-[160px] rounded-md border px-2 text-sm"
                                placeholder="운송장 번호"
                                value={f.trackingNo || ''}
                                onChange={(e) =>
                                  setShipForm((s) => ({ ...s, [id]: { ...s[id], trackingNo: e.target.value }}))
                                }
                              />

                              <Button size="sm" onClick={() => onSubmitShipment(r)}>
                                운송장 등록
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{String(error)}</p>}
      </section>

      {/* 상세 모달 */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="주문 상세">
        {detailRow ? <OrderDetailContent row={detailRow} /> : <div className="p-4">불러오는 중…</div>}
      </Modal>
    </div>
  )
}
