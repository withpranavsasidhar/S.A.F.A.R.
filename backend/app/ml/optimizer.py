from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from app.ml.recommender import _haversine_km

# Curated regional culinary recommendations per destination
DESTINATION_CUISINES: Dict[str, List[str]] = {
    "Vijayawada": ["Andhra Veg Thali (Gongura Chutney)", "Pesarattu Upma & Ginger Pachadi", "Babai Hotel Ghee Idli", "Mirchi Bajji & Punugulu", "Kosta Biryani"],
    "Araku Valley": ["Araku Organic Coffee & Honey", "Bamboo Chicken / Mutton", "Bongu Biryani", "Tribal Millet Roti & Curry", "Madugula Halwa"],
    "Munnar": ["Kerala Appam with Vegetable Stew", "Malabar Parotta & Kurma", "Nallathanni Fresh Cardamom Tea", "Karimeen Pollichathu", "Banana Fritters (Pazham Pori)"],
    "Coorg": ["Kodava Pandi Curry", "Akki Roti & Enne Badanekayi", "Kadambuttu (Steamed Rice Balls)", "Coorg Fresh Spiced Coffee", "Bamboo Shoot Curry (Kani)"],
    "Hampi": ["North Karnataka Jolada Roti Oota", "Bisi Bele Bath", "Mango Tree Special Thali", "Benne Dosa", "Filter Coffee & Fresh Coconut Water"],
    "Ooty": ["Ooty Homemade Chocolates", "Varkey with Nilgiri Green Tea", "South Indian Morning Tiffin", "Nilgiri Mutton/Vegetable Kurma", "Fresh Farm Strawberries & Cream"],
    "Chikmagalur": ["Malnad Akki Roti & Kaayi Chutney", "Chikmagalur Fresh Roasted Filter Coffee", "Neer Dosa & Sagu", "Jackfruit Biryani / Curry", "Halasina Hannu Payasa"],
    "Pondicherry": ["French Crepes & Croissants at Rue Suffren", "Pondicherry Creole Fish/Veg Curry", "Artisan Wood-fired Pizza", "Baguette Sandwiches & Filter Coffee", "Assorted French Macarons"],
    "Goa": ["Goan Fish Curry Thali", "Pao Bhaji & Ross Omelette", "Bebinca Layered Dessert", "Vegetable Caldin Stew", "Cashew Feni / Fresh Sol Kadhi"],
}

