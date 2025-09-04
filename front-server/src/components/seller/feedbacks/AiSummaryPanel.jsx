// src/components/seller/feedbacks/AiSummaryPanel.jsx
import React, { useMemo, useState, useEffect } from 'react'
import Button from '../../common/Button'

/**
 * props:
 *  - aiDaily: [{ date:'YYYY-MM-DD', text:'...' }, ...]
 *  - lastGeneratedAt: 'YYYY-MM-DD HH:mm' (선택)
 */
export default function AiSummaryPanel({ aiDaily = [], lastGeneratedAt }) {
  // ── 날짜 헬퍼
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const parse = (s) => {
    const [y, m, d] = String(s || '').split('-').map(Number)
    const dt = new Date(y || 1970, (m || 1) - 1, d || 1)
    dt.setHours(0, 0, 0, 0)
    return dt
  }
  const addDays = (s, n) => {
    const d = parse(s)
    d.setDate(d.getDate() + n)
    return ymd(d)
  }
  const clampDate = (s, min, max) => (min && s < min ? min : max && s > max ? max : s)

  const today = useMemo(() => ymd(new Date()), [])

  // ── 날짜 목록(정렬)
  const sortedDates = useMemo(
    () => [...aiDaily.map(d => d.date)].filter(Boolean).sort(),
    [aiDaily]
  )
  const minDate = sortedDates[0] || null
  const maxDate = sortedDates[sortedDates.length - 1] || null
  const lastDate = maxDate || today

  const [selectedDate, setSelectedDate] = useState(lastDate)

  // 데이터 바뀌면 선택값을 범위에 맞게 보정
  useEffect(() => {
    setSelectedDate((s) => clampDate(s || lastDate, minDate || lastDate, maxDate || lastDate))
  }, [minDate, maxDate, lastDate])

  const findItem = (date) => aiDaily.find(d => d.date === date)
  const current = findItem(selectedDate)

  // ── 하루씩 이동 (목록에 없어도 이동 → "요약 없음" 표시)
  const prevDisabled = !!minDate && selectedDate <= minDate
  const nextDisabled = !!maxDate && selectedDate >= maxDate

  const goPrev = () => {
    if (prevDisabled) return
    setSelectedDate((s) => clampDate(addDays(s, -1), minDate, maxDate))
  }
  const goNext = () => {
    if (nextDisabled) return
    setSelectedDate((s) => clampDate(addDays(s, +1), minDate, maxDate))
  }
  const goToday = () => {
    const t = clampDate(today, minDate || today, maxDate || today)
    setSelectedDate(t)
  }

  return (
    <div>
      {/* 상단: 달력(날짜 선택) */}
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
            onClick={goToday}
          >
            오늘
          </Button>
        </div>
      </div>

      {/* 하단: 선택된 날짜의 요약 */}
      <div className="mt-3 rounded-lg border p-4">
        <div className="mb-1 text-sm font-medium">{selectedDate}</div>
        {current ? (
          <p className="whitespace-pre-wrap text-sm text-gray-800">{current.text}</p>
        ) : (
          <p className="text-sm text-gray-500">
            해당 일자의 요약이 없습니다. (생성되지 않았거나 신고 제외됨)
          </p>
        )}
      </div>
    </div>
  )
}
