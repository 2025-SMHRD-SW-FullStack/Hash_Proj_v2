import api from '/src/config/axiosInstance'

/** 일별 정산 요약 */
export const fetchDailySettlementSummary = async (dateYmd) => {
  try {
    const { data, status } = await api.get('/api/seller/settlements/daily/summary', {
      params: { date: dateYmd },
      validateStatus: () => true, // 모든 상태 코드 허용
    })
    
    // API 호출 실패 시 기본값 반환
    if (status < 200 || status >= 300) {
      console.warn(`정산 요약 API 호출 실패 (${dateYmd}): ${status}`)
      return {
        day: dateYmd,
        ordersCount: 0,
        itemTotal: 0,
        feedbackTotal: 0,
        platformFee: 0,
        payoutTotal: 0
      }
    }
    
    // { day, ordersCount, itemTotal, feedbackTotal, platformFee, payoutTotal }
    return {
      day: data?.day || dateYmd,
      ordersCount: Number(data?.ordersCount ?? 0),
      itemTotal: Number(data?.itemTotal ?? 0),
      feedbackTotal: Number(data?.feedbackTotal ?? 0),
      platformFee: Number(data?.platformFee ?? 0),
      payoutTotal: Number(data?.payoutTotal ?? 0)
    }
  } catch (error) {
    console.error(`정산 요약 로드 실패 (${dateYmd}):`, error)
    // 에러 시 기본값 반환
    return {
      day: dateYmd,
      ordersCount: 0,
      itemTotal: 0,
      feedbackTotal: 0,
      platformFee: 0,
      payoutTotal: 0
    }
  }
}

/** 일별 정산 상세 리스트 */
export const fetchDailySettlementList = async (dateYmd) => {
  try {
    const { data, status } = await api.get('/api/seller/settlements/daily/list', {
      params: { date: dateYmd },
      validateStatus: () => true, // 모든 상태 코드 허용
    })
    
    // API 호출 실패 시 빈 배열 반환
    if (status < 200 || status >= 300) {
      console.warn(`정산 상세 API 호출 실패 (${dateYmd}): ${status}`)
      return []
    }
    
    // [{ orderId, orderNo, confirmedAt, itemTotal, platformFee, feedbackTotal, payout, feedbackDone }]
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error(`정산 상세 로드 실패 (${dateYmd}):`, error)
    // 에러 시 빈 배열 반환
    return []
  }
}
