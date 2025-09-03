import api from '/src/config/axiosInstance'

/** 일별 정산 요약 */
export const fetchDailySettlementSummary = async (dateYmd) => {
  const { data } = await api.get('/api/seller/settlements/daily/summary', {
    params: { date: dateYmd },
  })
  // { day, ordersCount, itemTotal, feedbackTotal, platformFee, payoutTotal }
  return data
}

/** 일별 정산 상세 리스트 */
export const fetchDailySettlementList = async (dateYmd) => {
  const { data } = await api.get('/api/seller/settlements/daily/list', {
    params: { date: dateYmd },
  })
  // [{ orderId, orderNo, confirmedAt, itemTotal, platformFee, feedbackTotal, payout, feedbackDone }]
  return Array.isArray(data) ? data : []
}
