import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.db.models import User, TravelPlan

client = TestClient(app)

def test_user_registration_validation():
    # Password too short (< 6 chars)
    short_pw = client.post(
        "/api/v1/auth/register",
        json={"email": "shortpw@test.com", "password": "123", "full_name": "Test User", "home_location": "Vijayawada"}
    )
    assert short_pw.status_code == 422
    assert "at least 6 characters" in short_pw.json()["detail"]

    # Full name too short (< 2 chars)
    short_name = client.post(
        "/api/v1/auth/register",
        json={"email": "shortname@test.com", "password": "securepassword123", "full_name": "A", "home_location": "Vijayawada"}
    )
    assert short_name.status_code == 422
    assert "at least 2 characters" in short_name.json()["detail"]

    # Invalid email
    invalid_email = client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": "securepassword123", "full_name": "Valid Name", "home_location": "Vijayawada"}
    )
    assert invalid_email.status_code == 422

    # Successful registration
    import uuid
    unique_email = f"user_{uuid.uuid4().hex[:8]}@test.com"
    success_resp = client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "securepassword123", "full_name": "Valid User", "home_location": "Vijayawada"}
    )
    assert success_resp.status_code == 200
    data = success_resp.json()
    assert "access_token" in data
    assert data["role"] == "USER"
    assert data["full_name"] == "Valid User"

    # Verify password is never stored as plain text
    db = SessionLocal()
    try:
        user_in_db = db.query(User).filter(User.email == unique_email).first()
        assert user_in_db is not None
        assert user_in_db.password_hash != "securepassword123"
        assert "$" in user_in_db.password_hash  # PBKDF2 hash format
    finally:
        db.close()

def test_duplicate_registration_fails():
    import uuid
    email = f"dup_{uuid.uuid4().hex[:8]}@test.com"
    r1 = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "password123", "full_name": "First User", "home_location": "Vijayawada"}
    )
    assert r1.status_code == 200

    r2 = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "anotherpassword123", "full_name": "Second User", "home_location": "Vijayawada"}
    )
    assert r2.status_code == 400
    assert "already exists" in r2.json()["detail"].lower()

def test_login_invalid_credentials():
    # Wrong password
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "user@safar.ai", "password": "wrongpassword"}
    )
    assert resp.status_code == 401
    assert "invalid email or password" in resp.json()["detail"].lower()

    # Non-existent user
    resp2 = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@safar.ai", "password": "password123"}
    )
    assert resp2.status_code == 401
    assert "invalid email or password" in resp2.json()["detail"].lower()

def test_login_and_profile_endpoint():
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "user@safar.ai", "password": "user123"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # GET /auth/me
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "user@safar.ai"
    assert me_data["role"] == "USER"

    # PUT /auth/me
    update_resp = client.put(
        "/api/v1/auth/me",
        headers=headers,
        json={"full_name": "Updated Safar Traveler", "home_location": "Guntur"}
    )
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["full_name"] == "Updated Safar Traveler"
    assert updated_data["home_location"] == "Guntur"

    # Restore full name for clean state
    client.put(
        "/api/v1/auth/me",
        headers=headers,
        json={"full_name": "Demo Traveler", "home_location": "Vijayawada"}
    )

def test_protected_endpoints_reject_unauthorized():
    # Missing auth token
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/trips").status_code == 401
    assert client.post("/api/v1/trips", json={}).status_code == 401
    assert client.delete("/api/v1/trips/9999").status_code == 401

    # Invalid token format
    assert client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid_garbage_token"}).status_code == 401

