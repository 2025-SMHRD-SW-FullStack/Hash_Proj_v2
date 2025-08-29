import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

/** 별점 분포(1~5) 막대 그래프 */
export function RatingsDistribution({ data = [] }) {
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="score" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** 각 문항 평균 별점 막대 그래프 (세로) */
export function QuestionAverages({ data = [] }) {
  const chartData = data.map(d => ({ name: d.label, avg: d.avg }))
  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ left: 16, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={70} />
          <YAxis domain={[0, 5]} />
          <Tooltip />
          <Bar dataKey="avg" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
