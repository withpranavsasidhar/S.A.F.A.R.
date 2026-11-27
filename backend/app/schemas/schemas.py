from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# Auth Schemas
class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    home_location: Optional[str] = "Vijayawada"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    home_location: Optional[str] = None

class TripUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None # SAVED, UPCOMING, COMPLETED, CANCELLED
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    full_name: str

class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    home_location: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Destination & Attraction Schemas
class AttractionOut(BaseModel):
    id: int
    destination_id: int
    name: str
    category: str
    description: Optional[str] = None
    est_duration_hours: float
    entry_fee: float
    popularity_score: float
    opening_time: str
    closing_time: str
    latitude: float
    longitude: float
    image_url: Optional[str] = None

    class Config:
        from_attributes = True

class DestinationOut(BaseModel):
    id: int
    name: str
    region: str
    state: str
    category: str
    description: str
    rating: float
    base_daily_cost: float
    image_url: str
    latitude: float
    longitude: float
    best_months: str
    tags: str

    class Config:
        from_attributes = True

class LiveWeatherOut(BaseModel):
    temperature_c: float
    condition: str
    condition_code: int
    wind_kph: float
    humidity_percent: int
    precipitation_prob: int
    source: str
    retrieved_at: str
    is_live: bool
    status: str

class ForecastOut(BaseModel):
    month: str
    month_num: int
    predicted_demand: int
    crowd_index: float
    crowd_level: str
    season_type: str # Peak, Off-Peak, Moderate
    model_accuracy: Optional[str] = None
    data_source: Optional[str] = None
    forecast_period: Optional[str] = None
    is_experimental: bool = False
    limitations: Optional[str] = None

class DestinationForecastReportOut(BaseModel):
    destination_id: int
    destination_name: str
    forecast_period: str
    data_source: str
    validation_metric: str
    is_experimental: bool
    limitations: str
    forecasts: List[ForecastOut]

class DestinationDetailOut(DestinationOut):
    attractions: List[AttractionOut] = []
    forecasts: List[ForecastOut] = []
    estimated_duration_days: Optional[str] = "2 - 3 Days"
    accessibility_notes: Optional[str] = None
    directions_url: Optional[str] = None
    weather: Optional[LiveWeatherOut] = None

# Recommendation & Requirement Input
class TripRequirementInput(BaseModel):
    origin: str = "Vijayawada"
    budget: float = 25000.0
    duration_days: int = 4
    travelers: int = 2
    interests: List[str] = ["Nature", "Culture"]
    crowd_preference: str = "Prefer Less Crowded"
    travel_style: str = "Balanced"
    travel_month: Optional[int] = None   # 1–12; None = current calendar month
    radius_km: Optional[float] = None    # e.g. 100.0; None = all-India
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    currency: str = "INR"
    preferred_transport: str = "Train / Bus"
    accommodation_preference: str = "3-Star Hotel"

class RecommendationOut(BaseModel):
    destination: DestinationOut
    match_score: float
    budget_fit_score: float
    crowd_fit_score: float
    overall_score: float
    estimated_total_cost: float
    rationale: List[str]
    crowd_status: str
    distance_km: float = 0.0   # straight-line km from origin to destination
    is_nearby: bool = False    # True when within requested radius_km
    weather: Optional[LiveWeatherOut] = None

# Trip & Budget & Itinerary Schemas
class BudgetBreakdown(BaseModel):
    transport_cost: float
    stay_cost: float
    food_cost: float
    entry_ticket_cost: float = 0.0
    activity_cost: float = 0.0
    local_travel_cost: float = 0.0
    contingency_cost: float = 0.0
    buffer_amount: float = 0.0
    misc_cost: float = 0.0
    total_estimated: float
    remaining_budget: float
    is_over_budget: bool = False
    over_budget_amount: float = 0.0
    per_person_cost: float = 0.0
    per_day_cost: float = 0.0
    is_estimate: bool = True
    cost_explanation: dict = {}

class ItineraryItemOut(BaseModel):
    id: Optional[int] = None
    time_slot: str
    activity_name: str
    description: Optional[str] = None
    duration_mins: int
    cost: float
    travel_time_from_prev: str
    distance_from_prev_km: float = 0.0
    transport_mode_from_prev: str = "Self / Walk"
    item_type: str = "attraction"
    latitude: float
    longitude: float
    attraction_id: Optional[int] = None

