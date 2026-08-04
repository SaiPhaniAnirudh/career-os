import requests

from config import Config
from services.errors import ApiError

_TIMEOUT_SECONDS = 30


def generate(prompt, system=None):
    """Calls the Ollama-hosted model. Raises ApiError(503) if unreachable
    instead of letting the request crash — the frontend can show a clean
    'AI service unavailable' message rather than a stack trace.
    """
    payload = {
        "model": Config.OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }
    if system:
        payload["system"] = system

    try:
        resp = requests.post(
            f"{Config.OLLAMA_BASE_URL}/api/generate",
            json=payload,
            timeout=_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise ApiError(
            "The AI service is temporarily unavailable. Please try again shortly.",
            status_code=503,
        ) from exc

    data = resp.json()
    return data.get("response", "").strip()
