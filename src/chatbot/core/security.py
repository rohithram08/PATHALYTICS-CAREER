"""
core/security.py
================
Security utilities for the chatbot.

Currently handles:
- SSRF (Server-Side Request Forgery) protection for the website-analysis feature.
  Prevents users from making the server fetch internal URLs like:
    - http://localhost:5000        (your own backend)
    - http://169.254.169.254       (AWS metadata service)
    - http://192.168.1.1           (internal network)
    - file:///etc/passwd           (local file)

Future additions (when needed):
- Input sanitization
- Prompt injection detection
- PII redaction
"""

import ipaddress
import socket
from urllib.parse import urlparse
from core.config import get_settings

settings = get_settings()


def is_safe_url(url: str) -> tuple[bool, str]:
    """
    Validate that a URL is safe for the server to fetch.
    
    Returns:
        (is_safe, reason)
        - (True, "ok") if safe
        - (False, "<reason>") if blocked
    """
    # 1. Parse the URL
    try:
        parsed = urlparse(url)
    except Exception:
        return False, "Invalid URL format"
    
    # 2. Only allow http/https (no file://, ftp://, gopher://, etc.)
    if parsed.scheme not in settings.ALLOWED_FETCH_SCHEMES:
        return False, f"Scheme '{parsed.scheme}' not allowed"
    
    # 3. Must have a hostname
    hostname = parsed.hostname
    if not hostname:
        return False, "No hostname in URL"
    
    # 4. Block obvious internal hostnames
    if hostname.lower() in settings.BLOCKED_HOSTS:
        return False, "Hostname is blocked"
    
    # 5. Resolve hostname → IP, then check the IP isn't internal
    #    (defends against DNS rebinding & internal DNS names)
    try:
        ip_str = socket.gethostbyname(hostname)
        ip = ipaddress.ip_address(ip_str)
        
        if ip.is_private:        # 10.x, 192.168.x, 172.16-31.x
            return False, "Private IP not allowed"
        if ip.is_loopback:       # 127.0.0.0/8
            return False, "Loopback IP not allowed"
        if ip.is_link_local:     # 169.254.x.x  (cloud metadata!)
            return False, "Link-local IP not allowed"
        if ip.is_reserved:       # Reserved ranges
            return False, "Reserved IP not allowed"
        if ip.is_multicast:
            return False, "Multicast IP not allowed"
    except (socket.gaierror, ValueError):
        return False, "Cannot resolve hostname"
    
    return True, "ok"