import React, { useEffect, useMemo, useState } from 'react'
import BaseTable from '../../common/table/BaseTable'
import TableToolbar from '../../common/table/TableToolbar'
import Button from '../../common/Button'
import api from '../../../config/axiosInstance'
import { fetchPendingExchanges } from '../../../service/exchangeService'

const EXCHANGE_BASE = '/api/seller/exchanges'

// 안전 접근
const pick = (v, ...paths) => {
  for (const p of paths) {
    const val = p.split('.').reduce((a, c) => (a ? a[c] : undefined), v)
    if (val !== undefined && val !== null && val !== '') return val
  }
  return ''
}

const formatDateTime = (s) => {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return String(s)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const makeAddress = (detail) => {
  const a1 = pick(detail, 'order.address1', 'order.addr1', 'order.addressLine1')
  const a2 = pick(detail, 'order.address2', 'order.addr2', 'order.addressLine2')
  const zip = pick(detail, 'order.zipcode', 'order.zonecode', 'order.postalCode')
  return [a1, a2, zip ? `(${zip})` : ''].filter(Boolean).join(' ')
}

// 교환 상세(주소/연락처/요청사항/사유 확보용)
async function fetchDetail(exchangeId) {
  const { data } = await api.get(`${EXCHANGE_BASE}/${exchangeId}`, { validateStatus: () => true })
  return data
}

export default function ExchangeTable() {
  const [status, setStatus] = useState(null) // REQUESTED/APPROVED/REJECTED/IN_PROGRESS/COMPLETED|null
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const statusChips = useMemo(
    () => [
      { label: '전체', value: null },
      { label: '신청', value: 'REQUESTED' },
      { label: '승인', value: 'APPROVED' },
      { label: '반려', value: 'REJECTED' },
      { label: '진행중', value: 'IN_PROGRESS' },
      { label: '완료', value: 'COMPLETED' },
    ],
    []
  )

  const fetchList = async () => {
    setLoading(true)
    try {
      // 1) 목록
      const list = await fetchPendingExchanges({
        status: status ?? undefined,
        q: search || undefined,
      })
      const content = Array.isArray(list?.content)
        ? list.content
        : (Array.isArray(list) ? list : (list?.list || []))

      // 2) 상세로 보강
      const withDetail = await Promise.all(
        content.map(async (r) => {
          const id = r.id ?? r.exchangeId
          try {
            const d = await fetchDetail(id)

            return {
              id,
              // 주문번호
              orderUid:
                pick(d, 'orderUid', 'order_uid', 'order.orderUid', 'order.order_uid') ||
                r.orderNo || r.orderId || '-',
              // 상품명
              productName:
                pick(d, 'product.name', 'orderItem.product.name') ||
                r.productName || '-',
              // 받는이
              receiver:
                pick(d, 'order.receiverName', 'order.receiver_name') ||
                r.buyerName || '-',
              // 주소
              address: makeAddress(d),
              // 연락처
              phone: pick(d, 'order.receiverPhone', 'order.receiver_phone') || '-',
              // 배송요청사항
              deliveryMemo: pick(d, 'order.deliveryMemo', 'order.delivery_memo') || '-',
              // 상태
              status: r.status ?? pick(d, 'exchange.status') ?? 'REQUESTED',
              // 사유
              reason: pick(d, 'exchange.reason', 'reason', 'reasonText') || r.reason || '-',
              // 신청일
              requestedAt: formatDateTime(
                pick(d, 'exchange.createdAt', 'createdAt', 'created_at', 'requestedAt') ||
                r.requestedAt || r.createdAt
              ),
            }
          } catch {
            // 상세 실패 시 최소 정보만
            return {
              id,
              orderUid: r.orderNo || r.orderId || '-',
              productName: r.productName || '-',
              receiver: r.buyerName || '-',
              address: '-',
              phone: '-',
              deliveryMemo: '-',
              status: r.status || 'REQUESTED',
              reason: r.reason || r.reasonText || '-',
              requestedAt: formatDateTime(r.requestedAt || r.createdAt),
            }
          }
        })
      )

      setRows(withDetail)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchList() }, [status])

  // ✅ CSS 수정 없이 BaseTable 컬럼만 정의
  const columns = useMemo(() => [
    { header: '주문번호', key: 'orderUid', width: 160, className: 'whitespace-nowrap' },
    { header: '상품명', key: 'productName', width: 220, className: 'text-left' },
    { header: '받는이', key: 'receiver', width: 120 },
    { header: '주소', key: 'address', width: 320, className: 'text-left' },
    { header: '연락처', key: 'phone', width: 140 },
    { header: '배송요청사항', key: 'deliveryMemo', width: 220, className: 'text-left' },
    {
      header: '상태',
      width: 90,
      render: (row) => (
        <span className="inline-block rounded-full border px-2 py-1 text-xs">
          {({ REQUESTED:'신청', APPROVED:'승인', REJECTED:'반려', IN_PROGRESS:'진행중', COMPLETED:'완료' }[row.status]) || row.status}
        </span>
      ),
    },
    { header: '사유', key: 'reason', width: 200, className: 'text-left' },
    { header: '신청일', key: 'requestedAt', width: 150 },
  ], [])

  return (
    <div className="w-full">
      <TableToolbar
        statusChips={statusChips}
        selectedStatus={status}
        onSelectStatus={setStatus}
        searchValue={search}
        onChangeSearch={setSearch}
        onSubmitSearch={fetchList}
        onReset={() => { setSearch(''); setStatus(null); fetchList() }}
        right={(
          <Button variant="outline" size="md" onClick={fetchList} disabled={loading}>
            새로고침
          </Button>
        )}
      />

      <BaseTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        scrollY={600}
        emptyText={loading ? '불러오는 중…' : '데이터가 없습니다.'}
      />
    </div>
  )
}
