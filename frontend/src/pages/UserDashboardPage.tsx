import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { FullTripPlan, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Bookmark, Calendar, MapPin, Trash2, ArrowRight, Compass, Sparkles, 
  User as UserIcon, Edit3, Check, X, Shield, Clock, AlertTriangle, Layers,
  ChevronDown
} from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';

interface UserDashboardPageProps {
  onSelectTrip: (plan: FullTripPlan) => void;
  onPlanNew: () => void;
}

export const UserDashboardPage: React.FC<UserDashboardPageProps> = ({ onSelectTrip, onPlanNew }) => {
  const { user, updateUser } = useAuth();
  const [trips, setTrips] = useState<FullTripPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UPCOMING' | 'SAVED' | 'COMPLETED'>('ALL');

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState(user?.full_name || '');
  const [editHomeLocation, setEditHomeLocation] = useState(user?.home_location || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Trip Title Inline Edit State
  const [editingTripId, setEditingTripId] = useState<number | null>(null);
  const [editingTripTitle, setEditingTripTitle] = useState('');

  // Delete Confirmation Modal State
  const [tripToDelete, setTripToDelete] = useState<FullTripPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, []);

  useEffect(() => {
    if (user) {
      setEditFullName(user.full_name);
      setEditHomeLocation(user.home_location);
    }
  }, [user]);

  const fetchTrips = async () => {
    try {
      const resp = await api.get('/trips');
      setTrips(resp.data);
    } catch (err) {
      console.error("Error fetching user trips:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) {
      setProfileMsg({ text: "Name cannot be empty", error: true });
      return;
    }
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const resp = await api.put('/auth/me', {
        full_name: editFullName.trim(),
        home_location: editHomeLocation.trim() || 'Vijayawada'
      });
      updateUser(resp.data);
      setIsEditingProfile(false);
      setProfileMsg({ text: "Profile updated successfully!", error: false });
      setTimeout(() => setProfileMsg(null), 3500);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setProfileMsg({ text: err.response?.data?.detail || "Failed to update profile", error: true });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdateTripStatus = async (tripId: number, newStatus: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    try {
      const resp = await api.put(`/trips/${tripId}`, { status: newStatus });
      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, status: resp.data.status } : t));
    } catch (err) {
      console.error("Failed to update trip status:", err);
    }
  };

  const handleSaveTripTitle = async (tripId: number, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!editingTripTitle.trim()) {
      setEditingTripId(null);
      return;
    }
    try {
      const resp = await api.put(`/trips/${tripId}`, { title: editingTripTitle.trim() });
      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, title: resp.data.title } : t));
      setEditingTripId(null);
    } catch (err) {
      console.error("Failed to update trip title:", err);
    }
  };

  const confirmDeleteTrip = async () => {
    if (!tripToDelete || !tripToDelete.id) return;
    setIsDeleting(true);
    try {
      await api.delete(`/trips/${tripToDelete.id}`);
      setTrips(prev => prev.filter(t => t.id !== tripToDelete.id));
      setTripToDelete(null);
    } catch (err) {
      console.error("Failed to delete trip:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <LoadingScreen messageOverride="Loading your personal travel command center..." />;
  }

  // Filtered trips
  const filteredTrips = trips.filter(t => {
    const st = (t.status || 'SAVED').toUpperCase();
    if (activeTab === 'ALL') return true;
    if (activeTab === 'UPCOMING') return st === 'UPCOMING';
    if (activeTab === 'SAVED') return st === 'SAVED';
    if (activeTab === 'COMPLETED') return st === 'COMPLETED';
    return true;
  });

  const countUpcoming = trips.filter(t => (t.status || '').toUpperCase() === 'UPCOMING').length;
  const countSaved = trips.filter(t => (t.status || 'SAVED').toUpperCase() === 'SAVED').length;
  const countCompleted = trips.filter(t => (t.status || '').toUpperCase() === 'COMPLETED').length;
  const totalBudgetManaged = trips.reduce((acc, t) => acc + (t.estimated_cost || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-6 px-4">
      {/* Profile & Command Center Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-amber-950/30 p-6 sm:p-8 rounded-3xl border border-gray-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black text-2xl flex-shrink-0 shadow-lg shadow-amber-500/10">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon className="w-8 h-8" />}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-extrabold uppercase tracking-wider">
                  Traveler Account
                </span>
                {user?.role === 'ADMIN' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Admin Authorized
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{user?.full_name || 'Traveler'}</h1>
              <p className="text-xs text-gray-400 flex items-center gap-3 flex-wrap">
                <span>Account: <strong className="text-gray-200">{user?.email}</strong></span>
                <span>•</span>
                <span>Home Base: <strong className="text-amber-400">{user?.home_location || 'Not set'}</strong></span>
                {user?.created_at && (
                  <>
                    <span>•</span>
                    <span className="text-gray-500 font-mono text-[11px]">
                      Member since {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center flex-wrap">
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs border border-gray-700 transition-all flex items-center gap-2"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              {isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}
            </button>
            <button
              onClick={onPlanNew}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" /> Plan New Journey
            </button>
          </div>
        </div>

        {/* Profile Edit Drawer / Form */}
        {isEditingProfile && (
          <form onSubmit={handleSaveProfile} className="bg-gray-950 p-5 rounded-2xl border border-gray-800 space-y-4 animate-in fade-in duration-200">
            <div className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-amber-400" /> Update Profile Information
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Home Location (Departure Point)</label>
                <input
                  type="text"
                  value={editHomeLocation}
                  onChange={(e) => setEditHomeLocation(e.target.value)}
                  placeholder="e.g. Vijayawada, Hyderabad"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={profileSaving}
                className="px-5 py-2 rounded-xl bg-amber-500 text-black font-extrabold text-xs shadow flex items-center gap-1.5"
              >
                {profileSaving ? 'Saving...' : <><Check className="w-3.5 h-3.5" /> Save Changes</>}
              </button>
            </div>
          </form>
        )}

        {profileMsg && (
          <div className={`p-3 rounded-xl text-xs font-medium ${profileMsg.error ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'}`}>
            {profileMsg.text}
          </div>
        )}

        {/* Dashboard Statistics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-gray-950/60 p-4 rounded-2xl border border-gray-800">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Trips</span>
            <span className="text-xl sm:text-2xl font-black text-white">{trips.length}</span>
          </div>
          <div className="bg-gray-950/60 p-4 rounded-2xl border border-gray-800">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Upcoming</span>
            <span className="text-xl sm:text-2xl font-black text-cyan-400">{countUpcoming}</span>
          </div>
          <div className="bg-gray-950/60 p-4 rounded-2xl border border-gray-800">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Saved Drafts</span>
            <span className="text-xl sm:text-2xl font-black text-amber-400">{countSaved}</span>
          </div>
          <div className="bg-gray-950/60 p-4 rounded-2xl border border-gray-800">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Est. Planned Budget</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400">₹{totalBudgetManaged.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'ALL' ? 'bg-amber-500 text-black shadow-md' : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'}`}
          >
            All Journeys ({trips.length})
          </button>
          <button
            onClick={() => setActiveTab('UPCOMING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'UPCOMING' ? 'bg-cyan-500 text-black shadow-md' : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'}`}
          >
            Upcoming ({countUpcoming})
          </button>
          <button
            onClick={() => setActiveTab('SAVED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'SAVED' ? 'bg-amber-500 text-black shadow-md' : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'}`}
          >
            Saved Plans ({countSaved})
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'COMPLETED' ? 'bg-emerald-500 text-black shadow-md' : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'}`}
          >
            Past Trips ({countCompleted})
          </button>
        </div>

        <span className="text-xs text-gray-500 font-mono">
          Showing {filteredTrips.length} {filteredTrips.length === 1 ? 'journey' : 'journeys'}
        </span>
      </div>

      {/* Trips Content */}
      {filteredTrips.length === 0 ? (
        <div className="bg-gray-900/60 p-12 rounded-3xl border border-gray-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Compass className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-white">
            {activeTab === 'ALL' ? 'No saved trips yet' : `No ${activeTab.toLowerCase()} journeys found`}
          </h4>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Plan your next journey with location-aware route scheduling, transparent daily budgets, and attraction clustering.
          </p>
          <button
            onClick={onPlanNew}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md transition-all"
          >
            Start Planning
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTrips.map((plan) => {
            const planStatus = (plan.status || 'SAVED').toUpperCase();
            const isEditingThis = editingTripId === plan.id;

            return (
              <div 
                key={plan.id}
                onClick={() => onSelectTrip(plan)}
                className="bg-gray-900/90 rounded-3xl p-6 border border-gray-800 hover:border-amber-500/40 transition-all cursor-pointer space-y-5 group relative shadow-md"
              >
                {/* Header Row */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {isEditingThis ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingTripTitle}
                          onChange={(e) => setEditingTripTitle(e.target.value)}
                          className="bg-gray-950 border border-amber-500 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:outline-none flex-1"
                          autoFocus
                        />
                        <button
                          onClick={(e) => handleSaveTripTitle(plan.id!, e)}
                          className="p-1.5 rounded-lg bg-amber-500 text-black hover:bg-amber-400"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingTripId(null); }}
                          className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-lg text-white group-hover:text-amber-400 transition-colors truncate">
                          {plan.title}
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTripId(plan.id!);
                            setEditingTripTitle(plan.title);
                          }}
                          title="Edit Trip Title"
                          className="p-1 rounded text-gray-500 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" /> 
                      {plan.destination?.name || 'Destination'}, {plan.destination?.state || 'India'}
                    </p>
                  </div>

                  {/* Status Dropdown / Badge */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={planStatus}
                      onChange={(e) => handleUpdateTripStatus(plan.id!, e.target.value, e)}
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none uppercase ${
                        planStatus === 'UPCOMING'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          : planStatus === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : planStatus === 'CANCELLED'
                          ? 'bg-gray-800 text-gray-400 border-gray-700'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      <option value="SAVED" className="bg-gray-900 text-amber-300">SAVED PLAN</option>
                      <option value="UPCOMING" className="bg-gray-900 text-cyan-300">UPCOMING</option>
                      <option value="COMPLETED" className="bg-gray-900 text-emerald-300">COMPLETED</option>
                      <option value="CANCELLED" className="bg-gray-900 text-gray-400">CANCELLED</option>
                    </select>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTripToDelete(plan);
                      }}
                      title="Delete Journey"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Dates & Quick Stats */}
                {(plan.start_date || plan.end_date) && (
                  <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono bg-cyan-950/30 px-3 py-1.5 rounded-xl border border-cyan-800/40">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {plan.start_date || 'Start Date'} → {plan.end_date || 'End Date'}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 bg-gray-950 p-3 rounded-2xl border border-gray-850 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">DURATION</span>
                    <span className="font-bold text-white">{plan.duration_days} Days</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">TRAVELERS</span>
                    <span className="font-bold text-white">{plan.travelers} Persons</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">EST. BUDGET</span>
                    <span className="font-bold text-emerald-400">₹{plan.estimated_cost?.toLocaleString()}</span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex justify-between items-center pt-1 text-xs">
                  <span className="text-gray-400 font-mono text-[10px]">
                    Created: {plan.created_at ? new Date(plan.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                  <span className="font-extrabold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Open & Continue Planning <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Delete Saved Journey?</h3>
                <p className="text-xs text-gray-400">This action will permanently remove this trip plan.</p>
              </div>
            </div>

            <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 text-xs text-gray-300">
              <strong>{tripToDelete.title}</strong>
              <div className="text-gray-400 text-[11px] mt-0.5">
                {tripToDelete.destination?.name} • {tripToDelete.duration_days} Days • ₹{tripToDelete.estimated_cost?.toLocaleString()}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTripToDelete(null)}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs transition-colors"
              >
                Keep Journey
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteTrip}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-red-600/20"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};