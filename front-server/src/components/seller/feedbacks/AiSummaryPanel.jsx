// /src/components/seller/feedbacks/AiSummaryPanel.jsx
import React, { useMemo, useState, useEffect } from 'react'
import Button from '../../common/Button'

/**
 * props:
 *  - aiDaily: [{
 *      date:'YYYY-MM-DD',
 *      headline: string,
 *      keyPointsJson: '["...","..."]',
 *      actionsJson:   '["...","..."]',
 *      fullSummary: string,       // Markdown/plain
 *      model: string,
 *      createdAt: ISO string
 *    }, ...]
 *  - lastGeneratedAt: ISO string | null
 */

// 날짜 유틸
const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseYMD = (s) => {
  const [y, m, d] = String(s || '').split('-').map(Number)
  const dt = new Date(y || 1970, (m || 1) - 1, d || 1)
  dt.setHours(0, 0, 0, 0)
  return dt
}
const addDays = (s, n) => {
  const d = parseYMD(s)
  d.setDate(d.getDate() + n)
  return ymd(d)
}
const clampDate = (s, min, max) => (min && s < min ? min : max && s > max ? max : s)

// JSON 파서(안전)
const safeParse = (json, fallback) => {
  try {
    const v = JSON.parse(json ?? '')
    return Array.isArray(v) ? v : fallback
  } catch { return fallback }
}

export default function AiSummaryPanel({ aiDaily = [], lastGeneratedAt }) {
  // 정렬된 날짜 목록
  const sortedDates = useMemo(
    () => [...aiDaily.map(d => d?.date)].filter(Boolean).sort(),
    [aiDaily]
  )
  const minDate = sortedDates[0] || null
  const maxDate = sortedDates[sortedDates.length - 1] || null

  // 기본 선택 날짜: lastGeneratedAt의 '날짜' → 없으면 목록의 최신 → 없으면 '어제'
  const defaultDate = useMemo(() => {
    if (lastGeneratedAt) {
      const d = new Date(lastGeneratedAt)
      return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
    }
    if (maxDate) return maxDate
    const y = new Date(); y.setDate(y.getDate() - 1)
    return ymd(y)
  }, [lastGeneratedAt, maxDate])

  const [selectedDate, setSelectedDate] = useState(defaultDate)
  useEffect(() => setSelectedDate((s) => clampDate(s || defaultDate, minDate || defaultDate, maxDate || defaultDate)),
    [defaultDate, minDate, maxDate])

  // 현재 선택된 날짜 데이터
  const current = useMemo(
    () => aiDaily.find(d => d?.date === selectedDate),
    [aiDaily, selectedDate]
  )

  // 이전/다음 이동 가능 여부
  const prevDisabled = !!minDate && selectedDate <= minDate
  const nextDisabled = !!maxDate && selectedDate >= maxDate

  const goPrev = () => { if (!prevDisabled) setSelectedDate(s => clampDate(addDays(s, -1), minDate, maxDate)) }
  const goNext = () => { if (!nextDisabled) setSelectedDate(s => clampDate(addDays(s, +1), minDate, maxDate)) }
  const goLatest = () => setSelectedDate(maxDate || defaultDate)

  // 표시용 데이터(구버전 호환: text 필드가 있으면 그걸 본문으로 사용)
  const keyPoints = useMemo(() => safeParse(current?.keyPointsJson, []), [current])
  const actions   = useMemo(() => safeParse(current?.actionsJson, []),   [current])
  const headline  = current?.headline || ''
  const fullBody  = current?.fullSummary || current?.text || ''

  return (
    <div>
      {/* 상단 컨트롤 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-gray-500">
          매일 0시에 생성 · 신고 피드백 제외
          {lastGeneratedAt ? <> · 마지막 생성: {lastGeneratedAt}</> : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="rounded-md border px-2 py-1 text-sm disabled:opacity-40"
            variant="admin"
            onClick={goPrev}
            disabled={prevDisabled}
            aria-label="이전 요약"
          >
            ←
          </Button>

          <input
            type="date"
            className="rounded-md border px-3 py-1 text-sm"
            value={selectedDate}
            min={minDate || undefined}
            max={maxDate || undefined}
            onChange={(e) => {
              const v = e.target.value
              setSelectedDate(clampDate(v, minDate || v, maxDate || v))
            }}
          />

          <Button
            type="button"
            className="rounded-md border px-2 py-1 text-sm disabled:opacity-40"
            variant="admin"
            onClick={goNext}
            disabled={nextDisabled}
            aria-label="다음 요약"
          >
            →
          </Button>

          <Button
            type="button"
            variant="admin"
            className="rounded-md border px-3 py-1 text-sm"
            onClick={goLatest}
          >
            최신
          </Button>
        </div>
      </div>

      {/* 본문 */}
      <div className="mt-3 rounded-lg border p-4">
        <div className="mb-1 text-sm font-medium">{selectedDate}</div>

        {!current ? (
          <p className="text-sm text-gray-500">
            해당 일자의 요약이 없습니다. (생성되지 않았거나 신고 제외됨)
          </p>
        ) : (
          <div className="space-y-3">
            {/* 헤드라인 */}
            {headline && <div className="text-base font-semibold">{headline}</div>}

            {/* 핵심 포인트 */}
            {keyPoints.length > 0 && (
              <>
                <div className="text-sm font-medium">핵심 포인트</div>
                <ul className="list-disc pl-5 text-sm">
                  {keyPoints.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </>
            )}

            {/* 권장 액션 */}
            {actions.length > 0 && (
              <>
                <div className="text-sm font-medium">권장 액션</div>
                <ul className="list-disc pl-5 text-sm">
                  {actions.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </>
            )}

            {/* 전문 */}
            {fullBody && (
              <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-800">
                {fullBody}
              </pre>
            )}

            <div className="text-xs text-gray-500">
              생성: {current?.createdAt || '-'} · 모델: {current?.model || '-'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
