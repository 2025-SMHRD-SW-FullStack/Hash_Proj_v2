//src/components/seller/FeedbackStatsCard.jsx

import React, { useMemo, useState } from 'react'
import Button from '/src/components/common/Button'
import DonutBase from '/src/components/common/charts/DonutBase'
import BarBase from '/src/components/common/charts/BarBase'
import { rangeDays } from '/src/util/datetime'

const donutModes = [
  { key:'status', label:'상태 분포' },
  { key:'rating', label:'평점 분포' },
]

export default function FeedbackStatsCard({ feedbacks = [], days = 14, box = '' }) {
  const [dm, setDm] = useState('status')

  const donutData = useMemo(() => {
    if (dm === 'rating') {
      const cnt = { 1:0,2:0,3:0,4:0,5:0 }
      for (const f of feedbacks) if (cnt[f.rating] != null) cnt[f.rating]++
      return Object.entries(cnt).map(([k,v]) => ({ name:`★${k}`, value:v }))
    }
    const map = new Map()
    for (const f of feedbacks) map.set(f.status, (map.get(f.status)||0)+1)
    return Array.from(map, ([name, value]) => ({ name, value }))
  }, [feedbacks, dm])

  const barData = useMemo(() => {
    const dates = rangeDays(days)
    const base = Object.fromEntries(
      dates.map(d => [d, { date:d, label:d.slice(5).replace('-','/'), count:0 }])
    )
    for (const f of feedbacks) {
      const d = (f.createdAt || '').slice(0,10)
      if (base[d]) base[d].count++
    }
    return dates.map(d => base[d])
  }, [feedbacks, days])

  return (
    <section className={box}>
      <h2 className="mb-2 text-base font-semibold">피드백 통계</h2>

      <div className="mb-2 flex gap-2">
        {donutModes.map(m=>(
          <Button key={m.key}
            onClick={()=>setDm(m.key)}
            className={`rounded-md border px-3 py-1 text-sm
              ${dm===m.key ? 'bg-[#9DD5E9] text-white border-[#9DD5E9]' : 'bg-white'}`}>
            {m.label}
          </Button>
        ))}
      </div>

      <div className="h-[200px] rounded-md border border-dashed mb-4">
        <DonutBase data={donutData}/>
      </div>

      <div className="h-[220px] rounded-md border border-dashed">
        <BarBase
          data={barData}
          dataKey="count"
          yTickFormatter={(v)=>v}
          tooltipFormatter={(v)=>[`${v}건`, '등록']}
        />
      </div>
    </section>
  )
}