class DayItineraryOut(BaseModel):
    day_number: int
    date_label: str
    day_theme: Optional[str] = None
    estimated_day_cost: float = 0.0
    items: List[ItineraryItemOut]

class FullTripPlanOut(BaseModel):
    id: Optional[int] = None
    title: str
    origin: str
    destination: DestinationOut
    duration_days: int
    travelers: int
    total_budget: float
    estimated_cost: float
    crowd_preference: str
    travel_style: str
    interests: str
    budget_breakdown: BudgetBreakdown
    itinerary: List[DayItineraryOut]
    accommodation_suggestion: Optional[dict] = None
    food_recommendations: List[str] = []
    activity_recommendations: List[str] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = "SAVED"
    per_person_cost: float = 0.0
    created_at: Optional[datetime] = None

class RecalculateTripRequest(BaseModel):
    origin: str
    destination_id: int
    duration_days: int
    travelers: int
    total_budget: float
    travel_style: str = "Balanced"
    preferred_transport: str = "Train / Bus"
    accommodation_preference: str = "3-Star Hotel"
    itinerary: List[DayItineraryOut]

class CustomPlaceInput(BaseModel):
    place_id: Optional[str] = None
    name: str
    category: str = "attractions"
    lat: float
    lng: float
    address: Optional[str] = None


class CreateTripRequest(BaseModel):
    origin: str
    destination_id: int
    duration_days: int
    travelers: int
    total_budget: float
    crowd_preference: str
    travel_style: str
    interests: List[str]
    custom_places: Optional[List[CustomPlaceInput]] = None
    preferred_transport: str = "Train / Bus"
    accommodation_preference: str = "3-Star Hotel"
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class HiddenGemOut(BaseModel):
    id: int
    destination_id: Optional[int] = None
    destination_name: str
    state: str
    name: str
    category: str
    description: Optional[str] = None
    popularity_score: float
    entry_fee: float
    est_duration_hours: float
    latitude: float
    longitude: float
    image_url: Optional[str] = None
    distance_km: Optional[float] = None
    gem_reason: str
    selection_method: str = "CURATED_LOW_CROWD"  # CURATED_LOW_CROWD, VERIFIED_HERITAGE, SCENIC_OFFBEAT
    verification_status: str = "Curated Editorial"  # Curated Editorial, Inferred Geographic
    crowd_footprint: str = "Low"  # Low, Moderate
    accessibility_notes: Optional[str] = None

class NationwideDestinationOut(BaseModel):
    id: Optional[int] = None
    name: str
    region: str
    state: str
    category: str
    description: str
    rating: float
    base_daily_cost: float
    image_url: str
    latitude: float
    longitude: float
    best_months: Optional[str] = None
    tags: Optional[str] = None
    source_type: str = "curated"  # "curated" or "geographic_discovery"
    estimated_duration_days: Optional[str] = "2 - 3 Days"
    accessibility_notes: Optional[str] = None
    directions_url: Optional[str] = None
    attractions_count: int = 0

class ExploreIndiaCatalogOut(BaseModel):
    destinations: List[NationwideDestinationOut]
    available_states: List[str]
    available_regions: List[str]
    available_categories: List[str]
    total_count: int


class SeasonalInsightOut(BaseModel):
    destination_id: int
    destination_name: str
    state: str
    month: str
    predicted_demand: int
    crowd_level: str
    season_type: str
    distance_km: Optional[float] = None
    events: List[dict] = []


# Location Discovery Schemas
class PlaceCandidateOut(BaseModel):
    place_id: str
    name: str
    display_name: str
    lat: float
    lng: float
    place_type: str
    state: Optional[str] = None
    country: Optional[str] = None
    boundingbox: Optional[List[float]] = None


class NearbyPlaceOut(BaseModel):
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
    tags: dict = {}


class NearbySearchOut(BaseModel):
    center_lat: float
    center_lng: float
    radius_km: float
    category: str
    total: int
    limit: int
    offset: int
    provider: str
    places: List[NearbyPlaceOut]

class FeedbackCreate(BaseModel):
    rating: int
    comments: str

class FeedbackOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    rating: int
    comments: str
    created_at: datetime