# Curated accommodation suggestions by preference tier
DESTINATION_STAYS: Dict[str, Dict[str, Dict[str, Any]]] = {
    "Vijayawada": {
        "Hostel / Budget": {"name": "Hotel Manorama Residency", "area": "Governorpet", "est_rate": 1400},
        "3-Star Hotel": {"name": "Quality Hotel D V Manor", "area": "M.G. Road", "est_rate": 2800},
        "Boutique / Homestay": {"name": "Krishna Riverside Retreat", "area": "Prakasam Barrage Waterfront", "est_rate": 3500},
        "Luxury Resort": {"name": "Novotel Vijayawada Varun", "area": "Bharathi Nagar", "est_rate": 5500},
    },
    "Araku Valley": {
        "Hostel / Budget": {"name": "APTDC Haritha Valley Resort", "area": "Araku Town Center", "est_rate": 1600},
        "3-Star Hotel": {"name": "Padmapuram Valley Resort", "area": "Padmapuram Gardens", "est_rate": 2600},
        "Boutique / Homestay": {"name": "Tribal Heritage Eco Cottages", "area": "Ananthagiri Hills", "est_rate": 3200},
        "Luxury Resort": {"name": "Nature Nest Eco Resort Araku", "area": "Dumbriguda Road", "est_rate": 4800},
    },
    "Munnar": {
        "Hostel / Budget": {"name": "Zostel Munnar", "area": "Vattavada Road", "est_rate": 1500},
        "3-Star Hotel": {"name": "Tea County Munnar (KTDC)", "area": "Munnar Town", "est_rate": 3200},
        "Boutique / Homestay": {"name": "Blackberry Hills Retreat", "area": "Pothamedu Viewpoint", "est_rate": 4200},
        "Luxury Resort": {"name": "The Panoramic Getaway", "area": "Chithirapuram", "est_rate": 6800},
    },
    "Coorg": {
        "Hostel / Budget": {"name": "Madikeri Heritage Stay", "area": "Madikeri Fort Area", "est_rate": 1600},
        "3-Star Hotel": {"name": "Club Mahindra Madikeri", "area": "Galibeedu Road", "est_rate": 3400},
        "Boutique / Homestay": {"name": "Coffee Plantation Kodava Homestay", "area": "Siddapur Estates", "est_rate": 3800},
        "Luxury Resort": {"name": "The Tamara Coorg", "area": "Kabbinakad Estate", "est_rate": 8500},
    },
    "Hampi": {
        "Hostel / Budget": {"name": "Gopi Guesthouse", "area": "Hampi Bazaar", "est_rate": 1200},
        "3-Star Hotel": {"name": "KSTDC Hotel Mayura Bhuvaneshwari", "area": "Kamalapur", "est_rate": 2500},
        "Boutique / Homestay": {"name": "Heritage River Resort Hampi", "area": "Anegundi Island", "est_rate": 3400},
        "Luxury Resort": {"name": "Evolve Back Kamalapura Palace", "area": "Kamalapur Palace Enclave", "est_rate": 9500},
    },
    "Ooty": {
        "Hostel / Budget": {"name": "Zostel Ooty", "area": "Fern Hill", "est_rate": 1500},
        "3-Star Hotel": {"name": "Sterling Ooty Elk Hill", "area": "Ramakrishna Mutt Road", "est_rate": 3200},
        "Boutique / Homestay": {"name": "King's Cliff Heritage Mansion", "area": "Havelock Road", "est_rate": 4200},
        "Luxury Resort": {"name": "Savoy - IHCL SeleQtions", "area": "Sylks Road", "est_rate": 7800},
    },
    "Chikmagalur": {
        "Hostel / Budget": {"name": "Planters Stays", "area": "K.M. Road", "est_rate": 1400},
        "3-Star Hotel": {"name": "The Gateway Hotel KM Road", "area": "Chikmagalur Town", "est_rate": 3200},
        "Boutique / Homestay": {"name": "Mullayanagiri Mist Homestay", "area": "Baba Budangiri Hills", "est_rate": 3800},
        "Luxury Resort": {"name": "The Serai Chikmagalur", "area": "Mugthihalli Coffee Grove", "est_rate": 8200},
    },
    "Pondicherry": {
        "Hostel / Budget": {"name": "Micasa Hostel", "area": "Heritage Town", "est_rate": 1400},
        "3-Star Hotel": {"name": "Shenbaga Hotel & Convention", "area": "MG Road", "est_rate": 2900},
        "Boutique / Homestay": {"name": "La Maison Rose Heritage Villa", "area": "French White Town", "est_rate": 4400},
        "Luxury Resort": {"name": "Palais de Mahe - CGH Earth", "area": "Bussy Street, White Town", "est_rate": 7600},
    },
    "Goa": {
        "Hostel / Budget": {"name": "GoStops Goa Calangute", "area": "Calangute Beach Road", "est_rate": 1500},
        "3-Star Hotel": {"name": "BloomSuites Calangute", "area": "North Goa", "est_rate": 3600},
        "Boutique / Homestay": {"name": "Fort Tiracol Heritage Hotel", "area": "Tiracol Coastal Cliff", "est_rate": 5200},
        "Luxury Resort": {"name": "Taj Fort Aguada Resort & Spa", "area": "Sinquerim Beach", "est_rate": 9800},
    },
}

DEFAULT_STAYS = {
    "Hostel / Budget": {"name": "City Central Backpacker Stay", "area": "Station Road", "est_rate": 1300},
    "3-Star Hotel": {"name": "Grand Landmark Business Hotel", "area": "City Center Hub", "est_rate": 2800},
    "Boutique / Homestay": {"name": "Regional Heritage Boutique Villa", "area": "Historic Quarter", "est_rate": 3800},
    "Luxury Resort": {"name": "Royal Palace Heritage Resort", "area": "Lakefront Promenade", "est_rate": 6500},
}


