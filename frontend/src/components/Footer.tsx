import React from 'react';
import { Compass, Cpu, Database, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#080b11] border-t border-gray-800 text-gray-400 py-12 px-4 sm:px-6 lg:px-8 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Compass className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-lg font-bold text-white tracking-wider">S.A.F.A.R.</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            AI-Powered Predictive Tourism Planning and Personalized Travel Optimization System.
          </p>
          <div className="flex items-center gap-2 text-xs text-amber-400/80 font-mono bg-amber-500/5 p-2 rounded border border-amber-500/20">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            AI-Powered Travel Intelligence Platform
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-200 uppercase tracking-wider mb-4">Core Research Modules</h4>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center gap-2"><Cpu className="w-3.5 h-3.5 text-amber-400" /> Tourism Demand Forecasting</li>
            <li className="flex items-center gap-2"><Database className="w-3.5 h-3.5 text-amber-400" /> Budget-First Allocation Engine</li>
            <li className="flex items-center gap-2"><Compass className="w-3.5 h-3.5 text-amber-400" /> Day-Wise Itinerary Optimizer</li>
            <li className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Peak/Off-Peak Intelligence</li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-200 uppercase tracking-wider mb-4">Demo Credentials</h4>
          <div className="space-y-2 text-xs bg-gray-900/60 p-3 rounded-lg border border-gray-800">
            <div>
              <span className="text-gray-400 block text-[10px]">USER LOGIN:</span>
              <code className="text-amber-300">user@safar.ai</code> / <code className="text-gray-300">user123</code>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">ADMIN LOGIN:</span>
              <code className="text-purple-300">admin@safar.ai</code> / <code className="text-gray-300">admin123</code>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-200 uppercase tracking-wider mb-4">Project Information</h4>
          <p className="text-xs text-gray-400 leading-relaxed mb-3">
            Built with React, FastAPI, Scikit-learn, and SQLite/PostgreSQL. Designed for real-world travel intelligence use cases.
          </p>
          <span className="text-[11px] text-gray-400 font-mono block">
            © 2026 S.A.F.A.R. Travel Intelligence. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
};
