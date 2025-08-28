import React, { useMemo, useState } from 'react';
import Button from '/src/components/common/Button';
import { buildDailySalesSeries } from '/src/util/sales';
import { KRW, shortNum } from '/src/util/datetime';
import LineBase from "./charts/LineBase";

const METRICS = [
  { key: 'amount', label: '결제금액', yTick: (v) => shortNum(v), tip: (v) => `${KRW.format(v)}원` },
  { key: 'orderCount', label: '결제건수', yTick: (v) => v, tip: (v) => `${v}건` },
  { key: 'buyerCount', label: '결제자수', yTick: (v) => v, tip: (v) => `${v}명` },
]

export default function SalesChartCard({ orders = [], days = 14, box = '' }) {
  const [metric, setMetric] = useState('amount')
  const data = useMemo(() => buildDailySalesSeries(orders, days), [orders, days])
  const active = METRICS.find(m => m.key === metric)

  return (
    <section className={`${box} md:col-span-2`}>
      <h2 className="mb-2 text-base font-semibold">스토어 매출 통계</h2>

      <div className="mb-2 flex flex-wrap gap-2">
        {METRICS.map(m => (
          <Button key={m.key}
            onClick={() => setMetric(m.key)}
            className={`rounded-md border px-3 py-1 text-sm
              ${metric === m.key ? 'bg-[#9DD5E9] text-white border-[#9DD5E9]' : 'bg-white'}`}>
            {m.label}
          </Button>
        ))}
      </div>

      <div className="h-[220px] rounded-md border border-dashed">
        <LineBase
          data={data}
          dataKey={metric}
          yTickFormatter={active.yTick}
          // 툴팁 값 + 표시 이름(결제금액/결제건수/결제자수)
          tooltipFormatter={(v) => [active.tip(v), active.label]}
        />
      </div>
    </section>
  )
}
