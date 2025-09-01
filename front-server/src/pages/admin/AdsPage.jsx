import React, { useMemo, useState } from 'react'
import BaseTable from '/src/components/common/table/BaseTable'
import { TableToolbar } from '/src/components/common/table/TableToolbar'
import Button from '/src/components/common/Button'

// 날짜 포맷: YYYY.MM.DD
const fmtDate = (d) => {
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

// 위치 코드 → 라벨 (필요하면 수정)
const posLabel = (code) => {
  const map = {
    MAIN_TOP: '메인 상단',
    MAIN_SIDE: '메인 사이드',
    DETAIL_TOP: '상세 상단',
    DETAIL_SIDE: '상세 사이드',
  }
  return map[code] || code || '-'
}

export default function AdsPage() {
  // ------ 더미 데이터 (15건) ------
  const dummy = useMemo(
    () =>
      Array.from({ length: 15 }).map((_, i) => {
        const statusPool = ['PENDING', 'ACTIVE', 'DONE', 'CANCELED']
        const status = statusPool[i % statusPool.length]
        const start = new Date()
        start.setDate(start.getDate() + (i % 7) - 2) // -2~+4일
        const end = new Date(start)
        end.setDate(start.getDate() + 7) // 7일짜리

        return {
          id: 100 + i,
          shopName: `상호_${(i % 6) + 1}`,
          productName: `상품_${i + 1}`,
          position: i % 2 ? 'MAIN_TOP' : 'DETAIL_SIDE',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          status,
        }
      }),
    []
  )

  const [rows, setRows] = useState(dummy)
  const [search, setSearch] = useState('')

  // 검색(상호명)
  const filtered = rows.filter((r) =>
    r.shopName.toLowerCase().includes(search.trim().toLowerCase())
  )

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

  // 토글 동작 (더미 상태 전환)
  const toggleAd = (row) => {
    if (!row) return
    if (row.status === 'ACTIVE') {
      if (!window.confirm('광고를 중단 하시겠습니까?')) return
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: 'CANCELED' } : r)))
      return
    }
    if (row.status === 'PENDING' || row.status === 'CANCELED') {
      if (!window.confirm('광고를 노출 하시겠습니까?')) return
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: 'ACTIVE' } : r)))
      return
    }
    // DONE: 아무 동작 없음
  }

  const columns = [
    {
      header: '번호',
      key: 'no',
      width: 70,
      align: 'center',
      render: (_row, idx) => idx + 1,
    },
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
      width: 140,
      render: (row) => posLabel(row.position),
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
              variant="admin" // admin 계열 유지
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

      {/* 검색툴바: 상호명만 */}
      <TableToolbar
        searchPlaceholder="상호명으로 검색"
        searchValue={search}
        onChangeSearch={setSearch}
        onSubmitSearch={() => setSearch((v) => v.trim())}
        onReset={() => setSearch('')}
        className="mb-4"
      />

      <BaseTable
        columns={columns}
        data={filtered}
        emptyText="광고 내역이 없습니다."
        // BaseTable 기본 scrollY=600 적용(옵션 제한 OK)
      />
    </div>
  )
}
