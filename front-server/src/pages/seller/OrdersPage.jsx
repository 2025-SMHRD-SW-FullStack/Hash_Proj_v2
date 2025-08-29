import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import StatusChips from '/src/components/seller/StatusChips'
import Button from '/src/components/common/Button'
import Modal from '/src/components/common/Modal'
import OrderDetailContent from '/src/components/seller/OrderDetailContent'
import { carrierOptions, carrierLabel, resolveCarrier } from '/src/constants/carriers'
import { fetchSellerOrders, registerShipment } from '/src/service/orderService'
import { fmtYmd, toOrderNo, getAmount, truncate10, makeAndDownloadCSV } from '/src/util/orderUtils'

// colgroup 안전 렌더(공백 텍스트 노드 방지)
const ColGroup = React.memo(({ widths = [] }) => (
  <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
))




// ---- UI 토큰 (ProductsPage 스타일 맞춤)
const box = 'rounded-xl border bg-white p-4 shadow-sm'
const pill = 'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[12px] font-medium'

// 목록 높이: 10행 + 헤더 기준
const ROW_H = 48
const HEADER_H = 44
const MAX_ROWS = 10
const tableMaxH = `${ROW_H * MAX_ROWS + HEADER_H}px`

// 서버 enum에 맞춘 칩(ALL 제외)
const STATUS_ITEMS = [
  { key: 'ALL', label: '전체' },
  { key: 'PAID', label: '신규주문' },
  { key: 'READY', label: '배송준비중' },
  { key: 'IN_TRANSIT', label: '배송중' },
  { key: 'DELIVERED', label: '배송완료' },
  { key: 'CONFIRMED', label: '구매확정' },
]

