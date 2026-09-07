from flask import Blueprint, request, jsonify, g

from services.supabase_client import get_supabase
from services.errors import ApiError
from services.auth import require_auth

applications_bp = Blueprint("applications", __name__, url_prefix="/api/applications")

ALLOWED_STAGES = {"applied", "screening", "interview", "offer", "rejected", "withdrawn"}


@applications_bp.get("")
@require_auth
def list_applications():
    user_id = g.user_id
    sb = get_supabase()
    res = sb.table("applications").select("*").eq("user_id", user_id).order(
        "created_at", desc=True
    ).execute()
    return jsonify(res.data)


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

    row = {
        "user_id": user_id,
        "company": company,
        "role": role,
        "stage": stage,
        "deadline": body.get("deadline"),
        "notes": body.get("notes"),
        "salary": body.get("salary"),
        "location": body.get("location"),
        "url": body.get("url"),
    }
    sb = get_supabase()
    res = sb.table("applications").insert(row).execute()
    return jsonify(res.data[0]), 201


@applications_bp.patch("/<application_id>")
@require_auth
def update_application(application_id):
    user_id = g.user_id
    body = request.get_json(silent=True) or {}

    if "stage" in body and body["stage"] not in ALLOWED_STAGES:
        raise ApiError(f"'stage' must be one of {sorted(ALLOWED_STAGES)}.")

    updatable_fields = {"company", "role", "stage", "deadline", "notes", "salary", "location", "url"}
    updates = {k: v for k, v in body.items() if k in updatable_fields}
    if not updates:
        raise ApiError("No valid fields to update.")

    sb = get_supabase()
    res = (
        sb.table("applications")
        .update(updates)
        .eq("id", application_id)
        .eq("user_id", user_id)
        .execute()
    )
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
