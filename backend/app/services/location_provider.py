from __future__ import annotations

import math
import threading
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import httpx


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Compute straight-line Haversine distance in kilometers."""
    r = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    return round(r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


class GeoProviderError(Exception):
    """Raised when an upstream geographic provider fails, times out, or rate-limits."""

    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


@dataclass
class PlaceCandidate:
    place_id: str
    name: str
    display_name: str
    lat: float
    lng: float
    place_type: str
    state: Optional[str] = None
    country: Optional[str] = None
    boundingbox: Optional[List[float]] = None  # [south, north, west, east]


@dataclass
class NearbyPlace:
    place_id: str
    osm_type: str
    osm_id: int
    name: str
    category: str
    subcategory: str
    lat: float
    lng: float
    distance_km: float
    address: Optional[str] = None
    opening_hours: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class NearbySearchResult:
    center_lat: float
    center_lng: float
    radius_km: float
    category: str
    total: int
    places: List[NearbyPlace]
    provider: str


class LocationProvider(ABC):
    """Abstract provider interface so Nominatim/Overpass or other providers can be swapped."""

    @abstractmethod
    def autocomplete(self, query: str, limit: int = 6) -> List[PlaceCandidate]:
        raise NotImplementedError

    @abstractmethod
    def geocode(self, query: str) -> Optional[PlaceCandidate]:
        raise NotImplementedError

    @abstractmethod
    def search_nearby(
        self,
        lat: float,
        lng: float,
        radius_km: float,
        category: str = "all",
        limit: int = 40,
        offset: int = 0,
    ) -> NearbySearchResult:
        raise NotImplementedError

    @abstractmethod
    def get_place_detail(self, osm_type: str, osm_id: int) -> Optional[NearbyPlace]:
        raise NotImplementedError


# Category -> Nominatim structured OSM tag queries
CATEGORY_NOMINATIM_TAGS: Dict[str, List[Tuple[str, str]]] = {
    "attractions": [
        ("[tourism=attraction]", "attractions"),
        ("[tourism=museum]", "museums"),
        ("[historic=monument]", "monuments"),
    ],
    "temples": [
        ("[amenity=place_of_worship]", "temples"),
    ],
    "monuments": [
        ("[historic=monument]", "monuments"),
        ("[historic=fort]", "monuments"),
        ("[historic=memorial]", "monuments"),
    ],
    "parks": [
        ("[leisure=park]", "parks"),
        ("[leisure=garden]", "parks"),
    ],
    "museums": [
        ("[tourism=museum]", "museums"),
        ("[tourism=gallery]", "museums"),
    ],
    "viewpoints": [
        ("[tourism=viewpoint]", "viewpoints"),
    ],
    "activities": [
        ("[tourism=theme_park]", "activities"),
        ("[tourism=zoo]", "activities"),
        ("[leisure=water_park]", "activities"),
    ],
    "restaurants": [
        ("[amenity=restaurant]", "restaurants"),
        ("[amenity=cafe]", "restaurants"),
    ],
    "accommodation": [
        ("[tourism=hotel]", "accommodation"),
        ("[tourism=resort]", "accommodation"),
    ],
    "all": [
        ("[tourism=attraction]", "attractions"),
        ("[amenity=place_of_worship]", "temples"),
        ("[leisure=park]", "parks"),
        ("[amenity=restaurant]", "restaurants"),
        ("[tourism=hotel]", "accommodation"),
        ("[tourism=museum]", "museums"),
    ],
}


def _classify_nominatim_item(item: Dict[str, Any], default_cat: str) -> Tuple[str, str]:
    cat_cls = (item.get("category") or item.get("class") or "").lower()
    typ = (item.get("type") or "").lower()

    if typ == "place_of_worship":
        return "temples", "Temple / Place of Worship"
    if typ in {"museum", "gallery"}:
        return "museums", typ.title()
    if typ == "viewpoint":
        return "viewpoints", "Viewpoint"
    if cat_cls == "historic":
        return "monuments", typ.replace("_", " ").title() or "Monument"
    if typ in {"park", "garden", "nature_reserve"}:
        return "parks", typ.replace("_", " ").title()
    if typ in {"theme_park", "zoo", "water_park", "sports_centre", "stadium"}:
        return "activities", typ.replace("_", " ").title()
    if typ in {"restaurant", "cafe", "fast_food", "food_court"}:
        return "restaurants", typ.replace("_", " ").title()
    if typ in {"hotel", "guest_house", "resort", "hostel", "motel"}:
        return "accommodation", typ.replace("_", " ").title()
    if typ == "attraction" or cat_cls == "tourism":
        return "attractions", typ.replace("_", " ").title() or "Attraction"
    return default_cat, (typ or "Place").replace("_", " ").title()


def _format_nominatim_address(address: Dict[str, Any], display_name: str) -> Optional[str]:
    if not address:
        return display_name
    parts = [
        address.get("road"),
        address.get("suburb") or address.get("neighbourhood"),
        address.get("city") or address.get("town") or address.get("village") or address.get("state_district"),
        address.get("state"),
    ]
    cleaned = [str(p).strip() for p in parts if p and str(p).strip()]
    return ", ".join(cleaned) if cleaned else display_name


class _TTLCache:
    def __init__(self, ttl_seconds: int = 600, max_items: int = 256):
        self._ttl = ttl_seconds
        self._max_items = max_items
        self._data: Dict[str, Tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._data.get(key)
            if not entry:
                return None
            expires_at, value = entry
            if time.time() > expires_at:
                self._data.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            if len(self._data) >= self._max_items:
                oldest_key = min(self._data.keys(), key=lambda k: self._data[k][0])
                self._data.pop(oldest_key, None)
            self._data[key] = (time.time() + self._ttl, value)


class OSMGeoProvider(LocationProvider):
    """OpenStreetMap Nominatim provider with bounded viewbox discovery, caching, and rate limiting."""

    NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
    USER_AGENT = "SAFAR-Tourism-Planner/2.0 (https://localhost; educational-project)"

    def __init__(self):
        self._nominatim_lock = threading.Lock()
        self._last_nominatim_call = 0.0
        self._geo_cache = _TTLCache(ttl_seconds=1800, max_items=256)
        self._nearby_cache = _TTLCache(ttl_seconds=900, max_items=128)
        self._detail_cache = _TTLCache(ttl_seconds=1800, max_items=256)

    def _respect_nominatim_rate_limit(self) -> None:
        """Nominatim usage policy allows at most 1 request per second."""
        with self._nominatim_lock:
            elapsed = time.time() - self._last_nominatim_call
            if elapsed < 1.05:
                time.sleep(1.05 - elapsed)
            self._last_nominatim_call = time.time()

    def _nominatim_get(self, path: str, params: Dict[str, Any]) -> Any:
        self._respect_nominatim_rate_limit()
        headers = {
            "User-Agent": self.USER_AGENT,
            "Accept-Language": "en",
        }
        try:
            with httpx.Client(timeout=10.0, headers=headers) as client:
                resp = client.get(f"{self.NOMINATIM_BASE}{path}", params=params)
                if resp.status_code == 429:
                    raise GeoProviderError("Location search rate limit reached. Please wait a moment and retry.", 429)
                resp.raise_for_status()
                return resp.json()
        except httpx.TimeoutException as exc:
            raise GeoProviderError("Location service timed out. Please try again.", 504) from exc
        except httpx.HTTPError as exc:
            raise GeoProviderError(f"Location service unavailable: {exc}", 502) from exc

    @staticmethod
    def _parse_nominatim_candidate(item: Dict[str, Any]) -> PlaceCandidate:
        address = item.get("address") or {}
        bbox_raw = item.get("boundingbox")
        bbox: Optional[List[float]] = None
        if isinstance(bbox_raw, list) and len(bbox_raw) == 4:
            try:
                bbox = [float(x) for x in bbox_raw]
            except (TypeError, ValueError):
                bbox = None

        name = (
            item.get("name")
            or address.get("city")
            or address.get("town")
            or address.get("village")
            or item.get("display_name", "").split(",")[0].strip()
        )
        return PlaceCandidate(
            place_id=f"{item.get('osm_type', 'node')}/{item.get('osm_id', '')}",
            name=name,
            display_name=item.get("display_name", name),
            lat=float(item["lat"]),
            lng=float(item["lon"]),
            place_type=item.get("type") or item.get("class") or "place",
            state=address.get("state"),
            country=address.get("country"),
            boundingbox=bbox,
        )

    def autocomplete(self, query: str, limit: int = 6) -> List[PlaceCandidate]:
        cleaned = query.strip()
        if len(cleaned) < 2:
            return []
        cache_key = f"ac:{cleaned.lower()}:{limit}"
        cached = self._geo_cache.get(cache_key)
        if cached is not None:
            return cached

        raw = self._nominatim_get(
            "/search",
            {
                "q": cleaned,
                "format": "jsonv2",
                "addressdetails": 1,
                "limit": limit,
                "countrycodes": "in",
            },
        )
        results = [self._parse_nominatim_candidate(item) for item in raw if "lat" in item and "lon" in item]
        self._geo_cache.set(cache_key, results)
        return results

    def geocode(self, query: str) -> Optional[PlaceCandidate]:
        cleaned = query.strip()
        if not cleaned:
            return None
        cache_key = f"geo:{cleaned.lower()}"
        cached = self._geo_cache.get(cache_key)
        if cached is not None:
            return cached

        results = self.autocomplete(cleaned, limit=1)
        if not results:
            return None
        self._geo_cache.set(cache_key, results[0])
        return results[0]

    @staticmethod
    def _compute_viewbox(lat: float, lng: float, radius_km: float) -> str:
        d_lat = radius_km / 111.0
        cos_lat = max(0.1, math.cos(math.radians(lat)))
        d_lng = radius_km / (111.0 * cos_lat)
        west = lng - d_lng
        east = lng + d_lng
        north = lat + d_lat
        south = lat - d_lat
        # Nominatim viewbox format: x1,y1,x2,y2 (west,north,east,south)
        return f"{west:.5f},{north:.5f},{east:.5f},{south:.5f}"

    def search_nearby(
        self,
        lat: float,
        lng: float,
        radius_km: float,
        category: str = "all",
        limit: int = 40,
        offset: int = 0,
    ) -> NearbySearchResult:
        cat_key = (category or "all").strip().lower()
        effective_radius = min(max(radius_km, 1.0), 50.0)
        cache_key = f"nb:{round(lat, 4)}:{round(lng, 4)}:{round(effective_radius, 1)}:{cat_key}"
        all_places: Optional[List[NearbyPlace]] = self._nearby_cache.get(cache_key)

        if all_places is None:
            viewbox = self._compute_viewbox(lat, lng, effective_radius)
            tag_queries = CATEGORY_NOMINATIM_TAGS.get(cat_key, CATEGORY_NOMINATIM_TAGS["all"])
            per_query_limit = 15 if len(tag_queries) > 2 else 30

            seen_keys = set()
            parsed: List[NearbyPlace] = []

            for tag_q, default_cat in tag_queries:
                raw = self._nominatim_get(
                    "/search",
                    {
                        "q": tag_q,
                        "viewbox": viewbox,
                        "bounded": 1,
                        "format": "jsonv2",
                        "addressdetails": 1,
                        "extratags": 1,
                        "limit": per_query_limit,
                    },
                )
                for item in raw:
                    if "lat" not in item or "lon" not in item:
                        continue
                    name = (item.get("name") or "").strip()
                    if not name:
                        continue

                    p_lat = float(item["lat"])
                    p_lng = float(item["lon"])
                    dist = haversine_km(lat, lng, p_lat, p_lng)
                    if dist > effective_radius + 0.5:
                        continue

                    dedup_key = (name.lower(), round(p_lat, 3), round(p_lng, 3))
                    if dedup_key in seen_keys:
                        continue
                    seen_keys.add(dedup_key)

                    cat, subcat = _classify_nominatim_item(item, default_cat)
                    extratags = item.get("extratags") or {}
                    osm_type = item.get("osm_type", "node")
                    osm_id = int(item.get("osm_id", 0))

                    place = NearbyPlace(
                        place_id=f"{osm_type}/{osm_id}",
                        osm_type=osm_type,
                        osm_id=osm_id,
                        name=name,
                        category=cat,
                        subcategory=subcat,
                        lat=p_lat,
                        lng=p_lng,
                        distance_km=dist,
                        address=_format_nominatim_address(item.get("address") or {}, item.get("display_name", "")),
                        opening_hours=extratags.get("opening_hours"),
                        website=extratags.get("website") or extratags.get("contact:website"),
                        phone=extratags.get("phone") or extratags.get("contact:phone"),
                        tags={k: str(v) for k, v in extratags.items() if isinstance(v, (str, int, float))},
                    )
                    parsed.append(place)
                    self._detail_cache.set(place.place_id, place)

            parsed.sort(key=lambda p: p.distance_km)
            all_places = parsed
            self._nearby_cache.set(cache_key, all_places)

        total = len(all_places)
        sliced = all_places[offset : offset + limit]
        return NearbySearchResult(
            center_lat=lat,
            center_lng=lng,
            radius_km=effective_radius,
            category=cat_key,
            total=total,
            places=sliced,
            provider="OpenStreetMap (Nominatim)",
        )

    def get_place_detail(self, osm_type: str, osm_id: int) -> Optional[NearbyPlace]:
        cache_key = f"{osm_type}/{osm_id}"
        cached = self._detail_cache.get(cache_key)
        if cached is not None:
            return cached

        prefix_map = {"node": "N", "way": "W", "relation": "R"}
        prefix = prefix_map.get(osm_type)
        if not prefix:
            return None

        raw = self._nominatim_get(
            "/lookup",
            {
                "osm_ids": f"{prefix}{osm_id}",
                "format": "jsonv2",
                "addressdetails": 1,
                "extratags": 1,
            },
        )
        if not raw:
            return None

        item = raw[0]
        extratags = item.get("extratags") or {}
        cat, subcat = _classify_nominatim_item(item, "attractions")
        place = NearbyPlace(
            place_id=cache_key,
            osm_type=osm_type,
            osm_id=osm_id,
            name=(item.get("name") or item.get("display_name", "").split(",")[0]).strip(),
            category=cat,
            subcategory=subcat,
            lat=float(item["lat"]),
            lng=float(item["lon"]),
            distance_km=0.0,
            address=_format_nominatim_address(item.get("address") or {}, item.get("display_name", "")),
            opening_hours=extratags.get("opening_hours"),
            website=extratags.get("website") or extratags.get("contact:website"),
            phone=extratags.get("phone") or extratags.get("contact:phone"),
            tags={k: str(v) for k, v in extratags.items() if isinstance(v, (str, int, float))},
        )
        self._detail_cache.set(cache_key, place)
        return place


# Singleton provider instance used by API routers
geo_provider: LocationProvider = OSMGeoProvider()
