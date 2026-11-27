import React, { useEffect, useState, useMemo } from 'react';
import api from '../api/client';
import { NationwideDestination, HiddenGem, ExploreIndiaCatalog, ActiveLocation, Destination } from '../types';
import { IndiaDestinationMap } from '../components/IndiaDestinationMap';
import { LoadingScreen } from '../components/LoadingScreen';
import {
  Search, Globe, MapPin, Compass, Sparkles, Gem, SlidersHorizontal,
  ArrowRight, ShieldCheck, Calendar, DollarSign, Filter, RefreshCw,
  ExternalLink, Layers, CheckCircle2, ChevronRight, Info
} from 'lucide-react';

interface ExploreIndiaPageProps {
  onSelectDestination: (destId: number) => void;
  onExploreNearby: (loc: ActiveLocation) => void;
  onPlanTrip: (destName: string, stateName: string, lat: number, lng: number) => void;
}

const REGIONS = [
  'All India',
  'South India',
  'North India',
  'West India',
  'East India',
  'North-East India',
  'Central India',
];

const CATEGORIES = [
  'All',
  'Culture',
  'Nature',
  'Spiritual',
  'Beach',
  'Hill Station',
  'Adventure',
];

const SEASONS = [
  { label: 'All Seasons', value: 'All' },
  { label: 'Winter (Oct - Feb)', value: 'Winter' },
  { label: 'Monsoon (Jul - Sep)', value: 'Monsoon' },
  { label: 'Summer (Mar - Jun)', value: 'Summer' },
];