// ✅ 결제금액 컬럼 제거 → 너비 재정의(체크박스~관리, 총 10칸)
const COL_WIDTHS = [44, 140, 180, 120, 130, 360, 260, 120, 110, 240]

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') || 'ALL'
  const q = searchParams.get('q') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const [qInput, setQInput] = useState(q);   // 입력창 내부 값
  const [isComp, setIsComp] = useState(false); // IME 조합 중 여부
  useEffect(() => setQInput(q), [q]); // 외부에서 q가 바뀌면 동기화



  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 상세 모달
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState(null)

  // 송장 입력 폼(행별)
  const [shipForm, setShipForm] = useState({}) // { [orderId]: { carrierCode, trackingNo } }
  // 수정 토글(행별)
  const [editing, setEditing] = useState(new Set()) // Set<orderId>

  // ✅ 선택 체크박스 상태
  const [selected, setSelected] = useState(new Set())
  const allVisibleIds = useMemo(() => (rows ?? []).map(r => r?.id), [rows])
  const isAllChecked = useMemo(
    () => allVisibleIds.length > 0 && allVisibleIds.every(id => selected.has(id)),
    [allVisibleIds, selected]
  )
  const toggleAll = () => {
    const next = new Set(selected)
    if (isAllChecked) allVisibleIds.forEach(id => next.delete(id))
    else allVisibleIds.forEach(id => next.add(id))
    setSelected(next)
  }
  const toggleRow = (id) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const setParam = (patch) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') next.delete(k)
      else next.set(k, String(v))
    })
    setSearchParams(next)
  }

  const handleReset = () => {
    setParam({ status: 'ALL', q: '' })
    setSelected(new Set())
  }

  const prefillShipFormFromRows = (arr) => {
    const next = {}
    for (const r of arr) {
      const id = r?.id
      if (!id) continue
      const code = r.courierCode || resolveCarrier(r.courierName || '')?.code || ''
      const no = r.trackingNo || ''
      if (code || no) next[id] = { carrierCode: code, trackingNo: no }
    }
    setShipForm(next)
  }

  const load = async () => {
    setLoading(true); setError(null)
    try {
      // 🔑 ALL은 서버에 보내지 않는다.
      const st = (status === 'ALL') ? undefined : status
      const { items } = await fetchSellerOrders({ status: st, from, to, q, page: 0, size: 200 })
      const arr = items || []
      setRows(arr)
      prefillShipFormFromRows(arr)
      // 현재 페이지에 없는 선택 id 정리
      setSelected(prev => {
        const visible = new Set(arr.map(r => r?.id))
        const next = new Set()
        prev.forEach(id => { if (visible.has(id)) next.add(id) })
        return next
      })
    } catch (e) {
      console.error(e)
      setError(e?.response?.data?.message || e.message || '주문을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [status, from, to, q])

  const beginEdit = (row) => {
    const id = row.id
    const next = new Set(editing)
    next.add(id)
    setEditing(next)
    setShipForm((s) => {
      const cur = s[id] || {}
      const guessed = row.courierCode || resolveCarrier(row.courierName || '')?.code || ''
      return { ...s, [id]: { carrierCode: cur.carrierCode || guessed || '', trackingNo: cur.trackingNo || row.trackingNo || '' } }
    })
  }
  const cancelEdit = (id) => {
    const next = new Set(editing)
    next.delete(id)
    setEditing(next)
  }

  // 상세 모달 매핑(상세에서는 금액 있으면 사용, 없으면 '-')
  const openDetail = (gridRow) => {
    const amt = getAmount(gridRow) // 없으면 null
    const carrier =
      (gridRow.courierCode && { code: gridRow.courierCode }) ||
      resolveCarrier(gridRow.courierName || '')

    const mapped = {
      id: gridRow.id,
      orderedAt: gridRow.orderDate
        ? new Date(gridRow.orderDate).toISOString().slice(0, 10)
        : null,
      status: gridRow.statusText || gridRow.status || '',
      deliveredAt: gridRow.deliveredAt ?? null,
      feedbackAt: gridRow.feedbackAt ?? null,
      carrierCode: carrier?.code || '',
      trackingNo: gridRow.trackingNo || '',
      buyer: gridRow.receiver || gridRow.buyerName || '',
      phone: gridRow.phone || '',
      address: gridRow.address || gridRow.address1 || '',
      product: gridRow.productName || gridRow.product || '',
      price: amt,
      requestNote: gridRow.requestMemo || gridRow.requestNote || '',
      feedbackText: gridRow.feedbackText || gridRow.feedback || '',
    }
    setDetailRow(mapped)
    setDetailOpen(true)
  }

  // 운송장 등록/수정
  const onSubmitShipment = async (row) => {
    const id = row.id
    const f = shipForm[id] || {}
    if (!f.carrierCode || !f.trackingNo) return alert('택배사와 운송장 번호를 입력하세요.')

    try {
      await registerShipment(id, {
        carrierCode: f.carrierCode,
        carrierName: carrierLabel(f.carrierCode) || '',
        trackingNo: f.trackingNo, // 🔑 백엔드 필드명 일치
      })
      setRows((prev) => prev.map(r =>
        r.id === id
          ? {
            ...r,
            statusText: r.statusText || '배송준비중',
            courierName: carrierLabel(f.carrierCode),
            courierCode: f.carrierCode,
            trackingNo: f.trackingNo,
          }
          : r
      ))
      cancelEdit(id)
      alert('운송장이 등록되었습니다.')
    } catch (e) {
      alert(e?.response?.data?.message || '운송장 등록 실패')
    }
  }

  // ✅ 엑셀(CSV): 금액 제거한 컬럼으로 내보내기
  const handleDownloadExcel = () => {
    const picked = (rows ?? []).filter(r => selected.has(r?.id))
    const data = picked.length ? picked : (rows ?? [])
    makeAndDownloadCSV(data, {
      filenamePrefix: 'orders',
      // 금액을 완전히 제외하기 위해 커스텀 헤더/행 매핑 사용
      columns: ['주문번호', '상품', '주소', '연락처', '배송요청사항', '상태', '피드백마감'],
      mapRow: (r) => {
        const rawId = (r?.orderUid ?? r?.orderNo ?? r?.orderId ?? r?.id ?? '').toString().trim() || '-'
        return [
          rawId,
          String(r?.productName ?? r?.product ?? ''),
          String(r?.address ?? ''),
          String(r?.phone ?? ''),
          String(r?.requestMemo ?? r?.requestNote ?? ''),
          String(r?.statusText ?? r?.status ?? '-'),
          fmtYmd(r?.feedbackDue),
        ]
      },
    })
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">주문관리</h1>
      </div>

      {/* 필터바 (ProductsPage 스타일) */}
      <section className={`${box} mb-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChips
            items={STATUS_ITEMS}
            value={status}
            onChange={(v) => setParam({ status: v })}
            size="sm"
            variant="admin"
          />
          <input
            value={qInput}
            onChange={(e) => {
              setQInput(e.target.value);
              if (isComp) return;          // 조합 중엔 URL 갱신 금지
            }}
            onCompositionStart={() => setIsComp(true)}
            onCompositionEnd={(e) => {     // 조합 종료 시 한 번만 반영
              setIsComp(false);
              setParam({ q: e.target.value });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setParam({ q: qInput }); // 엔터로 즉시 검색
            }}
            placeholder="주문번호/받는이/연락처 검색"
            className="w-64 rounded-lg border px-3 py-2 text-sm outline-none focus:ring"
          />
          <Button size="sm" onClick={handleReset} variant="admin">
            초기화
          </Button>
          <Button size="sm" className="ml-auto" variant="admin" onClick={handleDownloadExcel}>
            엑셀 다운로드
          </Button>
        </div>
      </section>

      {/* 목록 (table-fixed + 안전 colgroup + sticky header + 최대 10행 높이) */}
      <section className={box}>
        <div className="overflow-x-auto" style={{ maxHeight: tableMaxH }}>
          <table className="w-full table-fixed text-center text-sm">
            <ColGroup widths={COL_WIDTHS} />

            <thead className="sticky top-0 z-10 border-b bg-gray-50 text-[13px] text-gray-500">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    onChange={toggleAll}
                    aria-label="전체 선택"
                  />
                </th>
                <th className="px-3 py-2">주문번호</th>
                <th className="px-3 py-2">상품</th>
                <th className="px-3 py-2">받는이</th>
                <th className="px-3 py-2">연락처</th>
                <th className="px-3 py-2">주소</th>
                <th className="px-3 py-2">배송요청사항</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">피드백 마감</th>
                <th className="px-3 py-2">운송장</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td className="px-3 py-10 text-center" colSpan={10}>불러오는 중…</td>
                </tr>
              )}
              {(!loading && rows.length === 0) && (
                <tr>
                  <td className="px-3 py-10 text-center text-gray-500" colSpan={10}>데이터가 없습니다.</td>
                </tr>
              )}

              {rows.map((r) => {
                const id = r.id
                const isEditing = editing.has(id)
                const f = shipForm[id] || {}

                return (
                  <tr key={id} className="border-b last:border-none">
                    {/* 체크 */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selected.has(id)}
                        onChange={() => toggleRow(id)}
                        aria-label="행 선택"
                      />
                    </td>

                    {/* 주문번호만 노출 */}
                    <td className="px-3 py-2 text-left">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-blue-600 hover:underline"
                        onClick={() => openDetail(r)}
                      >
                        {toOrderNo(r)}
                      </Button>
                    </td>

                    {/* 상품 */}
                    <td className="px-3 py-2 text-left" title={r?.productName || r?.product}>
                      {truncate10(r?.productName ?? r?.product ?? '')}
                    </td>

                    {/* 받는이 */}
                    <td className="px-3 py-2 whitespace-nowrap">{r.receiver || '-'}</td>

                    {/* 연락처 */}
                    <td className="px-3 py-2 whitespace-nowrap">{r.phone || '-'}</td>

                    {/* 주소 */}
                    <td className="px-3 py-2 text-left">
                      <div title={r?.address}>{truncate10(r?.address)}</div>
                      {r.courierName && r.trackingNo && !isEditing && (
                        <div className="mt-1 text-xs text-gray-500">
                          {r.courierName} / {r.trackingNo}
                        </div>
                      )}
                    </td>

                    {/* 배송요청사항 */}
                    <td className="px-3 py-2 text-left" title={r?.requestMemo || r?.requestNote}>
                      {truncate10(r?.requestMemo ?? r?.requestNote ?? '') || '-'}
                    </td>

                    {/* 상태 */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`${pill} bg-gray-100 text-gray-800`}>{r.statusText || '-'}</span>
                    </td>

                    {/* 피드백 마감 */}
                    <td className="px-3 py-2 whitespace-nowrap">{fmtYmd(r.feedbackDue)}</td>

                    {/* 운송장 */}
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {isEditing ? (
                          <>
                            <select
                              className="h-9 rounded-md border px-2 text-sm"
                              value={f.carrierCode || ''}
                              onChange={(e) =>
                                setShipForm((s) => ({ ...s, [id]: { ...s[id], carrierCode: e.target.value } }))
                              }
                            >
                              <option value="">택배사</option>
                              {carrierOptions.map((c) => (
                                <option key={c.code} value={c.code}>{c.label}</option>
                              ))}
                            </select>

                            <input
                              className="h-9 w-[160px] rounded-md border px-2 text-sm"
                              placeholder="운송장 번호"
                              value={f.trackingNo || ''}
                              onChange={(e) =>
                                setShipForm((s) => ({ ...s, [id]: { ...s[id], trackingNo: e.target.value } }))
                              }
                            />

                            <Button size="sm" onClick={() => onSubmitShipment(r)}>
                              {r.trackingNo ? '운송장 수정' : '운송장 등록'}
                            </Button>
                            <Button size="sm" variant="admin" onClick={() => cancelEdit(id)}>
                              취소
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="admin" onClick={() => beginEdit(r)}>
                            {r.trackingNo ? '수정' : '운송장 등록'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section >

      <div className="h-8" />

      {/* 상세 모달 */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="주문 상세">
        {detailRow ? <OrderDetailContent row={detailRow} /> : <div className="p-4">불러오는 중…</div>}
      </Modal>
    </div >
  )
}
