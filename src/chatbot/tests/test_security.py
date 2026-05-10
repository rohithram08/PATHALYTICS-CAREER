"""
tests/test_security.py
======================
Tests for SSRF protection in core/security.py.

Run:
    pytest tests/test_security.py -v
"""

import pytest
import socket
from unittest.mock import patch

from chatbot.core.security import is_safe_url


# ----------------------------------------------------------------------
# Safe URLs (should pass)
# ----------------------------------------------------------------------
@pytest.mark.parametrize("url", [
    "https://google.com",
    "https://github.com/user/repo",
    "http://example.com/page?q=1",
    "https://en.wikipedia.org/wiki/Python",
])
def test_safe_public_urls(url):
    """Public HTTPS URLs should be allowed."""
    with patch("socket.gethostbyname", return_value="142.250.80.46"):  # Google's IP
        ok, reason = is_safe_url(url)
        assert ok is True, f"{url} blocked: {reason}"


# ----------------------------------------------------------------------
# Blocked: invalid schemes
# ----------------------------------------------------------------------
@pytest.mark.parametrize("url", [
    "file:///etc/passwd",
    "ftp://internal.server/file",
    "gopher://evil.com",
    "javascript:alert(1)",
])
def test_blocked_schemes(url):
    ok, reason = is_safe_url(url)
    assert ok is False
    assert "scheme" in reason.lower() or "invalid" in reason.lower()


# ----------------------------------------------------------------------
# Blocked: known internal hostnames
# ----------------------------------------------------------------------
@pytest.mark.parametrize("url", [
    "http://localhost",
    "http://localhost:5000",
    "http://127.0.0.1/admin",
    "http://0.0.0.0:8080",
])
def test_blocked_hostnames(url):
    ok, reason = is_safe_url(url)
    assert ok is False


# ----------------------------------------------------------------------
# Blocked: private IPs (RFC 1918)
# ----------------------------------------------------------------------
@pytest.mark.parametrize("internal_ip", [
    "10.0.0.1",
    "192.168.1.1",
    "172.16.0.1",
    "127.0.0.1",
])
def test_blocked_private_ips(internal_ip):
    """Even if a public-looking domain resolves to a private IP, block it."""
    with patch("socket.gethostbyname", return_value=internal_ip):
        ok, reason = is_safe_url("https://evil.example.com")
        assert ok is False, f"Expected block for {internal_ip}, got: {reason}"


# ----------------------------------------------------------------------
# Blocked: cloud metadata endpoints
# ----------------------------------------------------------------------
@pytest.mark.parametrize("metadata_ip", [
    "169.254.169.254",   # AWS, Azure, GCP, DigitalOcean
])
def test_blocked_cloud_metadata(metadata_ip):
    with patch("socket.gethostbyname", return_value=metadata_ip):
        ok, reason = is_safe_url("https://looks-public.com")
        assert ok is False
        assert "link-local" in reason.lower() or "blocked" in reason.lower() or "private" in reason.lower()


# ----------------------------------------------------------------------
# Edge cases
# ----------------------------------------------------------------------
def test_no_hostname():
    ok, _ = is_safe_url("https://")
    assert ok is False


def test_invalid_url():
    ok, _ = is_safe_url("not-a-url-at-all")
    assert ok is False


def test_unresolvable_domain():
    import socket
    with patch("socket.gethostbyname", side_effect=socket.gaierror):
        ok, reason = is_safe_url("https://this-domain-does-not-exist-xyz.com")
        assert ok is False
        assert "resolve" in reason.lower()