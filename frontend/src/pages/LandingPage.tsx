import React, { useEffect, useMemo, useState } from 'react';
import {
  Compass,
  Sparkles,
  MapPin,
  Calendar,
  Wallet,
  ArrowRight,
  Search,
  Users,
  Train,
  BedDouble,
  Gem,
  CalendarClock,
  Globe2,
  Bookmark,
  History,
  Loader2,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ActiveLocation,
  Destination,
  FullTripPlan,
  HiddenGem,
  NearbyPlace,
  PlaceCandidate,
  SeasonalInsight,
  TripRequirement,
} from '../types';
import { DiscoveryMap } from '../components/DiscoveryMap';

interface LandingPageProps {
  activeLocation: ActiveLocation;
  onLocationChange: (loc: ActiveLocation) => void;
  initialRequirement: TripRequirement;
  onPlanTrip: (req: TripRequirement) => void;
  onSelectDestination: (destId: number) => void;
  onOpenPlacesDiscovery: () => void;
  onOpenPlaceDetail: (place: NearbyPlace) => void;
  addedPlaces: NearbyPlace[];
  onToggleAddPlace: (place: NearbyPlace) => void;
  recentlyViewed: Destination[];
  onSelectSavedTrip: (plan: FullTripPlan) => void;
  onOpenAuth: () => void;
  onNavigateToExplore?: () => void;
}

const INTEREST_OPTIONS = [
  'Nature',
  'Culture',
  'History',
  'Food',
  'Waterfalls',
  'Spiritual',
  'Beach',
  'Trekking',
];

const QUICK_CITIES = ['Vijayawada', 'Hyderabad', 'Bengaluru', 'Jaipur'];

