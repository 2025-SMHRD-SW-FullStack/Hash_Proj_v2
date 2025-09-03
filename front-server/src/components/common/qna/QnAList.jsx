// src/components/common/qna/QnAList.jsx
import React, { useEffect, useState } from 'react';
import { qnaService } from '../../../service/qnaService';

const QnaList = ({ refreshTrigger }) => {
  const [qnaList, setQnaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchQnaList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await qnaService.getMyQnaList();
      setQnaList(data);
    } catch (err) {
      setError('Q&A 목록을 불러오는 데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQnaList();
  }, [refreshTrigger]);

  if (loading)
    return <div className="text-center py-8 text-gray-500">Q&A 목록을 불러오는 중...</div>;
  if (error)
    return <div className="text-center py-8 text-red-500">오류: {error}</div>;

  return (
    <div className="space-y-4">
      {qnaList.length === 0 ? (
        <div className="text-center py-12 text-gray-500">등록된 질문이 없습니다.</div>
      ) : (
        qnaList.map(qna => (
          <div
            key={qna.id}
            className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
            onClick={() => setExpandedId(expandedId === qna.id ? null : qna.id)}
          >
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">{qna.title}</h3>
              <span className="text-sm text-gray-400">
                {new Date(qna.createdAt).toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' })}
              </span>
            </div>

            {expandedId === qna.id && (
              <div className="mt-4 border-t pt-4" onClick={e => e.stopPropagation()}>
                <p className="text-gray-700 whitespace-pre-wrap">{qna.content}</p>

                {qna.answerContent ? (
                  <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-300 rounded-md">
                    <p className="font-semibold text-blue-800">관리자 답변:</p>
                    <p className="text-blue-700 whitespace-pre-wrap">{qna.answerContent}</p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-400 flex items-center gap-1">
                    🕒 아직 답변이 등록되지 않았습니다.
                  </p>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default QnaList;
