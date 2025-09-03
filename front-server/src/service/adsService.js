// /src/service/adsService.js
import api from '../config/axiosInstance'

// ✅ 백엔드 베이스 경로 한 곳에서 관리
//    서버가 '/api/ad' 라우트를 쓰면 아래를 '/api/ad' 로 바꿔주세요.
const ADS_BASE = '/api/ads'

/**
 * 현재 활성화된 광고 목록을 가져옵니다. (빈 슬롯은 하우스 광고로 채워짐)
 * @param {('MAIN_ROLLING'|'MAIN_SIDE'|'CATEGORY_TOP'|'ORDER_COMPLETE')} type - 가져올 광고 슬롯 타입
 * @returns {Promise<Array<{productId: number, bannerImageUrl: string, house: boolean}>>}
 */
export const getActiveAds = async (type) => {
  if (!type) return [];
  try {
    const { data } = await api.get(`${ADS_BASE}/active/filled`, { params: { type } });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching active ads for type ${type}:`, error);
    return []; // 에러 발생 시 빈 배열 반환
  }
};


/** 선택 불가 날짜(캘린더) 조회: from~to 범위 내에서 예약 불가 일자 세트 */
export const fetchAdUnavailableDates = async ({ type, category, startDate, endDate }) => {
  const params = {
    type,
    startDate, // 'YYYY-MM-DD'
    endDate,   // 'YYYY-MM-DD'
  }
  // CATEGORY_TOP일 때만 category 필수
  if (type === 'CATEGORY_TOP' && category) params.category = category

  const { data } = await api.get(`${ADS_BASE}/availability/calendar`, { params })
  // 서버가 Set을 내려도 JSON에선 배열로 직렬화될 가능성이 높음 → 배열로 정규화
  const arr = Array.isArray(data) ? data : Array.from(data || [])
  return new Set(arr.map(String)) // 'YYYY-MM-DD' 문자열 Set
}

/** 인벤토리 조회: 기간 동안 가용 슬롯 탐색 */
export const fetchAdInventory = async ({ type, category, startDate, endDate }) => {
  const params = { type, startDate, endDate }
  if (type === 'CATEGORY_TOP' && category) params.category = category
  const res = await api.get(`${ADS_BASE}/inventory`, { params })
  return res.data // [{ slotId, position, available }]
}

/** 예약 생성(결제 전 선점 단계) */
export const createAdBooking = async ({ slotId, productId, startDate, endDate, bannerImageUrl, title, description }) => {
  const payload = { 
    slotId, 
    productId, 
    startDate, 
    endDate,
    bannerImageUrl,
    title,
    description
  }
  const res = await api.post(`${ADS_BASE}/book`, payload)
  return res.data // { bookingId, price, status }
}

/** 광고 생성 (이미지 업로드 포함) */
export const createAdWithImage = async ({ 
  type, 
  category, 
  productId, 
  startDate, 
  endDate, 
  imageFile, 
  title, 
  description 
}) => {
  // 1. 이미지 업로드
  let imageUrl = null
  if (imageFile) {
    const { uploadImages } = await import('./uploadService')
    const uploadResult = await uploadImages('AD', [imageFile])
    imageUrl = uploadResult[0]?.url
    if (!imageUrl) throw new Error('이미지 업로드에 실패했습니다.')
  }

  // 2. 인벤토리 조회
  const inventory = await fetchAdInventory({ type, category, startDate, endDate })
  const available = inventory.find(d => d.available)
  if (!available) throw new Error('선택한 기간에는 가용 슬롯이 없습니다.')

  // 3. 예약 생성
  const booking = await createAdBooking({
    slotId: available.slotId,
    productId,
    startDate,
    endDate,
    bannerImageUrl: imageUrl,
    title: title || undefined,
    description: description || undefined
  })

  return { ...booking, imageUrl }
}

// (선택) 내 예약 목록
export const fetchMyAdBookings = async ({ page = 0, size = 20 } = {}) => {
  const res = await api.get(`${ADS_BASE}/me/bookings`, { params: { page, size } })
  return res.data
}

/** (선택) Toss 결제 승인 확인 */
export const confirmAdPayment = async ({ paymentKey, orderId, amount, bookingId }) => {
  const res = await api.post('/api/payments/toss/ad/confirm', {
    paymentKey, orderId, amount, bookingId,
  })
  return res.data // { bookingId, paymentKey, amount, approvedAt }
}

/** 내 광고 목록 조회 */
export const fetchMyAds = async ({ page = 0, size = 20, status } = {}) => {
  const params = { page, size }
  if (status) params.status = status
  const res = await api.get(`${ADS_BASE}/me`, { params })
  return res.data
}

/** 광고 상태 변경 */
export const updateAdStatus = async ({ adId, status }) => {
  const res = await api.patch(`${ADS_BASE}/${adId}/status`, { status })
  return res.data
}
