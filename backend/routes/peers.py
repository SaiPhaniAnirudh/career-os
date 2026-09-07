from flask import Blueprint, request, jsonify, g

from services.supabase_client import get_supabase
from services.errors import ApiError
from services.auth import require_auth

peers_bp = Blueprint("peers", __name__, url_prefix="/api/peers")


@peers_bp.get("/me")
@require_auth
def get_my_profile():
    user_id = g.user_id
    sb = get_supabase()
    res = sb.table("peer_profiles").select("*").eq("user_id", user_id).execute()
    profile = res.data[0] if res.data else None
    return jsonify(profile)


@peers_bp.post("/profile")
@require_auth
def save_profile():
    user_id = g.user_id
    body = request.get_json(silent=True) or {}

    target_role = (body.get("target_role") or "").strip()
    if not target_role:
        raise ApiError("'target_role' is required.")

    skills = body.get("skills") or []
    if isinstance(skills, str):
        skills = [s.strip().lower() for s in skills.split(",") if s.strip()]
    elif isinstance(skills, list):
        skills = [str(s).strip().lower() for s in skills if str(s).strip()]

    profile_data = {
        "user_id": user_id,
        "target_role": target_role,
        "target_company": (body.get("target_company") or "").strip(),
        "skills": skills,
        "experience_level": body.get("experience_level") or "Mid-Level",
        "availability": body.get("availability") or "Flexible",
        "bio": (body.get("bio") or "").strip(),
        "contact_email": (body.get("contact_email") or "").strip() or None,
    }

    sb = get_supabase()
    # Check if profile exists for upsert behavior
    existing = sb.table("peer_profiles").select("id").eq("user_id", user_id).execute()
    if existing.data:
        res = (
            sb.table("peer_profiles")
            .update(profile_data)
            .eq("user_id", user_id)
            .execute()
        )
    else:
        res = sb.table("peer_profiles").insert(profile_data).execute()

    return jsonify(res.data[0] if res.data else profile_data), 200


@peers_bp.get("")
@require_auth
def list_peers():
    """Discovers peer profiles (excluding current user).
    Calculates peer compatibility based on shared target roles, companies, and skills.
    """
    user_id = g.user_id
    sb = get_supabase()

    # Get current user's profile for matching
    my_res = sb.table("peer_profiles").select("*").eq("user_id", user_id).execute()
    my_profile = my_res.data[0] if my_res.data else None

    my_skills = set(my_profile.get("skills") or []) if my_profile else set()
    my_role = (my_profile.get("target_role") or "").lower() if my_profile else ""
    my_company = (my_profile.get("target_company") or "").lower() if my_profile else ""

    # Fetch peers
    peers_res = (
        sb.table("peer_profiles")
        .select("*")
        .neq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    peers = []
    for peer in peers_res.data:
        peer_skills = set(peer.get("skills") or [])
        peer_role = (peer.get("target_role") or "").lower()
        peer_company = (peer.get("target_company") or "").lower()

        # Calculate compatibility heuristic (0 - 100%)
        score = 40.0  # Base common ground

        # Role similarity bonus
        if my_role and peer_role:
            if my_role in peer_role or peer_role in my_role:
                score += 25.0

        # Company match bonus
        if my_company and peer_company and my_company == peer_company:
            score += 15.0

        # Shared skills bonus
        overlap = my_skills & peer_skills
        if my_skills or peer_skills:
            union = my_skills | peer_skills
            if union:
                score += round(20.0 * (len(overlap) / len(union)), 1)

        peer_with_score = dict(peer)
        peer_with_score["match_score"] = min(round(score, 1), 100.0)
        peer_with_score["shared_skills"] = sorted(list(overlap))
        peers.append(peer_with_score)

    # Sort descending by compatibility score
    peers.sort(key=lambda x: x["match_score"], reverse=True)
    return jsonify(peers)


@peers_bp.post("/connect")
@require_auth
def send_request():
    user_id = g.user_id
    body = request.get_json(silent=True) or {}
    receiver_id = body.get("receiver_id")
    message = (body.get("message") or "").strip()

    if not receiver_id:
        raise ApiError("'receiver_id' is required.")
    if receiver_id == user_id:
        raise ApiError("You cannot send a connection request to yourself.")

    sb = get_supabase()
    # Check for existing request
    existing = (
        sb.table("peer_requests")
        .select("id, status")
        .eq("sender_id", user_id)
        .eq("receiver_id", receiver_id)
        .execute()
    )
    if existing.data and existing.data[0]["status"] == "pending":
        raise ApiError("A pending connection request already exists.", status_code=409)

    res = (
        sb.table("peer_requests")
        .insert(
            {
                "sender_id": user_id,
                "receiver_id": receiver_id,
                "message": message,
                "status": "pending",
            }
        )
        .execute()
    )
    return jsonify(res.data[0] if res.data else {"sender_id": user_id, "receiver_id": receiver_id, "status": "pending"}), 201


@peers_bp.get("/requests")
@require_auth
def list_requests():
    user_id = g.user_id
    sb = get_supabase()

    # Requests received
    incoming = (
        sb.table("peer_requests")
        .select("id, sender_id, status, message, created_at")
        .eq("receiver_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    # Requests sent
    outgoing = (
        sb.table("peer_requests")
        .select("id, receiver_id, status, message, created_at")
        .eq("sender_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    return jsonify({"incoming": incoming.data, "outgoing": outgoing.data})


@peers_bp.patch("/requests/<request_id>")
@require_auth
def respond_request(request_id):
    user_id = g.user_id
    body = request.get_json(silent=True) or {}
    status = body.get("status")

    if status not in ("accepted", "declined"):
        raise ApiError("'status' must be either 'accepted' or 'declined'.")

    sb = get_supabase()
    res = (
        sb.table("peer_requests")
        .update({"status": status})
        .eq("id", request_id)
        .eq("receiver_id", user_id)
        .execute()
    )
    if not res.data:
        raise ApiError("Request not found or unauthorized.", status_code=404)

    return jsonify(res.data[0])
