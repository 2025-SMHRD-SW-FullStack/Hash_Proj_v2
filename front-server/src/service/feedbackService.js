// src/service/feedbackService.js
import api from '../config/axiosInstance'


export const fetchSellerFeedbacks = async ({ page = 0, size = 50 } = {}) => {
    const res = await api.get('/api/seller/feedbacks', { params: { page, size } })
    return res.data
}


// 설문 템플릿(카테고리 기반) — 서버에 SurveyCatalog 있음
export const getSurveyTemplate = (category) =>
  api.get(`/api/surveys/template`, { params: { category }}).then(r => r.data);

// 설문 제출(임시 저장 X, 바로 서버 보냄)
export const submitSurvey = (orderItemId, payload) =>
  api.post(`/api/surveys/answers`, { orderItemId, ...payload }).then(r => r.data);


// 셀러 피드백

/** 셀러 피드백 그리드 (주문 그리드 기반)
 *  - 빈 값(from/to/q)은 쿼리스트링에 포함하지 않음 → Spring LocalDate 바인딩 에러 방지
 */
export const fetchSellerFeedbackGrid = async ({ from, to, q, page = 0, size = 100 } = {}) => {
  const params = { page, size }
  if (from) params.from = from          // 'YYYY-MM-DD'
  if (to) params.to = to                // 'YYYY-MM-DD'
  if (q && q.trim()) params.q = q.trim()

  const { data } = await api.get('/api/seller/orders/grid', { params })
  return data
}

/** 피드백 신고(셀러) */
export const reportFeedback = async ({ feedbackId, reason }) => {
  const payload = { feedbackId, reason }
  const { data } = await api.post('/api/seller/feedbacks/report', payload)
  return data
}

// (옵션) 통계 API …
export const fetchFeedbackSummary = async ({ productId, from, to }) => {
  const params = {}
  if (productId) params.productId = productId
  if (from) params.from = from
  if (to) params.to = to
  const { data } = await api.get('/api/seller/feedbacks/summary', { params })
  return data
}
export const fetchFeedbackDemographics = async ({ productId, from, to }) => {
  const params = {}
  if (productId) params.productId = productId
  if (from) params.from = from
  if (to) params.to = to
  const { data } = await api.get('/api/seller/feedbacks/demographics', { params })
  return data
}
export const fetchFeedbackQuestionStats = async ({ productId, from, to }) => {
  const params = {}
  if (productId) params.productId = productId
  if (from) params.from = from
  if (to) params.to = to
  const { data } = await api.get('/api/seller/feedbacks/questions', { params })
  return data
}


// 피드백 통계

import { COMMON_QUESTIONS, SURVEY_BY_CATEGORY } from '/src/constants/feedbacksSurvey'

// === 목업 플래그
const USE_MOCK = true;

// 지연 모의
const sleep = (ms = 300) => new Promise(r => setTimeout(r, ms));

// 카테고리별 상품 목업
const MOCK_PRODUCTS = {
  '전자제품': [
    { id: 101, name: '휴대용 미니 공기청정기' },
    { id: 102, name: '무선 진동 드라이버' },
  ],
  '화장품': [
    { id: 201, name: '저자극 데일리 토너' },
    { id: 202, name: '롱웨어 쿠션 파운데이션' },
  ],
  '무형자산(플랫폼)': [
    { id: 301, name: '업무 협업 SaaS 베이직' },
  ],
  '밀키트': [
    { id: 401, name: '프리미엄 라자냐 밀키트' },
  ],
};

// 랜덤 유틸(목업)
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// 별점 카운트(1~5)
const mockStarCounts = () => {
  const counts = [0,0,0,0,0].map(() => rand(0, 10));
  const sum = counts.reduce((a,b)=>a+b,0) || 1;
  const weighted = counts.reduce((acc,c,i)=> acc + c*(i+1), 0);
  const avg = Number((weighted / sum).toFixed(2));
  return { counts, avg, total: sum };
};

export async function fetchProductsByCategory(category) {
  if (!USE_MOCK) {
    // TODO: 실제 API 호출
    // const { data } = await api.get('/api/seller/feedbacks/products', { params: { category } });
    // return data;
  }
  await sleep();
  return MOCK_PRODUCTS[category] || [];
}

