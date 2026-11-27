import React, { useState } from 'react';
import { Recommendation, TripRequirement } from '../types';
import { Sparkles, MapPin, CheckCircle2, ArrowRight, Filter, Wallet, Users, Compass, Compass as CompassIcon, Navigation, CloudSun, Radio } from 'lucide-react';

interface RecommendationsPageProps {
  recommendations: Recommendation[];
  requirement: TripRequirement;
  onSelectDestination: (destId: number) => void;
  onModifySearch: () => void;
  onRadiusChange?: (radiusKm: number | undefined) => void;
}

export const RecommendationsPage: React.FC<RecommendationsPageProps> = ({
  recommendations,
  requirement,
  onSelectDestination,
  onModifySearch,
  onRadiusChange
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Nature', 'Culture', 'Beach'];
  const activeRadius = requirement.radius_km;

  // Check if origin matches any destination (e.g. Vijayawada)
  const localMatch = recommendations.find(
    r => r.destination.name.toLowerCase().trim() === requirement.origin.toLowerCase().trim()
  );

  const nearbyRecs = activeRadius
    ? recommendations.filter(r => r.is_nearby && r.destination.name.toLowerCase().trim() !== requirement.origin.toLowerCase().trim())
    : [];

  const regionalRecs = recommendations.filter(
    r => r.destination.name.toLowerCase().trim() !== requirement.origin.toLowerCase().trim() && (!activeRadius || !r.is_nearby)
  );

  const filteredRegional = selectedCategory === 'All' 
    ? regionalRecs 
    : regionalRecs.filter(r => r.destination.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto space-y-10 py-6 px-4">
      {/* Top Banner Summarizing Input Constraints */}
      <div className="bg-gray-900/80 backdrop-blur-md p-6 rounded-3xl border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-black text-white">S.A.F.A.R. Travel & Recommendations Engine</h1>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Origin / Target City: <strong className="text-amber-400">{requirement.origin}</strong> • Budget: <strong className="text-amber-400">₹{requirement.budget.toLocaleString()}</strong> • <strong className="text-gray-200">{requirement.duration_days} Days</strong> • {requirement.travelers} Travelers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onRadiusChange && (
            <div className="flex flex-wrap items-center gap-1.5 bg-gray-950/90 p-1.5 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase px-2">Radius:</span>
              {[
                { label: '5 km', value: 5 },
                { label: '25 km', value: 25 },
                { label: '50 km', value: 50 },
                { label: '100 km', value: 100 },
                { label: 'All India', value: undefined },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => onRadiusChange(opt.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeRadius === opt.value
                      ? 'bg-amber-500 text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={onModifySearch}
            className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-all flex items-center gap-1.5 self-start md:self-auto"
          >
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            Modify Trip Inputs
          </button>
        </div>
      </div>

      {/* SECTION 1: Local Tourist Spots in Selected City (e.g., Vijayawada) */}
      {localMatch && (
        <div className="space-y-4 bg-gradient-to-r from-amber-500/10 via-gray-900/90 to-gray-900 p-6 sm:p-8 rounded-3xl border border-amber-500/40 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Navigation className="w-4 h-4 text-amber-400 animate-pulse" />
                LOCAL CITY TOURIST SPOTS & ATTRACTIONS
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                Relatable Tourist Spots in {localMatch.destination.name}
              </h2>
              <p className="text-xs text-gray-400">
                Direct local exploration of top attractions in {localMatch.destination.name} with zero inter-city transit delay.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-gray-400 font-mono block">S.A.F.A.R. SCORE</span>
                <span className="text-2xl font-black text-amber-400">{localMatch.overall_score}/100</span>
              </div>
              <button
                onClick={() => onSelectDestination(localMatch.destination.id)}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                Inspect {localMatch.destination.name} Itinerary <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Local Rationale & Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Why explore {localMatch.destination.name} locally?
              </h4>
              <ul className="space-y-2 text-xs text-gray-300">
                {localMatch.rationale.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Metrics */}
            <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Estimated Local Cost:</span>
                <span className="font-bold text-emerald-400">₹{localMatch.estimated_total_cost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Budget Fit Score:</span>
                <span className="font-bold text-white">{localMatch.budget_fit_score}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Expected Crowd:</span>
                <span className="font-bold text-amber-400">{localMatch.crowd_status}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State when radius is set and no nearby destinations exist */}
      {activeRadius && !localMatch && nearbyRecs.length === 0 && (
        <div className="bg-gray-900/70 border border-amber-500/30 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">
              No seeded destinations within {activeRadius} km of {requirement.origin}
            </h3>
            <p className="text-xs text-gray-400">
              Expand your search radius or switch to All India to explore regional getaways below.
            </p>
          </div>
          {onRadiusChange && (
            <button
              onClick={() => onRadiusChange(undefined)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shrink-0"
            >
              Switch to All India
            </button>
          )}
        </div>
      )}

      {/* Nearby Destinations within radius */}
      {nearbyRecs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            Nearby Destinations (Within {activeRadius} km of {requirement.origin})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nearbyRecs.map((rec) => (
              <div
                key={rec.destination.id}
                className="bg-gray-900/90 rounded-2xl p-5 border border-emerald-500/30 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-xs font-bold text-emerald-400">{rec.distance_km} km away • Score {rec.overall_score}/100</div>
                  <h3 className="text-lg font-black text-white">{rec.destination.name}</h3>
                  <p className="text-xs text-gray-400">{rec.destination.region}, {rec.destination.state} • Est. ₹{rec.estimated_total_cost.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => onSelectDestination(rec.destination.id)}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold shrink-0"
                >
                  Inspect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: Tours & Regional Recommendation Page */}
      <div className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <CompassIcon className="w-5 h-5 text-amber-400" />
              Tours & Regional Recommendations Page (From {requirement.origin})
            </h2>
            <p className="text-xs text-gray-400">
              Personalized getaway tours evaluated against your ₹{requirement.budget.toLocaleString()} budget & crowd preference.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Category:</span>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === cat 
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' 
                    : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Recommendation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredRegional.map((rec, index) => {
            const isTopMatch = index === 0;
            return (
              <div 
                key={rec.destination.id}
                className={`bg-gray-900/90 rounded-3xl overflow-hidden border transition-all duration-300 flex flex-col justify-between ${
                  isTopMatch 
                    ? 'border-amber-500/80 shadow-2xl shadow-amber-500/10 ring-1 ring-amber-500/30' 
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <div>
                  {/* Image Header with Score Badge */}
                  <div className="h-56 relative overflow-hidden">
                    <img 
                      src={rec.destination.image_url} 
                      alt={rec.destination.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />

                    {/* S.A.F.A.R. Score Badge */}
                    <div className="absolute top-4 right-4 bg-gray-950/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-amber-500/40 text-right shadow-lg">
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">S.A.F.A.R. SCORE</div>
                      <div className="text-xl font-black text-amber-400">{rec.overall_score}<span className="text-xs font-normal text-gray-400">/100</span></div>
                    </div>

                    {isTopMatch && (
                      <div className="absolute top-4 left-4 bg-amber-500 text-black font-extrabold text-xs px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> TOP REGIONAL GETAWAY
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
                      <div>
                        <h3 className="text-2xl font-black text-white">{rec.destination.name}</h3>
                        <p className="text-xs text-gray-300 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" /> {rec.destination.region}, {rec.destination.state}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-950/90 border border-gray-700 text-[11px] font-bold text-amber-300">
                          {rec.distance_km} km away
                        </span>
                        {rec.weather && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                            rec.weather.is_live ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-gray-950/80 text-gray-400'
                          }`}>
                            <CloudSun className="w-3 h-3 text-amber-400" />
                            {rec.weather.temperature_c}°C • {rec.weather.condition}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-5">
                    {/* Scores Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 bg-gray-950/80 p-3 rounded-2xl border border-gray-800 text-center">
                      <div>
                        <div className="text-[10px] text-gray-400 font-medium">BUDGET FIT</div>
                        <div className="text-sm font-bold text-emerald-400">{rec.budget_fit_score}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 font-medium">INTEREST MATCH</div>
                        <div className="text-sm font-bold text-amber-400">{rec.match_score}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 font-medium">CROWD FIT</div>
                        <div className="text-sm font-bold text-blue-400">{rec.crowd_fit_score}%</div>
                      </div>
                    </div>

                    {/* Explainability Block */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                        WHY S.A.F.A.R. RECOMMENDS THIS TOUR:
                      </h4>
                      <ul className="space-y-1.5 text-xs text-gray-300">
                        {rec.rationale.map((bullet, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Cost & Crowd Summary */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-800 text-xs">
                      <div>
                        <span className="text-gray-400 block text-[10px]">ESTIMATED TOUR COST:</span>
                        <span className="font-extrabold text-white text-base">₹{rec.estimated_total_cost.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-400 block text-[10px]">EXPECTED CROWD:</span>
                        <span className="font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          {rec.crowd_status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="p-6 pt-0">
                  <button
                    onClick={() => onSelectDestination(rec.destination.id)}
                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    Inspect Forecast & Optimize Tour <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
