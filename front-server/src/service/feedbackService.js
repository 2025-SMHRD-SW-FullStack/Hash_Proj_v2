import api from '../config/axiosInstance'


export const fetchSellerFeedbacks = async ({ page = 0, size = 50 } = {}) => {
    const res = await api.get('/api/seller/feedbacks', { params: { page, size } })
    return res.data
}


export const reportFeedback = async ({ feedbackId, reason }) => {
    const res = await api.post(`/api/feedbacks/${feedbackId}/report`, { reason })
    return res.data
}

/**
 * 상품 ID를 기반으로 해당 상품 카테고리에 맞는 설문 템플릿을 가져옵니다.
 * @param {number | string} productId 상품 ID
 * @returns {Promise<object>} 설문 템플릿 데이터
 */
export const getSurveyTemplate = (productId) =>
  api.get(`/api/products/${productId}/survey-template`).then(r => r.data);

/**
 * 사용자가 작성한 설문 답변을 서버에 제출합니다. (피드백 본문 전송 전 단계)
 * @param {number} orderItemId 주문 상품 ID
 * @param {object} payload { answers: { ... } } 형태의 답변 객체
 * @returns {Promise<any>}
 */
export const submitSurvey = (orderItemId, payload) =>
  api.post(`/api/surveys/answers`, { orderItemId, ...payload }).then(r => r.data);

/**
 * 최종 피드백(수기/AI)을 서버에 제출합니다. 성공 시 포인트가 지급됩니다.
 * @param {object} payload FeedbackCreateRequest DTO 형식의 데이터
 * @returns {Promise<object>} 생성된 피드백 정보 (FeedbackResponse)
 */
export const submitFeedback = (payload) =>
  api.post(`/api/feedbacks`, payload).then(r => r.data);

/**
 * 현재 로그인된 사용자가 작성한 모든 피드백 목록을 가져옵니다.
 * @returns {Promise<Array>} 피드백 목록
 */
export const getMyFeedbacks = () => 
  api.get('/api/feedbacks/me').then(r => r.data); // '/api/me/feedbacks' -> '/api/feedbacks/me'로 수정

/**
 * 특정 피드백의 상세 정보를 ID로 조회합니다.
 * @param {number | string} feedbackId 피드백 ID
 * @returns {Promise<object>} 피드백 상세 정보
 */
export const getFeedbackDetail = (feedbackId) =>
  api.get(`/api/feedbacks/${feedbackId}`).then(r => r.data);