import os
import time
import threading
from dataclasses import dataclass
from typing import Dict, Optional

from fastapi import Header, HTTPException, Request


@dataclass
class SecurityContext:
    api_key_id: str
    company_id: str


_rate_lock = threading.Lock()
_rate_buckets: Dict[str, list[float]] = {}


def _load_key_mapping() -> Dict[str, str]:
    """
    Loads API key to company mapping from env.

    Preferred:
      API_KEY_COMPANY_MAP="key1:company_a,key2:company_b"

    Fallback:
      INTERNAL_API_KEY="single_key" -> maps to default_co
    """
    mapping_raw = (os.getenv("API_KEY_COMPANY_MAP") or "").strip()
    mapping: Dict[str, str] = {}

    if mapping_raw:
        for pair in mapping_raw.split(","):
            item = pair.strip()
            if not item or ":" not in item:
                continue
            key, company = item.split(":", 1)
            key = key.strip()
            company = company.strip() or "default_co"
            if key:
                mapping[key] = company

    fallback_key = (os.getenv("INTERNAL_API_KEY") or "").strip()
    if fallback_key and fallback_key not in mapping:
        mapping[fallback_key] = os.getenv("DEFAULT_COMPANY_ID", "default_co").strip() or "default_co"

    return mapping


def validate_security_config() -> None:
    mapping = _load_key_mapping()
    if not mapping:
        raise RuntimeError(
            "Security configuration missing: set API_KEY_COMPANY_MAP or INTERNAL_API_KEY. "
            "Example: API_KEY_COMPANY_MAP='your-key:default_co'"
        )


def _require_context_from_key(api_key: str) -> SecurityContext:
    mapping = _load_key_mapping()
    company_id = mapping.get(api_key)
    if not company_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return SecurityContext(api_key_id=api_key[:8], company_id=company_id)


async def require_api_key(x_api_key: Optional[str] = Header(default=None, alias="X-API-Key")) -> SecurityContext:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="Missing API key")
    return _require_context_from_key(x_api_key.strip())


async def get_security_context(x_api_key: Optional[str] = Header(default=None, alias="X-API-Key")) -> SecurityContext:
    # Alias dependency for route handlers that need company_id binding.
    return await require_api_key(x_api_key=x_api_key)


def enforce_rate_limit(request: Request, bucket: str, limit: int, window_seconds: int) -> None:
    api_key = (request.headers.get("X-API-Key") or "anonymous").strip()
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    key = f"{bucket}:{api_key}:{ip}"

    with _rate_lock:
        times = _rate_buckets.get(key, [])
        cutoff = now - window_seconds
        times = [ts for ts in times if ts >= cutoff]
        if len(times) >= limit:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        times.append(now)
        _rate_buckets[key] = times


async def rate_limit_review(request: Request) -> None:
    enforce_rate_limit(request, bucket="review", limit=8, window_seconds=60)


async def rate_limit_chat(request: Request) -> None:
    enforce_rate_limit(request, bucket="chat", limit=20, window_seconds=60)
