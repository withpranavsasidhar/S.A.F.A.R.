import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["system"] == "S.A.F.A.R."

def test_user_login():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "user@safar.ai", "password": "user123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "USER"

def test_admin_login():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@safar.ai", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "ADMIN"

def test_get_destinations():
    response = client.get("/api/v1/destinations")
    assert response.status_code == 200
    destinations = response.json()
    assert len(destinations) > 0
    assert any(d["name"] == "Araku Valley" for d in destinations)

def test_recommendation_scoring():
    payload = {
        "origin": "Vijayawada",
        "budget": 25000.0,
        "duration_days": 4,
        "travelers": 2,
        "interests": ["Nature", "Culture"],
        "crowd_preference": "Prefer Less Crowded",
        "travel_style": "Balanced"
    }
    response = client.post("/api/v1/recommendations", json=payload)
    assert response.status_code == 200
    recs = response.json()
    assert len(recs) > 0
    top_rec = recs[0]
    assert "overall_score" in top_rec
    assert "rationale" in top_rec
    assert len(top_rec["rationale"]) > 0

def test_trip_plan_preview():
    # First get Araku Valley destination ID
    dest_resp = client.get("/api/v1/destinations")
    destinations = dest_resp.json()
    araku = next(d for d in destinations if d["name"] == "Araku Valley")

    payload = {
        "origin": "Vijayawada",
        "destination_id": araku["id"],
        "duration_days": 4,
        "travelers": 2,
        "total_budget": 25000.0,
        "crowd_preference": "Prefer Less Crowded",
        "travel_style": "Balanced",
        "interests": ["Nature", "Culture"]
    }
    response = client.post("/api/v1/trips/plan-preview", json=payload)
    assert response.status_code == 200
    plan = response.json()
    assert plan["estimated_cost"] > 0  # cost calculated from origin-based distance
    assert len(plan["itinerary"]) == 4
    assert plan["budget_breakdown"]["total_estimated"] > 0
