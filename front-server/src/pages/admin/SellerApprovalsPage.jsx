import React, { useMemo, useState } from 'react'
import BaseTable from '/src/components/common/table/BaseTable'
import Button from '/src/components/common/Button'
import Modal from '/src/components/common/Modal'

// 샐러 승인 관리페이지

// 날짜 포맷(간단)
const fmt = (d) =>
  new Date(d).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
const SellerApprovalsPage = () => {
  const [rows, setRows] = useState([])


  // 상세 모달
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState(null)

  const openDetail = (row) => {
    setTarget(row)
    setOpen(true)
  }

  const approveRow = (row) => {
    if (!window.confirm('이 신청을 승인하시겠습니까?')) return
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, status: 'APPROVED' } : r))
    )
    if (open) setOpen(false)
    alert('승인 처리되었습니다. (더미)')
  }

  // ------ 테이블 컬럼 정의 ------
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
      render: (row) => (
        <span
          className={
            row.status === 'APPROVED'
              ? 'rounded-full bg-green-100 px-2 py-1 text-xs text-green-700'
              : 'rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700'
          }
        >
          {row.status === 'APPROVED' ? '승인 완료' : '승인중'}
        </span>
      ),
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
          {row.userName}
        </button>
      ),
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
      width: 140,
      align: 'center',
      render: (row) => (
        <div className="flex justify-center">
          <Button
            variant="admin"
            size="sm"
            disabled={row.status === 'APPROVED'}
            onClick={() => approveRow(row)}
          >
            승인
          </Button>
        </div>
      ),
    },
  ]


  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">셀러 승인 관리</h2>

      <BaseTable
        columns={columns}
        data={rows}
        emptyText="신청 내역이 없습니다."
        // 가로 스크롤 + 세로 10개 이상 스크롤
      />

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
              variant="admin"
              onClick={() => approveRow(target)}
              disabled={!target || target?.status === 'APPROVED'}
            >
              승인
            </Button>
          </>
        }
      >
        {!target ? (
          <div className="py-8 text-center text-gray-500">로딩 중…</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Info label="사업자 등록번호" value={target.bizNo} />
            <Info label="상호명" value={target.shopName} />
            <Info label="대표자명" value={target.ownerName} />
            <Info
              className="sm:col-span-2"
              label="사업장 주소"
              value={target.addr}
            />
            <Info label="업종" value={target.category} />
            <Info label="대표번호" value={target.phone} />
            <Info label="신청 일자" value={fmt(target.createdAt)} />
            <Info
              label="상태"
              value={target.status === 'APPROVED' ? '승인 완료' : '승인중'}
            />
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
      <div className="rounded-lg border bg-gray-50 px-3 py-2">{value || '-'}</div>
    </div>
  )
}


export default SellerApprovalsPage