PLATFORM_RULES = {
    "NAVER_STORE": """[플랫폼: 네이버 스토어]
- 구매경험 중심, 과장/광고성 표현 금지
- 핵심 사실 먼저, 해시태그 1~2개 허용
- 링크/외부유도 금지""",
    "COUPANG": """[플랫폼: 쿠팡]
- 간결/불릿 위주(두 문단 이내)
- 장점 1, 아쉬운 점 1 제시
- 과도한 이모지/과장 금지""",
    "BAEMIN": """[플랫폼: 배민]
- 배달/포장/온도/양 등 실사용 관점
- 주문 맥락 요약 + 재방문의사""",
    "ELEVEN_ST": """[플랫폼: 11번가]
- 구매/배송/포장/사용후기 순으로 간단명료
- 별점 암시 표현은 자제""",
}

DEFAULT_RULE = """[플랫폼: 일반]
- 경험 기반의 자연스러운 리뷰
- 과장/광고성 금지, 사실 위주
- 요약 → 디테일 → 한줄 총평"""

def build_platform_template(platform: str | None) -> str:
    plat = (platform or "").upper()
    return PLATFORM_RULES.get(plat, DEFAULT_RULE)
