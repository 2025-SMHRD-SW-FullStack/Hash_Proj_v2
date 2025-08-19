BASE_TEMPLATE = """    [플랫폼: {platform}]
[톤: {tone} | 길이: {length_hint}자 내외]
[핵심키워드: {keywords_text}]

{intro}

{body}

{outro}
"""

PLATFORM_HINTS = {
    "instagram": {
        "intro": "오늘 다녀온 {brand} {menu} 솔직 리뷰!",
        "body": "포인트:\n{bullets}",
        "outro": "#내돈내산 #솔직후기 {hashtags}",
        "length": 900,
    },
    "naver_blog": {
        "intro": "{brand} {menu} 방문기 정리했습니다.",
        "body": "{bullets}",
        "outro": "방문에 도움이 되셨다면 공감 부탁드려요.",
        "length": 1500,
    },
    "kakao": {
        "intro": "{brand} {menu} 빠르게 요약!",
        "body": "{bullets}",
        "outro": "",
        "length": 800,
    },
    "coupang": {
        "intro": "{brand} 리뷰 요약",
        "body": "{bullets}",
        "outro": "",
        "length": 600,
    },
    "google_maps": {
        "intro": "{brand} 방문 요약",
        "body": "{bullets}",
        "outro": "방문 시 참고하세요.",
        "length": 600,
    },
    "baemin": {
        "intro": "{brand} 배달 주문 요약",
        "body": "{bullets}",
        "outro": "배달 시간/포장 상태는 매장 사정에 따라 달라질 수 있습니다.",
        "length": 500,
    },
    "smartstore": {
        "intro": "{brand} {menu} 사용 후기",
        "body": "{bullets}",
        "outro": "구매 시 참고 바랍니다.",
        "length": 700,
    },
    "default": {
        "intro": "{brand} {menu} 리뷰입니다.",
        "body": "{bullets}",
        "outro": "",
        "length": 1000,
    },
}