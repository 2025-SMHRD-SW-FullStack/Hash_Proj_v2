// seller 통계

export const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d }
export const ymd = (d) => new Date(d).toISOString().slice(0,10)
export const rangeDays = (days = 14) => {
  const end = startOfToday()
  const arr = []
  for (let i = days - 1; i >= 0; i--) { const t = new Date(end); t.setDate(end.getDate() - i); arr.push(ymd(t)) }
  return arr
}
export const KRW = new Intl.NumberFormat('ko-KR')
export const shortNum = (n) =>
  n >= 100000000 ? `${Math.round(n/10000000)/10}억`
: n >= 10000      ? `${Math.round(n/1000)/10}만`
: `${n}`
