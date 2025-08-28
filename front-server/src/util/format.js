// 숫자 포맷 공용 함수
export const fmt = (n) => new Intl.NumberFormat('ko-KR').format(Number(n || 0))