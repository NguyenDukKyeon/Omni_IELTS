import asyncio
import json
import os
import secrets
import time
import uuid
from pathlib import Path
from typing import Literal

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
PRIMARY_MODEL = os.environ.get("WEB_AI_BRIDGE_PRIMARY_MODEL", "gemini-flash").strip()
FALLBACK_MODEL = os.environ.get("WEB_AI_BRIDGE_FALLBACK_MODEL", "gemini-pro").strip()
MODEL_CHAIN = tuple(dict.fromkeys(model for model in (PRIMARY_MODEL, FALLBACK_MODEL) if model))

try:
    REQUEST_TIMEOUT_SEC = max(
        15,
        min(120, int(os.environ.get("WEB_AI_BRIDGE_REQUEST_TIMEOUT_SEC", "75"))),
    )
except ValueError:
    REQUEST_TIMEOUT_SEC = 75

try:
    MODEL_ATTEMPT_TIMEOUT_SEC = max(
        10,
        min(60, int(os.environ.get("WEB_AI_BRIDGE_MODEL_ATTEMPT_TIMEOUT_SEC", "40"))),
    )
except ValueError:
    MODEL_ATTEMPT_TIMEOUT_SEC = 40

if not API_KEY:
    raise SystemExit("auth_missing")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str
    messages: list[ChatMessage] = Field(min_length=1)
    stream: bool = False
    reasoning_effort: Literal["standard", "high"] = "standard"


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


def has_available_model(client: GeminiClient) -> bool:
    for model_name in MODEL_CHAIN:
        try:
            if client.resolve_model(model_name).is_available:
                return True
        except ModelInvalidError:
            continue
    return False


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
            if not has_available_model(candidate):
                raise ModelInvalidError("model_chain_unavailable")
        except AuthError:
            raise HTTPException(status_code=401, detail="auth_missing") from None
        except ModelInvalidError:
            raise HTTPException(status_code=503, detail="model_chain_unavailable") from None
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
            "id": model.model_name,
            "object": "model",
            "owned_by": "gemini_web_authenticated",
        }
        for model in (client.list_models() or [])
        if model.is_available
    ]
    if PUBLIC_MODEL not in {model["id"] for model in models}:
        models.insert(0, {
            "id": PUBLIC_MODEL,
            "object": "model",
            "owned_by": "omni_ielts_web_bridge",
        })
    return {"object": "list", "data": models}


@app.post("/v1/chat/completions")
async def chat_completions(
    request: ChatCompletionRequest,
    authorization: str | None = Header(default=None),
):
    require_api_key(authorization)
    if request.stream:
        raise HTTPException(status_code=400, detail="stream_not_supported")
    if request.model not in {PUBLIC_MODEL, *MODEL_CHAIN}:
        raise HTTPException(status_code=400, detail="model_not_supported")
    client = await get_client()
    attempted_models: list[str] = []
    selected_model = ""
    output = None
    last_error: Exception | None = None
    try:
        async with asyncio.timeout(REQUEST_TIMEOUT_SEC):
            async with _generation_lock:
                for model_name in MODEL_CHAIN:
                    attempted_models.append(model_name)
                    try:
                        resolved = client.resolve_model(model_name)
                        if not resolved.is_available:
                            raise ModelInvalidError("model_unavailable")
                        async with asyncio.timeout(MODEL_ATTEMPT_TIMEOUT_SEC):
                            output = await client.generate_content(
                                prompt_from_messages(request.messages),
                                model=resolved,
                                temporary=True,
                                extended_thinking=request.reasoning_effort == "high",
                            )
                        if not str(output.text or "").strip():
                            raise RuntimeError("empty_response")
                        selected_model = resolved.model_name
                        break
                    except AuthError:
                        raise
                    except (
                        UsageLimitExceededError,
                        TemporarilyBlockedError,
                        GeminiTimeoutError,
                        TimeoutError,
                        ModelInvalidError,
                        RuntimeError,
                    ) as error:
                        last_error = error
                if output is None or not selected_model:
                    if last_error is not None:
                        raise last_error
                    raise RuntimeError("empty_response")
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
        "omni": {
            "authenticated": True,
            "resolved_model": selected_model,
            "thinking_mode": "extended" if request.reasoning_effort == "high" else "standard",
            "attempted_models": attempted_models,
        },
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": text},
            "finish_reason": "stop",
        }],
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8081, log_level="warning", access_log=False)
