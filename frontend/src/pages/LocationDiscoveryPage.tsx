import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  MapPin,
  Navigation,
  Compass,
  List,
  Map as MapIcon,
  Columns,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import api from '../api/client';
import { ActiveLocation, NearbyPlace, PlaceCandidate } from '../types';
import { DiscoveryMap } from '../components/DiscoveryMap';

const CATEGORIES = [
  { id: 'all', label: 'All Places' },
  { id: 'attractions', label: 'Attractions' },
  { id: 'temples', label: 'Temples' },
  { id: 'monuments', label: 'Monuments' },
  { id: 'parks', label: 'Parks' },
  { id: 'museums', label: 'Museums' },
  { id: 'viewpoints', label: 'Viewpoints' },
  { id: 'activities', label: 'Activities' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'accommodation', label: 'Accommodation' },
];

const RADIUS_OPTIONS = [2, 5, 10, 25, 50];
const QUICK_CITIES = ['Vijayawada', 'Hyderabad', 'Bengaluru', 'Jaipur', 'Visakhapatnam'];

interface LocationDiscoveryPageProps {
  activeLocation: ActiveLocation;
  onLocationChange: (loc: ActiveLocation) => void;
  addedPlaces: NearbyPlace[];
  onToggleAddPlace: (place: NearbyPlace) => void;
  onOpenPlaceDetail: (place: NearbyPlace) => void;
  onPlanTripFromLocation: () => void;
}

