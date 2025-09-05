// src/pages/admin/SellerApprovalsPage.jsx
import React, { useEffect, useMemo, useState } from 'react'
import BaseTable from '../../components/common/table/BaseTable'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import {
  adminApproveSeller,
  adminGetSellerApplication,
  adminRejectSeller,
  adminSearchSellerApplications,
} from '../../service/adminSellerService.js'
import TableToolbar from '../../components/common/table/TableToolbar'
import CategorySelect from '../../components/common/CategorySelect'


// 날짜 포맷(간단)
const fmt = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

const statusBadge = (status) => {
  const base = 'rounded-full px-2 py-1 text-xs'
  if (status === 'APPROVED') return <span className={`${base} bg-green-100 text-green-700`}>승인 완료</span>
  if (status === 'REJECTED') return <span className={`${base} bg-red-100 text-red-700`}>반려</span>
  return <span className={`${base} bg-yellow-100 text-yellow-700`}>승인중</span>
}

const STATUS_CHIPS = [
    { value: 'PENDING', label: '승인중' },
    { value: 'APPROVED', label: '승인 완료' },
    { value: 'REJECTED', label: '반려' },
    { value: 'ALL', label: '전체' },
];

const PAGE_SIZE_OPTIONS = [
    { value: 10, label: '10개씩' },
    { value: 20, label: '20개씩' },
    { value: 50, label: '50개씩' },
];

