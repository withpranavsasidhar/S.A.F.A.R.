from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.db.models import User, Destination, Attraction, TravelPlan, Budget, Itinerary, ItineraryItem
from app.schemas.schemas import (
    CreateTripRequest, FullTripPlanOut, BudgetBreakdown, DayItineraryOut, ItineraryItemOut, DestinationOut,
    RecalculateTripRequest, TripUpdate
)
from app.core.security import get_current_user
from app.services.trip_service import TripService
from app.ml.optimizer import ItineraryOptimizer

router = APIRouter(prefix="/trips", tags=["Trips"])

def _serialize_plan(plan: TravelPlan) -> FullTripPlanOut:
    dest = plan.destination
    budget_db = plan.budget
    budget_breakdown = BudgetBreakdown(
        transport_cost=budget_db.transport_cost if budget_db else 0.0,
        stay_cost=budget_db.stay_cost if budget_db else 0.0,
        food_cost=budget_db.food_cost if budget_db else 0.0,
        activity_cost=budget_db.activity_cost if budget_db else 0.0,
        misc_cost=budget_db.misc_cost if budget_db else 0.0,
        buffer_amount=budget_db.buffer_amount if budget_db else 0.0,
        total_estimated=plan.estimated_cost,
        remaining_budget=budget_db.remaining_balance if budget_db else 0.0,
        per_person_cost=round(plan.estimated_cost / max(plan.travelers, 1), 2),
        per_day_cost=round(plan.estimated_cost / max(plan.duration_days, 1), 2),
        is_estimate=True
    )

    day_itineraries = []
    for itin in sorted(plan.itineraries, key=lambda x: x.day_number):
        sorted_items = sorted(itin.items, key=lambda x: x.order_index if x.order_index is not None else x.id)
        items_out = [
            ItineraryItemOut(
                id=item.id,
                time_slot=item.time_slot,
                activity_name=item.activity_name,
                description=item.description,
                duration_mins=item.duration_mins,
                cost=item.cost,
                travel_time_from_prev=item.travel_time_from_prev,
                latitude=item.latitude,
                longitude=item.longitude,
                attraction_id=item.attraction_id
            ) for item in sorted_items
        ]
        day_itineraries.append(DayItineraryOut(
            day_number=itin.day_number,
            date_label=itin.date_label,
            items=items_out
        ))

    accom_suggestion = ItineraryOptimizer.get_accommodation_suggestion(dest.name if dest else "Destination", "3-Star Hotel")
    culinary = ItineraryOptimizer.get_culinary_recommendations(dest.name if dest else "Destination")
    activities = ItineraryOptimizer.get_activity_recommendations(dest.name if dest else "Destination")

    return FullTripPlanOut(
        id=plan.id,
        title=plan.title,
        origin=plan.origin,
        destination=DestinationOut.model_validate(dest) if dest else None, # type: ignore
        duration_days=plan.duration_days,
        travelers=plan.travelers,
        total_budget=plan.total_budget,
        estimated_cost=plan.estimated_cost,
        crowd_preference=plan.crowd_preference,
        travel_style=plan.travel_style,
        interests=plan.interests,
        budget_breakdown=budget_breakdown,
        itinerary=day_itineraries,
        accommodation_suggestion=accom_suggestion,
        food_recommendations=culinary,
        activity_recommendations=activities,
        start_date=plan.start_date,
        end_date=plan.end_date,
        status=plan.status or "SAVED",
        per_person_cost=budget_breakdown.per_person_cost or 0.0,
        created_at=plan.created_at
    )

