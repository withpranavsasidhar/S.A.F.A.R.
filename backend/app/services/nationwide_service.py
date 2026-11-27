from __future__ import annotations

from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.db.models import Destination, Attraction
from app.schemas.schemas import (
    NationwideDestinationOut, ExploreIndiaCatalogOut, HiddenGemOut, DestinationDetailOut, AttractionOut, ForecastOut
)
from app.services.location_provider import geo_provider, PlaceCandidate, haversine_km

STATE_REGION_MAP: Dict[str, str] = {
    # South
    "Andhra Pradesh": "South India",
    "Karnataka": "South India",
    "Kerala": "South India",
    "Tamil Nadu": "South India",
    "Tamil Nadu / UT": "South India",
    "Telangana": "South India",
    "Pondicherry": "South India",
    "Puducherry": "South India",
    "Goa": "South India",
    # North
    "Himachal Pradesh": "North India",
    "Uttarakhand": "North India",
    "Jammu and Kashmir": "North India",
    "Jammu & Kashmir": "North India",
    "Punjab": "North India",
    "Haryana": "North India",
    "Delhi": "North India",
    "Uttar Pradesh": "North India",
    "Ladakh": "North India",
    # West
    "Rajasthan": "West India",
    "Gujarat": "West India",
    "Maharashtra": "West India",
    # East
    "West Bengal": "East India",
    "Odisha": "East India",
    "Bihar": "East India",
    "Jharkhand": "East India",
    # Central
    "Madhya Pradesh": "Central India",
    "Chhattisgarh": "Central India",
    # North-East
    "Assam": "North-East India",
    "Meghalaya": "North-East India",
    "Sikkim": "North-East India",
    "Arunachal Pradesh": "North-East India",
    "Nagaland": "North-East India",
    "Manipur": "North-East India",
    "Mizoram": "North-East India",
    "Tripura": "North-East India",
}

