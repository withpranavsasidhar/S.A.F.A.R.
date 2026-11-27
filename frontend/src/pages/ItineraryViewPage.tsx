import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  FullTripPlan,
  TripRequirement,
  ItineraryItem,
  DayItinerary,
  Attraction
} from '../types';
import { BudgetDonut } from '../components/BudgetDonut';
import { RouteMap } from '../components/RouteMap';
import {
  Calendar,
  Clock,
  MapPin,
  Bookmark,
  CheckCircle2,
  Navigation,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  RefreshCw,
  BedDouble,
  Utensils,
  Sparkles,
  Info,
  Car,
  Footprints,
  Compass
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface ItineraryViewPageProps {
  tripPlan: FullTripPlan;
  requirement: TripRequirement;
  onBack: () => void;
  onTripSaved: () => void;
  onRequireAuth: () => void;
}

export const ItineraryViewPage: React.FC<ItineraryViewPageProps> = ({
  tripPlan: initialTripPlan,
  requirement,
  onBack,
  onTripSaved,
  onRequireAuth
}) => {
  const { isAuthenticated } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<FullTripPlan>(initialTripPlan);
  const [selectedDay, setSelectedDay] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Custom Stop inputs
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Attraction');
  const [customCost, setCustomCost] = useState(0);
  const [customDuration, setCustomDuration] = useState(60);

  // Trigger recalculate via backend API
  const triggerRecalculate = async (updatedItinerary: DayItinerary[]) => {
    setRecalculating(true);
    try {
      const resp = await api.post('/trips/recalculate', {
        origin: requirement.origin,
        destination_id: currentPlan.destination.id,
        duration_days: currentPlan.duration_days,
        travelers: currentPlan.travelers,
        total_budget: currentPlan.total_budget,
        travel_style: requirement.travel_style || currentPlan.travel_style,
        preferred_transport: requirement.preferred_transport || 'Train / Bus',
        accommodation_preference: requirement.accommodation_preference || '3-Star Hotel',
        itinerary: updatedItinerary
      });

      setCurrentPlan(prev => ({
        ...prev,
        estimated_cost: resp.data.estimated_cost,
        budget_breakdown: resp.data.budget_breakdown,
        itinerary: resp.data.itinerary,
        per_person_cost: resp.data.per_person_cost
      }));
    } catch (err) {
      console.error("Recalculate error:", err);
    } finally {
      setRecalculating(false);
    }
  };

  // Reorder Item Up
  const handleMoveUp = (dayNum: number, itemIdx: number) => {
    if (itemIdx === 0) return;
    const nextItinerary = currentPlan.itinerary.map(day => {
      if (day.day_number !== dayNum) return day;
      const items = [...day.items];
      const temp = items[itemIdx - 1];
      items[itemIdx - 1] = items[itemIdx];
      items[itemIdx] = temp;
      return { ...day, items };
    });
    triggerRecalculate(nextItinerary);
  };

  // Reorder Item Down
  const handleMoveDown = (dayNum: number, itemIdx: number) => {
    const activeDay = currentPlan.itinerary.find(d => d.day_number === dayNum);
    if (!activeDay || itemIdx >= activeDay.items.length - 1) return;
    const nextItinerary = currentPlan.itinerary.map(day => {
      if (day.day_number !== dayNum) return day;
      const items = [...day.items];
      const temp = items[itemIdx + 1];
      items[itemIdx + 1] = items[itemIdx];
      items[itemIdx] = temp;
      return { ...day, items };
    });
    triggerRecalculate(nextItinerary);
  };

  // Remove Stop
  const handleRemoveItem = (dayNum: number, itemIdx: number) => {
    const nextItinerary = currentPlan.itinerary.map(day => {
      if (day.day_number !== dayNum) return day;
      const items = day.items.filter((_, idx) => idx !== itemIdx);
      return { ...day, items };
    });
    triggerRecalculate(nextItinerary);
  };

  // Add Known Attraction to current day
  const handleAddAttraction = (attr: Attraction) => {
    const newItem: ItineraryItem = {
      time_slot: "04:00 PM",
      activity_name: attr.name,
      description: attr.description || `Visit top-rated ${attr.category} attraction.`,
      duration_mins: Math.max(60, Math.round(attr.est_duration_hours * 60)),
      cost: attr.entry_fee * currentPlan.travelers,
      travel_time_from_prev: "Calculating...",
      latitude: attr.latitude,
      longitude: attr.longitude,
      attraction_id: attr.id,
      item_type: "attraction"
    };

    const nextItinerary = currentPlan.itinerary.map(day => {
      if (day.day_number !== selectedDay) return day;
      return { ...day, items: [...day.items, newItem] };
    });

    setShowAddModal(false);
    triggerRecalculate(nextItinerary);
  };

  // Add Custom Stop
  const handleAddCustomStop = () => {
    if (!customName.trim()) return;
    const activeDay = currentPlan.itinerary.find(d => d.day_number === selectedDay);
    const lastItem = activeDay && activeDay.items.length > 0 ? activeDay.items[activeDay.items.length - 1] : null;

    const newItem: ItineraryItem = {
      time_slot: "04:00 PM",
      activity_name: customName.trim(),
      description: `Custom ${customCategory} activity in ${currentPlan.destination.name}.`,
      duration_mins: customDuration,
      cost: customCost * currentPlan.travelers,
      travel_time_from_prev: "Calculating...",
      latitude: lastItem ? lastItem.latitude + 0.003 : currentPlan.destination.latitude,
      longitude: lastItem ? lastItem.longitude + 0.003 : currentPlan.destination.longitude,
      item_type: customCategory.toLowerCase()
    };

    const nextItinerary = currentPlan.itinerary.map(day => {
      if (day.day_number !== selectedDay) return day;
      return { ...day, items: [...day.items, newItem] };
    });

    setCustomName('');
    setCustomCost(0);
    setShowAddModal(false);
    triggerRecalculate(nextItinerary);
  };

  // Save Trip to Database
  const handleSaveTrip = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    setSaving(true);
    try {
      await api.post('/trips', {
        origin: requirement.origin,
        destination_id: currentPlan.destination.id,
        duration_days: requirement.duration_days,
        travelers: requirement.travelers,
        total_budget: requirement.budget,
        crowd_preference: requirement.crowd_preference,
        travel_style: requirement.travel_style,
        interests: requirement.interests,
        preferred_transport: requirement.preferred_transport || 'Train / Bus',
        accommodation_preference: requirement.accommodation_preference || '3-Star Hotel',
        start_date: requirement.start_date,
        end_date: requirement.end_date,
        custom_places: (() => {
          try {
            const raw = localStorage.getItem('safar_added_places');
            const parsed = raw ? JSON.parse(raw) : [];
            return parsed.map((p: any) => ({
              place_id: p.place_id,
              name: p.name,
              category: p.category,
              lat: p.lat,
              lng: p.lng,
              address: p.address,
            }));
          } catch {
            return [];
          }
        })(),
      });

      confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      setSavedSuccess(true);
      onTripSaved();
    } catch (err) {
      console.error("Save trip error:", err);
    } finally {
      setSaving(false);
    }
  };

  const activeDayItinerary = currentPlan.itinerary.find(d => d.day_number === selectedDay) || currentPlan.itinerary[0];

  // Destination available attractions for adding
  const availableAttractions = currentPlan.destination.attractions || [];
  const currentStopNames = new Set(
    currentPlan.itinerary.flatMap(d => d.items.map(it => it.activity_name.toLowerCase().trim()))
  );
  const unassignedAttractions = availableAttractions.filter(
    a => !currentStopNames.has(a.name.toLowerCase().trim())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 py-6 px-4">
      {/* Back & Action Buttons Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5 self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Discovery
        </button>

        <div className="flex items-center gap-3">
          {recalculating && (
            <div className="flex items-center gap-2 text-xs text-amber-400 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Recalculating distances & budget...
            </div>
          )}

          {savedSuccess ? (
            <div className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Saved to My Trips
            </div>
          ) : (
            <button
              onClick={handleSaveTrip}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Bookmark className="w-4 h-4 text-black" />
              {saving ? 'Persisting to DB...' : 'Save Trip Plan'}
            </button>
          )}
        </div>
      </div>

      {/* Main Title Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-gray-900 to-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-800 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-amber-500 text-black text-xs font-black">
            OPTIMIZED TRIP PLAN
          </span>
          <span className="text-xs text-gray-400 font-mono">
            {currentPlan.duration_days} DAYS • {currentPlan.travelers} TRAVELERS • {requirement.travel_style || currentPlan.travel_style} TIER
          </span>
          {currentPlan.start_date && (
            <span className="text-xs text-amber-400 font-mono">
              📅 {currentPlan.start_date} to {currentPlan.end_date}
            </span>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white">{currentPlan.title}</h1>
        <p className="text-xs text-gray-300 flex flex-wrap items-center gap-2 sm:gap-4">
          <span>Starting: <strong className="text-amber-400">{currentPlan.origin}</strong></span> • 
          <span>Destination: <strong className="text-amber-400">{currentPlan.destination.name}</strong></span> • 
          <span>Total Est: <strong className="text-emerald-400">₹{currentPlan.estimated_cost.toLocaleString()}</strong></span>
          {currentPlan.per_person_cost && (
            <span>(₹{currentPlan.per_person_cost.toLocaleString()} / person)</span>
          )}
        </p>
      </div>

      {/* Accommodation & Culinary Highlights Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Accommodation Suggestion */}
        <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <BedDouble className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
              Suggested Stay ({requirement.accommodation_preference || '3-Star Hotel'})
            </div>
            <div className="text-sm font-bold text-white">
              {currentPlan.accommodation_suggestion?.name || `${currentPlan.destination.name} Central Hotel`}
            </div>
            <div className="text-xs text-gray-400">
              Area: {currentPlan.accommodation_suggestion?.area || currentPlan.destination.region} • Est. ₹{currentPlan.accommodation_suggestion?.est_nightly_rate?.toLocaleString() || 2800}/night
            </div>
          </div>
        </div>

        {/* Regional Culinary Recommendations */}
        <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Utensils className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Regional Culinary Specialties
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {(currentPlan.food_recommendations && currentPlan.food_recommendations.length > 0
                ? currentPlan.food_recommendations
                : ["Regional Thali", "Street Delicacies", "Fresh Local Coffee"]
              ).slice(0, 4).map((dish, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-lg bg-gray-950 text-gray-300 border border-gray-800">
                  {dish}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Itemized Budget Allocation & Transparent Basis */}
      <BudgetDonut budget={currentPlan.budget_breakdown} totalBudget={currentPlan.total_budget} />

      {/* Interactive Map Visualizer */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-amber-400" />
            Geographically Grouped Route (Day {selectedDay})
          </h3>
          <span className="text-xs text-gray-400 font-mono">
            {activeDayItinerary?.day_theme || "Attractions Circuit"}
          </span>
        </div>
        <RouteMap 
          destination={currentPlan.destination} 
          itinerary={currentPlan.itinerary} 
          selectedDay={selectedDay} 
        />
      </div>

      {/* Day-Wise Itinerary Section with Add, Remove, and Reordering */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Day-Wise Itinerary Timeline
            </h3>
            <p className="text-xs text-gray-400">
              Proximity-clustered schedule • Reorder, remove or add stops with real-time transit & budget recalculation
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Day Switcher Tabs */}
            {currentPlan.itinerary.map((day) => (
              <button
                key={day.day_number}
                onClick={() => setSelectedDay(day.day_number)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  selectedDay === day.day_number 
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' 
                    : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                {day.date_label || `Day ${day.day_number}`}
              </button>
            ))}

            {/* Add Stop Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-amber-400 text-xs font-bold border border-gray-700 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Stop to Day {selectedDay}
            </button>
          </div>
        </div>

        {/* Day Theme Banner */}
        {activeDayItinerary?.day_theme && (
          <div className="p-3 rounded-xl bg-gray-950/80 border border-gray-800 flex items-center justify-between text-xs">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              Day Cluster Focus: <strong className="text-white">{activeDayItinerary.day_theme}</strong>
            </span>
            <span className="text-amber-400 font-mono font-bold">
              Est. Day Cost: ₹{activeDayItinerary.estimated_day_cost?.toLocaleString() || 0}
            </span>
          </div>
        )}

        {/* Timeline Items List */}
        <div className="space-y-4">
          {activeDayItinerary && activeDayItinerary.items.map((item, idx) => (
            <div 
              key={idx}
              className="bg-gray-900/90 rounded-2xl p-5 border border-gray-800 hover:border-amber-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Time Badge */}
                <div className="w-24 px-2 py-2 rounded-xl bg-gray-950 border border-gray-800 text-center font-mono text-xs font-bold text-amber-400 shrink-0">
                  {item.time_slot}
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-base text-white">{item.activity_name}</h4>
                    {item.item_type && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                        {item.item_type}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-400">{item.description}</p>

                  {/* Travel details from previous spot */}
                  {item.travel_time_from_prev && item.travel_time_from_prev !== "0 mins" && (
                    <div className="text-[11px] text-amber-400/90 font-mono flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="flex items-center gap-1">
                        {item.transport_mode_from_prev?.includes("Walk") ? (
                          <Footprints className="w-3 h-3 text-amber-400" />
                        ) : (
                          <Car className="w-3 h-3 text-amber-400" />
                        )}
                        Transit: {item.travel_time_from_prev} ({item.distance_from_prev_km || 0} km)
                      </span>
                      {item.transport_mode_from_prev && (
                        <span className="text-gray-400 bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                          Mode: {item.transport_mode_from_prev}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Duration, Cost, and Reorder/Remove controls */}
              <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                <div className="text-right text-xs font-mono">
                  <span className="text-gray-400 flex items-center gap-1 justify-end">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> {item.duration_mins} mins
                  </span>
                  <span className="font-bold text-white text-sm">
                    {item.cost > 0 ? `₹${item.cost.toLocaleString()}` : 'Free Entry'}
                  </span>
                </div>

                {/* Reorder and Delete Controls */}
                <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800">
                  <button
                    onClick={() => handleMoveUp(selectedDay, idx)}
                    disabled={idx === 0 || recalculating}
                    title="Move stop earlier"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-20"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(selectedDay, idx)}
                    disabled={idx === activeDayItinerary.items.length - 1 || recalculating}
                    title="Move stop later"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-20"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveItem(selectedDay, idx)}
                    disabled={recalculating}
                    title="Remove stop from day"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Stop Modal / Drawer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-amber-400" /> Add Stop to Day {selectedDay}
                </h3>
                <p className="text-xs text-gray-400">Choose from available destination spots or add a custom place</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Option A: Available Destination Attractions */}
            {unassignedAttractions.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Available Attractions in {currentPlan.destination.name}
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {unassignedAttractions.map(attr => (
                    <button
                      key={attr.id}
                      onClick={() => handleAddAttraction(attr)}
                      className="w-full text-left p-3 rounded-xl bg-gray-950 border border-gray-800 hover:border-amber-500/50 flex items-center justify-between transition-all"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{attr.name}</div>
                        <div className="text-[11px] text-gray-400">{attr.category} • Entry: ₹{attr.entry_fee}</div>
                      </div>
                      <span className="text-xs text-amber-400 font-bold">+ Add</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Option B: Custom Stop */}
            <div className="space-y-3 pt-2 border-t border-gray-800">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Or Add Custom Stop / Activity
              </label>
              <div>
                <input
                  type="text"
                  placeholder="Stop Name (e.g. Kondapalli Fort, Coffee Tasting, River Cruise)..."
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Category</label>
                  <select
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Attraction">Attraction</option>
                    <option value="Activity">Activity / Tour</option>
                    <option value="Meal">Meal / Dining</option>
                    <option value="Shopping">Artisan Market</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Fee / Person (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={customCost}
                    onChange={e => setCustomCost(Number(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddCustomStop}
                disabled={!customName.trim()}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all disabled:opacity-30 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Custom Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