def _calc_transit_details(lat1: float, lng1: float, lat2: float, lng2: float) -> Tuple[float, str, str]:
    """
    Returns (distance_km, travel_time_str, transport_mode_str)
    based on actual geographic Haversine distance and road factor.
    """
    km = _haversine_km(lat1, lng1, lat2, lng2)
    dist_km = round(km, 2)
    if km < 0.2:
        return 0.0, "0 mins", "Same Location / At Site"
    if km < 1.0:
        mins = max(3, int(km * 14)) # ~4.3 km/h walking speed
        return dist_km, f"{mins} mins walk", "Walking (< 1 km)"
    if km < 6.0:
        road_km = km * 1.35
        mins = max(6, int((road_km / 22.0) * 60)) # city traffic ~22 km/h
        return dist_km, f"{mins} mins drive", "Auto-rickshaw / Local Taxi"
    if km < 25.0:
        road_km = km * 1.35
        mins = max(15, int((road_km / 32.0) * 60)) # arterial road ~32 km/h
        time_str = f"{mins} mins drive" if mins < 60 else f"{mins // 60}h {mins % 60}m drive"
        return dist_km, time_str, "City Cab / Ride-hailing"
    # Intercity / regional highway
    road_km = km * 1.4
    mins = max(35, int((road_km / 45.0) * 60)) # highway ~45 km/h
    time_str = f"{mins} mins drive" if mins < 60 else f"{mins // 60}h {mins % 60}m drive"
    return dist_km, time_str, "Private Cab / Regional Transit"


