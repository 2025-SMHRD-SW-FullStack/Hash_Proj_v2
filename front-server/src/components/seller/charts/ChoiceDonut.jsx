// /src/components/seller/charts/ChoiceDonut.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, PieChart, Pie, Tooltip, Legend, Cell } from 'recharts'
import * as AgePalette from './AgeDonut'
import { CHART } from '../../../constants/chartTheme'

const r1 = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : 0)

export default function ChoiceDonut({
  label,
  slices = [],            // [{ label: '예', ratio: 70.0 }, { label: '무응답', ratio: 10.0 }, ...]
  height = 180,
  innerRadius = 48,
  outerRadius = 70,
  showLegend = true,
}) {
  const palette =
    (Array.isArray(AgePalette.AGE_DONUT_COLORS) && AgePalette.AGE_DONUT_COLORS.length
      ? AgePalette.AGE_DONUT_COLORS
      : CHART?.palette) ||
    ['#86efac', '#93c5fd', '#fca5a5', '#fcd34d', '#c4b5fd', '#a7f3d0', '#e5e7eb']

  const data = useMemo(
    () => (Array.isArray(slices) ? slices : []).map(s => ({ label: s.label, ratio: r1(s.ratio) })),
    [slices]
  )

  // 반응형: 데스크톱=가로(넘치면 가로 스크롤), 모바일(≤480px)=세로
  const getIsMobile = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches
  const [isMobile, setIsMobile] = useState(getIsMobile())
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(max-width: 480px)')
    const onChange = (e) => setIsMobile(e.matches)
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else mql.addListener(onChange)
    setIsMobile(mql.matches)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [])

  const legendLayout = isMobile ? 'vertical' : 'horizontal'
  const legendHeight = isMobile ? Math.min(28 * data.length, 140) : 32
  const legendWrapperStyle = isMobile
    ? undefined
    : { width: '100%', whiteSpace: 'nowrap', overflowX: 'auto', overflowY: 'hidden' }
  const computedHeight = isMobile ? height + Math.max(0, legendHeight - 32) : height

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-2 text-sm font-medium">{label}</div>
      <ResponsiveContainer width="100%" height={computedHeight}>
        <PieChart>
          <Pie
            data={data}
            dataKey="ratio"
            nameKey="label"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            strokeWidth={2}
            isAnimationActive={false}
            label={false}        // ← 라벨 완전히 비활성화
            labelLine={false}    // ← 라벨 선도 비활성화
          >
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => `${r1(v)}%`} />
          {showLegend && (
            <Legend
              layout={legendLayout}
              verticalAlign="bottom"
              align="center"
              iconSize={isMobile ? 12 : 10}
              height={legendHeight}
              wrapperStyle={legendWrapperStyle}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
