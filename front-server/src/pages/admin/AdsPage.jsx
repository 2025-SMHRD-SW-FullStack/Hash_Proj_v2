// src/pages/admin/AdsPage.jsx
import React, { useEffect, useMemo, useState } from 'react'
import BaseTable from '/src/components/common/table/BaseTable'
import TableToolbar from '/src/components/common/table/TableToolbar'
import Button from '/src/components/common/Button'
import { adminActivateAd, adminCancelAd, adminFetchAdBookings } from '../../service/adminAdsService'
import { AD_STATUS, AD_STATUS_LABEL } from '/src/constants/ads'

// 날짜 포맷: YYYY.MM.DD
const fmtDate = (d) => {
  if (!d) return '-'
  const x = new Date(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

// 남은 일수(시작일 기준, 음수면 0)
const remainDays = (start) => {
  const today = new Date()
  const s = new Date(start)
  const diff = Math.ceil((s - today) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

// 백엔드 슬롯 타입 → 라벨
const posLabel = (type) => {
  const map = {
    MAIN_ROLLING: '메인 롤링',
    MAIN_SIDE: '메인 사이드',
    CATEGORY_TOP: '카테고리 상단',
    ORDER_COMPLETE: '주문완료 하단',
  }
  return map[type] || type || '-'
}

// 백엔드 상태 → 프론트 상태 뱃지 키
const toUiStatus = (s) => {
  if (s === 'ACTIVE') return 'ACTIVE'
  if (s === 'CANCELLED') return 'CANCELED'
  if (s === 'COMPLETED') return 'DONE'
  // RESERVED_UNPAID | RESERVED_PAID
  return 'PENDING'
}

const STATUS_CHIPS = [
  { value: 'ALL', label: '전체' },
  { value: AD_STATUS.RESERVED_PAID, label: AD_STATUS_LABEL[AD_STATUS.RESERVED_PAID] },
  { value: AD_STATUS.RESERVED_UNPAID, label: AD_STATUS_LABEL[AD_STATUS.RESERVED_UNPAID] },
  { value: AD_STATUS.ACTIVE, label: AD_STATUS_LABEL[AD_STATUS.ACTIVE] },
  { value: AD_STATUS.COMPLETED, label: AD_STATUS_LABEL[AD_STATUS.COMPLETED] },
  { value: AD_STATUS.CANCELLED, label: AD_STATUS_LABEL[AD_STATUS.CANCELLED] },
];

export default function AdsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // 서버에서 목록 로드
  const load = async () => {
    setLoading(true)
    try {
      const page = await adminFetchAdBookings({ 
        page: 0, 
        size: 500,
        status: statusFilter === 'ALL' ? null : statusFilter 
      })
      // API 응답을 테이블 행으로 매핑
      const mapped = (page?.content ?? []).map((r) => ({
        id: r.id,
        type: r.type,               // MAIN_ROLLING | ...
        position: r.position,       // 숫자 포지션
        category: r.category,       // (있으면)
        startDate: r.startDate,
        endDate: r.endDate,
        status: toUiStatus(r.status),
        // 서버가 함께 내려주는 보조 정보(없으면 fallback)
        shopName: r.shopName ?? (r.sellerId ? `셀러#${r.sellerId}` : '-'),
        productName: r.productName ?? (r.productId ? `상품#${r.productId}` : '-'),
      }))
      setRows(mapped)
    } catch (e) {
      console.error(e)
      alert('광고 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [statusFilter])

  // 검색(상호명)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => (r.shopName || '').toLowerCase().includes(q))
  }, [rows, search])

  // 상태 뱃지
  const StatusChip = ({ status }) => {
    if (status === 'ACTIVE')
      return (
        <span className="rounded-full bg-[#ADD973]/20 px-2 py-1 text-xs font-medium text-[#6a9231]">
          노출중
        </span>
      )
    if (status === 'CANCELED')
      return (
        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
          중단
        </span>
      )
    if (status === 'PENDING')
      return (
        <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
          대기중
        </span>
      )
    // DONE
    return (
      <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700">
        완료
      </span>
    )
  }

  // 토글: 서버 연동
  const toggleAd = async (row) => {
    if (!row) return
    try {
      if (row.status === 'ACTIVE') {
        if (!window.confirm('광고를 중단 하시겠습니까?')) return
        await adminCancelAd(row.id)
      } else if (row.status === 'PENDING' || row.status === 'CANCELED') {
        if (!window.confirm('광고를 노출 하시겠습니까?')) return
        await adminActivateAd(row.id)
      } else {
        // DONE: 아무 동작 없음
        return
      }
      await load()
    } catch (e) {
      console.error(e)
      const msg = e?.response?.data?.message || e.message
      alert(msg || '처리 중 오류가 발생했습니다.')
    }
  }

  const columns = [
    { header: '번호', key: 'no', width: 70, align: 'center', render: (_row, idx) => idx + 1 },
    {
      header: '상태',
      key: 'status',
      width: 110,
      align: 'center',
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      header: '상호명',
      key: 'shopName',
      width: 280,
      align: 'center',
      className: 'max-w-[180px]',
      render: (row) => <span title={row.shopName}>{row.shopName}</span>,
    },
    {
      header: '상품명',
      key: 'productName',
      width: 400,
      align: 'center',
      className: 'max-w-[200px]',
      render: (row) => <span title={row.productName}>{row.productName}</span>,
    },
    {
      header: '노출 위치',
      key: 'position',
      align: 'center',
      width: 180,
      render: (row) => `${posLabel(row.type)} #${row.position}`,
    },
    {
      header: '노출 예정일자',
      key: 'remain',
      align: 'center',
      width: 140,
      render: (row) => `${remainDays(row.startDate)}일`,
    },
    {
      header: '노출 기간',
      key: 'period',
      align: 'center',
      width: 220,
      render: (row) => `${fmtDate(row.startDate)} ~ ${fmtDate(row.endDate)}`,
    },
    {
      header: '관리',
      key: 'actions',
      align: 'center',
      width: 160,
      render: (row) => {
        const isActive = row.status === 'ACTIVE'
        const isDone = row.status === 'DONE'
        const label = isActive ? '중단' : '노출'
        return (
          <div className="flex justify-center">
            <Button
              variant="admin"
              size="sm"
              disabled={isDone}
              onClick={() => toggleAd(row)}
              className={isActive ? 'bg-red-500 hover:drop-shadow text-white' : undefined}
            >
              {label}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">광고 관리</h2>

      <TableToolbar
        searchPlaceholder="상호명으로 검색"
        searchValue={search}
        onChangeSearch={setSearch}
        onSubmitSearch={() => setSearch((v) => v.trim())}
        onReset={() => {
          setSearch('');
          setStatusFilter('ALL'); // 필터도 초기화
        }}
        className="mb-4"
        statusChips={STATUS_CHIPS}
        selectedStatus={statusFilter}
        onSelectStatus={setStatusFilter}
      />


      <BaseTable
        columns={columns}
        data={filtered}
        emptyText={loading ? '불러오는 중…' : '광고 내역이 없습니다.'}
      />
    </div>
  )
}
