import React from "react";
import {
  ResponsiveContainer, LineChart, Line,
  CartesianGrid, XAxis, YAxis, Tooltip
} from "recharts";

export default function LineBase({ data, dataKey, yTickFormatter, tooltipFormatter }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tickMargin={6} />
        <YAxis tickFormatter={yTickFormatter} width={54} />
        <Tooltip
          formatter={tooltipFormatter}
          labelFormatter={(l, p) => p?.[0]?.payload?.date ?? l}
        />
        <Line type="monotone" dataKey={dataKey} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
