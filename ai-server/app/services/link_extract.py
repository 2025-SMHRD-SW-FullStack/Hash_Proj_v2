# =============================================================================
# services/link_extract.py
# - URL에서 리뷰/문단 텍스트를 추출하는 유틸 (Playwright + 정적 파싱 폴백)
# - 환경변수:
#     CRAWL_USE_PLAYWRIGHT=true | false
#     CRAWL_MAX_SAMPLES_PER_PAGE=5
#     CRAWL_TIMEOUT_MS=30000
# =============================================================================

import os
import re
import asyncio
from typing import List, Optional

import httpx
from bs4 import BeautifulSoup

try:
    from playwright.sync_api import sync_playwright  # pip install playwright && python -m playwright install chromium
    _PLAYWRIGHT_AVAILABLE = True
except Exception:
    _PLAYWRIGHT_AVAILABLE = False

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/119.0.0.0 Safari/537.36"
)

USE_PW = os.getenv("CRAWL_USE_PLAYWRIGHT", "false").lower() in ("1", "true", "yes")
TIMEOUT_MS_DEFAULT = int(os.getenv("CRAWL_TIMEOUT_MS", "30000"))
MAX_PER_PAGE_DEFAULT = int(os.getenv("CRAWL_MAX_SAMPLES_PER_PAGE", "5"))


def _dedup_keep_order(items: List[str]) -> List[str]:
    seen, out = set(), []
    for t in items:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return out


def _extract_text_candidates_from_soup(soup: BeautifulSoup, max_per_page: int) -> List[str]:
    """
    렌더링 결과 HTML(정적/동적)에서 리뷰 후보 문단 추출.
    - 20자 미만 제외
    - 로그인/네비게이션/광고성 문구 제외
    """
    out: List[str] = []
    bad_patterns = re.compile(r"(로그인|더보기|신고|이 장소를|길찾기|쿠폰|네이버|공유|리뷰쓰기)")
    for el in soup.select("p, div"):
        txt = el.get_text(" ", strip=True)
        if not txt or len(txt) < 20:
            continue
        if bad_patterns.search(txt):
            continue
        out.append(txt)
        if len(out) >= max_per_page:
            break
    return out


async def _fetch_texts_static_async(url: str, max_per_page: int, timeout_ms: int, cookie: Optional[str]) -> List[str]:
    headers = {"User-Agent": USER_AGENT}
    if cookie:
        headers["Cookie"] = cookie
    async with httpx.AsyncClient(headers=headers, timeout=timeout_ms / 1000, follow_redirects=True) as c:
        r = await c.get(url)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
    return _extract_text_candidates_from_soup(soup, max_per_page=max_per_page)


def _fetch_texts_playwright(url: str, max_per_page: int, timeout_ms: int, cookie: Optional[str]) -> List[str]:
    """
    Playwright(Chromium)로 동적 렌더링된 DOM을 받아 텍스트 추출.
    - cookie 제공 시 my/… 같은 개인 피드 접근 가능(정책 준수 필수)
    """
    if not _PLAYWRIGHT_AVAILABLE:
        return []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT)
        if cookie:
            cookies = []
            for kv in cookie.split("; "):
                if "=" in kv:
                    name, value = kv.split("=", 1)
                    cookies.append({"name": name, "value": value, "domain": ".naver.com", "path": "/"})
            if cookies:
                context.add_cookies(cookies)
        page = context.new_page()
        page.goto(url, wait_until="networkidle", timeout=timeout_ms)
        # 필요 시 탭 전환/더보기 클릭 등 액션 추가 가능
        html = page.content()
        browser.close()
    soup = BeautifulSoup(html, "html.parser")
    return _extract_text_candidates_from_soup(soup, max_per_page=max_per_page)


async def fetch_texts_from_url_async(
    url: str,
    max_per_page: int = MAX_PER_PAGE_DEFAULT,
    timeout_ms: int = TIMEOUT_MS_DEFAULT,
    cookie: Optional[str] = None
) -> List[str]:
    """
    URL 하나에 대해:
      1) (옵션) Playwright 시도 → 실패/미가용 시
      2) 정적 파싱으로 폴백
    """
    # 네이버 place/my 경로는 기본적으로 동적 렌더링 가정
    use_pw = USE_PW or ("m.place.naver.com" in url and "/my/" in url)
    if use_pw:
        try:
            pw_res = await asyncio.to_thread(_fetch_texts_playwright, url, max_per_page, timeout_ms, cookie)
            if pw_res:
                return pw_res
        except Exception:
            pass  # 폴백

    try:
        return await _fetch_texts_static_async(url, max_per_page, timeout_ms, cookie)
    except Exception:
        return []
