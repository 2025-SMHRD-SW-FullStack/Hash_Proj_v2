
import api from '../config/axiosInstance'


export const fetchSellerFeedbacks = async ({ page = 0, size = 50 } = {}) => {
    const res = await api.get('/api/seller/feedbacks', { params: { page, size } })
    return res.data
}


export const reportFeedback = async ({ feedbackId, reason }) => {
    const res = await api.post(`/api/feedbacks/${feedbackId}/report`, { reason })
    return res.data
}

// 설문 템플릿(카테고리 기반) — 서버에 SurveyCatalog 있음
export const getSurveyTemplate = (category) =>
  api.get(`/api/surveys/template`, { params: { category }}).then(r => r.data);

// 설문 제출(임시 저장 X, 바로 서버 보냄)
export const submitSurvey = (orderItemId, payload) =>
  api.post(`/api/surveys/answers`, { orderItemId, ...payload }).then(r => r.data);

// 피드백 본문 저장(수기/AI 공통) — 저장되면 서버가 포인트 지급까지 처리
export const submitFeedback = (orderItemId, payload) =>
  api.post(`/api/feedbacks`, { orderItemId, ...payload }).then(r => r.data);
