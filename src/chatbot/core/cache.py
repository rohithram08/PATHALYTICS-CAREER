import json
import logging
from typing import Optional, List, Any

import redis.asyncio as redis
from redis.exceptions import ConnectionError as RedisConnectionError, TimeoutError as RedisTimeoutError

from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ChatCache:
    def __init__(self):
        self.client: Optional[redis.Redis] = None
        self._available: bool = False
        try:
            self.client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            self._available = True
        except Exception as e:
            logger.warning("⚠️ Redis init failed, running without cache: %s", e)

    async def get_history(self, session_id: str) -> List[dict]:
        if not self._available or not self.client:
            return []
        try:
            val = await self.client.get(f"chat:{session_id}")
            return json.loads(val) if val else []
        except (RedisConnectionError, RedisTimeoutError, OSError) as e:
            logger.warning("⚠️ Redis unavailable (get_history) — using empty history: %s", e)
            self._available = False
            return []
        except Exception as e:
            logger.error("Unexpected cache error (get_history): %s", e)
            return []

    async def set_history(self, session_id: str, history: List[dict], ttl: int = 3600) -> None:
        if not self._available or not self.client:
            return
        try:
            await self.client.set(
                f"chat:{session_id}",
                json.dumps(history),
                ex=ttl,
            )
        except (RedisConnectionError, RedisTimeoutError, OSError) as e:
            logger.warning("⚠️ Redis unavailable (set_history) — skipping save: %s", e)
            self._available = False
        except Exception as e:
            logger.error("Unexpected cache error (set_history): %s", e)

    async def clear_history(self, session_id: str) -> None:
        if not self._available or not self.client:
            return
        try:
            await self.client.delete(f"chat:{session_id}")
        except Exception as e:
            logger.warning("⚠️ Redis clear_history failed: %s", e)

    async def get(self, key: str) -> Any | None:
        if not self._available or not self.client:
            return None
        try:
            val = await self.client.get(key)
            return json.loads(val) if val else None
        except (RedisConnectionError, RedisTimeoutError, OSError) as e:
            logger.warning("⚠️ Redis unavailable (get) — returning None: %s", e)
            self._available = False
            return None
        except Exception as e:
            logger.error("Unexpected cache error (get): %s", e)
            return None

    async def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        if not self._available or not self.client:
            return
        try:
            await self.client.set(key, json.dumps(value), ex=ttl)
        except (RedisConnectionError, RedisTimeoutError, OSError) as e:
            logger.warning("⚠️ Redis unavailable (set) — skipping save: %s", e)
            self._available = False
        except Exception as e:
            logger.error("Unexpected cache error (set): %s", e)


cache = ChatCache()