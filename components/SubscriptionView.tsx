
import React, { useState } from 'react';
import { PlanTier, BillingCycle } from '../types.ts';

interface SubscriptionViewProps {
  currentPlan: PlanTier;
  onBack: () => void;
  onSelectPlan: (plan: PlanTier) => void;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ currentPlan, onBack, onSelectPlan }) => {
  const [tier, setTier] = useState<PlanTier>('Plus');
  const [cycle, setCycle] = useState<BillingCycle>('Monthly');

  const plusFeatures = [
    "Agent无限制、即时、准确的回答",
    "任务完成次数每月300次"
  ];

  const proFeatures = [
    "Agent无限制、即时、准确的回答",
    "任务完成次数每月1000次",
    "优先体验高性能深度标注模型",
    "VIB Pro 独家开发者身份标识"
  ];

  const features = tier === 'Plus' ? plusFeatures : proFeatures;

  const getPriceData = () => {
    if (tier === 'Plus') {
      return [
        { cycle: 'Monthly', label: '包月', price: '9.9', oldPrice: '15.9', suffix: '/月' },
        { cycle: 'Quarterly', label: '季度', price: '17.99', oldPrice: '47.7', suffix: '/季', badge: '最热门' },
        { cycle: 'HalfYearly', label: '半年', price: '47.99', oldPrice: '95.4', suffix: '/半年', badge: '特惠' }
      ];
    } else {
      return [
        { cycle: 'Monthly', label: '包月', price: '19.9', oldPrice: '29.9', suffix: '/月' },
        { cycle: 'Quarterly', label: '季度', price: '49.99', oldPrice: '89.7', suffix: '/季', badge: '特惠' },
        { cycle: 'HalfYearly', label: '半年', price: '89.99', oldPrice: '179.4', suffix: '/半年', badge: '专业选' }
      ];
    }
  };

  const pricingOptions = getPriceData();

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] text-white overflow-y-auto animate-in slide-in-from-right-4 duration-300 pb-10">
      {/* Background Graphic Elements */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-[#1A1A1A] to-transparent pointer-events-none -z-10 overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 border border-white/[0.02] rotate-45 transform translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Header */}
      <div className="h-14 flex items-center px-4 shrink-0 mt-4">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full active:scale-90 transition-transform hover:bg-white/10">
           <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round"/></svg>
        </button>
      </div>

      <div className="px-6 flex flex-col items-center">
        {/* Title Area */}
        <h1 className="text-[30px] font-black text-white mt-6 tracking-tight">VIB 订阅计划</h1>

        {/* Plan Switcher Area */}
        <div className="w-full bg-white/5 rounded-full p-1.5 flex mt-8 mb-8 border border-white/10 shadow-2xl">
          <button 
            onClick={() => setTier('Plus')}
            className={`flex-1 py-3 rounded-full text-[15px] font-bold transition-all duration-300 ${tier === 'Plus' ? 'bg-[#FF1B6B] text-white shadow-[0_0_25px_rgba(255,27,107,0.4)]' : 'text-white/40 hover:text-white/60'}`}
          >
            Plus
          </button>
          <button 
            onClick={() => setTier('Pro')}
            className={`flex-1 py-3 rounded-full text-[15px] font-bold transition-all duration-300 ${tier === 'Pro' ? 'bg-[#FF1B6B] text-white shadow-[0_0_25px_rgba(255,27,107,0.4)]' : 'text-white/40 hover:text-white/60'}`}
          >
            Pro
          </button>
        </div>

        {/* Description Area */}
        <div className="w-full bg-[#161618] rounded-[32px] p-7 space-y-6 border border-white/[0.05] shadow-2xl">
          {features.map((f, i) => (
            <div key={i} className="flex items-start space-x-4">
              <div className="w-6 h-6 bg-[#FF1B6B]/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-[#FF1B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span className="text-[15px] font-bold text-white/90 leading-relaxed tracking-tight">{f}</span>
            </div>
          ))}
        </div>

        {/* Payment Plan Area */}
        <div className="w-full flex flex-col space-y-4 mt-10 mb-10">
          {pricingOptions.map((opt) => (
            <div 
              key={opt.cycle}
              onClick={() => setCycle(opt.cycle as BillingCycle)}
              className={`relative flex items-center p-6 rounded-[24px] border-2 transition-all duration-300 cursor-pointer ${cycle === opt.cycle ? 'bg-[#FF1B6B]/5 border-[#FF1B6B] shadow-[0_0_30px_rgba(255,27,107,0.15)]' : 'bg-[#161618] border-white/5 hover:border-white/10'}`}
            >
              {opt.badge && (
                <div className="absolute -top-3 right-5 bg-[#FF1B6B] text-white text-[10px] font-black px-3.5 py-1.5 rounded-full shadow-lg uppercase tracking-widest">
                  {opt.badge}
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`text-[18px] font-black transition-colors ${cycle === opt.cycle ? 'text-white' : 'text-white/80'}`}>{opt.label}</span>
                  <span className="text-[14px] text-white/20 line-through font-medium tracking-tight">${opt.oldPrice}</span>
                </div>
                <p className={`text-[12px] font-bold uppercase tracking-widest mt-1 ${cycle === opt.cycle ? 'text-[#FF1B6B]' : 'text-white/30'}`}>{opt.suffix}</p>
              </div>

              <div className="text-right flex items-center space-x-5">
                <div className="flex flex-col items-end">
                   <span className="text-[26px] font-black text-white leading-none tracking-tight">${opt.price}</span>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${cycle === opt.cycle ? 'bg-[#FF1B6B] border-[#FF1B6B] scale-110' : 'border-white/10'}`}>
                  {cycle === opt.cycle && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Button Area */}
        <button 
          onClick={() => onSelectPlan(tier)}
          className="w-full bg-[#FF1B6B] text-white font-black py-5 rounded-[28px] shadow-[0_12px_40px_rgba(255,27,107,0.4)] active:scale-[0.96] hover:scale-[1.01] transition-all text-[18px] mb-4 tracking-tight"
        >
          继续
        </button>

        <p className="text-[11px] text-white/20 mt-6 text-center leading-relaxed font-semibold px-4">
          确认购买即表示您同意我们的 <span className="underline decoration-[#FF1B6B]/30 text-white/40">隐私政策</span> 和 <span className="underline decoration-[#FF1B6B]/30 text-white/40">服务条款</span>。<br/>订阅将自动按选择周期续订，您可以随时在应用设置中取消。
        </p>
      </div>
    </div>
  );
};

export default SubscriptionView;