export const LocationDiscoveryPage: React.FC<LocationDiscoveryPageProps> = ({
  activeLocation,
  onLocationChange,
  addedPlaces,
  onToggleAddPlace,
  onOpenPlaceDetail,
  onPlanTripFromLocation,
}) => {
  const [query, setQuery] = useState(activeLocation.name);
  const [suggestions, setSuggestions] = useState<PlaceCandidate[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [acLoading, setAcLoading] = useState(false);

  const [category, setCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>('split');

  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [total, setTotal] = useState(0);
  const [providerName, setProviderName] = useState('OpenStreetMap (Nominatim + Overpass)');
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addedIds = useMemo(() => new Set(addedPlaces.map((p) => p.place_id)), [addedPlaces]);

  // Sync input when activeLocation changes externally
  useEffect(() => {
    setQuery(activeLocation.name);
  }, [activeLocation.name]);

  // Debounced autocomplete
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || trimmed.toLowerCase() === activeLocation.name.toLowerCase()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      setAcLoading(true);
      api
        .get<PlaceCandidate[]>('/locations/autocomplete', { params: { q: trimmed, limit: 6 } })
        .then((res) => {
          setSuggestions(res.data || []);
          setShowDropdown(true);
        })
        .catch(() => {
          setSuggestions([]);
        })
        .finally(() => setAcLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query, activeLocation.name]);

  // Fetch nearby places whenever active location, radius, or category changes
  const fetchNearby = async (offsetVal = 0, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoadingPlaces(true);
    }
    setErrorMsg(null);
    try {
      const res = await api.get('/locations/nearby', {
        params: {
          lat: activeLocation.lat,
          lng: activeLocation.lng,
          radius_km: activeLocation.radius_km,
          category,
          limit: 30,
          offset: offsetVal,
        },
      });
      const data = res.data;
      setTotal(data.total || 0);
      setProviderName(data.provider || 'OpenStreetMap');
      setPlaces((prev) => (append ? [...prev, ...(data.places || [])] : data.places || []));
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Failed to load nearby places. Please retry.';
      setErrorMsg(detail);
      if (!append) {
        setPlaces([]);
        setTotal(0);
      }
    } finally {
      setLoadingPlaces(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNearby(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLocation.lat, activeLocation.lng, activeLocation.radius_km, category]);

  const selectCandidate = (cand: PlaceCandidate) => {
    setShowDropdown(false);
    setSuggestions([]);
    setQuery(cand.name);
    onLocationChange({
      name: cand.name,
      display_name: cand.display_name,
      lat: cand.lat,
      lng: cand.lng,
      boundingbox: cand.boundingbox,
      radius_km: activeLocation.radius_km,
    });
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setShowDropdown(false);
    setErrorMsg(null);
    try {
      const res = await api.get<PlaceCandidate>('/locations/resolve', { params: { q: trimmed } });
      selectCandidate(res.data);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || `Could not resolve "${trimmed}".`);
    }
  };

  const handleQuickCity = async (city: string) => {
    setQuery(city);
    setShowDropdown(false);
    setErrorMsg(null);
    try {
      const res = await api.get<PlaceCandidate>('/locations/resolve', { params: { q: city } });
      selectCandidate(res.data);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || `Could not resolve "${city}".`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-6 px-4">
      {/* Search & Active Location Header */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Compass className="w-4 h-4" /> Real-Time Geographic Discovery
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Explore Places Around Any City or Landmark
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Powered by {providerName} • Selected location controls your active trip origin & recommendations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-300">
              Trip Basket: <strong className="text-amber-400">{addedPlaces.length}</strong> places added
            </div>
            <button
              onClick={onPlanTripFromLocation}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Sparkles className="w-4 h-4" />
              Plan Trip from {activeLocation.name}
            </button>
          </div>
        </div>

        {/* Autocomplete Search Bar */}
        <form onSubmit={handleResolveSubmit} className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                placeholder="Search a city, town, or landmark (e.g. Vijayawada, Hyderabad, Bengaluru, Jaipur)..."
                className="w-full bg-gray-950 border border-gray-700 rounded-2xl pl-11 pr-10 py-3.5 text-sm text-white focus:outline-none focus:border-amber-500 font-medium"
              />
              {acLoading && (
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin absolute right-4 top-1/2 -translate-y-1/2" />
              )}
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shrink-0"
            >
              Search Location
            </button>
          </div>

          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-2 bg-gray-950 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
              {suggestions.map((cand) => (
                <button
                  key={cand.place_id}
                  type="button"
                  onClick={() => selectCandidate(cand)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-900 border-b border-gray-800/70 last:border-b-0 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-bold text-white">{cand.name}</div>
                    <div className="text-xs text-gray-400 line-clamp-1">{cand.display_name}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-gray-800 text-[10px] font-semibold text-amber-400 uppercase shrink-0">
                    {cand.place_type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Quick Cities + Active Coordinate Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase">Quick Cities:</span>
            {QUICK_CITIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleQuickCity(c)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  activeLocation.name.toLowerCase() === c.toLowerCase()
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="text-xs text-emerald-400 flex flex-wrap items-center gap-2 font-mono">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>
              Center: {activeLocation.name} ({activeLocation.lat.toFixed(4)}°N, {activeLocation.lng.toFixed(4)}°E)
            </span>
            {activeLocation.boundingbox && activeLocation.boundingbox.length === 4 && (
              <span className="text-gray-400">
                • Bounds [{activeLocation.boundingbox[0].toFixed(2)}, {activeLocation.boundingbox[2].toFixed(2)}] → [
                {activeLocation.boundingbox[1].toFixed(2)}, {activeLocation.boundingbox[3].toFixed(2)}]
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls Bar: Radius, Category Chips, View Toggle */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Radius Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase mr-1">Radius:</span>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => onLocationChange({ ...activeLocation, radius_km: r })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeLocation.radius_km === r
                    ? 'bg-amber-500 text-black'
                    : 'bg-gray-950 text-gray-400 border border-gray-800 hover:text-white'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                viewMode === 'split' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" /> Split
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                viewMode === 'map' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Map
            </button>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-800">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                category === cat.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'bg-gray-950 text-gray-400 border border-gray-800 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => fetchNearby(0, false)}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 font-bold shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Results: List + Map */}
      {loadingPlaces ? (
        <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <p className="text-sm font-semibold text-white">
            Querying real places within {activeLocation.radius_km} km of {activeLocation.name}...
          </p>
        </div>
      ) : (
        <div className={`grid gap-6 ${viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
          {/* List Column */}
          {viewMode !== 'map' && (
            <div className={`${viewMode === 'split' ? 'lg:col-span-6' : ''} space-y-3`}>
              <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                <span>
                  Showing <strong className="text-white">{places.length}</strong> of{' '}
                  <strong className="text-white">{total}</strong> places within{' '}
                  <strong className="text-amber-400">{activeLocation.radius_km} km</strong>
                </span>
              </div>

              {places.length === 0 ? (
                <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-8 text-center space-y-3">
                  <p className="text-sm font-bold text-white">
                    No places found in "{CATEGORIES.find((c) => c.id === category)?.label}" within{' '}
                    {activeLocation.radius_km} km of {activeLocation.name}.
                  </p>
                  <p className="text-xs text-gray-400">
                    Try expanding the search radius or switching category to All Places.
                  </p>
                  <div className="flex justify-center gap-2 pt-1">
                    {activeLocation.radius_km < 25 && (
                      <button
                        onClick={() => onLocationChange({ ...activeLocation, radius_km: 25 })}
                        className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold"
                      >
                        Expand to 25 km
                      </button>
                    )}
                    {category !== 'all' && (
                      <button
                        onClick={() => setCategory('all')}
                        className="px-4 py-2 rounded-xl bg-gray-800 text-white text-xs font-bold"
                      >
                        Show All Categories
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {places.map((place, idx) => {
                    const isAdded = addedIds.has(place.place_id);
                    return (
                      <div
                        key={place.place_id}
                        className="bg-gray-900/90 border border-gray-800 hover:border-amber-500/40 rounded-2xl p-4 transition-all space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                                #{idx + 1}
                              </span>
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">
                                {place.subcategory}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                <Navigation className="w-3 h-3" /> {place.distance_km} km
                              </span>
                            </div>
                            <h3
                              onClick={() => onOpenPlaceDetail(place)}
                              className="text-base font-bold text-white hover:text-amber-400 cursor-pointer"
                            >
                              {place.name}
                            </h3>
                          </div>

                          <button
                            onClick={() => onToggleAddPlace(place)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-all ${
                              isAdded
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-amber-500 hover:bg-amber-400 text-black'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Added
                              </>
                            ) : (
                              <>
                                <PlusCircle className="w-3.5 h-3.5" /> Add to Trip
                              </>
                            )}
                          </button>
                        </div>

                        {place.address && (
                          <p className="text-xs text-gray-400 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            {place.address}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="text-gray-500 flex items-center gap-1">
                            {place.opening_hours ? (
                              <>
                                <Clock className="w-3 h-3 text-amber-400" /> {place.opening_hours}
                              </>
                            ) : (
                              <span>
                                {place.lat.toFixed(4)}°N, {place.lng.toFixed(4)}°E
                              </span>
                            )}
                          </span>

                          <button
                            onClick={() => onOpenPlaceDetail(place)}
                            className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                          >
                            Details <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {places.length < total && (
                    <button
                      onClick={() => fetchNearby(places.length, true)}
                      disabled={loadingMore}
                      className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-xs font-bold text-amber-400"
                    >
                      {loadingMore ? 'Loading more places...' : `Load More (${total - places.length} remaining)`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Map Column */}
          {viewMode !== 'list' && (
            <div className={viewMode === 'split' ? 'lg:col-span-6' : ''}>
              <DiscoveryMap
                centerLat={activeLocation.lat}
                centerLng={activeLocation.lng}
                centerName={activeLocation.name}
                radiusKm={activeLocation.radius_km}
                places={places}
                addedPlaceIds={addedIds}
                onSelectPlace={onOpenPlaceDetail}
                onToggleAddPlace={onToggleAddPlace}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
