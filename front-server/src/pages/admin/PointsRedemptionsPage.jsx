import React, { useEffect, useMemo, useState } from 'react'
import BaseTable from '../../components/common/table/BaseTable'
import TableToolbar from '../../components/common/table/TableToolbar'
import Button from '../../components/common/Button'
import {
  fetchRequestedRedemptions,
  approveRedemption,
  rejectRedemption,
} from '../../service/adminPointsService'

// 상태 뱃지
const StatusChip = ({ status }) => {
  const map = {
    REQUESTED: { text: '대기중', cls: 'bg-gray-200 text-gray-700' },
    APPROVED: { text: '승인', cls: 'bg-sub/20 text-[#683192]' },
    REJECTED: { text: '반려', cls: 'bg-red-100 text-red-600' },
  }
  const s = map[status] || map.REQUESTED
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${s.cls}`}>
      {s.text}
    </span>
  )
}

const STATUS_CHIPS = [
  { value: 'ALL', label: '전체' },
  { value: 'REQUESTED', label: '대기중' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
];

// 날짜 포맷: YYYY.MM.DD hh:mm (값이 없으면 '-')
const fmtDate = (d) => {
  if (!d) return '-'
  const x = new Date(d)
  if (Number.isNaN(x.getTime())) return '-'
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  const hh = String(x.getHours()).padStart(2, '0')
  const mm = String(x.getMinutes()).padStart(2, '0')
  return `${y}.${m}.${day} ${hh}:${mm}`
}

const fmtAmount = (n) => `${Number(n || 0).toLocaleString()} P`

export default function PointsRedemptionsPage() {
  // 서버 페이징
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('') // 닉네임 검색어
  const [statusFilter, setStatusFilter] = useState('ALL'); 
  const [data, setData] = useState({
    content: [],
    number: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
  })

  const load = async (p1 = 1, q = '', status = 'REQUESTED') => {
      setLoading(true)
      try {
          const res = await fetchRequestedRedemptions({
              page: p1 - 1,
              size: PAGE_SIZE,
              q,
              status: status === 'ALL' ? null : status, // 'ALL'이면 파라미터 제외
          })

          const sortedContent = [...(res.content || [])].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )

          setData({
            ...res,
            content: sortedContent,
          })
          setPage((res.number ?? 0) + 1)
      } catch (e) {
          console.error(e)
          alert('교환 목록을 불러오지 못했습니다.')
      } finally {
          setLoading(false)
      }
  }

  useEffect(() => {
        load(1, search, statusFilter)
    }, [statusFilter])

    const onSubmitSearch = () => load(1, search.trim(), statusFilter)
    const onReset = () => {
        setSearch('')
        setStatusFilter('REQUESTED') // 초기화 시 기본값으로
        load(1, '', 'REQUESTED')
    }

  const goto = async (p) => {
    const totalPages = Math.max(1, data.totalPages || 1)
    const clamped = Math.min(Math.max(1, p), totalPages)
    await load(clamped, search.trim())
  }

  const onApprove = async (row) => {
    if (!row || row.status !== 'REQUESTED') return
    if (!window.confirm('교환을 승인하시겠습니까?')) return
    setLoading(true)
    try {
      await approveRedemption(row.id)
      await load(page, search.trim())
    } catch (e) {
      console.error(e)
      alert('승인 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const onReject = async (row) => {
    if (!row || row.status !== 'REQUESTED') return
    if (!window.confirm('교환을 반려하시겠습니까?')) return
    setLoading(true)
    try {
      await rejectRedemption(row.id)
      await load(page, search.trim())
    } catch (e) {
      console.error(e)
      alert('반려 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        header: '상태',
        key: 'status',
        width: 110,
        align: 'center',
        render: (row) => <StatusChip status={row.status} />,
      },
      {
        header: '닉네임',
        key: 'nickname',
        align: 'center',
        className: 'max-w-[180px]',
        render: (row) => <span title={row.nickname}>{row.nickname || '-'}</span>,
      },
      {
        header: '금액',
        key: 'amount',
        width: 140,
        align: 'center',
        render: (row) => fmtAmount(row.amount),
      },
      {
        header: '신청일',
        key: 'createdAt',
        width: 180,
        align: 'center',
        render: (row) => fmtDate(row.createdAt),
      },
      {
        header: '처리일',
        key: 'processedAt',
        width: 180,
        align: 'center',
        render: (row) => fmtDate(row.processedAt),
      },
      {
        header: '관리',
        key: 'actions',
        width: 180,
        align: 'center',
        render: (row) => (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="admin"
              size="sm"
              disabled={row.status !== 'REQUESTED'}
              onClick={() => onApprove(row)}
            >
              승인
            </Button>
            <Button
              variant="whiteBlack"
              size="sm"
              disabled={row.status !== 'REQUESTED'}
              onClick={() => onReject(row)}
            >
              반려
            </Button>
          </div>
        ),
      },
    ],
    [page, data.size]
  )

  const total = data.totalElements ?? 0
  const totalPages = Math.max(1, data.totalPages ?? 1)
  const rows = data.content ?? []

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">포인트 교환 관리</h2>

      {/* 검색(닉네임) */}
      <TableToolbar
            searchPlaceholder="닉네임으로 검색"
            searchValue={search}
            onChangeSearch={(v) => setSearch(v)}
            onSubmitSearch={onSubmitSearch}
            onReset={onReset}
            className="mb-4"
            // --- 필터(토글) 기능에 필요한 props ---
            statusChips={STATUS_CHIPS}
            selectedStatus={statusFilter}
            onSelectStatus={setStatusFilter}
        />

      {/* 표 */}
      <BaseTable
        columns={columns}
        data={rows}
        emptyText={loading ? '로딩 중…' : '교환 내역이 없습니다.'}
      />

      {/* 페이지네이션 */}
      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="text-gray-600">
          총 <b>{total.toLocaleString()}</b>건 · {page}/{totalPages} 페이지
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="whiteBlack"
            size="sm"
            onClick={() => goto(1)}
            disabled={page === 1}
          >
            처음
          </Button>
          <Button
            variant="whiteBlack"
            size="sm"
            onClick={() => goto(page - 1)}
            disabled={page === 1}
          >
            이전
          </Button>
          <Button
            variant="whiteBlack"
            size="sm"
            onClick={() => goto(page + 1)}
            disabled={page === totalPages}
          >
            다음
          </Button>
          <Button
            variant="whiteBlack"
            size="sm"
            onClick={() => goto(totalPages)}
            disabled={page === totalPages}
          >
            마지막
          </Button>
        </div>
      </div>
    </div>
  )
}
