// src/pages/admin/QnADetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { qnaService } from '../../service/qnaService';
import QnAImageGallery from '../../components/common/qna/QnAImageGallery';
import Button from '../../components/common/Button';

const QnADetailPage = () => {
  const { qnaId } = useParams();
  const navigate = useNavigate();
  const [qna, setQna] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answerContent, setAnswerContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadQnaDetail();
  }, [qnaId]);

  const loadQnaDetail = async () => {
    try {
      setLoading(true);
      const data = await qnaService.getAdminQnaDetail(qnaId);
      setQna(data);
    } catch (error) {
      console.error('QnA 상세 조회 실패:', error);
      setError('QnA 상세 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async (e) => {
    e.preventDefault();
    if (!answerContent.trim()) {
      setError('답변 내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await qnaService.answerQna(qnaId, { answerContent: answerContent.trim() });
      alert('답변이 성공적으로 등록되었습니다.');
      loadQnaDetail(); // 답변 후 상세 정보 새로고침
    } catch (error) {
      console.error('답변 등록 실패:', error);
      setError('답변 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await qnaService.updateQnaStatus(qnaId, status);
      alert('상태가 변경되었습니다.');
      loadQnaDetail();
    } catch (error) {
      console.error('상태 변경 실패:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (error || !qna) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-red-500">{error || 'QnA를 찾을 수 없습니다.'}</div>
        <Button onClick={() => navigate('/admin/qna')} className="mt-4">
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">QnA 상세 보기</h1>
        <Button onClick={() => navigate('/admin/qna')} variant="blackWhite">
          목록으로 돌아가기
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
        {/* 기본 정보 */}
        <div className="border-b pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">문의 ID</label>
              <p className="text-lg">{qna.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">상태</label>
              <p className="text-lg">
                <span className={`px-2 py-1 rounded-full text-sm ${
                  qna.status === 'WAITING' ? 'bg-yellow-100 text-yellow-800' :
                  qna.status === 'ANSWERED' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {qna.status === 'WAITING' ? '답변 대기중' :
                   qna.status === 'ANSWERED' ? '답변 완료' : '종료됨'}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">작성자</label>
              <p className="text-lg">{qna.userNickname} ({qna.role})</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">작성일</label>
              <p className="text-lg">{new Date(qna.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="text-sm font-medium text-gray-600">제목</label>
          <p className="text-lg font-semibold mt-1">{qna.title}</p>
        </div>

        {/* 내용 */}
        <div>
          <label className="text-sm font-medium text-gray-600">내용</label>
          <div className="mt-1 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
            {qna.content}
          </div>
        </div>

        {/* 첨부 이미지 */}
        <QnAImageGallery imagesJson={qna.imagesJson} title="첨부된 이미지" />

        {/* 답변 */}
        {qna.status === 'ANSWERED' && (
          <div>
            <label className="text-sm font-medium text-gray-600">답변</label>
            <div className="mt-1 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                답변자: {qna.adminNickname} | 
                답변일: {new Date(qna.answeredAt).toLocaleString()}
              </p>
              <div className="whitespace-pre-wrap">{qna.answerContent}</div>
            </div>
          </div>
        )}

        {/* 답변 작성 폼 */}
        {qna.status === 'WAITING' && (
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">답변 작성</h3>
            <form onSubmit={handleAnswerSubmit}>
              <textarea
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                placeholder="답변 내용을 입력해주세요."
                className="w-full p-3 border border-gray-300 rounded-lg min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="flex gap-2 mt-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '답변 등록 중...' : '답변 등록'}
                </Button>
                <Button
                  type="button"
                  variant="blackWhite"
                  onClick={() => handleStatusChange('CLOSED')}
                >
                  문의 종료
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* 상태 변경 */}
        {qna.status === 'ANSWERED' && (
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">상태 관리</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => handleStatusChange('CLOSED')}
                variant="blackWhite"
              >
                문의 종료
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QnADetailPage;
