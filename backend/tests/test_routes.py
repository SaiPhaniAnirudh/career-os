"""Tests the Flask route logic in isolation: mocks the Supabase client and
auth so we can exercise every route's validation, status codes, and request
handling without a live network call or real session.
"""
import sys
from unittest.mock import MagicMock, patch

sys.path.insert(0, ".")


def _fake_execute_result(data):
    result = MagicMock()
    result.data = data
    return result


def make_chainable_table(return_data):
    m = MagicMock()
    m.select.return_value = m
    m.insert.return_value = m
    m.update.return_value = m
    m.delete.return_value = m
    m.eq.return_value = m
    m.neq.return_value = m
    m.order.return_value = m
    m.limit.return_value = m
    m.execute.return_value = _fake_execute_result(return_data)
    return m


def test_applications_crud():
    import app as app_module

    with patch("routes.applications.get_supabase") as mock_sb, \
         patch("services.auth.get_supabase") as mock_auth_sb:

        fake_user = MagicMock()
        fake_user.user.id = "11111111-1111-1111-1111-111111111111"
        mock_auth_sb.return_value.auth.get_user.return_value = fake_user

        client = app_module.app.test_client()
        headers = {"Authorization": "Bearer faketoken"}

        mock_sb.return_value.table.return_value = make_chainable_table([])
        r = client.get("/api/applications", headers=headers)
        assert r.status_code == 200, r.get_json()
        assert r.get_json() == []

        r = client.post("/api/applications", json={"company": "Acme"}, headers=headers)
        assert r.status_code == 400, r.get_json()

        r = client.post(
            "/api/applications",
            json={"company": "Acme", "role": "SWE", "stage": "not_a_real_stage"},
            headers=headers,
        )
        assert r.status_code == 400, r.get_json()

        created_row = {
            "id": "app-1",
            "user_id": "11111111-1111-1111-1111-111111111111",
            "company": "Acme",
            "role": "SWE",
            "stage": "applied",
        }
        mock_sb.return_value.table.return_value = make_chainable_table([created_row])
        r = client.post(
            "/api/applications", json={"company": "Acme", "role": "SWE"}, headers=headers
        )
        assert r.status_code == 201, r.get_json()

        r = client.patch("/api/applications/app-1", json={"bogus_field": 1}, headers=headers)
        assert r.status_code == 400, r.get_json()

        mock_sb.return_value.table.return_value = make_chainable_table([])
        r = client.patch("/api/applications/app-1", json={"stage": "offer"}, headers=headers)
        assert r.status_code == 404, r.get_json()

        mock_sb.return_value.table.return_value = make_chainable_table([created_row])
        r = client.delete("/api/applications/app-1", headers=headers)
        assert r.status_code == 200, r.get_json()

    print("test_applications_crud PASSED")


def test_missing_auth_header_rejected():
    import app as app_module

    client = app_module.app.test_client()
    for path, method in [
        ("/api/applications", "get"),
        ("/api/resume/upload", "post"),
        ("/api/interview/start", "post"),
        ("/api/skill-gaps", "get"),
    ]:
        r = getattr(client, method)(path)
        assert r.status_code == 401, f"{path} did not reject missing auth: {r.status_code}"
    print("test_missing_auth_header_rejected PASSED")


def test_applications_work_without_groq_key():
    """Regression test for the bug where get_supabase() -> Config.validate()
    used to also require GROQ_API_KEY, breaking non-AI routes when no Groq
    key was configured.
    """
    import app as app_module
    from config import Config

    with patch("routes.applications.get_supabase") as mock_sb, \
         patch("services.auth.get_supabase") as mock_auth_sb, \
         patch.object(Config, "GROQ_API_KEY", ""):

        fake_user = MagicMock()
        fake_user.user.id = "u1"
        mock_auth_sb.return_value.auth.get_user.return_value = fake_user
        mock_sb.return_value.table.return_value = make_chainable_table([])

        client = app_module.app.test_client()
        r = client.get("/api/applications", headers={"Authorization": "Bearer faketoken"})
        assert r.status_code == 200, r.get_json()

    print("test_applications_work_without_groq_key PASSED")


