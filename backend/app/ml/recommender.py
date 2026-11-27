import math
from typing import List, Dict, Any, Optional, Tuple

# Coordinates (lat, lng) for major Indian cities used as origins or destinations
CITY_COORDS: Dict[str, tuple] = {
    # Andhra Pradesh
    "vijayawada":         (16.5062, 80.6480),
    "visakhapatnam":      (17.6868, 83.2185),
    "vizag":              (17.6868, 83.2185),
    "tirupati":           (13.6288, 79.4192),
    "guntur":             (16.3067, 80.4365),
    "nellore":            (14.4426, 79.9865),
    "araku valley":       (18.3273, 82.8757),
    "araku":              (18.3273, 82.8757),
    # Telangana
    "hyderabad":          (17.3850, 78.4867),
    "warangal":           (17.9784, 79.5941),
    # Karnataka
    "bangalore":          (12.9716, 77.5946),
    "bengaluru":          (12.9716, 77.5946),
    "mysuru":             (12.2958, 76.6394),
    "mysore":             (12.2958, 76.6394),
    "hampi":              (15.3350, 76.4600),
    "coorg":              (12.3375, 75.8069),
    "chikmagalur":        (13.3161, 75.7720),
    "hubli":              (15.3647, 75.1240),
    "mangalore":          (12.9141, 74.8560),
    # Tamil Nadu
    "chennai":            (13.0827, 80.2707),
    "coimbatore":         (11.0168, 76.9558),
    "madurai":            (9.9252,  78.1198),
    "ooty":               (11.4102, 76.6950),
    "pondicherry":        (11.9416, 79.8083),
    "puducherry":         (11.9416, 79.8083),
    # Kerala
    "kochi":              (9.9312,  76.2673),
    "thiruvananthapuram": (8.5241,  76.9366),
    "trivandrum":         (8.5241,  76.9366),
    "munnar":             (10.0889, 77.0595),
    "thrissur":           (10.5276, 76.2144),
    # Maharashtra
    "mumbai":             (19.0760, 72.8777),
    "pune":               (18.5204, 73.8567),
    "nagpur":             (21.1458, 79.0882),
    "aurangabad":         (19.8762, 75.3433),
    # Goa
    "goa":                (15.2993, 74.1240),
    "panaji":             (15.4909, 73.8278),
    # Rajasthan
    "jaipur":             (26.9124, 75.7873),
    "jodhpur":            (26.2389, 73.0243),
    "udaipur":            (24.5854, 73.7125),
    "jaisalmer":          (26.9157, 70.9083),
    # Delhi & NCR
    "delhi":              (28.6139, 77.2090),
    "new delhi":          (28.6139, 77.2090),
    "noida":              (28.5355, 77.3910),
    "gurgaon":            (28.4595, 77.0266),
    # Uttar Pradesh
    "lucknow":            (26.8467, 80.9462),
    "agra":               (27.1767, 78.0081),
    "varanasi":           (25.3176, 82.9739),
    # Uttarakhand
    "rishikesh":          (30.0869, 78.2676),
    "dehradun":           (30.3165, 78.0322),
    "haridwar":           (29.9457, 78.1642),
    # Himachal Pradesh
    "shimla":             (31.1048, 77.1734),
    "manali":             (32.2396, 77.1887),
    "dharamsala":         (32.2190, 76.3234),
    # Punjab
    "amritsar":           (31.6340, 74.8723),
    "chandigarh":         (30.7333, 76.7794),
    # West Bengal
    "kolkata":            (22.5726, 88.3639),
    "darjeeling":         (27.0360, 88.2627),
    # Madhya Pradesh
    "bhopal":             (23.2599, 77.4126),
    "indore":             (22.7196, 75.8577),
    "khajuraho":          (24.8318, 79.9199),
    # Gujarat
    "ahmedabad":          (23.0225, 72.5714),
    "surat":              (21.1702, 72.8311),
    # Assam / North-East
    "guwahati":           (26.1445, 91.7362),
    # Default: geographic centroid of India (for unknown cities)
    "_default":           (20.5937, 78.9629),
}

