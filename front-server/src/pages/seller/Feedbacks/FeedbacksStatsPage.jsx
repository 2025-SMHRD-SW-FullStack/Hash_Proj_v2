import React, { useEffect, useMemo, useState } from 'react'
import ProductPicker from '/src/components/seller/feedbacks/ProductPicker'
import AgeDonut from '/src/components/seller/charts/AgeDonut'
import { RatingsDistribution, QuestionAverages } from '/src/components/seller/charts/RatingsBar'
import { fetchFeedbackStats } from '/src/service/feedbackService'
import AiSummaryPanel from '../../../components/seller/feedbacks/AiSummaryPanel'
// ---- UI 토큰(프로젝트 톤과 맞춤)
const box = 'rounded-xl border bg-white p-4 shadow-sm text-gray-900'
const statNumber = 'text-2xl font-bold'
const statSub = 'text-xs text-gray-500'

export default function FeedbacksStatsPage() {
  const [picked, setPicked] = useState({ category: null, productId: null })
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  const load = async ({ category, productId }) => {
    if (!category || !productId) return
    setLoading(true)
    try {
      const res = await fetchFeedbackStats({ category, productId })
      setData(res)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(picked) }, [picked.category, picked.productId])

  const summary = data?.summary
  const stars = data?.stars
  const demo = data?.demographics

  const cards = useMemo(() => ([
    {
      title: '배송완료 건',
      main: summary?.delivered ?? '-',
      sub: '',
    },
    {
      title: '피드백 작성',
      main: summary ? `${summary.written}` : '-',
      sub: summary ? `작성률 ${summary.writeRate}%` : '',
    },
    {
      title: '신고완료',
      main: summary ? `${summary.reported}` : '-',
      sub: summary ? `신고율 ${summary.reportRate}% (작성 대비)` : '',
    },
    {
      title: '기간 만료(미작성)',
      main: summary ? `${summary.expired}` : '-',
      sub: summary ? `평균 작성 소요 ${summary.avgWriteDays}일` : '',
    },
  ]), [summary])

  return (
    <div className="mx-auto w-full max-w-[1120px] px-6 py-6">
      <h1 className="mb-4 text-xl font-semibold">피드백 통계</h1>

      {/* 선택 영역 */}
      <section className={`${box}`}>
        <ProductPicker value={picked} onChange={setPicked} />
        {loading && <p className="mt-2 text-sm text-gray-500">불러오는 중…</p>}
      </section>

      {/* 상단 요약 카드 */}
      <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
        {cards.map((c, i) => (
          <div key={i} className={`${box}`}>
            <div className="text-sm text-gray-600">{c.title}</div>
            <div className={statNumber}>{c.main}</div>
            {c.sub && <div className={statSub}>{c.sub}</div>}
          </div>
        ))}
      </section>

      {/* 하단 상세 */}
      <section className="mt-6 space-y-6">
        {/* 피드백 통계 */}
        <div className={`${box}`}>
          <h2 className="mb-3 text-base font-semibold">피드백 통계</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* 연령별 분포 - 도넛 */}
            <div>
              <h3 className="mb-2 text-sm font-medium">연령별 분포</h3>
              <AgeDonut data={demo || []} />
            </div>

            {/* 별점 분포 - 막대 */}
            <div>
              <h3 className="mb-2 text-sm font-medium">별점 분포</h3>
              <RatingsDistribution data={stars?.distribution || []} />
              <div className="mt-2 text-right text-sm text-gray-600">
                전체 평균: <span className="font-semibold">{stars?.overallAvg ?? '-'}</span> / 5
              </div>
            </div>
          </div>

          {/* 각 설문 별 평균 별점 */}
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-medium">각 설문 별 평균</h3>
            <QuestionAverages data={stars?.byQuestion || []} />
          </div>
        </div>

        {/* AI 요약 (자리만) */}
        <div className={`${box}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">AI 요약</h2>
            <div className="text-xs text-gray-500">
              매일 0시에 생성 · 신고 피드백 제외 · 마지막 생성: {data?.lastGeneratedAt || '-'}
            </div>
          </div>

          {/* AI 요약 (달력 + 해당일 요약) */}
          <div className={`${box}`}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold">AI 요약</h2>
            </div>

            <AiSummaryPanel
              aiDaily={data?.aiDaily || []}
              lastGeneratedAt={data?.lastGeneratedAt}
            />

            <p className="mt-3 text-xs text-gray-500">
              판매 기간 동안 날짜별 요약본이 누적됩니다. 피드백 작성 가능 마지막날 다음날 생성분이 최종 요약본입니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
