import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import ProductPicker from '../../../components/seller/feedbacks/ProductPicker'
import AgeDonut from '../../../components/seller/charts/AgeDonut'
import { RatingsDistribution, QuestionAverages } from '../../../components/seller/charts/RatingsBar'
import { fetchFeedbackStats, computeAiSummaryNow } from '../../../service/feedbackService'
import AiSummaryPanel from '../../../components/seller/feedbacks/AiSummaryPanel'
import ChoiceDonut from '../../../components/seller/charts/ChoiceDonut'
import { useNavigate } from 'react-router-dom'
import Button from '../../../components/common/Button'

const box = 'rounded-xl border bg-white p-5 shadow-sm text-gray-900'
const scrollXDown = 'md:overflow-visible max-md:overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export default function FeedbacksStatsPage() {
  const [picked, setPicked] = useState({ category: null, productId: null })
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const navigate = useNavigate();

  // AI 요약 (캐시 + 레이스 방지)
  const [aiLive, setAiLive] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const aiCacheRef = useRef(new Map()) // productId -> aiLive
  const reqSeqRef = useRef(0)

  const r1 = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : null)

  const load = useCallback(async ({ productId }) => {
    if (!productId) return
    setLoading(true)
    try {
      const res = await fetchFeedbackStats({ productId })
      setData(res)

      // 캐시 있으면 바로 보여주고, 없으면 비워서 로딩 UI만 노출
      const cached = aiCacheRef.current.get(productId)
      setAiLive(cached || null)

      const mySeq = ++reqSeqRef.current
      setAiLoading(true)
      computeAiSummaryNow({ productId })
        .then((ai) => {
          if (reqSeqRef.current !== mySeq) return
          setAiLive(ai)
          aiCacheRef.current.set(productId, ai)
        })
        .catch((e) => {
          if (reqSeqRef.current !== mySeq) return
          console.warn('[AI live] compute failed:', e?.response?.data || e?.message || e)
          setAiLive(null) // 실패 시에도 로딩 종료 후 비워둠
        })
        .finally(() => {
          if (reqSeqRef.current === mySeq) setAiLoading(false)
        })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(picked) }, [picked.productId, load])

  const summary = data?.summary
  const stars = data?.stars
  const demo = data?.demographics

  const sampleCount = useMemo(() => {
    const fromSummary = Number(summary?.totalCount ?? 0)
    if (fromSummary > 0) return fromSummary
    return (stars?.distribution || []).reduce((s, d) => s + (Number(d?.count) || 0), 0)
  }, [summary, stars])

  return (
    <div className="mx-auto w-full max-w-7xl md:px-6 lg:px-8">
      <div className='flex items-center space-x-2 justify-between'>
        <h1 className="mb-4 text-xl font-semibold">피드백 통계</h1>
        <Button variant='unselected' className='text-sub' onClick={() => navigate('/seller/feedbacks/manage')} >피드백 관리 보기</Button>
      </div>


      {/* 선택 영역 */}
      <section className={box} aria-busy={loading}>
        <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
          <ProductPicker value={picked} onChange={setPicked} />
          {loading && <p className="text-sm text-gray-500">불러오는 중…</p>}
        </div>
      </section>

      <section className="mt-6 space-y-6">
        {/* 피드백 통계 */}
        <div className={box}>
          <h2 className="mb-3 text-base font-semibold">피드백 통계</h2>

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
                  전체 평균{' '}
                  <span className="font-semibold">
                    {stars?.overallAvg != null ? r1(stars.overallAvg).toFixed(1) : '-'}
                  </span>{' '}
                  / 5
                  <span className="ml-2 text-gray-500">· 표본 {sampleCount}건</span>
                </div>
              </div>
            </div>
          </div>

          {/* 각 설문 별 평균 */}
          <div className={`mt-6 ${scrollXDown}`}>
            <div className="min-w-[360px]">
              <h3 className="mb-2 text-sm font-medium">각 설문 별 평균</h3>
              <QuestionAverages
                data={(stars?.byQuestionAvg || []).map(q => ({ ...q, avg: r1(q.avg) }))}
              />
            </div>
          </div>

          {/* 선택형 문항 분포 */}
          {Array.isArray(stars?.byQuestionChoice) && stars.byQuestionChoice.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-medium">선택형 문항 분포</h3>
              <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                {stars.byQuestionChoice.map((q, i) => (
                  <ChoiceDonut key={i} label={q.label} slices={q.slices} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI 요약 */}
        <div className={box}>
          <div className="flex items-center justify-between gap-2 max-sm:flex-col max-sm:items-start">
            <h2 className="text-base font-semibold">AI 요약</h2>
            <div className="text-xs text-gray-500">
              피드백 제출 시 자동 생성/갱신{aiLoading ? ' · 생성 중…' : ''}
            </div>
          </div>

          <div className="mt-3">
            <AiSummaryPanel aiLive={aiLive} loading={aiLoading} />
            <p className="mt-3 text-xs text-gray-500">생성 완료 시 자동으로 표시됩니다.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
