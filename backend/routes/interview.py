from flask import Blueprint, request, jsonify, g

from services.supabase_client import get_supabase
from services.errors import ApiError
from services.auth import require_auth
from services import llm_client

interview_bp = Blueprint("interview", __name__, url_prefix="/api/interview")

_INTERVIEWER_SYSTEM_PROMPT = (
    "You are a professional, encouraging technical interviewer. Ask one "
    "question at a time, tailored to the given job description. Keep "
    "questions concise. Do not answer your own questions."
)

_FEEDBACK_SYSTEM_PROMPT = (
    "You are an interview coach. Given a transcript, give structured, "
    "specific, constructive feedback: what was strong, what was missing "
    "(e.g. STAR structure, technical depth), and one concrete tip. Keep it "
    "under 200 words."
)


@interview_bp.get("/sessions")
@require_auth
def list_interview_sessions():
    """Returns the user's past interview sessions and feedback."""
    user_id = g.user_id
    sb = get_supabase()
    res = (
        sb.table("interview_sessions")
        .select("id, jd_id, transcript, feedback, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(15)
        .execute()
    )
    return jsonify(res.data)


@interview_bp.post("/start")
@require_auth
def start_interview():
    user_id = g.user_id
    body = request.get_json(silent=True) or {}
    jd_id = body.get("jd_id")
    custom_topic = (body.get("custom_topic") or "").strip()

    jd_text = None
    if jd_id:
        sb = get_supabase()
        jd_res = (
            sb.table("job_descriptions")
            .select("raw_text")
            .eq("id", jd_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not jd_res.data:
            raise ApiError("Job description not found.", status_code=404)
        jd_text = jd_res.data[0]["raw_text"]

    if jd_text:
        prompt = f"Job description:\n{jd_text}\n\nAsk the first interview question tailored to this role."
    elif custom_topic:
        prompt = f"Target role / focus topic: {custom_topic}\n\nAsk the first technical interview question tailored to this role and topic."
    else:
        prompt = "Ask the first general software-engineering interview question."

    first_question = llm_client.generate(prompt, system=_INTERVIEWER_SYSTEM_PROMPT)

    transcript = [{"role": "interviewer", "content": first_question}]

    sb = get_supabase()
    res = (
        sb.table("interview_sessions")
        .insert({"user_id": user_id, "jd_id": jd_id, "transcript": transcript})
        .execute()
    )
    return jsonify(res.data[0]), 201


@interview_bp.post("/respond")
@require_auth
def respond_interview():
    user_id = g.user_id
    body = request.get_json(silent=True) or {}
    session_id = body.get("session_id")
    answer = (body.get("answer") or "").strip()
    if not session_id or not answer:
        raise ApiError("'session_id' and 'answer' are required.")

    sb = get_supabase()
    session_res = (
        sb.table("interview_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not session_res.data:
        raise ApiError("Interview session not found.", status_code=404)

    session = session_res.data[0]
    transcript = session["transcript"]
    transcript.append({"role": "candidate", "content": answer})

    history_text = "\n".join(f"{t['role']}: {t['content']}" for t in transcript)
    next_question = llm_client.generate(
        f"{history_text}\n\nAsk the next interview question, building on the conversation.",
        system=_INTERVIEWER_SYSTEM_PROMPT,
    )
    transcript.append({"role": "interviewer", "content": next_question})

    update_res = (
        sb.table("interview_sessions")
        .update({"transcript": transcript})
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    return jsonify(update_res.data[0])


@interview_bp.post("/feedback")
@require_auth
def generate_feedback():
    user_id = g.user_id
    body = request.get_json(silent=True) or {}
    session_id = body.get("session_id")
    if not session_id:
        raise ApiError("'session_id' is required.")

    sb = get_supabase()
    session_res = (
        sb.table("interview_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not session_res.data:
        raise ApiError("Interview session not found.", status_code=404)

    session = session_res.data[0]
    transcript_text = "\n".join(
        f"{t['role']}: {t['content']}" for t in session["transcript"]
    )
    feedback_text = llm_client.generate(
        transcript_text, system=_FEEDBACK_SYSTEM_PROMPT
    )

    update_res = (
        sb.table("interview_sessions")
        .update({"feedback": {"summary": feedback_text}})
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    return jsonify(update_res.data[0])
