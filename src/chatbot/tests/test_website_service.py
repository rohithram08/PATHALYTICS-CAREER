"""
tests/test_website_service.py
=============================
Tests for website fetching and parsing.

Run:
    pytest tests/test_website_service.py -v
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from chatbot.services.website_service import fetch_website_text


SAMPLE_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
    <style>body { color: red; }</style>
    <script>alert('xss');</script>
</head>
<body>
    <h1>Hello World</h1>
    <p>This is a test paragraph with some content.</p>
    <noscript>No JS</noscript>
    <iframe src="evil.com"></iframe>
</body>
</html>
"""


@pytest.mark.asyncio
async def test_fetch_strips_scripts_and_styles():
    """Scripts, styles, iframes, noscript should all be removed."""
    mock_response = MagicMock()
    mock_response.text = SAMPLE_HTML
    mock_response.content = SAMPLE_HTML.encode()
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("chatbot.services.website_service.is_safe_url", return_value=(True, "ok")), \
         patch("httpx.AsyncClient") as mock_async_client:
        mock_async_client.return_value.__aenter__.return_value = mock_client

        result = await fetch_website_text("https://example.com")

    assert result is not None
    text, content_hash = result
    assert "Hello World" in text
    assert "alert" not in text          # script removed
    assert "color: red" not in text     # style removed
    assert "evil.com" not in text       # iframe removed
    assert len(content_hash) > 0


@pytest.mark.asyncio
async def test_fetch_blocks_unsafe_url():
    """SSRF check should reject internal URLs before fetching."""
    with patch("chatbot.services.website_service.is_safe_url",
               return_value=(False, "Private IP")):
        result = await fetch_website_text("http://localhost:5000")
    assert result is None


@pytest.mark.asyncio
async def test_fetch_handles_timeout():
    """If httpx times out, return None gracefully (don't crash)."""
    import httpx

    with patch("chatbot.services.website_service.is_safe_url", return_value=(True, "ok")), \
         patch("httpx.AsyncClient") as mock_async_client:
        mock_async_client.return_value.__aenter__.side_effect = httpx.TimeoutException("timeout")

        result = await fetch_website_text("https://slow-site.com")

    assert result is None


@pytest.mark.asyncio
async def test_fetch_truncates_to_5000_chars():
    """Output text must be capped to 5000 characters."""
    big_html = "<html><body>" + ("word " * 5000) + "</body></html>"
    mock_response = MagicMock()
    mock_response.text = big_html
    mock_response.content = big_html.encode()
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("chatbot.services.website_service.is_safe_url", return_value=(True, "ok")), \
         patch("httpx.AsyncClient") as mock_async_client:
        mock_async_client.return_value.__aenter__.return_value = mock_client

        result = await fetch_website_text("https://example.com")

    assert result is not None
    text, _ = result
    assert len(text) <= 5000


@pytest.mark.asyncio
async def test_fetch_rejects_oversized_response():
    """Files bigger than 2 MB should be rejected."""
    huge_content = b"x" * (3 * 1024 * 1024)  # 3 MB
    mock_response = MagicMock()
    mock_response.text = "small"
    mock_response.content = huge_content
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("chatbot.services.website_service.is_safe_url", return_value=(True, "ok")), \
         patch("httpx.AsyncClient") as mock_async_client:
        mock_async_client.return_value.__aenter__.return_value = mock_client

        result = await fetch_website_text("https://huge.com")

    assert result is None