import React, { useMemo, useState } from 'react'
import BaseTable from '/src/components/common/table/BaseTable'
import { TableToolbar } from '/src/components/common/table/TableToolbar'
import Button from '/src/components/common/Button'

const StatusChip = ({ status }) => {
  const map = {
    REQUESTED: { text: '대기중', cls: 'bg-gray-200 text-gray-700' },
    APPROVED:  { text: '승인',  cls: 'bg-[#ADD973]/20 text-[#6a9231]' },
    REJECTED:  { text: '반려',  cls: 'bg-red-100 text-red-600' },
  }
  const s = map[status] || map.REQUESTED
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${s.cls}`}>{s.text}</span>
}

const fmtDate = (d) => {
  const x = new Date(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  const hh = String(x.getHours()).padStart(2, '0')
  const mm = String(x.getMinutes()).padStart(2, '0')
  return `${y}.${m}.${day} ${hh}:${mm}`
}

const fmtAmount = (n) =>
  `${n.toLocaleString()} P`

export default function PointsRedemptionsPage() {
  // ----- 더미 데이터 -----
  const dummy = useMemo(() =>
    Array.from({ length: 47 }).map((_, i) => {
      const status = i % 7 === 0 ? 'REJECTED' : (i % 4 === 0 ? 'APPROVED' : 'REQUESTED')
      return {
        id: 1000 + i,
        nickname: `user_${(i % 23) + 1}`,
        amount: (i + 1) * 1000,
        status,
        createdAt: new Date(Date.now() - i * 36e5).toISOString(),
        processedAt: status === 'REQUESTED' ? null : new Date(Date.now() - (i * 36e5) + 18e5).toISOString(),
      }
    })
  , [])

  // 상태
  const [rows, setRows] = useState(dummy)
  const [search, setSearch] = useState('')

  // 필터링(닉네임만)
  const filtered = rows.filter(r =>
    r.nickname.toLowerCase().includes(search.trim().toLowerCase())
  )

  // 페이지네이션 (10건/페이지)
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const goto = (p) => setPage(Math.min(Math.max(1, p), totalPages))

  // 승인/반려 동작(더미)
  const approve = (row) => {
    if (!window.confirm('교환을 승인하시겠습니까?')) return
    setRows(prev => prev.map(r =>
      r.id === row.id ? { ...r, status: 'APPROVED', processedAt: new Date().toISOString() } : r
    ))
  }
  const reject = (row) => {
    if (!window.confirm('교환을 반려하시겠습니까?')) return
    setRows(prev => prev.map(r =>
      r.id === row.id ? { ...r, status: 'REJECTED', processedAt: new Date().toISOString() } : r
    ))
  }

  const columns = [
    { header: '번호', key: 'no', width: 72, align: 'center', render: (_r, idx) => (page - 1) * PAGE_SIZE + idx + 1 },
    { header: '상태', key: 'status', width: 110, align: 'center', render: (row) => <StatusChip status={row.status} /> },
    { header: '닉네임', key: 'nickname', align: 'center', className: 'max-w-[180px]' },
    { header: '금액', key: 'amount', width: 140, align: 'center', render: (row) => fmtAmount(row.amount) },
    { header: '신청일', key: 'createdAt', width: 180, align: 'center', render: (row) => fmtDate(row.createdAt) },
    { header: '처리일', key: 'processedAt', width: 180, align: 'center', render: (row) => row.processedAt ? fmtDate(row.processedAt) : '-' },
    {
      header: '관리', key: 'actions', width: 180, align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="admin"
            size="sm"
            disabled={row.status !== 'REQUESTED'}
            onClick={() => approve(row)}
          >
            승인
          </Button>
          <Button
            variant="whiteBlack"
            size="sm"
            disabled={row.status !== 'REQUESTED'}
            onClick={() => reject(row)}
          >
            반려
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">포인트 교환 관리</h2>

      {/* 검색(닉네임만) */}
      <TableToolbar
        searchPlaceholder="닉네임으로 검색"
        searchValue={search}
        onChangeSearch={(v) => { setSearch(v); setPage(1) }}   // 타이핑 즉시 필터 + 페이지 초기화
        onSubmitSearch={() => setSearch((v) => v.trim())}
        onReset={() => { setSearch(''); setPage(1) }}
        className="mb-4"
      />

      {/* 표 */}
      <BaseTable
        columns={columns}
        data={paged}
        emptyText="교환 내역이 없습니다."
        // BaseTable은 기본 scrollY=600, 가로 오버플로 자동
      />

      {/* 페이지네이션 */}
      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="text-gray-600">
          총 <b>{total.toLocaleString()}</b>건 · {page}/{totalPages} 페이지
        </div>
        <div className="flex items-center gap-2">
          <Button variant="whiteBlack" size="sm" onClick={() => goto(1)} disabled={page === 1}>처음</Button>
          <Button variant="whiteBlack" size="sm" onClick={() => goto(page - 1)} disabled={page === 1}>이전</Button>
          <Button variant="whiteBlack" size="sm" onClick={() => goto(page + 1)} disabled={page === totalPages}>다음</Button>
          <Button variant="whiteBlack" size="sm" onClick={() => goto(totalPages)} disabled={page === totalPages}>마지막</Button>
        </div>
      </div>
    </div>
  )
}
