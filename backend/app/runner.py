"""The request runner — the heart of the app.

The backend executes outbound HTTP on behalf of the browser. This sidesteps CORS
(the browser never makes the cross-origin call itself) and lets us measure timing,
size and headers consistently.

Pipeline:
  1. Resolve {{variables}} against the selected environment.
  2. Assemble method, url, query params, headers, auth and body for httpx.
  3. Send with a timeout, time it, and normalise the response.
  4. Translate network failures into structured errors instead of 500s.
"""

import re
import time
from typing import Any

import httpx
from sqlalchemy.orm import Session

from . import models

_VAR_PATTERN = re.compile(r"\{\{\s*([^}]+?)\s*\}\}")
DEFAULT_TIMEOUT = 30.0  # seconds


def build_env_map(db: Session, environment_id: int | None) -> dict[str, str]:
    """Return {key: value} for enabled variables of the selected environment."""
    if not environment_id:
        return {}
    env = db.query(models.Environment).filter_by(id=environment_id).first()
    if not env:
        return {}
    return {v.key: v.value for v in env.variables if v.enabled}


def resolve(text: str, env: dict[str, str]) -> str:
    """Replace every {{var}} in `text` with its environment value.

    Unknown variables are left untouched so the user can see what didn't resolve.
    """
    if not text:
        return text

    def _sub(match: re.Match) -> str:
        key = match.group(1).strip()
        return env.get(key, match.group(0))

    return _VAR_PATTERN.sub(_sub, str(text))


def _resolve_pairs(
    pairs: list[dict[str, Any]], env: dict[str, str]
) -> list[tuple[str, str]]:
    """Resolve a list of {key, value, enabled} rows into enabled tuples."""
    out: list[tuple[str, str]] = []
    for p in pairs or []:
        if p.get("enabled", True) is False:
            continue
        key = resolve(p.get("key", ""), env)
        if not key:
            continue
        out.append((key, resolve(p.get("value", ""), env)))
    return out


def execute(
    *,
    method: str,
    url: str,
    params: list[dict[str, Any]],
    headers: list[dict[str, Any]],
    auth: dict[str, Any],
    body: dict[str, Any],
    env: dict[str, str],
) -> dict[str, Any]:
    """Send one HTTP request and return a normalised result dict.

    Returns either {"ok": True, ...response...} or {"ok": False, error, detail}.
    """
    resolved_url = resolve(url, env)
    if not resolved_url:
        return {"ok": False, "error": "Invalid URL", "detail": "URL is empty."}
    if not re.match(r"^https?://", resolved_url, re.IGNORECASE):
        # Match Postman's forgiving behaviour: default to https.
        resolved_url = "https://" + resolved_url

    query = _resolve_pairs(params, env)
    header_list = _resolve_pairs(headers, env)
    request_headers = {k: v for k, v in header_list}

    # ---- Authorization -----------------------------------------------------
    httpx_auth = None
    auth_type = (auth or {}).get("type", "none")
    if auth_type == "bearer":
        token = resolve((auth or {}).get("token", ""), env)
        if token:
            request_headers["Authorization"] = f"Bearer {token}"
    elif auth_type == "basic":
        username = resolve((auth or {}).get("username", ""), env)
        password = resolve((auth or {}).get("password", ""), env)
        httpx_auth = httpx.BasicAuth(username, password)

    # ---- Body --------------------------------------------------------------
    content = None
    data = None
    mode = (body or {}).get("mode", "none")
    if mode == "raw":
        raw = resolve((body or {}).get("raw", ""), env)
        content = raw.encode("utf-8")
        # Set a sensible content-type if the user didn't supply one.
        if not any(k.lower() == "content-type" for k in request_headers):
            raw_type = (body or {}).get("raw_type", "json")
            request_headers["Content-Type"] = (
                "application/json" if raw_type == "json" else "text/plain"
            )
    elif mode == "x-www-form-urlencoded":
        data = dict(_resolve_pairs((body or {}).get("fields", []), env))
    elif mode == "form-data":
        # Sent as multipart form fields (text only in this scaffold).
        data = dict(_resolve_pairs((body or {}).get("fields", []), env))

    # ---- Send --------------------------------------------------------------
    start = time.perf_counter()
    try:
        with httpx.Client(
            timeout=DEFAULT_TIMEOUT, follow_redirects=True, verify=True
        ) as client:
            resp = client.request(
                method.upper(),
                resolved_url,
                params=query or None,
                headers=request_headers or None,
                content=content,
                data=data,
                auth=httpx_auth,
            )
        elapsed_ms = (time.perf_counter() - start) * 1000

        raw_bytes = resp.content
        text = resp.text
        content_type = resp.headers.get("content-type", "")
        is_json = "application/json" in content_type.lower()
        if not is_json:
            # Some APIs omit the header but still return JSON.
            stripped = text.strip()
            is_json = stripped.startswith("{") or stripped.startswith("[")

        return {
            "ok": True,
            "status_code": resp.status_code,
            "status_text": resp.reason_phrase or "",
            "time_ms": round(elapsed_ms, 2),
            "size_bytes": len(raw_bytes),
            "headers": dict(resp.headers),
            "body": text,
            "is_json": is_json,
        }
    except httpx.TimeoutException:
        return {
            "ok": False,
            "error": "Request timed out",
            "detail": f"No response after {DEFAULT_TIMEOUT:.0f}s.",
        }
    except httpx.ConnectError as exc:
        return {
            "ok": False,
            "error": "Could not connect",
            "detail": f"Failed to reach the host. {exc}",
        }
    except httpx.InvalidURL as exc:
        return {"ok": False, "error": "Invalid URL", "detail": str(exc)}
    except httpx.HTTPError as exc:
        return {"ok": False, "error": "Request failed", "detail": str(exc)}
