// src/pages/admin/QnAManagementPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import BaseTable from '../../components/common/table/BaseTable';
import { TableToolbar } from '../../components/common/table/TableToolbar';
import { adminQnaMock } from '../../data/adminQna.mock';
import Button from '../../components/common/Button';

/** 상태 표시 뱃지 */
const StatusBadge = ({ status }) => {
  const isWaiting = status === '답변 대기';
  const badgeClass = isWaiting
    ? 'bg-yellow-100 text-yellow-800'
    : 'bg-green-100 text-green-800';
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${badgeClass}`}>
      {status}
    </span>
  );
};

const QnAManagementPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const [qnaDetail, setQnaDetail] = useState(null); // 상세보기 상태

  useEffect(() => {
    // API 호출을 시뮬레이션합니다.
    setLoading(true);
    setTimeout(() => {
      setRows(adminQnaMock);
      setLoading(false);
    }, 500); // 0.5초 딜레이
  }, []);

  const filteredRows = useMemo(() => {
    return rows
      .filter(row => {
        if (statusFilter === '전체') return true;
        return row.status === statusFilter;
      })
      .filter(row => {
        const term = searchTerm.toLowerCase();
        return (
          row.nickname.toLowerCase().includes(term) ||
          row.title.toLowerCase().includes(term)
        );
      });
  }, [rows, statusFilter, searchTerm]);

  const columns = [
    {
      header: '목록 번호',
      key: 'id',
      width: 100,
      align: 'center',
    },
    {
      header: '작성자 닉네임',
      key: 'nickname',
      width: 150,
      align: 'center',
    },
    {
      header: 'Role',
      key: 'role',
      width: 100,
      align: 'center',
    },
    {
      header: '제목',
      key: 'title',
      className: 'text-left',
      render: (row) => (
        <button
          onClick={() => setQnaDetail(row)}
          className="hover:underline text-left"
        >
          {row.title}
        </button>
      ),
    },
    {
      header: '상태',
      key: 'status',
      width: 120,
      align: 'center',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: '작성일자',
      key: 'createdAt',
      width: 120,
      align: 'center',
    },
  ];

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">문의 게시판 관리</h2>
      
      <TableToolbar
        searchPlaceholder="제목 또는 닉네임으로 검색"
        searchValue={searchTerm}
        onChangeSearch={setSearchTerm}
        onReset={() => {
          setSearchTerm('');
          setStatusFilter('전체');
        }}
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border px-3 text-sm"
        >
          <option value="전체">전체</option>
          <option value="답변 대기">답변 대기</option>
          <option value="답변 완료">답변 완료</option>
        </select>
      </TableToolbar>

      <BaseTable
        columns={columns}
        data={filteredRows}
        rowKey="id"
        emptyText={loading ? '문의 목록을 불러오는 중...' : '문의 내역이 없습니다.'}
      />

      {qnaDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setQnaDetail(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{qnaDetail.title}</h3>
            <div className="text-sm text-gray-500 mb-4">
              <span>작성자: {qnaDetail.nickname} ({qnaDetail.role})</span> | <span>작성일: {qnaDetail.createdAt}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-md min-h-[150px] mb-4">
              {qnaDetail.content}
            </div>
            <h4 className="font-semibold mb-2">답변</h4>
            <textarea className="w-full h-32 border rounded-md p-2" placeholder="답변을 입력하세요..."></textarea>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="unselected" onClick={() => setQnaDetail(null)}>닫기</Button>
              <Button>답변 등록</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QnAManagementPage;