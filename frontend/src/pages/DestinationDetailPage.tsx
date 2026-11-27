import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Destination, Forecast, Attraction, ActiveLocation } from '../types';
import { DemandChart } from '../components/DemandChart';
import { LoadingScreen } from '../components/LoadingScreen';
import { MapPin, Star, Calendar, Sparkles, Clock, ArrowRight, ArrowLeft, ExternalLink, Compass, Navigation, Bus, CloudSun, Wind, Droplets, Radio } from 'lucide-react';

interface DestinationDetailPageProps {
  destId: number;
  onBack: () => void;
  onGenerateItinerary: (destId: number) => void;
  onDestinationLoaded?: (dest: Destination) => void;
  onExploreNearby?: (loc: ActiveLocation) => void;
}

export const DestinationDetailPage: React.FC<DestinationDetailPageProps> = ({
  destId,
  onBack,
  onGenerateItinerary,
  onDestinationLoaded,
  onExploreNearby,
}) => {
  const [dest, setDest] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const resp = await api.get(`/destinations/${destId}`);
        setDest(resp.data);
        onDestinationLoaded?.(resp.data);
      } catch (err) {
        console.error("Failed to load destination detail:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [destId]);

  if (loading) {
    return <LoadingScreen messageOverride="Fetching seasonal demand forecast & attraction maps..." />;
  }

  if (!dest) {
    return (
      <div className="text-center py-20 text-gray-400">
        Destination details could not be loaded. <button onClick={onBack} className="text-amber-400 underline">Return to discovery</button>
      </div>
    );
  }

  const directionsUrl = dest.directions_url || `https://www.google.com/maps/dir/?api=1&destination=${dest.latitude},${dest.longitude}`;

  const handleNearbyClick = () => {
    if (onExploreNearby) {
      onExploreNearby({
        name: dest.name,
        display_name: `${dest.name}, ${dest.state}, India`,
        lat: dest.latitude,
        lng: dest.longitude,
        radius_km: 15,
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 py-6 px-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Destinations
        </button>

        <div className="flex items-center gap-2">
          {onExploreNearby && (
            <button
              onClick={handleNearbyClick}
              className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Compass className="w-4 h-4" /> Discover Nearby Places
            </button>
          )}
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            Directions <ExternalLink className="w-3 h-3 text-gray-500" />
          </a>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-gray-800 h-[320px] md:h-[400px]">
        <img 
          src={dest.image_url} 
          alt={dest.name} 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />

        <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-extrabold uppercase tracking-wider">
                {dest.category}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-black/60 px-2.5 py-1 rounded-full border border-gray-700">
                <Star className="w-3.5 h-3.5 fill-amber-400" /> {dest.rating}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-black/60 text-gray-300 border border-gray-700 text-xs font-mono">
                {dest.latitude.toFixed(4)}° N, {dest.longitude.toFixed(4)}° E
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white">{dest.name}</h1>
            <p className="text-sm text-gray-300 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-amber-400" /> {dest.region}, <strong>{dest.state}</strong>
            </p>
          </div>

          <button
            onClick={() => onGenerateItinerary(dest.id)}
            className="px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Build Optimized Itinerary
          </button>
        </div>
      </div>

      {/* Description & Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gray-900/70 p-6 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-base font-bold text-white">About {dest.name}</h3>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">{dest.description}</p>
          
          <div className="pt-3 border-t border-gray-800 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-gray-400">Best Travel Months:</span>
            <span className="font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              {dest.best_months || 'Oct, Nov, Dec, Jan, Feb'}
            </span>
          </div>

          {dest.accessibility_notes && (
            <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-300 space-y-1">
              <span className="font-bold text-gray-200 flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-cyan-400">
                <Bus className="w-3.5 h-3.5" /> Accessibility & Travel Notes:
              </span>
              <p className="text-gray-400">{dest.accessibility_notes}</p>
            </div>
          )}
        </div>

        <div className="bg-gray-900/70 p-6 rounded-2xl border border-gray-800 space-y-3">
          <h3 className="text-base font-bold text-white">Cost & Transit Metrics</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2.5 rounded-xl bg-gray-950">
              <span className="text-gray-400">Base Daily Cost / Traveler:</span>
              <span className="font-bold text-amber-400">₹{dest.base_daily_cost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-gray-950">
              <span className="text-gray-400">Recommended Duration:</span>
              <span className="font-bold text-white">{dest.estimated_duration_days || '3 to 4 Days'}</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-gray-950">
              <span className="text-gray-400">Region Zone:</span>
              <span className="font-bold text-cyan-300">{dest.region}</span>
            </div>
          </div>

          {/* Live Weather Observation Widget */}
          {dest.weather && (
            <div className="mt-4 pt-3 border-t border-gray-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CloudSun className="w-3.5 h-3.5 text-amber-400" /> Current Weather
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  dest.weather.is_live ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-400'
                }`}>
                  <Radio className={`w-2.5 h-2.5 ${dest.weather.is_live ? 'animate-pulse text-emerald-400' : 'text-gray-500'}`} />
                  {dest.weather.is_live ? 'LIVE WMO' : 'OFFLINE'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-950/90 border border-gray-800 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-white">{dest.weather.temperature_c}°C</div>
                  <div className="text-[11px] text-gray-400 capitalize">{dest.weather.condition}</div>
                </div>
                <div className="text-right text-[11px] text-gray-400 space-y-0.5 font-mono">
                  <div className="flex items-center justify-end gap-1">
                    <Wind className="w-3 h-3 text-cyan-400" /> {dest.weather.wind_kph} km/h
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <Droplets className="w-3 h-3 text-blue-400" /> {dest.weather.humidity_percent}%
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 flex justify-between px-1">
                <span>Source: {dest.weather.source}</span>
                <span>{new Date(dest.weather.retrieved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recharts Seasonal Tourism Demand Forecast Chart */}
      {dest.forecasts && (
        <DemandChart forecasts={dest.forecasts} destinationName={dest.name} />
      )}

      {/* Top Attractions Grid */}
      <div className="space-y-4">
        <h3 className="text-xl font-black text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Top Rated Attractions in {dest.name} ({dest.attractions?.length || 0})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dest.attractions && dest.attractions.map((attr) => (
            <div 
              key={attr.id}
              className="bg-gray-900/80 rounded-2xl p-5 border border-gray-800 hover:border-amber-500/40 transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {attr.category}
                  </span>
                  <span className="text-xs font-semibold text-gray-300">★ {attr.popularity_score}</span>
                </div>
                <h4 className="font-bold text-base text-white">{attr.name}</h4>
                <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">{attr.description}</p>
              </div>

              <div className="pt-3 border-t border-gray-800 flex justify-between items-center text-xs text-gray-400 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> {attr.est_duration_hours}h
                </span>
                <span className="text-emerald-400 font-bold">
                  {attr.entry_fee === 0 ? 'Free Entry' : `₹${attr.entry_fee}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Ready to experience {dest.name}?</h3>
          <p className="text-xs text-gray-400">S.A.F.A.R. will optimize day-wise timing, travel routes, and itemized expenses.</p>
        </div>
        <button
          onClick={() => onGenerateItinerary(dest.id)}
          className="px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all shadow-lg flex items-center gap-2"
        >
          Generate Trip Itinerary <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
