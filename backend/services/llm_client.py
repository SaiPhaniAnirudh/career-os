import requests

from config import Config
from services.errors import ApiError

_TIMEOUT_SECONDS = 30
_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def generate(prompt, system=None):
    """Calls the Groq-hosted LLM via its OpenAI-compatible endpoint.

    Raises ApiError(503) if unreachable so the frontend can show a clean
    'AI service unavailable' message rather than a stack trace.
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": Config.GROQ_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1024,
    }
    headers = {
        "Authorization": f"Bearer {Config.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(
            _GROQ_URL,
            json=payload,
            headers=headers,
            timeout=_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise ApiError(
            "The AI service is temporarily unavailable. Please try again shortly.",
            status_code=503,
        ) from exc

    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()
