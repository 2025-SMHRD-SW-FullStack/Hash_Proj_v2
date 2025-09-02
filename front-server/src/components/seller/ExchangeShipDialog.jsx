// /src/components/seller/ExchangeShipDialog

import React, { useState } from 'react'
import Button from '/src/components/common/Button'

export default function ExchangeShipDialog({ open, onClose, onSubmit, defaultCourier = '', defaultTrack = '' }) {
  const [courierCode, setCourierCode] = useState(defaultCourier)
  const [trackingNumber, setTrackingNumber] = useState(defaultTrack)
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const submit = async () => {
    if (!courierCode || !trackingNumber) { alert('택배사와 송장번호를 입력하세요.'); return }
    try {
      setSubmitting(true)
      await onSubmit({ courierCode, trackingNumber })
      onClose?.()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-xl">
        <h3 className="mb-3 text-base font-semibold">교환 발송 등록</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">택배사 코드</label>
            <input className="w-full rounded-lg border px-3 py-2" value={courierCode} onChange={e => setCourierCode(e.target.value)} placeholder="예: CJ, LOTTE, HDEX" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">송장번호</label>
            <input className="w-full rounded-lg border px-3 py-2" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="숫자/문자 조합" />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="whiteBlack" onClick={onClose}>취소</Button>
            <Button variant="admin" onClick={submit} disabled={submitting}>{submitting ? '등록 중…' : '등록'}</Button>
          </div>
        </div>
      </div>
    </>
  )
}
