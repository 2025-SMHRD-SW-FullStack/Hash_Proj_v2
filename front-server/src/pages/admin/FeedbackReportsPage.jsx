// /src/pages/admin/FeedbackReportsPage.jsx
import React, { useEffect, useState } from 'react'
import api from '/src/config/axiosInstance'
import Button from '/src/components/common/Button'
import BaseTable from '/src/components/common/table/BaseTable'
// import { TableToolbar } from '/src/components/common/table/TableToolbar' // 검색 필요 시

export default function FeedbackReportsPage() {


  const [reports] = useState([])



  // const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchReports = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/feedback-reports', {
        params: { status: 'PENDING', page: 0, size: 10 },
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
      await api.post(`/api/admin/feedback-reports/${id}/${action}`)
      alert('처리되었습니다.')
      fetchReports()
    } catch (e) {
      console.error(`${action} 실패`, e)
      alert('처리 중 오류가 발생했습니다.')
    }
  }

  const columns = [
    { header: '유저ID', key: 'id', width: 100 },
    { header: '셀러ID', key: 'sellerId', width: 100 },
    { header: '사유', key: 'reason', className: 'max-w-[200px] truncate' },
    {
      header: '작성일',
      key: 'createdAt',
      render: (row) => new Date(row.createdAt).toLocaleString(),
      width: 180,
    },
    {
      header: '관리',
      key: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button
            variant="admin"
            size="sm"
            onClick={() => handleAction(row.id, 'approve')}
          >
            승인
          </Button>
          <Button
            variant="admin"
            size="sm"
            onClick={() => handleAction(row.id, 'reject')}
          >
            반려
          </Button>
        </div>
      ),
      width: 160,
    },
  ]

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">피드백 신고 관리</h2>

      {/* 필요 시 검색툴바 */}
      {/* <TableToolbar
        searchValue={search}
        onChangeSearch={setSearch}
        onSubmitSearch={fetchReports}
        onReset={() => setSearch('')}
      /> */}

      <BaseTable
        columns={columns}
        data={reports}
        emptyText={loading ? '불러오는 중...' : '신고 내역이 없습니다.'}
      />
    </div>
  )
}
