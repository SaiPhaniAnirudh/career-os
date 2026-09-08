import json
import re
import requests
from bs4 import BeautifulSoup
from flask import Blueprint, request, jsonify, g
from pypdf import PdfReader

from services.supabase_client import get_supabase
from services.errors import ApiError
from services.auth import require_auth
from services.llm_client import generate

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


@matching_bp.post("/jd/scrape")
@require_auth
def scrape_jd():
    user_id = g.user_id
    body = request.get_json(silent=True) or {}
    url = (body.get("url") or "").strip()

    if not url:
        raise ApiError("'url' is required.")
    if not (url.startswith("http://") or url.startswith("https://")):
        raise ApiError("URL must begin with http:// or https://")

    try:
        resp = requests.get(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            timeout=12,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise ApiError(f"Could not load job URL: {str(exc)}", status_code=400)

    soup = BeautifulSoup(resp.text, "html.parser")

    # Remove non-content tags
    for el in soup(["script", "style", "noscript", "nav", "header", "footer", "svg"]):
        el.decompose()

    page_title = soup.title.string.strip() if soup.title and soup.title.string else ""

    # Look for common job container selectors or fallback to main/body
    candidates = soup.find_all(
        lambda tag: tag.name in ["article", "main", "div", "section"]
        and any(
            kw in " ".join(tag.get("class", [])).lower()
            or kw in (tag.get("id") or "").lower()
            for kw in ["job", "description", "posting", "details", "content", "role"]
        )
    )

    if candidates:
        best_candidate = max(candidates, key=lambda c: len(c.get_text()))
        raw_text = best_candidate.get_text(separator="\n", strip=True)
    else:
        body_el = soup.find("body") or soup
        raw_text = body_el.get_text(separator="\n", strip=True)

    raw_text = re.sub(r"\n{3,}", "\n\n", raw_text).strip()

    if len(raw_text) < 40:
        raise ApiError("Unable to extract sufficient job description text from this URL. Please paste the job description directly.")

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
    result = dict(res.data[0])
    result["title"] = page_title
    result["source_url"] = url
    return jsonify(result), 201


@matching_bp.post("/resume/optimize")
@require_auth
def optimize_bullets():
    user_id = g.user_id
    body = request.get_json(silent=True) or {}

    resume_id = body.get("resume_id")
    jd_id = body.get("jd_id")
    bullet_text = (body.get("bullet_text") or "").strip()
    missing_keywords = body.get("missing_keywords") or []

    sb = get_supabase()
    raw_resume_text = ""

    if resume_id:
        resume_res = (
            sb.table("resumes").select("*").eq("id", resume_id).eq("user_id", user_id).execute()
        )
        if resume_res.data:
            raw_resume_text = resume_res.data[0].get("raw_text") or ""

    if jd_id and not missing_keywords:
        jd_res = (
            sb.table("job_descriptions").select("*").eq("id", jd_id).eq("user_id", user_id).execute()
        )
        if jd_res.data:
            jd_skills = set(jd_res.data[0].get("parsed_requirements") or [])
            resume_skills = set(_tokenize(raw_resume_text)) if raw_resume_text else set()
            missing_keywords = sorted(jd_skills - resume_skills)[:10]

    # Extract target bullets
    bullets_to_optimize = []
    if bullet_text:
        lines = [line.strip().lstrip("•-*0123456789. ") for line in bullet_text.split("\n") if len(line.strip()) > 15]
        bullets_to_optimize = lines[:8] if lines else [bullet_text]
    elif raw_resume_text:
        candidates = []
        for line in raw_resume_text.split("\n"):
            clean_l = line.strip()
            if any(clean_l.startswith(prefix) for prefix in ["•", "-", "*", "–"]) or (len(clean_l) > 30 and re.match(r"^[A-Z][a-z]+ed\b", clean_l)):
                stripped = clean_l.lstrip("•-*–0123456789. ").strip()
                if len(stripped) > 25:
                    candidates.append(stripped)
        bullets_to_optimize = candidates[:6] if candidates else [raw_resume_text[:200]]

    if not bullets_to_optimize:
        raise ApiError("No resume text or bullets found to optimize.")

    kw_clause = ", ".join(missing_keywords[:8]) if missing_keywords else "Modern industry best practices and technical rigor"

    system_prompt = (
        "You are an expert executive resume writer and career coach specializing in the Google XYZ "
        "formula ('Accomplished [X] as measured by [Y], by doing [Z]') and the STAR framework "
        "(Situation, Task, Action, Result). Your objective is to transform weak or passive resume "
        "bullets into high-impact, quantifiable, action-oriented accomplishments incorporating target keywords."
    )

    user_prompt = f"""Target Missing Keywords / Skills to naturally integrate where relevant:
{kw_clause}

Original Resume Bullet Points to optimize:
{chr(10).join(f"- {b}" for b in bullets_to_optimize)}

Instructions:
1. For each original bullet, rewrite it into an optimized bullet following Google XYZ ("Accomplished [X] as measured by [Y], by doing [Z]") or STAR framework.
2. Ensure each optimized bullet begins with a strong active verb and includes a realistic metric suggestion (e.g. percentages, latency reduction, cost savings, user scale).
3. Weave in target missing keywords if contextually appropriate.
4. Output ONLY a valid JSON array of objects with the exact schema:
[
  {{
    "original": "original bullet point",
    "optimized": "optimized bullet point",
    "framework": "Google XYZ",
    "metric_suggestion": "+35% performance improvement",
    "keywords_added": ["skill1", "skill2"],
    "explanation": "concise explanation of why this rewrite stands out"
  }}
]
Do not wrap in markdown or add conversational intro/outro text. Return only valid JSON."""

    response_text = generate(user_prompt, system=system_prompt)

    cleaned_json = response_text.strip()
    if cleaned_json.startswith("```"):
        cleaned_json = re.sub(r"^```(?:json)?\s*", "", cleaned_json)
        cleaned_json = re.sub(r"\s*```$", "", cleaned_json)

    try:
        optimizations = json.loads(cleaned_json)
        if not isinstance(optimizations, list):
            optimizations = [optimizations]
    except Exception:
        optimizations = []
        for bullet in bullets_to_optimize:
            optimizations.append({
                "original": bullet,
                "optimized": f"Spearheaded key initiatives utilizing {missing_keywords[0] if missing_keywords else 'technical best practices'}, optimizing workflow velocity by 30% through targeted execution.",
                "framework": "Google XYZ",
                "metric_suggestion": "+30% velocity increase",
                "keywords_added": missing_keywords[:2] if missing_keywords else ["execution"],
                "explanation": "Applied Google XYZ framework with quantified impact and target keywords.",
            })

    return jsonify({
        "optimizations": optimizations,
        "keywords_targeted": missing_keywords[:8],
    }), 200


@matching_bp.post("/cover-letter")
@matching_bp.post("/matcher/cover-letter")
@require_auth
def generate_cover_letter():
    user_id = g.user_id
    body = request.get_json(silent=True) or {}

    resume_id = body.get("resume_id")
    jd_id = body.get("jd_id")
    resume_text = (body.get("resume_text") or "").strip()
    jd_text = (body.get("jd_text") or "").strip()
    company = (body.get("company") or "").strip() or "Hiring Team"
    role = (body.get("role") or "").strip() or "Target Role"
    tone = (body.get("tone") or "confident").strip().lower()

    sb = get_supabase()
    if resume_id and not resume_text:
        res = sb.table("resumes").select("raw_text").eq("id", resume_id).eq("user_id", user_id).execute()
        if res.data:
            resume_text = res.data[0].get("raw_text", "")

    if jd_id and not jd_text:
        jd_res = sb.table("job_descriptions").select("raw_text").eq("id", jd_id).eq("user_id", user_id).execute()
        if jd_res.data:
            jd_text = jd_res.data[0].get("raw_text", "")

    if not resume_text and not jd_text:
        raise ApiError("At least resume text or job description text is required.")

    tone_descriptions = {
        "confident": "assertive, accomplished, and results-driven with an emphasis on leadership and measurable outcomes",
        "enthusiastic": "passionate, energetic, and culturally aligned with high excitement for company mission",
        "executive": "strategic, high-level, visionary, focusing on business impact, ROI, and organizational scaling",
        "technical": "deeply analytical, precise, highlighting technical architecture, stack mastery, and problem-solving",
        "concise": "direct, punchy, bullet-oriented, and strictly to the point without boilerplate fluff",
    }
    tone_instruction = tone_descriptions.get(tone, tone_descriptions["confident"])

    system_prompt = (
        "You are an elite career strategist and executive speechwriter. "
        "You craft highly targeted, authentic, and compelling cover letters that stand out "
        "to hiring managers and recruiters. Avoid generic clichés (e.g. 'I am writing to apply...'). "
        "Open with an attention-grabbing value statement, ground arguments in concrete quantifiable metrics from "
        "the applicant's resume, and link them directly to the company's stated needs."
    )

    user_prompt = f"""Role: {role}
Company: {company}
Tone: {tone.capitalize()} ({tone_instruction})

Job Description Context:
{jd_text[:3000] if jd_text else 'Software Engineering & modern technical execution.'}

Applicant Resume Context:
{resume_text[:3000] if resume_text else 'Accomplished software engineer with full stack development experience.'}

Write a high-impact, modern 3 to 4 paragraph cover letter.
- Paragraph 1: An engaging, tailored opening stating why the candidate is exceptionally well-suited for {role} at {company}.
- Paragraph 2-3: Evidence-backed deep dive highlighting 2-3 specific accomplishments from the resume that directly solve challenges described in the JD.
- Paragraph 4: Confident, forward-looking call to action for a conversation.
- Include candidate sign-off placeholder: [Your Name] and [Contact Details].

Return the cover letter in clean markdown format."""

    cover_letter = generate(user_prompt, system=system_prompt)
    return jsonify({
        "cover_letter": cover_letter.strip(),
        "company": company,
        "role": role,
        "tone": tone,
    }), 200

