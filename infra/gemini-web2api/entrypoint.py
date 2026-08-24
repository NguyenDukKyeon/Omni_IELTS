import asyncio
import json
import os
import secrets
import time
import uuid
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Header, HTTPException
from gemini_webapi import GeminiClient
from gemini_webapi.exceptions import (
    AuthError,
    ModelInvalidError,
    TemporarilyBlockedError,
    TimeoutError as GeminiTimeoutError,
    UsageLimitExceededError,
)
from loguru import logger
from pydantic import BaseModel, Field

logger.remove()

COOKIE_FILE = Path("/run/secrets/gemini-cookie.json")
API_KEY = os.environ.get("WEB_AI_BRIDGE_API_KEY", "").strip()
PUBLIC_MODEL = os.environ.get("WEB_AI_BRIDGE_MODEL", "gemini-3.1-pro").strip()
RESOLVED_MODEL = "gemini-pro"

try:
    REQUEST_TIMEOUT_SEC = max(
        15,
        min(120, int(os.environ.get("WEB_AI_BRIDGE_REQUEST_TIMEOUT_SEC", "75"))),
    )
except ValueError:
    REQUEST_TIMEOUT_SEC = 75

if not API_KEY:
    raise SystemExit("auth_missing")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str
    messages: list[ChatMessage] = Field(min_length=1)
    stream: bool = False


app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
_client: GeminiClient | None = None
_cookie_mtime_ns = 0
_client_lock = asyncio.Lock()
_generation_lock = asyncio.Lock()


def require_api_key(authorization: str | None) -> None:
    expected = f"Bearer {API_KEY}"
    if not authorization or not secrets.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="auth_invalid")


def load_session() -> tuple[str, str]:
    if not COOKIE_FILE.is_file():
        raise HTTPException(status_code=401, detail="auth_missing")
    try:
        payload = json.loads(COOKIE_FILE.read_text(encoding="utf-8"))
        cookie_pairs = dict(
            pair.split("=", 1)
            for pair in str(payload.get("cookie", "")).split("; ")
            if "=" in pair
        )
        secure_1psid = cookie_pairs.get("__Secure-1PSID", "")
        secure_1psidts = cookie_pairs.get("__Secure-1PSIDTS", "")
    except (OSError, json.JSONDecodeError, AttributeError, ValueError):
        raise HTTPException(status_code=401, detail="auth_missing") from None
    if not secure_1psid or not secure_1psidts:
        raise HTTPException(status_code=401, detail="auth_missing")
    return secure_1psid, secure_1psidts


async def get_client() -> GeminiClient:
    global _client, _cookie_mtime_ns
    async with _client_lock:
        try:
            mtime_ns = COOKIE_FILE.stat().st_mtime_ns
        except OSError:
            raise HTTPException(status_code=401, detail="auth_missing") from None
        if _client is not None and mtime_ns == _cookie_mtime_ns:
            return _client
        secure_1psid, secure_1psidts = load_session()
        if _client is not None:
            await _client.close()
        candidate = GeminiClient(secure_1psid, secure_1psidts)
        try:
            await candidate.init(
                timeout=45,
                auto_close=False,
                auto_refresh=False,
                verbose=False,
            )
            resolved = candidate.resolve_model(RESOLVED_MODEL)
            if not resolved.is_available:
                raise ModelInvalidError("pro_unavailable")
        except AuthError:
            raise HTTPException(status_code=401, detail="auth_missing") from None
        except ModelInvalidError:
            raise HTTPException(status_code=503, detail="pro_unavailable") from None
        except Exception:
            raise HTTPException(status_code=503, detail="provider_unavailable") from None
        _client = candidate
        _cookie_mtime_ns = mtime_ns
        return candidate


def prompt_from_messages(messages: list[ChatMessage]) -> str:
    return "\n\n".join(f"{message.role.upper()}:\n{message.content}" for message in messages)


@app.get("/v1/models")
async def list_models(authorization: str | None = Header(default=None)):
    require_api_key(authorization)
    client = await get_client()
    models = [
        {
            "id": PUBLIC_MODEL if model.model_name == RESOLVED_MODEL else model.model_name,
            "object": "model",
            "owned_by": "gemini_web_authenticated",
        }
        for model in (client.list_models() or [])
        if model.is_available
    ]
    return {"object": "list", "data": models}


@app.post("/v1/chat/completions")
async def chat_completions(
    request: ChatCompletionRequest,
    authorization: str | None = Header(default=None),
):
    require_api_key(authorization)
    if request.stream:
        raise HTTPException(status_code=400, detail="stream_not_supported")
    if request.model not in {PUBLIC_MODEL, RESOLVED_MODEL}:
        raise HTTPException(status_code=400, detail="model_not_supported")
    client = await get_client()
    resolved = client.resolve_model(RESOLVED_MODEL)
    try:
        async with asyncio.timeout(REQUEST_TIMEOUT_SEC):
            async with _generation_lock:
                output = await client.generate_content(
                    prompt_from_messages(request.messages),
                    model=resolved,
                    temporary=True,
                )
    except AuthError:
        raise HTTPException(status_code=401, detail="auth_missing") from None
    except (UsageLimitExceededError, TemporarilyBlockedError):
        raise HTTPException(status_code=429, detail="quota_exhausted") from None
    except (GeminiTimeoutError, TimeoutError):
        raise HTTPException(status_code=503, detail="provider_timeout") from None
    except Exception:
        raise HTTPException(status_code=502, detail="provider_unavailable") from None
    text = str(output.text or "").strip()
    if not text:
        raise HTTPException(status_code=502, detail="empty_response")
    return {
        "id": f"chatcmpl-{uuid.uuid4().hex}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": PUBLIC_MODEL,
        "omni": {"authenticated": True, "resolved_model": resolved.model_name},
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": text},
            "finish_reason": "stop",
        }],
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8081, log_level="warning", access_log=False)
