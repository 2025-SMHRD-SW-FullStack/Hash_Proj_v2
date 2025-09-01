// src/service/qnaService.js
import api from '../config/axiosInstance'; // axiosInstance를 import

/**
 * 사용자가 등록한 Q&A 목록을 조회합니다.
 * TODO: 실제 API 엔드포인트와 응답 형식에 맞춰 수정해야 합니다.
 * @returns {Promise<Array>} Q&A 목록 배열
 */
export const getMyQnaList = async () => {
  try {
    // 실제 API 호출 예시 (현재는 목업 데이터 사용)
    // const response = await api.get('/api/me/qna');
    // return response.data;

    // 목업 데이터 반환
    return [
      {
        id: 1,
        title: '상품 배송 문의',
        content: '주문한 상품이 아직 배송되지 않고 있습니다. 언제쯤 받아볼 수 있을까요?',
        createdAt: '2023-08-20T10:00:00Z',
        answer: '고객님의 주문은 현재 배송 준비 중이며, 2~3일 내에 출고될 예정입니다. 송장 번호가 등록되면 다시 안내해 드리겠습니다.'
      },
      {
        id: 2,
        title: '결제 오류 발생',
        content: '결제 시도 중 오류가 발생하여 결제가 완료되지 않았습니다. 어떻게 해야 하나요?',
        createdAt: '2023-08-18T14:30:00Z',
        answer: '결제 오류는 다양한 원인으로 발생할 수 있습니다. 다시 시도해 보시고, 동일한 문제가 발생하면 결제 수단과 오류 메시지를 캡처하여 다시 문의해 주시면 확인 후 도와드리겠습니다.'
      },
      {
        id: 3,
        title: '회원 정보 수정 관련',
        content: '닉네임을 변경하고 싶은데, 마이페이지에서 수정이 되지 않습니다.',
        createdAt: '2023-08-15T09:15:00Z',
        answer: null // 답변이 없는 경우
      },
    ];
  } catch (error) {
    console.error("Q&A 목록 조회 API 연동 실패:", error);
    throw error;
  }
};

/**
 * 새로운 Q&A 질문을 등록합니다.
 * TODO: 실제 API 엔드포인트와 요청 형식에 맞춰 수정해야 합니다.
 * @param {object} payload - { title: string, content: string }
 * @returns {Promise<object>} 등록된 Q&A 정보
 */
export const submitQna = async (payload) => {
  try {
    // 실제 API 호출 예시 (현재는 목업 데이터 사용)
    // const response = await api.post('/api/qna', payload);
    // return response.data;

    // 목업 데이터로 성공 시뮬레이션
    return {
      id: Date.now(), // 임시 ID
      title: payload.title,
      content: payload.content,
      createdAt: new Date().toISOString(),
      answer: null,
    };
  } catch (error) {
    console.error("Q&A 등록 API 연동 실패:", error);
    throw error;
  }
};
