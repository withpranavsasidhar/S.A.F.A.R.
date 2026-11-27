import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { NationwideDestination } from '../types';
import { MapPin, Sparkles, Compass, ExternalLink } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  Culture: '#a855f7',
  Heritage: '#a855f7',
  Nature: '#10b981',
  Wildlife: '#10b981',
  Beach: '#06b6d4',
  Spiritual: '#f59e0b',
  Adventure: '#ec4899',
  'Hill Station': '#3b82f6',
};

const createDestinationPin = (cat: string, isCurated: boolean) => {
  const color = CATEGORY_COLORS[cat] || (isCurated ? '#f59e0b' : '#38bdf8');
  return L.divIcon({
    className: 'custom-india-dest-pin',
    html: `<div style="
      background-color: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2.5px solid #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0b0f17;
      font-weight: 900;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.6);
      transform: translate(-16px, -16px);
      cursor: pointer;
    ">${isCurated ? '★' : '•'}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const MapBoundsAdjuster: React.FC<{ destinations: NationwideDestination[] }> = ({ destinations }) => {
  const map = useMap();
  useEffect(() => {
    if (destinations.length === 0) return;
    if (destinations.length === 1) {
      map.setView([destinations[0].latitude, destinations[0].longitude], 9);
      return;
    }
    const bounds = L.latLngBounds(destinations.map(d => [d.latitude, d.longitude]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
  }, [destinations, map]);
  return null;
};

interface IndiaDestinationMapProps {
  destinations: NationwideDestination[];
  selectedDest?: NationwideDestination | null;
  onSelectDestination: (dest: NationwideDestination) => void;
  onExploreNearby: (dest: NationwideDestination) => void;
  onPlanTrip: (dest: NationwideDestination) => void;
}

export const IndiaDestinationMap: React.FC<IndiaDestinationMapProps> = ({
  destinations,
  selectedDest,
  onSelectDestination,
  onExploreNearby,
  onPlanTrip,
}) => {
  const defaultCenter: [number, number] = [21.5937, 78.9629]; // Center of India

  return (
    <div className="w-full h-[540px] rounded-3xl overflow-hidden border border-gray-800 relative shadow-2xl bg-gray-950">
      <MapContainer
        center={defaultCenter}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <MapBoundsAdjuster destinations={destinations} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {destinations.map((dest, idx) => {
          const isCurated = dest.source_type === 'curated';
          const icon = createDestinationPin(dest.category, isCurated);

          return (
            <Marker
              key={`${dest.name}-${dest.latitude}-${dest.longitude}-${idx}`}
              position={[dest.latitude, dest.longitude]}
              icon={icon}
            >
              <Popup className="custom-popup" maxWidth={280}>
                <div className="p-1 space-y-2 text-[#0b0f17]">
                  <div className="h-28 rounded-xl overflow-hidden relative">
                    <img
                      src={dest.image_url}
                      alt={dest.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-amber-300 text-[10px] font-bold">
                      {dest.category}
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-bold">
                      ★ {dest.rating}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900 leading-tight">
                      {dest.name}
                    </h4>
                    <p className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-amber-600" />
                      {dest.region}, {dest.state}
                    </p>
                    <p className="text-[11px] font-bold text-emerald-700 mt-1">
                      ₹{dest.base_daily_cost.toLocaleString()} / day est.
                    </p>
                  </div>

                  <p className="text-[11px] text-gray-600 line-clamp-2 leading-snug">
                    {dest.description}
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => onExploreNearby(dest)}
                      className="px-2 py-1.5 rounded-lg bg-gray-900 text-white font-bold text-[10px] hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
                    >
                      <Compass className="w-3 h-3 text-amber-400" /> Nearby
                    </button>
                    <button
                      onClick={() => onPlanTrip(dest)}
                      className="px-2 py-1.5 rounded-lg bg-amber-500 text-black font-extrabold text-[10px] hover:bg-amber-400 transition-colors flex items-center justify-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Plan Trip
                    </button>
                  </div>

                  {dest.id && (
                    <button
                      onClick={() => onSelectDestination(dest)}
                      className="w-full text-center text-[10px] text-amber-700 font-bold hover:underline pt-0.5 block"
                    >
                      View Detailed Overview →
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Map Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-gray-950/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-gray-800 text-[11px] text-gray-300 shadow-xl flex items-center gap-4 flex-wrap">
        <span className="font-extrabold text-white uppercase tracking-wider text-[10px]">Pins:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
          <span>★ Curated Destination</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block"></span>
          <span>• Live Geographic Discovery</span>
        </span>
      </div>
    </div>
  );
};