export const ExploreIndiaPage: React.FC<ExploreIndiaPageProps> = ({
  onSelectDestination,
  onExploreNearby,
  onPlanTrip,
}) => {
  const [activeMode, setActiveMode] = useState<'DESTINATIONS' | 'HIDDEN_GEMS'>('DESTINATIONS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All India');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSeason, setSelectedSeason] = useState('All');
  const [maxBudget, setMaxBudget] = useState<number | null>(null);

  const [catalog, setCatalog] = useState<ExploreIndiaCatalog | null>(null);
  const [hiddenGems, setHiddenGems] = useState<HiddenGem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [viewLayout, setViewLayout] = useState<'GRID' | 'SPLIT_MAP'>('GRID');
  const [selectedDestForMap, setSelectedDestForMap] = useState<NationwideDestination | null>(null);

  // Fetch initial catalog
  useEffect(() => {
    fetchCatalog();
    fetchHiddenGems();
  }, []);

  // Debounced search / filter trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalog();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedRegion, selectedState, selectedCategory, selectedSeason, maxBudget]);

  const fetchCatalog = async () => {
    setIsSearching(true);
    try {
      const params: Record<string, any> = {
        limit: 60,
        include_live_geo: true,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedRegion !== 'All India') params.region = selectedRegion;
      if (selectedState !== 'All') params.state = selectedState;
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedSeason !== 'All') params.season = selectedSeason;
      if (maxBudget) params.max_daily_budget = maxBudget;

      const resp = await api.get('/destinations/explore-india', { params });
      setCatalog(resp.data);
    } catch (err) {
      console.error('Failed to fetch Explore India catalog:', err);
    } finally {
      setIsSearching(false);
      setLoading(false);
    }
  };

  const fetchHiddenGems = async () => {
    try {
      const resp = await api.get('/destinations/hidden-gems-catalog');
      setHiddenGems(resp.data);
    } catch (err) {
      console.error('Failed to fetch hidden gems catalog:', err);
    }
  };

  const handleDestinationNearbyClick = (dest: NationwideDestination) => {
    onExploreNearby({
      name: dest.name,
      display_name: `${dest.name}, ${dest.state}, India`,
      lat: dest.latitude,
      lng: dest.longitude,
      radius_km: 15,
    });
  };

  const handleDestinationPlanClick = (dest: NationwideDestination) => {
    onPlanTrip(dest.name, dest.state, dest.latitude, dest.longitude);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedRegion('All India');
    setSelectedState('All');
    setSelectedCategory('All');
    setSelectedSeason('All');
    setMaxBudget(null);
  };

  if (loading) {
    return <LoadingScreen messageOverride="Traversing nationwide destinations across India..." />;
  }

  const destinations = catalog?.destinations || [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-6 px-4">
      {/* Hero Header & Mode Switcher */}
      <div className="bg-gradient-to-r from-blue-950/40 via-gray-900 to-amber-950/30 p-6 sm:p-10 rounded-3xl border border-gray-800 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-black tracking-wider flex items-center gap-1.5 uppercase">
                <Globe className="w-3.5 h-3.5" /> Nationwide Geographic Exploration
              </span>
              <span className="text-xs text-gray-400">• Intentionally separated from local nearby searches</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Explore India
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
              Discover iconic destinations, Himalayan hill sanctuaries, coastal heritage, and lesser-known gems across Indian states. 
              Search any city, state, or landmark nationwide with live geographic intelligence.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="bg-gray-950 p-1.5 rounded-2xl border border-gray-800 flex items-center self-start md:self-center shrink-0">
            <button
              onClick={() => setActiveMode('DESTINATIONS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeMode === 'DESTINATIONS'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4" /> All Destinations ({destinations.length})
            </button>
            <button
              onClick={() => setActiveMode('HIDDEN_GEMS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeMode === 'HIDDEN_GEMS'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Gem className="w-4 h-4" /> Hidden Gems ({hiddenGems.length})
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any Indian destination, state, or city (e.g., Jaipur, Varanasi, Munnar, Spiti, Meghalaya, Konark, Amritsar)..."
            className="w-full bg-gray-950/90 border border-gray-700/80 rounded-2xl pl-12 pr-10 py-3.5 text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-3.5 text-xs text-gray-400 hover:text-white bg-gray-800 px-2 py-0.5 rounded-md"
            >
              Clear
            </button>
          )}
        </div>

        {/* Region Browser Pills */}
        <div className="space-y-2 pt-1">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
            Browse Geographic Regions of India:
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {REGIONS.map((reg) => (
              <button
                key={reg}
                onClick={() => setSelectedRegion(reg)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedRegion === reg
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-gray-950/80 text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-white'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-gray-900/80 p-5 rounded-3xl border border-gray-800 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-wider">
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span>Refine Travel Criteria</span>
            {isSearching && (
              <span className="text-[10px] text-amber-400 flex items-center gap-1 font-normal lowercase">
                <RefreshCw className="w-3 h-3 animate-spin" /> querying live geography...
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Layout Toggle */}
            {activeMode === 'DESTINATIONS' && (
              <div className="flex items-center bg-gray-950 p-1 rounded-xl border border-gray-800 text-xs">
                <button
                  onClick={() => setViewLayout('GRID')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    viewLayout === 'GRID' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Cards Grid
                </button>
                <button
                  onClick={() => setViewLayout('SPLIT_MAP')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    viewLayout === 'SPLIT_MAP' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <MapPin className="w-3 h-3" /> Map + List
                </button>
              </div>
            )}

            <button
              onClick={resetFilters}
              className="text-xs text-gray-400 hover:text-amber-400 font-semibold underline underline-offset-4"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Filter Dropdowns / Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* State Filter */}
          <div>
            <label className="block text-gray-400 font-bold mb-1.5 uppercase text-[10px] tracking-wider">
              Indian State / UT
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Indian States</option>
              {catalog?.available_states.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-gray-400 font-bold mb-1.5 uppercase text-[10px] tracking-wider">
              Travel Theme / Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
              ))}
            </select>
          </div>

          {/* Season Filter */}
          <div>
            <label className="block text-gray-400 font-bold mb-1.5 uppercase text-[10px] tracking-wider">
              Ideal Travel Season
            </label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            >
              {SEASONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Budget Filter */}
          <div>
            <label className="block text-gray-400 font-bold mb-1.5 uppercase text-[10px] tracking-wider">
              Max Daily Budget
            </label>
            <select
              value={maxBudget || ''}
              onChange={(e) => setMaxBudget(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">Any Daily Budget</option>
              <option value="2000">Under ₹2,000 / day (Budget)</option>
              <option value="2800">Under ₹2,800 / day (Balanced)</option>
              <option value="4000">Under ₹4,000 / day (Premium)</option>
            </select>
          </div>
        </div>
      </div>

      {/* MODE 1: ALL DESTINATIONS DISCOVERY */}
      {activeMode === 'DESTINATIONS' && (
        <div className="space-y-6">
          {/* Top Result Count Header */}
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>
              Showing <strong className="text-white">{destinations.length}</strong> destinations across India
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                <span>Curated Editorial</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
                <span>OSM Geographic Discovery</span>
              </span>
            </div>
          </div>

          {/* Split Map View or Grid View */}
          {viewLayout === 'SPLIT_MAP' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Side: Destination Cards Scroll */}
              <div className="lg:col-span-6 space-y-4 max-h-[700px] overflow-y-auto pr-2 scrollbar-thin">
                {destinations.map((dest) => (
                  <div
                    key={`${dest.name}-${dest.latitude}`}
                    onClick={() => setSelectedDestForMap(dest)}
                    className="bg-gray-900 border border-gray-800 hover:border-amber-500/50 rounded-2xl p-4 transition-all space-y-3 cursor-pointer shadow-md"
                  >
                    <div className="flex gap-4">
                      <div className="w-28 h-24 rounded-xl overflow-hidden shrink-0 relative">
                        <img
                          src={dest.image_url}
                          alt={dest.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-black text-amber-300">
                          {dest.category}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-black text-base text-white truncate">{dest.name}</h3>
                          <span className="text-xs font-extrabold text-emerald-400">
                            ₹{dest.base_daily_cost.toLocaleString()}/day
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          {dest.region}, {dest.state}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">{dest.description}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-850 text-xs">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDestinationNearbyClick(dest); }}
                        className="px-3 py-1.5 rounded-lg bg-gray-950 border border-gray-800 hover:border-amber-500/40 text-gray-300 hover:text-white font-bold flex items-center gap-1"
                      >
                        <Compass className="w-3 h-3 text-amber-400" /> Nearby Places
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDestinationPlanClick(dest); }}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold shadow flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Plan Trip
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Side: India Map */}
              <div className="lg:col-span-6 sticky top-24">
                <IndiaDestinationMap
                  destinations={destinations}
                  selectedDest={selectedDestForMap}
                  onSelectDestination={(d) => d.id && onSelectDestination(d.id)}
                  onExploreNearby={handleDestinationNearbyClick}
                  onPlanTrip={handleDestinationPlanClick}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {destinations.map((dest) => {
                const isCurated = dest.source_type === 'curated';

                return (
                  <div
                    key={`${dest.name}-${dest.latitude}`}
                    className="group bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-3xl overflow-hidden transition-all duration-300 flex flex-col shadow-xl"
                  >
                    {/* Destination Image & Badges */}
                    <div className="h-48 relative overflow-hidden">
                      <img
                        src={dest.image_url}
                        alt={dest.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-sm text-amber-300 font-extrabold text-[10px] uppercase tracking-wider">
                          {dest.category}
                        </span>
                        {isCurated ? (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-extrabold text-[10px] flex items-center gap-1 shadow">
                            ★ Curated
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/90 text-black font-extrabold text-[10px] flex items-center gap-1 shadow">
                            • Live OSM Discovery
                          </span>
                        )}
                      </div>

                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-sm text-white font-black text-xs">
                        ★ {dest.rating}
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                        <div className="px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-sm text-emerald-400 font-extrabold text-xs">
                          ₹{dest.base_daily_cost.toLocaleString()} / day est.
                        </div>
                        {dest.best_months && (
                          <div className="px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-sm text-cyan-300 font-mono text-[10px] flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {dest.best_months.split(',').slice(0, 3).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Destination Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-black text-xl text-white group-hover:text-amber-400 transition-colors">
                            {dest.name}
                          </h3>
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{dest.region}, <strong>{dest.state}</strong></span>
                        </p>
                        <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                          {dest.description}
                        </p>
                      </div>

                      {/* Travel Specs Badge */}
                      <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-850 flex items-center justify-between text-[11px] text-gray-300">
                        <span>Duration: <strong>{dest.estimated_duration_days || '2 - 3 Days'}</strong></span>
                        <span>•</span>
                        <span>Attractions: <strong>{dest.attractions_count > 0 ? `${dest.attractions_count} Verified` : 'OSM Mapped'}</strong></span>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleDestinationNearbyClick(dest)}
                            className="px-3 py-2.5 rounded-xl bg-gray-950 hover:bg-gray-800 border border-gray-800 text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Compass className="w-3.5 h-3.5 text-amber-400" />
                            Nearby Places
                          </button>
                          <button
                            onClick={() => handleDestinationPlanClick(dest)}
                            className="px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Plan Journey
                          </button>
                        </div>

                        {dest.id ? (
                          <button
                            onClick={() => onSelectDestination(dest.id!)}
                            className="w-full text-center py-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center justify-center gap-1"
                          >
                            View Full Destination Guide <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          dest.directions_url && (
                            <a
                              href={dest.directions_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full text-center py-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-1"
                            >
                              Open in Maps <ExternalLink className="w-3 h-3" />
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {destinations.length === 0 && (
            <div className="bg-gray-900/60 p-12 rounded-3xl border border-gray-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Compass className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">No Indian destinations found matching criteria</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Try widening your state, region, or budget filters, or search for another destination across India.
              </p>
              <button
                onClick={resetFilters}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: DEDICATED HIDDEN GEMS SPOTLIGHT */}
      {activeMode === 'HIDDEN_GEMS' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-950/40 via-gray-900 to-gray-900 p-6 rounded-3xl border border-purple-900/30 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Gem className="w-3.5 h-3.5" /> Transparent Selection Method
              </span>
            </div>
            <h2 className="text-2xl font-black text-white">Hidden Gems of India</h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-3xl leading-relaxed">
              These places qualify through transparent tourist criteria: crowd density index ≤ 4.7/5.0, verified historical or 
              ecological significance, unhurried atmospheres, and modest or free admission. No fabricated claims or random labels.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {hiddenGems.map((gem) => (
              <div
                key={gem.id}
                className="group bg-gray-900 border border-gray-800 hover:border-purple-500/50 rounded-3xl overflow-hidden transition-all duration-300 flex flex-col shadow-xl"
              >
                {/* Image & Rationale Badges */}
                <div className="h-44 relative overflow-hidden">
                  <img
                    src={gem.image_url || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=800&auto=format&fit=crop'}
                    alt={gem.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-sm text-purple-300 font-extrabold text-[10px] uppercase">
                      {gem.category}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-600/90 text-white font-extrabold text-[10px]">
                      {gem.selection_method === 'SCENIC_OFFBEAT' ? 'Scenic Offbeat' : gem.selection_method === 'VERIFIED_HERITAGE' ? 'Heritage Gem' : 'Low Footprint'}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/80 text-white font-bold text-xs">
                    ★ {gem.popularity_score}
                  </div>

                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/85 text-emerald-400 font-extrabold text-xs">
                    {gem.entry_fee === 0 ? 'Free Entry' : `₹${gem.entry_fee} Entry`}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-lg text-white group-hover:text-purple-300 transition-colors">
                      {gem.name}
                    </h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{gem.destination_name}, <strong>{gem.state}</strong></span>
                    </p>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {gem.description}
                    </p>

                    {/* Transparent Rationale Pill */}
                    <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-900/30 text-purple-200 text-xs space-y-1">
                      <div className="font-black text-[10px] uppercase tracking-wider text-purple-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Factual Gem Rationale:
                      </div>
                      <p className="text-[11px] leading-snug">{gem.gem_reason}</p>
                    </div>

                    {gem.accessibility_notes && (
                      <p className="text-[11px] text-gray-400 italic">
                        {gem.accessibility_notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-850">
                    <button
                      onClick={() => onExploreNearby({
                        name: gem.name,
                        display_name: `${gem.name}, ${gem.state}, India`,
                        lat: gem.latitude,
                        lng: gem.longitude,
                        radius_km: 15,
                      })}
                      className="px-3 py-2 rounded-xl bg-gray-950 hover:bg-gray-800 text-gray-200 font-bold text-xs flex items-center justify-center gap-1 border border-gray-800"
                    >
                      <Compass className="w-3.5 h-3.5 text-purple-400" />
                      Nearby
                    </button>
                    {gem.destination_id && (
                      <button
                        onClick={() => onSelectDestination(gem.destination_id!)}
                        className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-1 shadow-md shadow-purple-600/20"
                      >
                        Destination Guide →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};