from sqlalchemy import Column, Integer, String, Float, Text, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="USER") # USER or ADMIN
    home_location = Column(String(120), default="Vijayawada")
    created_at = Column(DateTime, default=datetime.utcnow)

    travel_plans = relationship("TravelPlan", back_populates="user", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")

class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    department = Column(String(100), default="Tourism Analytics")
    is_superadmin = Column(Boolean, default=True)

class Destination(Base):
    __tablename__ = "destinations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), index=True, nullable=False)
    region = Column(String(120), nullable=False)
    state = Column(String(120), nullable=False)
    category = Column(String(120), nullable=False) # e.g. Nature, Culture, Beach, Hill Station
    description = Column(Text, nullable=False)
    rating = Column(Float, default=4.5)
    base_daily_cost = Column(Float, nullable=False) # Est hotel + food per day per person
    image_url = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    best_months = Column(String(255), default="Oct, Nov, Dec, Jan, Feb")
    tags = Column(String(255), default="Nature, Culture")

    attractions = relationship("Attraction", back_populates="destination", cascade="all, delete-orphan")
    tourism_demands = relationship("TourismDemand", back_populates="destination", cascade="all, delete-orphan")
    forecasts = relationship("Forecast", back_populates="destination", cascade="all, delete-orphan")
    cost_data = relationship("CostData", back_populates="destination", uselist=False, cascade="all, delete-orphan")
    events = relationship("Event", back_populates="destination", cascade="all, delete-orphan")

class Attraction(Base):
    __tablename__ = "attractions"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    name = Column(String(120), nullable=False)
    category = Column(String(100), nullable=False) # Nature, Historical, Spiritual, Adventure, Food
    description = Column(Text)
    est_duration_hours = Column(Float, default=2.0)
    entry_fee = Column(Float, default=0.0)
    popularity_score = Column(Float, default=4.5)
    opening_time = Column(String(20), default="09:00 AM")
    closing_time = Column(String(20), default="06:00 PM")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    image_url = Column(String(255))

    destination = relationship("Destination", back_populates="attractions")

class TourismDemand(Base):
    __tablename__ = "tourism_demands"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False) # 1 - 12
    tourist_count = Column(Integer, nullable=False)
    seasonality_index = Column(Float, default=1.0)
    crowd_level = Column(String(20), default="MODERATE") # LOW, MODERATE, HIGH, PEAK

    destination = relationship("Destination", back_populates="tourism_demands")

class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    forecast_month = Column(String(20), nullable=False) # e.g. "Oct 2026"
    month_num = Column(Integer, nullable=False)
    predicted_demand = Column(Integer, nullable=False)
    crowd_index = Column(Float, default=50.0)
    crowd_level = Column(String(20), default="MODERATE")
    model_status = Column(String(50), default="Evaluated Model v1.2")

    destination = relationship("Destination", back_populates="forecasts")

class CostData(Base):
    __tablename__ = "cost_data"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    avg_hotel_per_night = Column(Float, nullable=False)
    avg_meal_cost = Column(Float, nullable=False)
    avg_local_transport = Column(Float, nullable=False)
    avg_entry_fees = Column(Float, default=500.0)
    seasonal_multiplier = Column(Float, default=1.1)

    destination = relationship("Destination", back_populates="cost_data")

class TravelPlan(Base):
    __tablename__ = "travel_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(150), nullable=False)
    origin = Column(String(100), nullable=False)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    duration_days = Column(Integer, nullable=False)
    travelers = Column(Integer, default=2)
    total_budget = Column(Float, nullable=False)
    estimated_cost = Column(Float, nullable=False)
    crowd_preference = Column(String(50), default="Prefer Less Crowded")
    travel_style = Column(String(50), default="Balanced")
    interests = Column(String(255), default="Nature, Culture")
    status = Column(String(30), default="SAVED")
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="travel_plans")
    destination = relationship("Destination")
    budget = relationship("Budget", back_populates="travel_plan", uselist=False, cascade="all, delete-orphan")
    itineraries = relationship("Itinerary", back_populates="travel_plan", cascade="all, delete-orphan")

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    travel_plan_id = Column(Integer, ForeignKey("travel_plans.id"), nullable=False)
    transport_cost = Column(Float, nullable=False)
    stay_cost = Column(Float, nullable=False)
    food_cost = Column(Float, nullable=False)
    activity_cost = Column(Float, nullable=False)
    misc_cost = Column(Float, nullable=False)
    buffer_amount = Column(Float, nullable=False)
    remaining_balance = Column(Float, nullable=False)

    travel_plan = relationship("TravelPlan", back_populates="budget")

class Itinerary(Base):
    __tablename__ = "itineraries"

    id = Column(Integer, primary_key=True, index=True)
    travel_plan_id = Column(Integer, ForeignKey("travel_plans.id"), nullable=False)
    day_number = Column(Integer, nullable=False)
    date_label = Column(String(50), default="Day 1")

    travel_plan = relationship("TravelPlan", back_populates="itineraries")
    items = relationship("ItineraryItem", back_populates="itinerary", cascade="all, delete-orphan")

class ItineraryItem(Base):
    __tablename__ = "itinerary_items"

    id = Column(Integer, primary_key=True, index=True)
    itinerary_id = Column(Integer, ForeignKey("itineraries.id"), nullable=False)
    attraction_id = Column(Integer, ForeignKey("attractions.id"), nullable=True)
    time_slot = Column(String(20), nullable=False) # e.g. "09:00 AM"
    activity_name = Column(String(150), nullable=False)
    description = Column(Text)
    duration_mins = Column(Integer, default=120)
    cost = Column(Float, default=0.0)
    travel_time_from_prev = Column(String(50), default="15 mins")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    order_index = Column(Integer, default=0)

    itinerary = relationship("Itinerary", back_populates="items")
    attraction = relationship("Attraction")

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    preference_match_score = Column(Float, nullable=False)
    budget_score = Column(Float, nullable=False)
    crowd_score = Column(Float, nullable=False)
    overall_score = Column(Float, nullable=False)
    summary_rationale = Column(JSON, nullable=False) # list of rationale bullet strings

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    state = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    transit_hub_type = Column(String(50), default="AIRPORT_AND_RAIL")

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    name = Column(String(120), nullable=False)
    month = Column(String(20), nullable=False)
    description = Column(Text)
    impact_on_crowd = Column(String(50), default="HIGH_SURGE")

    destination = relationship("Destination", back_populates="events")

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False) # 1 - 5
    comments = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="feedbacks")
