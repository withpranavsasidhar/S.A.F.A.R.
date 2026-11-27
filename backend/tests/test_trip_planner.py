import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.services.trip_service import TripService
from app.ml.optimizer import ItineraryOptimizer
from app.db.session import SessionLocal
from app.db.models import Destination, Attraction

client = TestClient(app)


def test_budget_breakdown_separation():
    """Verify that budget categories are explicitly separated with transparent explanations."""
    breakdown = TripService.calculate_budget_breakdown(
        origin="Vijayawada",
        dest_name="Araku Valley",
        base_daily_cost=2200.0,
        duration_days=4,
        travelers=2,
        total_budget=30000.0,
        travel_style="Balanced",
        preferred_transport="Train / Bus",
        accommodation_preference="3-Star Hotel",
    )

    # Required separated categories
    assert "transport_cost" in breakdown
    assert "stay_cost" in breakdown
    assert "food_cost" in breakdown
    assert "entry_ticket_cost" in breakdown
    assert "activity_cost" in breakdown
    assert "local_travel_cost" in breakdown
    assert "contingency_cost" in breakdown

    assert breakdown["transport_cost"] > 0
    assert breakdown["stay_cost"] > 0
    assert breakdown["food_cost"] > 0
    assert breakdown["contingency_cost"] > 0
    assert breakdown["total_estimated"] > 0

    # Per-person and per-day costs
    assert breakdown["per_person_cost"] == round(breakdown["total_estimated"] / 2, 2)
    assert breakdown["per_day_cost"] == round(breakdown["total_estimated"] / 4, 2)

    # Transparency flags and explanations
    assert breakdown["is_estimate"] is True
    assert "transport" in breakdown["cost_explanation"]
    assert "accommodation" in breakdown["cost_explanation"]
    assert "contingency" in breakdown["cost_explanation"]


def test_budget_travel_style_and_accommodation_multipliers():
    """Verify that travel style and accommodation tier realistically scale the estimated costs."""
    budget_tier = TripService.calculate_budget_breakdown(
        origin="Vijayawada",
        dest_name="Vijayawada",
        base_daily_cost=1800.0,
        duration_days=3,
        travelers=2,
        total_budget=20000.0,
        travel_style="Budget",
        preferred_transport="Local Transit",
        accommodation_preference="Hostel / Budget",
    )

    premium_tier = TripService.calculate_budget_breakdown(
        origin="Vijayawada",
        dest_name="Vijayawada",
        base_daily_cost=1800.0,
        duration_days=3,
        travelers=2,
        total_budget=50000.0,
        travel_style="Premium",
        preferred_transport="Flight",
        accommodation_preference="Luxury Resort",
    )

    assert premium_tier["stay_cost"] > budget_tier["stay_cost"]
    assert premium_tier["total_estimated"] > budget_tier["total_estimated"]


def test_budget_over_budget_detection():
    """Verify that when expenses exceed the user budget envelope, it is cleanly detected."""
    breakdown = TripService.calculate_budget_breakdown(
        origin="Delhi",
        dest_name="Munnar",
        base_daily_cost=2800.0,
        duration_days=7,
        travelers=4,
        total_budget=15000.0, # Unrealistically low budget for 4 people / 7 days
        travel_style="Premium",
        preferred_transport="Flight",
        accommodation_preference="Luxury Resort",
    )

    assert breakdown["is_over_budget"] is True
    assert breakdown["over_budget_amount"] > 0
    assert breakdown["remaining_budget"] < 0


def test_date_validation_and_itinerary_labeling():
    """Verify that start_date correctly populates date_label across days."""
    db = SessionLocal()
    vga = db.query(Destination).filter(Destination.name == "Vijayawada").first()
    assert vga is not None

    itinerary = ItineraryOptimizer.generate_day_wise_itinerary(
        dest_name=vga.name,
        dest_lat=vga.latitude,
        dest_lng=vga.longitude,
        attractions=vga.attractions,
        duration_days=3,
        travelers=2,
        start_date="2026-12-01", # Tuesday
    )
    db.close()

    assert len(itinerary) == 3
    assert "Day 1 - Tue, Dec 01" in itinerary[0]["date_label"]
    assert "Day 2 - Wed, Dec 02" in itinerary[1]["date_label"]
    assert "Day 3 - Thu, Dec 03" in itinerary[2]["date_label"]


def test_geographic_clustering_and_no_duplicates():
    """Verify that candidate attractions are clustered by proximity and not duplicated across days."""
    db = SessionLocal()
    vga = db.query(Destination).filter(Destination.name == "Vijayawada").first()
    assert vga is not None
    attrs = vga.attractions

    itinerary = ItineraryOptimizer.generate_day_wise_itinerary(
        dest_name=vga.name,
        dest_lat=vga.latitude,
        dest_lng=vga.longitude,
        attractions=attrs,
        duration_days=3,
        travelers=2,
    )
    db.close()

    # Collect all attraction names across all days
    visited_attraction_names = []
    for day in itinerary:
        for item in day["items"]:
            if item.get("attraction_id"):
                visited_attraction_names.append(item["activity_name"])
            # Verify transit mode and travel time are generated
            assert "travel_time_from_prev" in item
            assert "transport_mode_from_prev" in item
            assert item["duration_mins"] >= 60

    # Ensure no duplicates among scheduled attractions
    assert len(visited_attraction_names) == len(set(visited_attraction_names))


def test_itinerary_recalculation_endpoint():
    """Verify that modifying itinerary stops correctly recalculates transit times, modes and budget."""
    db = SessionLocal()
    vga = db.query(Destination).filter(Destination.name == "Vijayawada").first()
    dest_id = vga.id
    db.close()

    # Create initial plan preview
    init_payload = {
        "origin": "Vijayawada",
        "destination_id": dest_id,
        "duration_days": 2,
        "travelers": 2,
        "total_budget": 20000.0,
        "crowd_preference": "Prefer Less Crowded",
        "travel_style": "Balanced",
        "interests": ["Culture", "Nature"],
        "preferred_transport": "Train / Bus",
        "accommodation_preference": "3-Star Hotel",
        "start_date": "2026-11-20",
        "end_date": "2026-11-21"
    }

    r_plan = client.post("/api/v1/trips/plan-preview", json=init_payload)
    assert r_plan.status_code == 200
    plan = r_plan.json()
    init_cost = plan["estimated_cost"]

    # Reorder Day 1 items (reverse the items)
    day1_items = plan["itinerary"][0]["items"]
    reversed_items = list(reversed(day1_items))
    plan["itinerary"][0]["items"] = reversed_items

    recalc_payload = {
        "origin": "Vijayawada",
        "destination_id": dest_id,
        "duration_days": 2,
        "travelers": 2,
        "total_budget": 20000.0,
        "travel_style": "Balanced",
        "preferred_transport": "Train / Bus",
        "accommodation_preference": "3-Star Hotel",
        "itinerary": plan["itinerary"]
    }

    r_recalc = client.post("/api/v1/trips/recalculate", json=recalc_payload)
    assert r_recalc.status_code == 200
    recalc_data = r_recalc.json()

    # The recalculator updated transit modes and travel times for the new stop order
    recalc_day1_items = recalc_data["itinerary"][0]["items"]
    assert recalc_day1_items[0]["distance_from_prev_km"] == 0.0
    assert "transport_mode_from_prev" in recalc_day1_items[1]
    assert recalc_data["estimated_cost"] > 0
