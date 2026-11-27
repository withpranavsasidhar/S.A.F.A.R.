import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BudgetBreakdown } from '../types';
import { Wallet, ShieldAlert, AlertTriangle, Info, HelpCircle } from 'lucide-react';

interface BudgetDonutProps {
  budget: BudgetBreakdown;
  totalBudget: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

export const BudgetDonut: React.FC<BudgetDonutProps> = ({ budget, totalBudget }) => {
  const [showExplanation, setShowExplanation] = useState(false);

  // Use separated categories when available, fallback gracefully
  const data = [
    {
      name: 'Intercity Transport',
      value: budget.transport_cost,
      key: 'transport',
      note: budget.cost_explanation?.transport,
    },
    {
      name: 'Accommodation',
      value: budget.stay_cost,
      key: 'accommodation',
      note: budget.cost_explanation?.accommodation,
    },
    {
      name: 'Food & Dining',
      value: budget.food_cost,
      key: 'food',
      note: budget.cost_explanation?.food,
    },
    {
      name: 'Entry Tickets',
      value: budget.entry_ticket_cost ?? 0,
      key: 'entry_tickets',
      note: budget.cost_explanation?.entry_tickets,
    },
    {
      name: 'Activities & Tours',
      value: budget.activity_cost,
      key: 'activities',
      note: budget.cost_explanation?.activities,
    },
    {
      name: 'Local Travel / Cabs',
      value: budget.local_travel_cost ?? budget.misc_cost,
      key: 'local_travel',
      note: budget.cost_explanation?.local_travel,
    },
    {
      name: 'Contingency Reserve',
      value: budget.contingency_cost ?? budget.buffer_amount,
      key: 'contingency',
      note: budget.cost_explanation?.contingency,
    },
  ].filter((item) => item.value > 0);

  const isOver = budget.is_over_budget || budget.remaining_budget < 0;
  const overAmount = budget.over_budget_amount || (isOver ? Math.abs(budget.remaining_budget) : 0);

  return (
    <div className="bg-gray-900/80 backdrop-blur-md p-6 rounded-3xl border border-gray-800 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 pb-4 gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Itemized Budget Allocation
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Transparent Estimates
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              Deterministic calculations based on actual itinerary stops, transit distance, and hotel tiers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-[10px] text-gray-400 font-medium uppercase">BUDGET ENVELOPE</div>
            <div className="text-lg font-black text-amber-400">₹{totalBudget.toLocaleString()}</div>
          </div>
          {budget.per_person_cost && (
            <div className="border-l border-gray-800 pl-4 text-left">
              <div className="text-[10px] text-gray-400 font-medium uppercase">PER PERSON</div>
              <div className="text-sm font-bold text-gray-200">₹{budget.per_person_cost.toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Donut Chart */}
        <div className="h-60 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem' }}
                formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Estimated']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">TOTAL EST.</span>
            <span className="text-lg font-black text-white">₹{budget.total_estimated.toLocaleString()}</span>
          </div>
        </div>

        {/* Categories breakdown */}
        <div className="space-y-2 text-xs">
          {data.map((item, idx) => (
            <div
              key={item.name}
              className="flex items-center justify-between p-2 rounded-xl bg-gray-950/70 border border-gray-800"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="font-medium text-gray-300 truncate">{item.name}</span>
              </div>
              <span className="font-bold text-gray-100 shrink-0">₹{item.value.toLocaleString()}</span>
            </div>
          ))}

          {/* Remaining or Over-Budget Highlight */}
          <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-xs">
            {isOver ? (
              <>
                <span className="text-red-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Amount Over Budget:
                </span>
                <span className="font-black text-red-400 text-sm">
                  ₹{overAmount.toLocaleString()}
                </span>
              </>
            ) : (
              <>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  Remaining Buffer Fund:
                </span>
                <span className="font-black text-emerald-400 text-sm">
                  ₹{budget.remaining_budget.toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Transparent Assumption Explanations Toggle */}
      {budget.cost_explanation && Object.keys(budget.cost_explanation).length > 0 && (
        <div className="pt-2 border-t border-gray-800">
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showExplanation ? 'Hide Transparent Basis & Assumptions' : 'View Transparent Cost Assumptions & Basis'}
          </button>

          {showExplanation && (
            <div className="mt-3 p-4 rounded-2xl bg-gray-950/90 border border-gray-800 space-y-2 text-xs text-gray-300">
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-amber-400" /> Calculation Assumptions
              </div>
              <ul className="space-y-1.5">
                {Object.entries(budget.cost_explanation).map(([k, text]) => (
                  <li key={k} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold capitalize">• {k.replace('_', ' ')}:</span>
                    <span className="text-gray-400">{text}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-gray-500 pt-1">
                Note: Exact charges may vary by seasonal vendor fluctuations; all values are estimated based on regional baseline data.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
