// src/service/feedbackService.js
import api from "../config/axiosInstance";

/**
 * 상품 ID를 기반으로 해당 카테고리의 설문 템플릿을 가져옵니다.
 * @param {number | string} productId - 상품 ID
 * @returns {Promise<any>} 설문지 데이터
 */
export const getSurveyTemplate = (productId) =>
  api.get(`/api/products/${productId}/survey-template`).then((res) => res.data);

/**
 * 작성된 피드백을 서버에 제출합니다.
 * @param {object} payload - FeedbackCreateRequest DTO 형식의 데이터
 * @returns {Promise<any>} 생성된 피드백 정보
 */
export const createFeedback = (payload) =>
  api.post("/api/feedbacks", payload).then((res) => res.data);