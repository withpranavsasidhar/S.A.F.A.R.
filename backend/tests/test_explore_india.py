import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.schemas import ExploreIndiaCatalogOut, HiddenGemOut, DestinationDetailOut

client = TestClient(app)

def test_explore_india_catalog_filters():
    # 1. Base nationwide request
    resp = client.get("/api/v1/destinations/explore-india")
    assert resp.status_code == 200
    data = resp.json()
    assert "destinations" in data
    assert "available_states" in data
    assert "available_regions" in data
    assert len(data["destinations"]) > 0

    # Verify multiple Indian states are available
    states = data["available_states"]
    assert any("Andhra Pradesh" in s for s in states)
    assert any("Rajasthan" in s or "Kerala" in s or "Karnataka" in s for s in states)

    # 2. Filter by State
    rajasthan_resp = client.get("/api/v1/destinations/explore-india", params={"state": "Rajasthan"})
    assert rajasthan_resp.status_code == 200
    raj_data = rajasthan_resp.json()["destinations"]
    assert len(raj_data) > 0
    assert all("Rajasthan" in d["state"] for d in raj_data)

    # 3. Filter by Region
    south_resp = client.get("/api/v1/destinations/explore-india", params={"region": "South India"})
    assert south_resp.status_code == 200
    south_data = south_resp.json()["destinations"]
    assert len(south_data) > 0
    assert all(
        any(s in d["state"] for s in ["Andhra Pradesh", "Kerala", "Karnataka", "Tamil Nadu", "Goa"])
        for d in south_data
    )

    # 4. Filter by Category
    nature_resp = client.get("/api/v1/destinations/explore-india", params={"category": "Nature"})
    assert nature_resp.status_code == 200
    nature_data = nature_resp.json()["destinations"]
    assert len(nature_data) > 0
    assert all(d["category"] == "Nature" for d in nature_data)

    # 5. Filter by Budget
    budget_resp = client.get("/api/v1/destinations/explore-india", params={"max_daily_budget": 2000.0})
    assert budget_resp.status_code == 200
    budget_data = budget_resp.json()["destinations"]
    assert all(d["base_daily_cost"] <= 2000.0 for d in budget_data)

def test_live_geographic_discovery_beyond_seed():
    """
    Verifies that searches across multiple Indian states are not limited to the seed database,
    returning live geographic discoveries from OpenStreetMap across Indian states.
    """
    # Search for an Indian city not in the static seed list, e.g. "Amritsar" or "Bhubaneswar"
    search_term = "Amritsar"
    resp = client.get("/api/v1/destinations/explore-india", params={"search": search_term, "include_live_geo": True})
    assert resp.status_code == 200
    data = resp.json()["destinations"]
    assert len(data) > 0

    target = next((d for d in data if search_term.lower() in d["name"].lower() or search_term.lower() in d["description"].lower()), None)
    assert target is not None
    assert target["latitude"] != 0.0
    assert target["longitude"] != 0.0
    assert "India" in target["state"] or len(target["state"]) > 2
    assert "directions_url" in target
    assert target["directions_url"] is not None

def test_hidden_gems_transparent_selection():
    """
    Verifies that hidden gems are based on meaningful criteria:
    lower popularity_score (<= 4.7), transparent qualification method, and factual rationale.
    """
    resp = client.get("/api/v1/destinations/hidden-gems-catalog")
    assert resp.status_code == 200
    gems = resp.json()
    assert len(gems) > 0

    for gem in gems:
        assert gem["popularity_score"] <= 4.7
        assert gem["gem_reason"] is not None
        assert len(gem["gem_reason"]) > 10
        assert gem["selection_method"] in ["SCENIC_OFFBEAT", "VERIFIED_HERITAGE", "CURATED_LOW_CROWD"]
        assert gem["verification_status"] == "Curated Editorial"
        assert gem["crowd_footprint"] in ["Low", "Moderate"]
        assert gem["latitude"] != 0.0
        assert gem["longitude"] != 0.0

    # Filter hidden gems by category
    culture_gems_resp = client.get("/api/v1/destinations/hidden-gems-catalog", params={"category": "Culture"})
    assert culture_gems_resp.status_code == 200
    culture_gems = culture_gems_resp.json()
    assert all("Culture" in g["category"] or "Heritage" in g["category"] or "Architecture" in g["category"] or "Spiritual" in g["category"] for g in culture_gems)

def test_destination_details_complete_real_info():
    """
    Verifies that destination details return real coordinates, attractions with durations & entry fees,
    accessibility notes, and directions URLs.
    """
    all_dests = client.get("/api/v1/destinations").json()
    assert len(all_dests) > 0
    dest_id = all_dests[0]["id"]

    detail_resp = client.get(f"/api/v1/destinations/{dest_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()

    assert detail["name"] is not None
    assert detail["state"] is not None
    assert detail["latitude"] != 0.0
    assert detail["longitude"] != 0.0
    assert detail["directions_url"] is not None
    assert "google.com/maps" in detail["directions_url"]
    assert detail["accessibility_notes"] is not None
    assert len(detail["attractions"]) > 0

    first_attr = detail["attractions"][0]
    assert first_attr["name"] is not None
    assert first_attr["est_duration_hours"] > 0.0
    assert first_attr["popularity_score"] > 0.0

def test_nationwide_vs_local_search_isolation():
    """
    Verifies that nationwide discovery is separate from city-specific local search:
    - City-specific search around Vijayawada (10 km radius) returns only local AP items.
    - Nationwide search returns destinations spanning multiple states across India.
    """
    # Local nearby search in Vijayawada
    local_resp = client.get("/api/v1/locations/nearby", params={
        "lat": 16.5062,
        "lng": 80.6480,
        "radius_km": 10.0,
        "category": "all"
    })
    assert local_resp.status_code == 200
    local_data = local_resp.json()
    # All nearby places are within 10 km
    for place in local_data["places"]:
        assert place["distance_km"] <= 10.5

    # Nationwide exploration
    nationwide_resp = client.get("/api/v1/destinations/explore-india")
    assert nationwide_resp.status_code == 200
    nationwide_destinations = nationwide_resp.json()["destinations"]
    
    # Must contain destinations from diverse states outside AP
    found_states = {d["state"] for d in nationwide_destinations}
    assert len(found_states) >= 3
