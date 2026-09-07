import re

from flask import Blueprint, request, jsonify, g
from pypdf import PdfReader

from services.supabase_client import get_supabase
from services.errors import ApiError
from services.auth import require_auth

matching_bp = Blueprint("matching", __name__, url_prefix="/api")

# Comprehensive stopword list filters out common grammatical words and generic
# job-posting boilerplate (e.g., "team", "experience", "candidate", "responsibilities")
# so genuine technical competencies and domain skills are prioritized.
_STOPWORDS = {
    # Common English stopwords
    "the", "and", "a", "an", "to", "of", "in", "on", "for", "with", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "as", "at", "by", "or", "this", "that", "these", "those", "from", "up", "out",
    "into", "over", "after", "before", "between", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "any", "both",
    "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not",
    "only", "own", "same", "so", "than", "too", "very", "can", "will", "just", "should",
    "now", "you", "your", "we", "our", "us", "they", "their", "them", "who", "whom",
    # Common job description boilerplate
    "about", "across", "also", "ability", "able", "apply", "applicant", "applicants",
    "benefit", "benefits", "candidate", "candidates", "career", "company", "culture",
    "degree", "description", "duty", "duties", "employee", "employees", "employer",
    "environment", "equal", "opportunity", "experience", "experienced", "full", "time",
    "part", "help", "helping", "include", "includes", "including", "job", "jobs", "join",
    "joining", "key", "knowledge", "level", "looking", "must", "need", "needed", "needs",
    "offer", "offers", "offering", "people", "plus", "position", "positions", "preferred",
    "provide", "provides", "providing", "qualification", "qualifications", "qualified",
    "related", "requirement", "requirements", "require", "required", "responsibility",
    "responsibilities", "responsible", "role", "roles", "salary", "seek", "seeking",
    "skill", "skills", "strong", "successful", "team", "teams", "understand", "understanding",
    "well", "work", "working", "works", "workplace", "year", "years",
}


def _extract_text_from_pdf(file_storage):
    reader = PdfReader(file_storage)
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _tokenize(text):
    words = re.findall(r"[a-zA-Z][a-zA-Z+.#]{1,}", text.lower())
    tokens = set()
    for w in words:
        cleaned = w.rstrip(".,;:")
        if cleaned not in _STOPWORDS and len(cleaned) > 2:
            tokens.add(cleaned)
    return tokens


@matching_bp.post("/resume/upload")
@require_auth
def upload_resume():
    user_id = g.user_id

    if "file" in request.files:
        f = request.files["file"]
        if not f.filename.lower().endswith(".pdf"):
            raise ApiError("Only PDF uploads are supported right now.")
        raw_text = _extract_text_from_pdf(f.stream)
    else:
        body = request.get_json(silent=True) or {}
        raw_text = (body.get("raw_text") or "").strip()

    if not raw_text:
        raise ApiError("No resume text found — upload a PDF or provide 'raw_text'.")

    parsed_skills = sorted(_tokenize(raw_text))

    sb = get_supabase()
    res = (
        sb.table("resumes")
        .insert(
            {
                "user_id": user_id,
                "raw_text": raw_text,
                "parsed_skills": parsed_skills,
            }
        )
        .execute()
    )
    return jsonify(res.data[0]), 201


@matching_bp.post("/jd/submit")
@require_auth
def submit_jd():
    user_id = g.user_id
    body = request.get_json(silent=True) or {}
    raw_text = (body.get("raw_text") or "").strip()
    if not raw_text:
        raise ApiError("'raw_text' is required.")

    parsed_requirements = sorted(_tokenize(raw_text))

    sb = get_supabase()
    res = (
        sb.table("job_descriptions")
        .insert(
            {
                "user_id": user_id,
                "raw_text": raw_text,
                "parsed_requirements": parsed_requirements,
            }
        )
        .execute()
    )
    return jsonify(res.data[0]), 201


@matching_bp.post("/match")
@require_auth
def run_match():
    user_id = g.user_id
    body = request.get_json(silent=True) or {}
    resume_id = body.get("resume_id")
    jd_id = body.get("jd_id")
    if not resume_id or not jd_id:
        raise ApiError("'resume_id' and 'jd_id' are required.")

    sb = get_supabase()
    resume_res = (
        sb.table("resumes").select("*").eq("id", resume_id).eq("user_id", user_id).execute()
    )
    jd_res = (
        sb.table("job_descriptions")
        .select("*")
        .eq("id", jd_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not resume_res.data:
        raise ApiError("Resume not found.", status_code=404)
    if not jd_res.data:
        raise ApiError("Job description not found.", status_code=404)

    resume_skills = set(resume_res.data[0].get("parsed_skills") or [])
    jd_skills = set(jd_res.data[0].get("parsed_requirements") or [])

    if not jd_skills:
        match_score = 0.0
        missing = []
    else:
        overlap = resume_skills & jd_skills
        match_score = round(100 * len(overlap) / len(jd_skills), 1)
        missing = sorted(jd_skills - resume_skills)

    suggestions = [f"Consider adding '{kw}' if it genuinely applies to your experience." for kw in missing[:10]]

    match_res = (
        sb.table("matches")
        .insert(
            {
                "user_id": user_id,
                "resume_id": resume_id,
                "jd_id": jd_id,
                "match_score": match_score,
                "missing_keywords": missing,
                "suggestions": suggestions,
            }
        )
        .execute()
    )
    return jsonify(match_res.data[0]), 201
