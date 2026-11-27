import React, { useState } from 'react';
import { User, Shield, Key, Mail, Lock, Sparkles, ArrowRight, Compass } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface AuthPageProps {
  onSuccess: () => void;
  onClose: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, onClose }) => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [homeLocation, setHomeLocation] = useState('Vijayawada');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fillDemoUser = () => {
    setEmail('user@safar.ai');
    setPassword('user123');
    setIsLogin(true);
  };

  const fillDemoAdmin = () => {
    setEmail('admin@safar.ai');
    setPassword('admin123');
    setIsLogin(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !/\S+@\S+\.\S+/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (!isLogin && fullName.trim().length < 2) {
      setError("Full name must be at least 2 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      if (isLogin) {
        const resp = await api.post('/auth/login', { email: cleanEmail, password });
        const data = resp.data;
        const userObj = {
          id: data.user_id,
          full_name: data.full_name,
          email: cleanEmail,
          role: data.role as 'USER' | 'ADMIN',
          home_location: homeLocation
        };
        login(data.access_token, userObj);
        onSuccess();
      } else {
        const resp = await api.post('/auth/register', {
          full_name: fullName.trim(),
          email: cleanEmail,
          password,
          home_location: homeLocation.trim() || 'Vijayawada'
        });
        const data = resp.data;
        const userObj = {
          id: data.user_id,
          full_name: data.full_name,
          email: cleanEmail,
          role: data.role as 'USER' | 'ADMIN',
          home_location: homeLocation.trim() || 'Vijayawada'
        };
        login(data.access_token, userObj);
        onSuccess();
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg || d).join(', '));
      } else {
        setError(detail || "Authentication failed. Please verify credentials.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Compass className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-white tracking-wider">S.A.F.A.R. AUTH</span>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm px-2 py-1 rounded bg-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Demo Fast Fill Pill Buttons */}
        <div className="space-y-2">
          <div className="text-[10px] text-gray-400 uppercase font-semibold">PRE-FILLED DEMO ACCOUNTS:</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={fillDemoUser}
              className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              Demo User
            </button>
            <button
              onClick={fillDemoAdmin}
              className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold hover:bg-purple-500/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              Demo Admin
            </button>
          </div>
        </div>

        {/* Form Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aditi Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Home Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vijayawada"
                  value={homeLocation}
                  onChange={(e) => setHomeLocation(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="user@safar.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            {submitting ? 'Authenticating...' : isLogin ? 'Sign In to S.A.F.A.R.' : 'Create Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-amber-400 hover:underline"
          >
            {isLogin ? "Don't have an account? Register here" : "Already registered? Login here"}
          </button>
        </div>
      </div>
    </div>
  );
};
