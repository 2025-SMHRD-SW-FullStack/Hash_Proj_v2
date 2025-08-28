// src/components/seller/charts/LineBase.jsx
import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

/**
 * 공용 라인 차트
 * props:
 *  - data: [{ [xKey]: '08-20', [yKey]: 123, ... }]
 *  - xKey: X축 키 (기본 'date')
 *  - yKey: Y축 키 (기본 'value')
 *  - unit: '원' | '건' | '명' | ''  (툴팁/축 단위)
 *  - height: 숫자(px) (기본 260)
 */
export default function LineBase({
  data = [],
  xKey = 'date',
  yKey = 'value',
  unit = '',
  height = 260,
}) {
  const formatNum = (n) =>
    typeof n === 'number' ? n.toLocaleString() : n ?? ''

  const formatYTick = (v) => {
    if (typeof v !== 'number') return v
    // 금액이면 천단위로
    if (unit === '원') return formatNum(v)
    return v
  }

  const tooltipValue = (v) => {
    if (v == null) return ''
    if (unit === '원') return `${formatNum(Number(v))}원`
    if (unit) return `${v}${unit}`
    return `${v}`
  }

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-md border text-sm text-gray-400"
        style={{ height }}
      >
        데이터가 없습니다
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 28 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis
            tickFormatter={formatYTick}
            label={
              unit
                ? { value: unit, angle: -90, position: 'insideLeft', offset: 10 }
                : undefined
            }
            width={50}
          />
          <Tooltip formatter={(v) => tooltipValue(v)} />
          <Line
            type="monotone"
            dataKey={yKey}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
