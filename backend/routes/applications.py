from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, g

from services.supabase_client import get_supabase
from services.errors import ApiError
from services.auth import require_auth

applications_bp = Blueprint("applications", __name__, url_prefix="/api/applications")

ALLOWED_STAGES = {"applied", "screening", "interview", "offer", "rejected", "withdrawn"}


def _parse_iso(dt_str):
    if not dt_str:
        return None
    try:
        clean = dt_str.replace("Z", "+00:00")
        return datetime.fromisoformat(clean)
    except Exception:
        return None


@applications_bp.get("")
@require_auth
def list_applications():
    user_id = g.user_id
    sb = get_supabase()
    res = sb.table("applications").select("*").eq("user_id", user_id).order(
        "created_at", desc=True
    ).execute()
    return jsonify(res.data)


@applications_bp.get("/analytics")
@require_auth
def get_analytics():
    user_id = g.user_id
    sb = get_supabase()
    res = sb.table("applications").select("*").eq("user_id", user_id).execute()
    apps = res.data or []

    total = len(apps)
    stage_counts = {s: 0 for s in ALLOWED_STAGES}
    for a in apps:
        stage = a.get("stage")
        if stage in stage_counts:
            stage_counts[stage] += 1
        else:
            stage_counts["applied"] += 1

    # Progressive funnel counts (cumulative progression through the pipeline)
    reached_applied = total
    reached_screening = stage_counts["screening"] + stage_counts["interview"] + stage_counts["offer"]
    reached_interview = stage_counts["interview"] + stage_counts["offer"]
    reached_offer = stage_counts["offer"]

    conv_screening = round(100.0 * reached_screening / total, 1) if total > 0 else 0.0
    conv_interview = round(100.0 * reached_interview / reached_screening, 1) if reached_screening > 0 else 0.0
    conv_offer = round(100.0 * reached_offer / reached_interview, 1) if reached_interview > 0 else 0.0

    funnel = [
        {
            "stage": "Applied",
            "count": reached_applied,
            "conversion_from_prev": 100.0 if total > 0 else 0.0,
            "drop_off_pct": 0.0,
        },
        {
            "stage": "Screening",
            "count": reached_screening,
            "conversion_from_prev": conv_screening,
            "drop_off_pct": round(100.0 - conv_screening, 1) if total > 0 else 0.0,
        },
        {
            "stage": "Interview",
            "count": reached_interview,
            "conversion_from_prev": conv_interview,
            "drop_off_pct": round(100.0 - conv_interview, 1) if reached_screening > 0 else 0.0,
        },
        {
            "stage": "Offer",
            "count": reached_offer,
            "conversion_from_prev": conv_offer,
            "drop_off_pct": round(100.0 - conv_offer, 1) if reached_interview > 0 else 0.0,
        },
    ]

    now = datetime.now(timezone.utc)
    active_apps = [a for a in apps if a.get("stage") not in ["rejected", "withdrawn"]]
    active_days_list = []
    recent_7_count = 0
    recent_30_count = 0

    locations = {}
    salaries = []

    for a in apps:
        created_str = a.get("created_at")
        dt = _parse_iso(created_str)
        if dt:
            age_days = max(0, (now - dt).total_seconds() / 86400.0)
            if a.get("stage") not in ["rejected", "withdrawn"]:
                active_days_list.append(age_days)
            if age_days <= 7.0:
                recent_7_count += 1
            if age_days <= 30.0:
                recent_30_count += 1

        loc = (a.get("location") or "").strip()
        if loc:
            locations[loc] = locations.get(loc, 0) + 1

        sal = (a.get("salary") or "").strip()
        if sal:
            salaries.append(sal)

    avg_active_days = round(sum(active_days_list) / len(active_days_list), 1) if active_days_list else 0.0

    top_locations = sorted(
        [{"location": k, "count": v} for k, v in locations.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:5]

    return jsonify({
        "total_applications": total,
        "active_applications": len(active_apps),
        "stage_counts": stage_counts,
        "funnel": funnel,
        "metrics": {
            "overall_offer_rate": round(100.0 * stage_counts["offer"] / total, 1) if total > 0 else 0.0,
            "interview_rate": round(100.0 * reached_interview / total, 1) if total > 0 else 0.0,
            "average_active_days": avg_active_days,
            "recent_7_days": recent_7_count,
            "recent_30_days": recent_30_count,
            "has_salary_count": len(salaries),
            "top_locations": top_locations,
        },
    })



@applications_bp.post("")
@require_auth
def create_application():
    user_id = g.user_id
    body = request.get_json(silent=True) or {}

    company = (body.get("company") or "").strip()
    role = (body.get("role") or "").strip()
    if not company or not role:
        raise ApiError("Both 'company' and 'role' are required.")

    stage = body.get("stage", "applied")
    if stage not in ALLOWED_STAGES:
        raise ApiError(f"'stage' must be one of {sorted(ALLOWED_STAGES)}.")

    deadline = (body.get("deadline") or "").strip() or None
    salary = (body.get("salary") or "").strip() or None
    location = (body.get("location") or "").strip() or None
    url = (body.get("url") or "").strip() or None
    notes = (body.get("notes") or "").strip() or None
    follow_up_date = (body.get("follow_up_date") or "").strip() or None
    timeline = body.get("timeline") or []

    base_row = {
        "user_id": user_id,
        "company": company,
        "role": role,
        "stage": stage,
        "deadline": deadline,
        "notes": notes,
    }
    extended = {}
    if salary is not None:
        extended["salary"] = salary
    if location is not None:
        extended["location"] = location
    if url is not None:
        extended["url"] = url
    if follow_up_date is not None:
        extended["follow_up_date"] = follow_up_date
    if timeline:
        extended["timeline"] = timeline

    full_row = {**base_row, **extended}
    sb = get_supabase()
    try:
        res = sb.table("applications").insert(full_row).execute()
    except Exception as exc:
        err_msg = str(getattr(exc, "message", exc)).lower()
        if "does not exist" in err_msg or getattr(exc, "code", "") == "42703":
            # Remote schema lacks extended columns — fall back to base fields
            res = sb.table("applications").insert(base_row).execute()
        else:
            raise
    return jsonify(res.data[0]), 201


@applications_bp.patch("/<application_id>")
@require_auth
def update_application(application_id):
    user_id = g.user_id
    body = request.get_json(silent=True) or {}

    if "stage" in body and body["stage"] not in ALLOWED_STAGES:
        raise ApiError(f"'stage' must be one of {sorted(ALLOWED_STAGES)}.")

    updatable_fields = {"company", "role", "stage", "deadline", "notes", "salary", "location", "url", "follow_up_date", "timeline"}
    updates = {k: v for k, v in body.items() if k in updatable_fields}
    if not updates:
        raise ApiError("No valid fields to update.")

    if "deadline" in updates and not (updates["deadline"] or "").strip():
        updates["deadline"] = None
    if "follow_up_date" in updates and not (updates["follow_up_date"] or "").strip():
        updates["follow_up_date"] = None

    sb = get_supabase()
    try:
        res = (
            sb.table("applications")
            .update(updates)
            .eq("id", application_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as exc:
        err_msg = str(getattr(exc, "message", exc)).lower()
        if "does not exist" in err_msg or getattr(exc, "code", "") == "42703":
            core_updates = {k: v for k, v in updates.items() if k in {"company", "role", "stage", "deadline", "notes"}}
            if not core_updates:
                return jsonify({"id": application_id, **updates})
            res = (
                sb.table("applications")
                .update(core_updates)
                .eq("id", application_id)
                .eq("user_id", user_id)
                .execute()
            )
        else:
            raise
    if not res.data:
        raise ApiError("Application not found.", status_code=404)
    return jsonify(res.data[0])


@applications_bp.delete("/<application_id>")
@require_auth
def delete_application(application_id):
    user_id = g.user_id
    sb = get_supabase()
    res = (
        sb.table("applications")
        .delete()
        .eq("id", application_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not res.data:
        raise ApiError("Application not found.", status_code=404)
    return jsonify({"deleted": True})
