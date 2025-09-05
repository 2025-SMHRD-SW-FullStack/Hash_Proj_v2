import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { confirmAdPayment } from '../../../src/service/adsService'
import Button from '../../components/common/Button'

const AdsPayCompletePage = () => {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('processing') // 'processing' | 'success' | 'error'
  const [msg, setMsg] = useState('처리중…')
  const [result, setResult] = useState(null)

  useEffect(() => {
    const url = new URL(window.location.href)
    const paymentKey = url.searchParams.get('paymentKey')
    const orderId = url.searchParams.get('orderId')
    const amountStr = url.searchParams.get('amount')
    const bookingIdStr = url.searchParams.get('bookingId')

    if (!paymentKey || !orderId || !amountStr || !bookingIdStr) {
      setPhase('error')
      setMsg('필수 파라미터가 누락되었습니다. (paymentKey/orderId/amount/bookingId)')
      return
    }

    const amount = Number(amountStr)
    const bookingId = Number(bookingIdStr)
    if (!Number.isFinite(amount) || !Number.isFinite(bookingId)) {
      setPhase('error')
      setMsg('파라미터 형식이 올바르지 않습니다.')
      return
    }

    ;(async () => {
      try {
        setPhase('processing')
        setMsg('결제를 확정하고 있습니다…')
        const res = await confirmAdPayment({ paymentKey, orderId, amount, bookingId })
        setResult(res)
        setPhase('success')
        setMsg('결제가 완료되었습니다.')
      } catch (e) {
        setPhase('error')
        setMsg(e?.response?.data?.message || e?.message || '결제 확정 중 오류가 발생했습니다.')
      }
    })()
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">광고 결제 결과</h1>
        <p className="text-gray-600">광고 신청 및 결제 처리 결과를 확인하세요</p>
      </div>

      {phase === 'processing' && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-blue-800 font-medium text-lg">{msg}</div>
          <p className="text-blue-600 text-sm mt-2">잠시만 기다려주세요...</p>
        </div>
      )}

      {phase === 'success' && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-green-800 font-bold text-xl mb-1">{msg}</div>
            <p className="text-green-600">광고가 성공적으로 등록되었습니다!</p>
          </div>
          
          {result && (
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h3 className="font-semibold text-gray-900 mb-3">결제 상세 정보</h3>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">예약번호</span>
                  <span className="font-medium text-gray-900">{result.bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">주문번호</span>
                  <span className="font-medium text-gray-900">{result.orderId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">결제금액</span>
                  <span className="font-bold text-green-600">{Number(result.amount).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">승인시각</span>
                  <span className="font-medium text-gray-900">
                    {result.approvedAt ? new Date(result.approvedAt).toLocaleString('ko-KR') : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'error' && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="text-red-800 font-bold text-xl mb-1">결제 처리 실패</div>
            <p className="text-red-600">문제가 발생했습니다. 다시 시도해주세요.</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <h3 className="font-semibold text-gray-900 mb-3">오류 상세</h3>
            <div className="text-sm text-red-700 whitespace-pre-line bg-red-50 p-3 rounded">
              {msg}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        {phase === 'success' && (
          <Button onClick={() => navigate('/seller/ads/management')} className="w-full sm:w-auto">
            광고 관리하기
          </Button>
        )}
        <Button 
          variant="outline" 
          onClick={() => navigate('/seller')} 
          className="w-full sm:w-auto"
        >
          셀러 홈으로
        </Button>
        <Button 
          variant="unselected" 
          onClick={() => navigate(-1)} 
          className="w-full sm:w-auto"
        >
          이전으로
        </Button>
      </div>

      {/* 광고 관리 안내 */}
      {phase === 'success' && (
        <div className="mt-8 rounded-lg bg-blue-50 border border-blue-200 p-4">
          <h3 className="font-medium text-blue-900 mb-2">📢 광고 관리 안내</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 광고 상태는 '광고 관리' 페이지에서 확인할 수 있습니다</li>
            <li>• 활성 광고는 일시정지하거나 재개할 수 있습니다</li>
            <li>• 광고 기간이 끝나면 자동으로 완료 상태가 됩니다</li>
            <li>• 문의사항이 있으시면 고객센터에 연락해주세요</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default AdsPayCompletePage


