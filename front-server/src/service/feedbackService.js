import api from "../config/axiosInstance";

/**
 * 상품 카테고리에 맞는 설문지 템플릿을 가져옵니다.
 * @param {number} productId - 상품 ID
 * @returns {Promise<any>} 설문지 데이터
 */
export const getSurveyTemplate = (productId) =>
  api.get(`/api/products/${productId}/survey-template`).then((res) => res.data);

/**
 * 피드백을 서버에 제출합니다.
 * @param {object} payload - FeedbackCreateRequest DTO에 맞는 데이터
 * @returns {Promise<any>} 생성된 피드백 데이터
 */
export const submitFeedback = (payload) =>
  api.post("/api/feedbacks", payload).then((res) => res.data);