const CURRENCY_RATES_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 84,
  EUR: 91,
};

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function diffDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const ms = e.getTime() - s.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  activeLocation,
  onLocationChange,
  initialRequirement,
  onPlanTrip,
  onSelectDestination,
  onOpenPlacesDiscovery,
  onOpenPlaceDetail,
  addedPlaces,
  onToggleAddPlace,
  recentlyViewed,
  onSelectSavedTrip,
  onOpenAuth,
  onNavigateToExplore,
}) => {
  const { isAuthenticated, user } = useAuth();

  // Destination search & autocomplete
  const [destQuery, setDestQuery] = useState(activeLocation.name);
  const [suggestions, setSuggestions] = useState<PlaceCandidate[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [acLoading, setAcLoading] = useState(false);

  // Full trip planning form state
  const [startDate, setStartDate] = useState(initialRequirement.start_date || todayISO(7));
  const [endDate, setEndDate] = useState(initialRequirement.end_date || todayISO(10));
  const [travelers, setTravelers] = useState(initialRequirement.travelers || 2);
  const [budget, setBudget] = useState(initialRequirement.budget || 25000);
  const [currency, setCurrency] = useState(initialRequirement.currency || 'INR');
  const [travelStyle, setTravelStyle] = useState(initialRequirement.travel_style || 'Balanced');
  const [preferredTransport, setPreferredTransport] = useState(
    initialRequirement.preferred_transport || 'Train / Bus'
  );
  const [accommodationPref, setAccommodationPref] = useState(
    initialRequirement.accommodation_preference || '3-Star Hotel'
  );
  const [crowdPreference, setCrowdPreference] = useState(
    initialRequirement.crowd_preference || 'Prefer Less Crowded'
  );
  const [interests, setInterests] = useState<string[]>(
    initialRequirement.interests || ['Nature', 'Culture']
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // Live data sections
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  const [hiddenGems, setHiddenGems] = useState<HiddenGem[]>([]);
  const [insights, setInsights] = useState<SeasonalInsight[]>([]);
  const [indiaDestinations, setIndiaDestinations] = useState<Destination[]>([]);
  const [indiaCategory, setIndiaCategory] = useState('All');
  const [savedTrips, setSavedTrips] = useState<FullTripPlan[]>([]);

  const addedIds = useMemo(() => new Set(addedPlaces.map((p) => p.place_id)), [addedPlaces]);

  const computedDays = useMemo(() => {
    if (!startDate || !endDate) return initialRequirement.duration_days || 4;
    return diffDays(startDate, endDate);
  }, [startDate, endDate, initialRequirement.duration_days]);

  const travelMonth = useMemo(() => {
    if (!startDate) return new Date().getMonth() + 1;
    const m = new Date(startDate).getMonth() + 1;
    return Number.isNaN(m) ? new Date().getMonth() + 1 : m;
  }, [startDate]);

  useEffect(() => {
    setDestQuery(activeLocation.name);
  }, [activeLocation.name]);

  // Autocomplete
  useEffect(() => {
    const trimmed = destQuery.trim();
    if (trimmed.length < 2 || trimmed.toLowerCase() === activeLocation.name.toLowerCase()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      setAcLoading(true);
      api
        .get<PlaceCandidate[]>('/locations/autocomplete', { params: { q: trimmed, limit: 5 } })
        .then((res) => {
          setSuggestions(res.data || []);
          setShowDropdown(true);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setAcLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [destQuery, activeLocation.name]);

  // Nearby places + Map preview (only around activeLocation)
  useEffect(() => {
    setLoadingNearby(true);
    setNearbyError(null);
    api
      .get('/locations/nearby', {
        params: {
          lat: activeLocation.lat,
          lng: activeLocation.lng,
          radius_km: Math.min(activeLocation.radius_km || 10, 25),
          category: 'all',
          limit: 8,
        },
      })
      .then((res) => setNearbyPlaces(res.data?.places || []))
      .catch((err) => {
        setNearbyError(err?.response?.data?.detail || 'Could not load nearby places right now.');
        setNearbyPlaces([]);
      })
      .finally(() => setLoadingNearby(false));
  }, [activeLocation.lat, activeLocation.lng, activeLocation.radius_km]);

  // Hidden Gems (scoped to 150km of selected location if any exist nearby, else nationwide curated gems)
  useEffect(() => {
    api
      .get<HiddenGem[]>('/destinations/hidden-gems', {
        params: { lat: activeLocation.lat, lng: activeLocation.lng, radius_km: 150 },
      })
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setHiddenGems(res.data.slice(0, 4));
        } else {
          api.get<HiddenGem[]>('/destinations/hidden-gems').then((r2) => setHiddenGems((r2.data || []).slice(0, 4)));
        }
      })
      .catch(() => setHiddenGems([]));
  }, [activeLocation.lat, activeLocation.lng]);

  // Seasonal & Event Insights
  useEffect(() => {
    api
      .get<SeasonalInsight[]>('/destinations/insights', {
        params: { month: travelMonth },
      })
      .then((res) => setInsights((res.data || []).slice(0, 4)))
      .catch(() => setInsights([]));
  }, [travelMonth]);

  // Explore India (real DB destinations)
  useEffect(() => {
    api
      .get<Destination[]>('/destinations')
      .then((res) => setIndiaDestinations(res.data || []))
      .catch(() => setIndiaDestinations([]));
  }, []);

  // Saved trips for logged-in user
  useEffect(() => {
    if (!isAuthenticated) {
      setSavedTrips([]);
      return;
    }
    api
      .get<FullTripPlan[]>('/trips')
      .then((res) => setSavedTrips((res.data || []).slice(0, 3)))
      .catch(() => setSavedTrips([]));
  }, [isAuthenticated]);

  const selectCandidate = (cand: PlaceCandidate) => {
    setShowDropdown(false);
    setSuggestions([]);
    setDestQuery(cand.name);
    setValidationError(null);
    onLocationChange({
      name: cand.name,
      display_name: cand.display_name,
      lat: cand.lat,
      lng: cand.lng,
      boundingbox: cand.boundingbox,
      radius_km: activeLocation.radius_km || 10,
    });
  };

  const handleQuickCity = async (city: string) => {
    setDestQuery(city);
    setShowDropdown(false);
    try {
      const res = await api.get<PlaceCandidate>('/locations/resolve', { params: { q: city } });
      selectCandidate(res.data);
    } catch {
      // ignore
    }
  };

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedOrigin = destQuery.trim();
    if (trimmedOrigin.length < 2) {
      setValidationError('Please enter a valid destination or starting city.');
      return;
    }
    if (!startDate || !endDate) {
      setValidationError('Please select both start and end dates.');
      return;
    }
    if (computedDays < 1 || computedDays > 14) {
      setValidationError('Trip duration must be between 1 and 14 days (check your start and end dates).');
      return;
    }
    if (travelers < 1 || travelers > 10) {
      setValidationError('Number of travelers must be between 1 and 10.');
      return;
    }
    if (!budget || budget < 1000) {
      setValidationError('Please enter a realistic total budget (minimum 1,000).');
      return;
    }
    if (interests.length === 0) {
      setValidationError('Select at least one travel interest.');
      return;
    }

    // Resolve location if typed manually without clicking dropdown
    if (trimmedOrigin.toLowerCase() !== activeLocation.name.toLowerCase()) {
      try {
        const res = await api.get<PlaceCandidate>('/locations/resolve', { params: { q: trimmedOrigin } });
        selectCandidate(res.data);
      } catch {
        // Proceed with typed origin name if Nominatim cannot resolve
      }
    }

    const budgetInr = Math.round(budget * (CURRENCY_RATES_TO_INR[currency] || 1));

    onPlanTrip({
      origin: trimmedOrigin,
      budget: budgetInr,
      duration_days: computedDays,
      travelers,
      interests,
      crowd_preference: crowdPreference,
      travel_style: travelStyle,
      travel_month: travelMonth,
      radius_km: 100,
      start_date: startDate,
      end_date: endDate,
      currency,
      preferred_transport: preferredTransport,
      accommodation_preference: accommodationPref,
    });
  };

  const filteredIndia = useMemo(() => {
    if (indiaCategory === 'All') return indiaDestinations;
    return indiaDestinations.filter((d) => d.category === indiaCategory);
  }, [indiaDestinations, indiaCategory]);

  return (
    <div className="space-y-16 pb-16">
      {/* 1. HERO + COMPLETE TRIP PLANNER */}
      <section className="max-w-7xl mx-auto px-4 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Editorial Intro */}
          <div className="lg:col-span-5 space-y-6 pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              S.A.F.A.R. Location-Aware Travel Intelligence
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.1]">
              Plan smarter trips,{' '}
              <span className="text-amber-400">grounded in real geography.</span>
            </h1>

            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              Search any city or landmark, discover nearby attractions, compare seasonal crowd levels, and build a budget-accurate itinerary tailored to your dates, transport, and stay style.
            </p>

            {/* Quick Cities */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Active Search Center
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {QUICK_CITIES.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleQuickCity(city)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      activeLocation.name.toLowerCase() === city.toLowerCase()
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-700'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
              <p className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 pt-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {activeLocation.name} ({activeLocation.lat.toFixed(4)}°N, {activeLocation.lng.toFixed(4)}°E)
              </p>
            </div>
          </div>

          {/* Right Complete Trip Planning Form */}
          <form
            onSubmit={handlePlanSubmit}
            className="lg:col-span-7 bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-400" />
                Configure Your Trip
              </h2>
              <span className="text-xs text-gray-400 font-mono">
                {computedDays > 0 ? `${computedDays} Days` : 'Select dates'} • {travelers} Travelers
              </span>
            </div>

            {validationError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                {validationError}
              </div>
            )}

            {/* Destination Autocomplete */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Destination / Starting City
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={destQuery}
                  onChange={(e) => setDestQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                  placeholder="Enter a city, town, or landmark (e.g. Vijayawada, Hyderabad, Jaipur)..."
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl pl-10 pr-10 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
                />
                {acLoading && (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                  {suggestions.map((cand) => (
                    <button
                      key={cand.place_id}
                      type="button"
                      onClick={() => selectCandidate(cand)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-900 border-b border-gray-800/70 last:border-b-0 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{cand.name}</div>
                        <div className="text-[11px] text-gray-400 line-clamp-1">{cand.display_name}</div>
                      </div>
                      <span className="text-[10px] uppercase text-amber-400 font-semibold shrink-0">
                        {cand.place_type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dates & Travelers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" /> Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" /> End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-400" /> Travelers
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={travelers}
                  onChange={(e) => setTravelers(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Budget + Currency + Travel Style */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-amber-400" /> Total Budget
                </label>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Travel Style</label>
                <select
                  value={travelStyle}
                  onChange={(e) => setTravelStyle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Budget">Budget</option>
                  <option value="Balanced">Balanced</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
            </div>

            {/* Transport + Accommodation + Crowd */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1">
                  <Train className="w-3.5 h-3.5 text-amber-400" /> Preferred Transport
                </label>
                <select
                  value={preferredTransport}
                  onChange={(e) => setPreferredTransport(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Train / Bus">Train / Bus</option>
                  <option value="Flight">Flight</option>
                  <option value="Car / Road">Car / Road</option>
                  <option value="Local Transit">Local Transit</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5 text-amber-400" /> Accommodation
                </label>
                <select
                  value={accommodationPref}
                  onChange={(e) => setAccommodationPref(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Hostel / Budget">Hostel / Budget</option>
                  <option value="3-Star Hotel">3-Star Hotel</option>
                  <option value="Boutique / Homestay">Boutique / Homestay</option>
                  <option value="Luxury Resort">Luxury Resort</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Crowd Preference</label>
                <select
                  value={crowdPreference}
                  onChange={(e) => setCrowdPreference(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Prefer Less Crowded">Prefer Less Crowded</option>
                  <option value="Off-Peak Seeker">Off-Peak Seeker</option>
                  <option value="Don't Mind Crowds">Don't Mind Crowds</option>
                </select>
              </div>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                Interests & Activities
              </label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((item) => {
                  const selected = interests.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleInterest(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        selected
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Plan My Trip ({computedDays > 0 ? `${computedDays} Days` : 'Custom'})
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* 2. NEARBY DISCOVERY & MAP PREVIEW FOR SELECTED LOCATION */}
      <section className="max-w-7xl mx-auto px-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" /> Nearby Around {activeLocation.name}
            </div>
            <h2 className="text-2xl font-black text-white mt-1">
              Attractions, Temples, Food & Stays Near {activeLocation.name}
            </h2>
          </div>
          <button
            onClick={onOpenPlacesDiscovery}
            className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1"
          >
            Open Full Map & Filters <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loadingNearby ? (
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-10 flex items-center justify-center gap-3 text-xs text-gray-300">
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            Discovering real places around {activeLocation.name}...
          </div>
        ) : nearbyError ? (
          <div className="bg-gray-900/60 border border-red-500/30 rounded-2xl p-6 text-xs text-red-300">
            {nearbyError}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-3">
              {nearbyPlaces.length === 0 ? (
                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8 text-center text-xs text-gray-400">
                  No places found within {activeLocation.radius_km} km of {activeLocation.name}. Open full discovery to adjust radius.
                </div>
              ) : (
                nearbyPlaces.slice(0, 5).map((place) => {
                  const isAdded = addedIds.has(place.place_id);
                  return (
                    <div
                      key={place.place_id}
                      className="bg-gray-900/90 border border-gray-800 hover:border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold uppercase">
                            {place.subcategory}
                          </span>
                          <span className="text-emerald-400 font-semibold">{place.distance_km} km</span>
                        </div>
                        <h3
                          onClick={() => onOpenPlaceDetail(place)}
                          className="text-sm font-bold text-white hover:text-amber-400 cursor-pointer truncate"
                        >
                          {place.name}
                        </h3>
                        {place.address && (
                          <p className="text-xs text-gray-400 truncate">{place.address}</p>
                        )}
                      </div>
                      <button
                        onClick={() => onToggleAddPlace(place)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 ${
                          isAdded
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500 hover:bg-amber-400 text-black'
                        }`}
                      >
                        {isAdded ? <CheckCircle2 className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
                        {isAdded ? 'Added' : 'Add'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-6">
              <DiscoveryMap
                centerLat={activeLocation.lat}
                centerLng={activeLocation.lng}
                centerName={activeLocation.name}
                radiusKm={Math.min(activeLocation.radius_km || 10, 25)}
                places={nearbyPlaces}
                addedPlaceIds={addedIds}
                onSelectPlace={onOpenPlaceDetail}
                onToggleAddPlace={onToggleAddPlace}
              />
            </div>
          </div>
        )}
      </section>

      {/* 3. HIDDEN GEMS & SEASONAL INSIGHTS */}
      <section className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Hidden Gems */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Gem className="w-3.5 h-3.5" /> Curated Lesser-Known Places
            </div>
            <h2 className="text-2xl font-black text-white mt-1">Hidden Gems</h2>
            <p className="text-xs text-gray-400">
              Selected by lower crowd footprint (popularity ≤ 4.7/5), modest entry fees, and local cultural significance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {hiddenGems.map((gem) => (
              <div
                key={gem.id}
                onClick={() => onSelectDestination(gem.destination_id)}
                className="bg-gray-900 border border-gray-800 hover:border-purple-500/40 rounded-2xl overflow-hidden cursor-pointer transition-all"
              >
                <div className="h-32 relative overflow-hidden">
                  <img
                    src={gem.image_url || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop'}
                    alt={gem.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-purple-300 text-[10px] font-bold">
                    {gem.destination_name} • ★ {gem.popularity_score}
                  </div>
                </div>
                <div className="p-4 space-y-1.5">
                  <h3 className="text-sm font-bold text-white">{gem.name}</h3>
                  <p className="text-[11px] text-purple-300">{gem.gem_reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Seasonal & Event Insights */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" /> Real Demand & Event Data
            </div>
            <h2 className="text-2xl font-black text-white mt-1">Seasonal Travel Insights</h2>
            <p className="text-xs text-gray-400">
              Forecasted crowd levels and local cultural events for your selected travel month.
            </p>
          </div>

          <div className="space-y-3">
            {insights.map((ins) => (
              <div
                key={ins.destination_id}
                onClick={() => onSelectDestination(ins.destination_id)}
                className="bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-2xl p-4 cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {ins.destination_name}, <span className="text-gray-400 font-normal">{ins.state}</span>
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      {ins.month} • Est. {ins.predicted_demand.toLocaleString()} visitors ({ins.season_type})
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      ins.crowd_level === 'LOW'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : ins.crowd_level === 'MODERATE'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {ins.crowd_level} CROWD
                  </span>
                </div>
                {ins.events.length > 0 && (
                  <div className="text-[11px] text-amber-300 bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800">
                    Festival / Event: <strong>{ins.events[0].name}</strong> ({ins.events[0].month})
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. RECENTLY VIEWED & SAVED TRIPS */}
      {(recentlyViewed.length > 0 || isAuthenticated) && (
        <section className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {recentlyViewed.length > 0 && (
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" /> Recently Viewed Destinations
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentlyViewed.slice(0, 4).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onSelectDestination(d.id)}
                    className="text-left p-3 rounded-xl bg-gray-950 border border-gray-800 hover:border-amber-500/40 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{d.name}</div>
                      <div className="text-[11px] text-gray-400">{d.state}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-400" />
              {isAuthenticated ? `Saved Trips (${user?.full_name})` : 'Your Saved Trips'}
            </h3>
            {!isAuthenticated ? (
              <div className="flex items-center justify-between gap-4 bg-gray-950 p-4 rounded-xl border border-gray-800">
                <p className="text-xs text-gray-400">
                  Browse freely as a guest, or sign in to save and manage your personalized trip plans.
                </p>
                <button
                  onClick={onOpenAuth}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold shrink-0"
                >
                  Sign In
                </button>
              </div>
            ) : savedTrips.length === 0 ? (
              <p className="text-xs text-gray-400">
                No saved trips yet. Plan a trip above and click "Save Trip Plan" to store it in your account.
              </p>
            ) : (
              <div className="space-y-2.5">
                {savedTrips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => onSelectSavedTrip(trip)}
                    className="w-full text-left p-3 rounded-xl bg-gray-950 border border-gray-800 hover:border-amber-500/40 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{trip.title}</div>
                      <div className="text-[11px] text-gray-400">
                        From {trip.origin} • ₹{trip.estimated_cost.toLocaleString()}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. SEPARATE EXPLORE INDIA SECTION (NATIONWIDE DISCOVERY) */}
      <section className="max-w-7xl mx-auto px-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5" /> Nationwide Discovery
            </div>
            <h2 className="text-2xl font-black text-white mt-1">Explore India</h2>
            <p className="text-xs text-gray-400">
              Browse all curated destinations across Indian states, independent of your local city search.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Nature', 'Culture', 'Beach'].map((cat) => (
              <button
                key={cat}
                onClick={() => setIndiaCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  indiaCategory === cat
                    ? 'bg-amber-500 text-black'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
            {onNavigateToExplore && (
              <button
                onClick={onNavigateToExplore}
                className="px-3.5 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold hover:bg-blue-500/30 transition-all flex items-center gap-1 shrink-0 ml-1"
              >
                Full India Explorer →
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIndia.map((dest) => (
            <div
              key={dest.id}
              onClick={() => onSelectDestination(dest.id)}
              className="group bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 cursor-pointer hover:border-amber-500/50 transition-all"
            >
              <div className="h-44 overflow-hidden relative">
                <img
                  src={dest.image_url}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-black/70 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                  {dest.category}
                </div>
                <div className="absolute top-3 right-3 bg-black/70 text-white text-[11px] font-bold px-2 py-1 rounded-lg">
                  ★ {dest.rating}
                </div>
              </div>
              <div className="p-4 space-y-1.5">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-base text-white group-hover:text-amber-400 transition-colors">
                    {dest.name}
                  </h3>
                  <span className="text-xs font-semibold text-emerald-400">
                    ₹{dest.base_daily_cost.toLocaleString()}/day
                  </span>
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> {dest.region}, {dest.state}
                </p>
                <p className="text-xs text-gray-500 line-clamp-2 pt-1">{dest.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
