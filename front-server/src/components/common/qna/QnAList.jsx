// src/components/common/qna/QnAList.jsx
import React, { useState, useEffect } from 'react';
import { qnaService } from '../../../service/qnaService';
import QnAImageGallery from './QnAImageGallery';

const QnAList = ({ refreshTrigger }) => {
  const [qnaList, setQnaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQnaList();
  }, [refreshTrigger]);

  const loadQnaList = async () => {
    try {
      setLoading(true);
      const data = await qnaService.getMyQnaList();
      setQnaList(data);
    } catch (error) {
      console.error('QnA 목록 조회 실패:', error);
      setError('QnA 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'WAITING':
        return '답변 대기중';
      case 'ANSWERED':
        return '답변 완료';
      case 'CLOSED':
        return '종료됨';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'WAITING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ANSWERED':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (qnaList.length === 0) {
    return (
        <div className="rounded-lg p-4 h-60 flex items-center justify-center text-gray-400">등록된 문의가 없습니다.</div>
    );
  }

  return (
    <div className="space-y-4">
      {qnaList.map((qna) => (
        <div key={qna.id} className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-medium text-lg">{qna.title}</h4>
            <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(qna.status)}`}>
              {getStatusText(qna.status)}
            </span>
          </div>
          
          <p className="text-gray-600 mb-3 line-clamp-2">{qna.content}</p>
          
          {/* 첨부 이미지 미리보기 */}
          <QnAImageGallery 
            imagesJson={qna.imagesJson} 
            title="첨부 이미지" 
          />
          
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>작성자: {qna.userNickname}</span>
            <span>{new Date(qna.createdAt).toLocaleDateString()}</span>
          </div>
          
          {qna.status === 'ANSWERED' && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">
                <strong>답변:</strong> {qna.adminNickname} | {new Date(qna.answeredAt).toLocaleDateString()}
              </p>
              <p className="text-gray-800">{qna.answerContent}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default QnAList;