def test_skill_gaps_aggregates_and_ranks_missing_keywords():
    import app as app_module

    with patch("routes.skill_gaps.get_supabase") as mock_sb, \
         patch("services.auth.get_supabase") as mock_auth_sb:

        fake_user = MagicMock()
        fake_user.user.id = "u1"
        mock_auth_sb.return_value.auth.get_user.return_value = fake_user

        rows = [
            {"missing_keywords": ["sql", "docker"], "created_at": "2026-01-01"},
            {"missing_keywords": ["sql", "kubernetes"], "created_at": "2026-01-02"},
            {"missing_keywords": [], "created_at": "2026-01-03"},
        ]
        mock_sb.return_value.table.return_value = make_chainable_table(rows)

        client = app_module.app.test_client()
        r = client.get("/api/skill-gaps", headers={"Authorization": "Bearer faketoken"})
        assert r.status_code == 200, r.get_json()
        body = r.get_json()
        assert body["matches_considered"] == 2, body
        assert body["gaps"][0]["skill"] == "sql" and body["gaps"][0]["times_missing"] == 2, body

    print("test_skill_gaps_aggregates_and_ranks_missing_keywords PASSED")


def test_interview_503_when_groq_key_missing():
    import app as app_module
    from config import Config

    with patch("routes.interview.get_supabase") as mock_sb, \
         patch("services.auth.get_supabase") as mock_auth_sb, \
         patch.object(Config, "GROQ_API_KEY", ""):

        fake_user = MagicMock()
        fake_user.user.id = "u1"
        mock_auth_sb.return_value.auth.get_user.return_value = fake_user

        client = app_module.app.test_client()
        r = client.post(
            "/api/interview/start", json={}, headers={"Authorization": "Bearer faketoken"}
        )
        assert r.status_code == 503, r.get_json()

    print("test_interview_503_when_groq_key_missing PASSED")


def test_application_extended_fields():
    import app as app_module

    with patch("routes.applications.get_supabase") as mock_sb, \
         patch("services.auth.get_supabase") as mock_auth_sb:

        fake_user = MagicMock()
        fake_user.user.id = "u1"
        mock_auth_sb.return_value.auth.get_user.return_value = fake_user

        created_row = {
            "id": "app-2",
            "user_id": "u1",
            "company": "Stripe",
            "role": "Staff Engineer",
            "stage": "applied",
            "location": "Remote",
            "salary": "$250k",
            "url": "https://stripe.com/jobs/123",
        }
        mock_sb.return_value.table.return_value = make_chainable_table([created_row])

        client = app_module.app.test_client()
        headers = {"Authorization": "Bearer faketoken"}
        r = client.post(
            "/api/applications",
            json={
                "company": "Stripe",
                "role": "Staff Engineer",
                "location": "Remote",
                "salary": "$250k",
                "url": "https://stripe.com/jobs/123",
            },
            headers=headers,
        )
        assert r.status_code == 201, r.get_json()
        assert r.get_json()["location"] == "Remote"
        assert r.get_json()["salary"] == "$250k"

        r = client.patch(
            "/api/applications/app-2",
            json={"location": "San Francisco", "salary": "$260k"},
            headers=headers,
        )
        assert r.status_code == 200, r.get_json()

    print("test_application_extended_fields PASSED")


def test_interview_sessions_list():
    import app as app_module

    with patch("routes.interview.get_supabase") as mock_sb, \
         patch("services.auth.get_supabase") as mock_auth_sb:

        fake_user = MagicMock()
        fake_user.user.id = "u1"
        mock_auth_sb.return_value.auth.get_user.return_value = fake_user

        sessions_data = [
            {
                "id": "sess-1",
                "transcript": [{"role": "interviewer", "content": "What is REST?"}],
                "feedback": {"summary": "Strong answers."},
                "created_at": "2026-08-01T00:00:00Z",
            }
        ]
        mock_sb.return_value.table.return_value = make_chainable_table(sessions_data)

        client = app_module.app.test_client()
        r = client.get("/api/interview/sessions", headers={"Authorization": "Bearer faketoken"})
        assert r.status_code == 200, r.get_json()
        assert len(r.get_json()) == 1
        assert r.get_json()[0]["id"] == "sess-1"

    print("test_interview_sessions_list PASSED")


