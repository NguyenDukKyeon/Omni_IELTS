import json
import os
from pathlib import Path


def main() -> None:
    api_key = os.environ.get("WEB_AI_BRIDGE_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("WEB_AI_BRIDGE_API_KEY is required")

    config = {
        "port": 8081,
        "host": "0.0.0.0",
        "retry_attempts": 2,
        "retry_delay_sec": 2,
        "request_timeout_sec": 120,
        "default_model": os.environ.get("WEB_AI_BRIDGE_MODEL", "gemini-3.6-flash").strip(),
        "api_keys": [api_key],
        "cookie_file": None,
        "proxy": None,
        "log_requests": False,
        "temporary_chats": True,
    }
    config_path = Path("/tmp/omni-gemini-web2api.json")
    config_path.write_text(json.dumps(config), encoding="utf-8")
    os.execvp("python", ["python", "-m", "gemini_web2api", "--config", str(config_path)])


if __name__ == "__main__":
    main()
