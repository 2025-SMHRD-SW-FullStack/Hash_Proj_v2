// src/pages/seller/OrdersPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import StatusChips from '/src/components/seller/StatusChips'
import Button from '/src/components/common/Button'
import Modal from '/src/components/common/Modal'
import OrderDetailContent from '/src/components/seller/OrderDetailContent'
import { carrierOptions, carrierLabel, resolveCarrier } from '/src/constants/carriers'
import { fetchSellerOrders, registerShipment, ORDER_STATUS_MAP, mapStatusForDisplay } from '/src/service/orderService'
import { fmtYmd, toOrderNo, getAmount, truncate10, makeAndDownloadCSV } from '/src/util/orderUtils'
import { fetchPendingExchanges, approveExchange, rejectExchange, shipExchange } from '/src/service/exchangeService'
import ExchangeShipDialog from '/src/components/seller/ExchangeShipDialog' 
import BaseTable from '/src/components/common/table/BaseTable'
import { TableToolbar } from '/src/components/common/table/TableToolbar'                 // ✅ 절대경로 통일
import { useOrderStore } from '/src/stores/orderStore'

// ---- UI 토큰
const box = 'rounded-xl border bg-white p-4 shadow-sm'

// 서버 enum에 맞춘 칩 (백엔드 OrderStatus와 일치)
const STATUS_ITEMS = [
  { key: 'ALL', label: '전체' },
  { key: 'READY', label: '신규주문' },  // PAID → READY로 변경
  { key: 'READY', label: '배송준비중' },
  { key: 'IN_TRANSIT', label: '배송중' },
  { key: 'DELIVERED', label: '배송완료' },
  { key: 'CONFIRMED', label: '구매확정' },
  { key: 'EXCHANGE', label: '교환요청' },
]

