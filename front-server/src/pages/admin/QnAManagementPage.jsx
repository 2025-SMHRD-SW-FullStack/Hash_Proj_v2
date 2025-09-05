// src/pages/admin/QnAManagementPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import BaseTable from '../../components/common/table/BaseTable';
import TableToolbar from '../../components/common/table/TableToolbar';
import { qnaService } from '../../service/qnaService';
import Button from '../../components/common/Button';
import QnAImageGallery from '../../components/common/qna/QnAImageGallery';

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

const STATUS_CHIPS = [
    { value: '전체', label: '전체' },
    { value: '답변 대기', label: '답변 대기' },
    { value: '답변 완료', label: '답변 완료' },
];

const QnAManagementPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const [qnaDetail, setQnaDetail] = useState(null); // 상세보기 상태
  const [answerContent, setAnswerContent] = useState(''); // 답변 내용
  const [submitting, setSubmitting] = useState(false); // 답변 제출 중

  useEffect(() => {
    fetchQnaList();
  }, [statusFilter]);

  const fetchQnaList = async () => {
    setLoading(true);
    try {
      const status = statusFilter === '전체' ? null : 
                    statusFilter === '답변 대기' ? 'WAITING' : 'ANSWERED';
      
      const data = await qnaService.getAdminQnaList({
        status,
        searchTerm,
        page: 0,
        size: 100
      });
      
      setRows(data.content || []);
    } catch (error) {
      console.error('QnA 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const term = searchTerm.toLowerCase();
      return (
        row.userNickname.toLowerCase().includes(term) ||
        row.title.toLowerCase().includes(term)
      );
    });
  }, [rows, searchTerm]);

  // 상태 텍스트 변환 함수
  const getStatusText = (status) => {
    switch (status) {
      case 'WAITING': return '답변 대기';
      case 'ANSWERED': return '답변 완료';
      case 'CLOSED': return '종료됨';
      default: return status;
    }
  };

  // QnA 상세보기 클릭 핸들러
  const handleQnaDetailClick = async (row) => {
    try {
      const detail = await qnaService.getAdminQnaDetail(row.id);
      setQnaDetail(detail);
      setAnswerContent('');
    } catch (error) {
      console.error('QnA 상세 조회 실패:', error);
    }
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setQnaDetail(null);
    setAnswerContent('');
  };

  // 답변 제출 핸들러
  const handleSubmitAnswer = async () => {
    if (!answerContent.trim()) return;

    setSubmitting(true);
    try {
      await qnaService.answerQna(qnaDetail.id, { answerContent });
      setQnaDetail(null);
      setAnswerContent('');
      fetchQnaList(); // 목록 새로고침
    } catch (error) {
      console.error('답변 등록 실패:', error);
      alert('답변 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: '목록 번호',
      key: 'id',
      width: 100,
      align: 'center',
    },
    {
      header: '작성자 닉네임',
      key: 'userNickname',
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
          onClick={() => handleQnaDetailClick(row)}
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
      render: (row) => <StatusBadge status={getStatusText(row.status)} />,
    },
    {
      header: '작성일자',
      key: 'createdAt',
      width: 120,
      align: 'center',
      render: (row) => new Date(row.createdAt).toLocaleDateString('ko-KR'),
    },
  ];

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">문의 게시판 관리</h2>
      
      <TableToolbar
        searchPlaceholder="제목 또는 닉네임으로 검색"
        searchValue={searchTerm}
        onChangeSearch={(value) => {
          setSearchTerm(value);
          setTimeout(() => fetchQnaList(), 300); // 디바운싱
        }}
        onReset={() => {
          setSearchTerm('');
          setStatusFilter('전체');
          // fetchQnaList는 statusFilter 변경 시 자동으로 호출되므로 여기서 또 호출할 필요 없음
        }}
        // --- 필터(토글) 기능에 필요한 props 전달 ---
        statusChips={STATUS_CHIPS}
        selectedStatus={statusFilter}
        onSelectStatus={setStatusFilter} // StatusChips에서 선택된 값을 statusFilter state에 반영
      />

      <BaseTable
        columns={columns}
        data={filteredRows}
        rowKey="id"
        emptyText={loading ? '문의 목록을 불러오는 중...' : '문의 내역이 없습니다.'}
      />

      {/* QnA 상세보기 모달 */}
      {qnaDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => handleCloseModal()}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{qnaDetail.title}</h3>
            <div className="text-sm text-gray-500 mb-4">
              <span>작성자: {qnaDetail.userNickname} ({qnaDetail.role})</span> | <span>작성일: {new Date(qnaDetail.createdAt).toLocaleDateString('ko-KR')}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-md min-h-[150px] mb-4">
              {qnaDetail.content}
            </div>
            {/* 첨부 이미지 */}
            <QnAImageGallery imagesJson={qnaDetail.imagesJson} title="첨부 이미지" />
            <div className="mt-4" />
            {qnaDetail.status === 'WAITING' ? (
              <>
                <h4 className="font-semibold mb-2">답변</h4>
                <textarea 
                  className="w-full h-32 border rounded-md p-2" 
                  placeholder="답변을 입력하세요..."
                  value={answerContent}
                  onChange={(e) => setAnswerContent(e.target.value)}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="unselected" onClick={handleCloseModal}>닫기</Button>
                  <Button 
                    onClick={handleSubmitAnswer}
                    disabled={submitting || !answerContent.trim()}
                  >
                    {submitting ? '답변 등록 중...' : '답변 등록'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h4 className="font-semibold mb-2">답변</h4>
                <div className="bg-blue-50 p-4 rounded-md min-h-[100px] mb-4">
                  {qnaDetail.answerContent || '답변이 없습니다.'}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="unselected" onClick={handleCloseModal}>닫기</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QnAManagementPage;