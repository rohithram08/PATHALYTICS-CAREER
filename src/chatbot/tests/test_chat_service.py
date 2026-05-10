"""
tests/test_chat_service.py
==========================
Tests for the chat service: navigation parsing, roadmap detection,
and the main chat handler.

Run:
    pytest tests/test_chat_service.py -v
"""

import pytest
from unittest.mock import AsyncMock, patch

from chatbot.services.chat_service import (
    parse_navigation,
    parse_roadmap_json,
    handle_chat,
)
from chatbot.models.schemas import ChatRequest


# ======================================================================
# parse_navigation()
# ======================================================================
class TestParseNavigation:
    def test_extracts_simple_path(self):
        text = "Check out the dashboard.\nNAVIGATE:/dashboard"
        cleaned, target = parse_navigation(text)
        assert target == "/dashboard"
        assert "NAVIGATE" not in cleaned

    def test_extracts_dynamic_roadmap_path(self):
        text = "See this roadmap.\nNAVIGATE:/roadmaps/data-scientist"
        cleaned, target = parse_navigation(text)
        assert target == "/roadmaps/data-scientist"

    def test_no_navigation(self):
        text = "Here's some career advice without any nav."
        cleaned, target = parse_navigation(text)
        assert target is None
        assert cleaned == text

    def test_blocks_unsafe_path(self):
        """Path not in whitelist should be stripped."""
        text = "Go here.\nNAVIGATE:/admin/delete-all-users"
        cleaned, target = parse_navigation(text)
        assert target is None
        assert "NAVIGATE" not in cleaned

    def test_blocks_external_url(self):
        text = "Go here.\nNAVIGATE:https://evil.com"
        cleaned, target = parse_navigation(text)
        assert target is None


# ======================================================================
# parse_roadmap_json()
# ======================================================================
class TestParseRoadmapJson:
    def test_valid_json_block(self):
        text = """Here's a roadmap:
```json
{"title": "Frontend Dev", "steps": ["HTML", "CSS", "JS"]}
```"""
        result = parse_roadmap_json(text)
        assert result is not None
        assert result["title"] == "Frontend Dev"
        assert len(result["steps"]) == 3

    def test_no_json_block(self):
        text = "Plain text reply with no JSON."
        assert parse_roadmap_json(text) is None

    def test_malformed_json(self):
        text = '```json\n{not valid json}\n```'
        assert parse_roadmap_json(text) is None


#======================================================================
#handle_chat() — integration with mocked LLM
#======================================================================
@pytest.mark.asyncio
class TestHandleChat:
    @patch("chatbot.services.chat_service.cache")
    @patch("chatbot.services.chat_service.chat_completion", new_callable=AsyncMock)
    async def test_basic_career_guidance(self, mock_llm, mock_cache):
        mock_cache.get_history = AsyncMock(return_value=[])
        mock_cache.set_history = AsyncMock()
        mock_llm.return_value = "AI/ML Engineer is a great choice for you."

        req = ChatRequest(message="Suggest a career", current_page="/dashboard")
        resp = await handle_chat(req, user_id=123)

        assert resp.intent == "career_guidance"
        assert resp.target_url is None
        assert "AI/ML" in resp.reply

    @patch("chatbot.services.chat_service.cache")
    @patch("chatbot.services.chat_service.chat_completion", new_callable=AsyncMock)
    async def test_navigation_response(self, mock_llm, mock_cache):
        mock_cache.get_history = AsyncMock(return_value=[])
        mock_cache.set_history = AsyncMock()
        mock_llm.return_value = "Here you go.\nNAVIGATE:/roadmaps"

        req = ChatRequest(message="Show me roadmaps")
        resp = await handle_chat(req, user_id=42)

        assert resp.intent == "navigation"
        assert resp.target_url == "/roadmaps"

    @patch("chatbot.services.chat_service.cache")
    @patch("chatbot.services.chat_service.chat_completion", new_callable=AsyncMock)
    async def test_llm_failure_returns_error(self, mock_llm, mock_cache):
        mock_cache.get_history = AsyncMock(return_value=[])
        mock_cache.set_history = AsyncMock()
        mock_llm.side_effect = Exception("Groq down")

        req = ChatRequest(message="Hello")
        resp = await handle_chat(req, user_id=1)

        assert resp.intent == "error"
        assert "trouble" in resp.reply.lower()
