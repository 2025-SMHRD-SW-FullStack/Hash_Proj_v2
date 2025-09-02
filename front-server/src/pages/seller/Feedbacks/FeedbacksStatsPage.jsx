// /src/pages/seller/Feedbacks/FeedbacksStatsPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import ProductPicker from '/src/components/seller/feedbacks/ProductPicker'
import AgeDonut from '/src/components/seller/charts/AgeDonut'
import { RatingsDistribution, QuestionAverages } from '/src/components/seller/charts/RatingsBar'
import { fetchFeedbackStats } from '/src/service/feedbackService'
import AiSummaryPanel from '/src/components/seller/feedbacks/AiSummaryPanel'

// ===== UI 토큰 (이 파일 내부 전용) =====
const box = 'rounded-xl border bg-white p-5 shadow-sm text-gray-900'
const statNumber = 'text-2xl font-bold'
const statSub = 'text-xs text-gray-500'
// 작은 화면에서만 가로 스크롤(데스크톱은 보통 보이게)
const scrollXDown = 'md:overflow-visible max-md:overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export default function FeedbacksStatsPage() {
  const [picked, setPicked] = useState({ category: null, productId: null })
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  const load = useCallback(async ({ category, productId }) => {
    if (!category || !productId) return
    setLoading(true)
    try {
      const res = await fetchFeedbackStats({ category, productId })
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(picked) }, [picked.category, picked.productId, load])

  const summary = data?.summary
  const stars = data?.stars
  const demo = data?.demographics

  return (
    <div className="mx-auto w-full max-w-[1120px] px-8 py-6 max-lg:px-6 max-sm:px-3">
      <h1 className="mb-4 text-xl font-semibold">피드백 통계</h1>

      {/* 선택 영역 */}
      <section className={box} aria-busy={loading}>
        <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
          <ProductPicker value={picked} onChange={setPicked} />
          {loading && <p className="text-sm text-gray-500">불러오는 중…</p>}
        </div>
      </section>

      {/* 하단 상세 */}
      <section className="mt-6 space-y-6">
        {/* 피드백 통계 */}
        <div className={box}>
          <h2 className="mb-3 text-base font-semibold">피드백 통계</h2>

          {/* 데스크톱 2열 → 작은 화면 1열 */}
          <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
            {/* 연령별 분포 */}
            <div className={scrollXDown}>
              <div className="min-w-[280px]">
                <h3 className="mb-2 text-sm font-medium">연령별 분포</h3>
                <AgeDonut data={demo || []} />
              </div>
            </div>

            {/* 별점 분포 */}
            <div className={scrollXDown}>
              <div className="min-w-[320px]">
                <h3 className="mb-2 text-sm font-medium">별점 분포</h3>
                <RatingsDistribution data={stars?.distribution || []} />
                <div className="mt-2 text-right text-sm text-gray-600">
                  전체 평균: <span className="font-semibold">{stars?.overallAvg ?? '-'}</span> / 5
                </div>
              </div>
            </div>
          </div>

          {/* 각 설문 별 평균 — 작은 화면에서만 가로 스크롤 */}
          <div className={`mt-6 ${scrollXDown}`}>
            <div className="min-w-[360px]">
              <h3 className="mb-2 text-sm font-medium">각 설문 별 평균</h3>
              <QuestionAverages data={stars?.byQuestion || []} />
            </div>
          </div>
        </div>

        {/* AI 요약 */}
        <div className={box}>
          <div className="flex items-center justify-between gap-2 max-sm:flex-col max-sm:items-start">
            <h2 className="text-base font-semibold">AI 요약</h2>
            <div className="text-xs text-gray-500">
              매일 0시에 생성 · 신고 피드백 제외 · 마지막 생성: {data?.lastGeneratedAt || '-'}
            </div>
          </div>

          <div className="mt-3">
            <AiSummaryPanel aiDaily={data?.aiDaily || []} lastGeneratedAt={data?.lastGeneratedAt} />
            <p className="mt-3 text-xs text-gray-500">
              판매 기간 동안 날짜별 요약본이 누적됩니다. 피드백 작성 가능 마지막날 다음날 생성분이 최종 요약본입니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
