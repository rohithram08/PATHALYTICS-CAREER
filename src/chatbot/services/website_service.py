"""
services/website_service.py
===========================
Fetches and parses external websites for the chatbot's
"website analysis" feature. Includes SSRF protection.
"""

import hashlib
import logging
import httpx
from bs4 import BeautifulSoup
from core.security import is_safe_url

logger = logging.getLogger(__name__)


async def fetch_website_text(url: str) -> tuple[str, str] | None:
    """
    Fetch a URL and return (text, content_hash) tuple.
    Returns None if the URL is unsafe, oversized, or unreachable.
    """
    safe, reason = is_safe_url(url)
    if not safe:
        logger.warning(f"Blocked unsafe URL: {url} ({reason})")
        return None

    try:
        async with httpx.AsyncClient(
            timeout=10,
            follow_redirects=True,
            max_redirects=3,
            limits=httpx.Limits(max_connections=10),
        ) as http:
            resp = await http.get(
                url,
                headers={"User-Agent": "PathalyticsBot/1.0"},
            )
            resp.raise_for_status()

            # Reject oversized payloads (2 MB cap)
            if len(resp.content) > 2_000_000:
                logger.warning(f"URL too large: {url}")
                return None

            html = resp.text

        # Parse with stdlib parser (no lxml dependency)
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "noscript", "iframe"]):
            tag.decompose()

        text = soup.get_text(separator=" ", strip=True)[:5000]
        content_hash = hashlib.sha256(text.encode()).hexdigest()[:16]
        return text, content_hash

    except (httpx.HTTPError, httpx.TimeoutException) as e:
        logger.warning(f"Fetch failed for {url}: {e}")
        return None