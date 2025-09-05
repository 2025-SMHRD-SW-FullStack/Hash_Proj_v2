// /src/components/seller/feedbacks/ReportModal.jsx
import { useEffect, useState } from 'react'
import Modal from '../../common/Modal'
import Button from '../../common/Button'
import { reportFeedback } from '../../../service/feedbackService'

export default function ReportModal({
  open,
  onClose,
  feedbackId,
  defaultReason = '',
  onReported, // (result) => void
}) {
  const [reason, setReason] = useState(defaultReason)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [result, setResult] = useState(null) // ✅ 성공 응답 보관

  useEffect(() => {
    if (open) {
      setReason(defaultReason)
      setLoading(false)
      setError('')
      setDone(false)
      setResult(null)
    }
  }, [open, defaultReason])

  const canSubmit =
    !!feedbackId && reason.trim().length >= 5 && !loading

  const handleSubmit = async () => {
    if (!canSubmit) return

    // 1차 경고 확인
    const ok = window.confirm('신고 후 취소가 불가합니다. 진행할까요?')
    if (!ok) return

    try {
      setLoading(true)
      setError('')

      // ✅ 서버 신고
      const res = await reportFeedback({ feedbackId, reason: reason.trim() })

      // ✅ 여기서는 모달을 닫지 않음 (완료 화면을 보여주기 위함)
      setResult(res)
      setDone(true)
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || '신고에 실패했습니다.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ✅ 완료 화면의 "확인"에서만 상위 콜백을 호출
  const handleFinish = () => {
    if (onReported) onReported(result)
    else onClose?.()
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={done ? '신고 완료' : '피드백 신고'}>
      {!done ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">신고 사유</label>
            <textarea
              className="w-full resize-y rounded-md border p-3 leading-6 outline-none focus:ring"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="신고 사유를 최소 5자 이상 입력하세요."
            />
            <div className="mt-1 text-right text-xs text-gray-500">
              {reason.trim().length}자
            </div>
          </div>

          {error && <div className="text-sm text-rose-600">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={loading}>취소</Button>
            <Button variant="admin" onClick={handleSubmit} disabled={!canSubmit}>
              {loading ? '신고 중…' : '신고하기'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm">신고가 되었습니다. 슈퍼관리자가 검토 후 승인/거절 처리합니다.</p>
          <div className="flex justify-end">
            <Button variant="admin" onClick={handleFinish}>확인</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