class ItineraryOptimizer:
    @classmethod
    def get_accommodation_suggestion(cls, dest_name: str, preference: str) -> Dict[str, Any]:
        dest_dict = DESTINATION_STAYS.get(dest_name, DEFAULT_STAYS)
        stay = dest_dict.get(preference, dest_dict.get("3-Star Hotel", DEFAULT_STAYS["3-Star Hotel"]))
        return {
            "name": stay["name"],
            "area": stay["area"],
            "tier": preference,
            "est_nightly_rate": stay["est_rate"],
            "currency": "INR",
            "is_estimate": True,
        }

    @classmethod
    def get_culinary_recommendations(cls, dest_name: str) -> List[str]:
        return DESTINATION_CUISINES.get(dest_name, [
            "Authentic Regional Thali", "Local Street Food Special",
            "Fresh Traditional Sweets", "Regional Breakfast Tiffin"
        ])

    @classmethod
    def get_activity_recommendations(cls, dest_name: str) -> List[str]:
        return [
            f"Guided walking photography tour in {dest_name}",
            "Early morning scenic viewpoint & sunrise walk",
            "Local handicraft and artisanal souvenir market visit",
            "Regional culinary tasting and authentic dinner experience",
        ]

    @classmethod
    def _cluster_attractions_geographically(
        cls,
        attractions: List[Any],
        num_clusters: int,
        dest_lat: float,
        dest_lng: float
    ) -> List[List[Any]]:
        """
        Geographic clustering: Groups candidate attractions into `num_clusters` days
        such that distant attractions are separated into different days.
        Uses greedy spatial farthest-first seeds, then assigns remaining attractions
        to the closest day cluster while maintaining balanced capacity.
        """
        if not attractions:
            return [[] for _ in range(num_clusters)]
        if num_clusters <= 1:
            return [list(attractions)]

        # Unique deduplicated attractions
        seen_names = set()
        unique_attrs = []
        for a in attractions:
            name_norm = a.name.strip().lower()
            if name_norm not in seen_names:
                seen_names.add(name_norm)
                unique_attrs.append(a)

        if len(unique_attrs) <= num_clusters:
            # One per day
            clusters = [[a] for a in unique_attrs]
            while len(clusters) < num_clusters:
                clusters.append([])
            return clusters

        # Pick seed 1: attraction closest to destination center or highest popularity
        seeds = [unique_attrs[0]]
        remaining = unique_attrs[1:]

        # Pick subsequent seeds: attraction furthest from all existing seeds
        for _ in range(1, min(num_clusters, len(unique_attrs))):
            furthest_attr = None
            max_min_dist = -1.0
            for cand in remaining:
                min_dist_to_seeds = min(_haversine_km(cand.latitude, cand.longitude, s.latitude, s.longitude) for s in seeds)
                if min_dist_to_seeds > max_min_dist:
                    max_min_dist = min_dist_to_seeds
                    furthest_attr = cand
            if furthest_attr:
                seeds.append(furthest_attr)
                remaining.remove(furthest_attr)

        clusters: List[List[Any]] = [[s] for s in seeds]
        while len(clusters) < num_clusters:
            clusters.append([])

        # Assign remaining attractions to closest cluster centroid
        for attr in remaining:
            best_cluster_idx = 0
            best_dist = float("inf")
            for idx, cluster in enumerate(clusters):
                if not cluster:
                    best_cluster_idx = idx
                    break
                avg_lat = sum(a.latitude for a in cluster) / len(cluster)
                avg_lng = sum(a.longitude for a in cluster) / len(cluster)
                d = _haversine_km(attr.latitude, attr.longitude, avg_lat, avg_lng)
                if d < best_dist:
                    best_dist = d
                    best_cluster_idx = idx
            clusters[best_cluster_idx].append(attr)

        # Within each day's cluster, sort attractions to minimize path (greedy TSP)
        ordered_clusters = []
        for cluster in clusters:
            if len(cluster) <= 1:
                ordered_clusters.append(cluster)
                continue
            curr_lat, curr_lng = dest_lat, dest_lng
            ordered = []
            pool = list(cluster)
            while pool:
                nearest = min(pool, key=lambda a: _haversine_km(curr_lat, curr_lng, a.latitude, a.longitude))
                ordered.append(nearest)
                curr_lat, curr_lng = nearest.latitude, nearest.longitude
                pool.remove(nearest)
            ordered_clusters.append(ordered)

        return ordered_clusters

    @classmethod
    def generate_day_wise_itinerary(
        cls,
        dest_name: str,
        dest_lat: float,
        dest_lng: float,
        attractions: List[Any],
        duration_days: int,
        travelers: int = 2,
        custom_places: List[Any] = None,
        start_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Build day-wise itinerary with:
          - Attractions grouped geographically per day (avoiding distant spots together).
          - Realistic travel distances, travel times and transport modes.
          - Authentic regional breakfast, lunch and dinner recommendations.
          - Daily estimated expenses.
        """
        class _CustomAttrAdapter:
            def __init__(self, cp: Any):
                self.id = None
                self.name = cp.name if hasattr(cp, "name") else cp["name"]
                self.category = cp.category if hasattr(cp, "category") else cp.get("category", "attractions")
                addr = cp.address if hasattr(cp, "address") else cp.get("address")
                self.description = f"User-selected place ({self.category})" + (f" — {addr}" if addr else "")
                self.est_duration_hours = 2.0
                self.entry_fee = 0.0
                self.popularity_score = 5.0
                self.latitude = cp.lat if hasattr(cp, "lat") else cp["lat"]
                self.longitude = cp.lng if hasattr(cp, "lng") else cp["lng"]

        custom_adapters = [_CustomAttrAdapter(cp) for cp in (custom_places or [])]
        all_candidate_attrs = custom_adapters + sorted(attractions, key=lambda a: a.popularity_score, reverse=True)

        # Perform geographic clustering across duration_days
        day_clusters = cls._cluster_attractions_geographically(
            all_candidate_attrs, duration_days, dest_lat, dest_lng
        )

        culinary_list = cls.get_culinary_recommendations(dest_name)
        itineraries = []

        parsed_start_date: Optional[datetime] = None
        if start_date:
            try:
                parsed_start_date = datetime.strptime(start_date, "%Y-%m-%d")
            except Exception:
                parsed_start_date = None

        for day_idx in range(duration_days):
            day_num = day_idx + 1
            if parsed_start_date:
                curr_date = parsed_start_date + timedelta(days=day_idx)
                date_label = f"Day {day_num} - {curr_date.strftime('%a, %b %d')}"
            else:
                date_label = f"Day {day_num}"

            cluster_attrs = day_clusters[day_idx] if day_idx < len(day_clusters) else []
            prev_lat, prev_lng = dest_lat, dest_lng
            day_items = []

            # 1. Breakfast Slot (08:30 AM)
            breakfast_specialty = culinary_list[day_idx % len(culinary_list)]
            day_items.append({
                "time_slot": "08:30 AM",
                "activity_name": f"Day {day_num} Regional Breakfast: {breakfast_specialty}",
                "description": f"Enjoy fresh regional morning breakfast ({breakfast_specialty}) before beginning the day.",
                "duration_mins": 60,
                "cost": round(150.0 * travelers, 2),
                "travel_time_from_prev": "0 mins",
                "distance_from_prev_km": 0.0,
                "transport_mode_from_prev": "Hotel Dining / Walk",
                "item_type": "meal",
                "latitude": dest_lat,
                "longitude": dest_lng,
                "attraction_id": None
            })

            # 2. Morning Attraction (10:00 AM)
            if len(cluster_attrs) > 0:
                attr1 = cluster_attrs[0]
                dist_km, time_str, mode_str = _calc_transit_details(prev_lat, prev_lng, attr1.latitude, attr1.longitude)
                day_items.append({
                    "time_slot": "10:00 AM",
                    "activity_name": attr1.name,
                    "description": attr1.description or f"Experience top-rated {attr1.category} landmark.",
                    "duration_mins": max(60, int(attr1.est_duration_hours * 60)),
                    "cost": round(attr1.entry_fee * travelers, 2),
                    "travel_time_from_prev": time_str,
                    "distance_from_prev_km": dist_km,
                    "transport_mode_from_prev": mode_str,
                    "item_type": "attraction",
                    "latitude": attr1.latitude,
                    "longitude": attr1.longitude,
                    "attraction_id": attr1.id
                })
                prev_lat, prev_lng = attr1.latitude, attr1.longitude
            else:
                day_items.append({
                    "time_slot": "10:00 AM",
                    "activity_name": f"{dest_name} Heritage & City Walk",
                    "description": "Guided walking tour through historic quarters and artisanal bazaars.",
                    "duration_mins": 120,
                    "cost": 0.0,
                    "travel_time_from_prev": "5 mins walk",
                    "distance_from_prev_km": 0.4,
                    "transport_mode_from_prev": "Walking (< 1 km)",
                    "item_type": "activity",
                    "latitude": dest_lat,
                    "longitude": dest_lng,
                    "attraction_id": None
                })

            # 3. Authentic Regional Lunch (01:00 PM)
            lunch_specialty = culinary_list[(day_idx + 1) % len(culinary_list)]
            day_items.append({
                "time_slot": "01:00 PM",
                "activity_name": f"Authentic Regional Lunch ({lunch_specialty})",
                "description": f"Mid-day dining break sampling regional cuisine ({lunch_specialty}) near the morning circuit.",
                "duration_mins": 75,
                "cost": round(300.0 * travelers, 2),
                "travel_time_from_prev": "5 mins walk",
                "distance_from_prev_km": 0.3,
                "transport_mode_from_prev": "Walking (< 1 km)",
                "item_type": "meal",
                "latitude": prev_lat,
                "longitude": prev_lng,
                "attraction_id": None
            })

            # 4. Afternoon Attraction (02:45 PM)
            if len(cluster_attrs) > 1:
                attr2 = cluster_attrs[1]
                dist_km, time_str, mode_str = _calc_transit_details(prev_lat, prev_lng, attr2.latitude, attr2.longitude)
                day_items.append({
                    "time_slot": "02:45 PM",
                    "activity_name": attr2.name,
                    "description": attr2.description or f"Exploration of {attr2.category} attraction.",
                    "duration_mins": max(60, int(attr2.est_duration_hours * 60)),
                    "cost": round(attr2.entry_fee * travelers, 2),
                    "travel_time_from_prev": time_str,
                    "distance_from_prev_km": dist_km,
                    "transport_mode_from_prev": mode_str,
                    "item_type": "attraction",
                    "latitude": attr2.latitude,
                    "longitude": attr2.longitude,
                    "attraction_id": attr2.id
                })
                prev_lat, prev_lng = attr2.latitude, attr2.longitude
            else:
                day_items.append({
                    "time_slot": "02:45 PM",
                    "activity_name": f"Cultural Discovery & Artisan Workshops",
                    "description": f"Engage with local craftspeople and cultural exhibitions in {dest_name}.",
                    "duration_mins": 90,
                    "cost": round(100.0 * travelers, 2),
                    "travel_time_from_prev": "10 mins drive",
                    "distance_from_prev_km": 2.5,
                    "transport_mode_from_prev": "Auto-rickshaw / Local Taxi",
                    "item_type": "activity",
                    "latitude": prev_lat,
                    "longitude": prev_lng,
                    "attraction_id": None
                })

            # 5. Sunset & Scenic Viewpoint (05:30 PM)
            if len(cluster_attrs) > 2:
                attr3 = cluster_attrs[2]
                dist_km, time_str, mode_str = _calc_transit_details(prev_lat, prev_lng, attr3.latitude, attr3.longitude)
                day_items.append({
                    "time_slot": "05:30 PM",
                    "activity_name": attr3.name,
                    "description": attr3.description or "Sunset panorama and photography session.",
                    "duration_mins": 90,
                    "cost": round(attr3.entry_fee * travelers, 2),
                    "travel_time_from_prev": time_str,
                    "distance_from_prev_km": dist_km,
                    "transport_mode_from_prev": mode_str,
                    "item_type": "attraction",
                    "latitude": attr3.latitude,
                    "longitude": attr3.longitude,
                    "attraction_id": attr3.id
                })
                prev_lat, prev_lng = attr3.latitude, attr3.longitude
            else:
                dist_km, time_str, mode_str = _calc_transit_details(prev_lat, prev_lng, dest_lat, dest_lng)
                day_items.append({
                    "time_slot": "05:30 PM",
                    "activity_name": f"Sunset Viewpoint & Promenade Walk",
                    "description": "Scenic sunset viewpoint, street photography, and local market exploration.",
                    "duration_mins": 90,
                    "cost": 0.0,
                    "travel_time_from_prev": time_str,
                    "distance_from_prev_km": dist_km,
                    "transport_mode_from_prev": mode_str,
                    "item_type": "activity",
                    "latitude": dest_lat,
                    "longitude": dest_lng,
                    "attraction_id": None
                })
                prev_lat, prev_lng = dest_lat, dest_lng

            # 6. Dinner & Evening Relaxation (07:45 PM)
            dinner_specialty = culinary_list[(day_idx + 2) % len(culinary_list)]
            dist_km, time_str, mode_str = _calc_transit_details(prev_lat, prev_lng, dest_lat, dest_lng)
            day_items.append({
                "time_slot": "07:45 PM",
                "activity_name": f"Dinner & Evening Relaxation ({dinner_specialty})",
                "description": f"Relaxing dinner experience featuring {dinner_specialty} followed by leisurely evening stroll.",
                "duration_mins": 90,
                "cost": round(350.0 * travelers, 2),
                "travel_time_from_prev": time_str,
                "distance_from_prev_km": dist_km,
                "transport_mode_from_prev": mode_str,
                "item_type": "meal",
                "latitude": dest_lat,
                "longitude": dest_lng,
                "attraction_id": None
            })

            day_theme = f"{cluster_attrs[0].name} Circuit" if cluster_attrs else "City & Cultural Circuit"
            day_total_cost = round(sum(it["cost"] for it in day_items), 2)

            itineraries.append({
                "day_number": day_num,
                "date_label": date_label,
                "day_theme": day_theme,
                "estimated_day_cost": day_total_cost,
                "items": day_items
            })

        return itineraries

    @classmethod
    def recalculate_itinerary(
        cls,
        itinerary: List[Any],
        dest_lat: float,
        dest_lng: float,
    ) -> Tuple[List[Dict[str, Any]], float, float]:
        """
        Recalculates distances, transit times, and transport modes
        after user adds, removes, or reorders itinerary stops.
        Returns: (recalculated_itinerary, total_entry_tickets, total_local_km)
        """
        recalculated_days = []
        total_entry_tickets = 0.0
        total_local_km = 0.0

        for day_data in itinerary:
            day_dict = day_data if isinstance(day_data, dict) else day_data.dict()
            items = day_dict.get("items", [])
            recalc_items = []
            prev_lat, prev_lng = dest_lat, dest_lng
            day_cost = 0.0

            for idx, item in enumerate(items):
                item_dict = item if isinstance(item, dict) else item.dict()
                lat = float(item_dict.get("latitude", dest_lat))
                lng = float(item_dict.get("longitude", dest_lng))

                if idx == 0:
                    dist_km = 0.0
                    time_str = "0 mins"
                    mode_str = "Hotel / Starting Base"
                else:
                    dist_km, time_str, mode_str = _calc_transit_details(prev_lat, prev_lng, lat, lng)

                item_dict["distance_from_prev_km"] = dist_km
                item_dict["travel_time_from_prev"] = time_str
                item_dict["transport_mode_from_prev"] = mode_str

                cost = float(item_dict.get("cost", 0.0))
                day_cost += cost
                if item_dict.get("item_type") == "attraction" or item_dict.get("attraction_id"):
                    total_entry_tickets += cost
                total_local_km += dist_km

                recalc_items.append(item_dict)
                prev_lat, prev_lng = lat, lng

            day_dict["items"] = recalc_items
            day_dict["estimated_day_cost"] = round(day_cost, 2)
            recalculated_days.append(day_dict)

        return recalculated_days, round(total_entry_tickets, 2), round(total_local_km, 2)
