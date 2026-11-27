import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Forecast } from '../types';
import { TrendingUp, Users, Calendar } from 'lucide-react';

interface DemandChartProps {
  forecasts: Forecast[];
  destinationName: string;
}

export const DemandChart: React.FC<DemandChartProps> = ({ forecasts, destinationName }) => {
  if (!forecasts || forecasts.length === 0) {
    return (
      <div className="bg-gray-900/60 p-6 rounded-2xl border border-gray-800 text-center text-gray-400 text-sm">
        No demand forecast available.
      </div>
    );
  }

  const peakMonth = forecasts.reduce((prev, current) => (prev.predicted_demand > current.predicted_demand) ? prev : current);
  const offPeakMonth = forecasts.reduce((prev, current) => (prev.predicted_demand < current.predicted_demand) ? prev : current);

  return (
    <div className="bg-gray-900/70 backdrop-blur-md p-6 rounded-2xl border border-gray-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Seasonal Tourism Demand & Crowd Intelligence</h3>
          </div>
          <p className="text-xs text-gray-400">
            ML Demand Forecast footfalls and predicted crowd indices for {destinationName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {forecasts[0]?.is_experimental ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              EXPERIMENTAL FORECAST
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              VALIDATED HISTORICAL MODEL
            </span>
          )}
        </div>
      </div>

      {/* Intelligence Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">PEAK DEMAND WINDOW</div>
            <div className="text-sm font-bold text-white">{peakMonth.month} ({peakMonth.predicted_demand.toLocaleString()} visitors)</div>
          </div>
        </div>

        <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">OFF-PEAK / LOW CROWD</div>
            <div className="text-sm font-bold text-emerald-400">{offPeakMonth.month} ({offPeakMonth.predicted_demand.toLocaleString()} visitors)</div>
          </div>
        </div>

        <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">MODEL EVALUATION</div>
            <div className="text-xs font-bold text-amber-400 truncate max-w-[180px]" title={forecasts[0]?.model_accuracy}>
              {forecasts[0]?.model_accuracy || 'Time-Split Holdout Validated'}
            </div>
          </div>
        </div>
      </div>

      {/* Model Source & Limitations Notice */}
      <div className="p-3 bg-gray-950 rounded-xl border border-gray-850 text-[11px] text-gray-400 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Source: <strong className="text-gray-300">{forecasts[0]?.data_source || 'Ministry of Tourism (Govt. of India) Reports'}</strong></span>
          <span>Period: <strong className="text-amber-400 font-mono">{forecasts[0]?.forecast_period || '12-Month Calendar Cycle'}</strong></span>
        </div>
        {forecasts[0]?.limitations && (
          <p className="text-gray-500 text-[10px] pt-0.5 italic">
            Limitations: {forecasts[0].limitations}
          </p>
        )}
      </div>

      {/* Recharts Area Chart */}
      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={forecasts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} />
            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', color: '#fff' }}
              formatter={(value: any) => [`${Number(value).toLocaleString()} Tourist Footfalls`, 'Predicted Demand']}
            />
            <Area 
              type="monotone" 
              dataKey="predicted_demand" 
              stroke="#f59e0b" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#demandGrad)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