def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Straight-line distance in km between two lat/lng points."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(d_lng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def _distance_to_cost(km: float) -> float:
    """
    Convert straight-line km to realistic per-person one-way transport cost (INR).
    Road distance ≈ straight-line × 1.4.
    Cost tiers (per km of road distance):
      < 50 km   → local auto/cab   ₹15/km
      50–300    → bus/train        ₹8/km
      300–800   → train/flight     ₹5/km
      > 800     → flight           ₹4/km
    """
    road_km = km * 1.4
    if road_km < 50:
        cost = road_km * 15
    elif road_km < 300:
        cost = (50 * 15) + (road_km - 50) * 8
    elif road_km < 800:
        cost = (50 * 15) + (250 * 8) + (road_km - 300) * 5
    else:
        cost = (50 * 15) + (250 * 8) + (500 * 5) + (road_km - 800) * 4
    cost = max(200.0, cost)
    return round(cost / 50) * 50  # round to nearest ₹50

def _get_coords(city_name: str) -> tuple:
    key = city_name.strip().lower()
    return CITY_COORDS.get(key, CITY_COORDS["_default"])

class RecommendationEngine:
    @staticmethod
    def calculate_transit_cost(origin: str, dest_name: str) -> float:
        """
        Compute per-person one-way transit cost based on actual geographic
        distance between the user's origin city and the destination.
        Returns ₹200 for same-city (local) trips.
        """
        if origin.strip().lower() == dest_name.strip().lower():
            return 200.0
        o_lat, o_lng = _get_coords(origin)
        d_lat, d_lng = _get_coords(dest_name)
        km = _haversine_km(o_lat, o_lng, d_lat, d_lng)
        return _distance_to_cost(km)

    @classmethod
    def evaluate_destination(
        cls,
        dest: Any, # Destination model
        origin: str,
        budget: float,
        duration_days: int,
        travelers: int,
        user_interests: List[str],
        crowd_preference: str,
        forecast_crowd_level: str = "MODERATE",
        travel_style: str = "Balanced",
        travel_month: Optional[int] = None,
        weather_info: Optional[Any] = None,
    ) -> Dict[str, Any]:
        
        is_local = origin.strip().lower() == dest.name.strip().lower()

        # Transit Distance & Hours
        o_lat, o_lng = _get_coords(origin)
        d_lat, d_lng = dest.latitude, dest.longitude
        distance_km = round(_haversine_km(o_lat, o_lng, d_lat, d_lng), 1)

        # 1. Budget Feasibility
        style_multiplier = 0.85 if travel_style == "Budget" else 1.35 if travel_style == "Premium" else 1.0
        transit_cost = cls.calculate_transit_cost(origin, dest.name) * travelers * 2.0 # Round trip transit
        daily_cost = (dest.base_daily_cost * style_multiplier) * duration_days * travelers
        total_est_cost = transit_cost + daily_cost
        
        if total_est_cost <= budget:
            budget_score = min(100.0, 75.0 + ((budget - total_est_cost) / max(budget, 1.0)) * 25.0)
        else:
            over = total_est_cost - budget
            budget_score = max(10.0, 75.0 - (over / max(budget, 1.0)) * 100.0)
            
        # 2. Interest Match Score
        dest_tags = [t.strip().lower() for t in (dest.tags or "").split(",")] + [dest.category.lower()]
        user_tags = [i.strip().lower() for i in user_interests]
        matching_tags = [i for i in user_interests if any(i.lower() in dt for dt in dest_tags)]
        matches = len(matching_tags)
        interest_score = min(100.0, 50.0 + (matches / max(1, len(user_tags))) * 50.0)

        # Boost interest score if it's direct local match
        if is_local:
            interest_score = min(100.0, interest_score + 15.0)

        # 3. Crowd Preference Score
        crowd_level_upper = forecast_crowd_level.upper()
        if crowd_preference == "Prefer Less Crowded":
            if crowd_level_upper in ["LOW", "MODERATE"]:
                crowd_score = 95.0
            elif crowd_level_upper == "HIGH":
                crowd_score = 70.0
            else:
                crowd_score = 45.0
        elif crowd_preference == "Off-Peak Seeker":
            if crowd_level_upper == "LOW":
                crowd_score = 100.0
            elif crowd_level_upper == "MODERATE":
                crowd_score = 80.0
            else:
                crowd_score = 40.0
        else: # Don't mind crowds
            crowd_score = 90.0

        # 4. Transit Duration Feasibility (Trip duration vs transit distance)
        one_way_transit_hours = (distance_km * 1.3) / 60.0 # Road/train estimate
        total_transit_hours = one_way_transit_hours * 2.0
        total_available_daylight_hours = max(12.0, duration_days * 12.0)
        transit_ratio = total_transit_hours / total_available_daylight_hours

        transit_feasibility_score = 100.0
        if transit_ratio > 0.40: # Transit takes >40% of awake vacation
            transit_feasibility_score = max(35.0, 100.0 - (transit_ratio - 0.40) * 150.0)

        # 5. Seasonality Match
        season_score = 75.0
        is_best_season = False
        if travel_month and dest.best_months:
            month_names = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
            target_month_name = month_names[travel_month - 1]
            dest_best = dest.best_months.lower()
            if target_month_name in dest_best:
                is_best_season = True
                season_score = 95.0
            else:
                season_score = 65.0

        # Weighted Overall Score
        overall_score = round(
            0.30 * interest_score +
            0.25 * budget_score +
            0.20 * crowd_score +
            0.15 * transit_feasibility_score +
            0.10 * season_score,
            1
        )
        
        # Grounded Explainable Rationale Generation
        rationale = []
        if is_local:
            top_attrs = sorted(dest.attractions, key=lambda a: a.popularity_score, reverse=True)[:3] if dest.attractions else []
            attr_names = ", ".join(a.name for a in top_attrs) if top_attrs else dest.name
            rationale.append(f"Local Departure Match: Explore top spots in {dest.name} ({attr_names}) with zero inter-city transit delay.")
        else:
            if transit_ratio > 0.35:
                rationale.append(f"Distance & Transit: {distance_km} km ({int(one_way_transit_hours)}h transit each way) requires significant travel time for a {duration_days}-day itinerary.")
            else:
                rationale.append(f"Convenient Distance: {distance_km} km from {origin} fits comfortably into your {duration_days}-day travel window.")

        if total_est_cost <= budget:
            buffer_val = int(budget - total_est_cost)
            rationale.append(f"Budget Feasibility: Estimated total cost ₹{int(total_est_cost):,} fits your ₹{int(budget):,} budget with ₹{buffer_val:,} contingency.")
        else:
            over_val = int(total_est_cost - budget)
            rationale.append(f"Budget Envelope: Est. cost ₹{int(total_est_cost):,} slightly exceeds budget by ₹{over_val:,}; recommend adjusting travel style to Budget.")

        if matching_tags:
            rationale.append(f"Interest Alignment: Directly satisfies your interest in {', '.join(matching_tags)}.")
        elif not is_local:
            rationale.append(f"Cultural & Scenic Appeal: Renowned destination in {dest.state} ({dest.category}).")

        if is_best_season:
            rationale.append(f"Seasonal Advantage: Travel month aligns with the optimal pleasant season ({dest.best_months}).")
        else:
            rationale.append(f"Crowd & Season Profile: Forecasted demand is {forecast_crowd_level.lower()} ({dest.region}).")

        # Live Real-Time Weather Context (from verified weather provider)
        if weather_info and getattr(weather_info, 'is_live', False):
            temp = getattr(weather_info, 'temperature_c', 25.0)
            cond = getattr(weather_info, 'condition', 'Clear')
            source = getattr(weather_info, 'source', 'Live Met')
            rationale.append(f"Live Meteorological Observation: Currently {temp}°C, {cond} at destination ({source}).")

        return {
            "destination": dest,
            "distance_km": distance_km,
            "match_score": round(interest_score, 1),
            "budget_fit_score": round(budget_score, 1),
            "crowd_fit_score": round(crowd_score, 1),
            "overall_score": overall_score,
            "estimated_total_cost": round(total_est_cost, 2),
            "rationale": rationale,
            "crowd_status": forecast_crowd_level
        }
