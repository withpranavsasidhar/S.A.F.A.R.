import React, { useState, useEffect } from 'react';
import { Compass, Sparkles, Cpu, MapPin, Calculator, Calendar } from 'lucide-react';

const LOADING_MESSAGES = [
  { text: "Reading regional travel patterns...", icon: Compass },
  { text: "Analyzing seasonal demand & peak/off-peak windows...", icon: Calendar },
  { text: "Evaluating budget constraints & transit matrix...", icon: Calculator },
  { text: "Finding destinations matching your travel style...", icon: Sparkles },
  { text: "Optimizing day-wise attraction sequences & routes...", icon: MapPin },
  { text: "Finalizing your S.A.F.A.R. travel intelligence report...", icon: Cpu },
];

export const LoadingScreen: React.FC<{ messageOverride?: string }> = ({ messageOverride }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const currentStep = LOADING_MESSAGES[step];
  const StepIcon = currentStep.icon;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      {/* Animated Radar/Compass Graphic */}
      <div className="relative mb-8 flex items-center justify-center">
        <div className="w-28 h-28 rounded-full border-2 border-amber-500/20 animate-ping absolute" />
        <div className="w-24 h-24 rounded-full border border-amber-500/30 animate-spin-slow absolute border-t-amber-500" />
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/20 z-10">
          <Compass className="w-10 h-10 text-black animate-pulse" />
        </div>
      </div>

      {/* Message & Indicator */}
      <div className="max-w-md space-y-3">
        <div className="flex items-center justify-center gap-2 text-amber-400 font-medium text-base animate-fade-in">
          <StepIcon className="w-5 h-5 text-amber-400 animate-spin" />
          <span>{messageOverride || currentStep.text}</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden border border-gray-700">
          <div 
            className="bg-gradient-to-r from-amber-500 to-amber-300 h-1.5 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${((step + 1) / LOADING_MESSAGES.length) * 100}%` }}
          />
        </div>

        <p className="text-xs text-gray-400 font-mono tracking-wider pt-2">
          S.A.F.A.R. AI INTELLIGENCE ENGINE V2.0
        </p>
      </div>
    </div>
  );
};
