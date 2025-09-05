// src/components/seller/feedbacks/FeedbackDetailContent.jsx
import React, { useEffect, useState } from 'react'
import { getSellerFeedbackDetail } from '../../../service/feedbackService'

const ymd = (s) => {
  if (!s) return '-'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return String(s).slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const reportLabel = (s) => {
  const v = String(s || '').toUpperCase()
  if (v === 'PENDING') return '신고대기'
  if (v === 'APPROVED') return '신고완료'
  if (v === 'REJECTED') return '신고거절'
  return '-' // 상세 DTO에 stateLabel이 있다면 그걸 쓰고 싶으면 이 부분 대체
}

export default function FeedbackDetailContent({ feedbackId }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!feedbackId) return
    let alive = true
    setLoading(true); setError(''); setData(null)
    getSellerFeedbackDetail(feedbackId)
      .then(d => { if (alive) setData(d) })
      .catch(e => setError(e?.response?.data?.message || e.message || '불러오기 실패'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [feedbackId])

  if (!feedbackId) return <div className="text-sm text-gray-500">피드백 ID가 없습니다.</div>
  if (loading)   return <div className="text-sm text-gray-500">불러오는 중…</div>
  if (error)     return <div className="text-sm text-rose-600">{error}</div>
  if (!data)     return null

  const {
    productName,
    buyer,
    reportStatus,           // PENDING / APPROVED / REJECTED / null
    feedbackContent,
    feedbackCreatedAt,      // 서버 DTO에 없으면 createdAt로 들어옴
    createdAt,
    images
  } = data

  const written = ymd(feedbackCreatedAt || createdAt)
  const imgs = Array.isArray(images) ? images : []

  return (
    <div className="grid grid-cols-[140px_1fr] gap-x-6 gap-y-4 text-sm">
      <div className="text-gray-500">상품명</div>
      <div className="font-medium">{productName || '-'}</div>

      <div className="text-gray-500">구매자</div>
      <div>{buyer || '-'}</div>

      <div className="text-gray-500">상태</div>
      <div>{reportLabel(reportStatus)}</div>

      <div className="text-gray-500">피드백 작성일</div>
      <div>{written}</div>

      <div className="text-gray-500">피드백 내용</div>
      <div className="whitespace-pre-wrap">{feedbackContent || '-'}</div>

      <div className="text-gray-500">이미지</div>
      <div className="flex flex-wrap gap-2">
        {imgs.length === 0 ? (
          <span className="text-gray-400">-</span>
        ) : (
          imgs.map((src, i) => (
            <a key={i} href={src} target="_blank" rel="noreferrer">
              <img
                src={src}
                alt={`feedback-${i}`}
                className="h-20 w-20 rounded-md object-cover border"
                loading="lazy"
              />
            </a>
          ))
        )}
      </div>
    </div>
  )
}