const SellerApprovalsPage = () => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  // 검색/필터/페이지
  const [status, setStatus] = useState('PENDING') // 기본 대기중
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [totalElements, setTotalElements] = useState(0)
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalElements / size)), [totalElements, size])

  // 상세 모달
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchList = async () => {
    setLoading(true)
    try {
      const data = await adminSearchSellerApplications({ status, q, page, size })
      setRows(data?.content ?? [])
      setTotalElements(data?.totalElements ?? 0)
    } catch (e) {
      console.error(e)
      const code = e?.response?.status
      if (code === 401) alert('관리자 로그인이 필요합니다.')
      else alert('목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page, size])

  const openDetail = async (row) => {
    setOpen(true)
    setDetailLoading(true)
    try {
      const fresh = await adminGetSellerApplication(row.id)
      setTarget(fresh || row)
    } catch (e) {
      console.error(e)
      setTarget(row)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleApprove = async (rowOrTarget) => {
    const memo = window.prompt('승인 메모(선택):', '')
    try {
      await adminApproveSeller(rowOrTarget.id, memo || '')
      alert('승인 처리되었습니다.')
      setOpen(false)
      await fetchList()
    } catch (e) {
      console.error(e)
      const msg = e?.response?.data?.message || e.message
      alert(msg?.includes('ALREADY_APPROVED') ? '이미 승인된 신청입니다.' : '승인 중 오류가 발생했습니다.')
    }
  }

  const handleReject = async (rowOrTarget) => {
    const reason = window.prompt('반려 사유를 입력하세요:', '')
    if (reason == null) return
    if (!reason.trim()) {
      alert('반려 사유를 입력해주세요.')
      return
    }
    try {
      await adminRejectSeller(rowOrTarget.id, reason)
      alert('반려 처리되었습니다.')
      setOpen(false)
      await fetchList()
    } catch (e) {
      console.error(e)
      alert('반려 중 오류가 발생했습니다.')
    }
  }

  // ------ 테이블 컬럼 정의 ------
  const columns = [
    {
      header: '번호',
      key: 'no',
      width: 70,
      align: 'center',
      render: (_row, idx) => page * size + idx + 1,
    },
    {
      header: '상태',
      key: 'status',
      width: 110,
      align: 'center',
      render: (row) => statusBadge(row.status),
    },
    {
      header: '사용자 닉네임',
      key: 'userName',
      align: 'center',
      className: 'max-w-[180px]',
      render: (row) => (
        <button
          className="underline-offset-2 hover:underline"
          onClick={() => openDetail(row)}
          title="상세 보기"
        >
          {row.userNickname ?? row.userName ?? row.nickname ?? '-'}
        </button>
      ),
    },
    {
      header: '상호명',
      key: 'shopName',
      align: 'center',
      render: (row) => row.shopName || '-',
    },
    {
      header: '사업자번호',
      key: 'bizNo',
      align: 'center',
      render: (row) => row.bizNo || '-',
    },
    {
      header: '신청 일자',
      key: 'createdAt',
      width: 180,
      align: 'center',
      render: (row) => fmt(row.createdAt),
    },
    {
      header: '관리',
      key: 'actions',
      width: 200,
      align: 'center',
      render: (row) => (
        <div className="flex justify-center gap-2">
          <Button
            variant="admin"
            size="sm"
            disabled={row.status === 'APPROVED'}
            onClick={() => handleApprove(row)}
          >
            승인
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={row.status === 'APPROVED'}
            onClick={() => handleReject(row)}
          >
            반려
          </Button>
        </div>
      ),
    },
  ]

  const handleSizeChange = (selectedOption) => {
    setPage(0); // 페이지 크기가 바뀌면 첫 페이지로 이동
    setSize(selectedOption.value);
  };

  const selectedSizeOption = PAGE_SIZE_OPTIONS.find(option => option.value === size);

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">셀러 승인 관리</h2>

      {/* 검색/필터 바 */}
      <TableToolbar
        statusChips={STATUS_CHIPS}
        selectedStatus={status}
        onSelectStatus={(newStatus) => {
            setPage(0);
            setStatus(newStatus);
        }}
        searchValue={q}
        onChangeSearch={setQ}
        onSubmitSearch={() => {
            setPage(0);
            fetchList();
        }}
        onReset={() => {
            setStatus('PENDING');
            setQ('');
            setPage(0);
        }}
        right={
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 shrink-0">페이지 크기</span>
                <CategorySelect
                    categories={PAGE_SIZE_OPTIONS}
                    selected={selectedSizeOption}
                    onChange={handleSizeChange}
                    className="w-28"
                />
            </div>
        }
      />

      <BaseTable
        columns={columns}
        data={rows}
        emptyText={loading ? '불러오는 중…' : '신청 내역이 없습니다.'}
      />

      {/* 페이징 */}
      <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
        <div>총 {totalElements}건</div>
        <div className="flex items-center gap-2">
          <Button
            variant="whiteBlack"
            size="sm"
            disabled={page <= 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            이전
          </Button>
          <span>
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="whiteBlack"
            size="sm"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      </div>

      {/* 상세 모달 */}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={target ? `신청 상세 (#${target.id})` : '신청 상세'}
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="whiteBlack" onClick={() => setOpen(false)}>
              닫기
            </Button>
            <Button
              variant="danger"
              onClick={() => handleReject(target)}
              disabled={!target || target?.status === 'APPROVED'}
            >
              반려
            </Button>
            <Button
              variant="admin"
              onClick={() => handleApprove(target)}
              disabled={!target || target?.status === 'APPROVED'}
            >
              승인
            </Button>
          </>
        }
      >
        {!target || detailLoading ? (
          <div className="py-8 text-center text-gray-500">불러오는 중…</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Info label="상태" value={statusBadge(target.status)} />
            <Info label="신청 일자" value={fmt(target.createdAt)} />
            <Info label="사용자 닉네임" value={target.userName} />
            <Info label="사용자 이메일" value={target.userEmail} />
            <Info label="사업자 등록번호" value={target.bizNo} />
            <Info label="상호명" value={target.shopName} />
            <Info label="대표자명" value={target.ownerName} />
            <Info className="sm:col-span-2" label="사업장 주소" value={target.addr} />
            <Info label="업종" value={target.category} />
            <Info label="대표번호" value={target.phone} />
            {target.rejectReason && <Info className="sm:col-span-2" label="반려사유" value={target.rejectReason} />}
          </div>
        )}
      </Modal>
    </div>
  )
}

// 상세 행 컴포넌트
function Info({ label, value, className = '' }) {
  return (
    <div className={className}>
      <div className="mb-1 text-[12px] text-gray-500">{label}</div>
      <div className="rounded-lg border bg-gray-50 px-3 py-2">
        {typeof value === 'object' ? value : value || '-'}
      </div>
    </div>
  )
}

export default SellerApprovalsPage
