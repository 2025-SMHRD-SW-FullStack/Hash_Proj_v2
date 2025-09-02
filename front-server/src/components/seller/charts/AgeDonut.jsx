// /src/components/seller/charts/AgeDonut.jsx
import React from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { CHART } from '/src/constants/chartTheme'

/** 연령별 분포 도넛
 * props:
 *  - data: [{ name: string, value: number }]
 *  - colors?: string[]            // 기본: CHART.palette
 *  - dataKey?: string             // 기본: 'value'
 *  - nameKey?: string             // 기본: 'name'
 *  - innerRadius?: number|string  // 기본: 60
 *  - outerRadius?: number|string  // 기본: 100
 *  - showLegend?: boolean         // 기본: true
 */
export default function AgeDonut({
  data = [],
  colors,
  dataKey = 'value',
  nameKey = 'name',
  innerRadius = 60,
  outerRadius = 100,
  showLegend = true,
}) {
  const palette = colors?.length ? colors : CHART.palette

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border text-sm text-gray-500">
        데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            isAnimationActive={false}
          >
            {data.map((_, idx) => (
              <Cell
                key={idx}
                fill={palette[idx % palette.length]}
                stroke="#fff"
                strokeWidth={1}
              />
            ))}
          </Pie>
          <Tooltip />
          {showLegend && <Legend iconType="circle" />}
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
