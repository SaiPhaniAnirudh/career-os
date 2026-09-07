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
    if not Config.GROQ_API_KEY:
        raise ApiError(
            "The AI service isn't configured yet (missing GROQ_API_KEY).",
            status_code=503,
        )

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

    # Candidate models in priority order for high availability
    preferred_model = Config.GROQ_MODEL or "openai/gpt-oss-120b"
    fallback_models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
    models_to_try = [preferred_model] + [m for m in fallback_models if m != preferred_model]

    last_error = None
    for model_name in models_to_try:
        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1024,
        }
        try:
            resp = requests.post(
                _GROQ_URL,
                json=payload,
                headers=headers,
                timeout=_TIMEOUT_SECONDS,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
            # If 404 or other model error, try next fallback
            last_error = resp.text
        except requests.RequestException as exc:
            last_error = str(exc)

    raise ApiError(
        f"The AI service is temporarily unavailable. Please try again shortly. ({last_error or 'all models failed'})",
        status_code=503,
    )
