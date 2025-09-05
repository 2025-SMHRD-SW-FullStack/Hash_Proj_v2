// /src/components/seller/charts/RatingsBar.jsx
import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { CHART } from '../../../constants/chartTheme'

// ✔︎ 긴 라벨을 2~3줄로 나눠 그려주는 커스텀 Tick
function MultiLineTick({ x, y, payload, maxChars = 8 }) {
  const label = String(payload?.value ?? '')
  const parts =
    label.split(/[\s/·()]+/).filter(Boolean) // 공백/슬래시/점 구분자 기준 분리
    || [label]

  const lines = parts.length > 1
    ? parts
    : (label.match(new RegExp(`.{1,${maxChars}}`, 'g')) || [label])

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill={CHART.mono.axis} fontSize={12}>
        {lines.map((ln, i) => (
          <tspan key={i} x={0} dy={i === 0 ? 0 : 14}>{ln}</tspan>
        ))}
      </text>
    </g>
  )
}

/** 별점 분포(1~5) */
export function RatingsDistribution({ data = [], colors, xKey = 'score', yKey = 'count', barColor }) {
  const palette = colors?.length ? colors : CHART.palette
  const fill = barColor || palette[0]
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="flex h-[280px] items-center justify-center rounded-lg border text-sm text-gray-500">데이터가 없습니다.</div>
  }
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={CHART.mono.grid} strokeDasharray="3 3" />
          <XAxis dataKey={xKey} stroke={CHART.mono.axis} tickMargin={10} />
          <YAxis allowDecimals={false} stroke={CHART.mono.axis} />
          <Tooltip />
          <Bar dataKey={yKey} fill={fill} isAnimationActive={false} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** 각 문항 평균 별점 (가로 막대) */
export function QuestionAverages({ data = [], colors, nameKey = 'label', valueKey = 'avg', barColor }) {
  const palette = colors?.length ? colors : CHART.palette
  const fill = barColor || palette[1]
  const chartData = Array.isArray(data)
    ? data.map(d => ({ name: d[nameKey] ?? d.label, avg: d[valueKey] ?? d.avg }))
    : []

  if (chartData.length === 0) {
    return <div className="flex h-[320px] items-center justify-center rounded-lg border text-sm text-gray-500">데이터가 없습니다.</div>
  }

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ left: 16, right: 16 }}>
          <CartesianGrid stroke={CHART.mono.grid} strokeDasharray="3 3" />
          {/* ✅ 각도 0° + 커스텀 Tick으로 줄바꿈 */}
          <XAxis
            dataKey="name"
            interval={0}
            height={70}
            tickMargin={10}
            tick={<MultiLineTick maxChars={8} />}
            stroke={CHART.mono.axis}
          />
          <YAxis domain={[0, 5]} stroke={CHART.mono.axis} />
          <Tooltip />
          <Bar dataKey="avg" fill={fill} isAnimationActive={false} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
