import math
from typing import Dict, Optional, Any, List
from app.ml.recommender import RecommendationEngine, _haversine_km, _get_coords


class TripService:
    @staticmethod
    def calculate_budget_breakdown(
        origin: str,
        dest_name: str,
        base_daily_cost: float,
        duration_days: int,
        travelers: int,
        total_budget: float,
        travel_style: str = "Balanced",
        cost_data: Optional[Any] = None,
        preferred_transport: str = "Train / Bus",
        accommodation_preference: str = "3-Star Hotel",
        actual_entry_tickets: Optional[float] = None,
        actual_activities: Optional[float] = None,
        local_km_estimate: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Calculate transparent, itemized trip budget breakdown.
        Explicitly separates:
          - Transport (intercity to/from destination)
          - Accommodation (hotel/resort rooms)
          - Food & Dining
          - Entry tickets
          - Activities & Sightseeing
          - Local travel (intra-city auto/cab between places)
          - Contingency (emergency buffer fund)
        Provides per-person, total costs, remaining or over-budget amounts,
        and human-readable assumption explanations.
        """
        travelers = max(1, travelers)
        duration_days = max(1, duration_days)
        rooms_needed = math.ceil(travelers / 2.0)

        # Style multiplier
        style_mult = 0.8 if travel_style == "Budget" else 1.35 if travel_style == "Premium" else 1.0

        # Transport preference multiplier and assumptions
        transport_mult_map = {
            "Flight": 1.6,
            "Car / Road": 1.15,
            "Train / Bus": 1.0,
            "Local Transit": 0.75,
        }
        transport_mult = transport_mult_map.get(preferred_transport, 1.0)

        # 1. Transport (Inter-city)
        transit_base = RecommendationEngine.calculate_transit_cost(origin, dest_name)
        transport_cost = round(transit_base * travelers * transport_mult * (1.1 if travel_style == "Premium" else 1.0), 2)

        # 2. Accommodation (per room per night)
        accom_rates = {
            "Hostel / Budget": (cost_data.avg_hotel_per_night * 0.55 if cost_data else base_daily_cost * 0.35),
            "3-Star Hotel": (cost_data.avg_hotel_per_night if cost_data else base_daily_cost * 0.55),
            "Boutique / Homestay": (cost_data.avg_hotel_per_night * 1.25 if cost_data else base_daily_cost * 0.70),
            "Luxury Resort": (cost_data.avg_hotel_per_night * 1.85 if cost_data else base_daily_cost * 1.10),
        }
        room_night_rate = accom_rates.get(accommodation_preference, accom_rates["3-Star Hotel"]) * style_mult
        # Number of nights = duration_days (or duration_days - 1 if > 1)
        nights = max(1, duration_days - 1 if duration_days > 1 else 1)
        stay_cost = round(room_night_rate * nights * rooms_needed, 2)

        # 3. Food (daily meals for all travelers)
        meal_daily_per_person = (cost_data.avg_meal_cost if cost_data else base_daily_cost * 0.25) * style_mult
        food_cost = round(meal_daily_per_person * duration_days * travelers, 2)

        # 4. Entry tickets
        if actual_entry_tickets is not None:
            entry_ticket_cost = round(actual_entry_tickets, 2)
        else:
            base_ticket_daily = (cost_data.avg_entry_fees if cost_data else base_daily_cost * 0.08)
            entry_ticket_cost = round(base_ticket_daily * duration_days * travelers, 2)

        # 5. Activities & Guided Sightseeing
        if actual_activities is not None:
            activity_cost = round(actual_activities, 2)
        else:
            act_daily = (base_daily_cost * 0.08) * (1.2 if travel_style == "Premium" else 0.7 if travel_style == "Budget" else 1.0)
            activity_cost = round(act_daily * duration_days * travelers, 2)

        # 6. Local Travel (Intra-city transfers between stops)
        if local_km_estimate is not None:
            # ₹18/km average local cab/auto rate in Indian tourist cities
            local_travel_cost = round(max(300.0 * duration_days, local_km_estimate * 18.0), 2)
        else:
            local_daily = (cost_data.avg_local_transport if cost_data else base_daily_cost * 0.10) * style_mult
            local_travel_cost = round(local_daily * duration_days * max(1, travelers // 2), 2)

        # Backward compatibility field (misc_cost = local_travel_cost)
        misc_cost = local_travel_cost

        # Subtotal of planned expenses
        subtotal_estimated = transport_cost + stay_cost + food_cost + entry_ticket_cost + activity_cost + local_travel_cost

        # 7. Contingency (5% buffer of total budget, minimum ₹600/day)
        contingency_cost = round(max(600.0 * duration_days, total_budget * 0.05), 2)
        buffer_amount = contingency_cost

        total_estimated = round(subtotal_estimated, 2)
        total_with_buffer = round(total_estimated + contingency_cost, 2)

        remaining_budget = round(total_budget - total_with_buffer, 2)
        is_over_budget = remaining_budget < 0
        over_budget_amount = round(abs(remaining_budget) if is_over_budget else 0.0, 2)

        per_person_cost = round(total_estimated / travelers, 2)
        per_day_cost = round(total_estimated / duration_days, 2)

        # Human-readable transparent explanation of basis for each category
        o_lat, o_lng = _get_coords(origin)
        d_lat, d_lng = _get_coords(dest_name)
        dist_km = round(_haversine_km(o_lat, o_lng, d_lat, d_lng), 1)

        cost_explanation = {
            "transport": f"Estimate for round-trip {preferred_transport} ({dist_km} km road/rail distance) for {travelers} traveler(s).",
            "accommodation": f"Estimate based on {accommodation_preference} standard: ₹{int(room_night_rate):,}/night for {rooms_needed} room(s) × {nights} night(s).",
            "food": f"Estimate for 3 daily meals/snacks at ₹{int(meal_daily_per_person):,}/day per person in {dest_name}.",
            "entry_tickets": "Sum of attraction admission fees and monument entry tickets for planned stops.",
            "activities": "Estimate for experiential cultural/nature activities and recreational options.",
            "local_travel": "Estimate for daily intra-city auto-rickshaw/cab commutes between scheduled attractions.",
            "contingency": f"5% safety reserve fund (₹{int(contingency_cost):,}) to cushion incidental delays or emergency expenses.",
        }

        return {
            "transport_cost": transport_cost,
            "stay_cost": stay_cost,
            "food_cost": food_cost,
            "entry_ticket_cost": entry_ticket_cost,
            "activity_cost": activity_cost,
            "local_travel_cost": local_travel_cost,
            "contingency_cost": contingency_cost,
            "buffer_amount": buffer_amount,
            "misc_cost": misc_cost,
            "total_estimated": total_estimated,
            "remaining_budget": remaining_budget,
            "is_over_budget": is_over_budget,
            "over_budget_amount": over_budget_amount,
            "per_person_cost": per_person_cost,
            "per_day_cost": per_day_cost,
            "is_estimate": True,
            "cost_explanation": cost_explanation,
        }
