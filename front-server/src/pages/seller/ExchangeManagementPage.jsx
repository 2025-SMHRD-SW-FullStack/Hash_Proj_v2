// /src/pages/seller/ExchangeManagementPage.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '/src/components/common/Button'
import { fetchPendingExchanges, approveExchange, rejectExchange, shipExchange } from '/src/service/exchangeService'

export default function ExchangeManagementPage() {
  const navigate = useNavigate()
  const [exchanges, setExchanges] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 교환 목록 로드
  useEffect(() => {
    loadExchanges()
  }, [])

  const loadExchanges = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPendingExchanges()
      console.log('=== 교환 목록 디버깅 ===')
      console.log('API 응답:', data)
      console.log('교환 개수:', Array.isArray(data) ? data.length : '데이터가 배열이 아님')
      if (Array.isArray(data)) {
        data.forEach((ex, index) => {
          console.log(`교환 ${index + 1}:`, {
            id: ex.id,
            status: ex.status,
            productName: ex.product?.name,
            reasonText: ex.reasonText,
            createdAt: ex.createdAt
          })
        })
      }
      console.log('=======================')
      setExchanges(data)
    } catch (e) {
      console.error('교환 목록 로드 실패:', e)
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  // 교환 승인
  const handleApprove = async (exchangeId) => {
    try {
      await approveExchange(exchangeId, {})
      await loadExchanges() // 목록 새로고침
    } catch (e) {
      console.error('교환 승인 실패:', e)
      alert('교환 승인에 실패했습니다.')
    }
  }

  // 교환 반려
  const handleReject = async (exchangeId) => {
    const reason = prompt('반려 사유를 입력해주세요:')
    if (!reason) return

    try {
      await rejectExchange(exchangeId, { reason })
      await loadExchanges() // 목록 새로고침
    } catch (e) {
      console.error('교환 반려 실패:', e)
      alert('교환 반려에 실패했습니다.')
    }
  }

  // 교환 발송
  const handleShip = async (exchangeId) => {
    const carrier = prompt('택배사를 입력해주세요:')
    if (!carrier) return
    
    const invoiceNo = prompt('송장번호를 입력해주세요:')
    if (!invoiceNo) return

    try {
      await shipExchange(exchangeId, carrier, invoiceNo)
      await loadExchanges() // 목록 새로고침
    } catch (e) {
      console.error('교환 발송 실패:', e)
      alert('교환 발송에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">
          교환 목록을 불러오는데 실패했습니다.
          <Button onClick={loadExchanges} className="ml-4">다시 시도</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 상단 제목 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">교환 관리</h1>
        <p className="text-gray-600 mt-2">대기중인 교환 요청을 처리하세요</p>
      </div>

      {/* 교환 목록 */}
      <div className="bg-white rounded-lg shadow">
        {exchanges.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            대기중인 교환 요청이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    교환 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    요청자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사유
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    요청일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exchanges.map((exchange) => (
                  <tr key={exchange.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {exchange.product?.name || '상품명 없음'}
                      </div>
                      <div className="text-sm text-gray-500">
                        수량: {exchange.qty}개
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {exchange.orderItem?.order?.receiver || '수취인 없음'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {exchange.orderItem?.order?.phone || '연락처 없음'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {exchange.reasonText || '사유 없음'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {exchange.createdAt ? new Date(exchange.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          variant="admin"
                          size="sm"
                          onClick={() => handleApprove(exchange.id)}
                        >
                          승인
                        </Button>
                        <Button
                          variant="admin"
                          size="sm"
                          onClick={() => handleReject(exchange.id)}
                        >
                          반려
                        </Button>
                        <Button
                          variant="admin"
                          size="sm"
                          onClick={() => handleShip(exchange.id)}
                        >
                          발송
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="mt-6">
        <Button
          variant="admin"
          onClick={() => navigate('/seller')}
        >
          대시보드로 돌아가기
        </Button>
      </div>
    </div>
  )
}
