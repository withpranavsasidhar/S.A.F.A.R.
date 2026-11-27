import React from 'react';
import { Compass, Sparkles, User as UserIcon, Shield, LogOut, Bookmark, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate, onOpenAuth }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-[#0b0f17]/90 backdrop-blur-md border-b border-gray-800 text-white transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Compass className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-amber-400">
                  S.A.F.A.R.
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium tracking-tight">
                Predictive Tourism & Travel Optimization
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onNavigate('landing')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'landing' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => onNavigate('explore')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                currentTab === 'explore' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold' : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Compass className="w-4 h-4 text-blue-400" />
              Explore India
            </button>
            <button
              onClick={() => onNavigate('places')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'places' || currentTab === 'place-detail'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              Nearby Places
            </button>
            <button
              onClick={() => onNavigate('wizard')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                currentTab === 'wizard' || currentTab === 'discovery' || currentTab === 'itinerary' 
                  ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Plan Journey
            </button>

            {isAuthenticated && (
              <button
                onClick={() => onNavigate('dashboard')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                  currentTab === 'dashboard' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <Bookmark className="w-4 h-4 text-amber-400" />
                My Saved Trips
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-all ${
                  currentTab === 'admin' ? 'ring-2 ring-purple-500/50' : ''
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin Panel
              </button>
            )}
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="font-semibold text-gray-200 leading-tight">{user?.full_name}</p>
                    <p className="text-[10px] text-amber-400 font-mono">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white text-sm font-medium border border-gray-700 transition-all flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4 text-amber-400" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
