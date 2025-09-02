// /src/pages/admin/FeedbackReportsPage.jsx
import React, { useEffect, useState } from 'react'
import api from '/src/config/axiosInstance'
import Button from '/src/components/common/Button'
import BaseTable from '/src/components/common/table/BaseTable'

export default function FeedbackReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [actingId, setActingId] = useState(null) // 현재 처리 중인 행

  // 최초엔 대기(PENDING)만 가져와서 테이블 구성
  const fetchReports = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/feedback-reports', {
        params: { page: 0, size: 10 },
      })
      setReports(res.data?.content || [])
    } catch (e) {
      console.error('신고 목록 불러오기 실패', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleAction = async (id, action) => {
    const confirmMsg =
      action === 'approve'
        ? '이 신고를 승인하시겠습니까? (피드백이 삭제됩니다)'
        : '이 신고를 반려하시겠습니까?'
    if (!window.confirm(confirmMsg)) return

    try {
      setActingId(id)
      // 서버는 @RequestParam note 를 받지만, 지금은 메모 입력 없이 호출
      const { data } = await api.post(`/api/admin/feedback-reports/${id}/${action}`)
      alert('처리되었습니다.')

      //    서버 응답(ReportResponse)으로 현재 행을 **즉시 덮어쓰기**
      setReports(prev =>
        prev.map(r => (r.id === id ? { ...r, ...data } : r))
      )
    } catch (e) {
      console.error(`${action} 실패`, e)
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setActingId(null)
    }
  }

  const fmt = (d) => (d ? new Date(d).toLocaleString() : '-')

  const StatusBadge = ({ status }) => {
    const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium'
    if (status === 'APPROVED') return <span className={`${base} bg-green-100 text-green-700`}>승인</span>
    if (status === 'REJECTED') return <span className={`${base} bg-red-100 text-red-700`}>반려</span>
    return <span className={`${base} bg-gray-100 text-gray-700`}>대기</span>
  }

  const columns = [
    { header: 'ID', key: 'id', width: 80 },
    { header: '피드백ID', key: 'feedbackId', width: 100 },
    { header: '셀러ID', key: 'sellerId', width: 100 },
    { header: '사유', key: 'reason', className: 'max-w-[240px] truncate' },
    {
      header: '상태',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />,
      width: 90,
    },
    {
      header: '작성일',
      key: 'createdAt',
      render: (row) => fmt(row.createdAt),
      width: 170,
    },
    {
      header: '처리일',
      key: 'resolvedAt',
      render: (row) => fmt(row.resolvedAt),
      width: 170,
    },
    {
      header: '관리',
      key: 'actions',
      render: (row) => {
        const disabled = row.status !== 'PENDING' || actingId === row.id
        return (
          <div className="flex gap-2">
            <Button
              variant="admin"
              size="sm"
              disabled={disabled}
              onClick={() => handleAction(row.id, 'approve')}
            >
              승인
            </Button>
            <Button
              variant="admin"
              size="sm"
              disabled={disabled}
              onClick={() => handleAction(row.id, 'reject')}
            >
              반려
            </Button>
          </div>
        )
      },
      width: 180,
    },
  ]

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">피드백 신고 관리</h2>

      <BaseTable
        columns={columns}
        data={reports}
        emptyText={loading ? '불러오는 중...' : '신고 내역이 없습니다.'}
      />
    </div>
  )
}
