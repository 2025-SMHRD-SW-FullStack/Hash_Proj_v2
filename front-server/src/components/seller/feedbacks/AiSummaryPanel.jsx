import React, { useMemo } from 'react'

/**
 * props:
 *  - aiLive: { headline, keyPoints, actions, fullSummary, model, createdAt, date? } | null
 *  - loading: boolean
 */

const parseList = (v) => {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    try {
      const j = JSON.parse(v)
      if (Array.isArray(j)) return j
    } catch (_) {}
    return v.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  }
  return []
}

function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${className} text-gray-400`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
    </svg>
  )
}

export default function AiSummaryPanel({ aiLive = null, loading = false }) {
  const live = useMemo(() => {
    if (!aiLive) return null
    return {
      headline: aiLive.headline ?? '',
      keyPoints: parseList(aiLive.keyPoints ?? aiLive.keyPointsJson ?? []),
      actions: parseList(aiLive.actions ?? aiLive.actionsJson ?? []),
      fullSummary: aiLive.fullSummary ?? aiLive.text ?? '',
      model: aiLive.model ?? '',
      createdAt: aiLive.createdAt ?? null,
      date: aiLive.date ?? null,
    }
  }, [aiLive])

  // ===== 로딩 UI =====
  if (loading && !live) {
    return (
      <section className="rounded-lg border p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            실시간
          </span>
          <Spinner />
          <span className="text-sm text-gray-600">요약본 생성중…</span>
        </div>

        {/* 스켈레톤 */}
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-2/3 rounded bg-gray-100" />
          <div className="h-3 w-4/5 rounded bg-gray-100" />
          <div className="h-3 w-3/5 rounded bg-gray-100" />
          <div className="h-24 w-full rounded bg-gray-50" />
          <div className="pt-1 text-xs text-gray-300">모델: 준비 중…</div>
        </div>
      </section>
    )
  }

  // ===== 결과 표시 =====
  return (
    <section className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex items-center rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          실시간
        </span>
        <span className="text-xs text-gray-500">
          {live?.createdAt ? `생성: ${live.createdAt}` : '생성 완료'}
        </span>
      </div>

      {live ? (
        <div className="space-y-3">
          {live.date && <div className="text-sm text-gray-500">{live.date}</div>}
          {live.headline && <h3 className="text-base font-semibold">{live.headline}</h3>}

          {live.keyPoints?.length > 0 && (
            <div>
              <div className="mb-1 text-sm font-medium text-gray-700">핵심 포인트</div>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {live.keyPoints.map((li, i) => <li key={i}>{li}</li>)}
              </ul>
            </div>
          )}

          {live.actions?.length > 0 && (
            <div>
              <div className="mb-1 text-sm font-medium text-gray-700">권장 액션</div>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {live.actions.map((li, i) => <li key={i}>{li}</li>)}
              </ul>
            </div>
          )}

          {live.fullSummary && (
            <article className="prose prose-sm max-w-none text-gray-800">
              {live.fullSummary.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
            </article>
          )}

          <div className="pt-1 text-xs text-gray-400">모델: {live.model || '—'}</div>
        </div>
      ) : (
        <div className="text-sm text-gray-500">표시할 요약이 없습니다.</div>
      )}
    </section>
  )
}
