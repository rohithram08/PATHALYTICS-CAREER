"""
tests/conftest.py
=================
Shared pytest fixtures and configuration.
"""

import pytest
import asyncio


@pytest.fixture(scope="session")
def event_loop():
    """Create a session-wide event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def sample_chat_request():
    from chatbot.models.schemas import ChatRequest
    return ChatRequest(
        message="What career suits a Python beginner?",
        current_page="/dashboard",
        user_level="beginner",
    )