def test_trip_ownership_isolation():
    import uuid
    # Create User A
    email_a = f"usera_{uuid.uuid4().hex[:6]}@test.com"
    resp_a = client.post(
        "/api/v1/auth/register",
        json={"email": email_a, "password": "password123", "full_name": "User Alpha", "home_location": "Vijayawada"}
    )
    token_a = resp_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Create User B
    email_b = f"userb_{uuid.uuid4().hex[:6]}@test.com"
    resp_b = client.post(
        "/api/v1/auth/register",
        json={"email": email_b, "password": "password123", "full_name": "User Beta", "home_location": "Hyderabad"}
    )
    token_b = resp_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a trip
    dest_resp = client.get("/api/v1/destinations")
    dest_id = dest_resp.json()[0]["id"]
    create_payload = {
        "origin": "Vijayawada",
        "destination_id": dest_id,
        "duration_days": 3,
        "travelers": 2,
        "total_budget": 20000.0,
        "crowd_preference": "Prefer Less Crowded",
        "travel_style": "Balanced",
        "interests": ["Nature"],
        "start_date": "2026-12-01",
        "end_date": "2026-12-04"
    }
    trip_create = client.post("/api/v1/trips", json=create_payload, headers=headers_a)
    assert trip_create.status_code == 200
    trip_data = trip_create.json()
    trip_id = trip_data["id"]
    assert trip_data["status"] == "UPCOMING"
    assert trip_data["start_date"] == "2026-12-01"

    # User A can read their trip
    detail_a = client.get(f"/api/v1/trips/{trip_id}", headers=headers_a)
    assert detail_a.status_code == 200
    assert detail_a.json()["id"] == trip_id

    # User B CANNOT read User A's trip (Strict 403 Forbidden)
    detail_b = client.get(f"/api/v1/trips/{trip_id}", headers=headers_b)
    assert detail_b.status_code == 403
    assert "permission" in detail_b.json()["detail"].lower()

    # User B CANNOT update User A's trip (Strict 403 Forbidden)
    update_b = client.put(
        f"/api/v1/trips/{trip_id}",
        json={"title": "Hacked Title", "status": "COMPLETED"},
        headers=headers_b
    )
    assert update_b.status_code == 403

    # User B CANNOT delete User A's trip (Strict 403 Forbidden)
    delete_b = client.delete(f"/api/v1/trips/{trip_id}", headers=headers_b)
    assert delete_b.status_code == 403

    # User A CAN update their own trip
    update_a = client.put(
        f"/api/v1/trips/{trip_id}",
        json={"title": "Alpha's Updated Journey", "status": "SAVED"},
        headers=headers_a
    )
    assert update_a.status_code == 200
    assert update_a.json()["title"] == "Alpha's Updated Journey"
    assert update_a.json()["status"] == "SAVED"

    # User A CAN delete their own trip
    delete_a = client.delete(f"/api/v1/trips/{trip_id}", headers=headers_a)
    assert delete_a.status_code == 200

    # Once deleted, accessing returns 404
    assert client.get(f"/api/v1/trips/{trip_id}", headers=headers_a).status_code == 404

def test_admin_authorization():
    # User token
    user_login = client.post(
        "/api/v1/auth/login",
        json={"email": "user@safar.ai", "password": "user123"}
    )
    user_token = user_login.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # Regular user attempting to access Admin Analytics must be rejected with 403
    resp_unauth = client.get("/api/v1/admin/analytics", headers=user_headers)
    assert resp_unauth.status_code == 403
    assert "admin privileges required" in resp_unauth.json()["detail"].lower()

    # Admin token
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@safar.ai", "password": "admin123"}
    )
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin user successfully accesses Admin Analytics
    resp_auth = client.get("/api/v1/admin/analytics", headers=admin_headers)
    assert resp_auth.status_code == 200
    analytics_data = resp_auth.json()
    assert "metrics" in analytics_data
    assert "popular_destinations" in analytics_data

def test_db_persistence_across_sessions():
    import uuid
    email = f"persist_{uuid.uuid4().hex[:6]}@test.com"
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "persistentpw123", "full_name": "Persistent Traveler", "home_location": "Vijayawada"}
    )
    assert reg.status_code == 200

    # Query with a completely separate SQLAlchemy session to verify persistence
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        assert user is not None
        assert user.full_name == "Persistent Traveler"
        assert user.home_location == "Vijayawada"
    finally:
        db.close()
