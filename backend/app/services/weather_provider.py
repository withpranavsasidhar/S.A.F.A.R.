from __future__ import annotations

import os
import time
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
import httpx

# WMO Weather Interpretation Codes (WW) mapping
WMO_CONDITION_MAP: Dict[int, str] = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Slight Snow Fall",
    73: "Moderate Snow Fall",
    75: "Heavy Snow Fall",
    77: "Snow Grains",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Slight Hail",
    99: "Thunderstorm with Heavy Hail",
}

@dataclass
class WeatherInfo:
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

class WeatherProvider(ABC):
    @abstractmethod
    def get_current_weather(self, lat: float, lng: float) -> Optional[WeatherInfo]:
        raise NotImplementedError

class _WeatherTTLCache:
    def __init__(self, ttl_seconds: int = 1800, max_items: int = 256): # 30 min cache
        self._ttl = ttl_seconds
        self._max_items = max_items
        self._data: Dict[str, Tuple[float, WeatherInfo]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[WeatherInfo]:
        with self._lock:
            entry = self._data.get(key)
            if not entry:
                return None
            ts, val = entry
            if time.time() - ts > self._ttl:
                del self._data[key]
                return None
            return val

    def set(self, key: str, val: WeatherInfo) -> None:
        with self._lock:
            if len(self._data) >= self._max_items:
                # Evict oldest entry
                oldest_key = min(self._data.keys(), key=lambda k: self._data[k][0])
                del self._data[oldest_key]
            self._data[key] = (time.time(), val)

class OpenMeteoWeatherProvider(WeatherProvider):
    """
    Open-Meteo live weather provider adapter.
    Uses free, open WMO meteorological APIs with zero API keys required,
    includes thread-safe TTL caching (30 mins) to respect upstream rate guidelines,
    and returns transparent metadata with graceful fallbacks.
    """
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    def __init__(self, timeout_sec: float = 4.0):
        self.timeout = timeout_sec
        self.cache = _WeatherTTLCache(ttl_seconds=1800)

    def get_current_weather(self, lat: float, lng: float) -> Optional[WeatherInfo]:
        cache_key = f"{round(lat, 2)}_{round(lng, 2)}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            params = {
                "latitude": round(lat, 4),
                "longitude": round(lng, 4),
                "current_weather": "true",
                "hourly": "relativehumidity_2m,precipitation_probability",
                "timezone": "Asia/Kolkata",
            }
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(self.BASE_URL, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    curr = data.get("current_weather", {})
                    hourly = data.get("hourly", {})

                    code = curr.get("weathercode", 0)
                    cond = WMO_CONDITION_MAP.get(code, "Clear / Pleasant")
                    temp = float(curr.get("temperature", 25.0))
                    wind = float(curr.get("windspeed", 10.0))

                    # Extract nearest hourly humidity and precipitation probability
                    humidities = hourly.get("relativehumidity_2m", [])
                    precips = hourly.get("precipitation_probability", [])
                    humidity = int(humidities[0]) if humidities else 60
                    precip_prob = int(precips[0]) if precips else 10

                    info = WeatherInfo(
                        temperature_c=temp,
                        condition=cond,
                        condition_code=code,
                        wind_kph=wind,
                        humidity_percent=humidity,
                        precipitation_prob=precip_prob,
                        source="Open-Meteo Weather API (WMO Standard)",
                        retrieved_at=now_iso,
                        is_live=True,
                        status="LIVE_CURRENT",
                    )
                    self.cache.set(cache_key, info)
                    return info
        except Exception as e:
            # Network issue, sandbox port restriction, or upstream timeout
            pass

        # Graceful fallback: return ungrounded weather indicator without fabricating exact live values
        return self._fallback_weather(lat, lng, str(e) if 'e' in locals() else None)

    def _fallback_weather(self, lat: float, lng: float, reason: Optional[str] = None) -> WeatherInfo:
        now_iso = datetime.now(timezone.utc).isoformat()
        return WeatherInfo(
            temperature_c=25.0,
            condition="Seasonal Climate Indicator",
            condition_code=0,
            wind_kph=0.0,
            humidity_percent=0,
            precipitation_prob=0,
            source="Open-Meteo Offline Fallback",
            retrieved_at=now_iso,
            is_live=False,
            status=f"FALLBACK_OFFLINE: {reason}" if reason else "FALLBACK_OFFLINE",
        )

class WeatherProviderFactory:
    _instance: Optional[WeatherProvider] = None

    @classmethod
    def get_provider(cls) -> WeatherProvider:
        if cls._instance is None:
            provider_type = os.getenv("WEATHER_PROVIDER", "open-meteo").lower()
            if provider_type == "open-meteo":
                cls._instance = OpenMeteoWeatherProvider()
            else:
                cls._instance = OpenMeteoWeatherProvider()
        return cls._instance

weather_provider = WeatherProviderFactory.get_provider()
