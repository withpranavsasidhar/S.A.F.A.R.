from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from dataclasses import asdict
from app.db.session import get_db
from app.db.models import Destination, TourismDemand
from app.schemas.schemas import TripRequirementInput, RecommendationOut, DestinationOut, LiveWeatherOut
from app.ml.recommender import RecommendationEngine, _haversine_km, _get_coords
from app.ml.forecaster import DemandForecaster
from app.services.weather_provider import weather_provider
import datetime

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.post("", response_model=List[RecommendationOut])
def generate_recommendations(req: TripRequirementInput, db: Session = Depends(get_db)):
    destinations = db.query(Destination).all()

    # Resolve travel month: use provided value or fall back to current calendar month
    travel_month = req.travel_month or datetime.datetime.now().month

    # Resolve origin coordinates for distance calculation
    o_lat, o_lng = _get_coords(req.origin)

    results = []
    for dest in destinations:
        # --- Distance from origin to this destination ---
        distance_km = round(_haversine_km(o_lat, o_lng, dest.latitude, dest.longitude), 1)
        is_nearby = (req.radius_km is not None) and (distance_km <= req.radius_km)

        # --- Crowd level for the user's specific travel month ---
        demands = db.query(TourismDemand).filter(TourismDemand.destination_id == dest.id).all()
        demand_records = [{"month": d.month, "tourist_count": d.tourist_count} for d in demands]
        forecasts = DemandForecaster.forecast_destination_demand(demand_records)

        month_forecast = next(
            (f for f in forecasts if f["month_num"] == travel_month),
            forecasts[0] if forecasts else {"crowd_level": "MODERATE"}
        )
        crowd_lvl = month_forecast.get("crowd_level", "MODERATE")

        # --- Live Weather Context (graceful, cached, verified) ---
        weather_data = weather_provider.get_current_weather(dest.latitude, dest.longitude)
        weather_out = LiveWeatherOut(**asdict(weather_data)) if weather_data else None

        # --- Score the destination using complete user preference profile ---
        eval_res = RecommendationEngine.evaluate_destination(
            dest=dest,
            origin=req.origin,
            budget=req.budget,
            duration_days=req.duration_days,
            travelers=req.travelers,
            user_interests=req.interests,
            crowd_preference=req.crowd_preference,
            forecast_crowd_level=crowd_lvl,
            travel_style=req.travel_style,
            travel_month=travel_month,
            weather_info=weather_data
        )

        results.append(
            RecommendationOut(
                destination=DestinationOut.model_validate(dest),
                match_score=eval_res["match_score"],
                budget_fit_score=eval_res["budget_fit_score"],
                crowd_fit_score=eval_res["crowd_fit_score"],
                overall_score=eval_res["overall_score"],
                estimated_total_cost=eval_res["estimated_total_cost"],
                rationale=eval_res["rationale"],
                crowd_status=eval_res["crowd_status"],
                distance_km=distance_km,
                is_nearby=is_nearby,
                weather=weather_out
            )
        )

    # Sort: nearby first (by distance), then rest by overall score
    if req.radius_km is not None:
        nearby = sorted([r for r in results if r.is_nearby], key=lambda x: x.distance_km)
        rest   = sorted([r for r in results if not r.is_nearby], key=lambda x: x.overall_score, reverse=True)
        return nearby + rest

    # Default: sort by overall score descending
    results.sort(key=lambda x: x.overall_score, reverse=True)
    return results
