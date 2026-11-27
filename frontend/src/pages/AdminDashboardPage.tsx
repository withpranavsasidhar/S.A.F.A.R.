import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { AdminAnalytics, User, FeedbackItem, Destination } from '../types';
import { LoadingScreen } from '../components/LoadingScreen';
import { Shield, Users, Database, TrendingUp, Plus, Trash2, Edit, MessageSquare, MapPin } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'destinations' | 'feedback'>('analytics');

  // Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDestName, setNewDestName] = useState('');
  const [newDestState, setNewDestState] = useState('');
  const [newDestCategory, setNewDestCategory] = useState('Nature');
  const [newDestCost, setNewDestCost] = useState('2500');
  const [newDestImg, setNewDestImg] = useState('https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?q=80&w=800&auto=format&fit=crop');
  const [newDestDesc, setNewDestDesc] = useState('Scenic hill station destination.');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [analyticsResp, usersResp, feedbackResp, destResp] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/users'),
        api.get('/admin/feedback'),
        api.get('/destinations')
      ]);
      setAnalytics(analyticsResp.data);
      setUsersList(usersResp.data);
      setFeedbackList(feedbackResp.data);
      setDestinations(destResp.data);
    } catch (err) {
      console.error("Admin data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: newDestName,
        region: "South India",
        state: newDestState,
        category: newDestCategory,
        description: newDestDesc,
        rating: 4.7,
        base_daily_cost: parseFloat(newDestCost),
        image_url: newDestImg,
        latitude: 17.5000,
        longitude: 82.5000,
        best_months: "Oct - Feb",
        tags: `${newDestCategory}, Scenic`
      };
      await api.post('/admin/destinations', payload);
      setShowAddModal(false);
      fetchAdminData();
    } catch (err) {
      console.error("Create destination error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDestination = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this destination?")) return;
    try {
      await api.delete(`/admin/destinations/${id}`);
      setDestinations(destinations.filter(d => d.id !== id));
    } catch (err) {
      console.error("Delete destination error:", err);
    }
  };

  if (loading) {
    return <LoadingScreen messageOverride="Loading Admin Command Center analytics & controls..." />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-6 px-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900/30 via-gray-900 to-gray-900 p-6 sm:p-8 rounded-3xl border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold">
              ADMINISTRATIVE CONTROL PANEL
            </span>
          </div>
          <h1 className="text-3xl font-black text-white">S.A.F.A.R. Research & Data Portal</h1>
          <p className="text-xs text-gray-400">Manage destinations, attractions, tourism datasets, user accounts, and model analytics.</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-extrabold text-xs transition-all shadow-lg flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Destination
        </button>
      </div>

      {/* Admin Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
        {[
          { id: 'analytics', label: 'Analytics & Metrics', icon: TrendingUp },
          { id: 'destinations', label: `Manage Destinations (${destinations.length})`, icon: Database },
          { id: 'users', label: `User Accounts (${usersList.length})`, icon: Users },
          { id: 'feedback', label: `Feedback Stream (${feedbackList.length})`, icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === tab.id 
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                  : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Analytics */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-8">
          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-900/80 p-6 rounded-2xl border border-gray-800 space-y-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">TOTAL REGISTERED USERS</span>
              <div className="text-3xl font-black text-white">{analytics.metrics.total_users}</div>
            </div>

            <div className="bg-gray-900/80 p-6 rounded-2xl border border-gray-800 space-y-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">SEEDED DESTINATIONS</span>
              <div className="text-3xl font-black text-amber-400">{analytics.metrics.total_destinations}</div>
            </div>

            <div className="bg-gray-900/80 p-6 rounded-2xl border border-gray-800 space-y-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">TRIPS GENERATED</span>
              <div className="text-3xl font-black text-emerald-400">{analytics.metrics.total_trips_generated}</div>
            </div>

            <div className="bg-gray-900/80 p-6 rounded-2xl border border-gray-800 space-y-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ML MODEL EVALUATION</span>
              <div className="text-sm font-bold text-purple-300">{analytics.metrics.ml_model_accuracy}</div>
            </div>
          </div>

          {/* Popular Destinations Table */}
          <div className="bg-gray-900/80 p-6 rounded-3xl border border-gray-800 space-y-4">
            <h3 className="text-base font-bold text-white">Popular Destinations by User Saves</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-300">
                <thead className="bg-gray-950 text-gray-400 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-3">Destination</th>
                    <th className="p-3">State</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Rating</th>
                    <th className="p-3">Saved Trips</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850">
                  {analytics.popular_destinations.map((pop) => (
                    <tr key={pop.id} className="hover:bg-gray-850/50">
                      <td className="p-3 font-bold text-white">{pop.name}</td>
                      <td className="p-3">{pop.state}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-800 text-amber-400">{pop.category}</span></td>
                      <td className="p-3">★ {pop.rating}</td>
                      <td className="p-3 font-bold text-emerald-400">{pop.saved_trips_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Destinations Management */}
      {activeTab === 'destinations' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((dest) => (
            <div key={dest.id} className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="font-extrabold text-base text-white">{dest.name}</h4>
                <button
                  onClick={() => handleDeleteDestination(dest.id)}
                  className="p-1.5 rounded text-gray-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400">{dest.state} • ₹{dest.base_daily_cost}/day</p>
              <div className="text-[11px] text-gray-500 font-mono">
                Tags: {dest.tags}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: User Accounts */}
      {activeTab === 'users' && (
        <div className="bg-gray-900/80 p-6 rounded-3xl border border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-300">
              <thead className="bg-gray-950 text-gray-400 font-mono text-[10px] uppercase">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Home Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850">
                {usersList.map((u) => (
                  <tr key={u.id}>
                    <td className="p-3 font-mono">{u.id}</td>
                    <td className="p-3 font-bold text-white">{u.full_name}</td>
                    <td className="p-3 text-amber-300">{u.email}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded font-bold ${u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-800 text-gray-300'}`}>{u.role}</span></td>
                    <td className="p-3">{u.home_location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Feedback Stream */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          {feedbackList.map((fb) => (
            <div key={fb.id} className="bg-gray-900 p-5 rounded-2xl border border-gray-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">{fb.user_name}</span>
                <span className="text-amber-400">Rating: {'★'.repeat(fb.rating)}</span>
              </div>
              <p className="text-xs text-gray-300">"{fb.comments}"</p>
            </div>
          ))}
        </div>
      )}

      {/* Add Destination Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Add New Destination</h3>
            <form onSubmit={handleCreateDestination} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 mb-1">Destination Name</label>
                <input type="text" required value={newDestName} onChange={e=>setNewDestName(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">State</label>
                <input type="text" required value={newDestState} onChange={e=>setNewDestState(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Base Daily Cost (₹)</label>
                <input type="number" required value={newDestCost} onChange={e=>setNewDestCost(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setShowAddModal(false)} className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-purple-500 text-black font-bold">{submitting ? 'Creating...' : 'Add Destination'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
