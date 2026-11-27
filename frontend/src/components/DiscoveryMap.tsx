import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { NearbyPlace } from '../types';

const CATEGORY_COLORS: Record<string, string> = {
  attractions: '#f59e0b',
  temples: '#fb923c',
  monuments: '#a855f7',
  parks: '#10b981',
  museums: '#38bdf8',
  viewpoints: '#22d3ee',
  activities: '#ec4899',
  restaurants: '#f43f5e',
  accommodation: '#6366f1',
};

const createPinIcon = (color: string, label: string) =>
  L.divIcon({
    className: 'custom-discovery-pin',
    html: `<div style="
      background-color: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0b0f17;
      font-weight: 800;
      font-size: 11px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.55);
    ">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const centerIcon = createPinIcon('#f59e0b', '★');

const MapRecenter: React.FC<{ lat: number; lng: number; radiusKm: number }> = ({ lat, lng, radiusKm }) => {
  const map = useMap();
  useEffect(() => {
    const zoom = radiusKm <= 2 ? 14 : radiusKm <= 5 ? 13 : radiusKm <= 10 ? 12 : radiusKm <= 25 ? 11 : 10;
    map.setView([lat, lng], zoom);
  }, [lat, lng, radiusKm, map]);
  return null;
};

interface DiscoveryMapProps {
  centerLat: number;
  centerLng: number;
  centerName: string;
  radiusKm: number;
  places: NearbyPlace[];
  addedPlaceIds: Set<string>;
  onSelectPlace: (place: NearbyPlace) => void;
  onToggleAddPlace: (place: NearbyPlace) => void;
}

export const DiscoveryMap: React.FC<DiscoveryMapProps> = ({
  centerLat,
  centerLng,
  centerName,
  radiusKm,
  places,
  addedPlaceIds,
  onSelectPlace,
  onToggleAddPlace,
}) => {
  return (
    <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-gray-800 relative shadow-2xl bg-gray-950">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <MapRecenter lat={centerLat} lng={centerLng} radiusKm={radiusKm} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Search Radius Boundary */}
        <Circle
          center={[centerLat, centerLng]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillOpacity: 0.08,
            weight: 2,
            dashArray: '6, 6',
          }}
        />

        {/* Search Center Marker */}
        <Marker position={[centerLat, centerLng]} icon={centerIcon}>
          <Popup>
            <div className="p-1 font-sans text-gray-900">
              <div className="text-[10px] font-bold uppercase text-amber-600">Search Center</div>
              <div className="font-bold text-sm">{centerName}</div>
              <div className="text-xs text-gray-600">Radius: {radiusKm} km</div>
            </div>
          </Popup>
        </Marker>

        {/* Nearby Place Markers */}
        {places.map((place, idx) => {
          const color = CATEGORY_COLORS[place.category] || '#10b981';
          const isAdded = addedPlaceIds.has(place.place_id);
          return (
            <Marker
              key={place.place_id}
              position={[place.lat, place.lng]}
              icon={createPinIcon(color, `${idx + 1}`)}
            >
              <Popup>
                <div className="p-1 font-sans text-gray-900 min-w-[200px] space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-amber-700">
                    {place.subcategory} • {place.distance_km} km away
                  </div>
                  <div className="font-bold text-sm text-gray-900 leading-snug">{place.name}</div>
                  {place.address && <div className="text-xs text-gray-600">{place.address}</div>}
                  <div className="flex gap-2 pt-1.5">
                    <button
                      onClick={() => onSelectPlace(place)}
                      className="px-2.5 py-1 rounded bg-gray-900 text-white text-[11px] font-semibold"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => onToggleAddPlace(place)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                        isAdded ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-black'
                      }`}
                    >
                      {isAdded ? 'Added ✓' : '+ Add to Trip'}
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
