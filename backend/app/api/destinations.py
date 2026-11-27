from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from dataclasses import asdict
from app.db.session import get_db
from app.db.models import Destination, Attraction, TourismDemand, Event
from app.schemas.schemas import (
    DestinationOut, DestinationDetailOut, AttractionOut, ForecastOut,
    HiddenGemOut, SeasonalInsightOut, ExploreIndiaCatalogOut, NationwideDestinationOut,
    LiveWeatherOut, DestinationForecastReportOut
)
from app.ml.forecaster import DemandForecaster, DATA_SOURCE_NAME, FORECAST_HORIZON, MODEL_LIMITATIONS
from app.ml.recommender import _haversine_km
from app.services.nationwide_service import NationwideService
from app.services.weather_provider import weather_provider

router = APIRouter(prefix="/destinations", tags=["Destinations"])

@router.get("", response_model=List[DestinationOut])
def get_destinations(category: Optional[str] = None, search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Destination)
    if category and category != "All":
        query = query.filter(Destination.category == category)
    if search:
        query = query.filter(Destination.name.ilike(f"%{search}%") | Destination.state.ilike(f"%{search}%"))
    return query.all()

@router.get("/explore-india", response_model=ExploreIndiaCatalogOut)
def explore_india_destinations(
    search: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    interest: Optional[str] = Query(None),
    season: Optional[str] = Query(None),
    max_daily_budget: Optional[float] = Query(None),
    include_live_geo: bool = Query(True),
    limit: int = Query(60, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Dedicated nationwide exploration endpoint covering destinations across India.
    Supports filtering by state, region, category, travel interest, season, and budget.
    Augments curated destinations with live OpenStreetMap geographic discoveries across all Indian states.
    """
    return NationwideService.explore_india(
        db=db,
        search=search,
        state=state,
        region=region,
        category=category,
        interest=interest,
        season=season,
        max_daily_budget=max_daily_budget,
        include_live_geo=include_live_geo,
        limit=limit,
    )

@router.get("/hidden-gems-catalog", response_model=List[HiddenGemOut])
def get_hidden_gems_catalog(
    state: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    max_crowd_score: float = Query(4.7, ge=1.0, le=5.0),
    limit: int = Query(40, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Dedicated hidden-gems discovery catalog with transparent selection methods,
    factual qualification criteria, and clear differentiation between curated and inferred gems.
    """
    return NationwideService.get_hidden_gems_catalog(
        db=db,
        state=state,
        category=category,
        region=region,
        max_crowd_score=max_crowd_score,
        limit=limit,
    )

@router.get("/nearby", response_model=List[DestinationOut])
def get_nearby_destinations(lat: float, lng: float, radius_km: float = 100.0, db: Session = Depends(get_db)):
    all_dests = db.query(Destination).all()
    nearby = [d for d in all_dests if _haversine_km(lat, lng, d.latitude, d.longitude) <= radius_km]
    nearby.sort(key=lambda d: _haversine_km(lat, lng, d.latitude, d.longitude))
    return nearby


@router.get("/hidden-gems", response_model=List[HiddenGemOut])
def get_hidden_gems(
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    radius_km: Optional[float] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Return lesser-known attractions based on meaningful criteria:
    lower popularity_score (<= 4.7) and local cultural/natural significance.
    When lat/lng/radius_km are provided, only returns gems within that radius.
    """
    attractions = db.query(Attraction).filter(Attraction.popularity_score <= 4.7).all()
    gems: List[HiddenGemOut] = []

    for attr in attractions:
        dest = attr.destination
        if not dest:
            continue
        dist: Optional[float] = None
        if lat is not None and lng is not None:
            dist = round(_haversine_km(lat, lng, attr.latitude, attr.longitude), 1)
            if radius_km is not None and dist > radius_km:
                continue

        reason = (
            f"Lower crowd footprint ({attr.popularity_score}/5 popularity) • "
            f"{'Free local entry' if attr.entry_fee == 0 else f'Modest ₹{int(attr.entry_fee)} entry'} • "
            f"{attr.category} heritage in {dest.name}"
        )
        gems.append(
            HiddenGemOut(
                id=attr.id,
                destination_id=dest.id,
                destination_name=dest.name,
                state=dest.state,
                name=attr.name,
                category=attr.category,
                description=attr.description,
                popularity_score=attr.popularity_score,
                entry_fee=attr.entry_fee,
                est_duration_hours=attr.est_duration_hours,
                latitude=attr.latitude,
                longitude=attr.longitude,
                image_url=attr.image_url or dest.image_url,
                distance_km=dist,
                gem_reason=reason,
            )
        )

    if lat is not None and lng is not None:
        gems.sort(key=lambda g: (g.distance_km or 9999.0, g.popularity_score))
    else:
        gems.sort(key=lambda g: g.popularity_score)
    return gems


@router.get("/insights", response_model=List[SeasonalInsightOut])
def get_seasonal_insights(
    month: Optional[int] = Query(None, ge=1, le=12),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    radius_km: Optional[float] = Query(None),
    db: Session = Depends(get_db),
):
    """Return real seasonal demand forecasts and seeded events for the target month."""
    target_month = month or datetime.now().month
    all_dests = db.query(Destination).all()
    insights: List[SeasonalInsightOut] = []

    for dest in all_dests:
        dist: Optional[float] = None
        if lat is not None and lng is not None:
            dist = round(_haversine_km(lat, lng, dest.latitude, dest.longitude), 1)
            if radius_km is not None and dist > radius_km:
                continue

        demands = db.query(TourismDemand).filter(TourismDemand.destination_id == dest.id).all()
        demand_records = [{"month": d.month, "tourist_count": d.tourist_count} for d in demands]
        forecasts = DemandForecaster.forecast_destination_demand(demand_records)
        month_forecast = next((f for f in forecasts if f["month_num"] == target_month), forecasts[0] if forecasts else None)
        if not month_forecast:
            continue

        events = db.query(Event).filter(Event.destination_id == dest.id).all()
        ev_list = [
            {
                "name": e.name,
                "month": e.month,
                "description": e.description,
                "impact_on_crowd": e.impact_on_crowd,
            }
            for e in events
        ]

        insights.append(
            SeasonalInsightOut(
                destination_id=dest.id,
                destination_name=dest.name,
                state=dest.state,
                month=month_forecast["month"],
                predicted_demand=month_forecast["predicted_demand"],
                crowd_level=month_forecast["crowd_level"],
                season_type=month_forecast["season_type"],
                distance_km=dist,
                events=ev_list,
            )
        )

    if lat is not None and lng is not None:
        insights.sort(key=lambda i: i.distance_km or 9999.0)
    return insights

@router.get("/{dest_id}", response_model=DestinationDetailOut)
def get_destination_detail(dest_id: int, db: Session = Depends(get_db)):
    dest = db.query(Destination).filter(Destination.id == dest_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    
    # Get demand records
    demands = db.query(TourismDemand).filter(TourismDemand.destination_id == dest_id).all()
    demand_records = [{"month": d.month, "tourist_count": d.tourist_count} for d in demands]
    
    forecasts_data = DemandForecaster.forecast_destination_demand(demand_records)
    
    forecast_objs = [
        ForecastOut(
            month=f["month"],
            month_num=f["month_num"],
            predicted_demand=f["predicted_demand"],
            crowd_index=f["crowd_index"],
            crowd_level=f["crowd_level"],
            season_type=f["season_type"],
            model_accuracy=f.get("model_accuracy"),
            data_source=f.get("data_source"),
            forecast_period=f.get("forecast_period"),
            is_experimental=f.get("is_experimental", False),
            limitations=f.get("limitations")
        ) for f in forecasts_data
    ]

    # Live Weather context (verified, cached)
    weather_data = weather_provider.get_current_weather(dest.latitude, dest.longitude)
    weather_out = LiveWeatherOut(**asdict(weather_data)) if weather_data else None

    gmaps_url = f"https://www.google.com/maps/dir/?api=1&destination={dest.latitude},{dest.longitude}"
    access_notes = f"Accessible via domestic airport or railway junctions in {dest.state}. Local state transport and taxis connect central sights."

    return DestinationDetailOut(
        id=dest.id,
        name=dest.name,
        region=dest.region,
        state=dest.state,
        category=dest.category,
        description=dest.description,
        rating=dest.rating,
        base_daily_cost=dest.base_daily_cost,
        image_url=dest.image_url,
        latitude=dest.latitude,
        longitude=dest.longitude,
        best_months=dest.best_months,
        tags=dest.tags,
        attractions=[AttractionOut.model_validate(a) for a in dest.attractions],
        forecasts=forecast_objs,
        estimated_duration_days="2 - 4 Days",
        accessibility_notes=access_notes,
        directions_url=gmaps_url,
        weather=weather_out
    )

@router.get("/{dest_id}/forecast", response_model=List[ForecastOut])
def get_destination_forecast(dest_id: int, db: Session = Depends(get_db)):
    demands = db.query(TourismDemand).filter(TourismDemand.destination_id == dest_id).all()
    demand_records = [{"month": d.month, "tourist_count": d.tourist_count} for d in demands]
    forecasts = DemandForecaster.forecast_destination_demand(demand_records)
    return [ForecastOut(**f) for f in forecasts]

@router.get("/{dest_id}/forecast-report", response_model=DestinationForecastReportOut)
def get_destination_forecast_report(dest_id: int, db: Session = Depends(get_db)):
    dest = db.query(Destination).filter(Destination.id == dest_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    demands = db.query(TourismDemand).filter(TourismDemand.destination_id == dest_id).all()
    demand_records = [{"month": d.month, "tourist_count": d.tourist_count} for d in demands]
    forecasts = DemandForecaster.forecast_destination_demand(demand_records)

    eval_metric = forecasts[0].get("model_accuracy", "Evaluated") if forecasts else "Unavailable"
    is_exp = forecasts[0].get("is_experimental", False) if forecasts else True

    return DestinationForecastReportOut(
        destination_id=dest.id,
        destination_name=dest.name,
        forecast_period=FORECAST_HORIZON,
        data_source=DATA_SOURCE_NAME,
        validation_metric=eval_metric,
        is_experimental=is_exp,
        limitations=MODEL_LIMITATIONS,
        forecasts=[ForecastOut(**f) for f in forecasts]
    )
