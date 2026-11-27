import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Wallet, Sparkles, Compass, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { TripRequirement } from '../types';
import api from '../api/client';

interface OnboardingWizardProps {
  initialRequirement?: TripRequirement;
  onSubmit: (req: TripRequirement) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ initialRequirement, onSubmit }) => {
  const [step, setStep] = useState(1);

  const [origin, setOrigin] = useState(initialRequirement?.origin || 'Vijayawada');
  const [durationDays, setDurationDays] = useState(initialRequirement?.duration_days || 4);
  const [travelers, setTravelers] = useState(initialRequirement?.travelers || 2);
  const [budget, setBudget] = useState(initialRequirement?.budget || 25000);
  const [travelStyle, setTravelStyle] = useState(initialRequirement?.travel_style || 'Balanced');
  const [interests, setInterests] = useState<string[]>(initialRequirement?.interests || ['Nature', 'Culture']);
  const [crowdPreference, setCrowdPreference] = useState(initialRequirement?.crowd_preference || 'Prefer Less Crowded');
  const [radiusKm, setRadiusKm] = useState<number | undefined>(initialRequirement?.radius_km ?? 100);
  const [travelMonth, setTravelMonth] = useState<number>(initialRequirement?.travel_month || new Date().getMonth() + 1);

  const [cities, setCities] = useState<string[]>([]);
  const [geoStatus, setGeoStatus] = useState<{ lat: number; lng: number; is_known: boolean; suggestions: string[] } | null>(null);

  useEffect(() => {
    api.get('/locations/cities')
      .then(res => setCities(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = origin.trim();
    if (!q) {
      setGeoStatus(null);
      return;
    }
    const timer = setTimeout(() => {
      api.get('/locations/geocode', { params: { q } })
        .then(res => setGeoStatus(res.data))
        .catch(() => setGeoStatus(null));
    }, 250);
    return () => clearTimeout(timer);
  }, [origin]);

  const availableInterests = ['Nature', 'Culture', 'History', 'Coffee & Tea', 'Waterfalls', 'Spiritual', 'Beach', 'Trekking'];

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const applyReview2Preset = () => {
    setOrigin('Vijayawada');
    setDurationDays(4);
    setTravelers(2);
    setBudget(25000);
    setTravelStyle('Balanced');
    setInterests(['Nature', 'Culture']);
    setCrowdPreference('Prefer Less Crowded');
  };

  const handleFinish = () => {
    onSubmit({
      origin,
      duration_days: durationDays,
      travelers,
      budget,
      travel_style: travelStyle,
      interests,
      crowd_preference: crowdPreference,
      radius_km: radiusKm,
      travel_month: travelMonth
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8 px-4">
      {/* Top Banner with Quick Fill */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Quick Start Preset</h4>
            <p className="text-xs text-amber-300">Preset: Vijayawada, ₹25,000, 4 Days, 2 Travelers, Nature + Culture</p>
          </div>
        </div>
        <button
          onClick={applyReview2Preset}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-md"
        >
          Load Sample Preset
        </button>
      </div>

      {/* Wizard Progress Stepper Header */}
      <div className="bg-gray-900/70 backdrop-blur-md p-6 rounded-3xl border border-gray-800 space-y-6">
        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-gray-400">
          <span>STEP 0{step} OF 05</span>
          <span className="text-amber-400">
            {step === 1 && "Starting Location & Travelers"}
            {step === 2 && "Duration & Dates"}
            {step === 3 && "Budget Intelligence"}
            {step === 4 && "Travel Style & Crowd Preference"}
            {step === 5 && "Interests & Discovery"}
          </span>
        </div>

        {/* Stepper Dots */}
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s}
              className={`h-2 rounded-full transition-all duration-500 ${
                s <= step ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gray-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Content Container */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 sm:p-10 shadow-2xl min-h-[380px] flex flex-col justify-between">
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <MapPin className="w-6 h-6 text-amber-400" />
                Where is your trip starting from?
              </h2>
              <p className="text-xs text-gray-400">S.A.F.A.R. uses origin points to calculate transit matrix expenses and optimal routes.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Starting City / Origin</label>
                <input
                  type="text"
                  list="safar-cities"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Type an Indian city (e.g. Vijayawada, Hyderabad, Bangalore)..."
                  className="w-full bg-gray-950 border border-gray-700 rounded-2xl px-5 py-3.5 text-base text-white focus:outline-none focus:border-amber-500 font-semibold"
                />
                <datalist id="safar-cities">
                  {cities.map(c => <option key={c} value={c} />)}
                </datalist>

                {geoStatus && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {geoStatus.is_known ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolved coordinates: {geoStatus.lat.toFixed(4)}°N, {geoStatus.lng.toFixed(4)}°E
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        City not in local coordinate index — using India centroid fallback.
                        {geoStatus.suggestions.length > 0 && (
                          <span className="text-gray-300 ml-1">
                            Try:{' '}
                            {geoStatus.suggestions.map((s, idx) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setOrigin(s)}
                                className="underline text-amber-300 hover:text-amber-200 mr-1.5"
                              >
                                {s}{idx < geoStatus.suggestions.length - 1 ? ',' : ''}
                              </button>
                            ))}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Search Radius</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '5 km', value: 5 },
                    { label: '25 km', value: 25 },
                    { label: '50 km', value: 50 },
                    { label: '100 km', value: 100 },
                    { label: 'All India', value: undefined },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setRadiusKm(opt.value)}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                        radiusKm === opt.value
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Number of Travelers</label>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTravelers(num)}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                        travelers === num 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10' 
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      {num} {num === 1 ? 'Solo' : num === 2 ? 'Couple (2)' : `${num} Group`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Calendar className="w-6 h-6 text-amber-400" />
                How long is your journey?
              </h2>
              <p className="text-xs text-gray-400">Specify trip duration so S.A.F.A.R. can structure day-wise itineraries without fatigue.</p>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-semibold text-gray-300">Trip Duration (Days): <span className="text-amber-400 text-lg font-bold">{durationDays} Days</span></label>
              <input
                type="range"
                min={2}
                max={7}
                step={1}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 font-mono">
                <span>2 Days (Weekend)</span>
                <span>4 Days (Popular)</span>
                <span>7 Days (Week Long)</span>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-gray-300 mb-2">Planned Travel Month (for Crowd Forecast)</label>
                <select
                  value={travelMonth}
                  onChange={(e) => setTravelMonth(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 font-semibold"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Wallet className="w-6 h-6 text-amber-400" />
                What is your total budget?
              </h2>
              <p className="text-xs text-gray-400">S.A.F.A.R. uses a budget-first algorithm. Destinations & activities are filtered to fit comfortably within your limit.</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">TOTAL TRIP BUDGET</span>
                <span className="text-3xl font-black text-amber-400">₹{budget.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[15000, 25000, 40000].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBudget(b)}
                    className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                      budget === b 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    ₹{b.toLocaleString()} {b === 25000 ? '(Recommended)' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Compass className="w-6 h-6 text-amber-400" />
                Travel Style & Crowd Preference
              </h2>
              <p className="text-xs text-gray-400">Control crowd levels and accommodation tier.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Crowd Preference</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['Prefer Less Crowded', "Don't Mind Crowds", 'Off-Peak Seeker'].map((cp) => (
                    <button
                      key={cp}
                      type="button"
                      onClick={() => setCrowdPreference(cp)}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                        crowdPreference === cp 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      {cp}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Travel Style</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Budget', 'Balanced', 'Premium'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTravelStyle(st)}
                      className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                        travelStyle === st 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-400" />
                Select Your Travel Interests
              </h2>
              <p className="text-xs text-gray-400">Choose interests to score and rank matching Indian destinations.</p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {availableInterests.map((interest) => {
                const selected = interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                      selected 
                        ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20' 
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    {selected && <CheckCircle2 className="w-4 h-4 text-black" />}
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation Buttons Footer */}
        <div className="flex justify-between items-center pt-8 border-t border-gray-800 mt-6">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="px-5 py-2.5 rounded-xl bg-gray-950 text-gray-400 hover:text-white text-xs font-bold border border-gray-800 disabled:opacity-30 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-sm transition-all shadow-xl shadow-amber-500/25 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Discover Recommendations
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
