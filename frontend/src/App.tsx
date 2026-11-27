import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LoadingScreen } from './components/LoadingScreen';

import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingWizard } from './pages/OnboardingWizard';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { DestinationDetailPage } from './pages/DestinationDetailPage';
import { ItineraryViewPage } from './pages/ItineraryViewPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LocationDiscoveryPage } from './pages/LocationDiscoveryPage';
import { PlaceDetailPage } from './pages/PlaceDetailPage';
import { ExploreIndiaPage } from './pages/ExploreIndiaPage';

import { TripRequirement, Recommendation, FullTripPlan, ActiveLocation, NearbyPlace, Destination } from './types';
import api from './api/client';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Active Geographic Location State (shared across Location Discovery, Recommendations & Itinerary)
  const [activeLocation, setActiveLocation] = useState<ActiveLocation>(() => {
    try {
      const saved = localStorage.getItem('safar_active_location');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: 'Vijayawada',
      display_name: 'Vijayawada, Andhra Pradesh, India',
      lat: 16.5062,
      lng: 80.6480,
      radius_km: 10,
    };
  });

  const [addedPlaces, setAddedPlaces] = useState<NearbyPlace[]>(() => {
    try {
      const saved = localStorage.getItem('safar_added_places');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<Destination[]>(() => {
    try {
      const saved = localStorage.getItem('safar_recently_viewed');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Flow State
  const [requirement, setRequirement] = useState<TripRequirement>({
    origin: activeLocation.name,
    budget: 25000,
    duration_days: 4,
    travelers: 2,
    interests: ["Nature", "Culture"],
    crowd_preference: "Prefer Less Crowded",
    travel_style: "Balanced",
    radius_km: 100
  });

  const handleActiveLocationChange = (loc: ActiveLocation) => {
    setActiveLocation(loc);
    localStorage.setItem('safar_active_location', JSON.stringify(loc));
    setRequirement(prev => ({
      ...prev,
      origin: loc.name,
      radius_km: loc.radius_km,
    }));
  };

  const handleToggleAddPlace = (place: NearbyPlace) => {
    setAddedPlaces(prev => {
      const exists = prev.some(p => p.place_id === place.place_id);
      const next = exists ? prev.filter(p => p.place_id !== place.place_id) : [...prev, place];
      localStorage.setItem('safar_added_places', JSON.stringify(next));
      return next;
    });
  };

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedDestId, setSelectedDestId] = useState<number | null>(null);
  const [tripPlan, setTripPlan] = useState<FullTripPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMsg, setLoadingMsg] = useState<string>('');

  // Handle Wizard Submit -> Trigger Recommendations API
  const handleWizardSubmit = async (req: TripRequirement) => {
    setRequirement(req);
    setLoading(true);
    setLoadingMsg("Evaluating destination recommendation scores & seasonal crowd match...");
    try {
      const resp = await api.post('/recommendations', req);
      setRecommendations(resp.data);
      setCurrentTab('discovery');
    } catch (err) {
      console.error("Recommendations API error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Golden Path Preset Click from Landing Page
  const handleGoldenPathDemo = async (presetReq: TripRequirement) => {
    setRequirement(presetReq);
    setLoading(true);
    setLoadingMsg("Running sample journey demonstration (Vijayawada 4-Day Journey)...");
    try {
      const resp = await api.post('/recommendations', presetReq);
      setRecommendations(resp.data);
      setCurrentTab('discovery');
    } catch (err) {
      console.error("Golden Path API error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Select Destination -> View Detail Page
  const handleSelectDestination = (destId: number) => {
    setSelectedDestId(destId);
    setCurrentTab('detail');
  };

  const handleDestinationLoaded = (dest: Destination) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(d => d.id !== dest.id);
      const next = [dest, ...filtered].slice(0, 6);
      localStorage.setItem('safar_recently_viewed', JSON.stringify(next));
      return next;
    });
  };

  // Generate Itinerary -> Trigger Plan Preview API
  const handleGenerateItinerary = async (destId: number) => {
    setLoading(true);
    setLoadingMsg("Optimizing day-wise schedule, opening hours & route sequence...");
    try {
      const resp = await api.post('/trips/plan-preview', {
        origin: requirement.origin,
        destination_id: destId,
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
        custom_places: addedPlaces.map(p => ({
          place_id: p.place_id,
          name: p.name,
          category: p.category,
          lat: p.lat,
          lng: p.lng,
          address: p.address,
        })),
      });
      setTripPlan(resp.data);
      setCurrentTab('itinerary');
    } catch (err) {
      console.error("Itinerary generation error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-100 flex flex-col justify-between">
      <div>
        <Navbar 
          currentTab={currentTab} 
          onNavigate={(tab) => setCurrentTab(tab)} 
          onOpenAuth={() => setShowAuthModal(true)} 
        />

        <main className="transition-all duration-300">
          {loading ? (
            <LoadingScreen messageOverride={loadingMsg} />
          ) : (
            <>
              {currentTab === 'landing' && (
                <LandingPage 
                  activeLocation={activeLocation}
                  onLocationChange={handleActiveLocationChange}
                  initialRequirement={requirement}
                  onPlanTrip={handleWizardSubmit}
                  onSelectDestination={handleSelectDestination}
                  onOpenPlacesDiscovery={() => setCurrentTab('places')}
                  onOpenPlaceDetail={(place) => {
                    setSelectedPlace(place);
                    setCurrentTab('place-detail');
                  }}
                  addedPlaces={addedPlaces}
                  onToggleAddPlace={handleToggleAddPlace}
                  recentlyViewed={recentlyViewed}
                  onSelectSavedTrip={(plan) => {
                    setTripPlan(plan);
                    setCurrentTab('itinerary');
                  }}
                  onOpenAuth={() => setShowAuthModal(true)}
                  onNavigateToExplore={() => setCurrentTab('explore')}
                />
              )}

              {currentTab === 'explore' && (
                <ExploreIndiaPage
                  onSelectDestination={handleSelectDestination}
                  onExploreNearby={(loc) => {
                    handleActiveLocationChange(loc);
                    setCurrentTab('places');
                  }}
                  onPlanTrip={(destName, stateName, lat, lng) => {
                    handleActiveLocationChange({
                      name: destName,
                      display_name: `${destName}, ${stateName}, India`,
                      lat,
                      lng,
                      radius_km: 25,
                    });
                    setRequirement(prev => ({
                      ...prev,
                      origin: activeLocation.name || 'Vijayawada',
                    }));
                    setCurrentTab('wizard');
                  }}
                />
              )}

              {currentTab === 'wizard' && (
                <OnboardingWizard 
                  initialRequirement={requirement}
                  onSubmit={handleWizardSubmit}
                />
              )}

              {currentTab === 'places' && (
                <LocationDiscoveryPage
                  activeLocation={activeLocation}
                  onLocationChange={handleActiveLocationChange}
                  addedPlaces={addedPlaces}
                  onToggleAddPlace={handleToggleAddPlace}
                  onOpenPlaceDetail={(place) => {
                    setSelectedPlace(place);
                    setCurrentTab('place-detail');
                  }}
                  onPlanTripFromLocation={() => handleWizardSubmit({ ...requirement, origin: activeLocation.name })}
                />
              )}

              {currentTab === 'place-detail' && selectedPlace && (
                <PlaceDetailPage
                  initialPlace={selectedPlace}
                  activeLocation={activeLocation}
                  isAdded={addedPlaces.some(p => p.place_id === selectedPlace.place_id)}
                  onToggleAdd={handleToggleAddPlace}
                  onBack={() => setCurrentTab('places')}
                />
              )}

              {currentTab === 'discovery' && (
                <RecommendationsPage 
                  recommendations={recommendations}
                  requirement={requirement}
                  onSelectDestination={handleSelectDestination}
                  onModifySearch={() => setCurrentTab('wizard')}
                  onRadiusChange={(newRadius) => handleWizardSubmit({ ...requirement, radius_km: newRadius })}
                />
              )}

              {currentTab === 'detail' && selectedDestId && (
                <DestinationDetailPage 
                  destId={selectedDestId}
                  onBack={() => setCurrentTab('explore')}
                  onGenerateItinerary={handleGenerateItinerary}
                  onDestinationLoaded={handleDestinationLoaded}
                  onExploreNearby={(loc) => {
                    handleActiveLocationChange(loc);
                    setCurrentTab('places');
                  }}
                />
              )}

              {currentTab === 'itinerary' && tripPlan && (
                <ItineraryViewPage 
                  tripPlan={tripPlan}
                  requirement={requirement}
                  onBack={() => setCurrentTab('discovery')}
                  onTripSaved={() => {
                    // Navigate to user dashboard after save
                    setCurrentTab('dashboard');
                  }}
                  onRequireAuth={() => setShowAuthModal(true)}
                />
              )}

              {currentTab === 'dashboard' && (
                <UserDashboardPage 
                  onSelectTrip={(plan) => {
                    setTripPlan(plan);
                    setCurrentTab('itinerary');
                  }}
                  onPlanNew={() => setCurrentTab('wizard')}
                />
              )}

              {currentTab === 'admin' && (
                <AdminDashboardPage />
              )}
            </>
          )}
        </main>
      </div>

      <Footer />

      {showAuthModal && (
        <AuthPage 
          onSuccess={() => setShowAuthModal(false)}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
};