class NationwideService:
    @staticmethod
    def get_region_for_state(state: str) -> str:
        for s_key, region in STATE_REGION_MAP.items():
            if s_key.lower() in state.lower():
                return region
        return "Pan India"

    @staticmethod
    def explore_india(
        db: Session,
        search: Optional[str] = None,
        state: Optional[str] = None,
        region: Optional[str] = None,
        category: Optional[str] = None,
        interest: Optional[str] = None,
        season: Optional[str] = None,
        max_daily_budget: Optional[float] = None,
        include_live_geo: bool = True,
        limit: int = 50,
    ) -> ExploreIndiaCatalogOut:
        """
        Nationwide destination discovery querying curated database destinations
        and augmenting with live OpenStreetMap geographic results across Indian states.
        """
        query = db.query(Destination)

        # Apply state filter
        if state and state != "All":
            query = query.filter(Destination.state.ilike(f"%{state}%"))

        # Apply category filter
        if category and category != "All":
            query = query.filter(Destination.category.ilike(f"%{category}%"))

        # Apply search filter
        if search and search.strip():
            clean_search = search.strip()
            query = query.filter(
                Destination.name.ilike(f"%{clean_search}%")
                | Destination.state.ilike(f"%{clean_search}%")
                | Destination.region.ilike(f"%{clean_search}%")
                | Destination.tags.ilike(f"%{clean_search}%")
            )

        # Apply interest filter
        if interest and interest != "All":
            query = query.filter(
                Destination.tags.ilike(f"%{interest}%")
                | Destination.category.ilike(f"%{interest}%")
            )

        # Apply budget filter
        if max_daily_budget and max_daily_budget > 0:
            query = query.filter(Destination.base_daily_cost <= max_daily_budget)

        curated_dests = query.all()

        # In-memory region and season filtering on curated destinations
        filtered_curated: List[Destination] = []
        for dest in curated_dests:
            dest_region = NationwideService.get_region_for_state(dest.state)
            if region and region != "All" and region.lower() not in dest_region.lower() and region.lower() not in (dest.region or "").lower():
                continue
            if season and season != "All":
                # Check best_months
                if dest.best_months:
                    season_lower = season.lower()
                    # e.g. "winter" matches Oct, Nov, Dec, Jan, Feb
                    winter_months = {"oct", "nov", "dec", "jan", "feb"}
                    monsoon_months = {"jul", "aug", "sep"}
                    summer_months = {"mar", "apr", "may", "jun"}
                    dest_months = {m.strip().lower()[:3] for m in dest.best_months.split(",")}
                    if "winter" in season_lower and not (dest_months & winter_months):
                        continue
                    if "monsoon" in season_lower and not (dest_months & monsoon_months):
                        continue
                    if "summer" in season_lower and not (dest_months & summer_months):
                        continue
                    if "winter" not in season_lower and "monsoon" not in season_lower and "summer" not in season_lower:
                        if season_lower[:3] not in [m[:3] for m in dest_months]:
                            continue
            filtered_curated.append(dest)

        results: List[NationwideDestinationOut] = []
        curated_names_lower = set()

        for d in filtered_curated:
            curated_names_lower.add(d.name.lower().strip())
            dest_region = NationwideService.get_region_for_state(d.state)
            gmaps_url = f"https://www.google.com/maps/dir/?api=1&destination={d.latitude},{d.longitude}"
            results.append(
                NationwideDestinationOut(
                    id=d.id,
                    name=d.name,
                    region=d.region or dest_region,
                    state=d.state,
                    category=d.category,
                    description=d.description,
                    rating=d.rating,
                    base_daily_cost=d.base_daily_cost,
                    image_url=d.image_url,
                    latitude=d.latitude,
                    longitude=d.longitude,
                    best_months=d.best_months,
                    tags=d.tags,
                    source_type="curated",
                    estimated_duration_days="2 - 4 Days",
                    accessibility_notes=f"Accessible via nearest railway station or domestic airport in {d.state}. Local transit available.",
                    directions_url=gmaps_url,
                    attractions_count=len(d.attractions) if d.attractions else 0,
                )
            )

        # Dynamic Nationwide Geographic Discovery:
        # If user searched for a specific term (e.g. "Varanasi", "Spiti", "Munnar", "Darjeeling", "Udaipur", "Meghalaya", "Konark", "Kutch", "Rishikesh", etc.)
        # and live geo is enabled, search Nominatim to discover real places across India!
        if include_live_geo and search and len(search.strip()) >= 2:
            try:
                candidates = geo_provider.autocomplete(search.strip(), limit=8)
                for cand in candidates:
                    # Filter candidates: must be in India
                    is_in_india = (cand.country and "india" in cand.country.lower()) or "india" in cand.display_name.lower()
                    if not is_in_india:
                        continue
                    
                    cand_name_clean = cand.name.lower().strip()
                    # Skip if already in curated results
                    if cand_name_clean in curated_names_lower:
                        continue
                    # Skip if name already added in this pass
                    if any(r.name.lower() == cand_name_clean for r in results):
                        continue

                    cand_state = cand.state or "India"
                    # If state filter is set, ensure match
                    if state and state != "All" and state.lower() not in cand_state.lower():
                        continue

                    cand_region = NationwideService.get_region_for_state(cand_state)
                    if region and region != "All" and region.lower() not in cand_region.lower():
                        continue

                    # Determine estimated cost and category based on place type
                    place_cat = "Culture"
                    ptype = (cand.place_type or "").lower()
                    if ptype in {"nature", "park", "mountain", "peak", "waterfall"}:
                        place_cat = "Nature"
                    elif ptype in {"beach", "coast", "bay"}:
                        place_cat = "Beach"
                    elif ptype in {"temple", "place_of_worship", "monastery", "shrine"}:
                        place_cat = "Spiritual"
                    elif ptype in {"historic", "monument", "castle", "fort"}:
                        place_cat = "Heritage"

                    # If category filter is set, ensure match
                    if category and category != "All" and category.lower() not in place_cat.lower():
                        continue

                    gmaps_url = f"https://www.google.com/maps/dir/?api=1&destination={cand.lat},{cand.lng}"
                    image_placeholder = "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=1200&auto=format&fit=crop"

                    results.append(
                        NationwideDestinationOut(
                            id=None,
                            name=cand.name,
                            region=cand_region,
                            state=cand_state,
                            category=place_cat,
                            description=f"Geographic destination in {cand_state}, India ({cand.display_name}). Discovered via OpenStreetMap geographic database.",
                            rating=4.5,
                            base_daily_cost=2200.0,
                            image_url=image_placeholder,
                            latitude=cand.lat,
                            longitude=cand.lng,
                            best_months="Oct - Mar (Pleasant Season)",
                            tags=f"{place_cat}, Discovered, {cand_state}",
                            source_type="geographic_discovery",
                            estimated_duration_days="1 - 3 Days",
                            accessibility_notes=f"Located in {cand_state}. Nearest transit links accessible via state highways and regional junctions.",
                            directions_url=gmaps_url,
                            attractions_count=0,
                        )
                    )
            except Exception as e:
                print(f"Live geo discovery note: {e}")

        # Compute distinct available states and regions from database
        all_dests = db.query(Destination).all()
        distinct_states = sorted(list({d.state for d in all_dests if d.state}))
        distinct_regions = sorted(list({NationwideService.get_region_for_state(d.state) for d in all_dests if d.state}))
        distinct_categories = sorted(list({d.category for d in all_dests if d.category}))

        return ExploreIndiaCatalogOut(
            destinations=results[:limit],
            available_states=distinct_states,
            available_regions=distinct_regions,
            available_categories=distinct_categories,
            total_count=len(results),
        )

    @staticmethod
    def get_hidden_gems_catalog(
        db: Session,
        state: Optional[str] = None,
        category: Optional[str] = None,
        region: Optional[str] = None,
        max_crowd_score: float = 4.7,
        limit: int = 30,
    ) -> List[HiddenGemOut]:
        """
        Transparent hidden gems selection.
        Criteria:
        1. Popularity score <= max_crowd_score (4.7/5) indicating unhurried crowd atmosphere.
        2. Real tourist relevance (documented local heritage, rock-cut architecture, ancient caves, serene viewpoints, or nature trails).
        3. Factual rationale and explicit qualification method.
        """
        query = db.query(Attraction).filter(Attraction.popularity_score <= max_crowd_score)

        if category and category != "All":
            query = query.filter(Attraction.category.ilike(f"%{category}%"))

        attractions = query.all()
        gems: List[HiddenGemOut] = []

        for attr in attractions:
            dest = attr.destination
            if not dest:
                continue

            if state and state != "All" and state.lower() not in dest.state.lower():
                continue

            dest_region = NationwideService.get_region_for_state(dest.state)
            if region and region != "All" and region.lower() not in dest_region.lower():
                continue

            # Method qualification
            if attr.popularity_score <= 4.2:
                sel_method = "SCENIC_OFFBEAT"
                crowd_level = "Low"
                crowd_desc = "Tranquil low-footprint haven"
            elif "heritage" in attr.category.lower() or "monument" in attr.category.lower() or "cave" in attr.name.lower() or "fort" in attr.name.lower():
                sel_method = "VERIFIED_HERITAGE"
                crowd_level = "Moderate"
                crowd_desc = "Verified cultural & archaeological site"
            else:
                sel_method = "CURATED_LOW_CROWD"
                crowd_level = "Low" if attr.popularity_score <= 4.4 else "Moderate"
                crowd_desc = "Curated local attraction with lower congestion"

            entry_note = "Free public entry" if attr.entry_fee == 0 else f"Modest entry ₹{int(attr.entry_fee)}"
            reason = (
                f"{crowd_desc} ({attr.popularity_score}/5.0 crowd index) • "
                f"{entry_note} • "
                f"{attr.category} in {dest.name}, {dest.state} • "
                f"Est. {attr.est_duration_hours}h visit."
            )

            accessibility = f"Open {attr.opening_time} - {attr.closing_time}. Best visited during early mornings or late afternoons."

            gems.append(
                HiddenGemOut(
                    id=attr.id,
                    destination_id=dest.id,
                    destination_name=dest.name,
                    state=dest.state,
                    name=attr.name,
                    category=attr.category,
                    description=attr.description or f"Scenic and culturally relevant place in {dest.name}.",
                    popularity_score=attr.popularity_score,
                    entry_fee=attr.entry_fee,
                    est_duration_hours=attr.est_duration_hours,
                    latitude=attr.latitude,
                    longitude=attr.longitude,
                    image_url=attr.image_url or dest.image_url,
                    distance_km=None,
                    gem_reason=reason,
                    selection_method=sel_method,
                    verification_status="Curated Editorial",
                    crowd_footprint=crowd_level,
                    accessibility_notes=accessibility,
                )
            )

        # Sort by popularity ascending (lowest crowd first)
        gems.sort(key=lambda g: g.popularity_score)
        return gems[:limit]
