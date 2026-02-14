
import React, { useState } from 'react';
import { PlanTier } from '../types.ts';

interface SubscriptionViewProps {
  currentPlan: PlanTier;
  onBack: () => void;
  onSelectPlan: (plan: PlanTier) => void;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ currentPlan, onBack, onSelectPlan }) => {
  const [view, setView] = useState<'Basic' | 'Pro'>('Basic');
  const [proBilling, setProBilling] = useState<'Monthly' | 'Yearly'>('Monthly');

  const EnergyIcon = () => (
    <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center shrink-0">
      <svg className="w-5 h-5 text-[#007AFF]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    </div>
  );

  const FeatureItem = ({ text, bold = false }: { text: string; bold?: boolean }) => (
    <div className="flex items-center space-x-4 py-1">
      <svg className="w-5 h-5 text-[#34C759]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className={`text-[16px] ${bold ? 'font-bold text-black' : 'font-medium text-black/70'}`}>{text}</span>
    </div>
  );

  const renderBasic = () => (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="px-6 pt-10">
        {/* Title Area */}
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-black text-black tracking-tight">VIB订阅计划</h1>
        </div>

        {/* Switcher Area */}
        <div className="bg-black/5 rounded-2xl p-1.5 flex mb-10 border border-black/[0.03]">
          <button 
            onClick={() => setView('Basic')}
            className={`flex-1 py-3 rounded-[12px] text-[14px] font-bold transition-all ${view === 'Basic' ? 'bg-white text-black shadow-sm' : 'text-black/40'}`}
          >
            Basic Membership
          </button>
          <button 
            onClick={() => setView('Pro')}
            className={`flex-1 py-3 rounded-[12px] text-[14px] font-bold transition-all ${view === 'Pro' ? 'bg-white text-black shadow-sm' : 'text-black/40'}`}
          >
            Pro Membership
          </button>
        </div>

        {/* Description Area */}
        <div className="bg-white rounded-[28px] p-6 border border-black/[0.05] shadow-sm space-y-4">
          <div className="flex items-center space-x-3 mb-2">
            <EnergyIcon />
            <span className="text-[20px] font-black text-black">100/day</span>
          </div>
          <div className="h-px bg-black/[0.05] w-full"></div>
          <FeatureItem text="20 Private Agents" bold />
          <FeatureItem text="10 Points Everyday Login" bold />
        </div>
      </div>

      <div className="mt-auto px-6 pb-12">
        {/* Label Area (Changed from button to read-only label) */}
        <div 
          className="w-full py-5 bg-[#E5E5EA] text-black/30 font-bold rounded-[24px] text-[18px] text-center select-none"
        >
          Current Level
        </div>
      </div>
    </div>
  );

  const renderPro = () => (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="px-6 pt-10">
        {/* Title Area */}
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-black text-[#F2994A] tracking-tight">Pro Membership</h1>
        </div>

        {/* Description Area */}
        <div className="bg-white rounded-[28px] p-6 border border-black/[0.05] shadow-sm space-y-4 mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <EnergyIcon />
            <span className="text-[20px] font-black text-black">Unlimited</span>
          </div>
          <div className="h-px bg-black/[0.05] w-full"></div>
          <FeatureItem text="Unlimited Private Agents" bold />
          <FeatureItem text="500 Points Everyday Login" bold />
          <FeatureItem text="Premium Badge" bold />
        </div>

        {/* Payment Plan Area */}
        <div className="flex flex-col items-center">
          <div className="bg-black/5 rounded-2xl p-1.5 flex w-full mb-6 border border-black/[0.03]">
            <button 
              onClick={() => setProBilling('Monthly')}
              className={`flex-1 py-3 rounded-[12px] text-[14px] font-bold transition-all ${proBilling === 'Monthly' ? 'bg-white text-black shadow-sm' : 'text-black/40'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setProBilling('Yearly')}
              className={`flex-1 py-3 rounded-[12px] text-[14px] font-bold transition-all ${proBilling === 'Yearly' ? 'bg-white text-black shadow-sm' : 'text-black/40'}`}
            >
              Yearly
            </button>
          </div>
          <p className="text-center text-[15px] font-medium text-black/60 leading-relaxed">
            {proBilling === 'Monthly' 
              ? "Billed monthly at 19.99$.\nCancel anytime." 
              : "Billed monthly at 167.9$.\nCancel anytime."}
          </p>
        </div>
      </div>

      <div className="mt-auto px-6 pb-8">
        {/* Button Area */}
        <button 
          onClick={() => onSelectPlan('Pro')}
          className="w-full py-5 bg-[#007AFF] text-white font-bold rounded-[24px] text-[18px] shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
        >
          Upgrade to Pro
        </button>

        <div className="mt-6 flex flex-col items-center space-y-3">
          <p className="text-[12px] font-medium text-black/30">Terms & Conditions | Privacy Policy</p>
          <button className="text-[14px] font-bold text-[#007AFF] active:opacity-60 transition-opacity">Restore</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] text-black relative select-none">
      {/* Back Button */}
      <div className="h-14 flex items-center px-4 relative z-50">
        <button 
          onClick={onBack} 
          className="w-10 h-10 flex items-center justify-center bg-white rounded-full border border-black/[0.05] shadow-sm active:scale-90 transition-transform"
        >
          <svg className="w-5 h-5 text-black/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {view === 'Basic' ? renderBasic() : renderPro()}
      </div>
    </div>
  );
};

export default SubscriptionView;
