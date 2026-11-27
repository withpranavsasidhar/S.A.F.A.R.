import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';
import { DayItinerary, Destination } from '../types';

// Custom Marker Icons using Leaflet divIcon
const createCustomIcon = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: black;
        font-weight: bold;
        font-size: 12px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      ">
        ${label}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const destIcon = createCustomIcon('#f59e0b', '★');
const itemIcon = createCustomIcon('#10b981', '📍');

interface RouteMapProps {
  destination: Destination;
  itinerary: DayItinerary[];
  selectedDay?: number;
}

// Component to dynamically re-center map when day changes
const ChangeMapView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

export const RouteMap: React.FC<RouteMapProps> = ({ destination, itinerary, selectedDay = 1 }) => {
  const activeDay = itinerary.find(d => d.day_number === selectedDay) || itinerary[0];

  const positions: [number, number][] = activeDay 
    ? activeDay.items.map(item => [item.latitude, item.longitude])
    : [[destination.latitude, destination.longitude]];

  const centerPos: [number, number] = positions.length > 0 ? positions[0] : [destination.latitude, destination.longitude];

  return (
    <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-gray-800 relative shadow-2xl bg-gray-950">
      <div className="absolute top-3 right-3 z-[1000] bg-gray-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-700 text-xs flex items-center gap-2 text-amber-400 font-mono">
        <Navigation className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        S.A.F.A.R. ROUTE INTELLIGENCE MAP
      </div>

      <MapContainer 
        center={centerPos} 
        zoom={12} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ChangeMapView center={centerPos} zoom={12} />
        
        {/* Dark Tile Layer for Premium Aesthetics */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Destination Pin */}
        <Marker position={[destination.latitude, destination.longitude]} icon={destIcon}>
          <Popup>
            <div className="p-1 font-sans text-gray-900">
              <h4 className="font-bold text-sm">{destination.name} Hub</h4>
              <p className="text-xs text-gray-600">{destination.region}, {destination.state}</p>
            </div>
          </Popup>
        </Marker>

        {/* Itinerary Day Pins */}
        {activeDay && activeDay.items.map((item, idx) => (
          <Marker 
            key={idx} 
            position={[item.latitude, item.longitude]}
            icon={createCustomIcon('#10b981', `${idx + 1}`)}
          >
            <Popup>
              <div className="p-1 font-sans text-gray-900 min-w-[180px]">
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{item.time_slot}</div>
                <h4 className="font-bold text-sm text-gray-900 leading-tight">{item.activity_name}</h4>
                <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                <div className="mt-2 text-[11px] font-semibold text-gray-700 flex justify-between border-t pt-1">
                  <span>Cost: ₹{item.cost}</span>
                  <span>{item.duration_mins} mins</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route Line Connecting Spots */}
        {positions.length > 1 && (
          <Polyline 
            positions={positions} 
            color="#f59e0b" 
            weight={4} 
            dashArray="8, 8" 
            opacity={0.8} 
          />
        )}
      </MapContainer>
    </div>
  );
};
