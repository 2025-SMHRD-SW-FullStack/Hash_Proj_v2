import React, { useState } from 'react';
import TextField from '../../common/TextField'; // 경로 수정
import Button from '../../common/Button';       // 경로 수정
import { submitQna } from '../../../service/qnaService'; // Q&A 서비스 파일에서 가져옴

const QnaForm = ({ onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // TODO: 실제 API 연동 시에는 submitQna 함수를 구현해야 합니다.
      // 현재는 목업 데이터로 시뮬레이션
      console.log('Q&A 제출:', { title, content });
      await new Promise(resolve => setTimeout(resolve, 1000)); // API 호출 지연 시뮬레이션
      alert('질문이 성공적으로 등록되었습니다.');
      onSubmit(); // 부모 컴포넌트에 제출 완료 알림
    } catch (err) {
      setError('질문 등록 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
      <TextField
        id="qnaTitle"
        label="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <div>
        <label htmlFor="qnaContent" className="block text-sm font-medium text-gray-700 mb-2">
          내용
        </label>
        <textarea
          id="qnaContent"
          rows="8"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="문의하실 내용을 자세히 작성해주세요."
          required
        ></textarea>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="unselected" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? '등록 중...' : '등록하기'}
        </Button>
      </div>
    </form>
  );
};

export default QnaForm;