@router.post("/plan-preview", response_model=FullTripPlanOut)
def generate_trip_plan_preview(req: CreateTripRequest, db: Session = Depends(get_db)):
    dest = db.query(Destination).filter(Destination.id == req.destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    itineraries_raw = ItineraryOptimizer.generate_day_wise_itinerary(
        dest_name=dest.name,
        dest_lat=dest.latitude,
        dest_lng=dest.longitude,
        attractions=dest.attractions,
        duration_days=req.duration_days,
        travelers=req.travelers,
        custom_places=req.custom_places,
        start_date=req.start_date,
    )

    day_itineraries = []
    total_entry_from_plan = 0.0
    for day_raw in itineraries_raw:
        items = [ItineraryItemOut(**item) for item in day_raw["items"]]
        for item in items:
            if item.item_type == "attraction" or item.attraction_id:
                total_entry_from_plan += item.cost
        day_itineraries.append(DayItineraryOut(
            day_number=day_raw["day_number"],
            date_label=day_raw["date_label"],
            day_theme=day_raw.get("day_theme"),
            estimated_day_cost=day_raw.get("estimated_day_cost", 0.0),
            items=items
        ))

    budget_res = TripService.calculate_budget_breakdown(
        origin=req.origin,
        dest_name=dest.name,
        base_daily_cost=dest.base_daily_cost,
        duration_days=req.duration_days,
        travelers=req.travelers,
        total_budget=req.total_budget,
        travel_style=req.travel_style,
        cost_data=dest.cost_data,
        preferred_transport=req.preferred_transport,
        accommodation_preference=req.accommodation_preference,
        actual_entry_tickets=total_entry_from_plan if total_entry_from_plan > 0 else None,
    )

    budget_breakdown = BudgetBreakdown(**budget_res)
    accom_suggestion = ItineraryOptimizer.get_accommodation_suggestion(dest.name, req.accommodation_preference)
    culinary = ItineraryOptimizer.get_culinary_recommendations(dest.name)
    activities = ItineraryOptimizer.get_activity_recommendations(dest.name)

    return FullTripPlanOut(
        title=f"{req.duration_days}-Day Journey to {dest.name}",
        origin=req.origin,
        destination=DestinationOut.model_validate(dest),
        duration_days=req.duration_days,
        travelers=req.travelers,
        total_budget=req.total_budget,
        estimated_cost=budget_breakdown.total_estimated,
        crowd_preference=req.crowd_preference,
        travel_style=req.travel_style,
        interests=", ".join(req.interests),
        budget_breakdown=budget_breakdown,
        itinerary=day_itineraries,
        accommodation_suggestion=accom_suggestion,
        food_recommendations=culinary,
        activity_recommendations=activities,
        start_date=req.start_date,
        end_date=req.end_date,
        per_person_cost=budget_breakdown.per_person_cost
    )

@router.post("/recalculate", response_model=FullTripPlanOut)
def recalculate_trip_plan(req: RecalculateTripRequest, db: Session = Depends(get_db)):
    dest = db.query(Destination).filter(Destination.id == req.destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    recalc_itinerary_raw, actual_tickets, local_km = ItineraryOptimizer.recalculate_itinerary(
        req.itinerary,
        dest_lat=dest.latitude,
        dest_lng=dest.longitude,
    )

    budget_res = TripService.calculate_budget_breakdown(
        origin=req.origin,
        dest_name=dest.name,
        base_daily_cost=dest.base_daily_cost,
        duration_days=req.duration_days,
        travelers=req.travelers,
        total_budget=req.total_budget,
        travel_style=req.travel_style,
        cost_data=dest.cost_data,
        preferred_transport=req.preferred_transport,
        accommodation_preference=req.accommodation_preference,
        actual_entry_tickets=actual_tickets,
        local_km_estimate=local_km,
    )

    budget_breakdown = BudgetBreakdown(**budget_res)

    day_itineraries = []
    for day_raw in recalc_itinerary_raw:
        items = [ItineraryItemOut(**item) for item in day_raw["items"]]
        day_itineraries.append(DayItineraryOut(
            day_number=day_raw["day_number"],
            date_label=day_raw["date_label"],
            day_theme=day_raw.get("day_theme"),
            estimated_day_cost=day_raw.get("estimated_day_cost", 0.0),
            items=items
        ))

    accom_suggestion = ItineraryOptimizer.get_accommodation_suggestion(dest.name, req.accommodation_preference)
    culinary = ItineraryOptimizer.get_culinary_recommendations(dest.name)
    activities = ItineraryOptimizer.get_activity_recommendations(dest.name)

    return FullTripPlanOut(
        title=f"{req.duration_days}-Day Journey to {dest.name}",
        origin=req.origin,
        destination=DestinationOut.model_validate(dest),
        duration_days=req.duration_days,
        travelers=req.travelers,
        total_budget=req.total_budget,
        estimated_cost=budget_breakdown.total_estimated,
        crowd_preference="Prefer Less Crowded",
        travel_style=req.travel_style,
        interests="Customized Journey",
        budget_breakdown=budget_breakdown,
        itinerary=day_itineraries,
        accommodation_suggestion=accom_suggestion,
        food_recommendations=culinary,
        activity_recommendations=activities,
        per_person_cost=budget_breakdown.per_person_cost
    )

@router.post("", response_model=FullTripPlanOut)
def save_trip(req: CreateTripRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dest = db.query(Destination).filter(Destination.id == req.destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    budget_res = TripService.calculate_budget_breakdown(
        origin=req.origin,
        dest_name=dest.name,
        base_daily_cost=dest.base_daily_cost,
        duration_days=req.duration_days,
        travelers=req.travelers,
        total_budget=req.total_budget,
        travel_style=req.travel_style,
        cost_data=dest.cost_data,
        preferred_transport=req.preferred_transport,
        accommodation_preference=req.accommodation_preference,
    )
    budget_breakdown = BudgetBreakdown(**budget_res)

    itineraries_raw = ItineraryOptimizer.generate_day_wise_itinerary(
        dest_name=dest.name,
        dest_lat=dest.latitude,
        dest_lng=dest.longitude,
        attractions=dest.attractions,
        duration_days=req.duration_days,
        travelers=req.travelers,
        custom_places=req.custom_places,
        start_date=req.start_date,
    )

    # Save to database
    initial_status = "UPCOMING" if req.start_date else "SAVED"
    plan = TravelPlan(
        user_id=current_user.id,
        title=f"{req.duration_days}-Day Journey to {dest.name}",
        origin=req.origin,
        destination_id=dest.id,
        duration_days=req.duration_days,
        travelers=req.travelers,
        total_budget=req.total_budget,
        estimated_cost=budget_breakdown.total_estimated,
        crowd_preference=req.crowd_preference,
        travel_style=req.travel_style,
        interests=", ".join(req.interests),
        status=initial_status,
        start_date=req.start_date,
        end_date=req.end_date,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    budget_db = Budget(
        travel_plan_id=plan.id,
        transport_cost=budget_breakdown.transport_cost,
        stay_cost=budget_breakdown.stay_cost,
        food_cost=budget_breakdown.food_cost,
        activity_cost=budget_breakdown.activity_cost,
        misc_cost=budget_breakdown.misc_cost,
        buffer_amount=budget_breakdown.buffer_amount,
        remaining_balance=budget_breakdown.remaining_budget
    )
    db.add(budget_db)

    for day_raw in itineraries_raw:
        itinerary_db = Itinerary(
            travel_plan_id=plan.id,
            day_number=day_raw["day_number"],
            date_label=day_raw["date_label"]
        )
        db.add(itinerary_db)
        db.commit()
        db.refresh(itinerary_db)

        for idx, item in enumerate(day_raw["items"]):
            item_db = ItineraryItem(
                itinerary_id=itinerary_db.id,
                attraction_id=item["attraction_id"],
                time_slot=item["time_slot"],
                activity_name=item["activity_name"],
                description=item["description"],
                duration_mins=item["duration_mins"],
                cost=item["cost"],
                travel_time_from_prev=item["travel_time_from_prev"],
                latitude=item["latitude"],
                longitude=item["longitude"],
                order_index=idx
            )
            db.add(item_db)

    db.commit()
    db.refresh(plan)

    return _serialize_plan(plan)

@router.get("", response_model=List[FullTripPlanOut])
def get_user_trips(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plans = db.query(TravelPlan).filter(TravelPlan.user_id == current_user.id).order_by(TravelPlan.created_at.desc()).all()
    return [_serialize_plan(p) for p in plans]

@router.get("/{trip_id}", response_model=FullTripPlanOut)
def get_trip_detail(trip_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(TravelPlan).filter(TravelPlan.id == trip_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Trip plan not found")
    if plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to access this trip plan.")
    return _serialize_plan(plan)

@router.put("/{trip_id}", response_model=FullTripPlanOut)
def update_trip(trip_id: int, update_data: TripUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(TravelPlan).filter(TravelPlan.id == trip_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Trip plan not found")
    if plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this trip plan.")

    if update_data.title is not None and update_data.title.strip():
        plan.title = update_data.title.strip()
    if update_data.status is not None:
        valid_statuses = {"SAVED", "UPCOMING", "COMPLETED", "CANCELLED"}
        st = update_data.status.strip().upper()
        if st in valid_statuses:
            plan.status = st
    if update_data.start_date is not None:
        plan.start_date = update_data.start_date
    if update_data.end_date is not None:
        plan.end_date = update_data.end_date

    db.commit()
    db.refresh(plan)
    return _serialize_plan(plan)

@router.delete("/{trip_id}")
def delete_trip(trip_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(TravelPlan).filter(TravelPlan.id == trip_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Trip plan not found")
    if plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this trip plan.")
    db.delete(plan)
    db.commit()
    return {"status": "success", "message": "Trip plan deleted successfully"}
