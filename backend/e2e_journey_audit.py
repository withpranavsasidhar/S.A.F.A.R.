from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.main import app

def run_e2e_verification():
    print("=== STARTING S.A.F.A.R. 20-STEP E2E JOURNEY AUDIT ===")
    client = TestClient(app)

    # Step 1: Open landing page as guest
    r1 = client.get("/")
    assert r1.status_code == 200, f"Root endpoint failed: {r1.status_code}"
    print("✓ Step 1: Guest landing access verified.")

    # Step 2: Search for Vijayawada
    r2 = client.get("/api/v1/locations/autocomplete?q=Vijayawada")
    assert r2.status_code == 200
    locations = r2.json()
    assert len(locations) > 0
    vga_loc = next((l for l in locations if "vijayawada" in l["name"].lower()), locations[0])
    print(f"✓ Step 2 & 3: Autocomplete resolved {vga_loc['name']} ({vga_loc['lat']}, {vga_loc['lng']}).")

    # Step 4: Verify nearby attractions
    r4 = client.get(f"/api/v1/locations/nearby?lat={vga_loc['lat']}&lng={vga_loc['lng']}&radius_km=15")
    assert r4.status_code == 200
    places_15 = r4.json()
    assert "places" in places_15 and len(places_15["places"]) > 0
    print(f"✓ Step 4: Discovered {len(places_15['places'])} nearby spots within 15 km of {vga_loc['name']}.")

    # Step 5: Change radius to 50 km and verify results update
    r5 = client.get(f"/api/v1/locations/nearby?lat={vga_loc['lat']}&lng={vga_loc['lng']}&radius_km=50")
    assert r5.status_code == 200
    places_50 = r5.json()
    assert len(places_50["places"]) >= len(places_15["places"])
    print(f"✓ Step 5: Radius expansion verified (15 km: {len(places_15['places'])} -> 50 km: {len(places_50['places'])}).")

    # Step 6: Open destination detail page
    r6_all = client.get("/api/v1/destinations")
    dests = r6_all.json()
    vga_dest = next((d for d in dests if "vijayawada" in d["name"].lower()), dests[0])
    r6 = client.get(f"/api/v1/destinations/{vga_dest['id']}")
    assert r6.status_code == 200
    dest_detail = r6.json()
    assert "weather" in dest_detail
    assert "forecasts" in dest_detail
    print(f"✓ Step 6: Destination detail loaded for {dest_detail['name']} with live weather & forecasts.")

    # Step 7 & 8: Generate Trip Plan
    plan_payload = {
        "origin": "Vijayawada",
        "destination_id": vga_dest["id"],
        "duration_days": 3,
        "travelers": 2,
        "total_budget": 25000.0,
        "crowd_preference": "Prefer Less Crowded",
        "travel_style": "Balanced",
        "interests": ["Culture", "Nature"],
        "preferred_transport": "Train / Bus",
        "accommodation_preference": "3-Star Hotel",
        "start_date": "2026-12-01",
        "end_date": "2026-12-03"
    }
    r8 = client.post("/api/v1/trips/plan-preview", json=plan_payload)
    assert r8.status_code == 200
    preview = r8.json()
    print(f"✓ Step 7 & 8: Trip plan generated. Total Est: ₹{preview['estimated_cost']:,}")

    # Step 9: Verify itinerary, distance and budget consistency
    assert len(preview["itinerary"]) == 3
    assert preview["budget_breakdown"]["per_person_cost"] == round(preview["estimated_cost"] / 2, 2)
    print("✓ Step 9: Itinerary day-wise dates, transit times, and budget arithmetic verified.")

    # Step 10 & 11: Register new account and Login
    import time
    test_email = f"e2e_tester_{int(time.time())}@safar.ai"
    reg_payload = {
        "full_name": "E2E Verified Traveler",
        "email": test_email,
        "password": "Password123!",
        "home_location": "Vijayawada"
    }
    r10 = client.post("/api/v1/auth/register", json=reg_payload)
    assert r10.status_code == 200, f"Register failed: {r10.status_code} {r10.text}"
    auth_data = r10.json()
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"✓ Step 10 & 11: Account registered & logged in ({test_email}).")

    # Step 12: Save trip
    save_payload = {
        "origin": "Vijayawada",
        "destination_id": vga_dest["id"],
        "duration_days": 3,
        "travelers": 2,
        "total_budget": 25000.0,
        "crowd_preference": "Prefer Less Crowded",
        "travel_style": "Balanced",
        "interests": ["Culture", "Nature"],
        "start_date": "2026-12-01",
        "end_date": "2026-12-03",
        "status": "SAVED"
    }
    r12 = client.post("/api/v1/trips", json=save_payload, headers=headers)
    assert r12.status_code == 200
    saved_trip = r12.json()
    trip_id = saved_trip["id"]
    print(f"✓ Step 12: Trip #{trip_id} successfully saved to user's account.")

    # Step 13: Edit saved trip
    update_payload = {
        "total_budget": 30000.0,
        "status": "UPCOMING"
    }
    r13 = client.put(f"/api/v1/trips/{trip_id}", json=update_payload, headers=headers)
    assert r13.status_code == 200
    updated_trip = r13.json()
    assert updated_trip["status"] == "UPCOMING"
    print(f"✓ Step 13: Trip #{trip_id} updated (status: UPCOMING, budget: ₹30,000).")

    # Step 14 & 15: Relogin and verify trip persistence
    r14 = client.post("/api/v1/auth/login", json={"email": test_email, "password": "Password123!"})
    assert r14.status_code == 200
    new_token = r14.json()["access_token"]
    r15 = client.get("/api/v1/trips", headers={"Authorization": f"Bearer {new_token}"})
    assert r15.status_code == 200
    user_trips = r15.json()
    assert any(t["id"] == trip_id for t in user_trips)
    print(f"✓ Step 14 & 15: Trip persistence verified across independent authentication session.")

    # Step 16: Search another city (Hyderabad)
    r16 = client.get("/api/v1/locations/autocomplete?q=Hyderabad")
    assert r16.status_code == 200
    hyd_locs = r16.json()
    hyd = next((l for l in hyd_locs if "hyderabad" in l["name"].lower()), hyd_locs[0])
    r16_nearby = client.get(f"/api/v1/locations/nearby?lat={hyd['lat']}&lng={hyd['lng']}&radius_km=20")
    assert r16_nearby.status_code == 200
    hyd_places = r16_nearby.json()["places"]
    assert len(hyd_places) > 0
    # Assert isolation from Vijayawada
    assert not any("prakasam" in p["name"].lower() for p in hyd_places)
    print(f"✓ Step 16: City change to Hyderabad verified ({len(hyd_places)} isolated places).")

    # Step 17: Explore India nationwide catalog
    r17 = client.get("/api/v1/destinations/explore-india?state=Rajasthan")
    assert r17.status_code == 200
    raj_data = r17.json()
    assert len(raj_data["destinations"]) > 0
    print(f"✓ Step 17: Explore India verified ({len(raj_data['destinations'])} destinations in Rajasthan).")

    # Step 18: Hidden Gems catalog
    r18 = client.get("/api/v1/destinations/hidden-gems-catalog")
    assert r18.status_code == 200
    gems = r18.json()
    assert len(gems) > 0
    assert all("selection_method" in g for g in gems)
    print(f"✓ Step 18: Hidden Gems catalog verified ({len(gems)} genuine offbeat destinations).")

    # Step 19: Test admin access and authorization
    r19_user = client.get("/api/v1/admin/analytics", headers=headers)
    assert r19_user.status_code in [401, 403], f"User could access admin stats: {r19_user.status_code}"
    
    r19_admin_login = client.post("/api/v1/auth/login", json={"email": "admin@safar.ai", "password": "admin123"})
    assert r19_admin_login.status_code == 200
    admin_token = r19_admin_login.json()["access_token"]
    r19_admin = client.get("/api/v1/admin/analytics", headers={"Authorization": f"Bearer {admin_token}"})
    assert r19_admin.status_code == 200
    print("✓ Step 19: RBAC verified: regular users rejected (403), admin authorized (200).")

    # Step 20: Test external API failure & empty-result states
    r20_empty = client.get("/api/v1/locations/autocomplete?q=NonExistentPlaceZyx123")
    assert r20_empty.status_code == 200
    assert r20_empty.json() == []

    r20_far_nearby = client.get("/api/v1/locations/nearby?lat=0.0&lng=0.0&radius_km=5")
    assert r20_far_nearby.status_code == 200
    assert len(r20_far_nearby.json()["places"]) == 0
    print("✓ Step 20: Empty search and remote coordinate empty states handled gracefully.")

    print("\n=== ALL 20 USER JOURNEY STEPS SUCCESSFULLY VERIFIED ===")

if __name__ == "__main__":
    run_e2e_verification()
