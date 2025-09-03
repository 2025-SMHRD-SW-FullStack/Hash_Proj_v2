// /src/utils/apiTest.js
// 백엔드 API 연동 상태 테스트 유틸리티

import api from '/src/config/axiosInstance'
import { fetchSellerOrders, mapStatusForDisplay } from '/src/service/orderService'
import { fetchDailySettlementSummary } from '/src/service/settlementService'

/**
 * 셀러 주문 API 연동 상태 테스트
 */
export const testSellerOrderAPIs = async () => {
  const results = {
    ordersGrid: null,
    settlementSummary: null,
    errors: []
  }

  try {
    // 1. 주문 그리드 API 테스트
    console.log('🔍 테스트: 셀러 주문 그리드 API')
    const ordersRes = await fetchSellerOrders({ size: 5 })
    results.ordersGrid = {
      success: true,
      totalCount: ordersRes?.totalElements || 0,
      pageSize: ordersRes?.size || 0,
      sampleData: ordersRes?.content?.slice(0, 2) || []
    }
    console.log('✅ 주문 그리드 API 성공:', results.ordersGrid)
  } catch (error) {
    results.errors.push(`주문 그리드 API 실패: ${error.message}`)
    console.error('❌ 주문 그리드 API 실패:', error)
  }

  try {
    // 2. 정산 요약 API 테스트
    console.log('🔍 테스트: 일별 정산 요약 API')
    const today = new Date().toISOString().split('T')[0]
    const settlementRes = await fetchDailySettlementSummary(today)
    results.settlementSummary = {
      success: true,
      date: settlementRes?.day || today,
      data: settlementRes
    }
    console.log('✅ 정산 요약 API 성공:', results.settlementSummary)
  } catch (error) {
    results.errors.push(`정산 요약 API 실패: ${error.message}`)
    console.error('❌ 정산 요약 API 실패:', error)
  }

  // 3. 상태 매핑 테스트
  console.log('🔍 테스트: 상태 매핑 함수')
  const statusTests = [
    { input: 'PAID', expected: '결제완료' },
    { input: 'READY', expected: '배송준비중' },
    { input: 'IN_TRANSIT', expected: '배송중' },
    { input: 'DELIVERED', expected: '배송완료' },
    { input: 'CONFIRMED', expected: '구매확정' }
  ]

  const statusResults = statusTests.map(test => {
    const result = mapStatusForDisplay(test.input)
    const success = result === test.expected
    if (!success) {
      results.errors.push(`상태 매핑 실패: ${test.input} → ${result} (예상: ${test.expected})`)
    }
    return { input: test.input, output: result, expected: test.expected, success }
  })

  console.log('✅ 상태 매핑 테스트 완료:', statusResults)

  return results
}

/**
 * API 엔드포인트 가용성 체크
 */
export const checkAPIEndpoints = async () => {
  const endpoints = [
    '/api/seller/orders/grid',
    '/api/seller/settlements/daily/summary',
    '/api/seller/orders/grid/export'
  ]

  const results = {}
  
  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint, { 
        params: { size: 1 },
        validateStatus: () => true 
      })
      results[endpoint] = {
        available: response.status < 400,
        status: response.status,
        message: response.status < 400 ? '사용 가능' : `HTTP ${response.status}`
      }
    } catch (error) {
      results[endpoint] = {
        available: false,
        status: 'ERROR',
        message: error.message
      }
    }
  }

  return results
}

/**
 * 전체 API 연동 상태 요약
 */
export const getAPIConnectionStatus = async () => {
  console.log('🚀 백엔드 API 연동 상태 확인 시작...')
  
  const [orderTest, endpointCheck] = await Promise.all([
    testSellerOrderAPIs(),
    checkAPIEndpoints()
  ])

  const summary = {
    timestamp: new Date().toISOString(),
    orderAPIs: orderTest.ordersGrid?.success || false,
    settlementAPIs: orderTest.settlementSummary?.success || false,
    endpoints: endpointCheck,
    errors: orderTest.errors,
    overall: orderTest.errors.length === 0 && 
             orderTest.ordersGrid?.success && 
             orderTest.settlementSummary?.success
  }

  console.log('📊 API 연동 상태 요약:', summary)
  
  if (summary.overall) {
    console.log('🎉 모든 API가 정상적으로 연동되었습니다!')
  } else {
    console.log('⚠️ 일부 API 연동에 문제가 있습니다:', summary.errors)
  }

  return summary
}

// 개발 환경에서 자동 실행 (선택사항)
if (import.meta.env.DEV && import.meta.env.VITE_AUTO_TEST_API === 'true') {
  setTimeout(() => {
    getAPIConnectionStatus()
  }, 2000)
}