def test_matching_stopword_filtering():
    import app as app_module

    with patch("routes.matching.get_supabase") as mock_sb, \
         patch("services.auth.get_supabase") as mock_auth_sb:

        fake_user = MagicMock()
        fake_user.user.id = "u1"
        mock_auth_sb.return_value.auth.get_user.return_value = fake_user

        mock_sb.return_value.table.return_value = make_chainable_table([{"id": "jd-1"}])

        client = app_module.app.test_client()
        raw_jd = (
            "We are a fast-paced company looking for an experienced candidate with strong "
            "skills and responsibilities. Required: Python, Docker, Kubernetes."
        )
        r = client.post(
            "/api/jd/submit",
            json={"raw_text": raw_jd},
            headers={"Authorization": "Bearer faketoken"},
        )
        assert r.status_code == 201, r.get_json()

        # Verify parsed_requirements from the mock insert call
        insert_args = mock_sb.return_value.table.return_value.insert.call_args[0][0]
        parsed = insert_args["parsed_requirements"]
        assert "python" in parsed
        assert "docker" in parsed
        assert "kubernetes" in parsed
        # Check boilerplate words are stripped
        assert "company" not in parsed
        assert "candidate" not in parsed
        assert "responsibilities" not in parsed
        assert "skills" not in parsed

    print("test_matching_stopword_filtering PASSED")


def test_peer_profile_and_discovery():
    import app as app_module

    with patch("routes.peers.get_supabase") as mock_sb, \
         patch("services.auth.get_supabase") as mock_auth_sb:

        fake_user = MagicMock()
        fake_user.user.id = "u1"
        mock_auth_sb.return_value.auth.get_user.return_value = fake_user

        client = app_module.app.test_client()
        headers = {"Authorization": "Bearer faketoken"}

        # 1. Profile save
        profile_row = {
            "user_id": "u1",
            "target_role": "Backend Engineer",
            "target_company": "Google",
            "skills": ["python", "docker"],
            "experience_level": "Mid-Level",
            "availability": "Weekends",
            "bio": "Prepping for system design",
            "contact_email": "u1@test.com",
        }
        mock_sb.return_value.table.return_value = make_chainable_table([])
        # First save (insert)
        r = client.post(
            "/api/peers/profile",
            json=profile_row,
            headers=headers,
        )
        assert r.status_code == 200, r.get_json()

        # 2. Peer discovery
        peer_candidate = {
            "user_id": "u2",
            "target_role": "Backend Software Engineer",
            "target_company": "Google",
            "skills": ["python", "kubernetes"],
            "experience_level": "Senior",
            "availability": "Evenings",
            "bio": "Looking for mock interview buddy",
            "contact_email": "u2@test.com",
        }
        mock_sb.return_value.table.return_value = make_chainable_table([peer_candidate])
        r = client.get("/api/peers", headers=headers)
        assert r.status_code == 200, r.get_json()
        peers = r.get_json()
        assert len(peers) == 1
        assert peers[0]["match_score"] > 40.0

        # 3. Connection request
        req_row = {"id": "req-1", "sender_id": "u1", "receiver_id": "u2", "status": "pending"}
        mock_sb.return_value.table.return_value = make_chainable_table([])
        r = client.post(
            "/api/peers/connect",
            json={"receiver_id": "u2", "message": "Hey, want to practice mocks?"},
            headers=headers,
        )
        assert r.status_code == 201, r.get_json()

    print("test_peer_profile_and_discovery PASSED")


if __name__ == "__main__":
    test_applications_crud()
    test_missing_auth_header_rejected()
    test_applications_work_without_groq_key()
    test_skill_gaps_aggregates_and_ranks_missing_keywords()
    test_interview_503_when_groq_key_missing()
    test_application_extended_fields()
    test_interview_sessions_list()
    test_matching_stopword_filtering()
    test_peer_profile_and_discovery()
    print("ALL TESTS PASSED")
