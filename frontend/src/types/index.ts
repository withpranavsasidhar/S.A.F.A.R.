export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  home_location: string;
  created_at?: string;
}

export interface Attraction {
  id: number;
  destination_id: number;
  name: string;
  category: string;
  description?: string;
  est_duration_hours: number;
  entry_fee: number;
  popularity_score: number;
  opening_time: string;
  closing_time: string;
  latitude: number;
  longitude: number;
  image_url?: string;
}

export interface LiveWeather {
  temperature_c: number;
  condition: string;
  condition_code: number;
  wind_kph: number;
  humidity_percent: number;
  precipitation_prob: number;
  source: string;
  retrieved_at: string;
  is_live: boolean;
  status: string;
}

export interface Forecast {
  month: string;
  month_num: number;
  predicted_demand: number;
  crowd_index: number;
  crowd_level: string;
  season_type: string;
  model_accuracy?: string;
  data_source?: string;
  forecast_period?: string;
  is_experimental?: boolean;
  limitations?: string;
}

export interface Destination {
  id: number;
  name: string;
  region: string;
  state: string;
  category: string;
  description: string;
  rating: number;
  base_daily_cost: number;
  image_url: string;
  latitude: number;
  longitude: number;
  best_months: string;
  tags: string;
  attractions?: Attraction[];
  forecasts?: Forecast[];
  estimated_duration_days?: string;
  accessibility_notes?: string;
  directions_url?: string;
  weather?: LiveWeather;
}

export interface TripRequirement {
  origin: string;
  budget: number;
  duration_days: number;
  travelers: number;
  interests: string[];
  crowd_preference: string;
  travel_style: string;
  travel_month?: number;
  radius_km?: number;
  start_date?: string;
  end_date?: string;
  currency?: string;
  preferred_transport?: string;
  accommodation_preference?: string;
}

export interface Recommendation {
  destination: Destination;
  match_score: number;
  budget_fit_score: number;
  crowd_fit_score: number;
  overall_score: number;
  estimated_total_cost: number;
  rationale: string[];
  crowd_status: string;
  distance_km: number;
  is_nearby: boolean;
  weather?: LiveWeather;
}

export interface BudgetBreakdown {
  transport_cost: number;
  stay_cost: number;
  food_cost: number;
  entry_ticket_cost?: number;
  activity_cost: number;
  local_travel_cost?: number;
  contingency_cost?: number;
  buffer_amount: number;
  misc_cost: number;
  total_estimated: number;
  remaining_budget: number;
  is_over_budget?: boolean;
  over_budget_amount?: number;
  per_person_cost?: number;
  per_day_cost?: number;
  is_estimate?: boolean;
  cost_explanation?: Record<string, string>;
}

export interface ItineraryItem {
  id?: number;
  time_slot: string;
  activity_name: string;
  description?: string;
  duration_mins: number;
  cost: number;
  travel_time_from_prev: string;
  distance_from_prev_km?: number;
  transport_mode_from_prev?: string;
  item_type?: string;
  latitude: number;
  longitude: number;
  attraction_id?: number;
}

export interface DayItinerary {
  day_number: number;
  date_label: string;
  day_theme?: string;
  estimated_day_cost?: number;
  items: ItineraryItem[];
}

export interface FullTripPlan {
  id?: number;
  title: string;
  origin: string;
  destination: Destination;
  duration_days: number;
  travelers: number;
  total_budget: number;
  estimated_cost: number;
  crowd_preference: string;
  travel_style: string;
  interests: string;
  budget_breakdown: BudgetBreakdown;
  itinerary: DayItinerary[];
  accommodation_suggestion?: {
    name: string;
    area: string;
    tier: string;
    est_nightly_rate: number;
    currency: string;
    is_estimate: boolean;
  };
  food_recommendations?: string[];
  activity_recommendations?: string[];
  start_date?: string;
  end_date?: string;
  status?: string;
  per_person_cost?: number;
  created_at?: string;
}

export interface AdminAnalytics {
  metrics: {
    total_users: number;
    total_destinations: number;
    total_attractions: number;
    total_trips_generated: number;
    ml_model_accuracy: string;
  };
  popular_destinations: Array<{
    id: number;
    name: string;
    state: string;
    category: string;
    saved_trips_count: number;
    rating: number;
  }>;
}

export interface FeedbackItem {
  id: number;
  user_id: number;
  user_name: string;
  rating: number;
  comments: string;
  created_at: string;
}

export interface PlaceCandidate {
  place_id: string;
  name: string;
  display_name: string;
  lat: number;
  lng: number;
  place_type: string;
  state?: string;
  country?: string;
  boundingbox?: number[]; // [south, north, west, east]
}

export interface NearbyPlace {
  place_id: string;
  osm_type: string;
  osm_id: number;
  name: string;
  category: string;
  subcategory: string;
  lat: number;
  lng: number;
  distance_km: number;
  address?: string;
  opening_hours?: string;
  website?: string;
  phone?: string;
  tags: Record<string, string>;
}

export interface NearbySearchResponse {
  center_lat: number;
  center_lng: number;
  radius_km: number;
  category: string;
  total: number;
  limit: number;
  offset: number;
  provider: string;
  places: NearbyPlace[];
}

export interface ActiveLocation {
  name: string;
  display_name: string;
  lat: number;
  lng: number;
  boundingbox?: number[];
  radius_km: number;
}

export interface HiddenGem {
  id: number;
  destination_id?: number;
  destination_name: string;
  state: string;
  name: string;
  category: string;
  description?: string;
  popularity_score: number;
  entry_fee: number;
  est_duration_hours: number;
  latitude: number;
  longitude: number;
  image_url?: string;
  distance_km?: number;
  gem_reason: string;
  selection_method?: string;
  verification_status?: string;
  crowd_footprint?: string;
  accessibility_notes?: string;
}

export interface NationwideDestination {
  id?: number;
  name: string;
  region: string;
  state: string;
  category: string;
  description: string;
  rating: number;
  base_daily_cost: number;
  image_url: string;
  latitude: number;
  longitude: number;
  best_months?: string;
  tags?: string;
  source_type: 'curated' | 'geographic_discovery';
  estimated_duration_days?: string;
  accessibility_notes?: string;
  directions_url?: string;
  attractions_count: number;
}

export interface ExploreIndiaCatalog {
  destinations: NationwideDestination[];
  available_states: string[];
  available_regions: string[];
  available_categories: string[];
  total_count: number;
}

export interface SeasonalInsight {
  destination_id: number;
  destination_name: string;
  state: string;
  month: string;
  predicted_demand: number;
  crowd_level: string;
  season_type: string;
  distance_km?: number;
  events: Array<{
    name: string;
    month: string;
    description?: string;
    impact_on_crowd: string;
  }>;
}
