import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { confirmAdPayment } from '/src/service/adsService'

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
      <h1 className="text-2xl font-semibold mb-4">광고 결제 결과</h1>

      {phase === 'processing' && (
        <div className="rounded-lg bg-gray-50 text-gray-700 p-4">{msg}</div>
      )}

      {phase === 'success' && (
        <div className="rounded-lg bg-green-50 text-green-700 p-4">
          <div className="font-medium mb-1">{msg}</div>
          {result && (
            <div className="text-sm space-y-1">
              <div>
                <span className="font-medium">예약번호</span>: {result.bookingId}
              </div>
              <div>
                <span className="font-medium">결제키</span>: {result.paymentKey}
              </div>
              <div>
                <span className="font-medium">결제금액</span>: {Number(result.amount).toLocaleString()}원
              </div>
              <div>
                <span className="font-medium">승인시각</span>: {result.approvedAt}
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'error' && (
        <div className="rounded-lg bg-red-50 text-red-700 p-4">
          <div className="font-medium mb-1">결제 처리 실패</div>
          <div className="text-sm whitespace-pre-line">{msg}</div>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button onClick={() => navigate('/seller')} className="h-10 px-4 rounded-lg border hover:bg-gray-50">
          셀러 홈으로
        </button>
        <button onClick={() => navigate(-1)} className="h-10 px-4 rounded-lg border hover:bg-gray-50">
          이전으로
        </button>
      </div>
    </div>
  )
}

export default AdsPayCompletePage


