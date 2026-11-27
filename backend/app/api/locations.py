from dataclasses import asdict
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.ml.recommender import CITY_COORDS, _get_coords
from app.schemas.schemas import NearbyPlaceOut, NearbySearchOut, PlaceCandidateOut
from app.services.location_provider import GeoProviderError, geo_provider

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.get("/autocomplete", response_model=List[PlaceCandidateOut])
def autocomplete_locations(
    q: str = Query(..., min_length=2, max_length=120),
    limit: int = Query(6, ge=1, le=10),
):
    """Real-time location autocomplete backed by OpenStreetMap Nominatim."""
    try:
        candidates = geo_provider.autocomplete(q, limit=limit)
        return [PlaceCandidateOut(**asdict(c)) for c in candidates]
    except GeoProviderError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.get("/resolve", response_model=PlaceCandidateOut)
def resolve_location(q: str = Query(..., min_length=2, max_length=120)):
    """Resolve a city, town, or landmark to coordinates and bounding box."""
    try:
        candidate = geo_provider.geocode(q)
    except GeoProviderError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    if not candidate:
        raise HTTPException(status_code=404, detail=f"Could not resolve location '{q}'.")
    return PlaceCandidateOut(**asdict(candidate))


@router.get("/nearby", response_model=NearbySearchOut)
def search_nearby_places(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(10.0, ge=1.0, le=50.0),
    category: str = Query("all"),
    limit: int = Query(40, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Search real nearby attractions, temples, monuments, parks, food, and stays via Overpass API."""
    try:
        result = geo_provider.search_nearby(
            lat=lat,
            lng=lng,
            radius_km=radius_km,
            category=category,
            limit=limit,
            offset=offset,
        )
        return NearbySearchOut(
            center_lat=result.center_lat,
            center_lng=result.center_lng,
            radius_km=result.radius_km,
            category=result.category,
            total=result.total,
            limit=limit,
            offset=offset,
            provider=result.provider,
            places=[NearbyPlaceOut(**asdict(p)) for p in result.places],
        )
    except GeoProviderError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.get("/place/{osm_type}/{osm_id}", response_model=NearbyPlaceOut)
def get_place_detail(osm_type: str, osm_id: int):
    """Fetch detailed OpenStreetMap metadata for a discovered place."""
    if osm_type not in {"node", "way", "relation"}:
        raise HTTPException(status_code=400, detail="osm_type must be node, way, or relation")
    try:
        place = geo_provider.get_place_detail(osm_type, osm_id)
    except GeoProviderError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    return NearbyPlaceOut(**asdict(place))


@router.get("/geocode")
def geocode_city(q: str = Query(..., min_length=1)):
    """Fast local/OSM geocode helper used by the onboarding wizard."""
    key = q.strip().lower()
    lat, lng = _get_coords(q)
    is_known = key in CITY_COORDS
    if not is_known:
        try:
            candidate = geo_provider.geocode(q)
            if candidate:
                return {
                    "query": q,
                    "lat": candidate.lat,
                    "lng": candidate.lng,
                    "is_known": True,
                    "display_name": candidate.display_name,
                    "boundingbox": candidate.boundingbox,
                    "suggestions": [],
                }
        except GeoProviderError:
            pass

    suggestions = [
        c.title()
        for c in CITY_COORDS.keys()
        if c != "_default" and key in c
    ][:8]
    return {
        "query": q,
        "lat": lat,
        "lng": lng,
        "is_known": is_known,
        "suggestions": suggestions,
    }


@router.get("/cities")
def list_cities():
    seen = set()
    cities = []
    for c in CITY_COORDS.keys():
        if c == "_default":
            continue
        title = c.title()
        if title not in seen:
            seen.add(title)
            cities.append(title)
    return sorted(cities)
