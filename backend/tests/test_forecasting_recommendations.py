"""
Tests for Data-Grounded Demand Forecasting, Deterministic Recommendations,
and Open-Meteo Live Weather Integration in S.A.F.A.R.
"""

import pytest
from app.ml.forecaster import (
    DemandForecaster,
    DATA_SOURCE_NAME,
    FORECAST_HORIZON,
    MODEL_LIMITATIONS
)
from app.ml.recommender import RecommendationEngine
from app.services.weather_provider import (
    OpenMeteoWeatherProvider,
    WeatherInfo,
    _WeatherTTLCache
)
from app.db.models import Destination


def test_forecaster_backtesting_accuracy():
    """Verify that evaluate_time_split_accuracy computes legitimate backtest metrics on historical records."""
    forecaster = DemandForecaster()
    
    # 12 real-world empirical observations (e.g. Goa tourism trend)
    records = [
        {"year": 2024, "month": m, "tourist_count": vc}
        for m, vc in [
            (1, 140000), (2, 120000), (3, 90000), (4, 60000),
            (5, 45000), (6, 30000), (7, 35000), (8, 40000),
            (9, 60000), (10, 85000), (11, 130000), (12, 160000)
        ]
    ]
    
    mape, mae, summary = forecaster.evaluate_time_split_accuracy(records, train_ratio=0.67)
    
    assert mape is not None
    assert mae is not None
    assert mape >= 0.0
    assert mae >= 0.0
    assert "Backtested Accuracy" in summary
    assert "hold-out test MAPE" in summary


def test_forecaster_experimental_on_sparse_data():
    """Ensure forecaster flags experimental status and does not claim false accuracy when data is sparse (<6 points)."""
    forecaster = DemandForecaster()
    sparse_records = [
        {"year": 2024, "month": 1, "tourist_count": 50000},
        {"year": 2024, "month": 2, "tourist_count": 52000},
    ]
    
    mape, mae, summary = forecaster.evaluate_time_split_accuracy(sparse_records)
    assert mape == 0.0
    assert mae == 0.0
    assert "Experimental" in summary

    forecasts = forecaster.forecast_destination_demand(sparse_records)
    assert len(forecasts) == 12
    for f in forecasts:
        assert f["is_experimental"] is True
        assert f["data_source"] == DATA_SOURCE_NAME
        assert f["forecast_period"] == FORECAST_HORIZON
        assert f["limitations"] == MODEL_LIMITATIONS


def test_recommendation_transit_feasibility_penalty():
    """Verify that a short trip (e.g. 2 days) to a distant destination receives transit penalties and clear rationale."""
    engine = RecommendationEngine()
    
    dest_far = Destination(
        id=1,
        name="Leh Ladakh",
        category="Nature",
        state="Ladakh",
        region="North India",
        latitude=34.1526,
        longitude=77.5771,
        base_daily_cost=3500.0,
        rating=4.8,
        description="High altitude desert with mountain passes",
        image_url="https://images.unsplash.com/photo-1581793745862-99fde7fa73d2",
        best_months="Jun, Jul, Aug, Sep",
    )
    
    rec = engine.evaluate_destination(
        dest=dest_far,
        origin="Vijayawada",
        budget=50000.0,
        duration_days=2,
        travelers=1,
        user_interests=["Nature"],
        crowd_preference="Balanced",
        travel_style="Moderate",
        travel_month=7,
        weather_info=None
    )
    
    assert rec["distance_km"] > 1500
    # Should flag transit-to-trip duration ratio in rationale
    transit_flags = [r for r in rec["rationale"] if "Distance & Transit" in r or "significant travel time" in r]
    assert len(transit_flags) > 0


def test_recommendation_seasonal_match():
    """Verify that travel matching the destination's peak season yields appropriate positive rationale."""
    engine = RecommendationEngine()
    
    dest_goa = Destination(
        id=2,
        name="Goa",
        category="Beach",
        state="Goa",
        region="West India",
        latitude=15.2993,
        longitude=74.1240,
        base_daily_cost=2800.0,
        rating=4.6,
        description="Coastal paradise with sandy beaches",
        image_url="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2",
        best_months="Nov, Dec, Jan, Feb",
    )
    
    rec = engine.evaluate_destination(
        dest=dest_goa,
        origin="Vijayawada",
        budget=30000.0,
        duration_days=4,
        travelers=2,
        user_interests=["Beach"],
        crowd_preference="Balanced",
        travel_style="Moderate",
        travel_month=12, # December = peak season
        weather_info=None
    )
    
    seasonal_rationale = [r for r in rec["rationale"] if "Seasonal Advantage" in r or "optimal pleasant season" in r]
    assert len(seasonal_rationale) == 1


def test_weather_provider_caching_and_fallback():
    """Test thread-safe TTL caching and graceful fallback on failed API calls."""
    cache = _WeatherTTLCache(ttl_seconds=60)
    
    # Test cache put/get
    mock_data = WeatherInfo(
        temperature_c=25.0,
        condition="Partly Cloudy",
        condition_code=2,
        wind_kph=12.0,
        humidity_percent=60,
        precipitation_prob=10,
        source="Open-Meteo Test",
        retrieved_at="2026-11-26T18:00:00Z",
        is_live=True,
        status="ACTIVE"
    )
    key = "16.5_80.65"
    cache.set(key, mock_data)
    cached = cache.get(key)
    assert cached is not None
    assert cached.temperature_c == 25.0
    assert cached.condition == "Partly Cloudy"

    # Test provider fallback method
    provider = OpenMeteoWeatherProvider()
    fallback = provider._fallback_weather(16.5, 80.65, "Network simulation timeout")
    assert fallback is not None
    assert fallback.is_live is False
    assert "Open-Meteo" in fallback.source
