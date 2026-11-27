import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Globe,
  Phone,
  PlusCircle,
  CheckCircle2,
  Navigation,
  Tag,
} from 'lucide-react';
import api from '../api/client';
import { ActiveLocation, NearbyPlace } from '../types';

const detailPin = L.divIcon({
  className: 'place-detail-pin',
  html: `<div style="
    background-color:#f59e0b;
    width:32px;height:32px;border-radius:50%;
    border:2px solid #fff;display:flex;align-items:center;justify-content:center;
    color:#000;font-weight:900;font-size:14px;box-shadow:0 4px 10px rgba(0,0,0,0.5);
  ">📍</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface PlaceDetailPageProps {
  initialPlace: NearbyPlace;
  activeLocation: ActiveLocation;
  isAdded: boolean;
  onToggleAdd: (place: NearbyPlace) => void;
  onBack: () => void;
}

export const PlaceDetailPage: React.FC<PlaceDetailPageProps> = ({
  initialPlace,
  activeLocation,
  isAdded,
  onToggleAdd,
  onBack,
}) => {
  const [place, setPlace] = useState<NearbyPlace>(initialPlace);
  const [loadingExtra, setLoadingExtra] = useState(false);

  useEffect(() => {
    setPlace(initialPlace);
    setLoadingExtra(true);
    api
      .get(`/locations/place/${initialPlace.osm_type}/${initialPlace.osm_id}`)
      .then((res) => {
        if (res.data) {
          setPlace((prev) => ({
            ...res.data,
            distance_km: prev.distance_km,
          }));
        }
      })
      .catch(() => {
        // Keep initialPlace if live lookup fails
      })
      .finally(() => setLoadingExtra(false));
  }, [initialPlace]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6 px-4">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Location Discovery
        </button>

        <button
          onClick={() => onToggleAdd(place)}
          className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all ${
            isAdded
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
          }`}
        >
          {isAdded ? (
            <>
              <CheckCircle2 className="w-4 h-4" /> Added to Active Trip
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" /> Add Place to Trip
            </>
          )}
        </button>
      </div>

      {/* Header Card */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase">
            {place.category}
          </span>
          <span className="px-3 py-1 rounded-full bg-gray-800 text-gray-300 text-xs font-semibold">
            {place.subcategory}
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5" /> {place.distance_km} km from {activeLocation.name}
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white">{place.name}</h1>

        {place.address && (
          <p className="text-sm text-gray-300 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
            {place.address}
          </p>
        )}

        <div className="text-xs text-gray-500 font-mono">
          Coordinates: {place.lat.toFixed(5)}°N, {place.lng.toFixed(5)}°E • Source: OpenStreetMap ({place.place_id})
          {loadingExtra && ' • Refreshing live metadata...'}
        </div>
      </div>

      {/* Details & Map Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Place Information</h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5 text-gray-300">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-400">Opening Hours</div>
                <div>{place.opening_hours || 'Not listed in OpenStreetMap'}</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-gray-300">
              <Phone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-400">Phone</div>
                <div>{place.phone || 'Not listed'}</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-gray-300">
              <Globe className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-400">Website</div>
                {place.website ? (
                  <a
                    href={place.website.startsWith('http') ? place.website : `https://${place.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 underline break-all"
                  >
                    {place.website}
                  </a>
                ) : (
                  <span>Not listed</span>
                )}
              </div>
            </div>
          </div>

          {Object.keys(place.tags || {}).length > 0 && (
            <div className="pt-4 border-t border-gray-800 space-y-2">
              <div className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" /> OpenStreetMap Attributes
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(place.tags)
                  .slice(0, 12)
                  .map(([k, v]) => (
                    <span
                      key={k}
                      className="px-2 py-1 rounded bg-gray-950 border border-gray-800 text-[11px] text-gray-300 font-mono"
                    >
                      {k}: {v}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-[340px] rounded-2xl overflow-hidden border border-gray-800 bg-gray-950">
          <MapContainer
            center={[place.lat, place.lng]}
            zoom={15}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[place.lat, place.lng]} icon={detailPin}>
              <Popup>
                <div className="font-sans text-gray-900 text-xs">
                  <strong>{place.name}</strong>
                  <div>{place.subcategory}</div>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>
    </div>
  );
};