/**
 * 피드백 통계 요약 + 차트 데이터
 * 반환 스키마:
 * {
 *   summary: { delivered, written, writeRate, reported, reportRate, expired, avgWriteDays },
 *   demographics: [{name:'10대', value: n}, ...],
 *   stars: {
 *     distribution: [{score:1,count:n}, ...],
 *     overallAvg: 3.85,
 *     byQuestion: [{ key, label, avg }, ...],
 *   },
 *   lastGeneratedAt: '2025-08-29 00:00',
 *   aiDaily: [{date:'2025-08-24', text:'...'}, ...] // 신고 제외 가정
 * }
 */
export async function fetchFeedbackStats({ category, productId }) {
  if (!USE_MOCK) {
    // TODO: 실제 API 호출
    // const { data } = await api.get('/api/seller/feedbacks/stats', { params: { category, productId } });
    // return data;
  }
  await sleep();

  // --- 목업 생성 ---
  const delivered = rand(10, 40);
  const written = rand(0, delivered);
  const reported = rand(0, Math.floor(written * 0.2));
  const expired = delivered - written;
  const writeRate = delivered ? Math.round((written / delivered) * 100) : 0;
  const reportRate = written ? Math.round((reported / written) * 100) : 0;
  const avgWriteDays = Number((Math.random() * 5 + 1).toFixed(1)); // 1~6일 사이

  const demo = [
    { name: '10대', value: rand(0, 3) },
    { name: '20대', value: rand(1, 8) },
    { name: '30대', value: rand(1, 8) },
    { name: '40대', value: rand(0, 6) },
    { name: '50대+', value: rand(0, 4) },
  ];

  const star = mockStarCounts();
  const distribution = [1,2,3,4,5].map((s, i) => ({ score: s, count: star.counts[i] }));
  const overallAvg = star.avg;

  const qs = [...COMMON_QUESTIONS, ...(SURVEY_BY_CATEGORY[category] || [])];
  const byQuestion = qs.map(q => ({ key: q.key, label: q.label, avg: Number((Math.random() * 2 + 3).toFixed(2)) })); // 3.00~5.00

  const today = new Date();
  const pad = n => (n<10?'0'+n:n);
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const lastGeneratedAt = `${ymd(today)} 00:00`;

  const aiDaily = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today.getTime() - (6 - i) * 86400000);
    return {
      date: ymd(d),
      text: `요약(${ymd(d)}): 배송, 사용성, 가격 만족 키워드가 주로 언급되었습니다. 신고 피드백 제외.`,
    };
  });

  return {
    summary: { delivered, written, writeRate, reported, reportRate, expired, avgWriteDays },
    demographics: demo,
    stars: { distribution, overallAvg, byQuestion },
    lastGeneratedAt,
    aiDaily,
  };
}


/** 피드백 신고 */
export const ReportFeedback = async ({ feedbackId, reason }) => {
  if (!feedbackId) throw new Error('feedbackId가 필요합니다.')
  const body = { reason }

  // 레포별 엔드포인트 차이 방어(우선순위)
  const candidates = [
    `/api/seller/feedbacks/${feedbackId}/report`,
    `/api/feedbacks/${feedbackId}/report`,
    `/api/admin/feedbacks/${feedbackId}/report`,
  ]

  let lastErr
  for (const url of candidates) {
    try {
      const { data } = await api.post(url, body)
      return data // { id, reportStatus: 'PENDING', ... } 등을 기대
    } catch (e) {
      lastErr = e
      const st = e?.response?.status
      if (st !== 404 && st !== 405) throw e
    }
  }
  throw lastErr
}
export const submitFeedback = (payload) =>
  api.post(`/api/feedbacks`, payload).then(r => r.data);

/**
 * (신규) 현재 로그인된 사용자가 작성한 모든 피드백 목록을 가져옵니다.
 * @returns {Promise<Array>} 피드백 목록
 */
export const getMyFeedbacks = () => 
  api.get('/api/me/feedbacks').then(r => r.data);

/**
 * (신규) 특정 피드백의 상세 정보를 ID로 조회합니다.
 * @param {number | string} feedbackId 피드백 ID
 * @returns {Promise<object>} 피드백 상세 정보
 */
export const getFeedbackDetail = (feedbackId) =>
  api.get(`/api/feedbacks/${feedbackId}`).then(r => r.data);