// 리스트 높이(10행 기준)
const SCROLL_Y = 48 * 10 + 44 // rowH * 10 + headerH

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = (searchParams.get('status') || 'ALL').toUpperCase()
  const q = searchParams.get('q') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const isExchange = status === 'EXCHANGE'

  // 전역 주문 상태
  const { 
    orders: globalOrders, 
    setOrders: setGlobalOrders, 
    updateOrderStatus: updateGlobalOrderStatus,
    upsertOrder: upsertGlobalOrder,
    setForceRefresh: setGlobalForceRefresh
  } = useOrderStore()

  // 검색 입력 상태(IME용)
  const [qInput, setQInput] = useState(q)
  const [isComp, setIsComp] = useState(false)
  useEffect(() => setQInput(q), [q])

  // 데이터/상태
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0
  })

  // 상세 모달
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState(null)

  // 운송장 입력/편집
  const [shipForm, setShipForm] = useState({})     // { [orderId]: { carrierCode, trackingNo } }
  const [editing, setEditing] = useState(new Set())// Set<orderId>

  // 교환 발송 모달
  const [shipTarget, setShipTarget] = useState(null)

  // 선택 체크박스
  const [selected, setSelected] = useState(new Set())
  const allVisibleIds = useMemo(() => (rows ?? []).map(r => r?.id), [rows])

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

  // 데이터 로드 (주문/교환 분기 1회)
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      if (isExchange) {
        const content = await fetchPendingExchanges()
        const arr = content || []
        setRows(arr)
        setSelected(new Set(arr.map(r => r.id)))
        // 교환 목록은 운송장 편집 폼 사용 안함
      } else {
        // 백엔드 API와 일치하는 상태값 사용
        const apiStatus = status === 'ALL' ? undefined : ORDER_STATUS_MAP[status]
        const response = await fetchSellerOrders({ 
          status: apiStatus, 
          from, 
          to, 
          q, 
          page: 0, 
          size: 200 
        })
        
        // 백엔드 응답 구조에 맞춰 처리
        const arr = response?.content || response?.items || []
        setRows(arr)
        
        // 전역 상태에도 저장 (메인페이지 동기화용)
        if (arr.length > 0) {
          setGlobalOrders(arr)
        }
        
        // 페이지네이션 정보 설정
        if (response?.page) {
          setPagination({
            page: response.page.number || 0,
            size: response.page.size || 20,
            totalElements: response.page.totalElements || arr.length,
            totalPages: response.page.totalPages || 1
          })
        }
        
        prefillShipFormFromRows(arr)
        // 선택 유지(페이지에 존재하는 것만)
        setSelected(prev => {
          const visible = new Set(arr.map(r => r?.id))
          const next = new Set()
          prev.forEach(id => { if (visible.has(id)) next.add(id) })
          return next
        })
      }
    } catch (e) {
      console.error('주문 목록 로드 실패:', e)
      setError(e?.response?.data?.message || e.message || '목록을 불러오지 못했습니다.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [isExchange, status, from, to, q, setGlobalOrders])

  useEffect(() => { load() }, [load])

  // 상세 모달 오픈
  const openDetail = (gridRow) => {
    const amt = getAmount(gridRow)
    const carrier =
      (gridRow.courierCode && { code: gridRow.courierCode }) ||
      resolveCarrier(gridRow.courierName || '')

    // 백엔드 응답 구조에 맞춰 매핑
    const mapped = {
      id: gridRow.id,
      orderedAt: gridRow.orderDate || gridRow.createdAt
        ? new Date(gridRow.orderDate || gridRow.createdAt).toISOString().slice(0, 10)
        : null,
      status: mapStatusForDisplay(gridRow.status) || gridRow.statusText || '',
      deliveredAt: gridRow.deliveredAt ?? null,
      feedbackAt: gridRow.feedbackAt ?? null,
      carrierCode: carrier?.code || '',
      trackingNo: gridRow.trackingNo || '',
      buyer: gridRow.receiver || gridRow.buyerName || gridRow.buyer?.name || '',
      phone: gridRow.phone || gridRow.receiverPhone || '',
      address: gridRow.address || gridRow.address1 || gridRow.deliveryAddress || '',
      product: gridRow.productName || gridRow.product?.name || gridRow.product || '',
      price: amt,
      requestNote: gridRow.requestMemo || gridRow.requestNote || gridRow.deliveryMemo || '',
      feedbackText: gridRow.feedbackText || gridRow.feedback || '',
      // 셀러 정보 추가
      sellerId: gridRow.sellerId || gridRow.seller?.id,
      sellerName: gridRow.sellerName || gridRow.shopName || gridRow.seller?.name || gridRow.seller?.shopName,
    }
    setDetailRow(mapped)
    setDetailOpen(true)
  }

  // 운송장 편집 토글
  const beginEdit = (row) => {
    const id = row.id
    const next = new Set(editing); next.add(id)
    setEditing(next)
    setShipForm((s) => {
      const cur = s[id] || {}
      const guessed = row.courierCode || resolveCarrier(row.courierName || '')?.code || ''
      return { ...s, [id]: { carrierCode: cur.carrierCode || guessed || '', trackingNo: cur.trackingNo || row.trackingNo || '' } }
    })
  }
  const cancelEdit = (id) => {
    const next = new Set(editing); next.delete(id)
    setEditing(next)
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
        trackingNo: f.trackingNo,
      })
      
      // 성공 시 로컬 상태 업데이트
      const updatedOrder = { 
        ...row, 
        status: 'READY', // 배송준비중으로 상태 변경
        statusText: '배송준비중',
        courierName: carrierLabel(f.carrierCode), 
        courierCode: f.carrierCode, 
        trackingNo: f.trackingNo 
      }
      
      setRows((prev) => prev.map(r =>
        r.id === id ? updatedOrder : r
      ))
      
      // 전역 상태도 업데이트 (메인페이지 동기화)
      updateGlobalOrderStatus(id, 'READY', {
        courierName: carrierLabel(f.carrierCode),
        courierCode: f.carrierCode,
        trackingNo: f.trackingNo
      })
      
      // 강제 새로고침 플래그 설정하여 SellerMain에서 즉시 반영
      setGlobalForceRefresh(true)
      
      cancelEdit(id)
      alert('운송장이 등록되었습니다.')
    } catch (e) {
      console.error('운송장 등록 실패:', e)
      alert(e?.response?.data?.message || '운송장 등록 실패')
    }
  }

  // 엑셀(CSV)
  const handleDownloadExcel = () => {
    const picked = (rows ?? []).filter(r => selected.has(r?.id))
    const data = picked.length ? picked : (rows ?? [])
    makeAndDownloadCSV(data, {
      filenamePrefix: 'orders',
      columns: ['주문번호', '상품', '판매자', '주소', '연락처', '배송요청사항', '상태', '피드백마감'],
      mapRow: (r) => {
        const rawId = (r?.orderUid ?? r?.orderNo ?? r?.orderId ?? r?.id ?? '').toString().trim() || '-'
        const sellerInfo = r?.sellerName || r?.shopName || r?.seller?.name || r?.seller?.shopName || r?.sellerId || '-'
        
        return [
          rawId,
          String(r?.productName ?? r?.product?.name ?? r?.product ?? ''),
          String(sellerInfo),
          String(r?.address ?? r?.deliveryAddress ?? ''),
          String(r?.phone ?? r?.receiverPhone ?? ''),
          String(r?.requestMemo ?? r?.requestNote ?? r?.deliveryMemo ?? ''),
          String(mapStatusForDisplay(r?.status) ?? r?.statusText ?? '-'),
          fmtYmd(r?.feedbackDue),
        ]
      },
    })
  }

  // 주문 컬럼
  const orderColumns = useMemo(() => ([
    {
      key: 'orderNo',
      header: '주문번호',
      width: 140,
      className: 'text-left',
      render: (r) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-blue-600 hover:underline"
          onClick={(e) => { e.stopPropagation(); openDetail(r) }}
        >
          {toOrderNo(r)}
        </Button>
      ),
    },
    { 
      key: 'productName', 
      header: '상품', 
      width: 220, 
      className: 'text-left',
      render: (r) => truncate10(r?.productName ?? r?.product?.name ?? r?.product ?? '') 
    },
    { 
      key: 'receiver', 
      header: '받는이', 
      width: 120, 
      render: (r) => r.receiver || r.buyer?.name || '-' 
    },
    { 
      key: 'phone', 
      header: '연락처', 
      width: 130, 
      render: (r) => r.phone || r.receiverPhone || '-' 
    },
    { 
      key: 'address', 
      header: '주소', 
      width: 320, 
      className: 'text-left',
      render: (r) => (
        <div>
          <div title={r?.address || r?.deliveryAddress}>{truncate10(r?.address || r?.deliveryAddress)}</div>
          {(r.courierName && r.trackingNo && !editing.has(r.id)) && (
            <div className="mt-1 text-xs text-gray-500">
              {r.courierName} / {r.trackingNo}
            </div>
          )}
        </div>
      ),
    },
    { 
      key: 'request', 
      header: '배송요청사항', 
      width: 240, 
      className: 'text-left',
      render: (r) => truncate10(r?.requestMemo ?? r?.requestNote ?? r?.deliveryMemo ?? '') || '-' 
    },
    { 
      key: 'status', 
      header: '상태', 
      width: 110,
      render: (r) => (
        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[12px] font-medium text-gray-800">
          {mapStatusForDisplay(r?.status) || r?.statusText || '-'}
        </span>
      )
    },
    { 
      key: 'due', 
      header: '피드백 마감', 
      width: 120, 
      render: (r) => fmtYmd(r.feedbackDue) 
    },
    {
      key: 'ship', header: '운송장', width: 260,
      render: (r) => {
        const id = r.id
        const isEditing = editing.has(id)
        const f = shipForm[id] || {}
        return (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {isEditing ? (
              <>
                <select
                  className="h-9 rounded-md border px-2 text-sm"
                  value={f.carrierCode || ''}
                  onChange={(e) => setShipForm((s) => ({ ...s, [id]: { ...s[id], carrierCode: e.target.value } }))}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">택배사</option>
                  {carrierOptions.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
                <input
                  className="h-9 w-[160px] rounded-md border px-2 text-sm"
                  placeholder="운송장 번호"
                  value={f.trackingNo || ''}
                  onChange={(e) => setShipForm((s) => ({ ...s, [id]: { ...s[id], trackingNo: e.target.value } }))}
                  onClick={(e) => e.stopPropagation()}
                />
                <Button size="sm" onClick={(e) => { e.stopPropagation(); onSubmitShipment(r) }}>
                  {r.trackingNo ? '운송장 수정' : '운송장 등록'}
                </Button>
                <Button size="sm" variant="admin" onClick={(e) => { e.stopPropagation(); cancelEdit(id) }}>
                  취소
                </Button>
              </>
            ) : (
              <Button size="sm" variant="admin" onClick={(e) => { e.stopPropagation(); beginEdit(r) }}>
                {r.trackingNo ? '수정' : '운송장 등록'}
              </Button>
            )}
          </div>
        )
      },
    },
  ]), [editing, shipForm])

  // 교환 컬럼
  const exchangeColumns = useMemo(() => ([
    { key: 'id',          header: '교환ID',   width: 90 },
    { key: 'orderId',     header: '주문번호', width: 140 },
    { key: 'productName', header: '상품',     width: 260, className: 'text-left' },
    { key: 'receiver',    header: '신청자',   width: 120 },
    { key: 'reason',      header: '사유',     width: 260, className: 'text-left', render: r => r.reason || '-' },
    { key: 'requestedAt', header: '신청일',   width: 160, render: r => (r.requestedAt || '').slice(0,16).replace('T',' ') },
    {
      key: 'actions',     header: '작업',     width: 240,
      render: r => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="whiteBlack" onClick={(e) => { e.stopPropagation(); (async () => {
            const reason = window.prompt('반려 사유를 입력하세요.')
            if (!reason) return
            await rejectExchange(r.id, reason)
            alert('반려 처리되었습니다.')
            
            // 전역 상태 강제 새로고침
            setGlobalForceRefresh(true)
            load()
          })() }}>반려</Button>
          <Button size="sm" variant="admin" onClick={(e) => { e.stopPropagation(); (async () => {
            await approveExchange(r.id)
            alert('승인되었습니다. 발송 등록을 진행하세요.')
            
            // 전역 상태 강제 새로고침
            setGlobalForceRefresh(true)
            setShipTarget(r)
            load()
          })() }}>승인</Button>
          <Button size="sm" onClick={(e) => { e.stopPropagation(); setShipTarget(r) }}>발송등록</Button>
        </div>
      )
    },
  ]), [load, setGlobalForceRefresh])

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">주문관리</h1>
      </div>

      {/* 필터바 */}
      <section className={`${box} mb-4`}>
        <TableToolbar
          searchPlaceholder="주문번호/받는이/연락처 검색"
          searchValue={qInput}
          onChangeSearch={(v) => { setQInput(v); if (isComp) return }}
          onSubmitSearch={() => setParam({ q: qInput })}
          onReset={handleReset}
          right={
            !isExchange && (
              <Button size="md" className="ml-auto" variant="admin" onClick={handleDownloadExcel}>
                엑셀 다운로드
              </Button>
            )
          }
        >
          <StatusChips
            items={STATUS_ITEMS}
            value={status}
            onChange={(v) => setParam({ status: v })}
            size="sm"
            variant="admin"
          />
        </TableToolbar>
      </section>

      {/* 목록 */}
      <section className={box}>
        {isExchange ? (
          <BaseTable
            columns={exchangeColumns}
            data={rows}
            rowKey="id"
            emptyText={loading ? '불러오는 중…' : (error || '교환 대기 건이 없습니다.')}
            scrollY={SCROLL_Y}
          />
        ) : (
          <BaseTable
            columns={orderColumns}
            data={rows}
            rowKey="id"
            withCheckbox
            selectedRowKeys={Array.from(selected)}
            onToggleRow={(key, checked) => {
              setSelected(prev => {
                const next = new Set(prev)
                checked ? next.add(key) : next.delete(key)
                return next
              })
            }}
            onToggleAll={(checked) => {
              const ids = rows.map(r => r.id)
              setSelected(checked ? new Set(ids) : new Set())
            }}
            onRowClick={openDetail}
            emptyText={loading ? '불러오는 중…' : (error || '데이터가 없습니다.')}
            scrollY={SCROLL_Y}
          />
        )}
      </section>

      {/* 상세 모달 */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="주문 상세">
        {detailRow ? <OrderDetailContent row={detailRow} /> : <div className="p-4">불러오는 중…</div>}
      </Modal>

      {/* 교환 발송 등록 모달 */}
      <ExchangeShipDialog
        open={!!shipTarget}
        onClose={() => setShipTarget(null)}
        onSubmit={async ({ courierCode, trackingNumber }) => {
          if (!shipTarget) return
          await shipExchange(shipTarget.id, { courierCode, trackingNumber })
          alert('교환 발송이 등록되었습니다.')
          
          // 전역 상태 강제 새로고침
          setGlobalForceRefresh(true)
          
          setShipTarget(null)
          load()
        }}
      />
    </div>
  )
}
