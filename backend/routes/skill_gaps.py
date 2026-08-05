from collections import Counter

from flask import Blueprint, jsonify, g

from services.supabase_client import get_supabase
from services.auth import require_auth

skill_gaps_bp = Blueprint("skill_gaps", __name__, url_prefix="/api/skill-gaps")


@skill_gaps_bp.get("")
@require_auth
def list_skill_gaps():
    """Aggregates 'missing_keywords' across every match the user has run,
    ranked by how often each skill has come up missing. Derived entirely
    from existing match data — no new AI call needed.
    """
    user_id = g.user_id
    sb = get_supabase()
    res = (
        sb.table("matches")
        .select("missing_keywords, created_at")
        .eq("user_id", user_id)
        .execute()
    )

    counter = Counter()
    matches_considered = 0
    for row in res.data:
        keywords = row.get("missing_keywords") or []
        if keywords:
            matches_considered += 1
        counter.update(keywords)

    ranked = [
        {"skill": skill, "times_missing": count}
        for skill, count in counter.most_common(25)
    ]

    return jsonify(
        {
            "matches_considered": matches_considered,
            "gaps": ranked,
        }
    )
