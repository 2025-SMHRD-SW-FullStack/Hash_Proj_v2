//src/components/seller/feedbacks/AiSummaryPanel.jsx

import React, { useMemo, useState } from 'react'
import Button from '../../common/Button'
/**
 * props:
 *  - aiDaily: [{ date:'YYYY-MM-DD', text:'...' }, ...]
 *  - lastGeneratedAt: 'YYYY-MM-DD HH:mm' (선택)
 */
export default function AiSummaryPanel({ aiDaily = [], lastGeneratedAt }) {
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const today = useMemo(() => ymd(new Date()), [])
  const sortedDates = useMemo(
    () => [...aiDaily.map(d => d.date)].sort(),
    [aiDaily]
  )
  const lastDate = sortedDates[sortedDates.length - 1] || today

  const [selectedDate, setSelectedDate] = useState(lastDate)

  const findItem = (date) => aiDaily.find(d => d.date === date)
  const current = findItem(selectedDate)

  const goPrev = () => {
    if (!sortedDates.length) return
    const idx = sortedDates.indexOf(selectedDate)
    if (idx > 0) setSelectedDate(sortedDates[idx - 1])
  }
  const goNext = () => {
    if (!sortedDates.length) return
    const idx = sortedDates.indexOf(selectedDate)
    if (idx >= 0 && idx < sortedDates.length - 1) setSelectedDate(sortedDates[idx + 1])
  }
  const goToday = () => setSelectedDate(today)

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
            className="rounded-md border px-2 py-1 text-sm"
            variant="admin"
            onClick={goPrev}
            aria-label="이전 요약"
          >
            ←
          </Button>

          <input
            type="date"
            className="rounded-md border px-3 py-1 text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />

          <Button
            type="button"
            className="rounded-md border px-2 py-1 text-sm"
            variant="admin"
            onClick={goNext}
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
