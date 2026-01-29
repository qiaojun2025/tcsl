
import React from 'react';
import { Agent } from '../types';

const AGENTS: Agent[] = [
  {
    id: 'task-center',
    name: 'AI标注',
    description: '完成任务赢取奖励',
    iconClass: '📄',
    gradient: 'gradient-blue'
  },
  {
    id: 'web3-radar',
    name: 'Web3 趋势雷达',
    description: '实时发现Web3趋势',
    iconClass: '📡',
    gradient: 'gradient-cyan'
  },
  {
    id: 'winly',
    name: 'Winly',
    description: '让 Web3 简单易懂，趣味横生',
    iconClass: '🦊',
    gradient: 'gradient-purple'
  },
  {
    id: 'security-coach',
    name: '安全意识教练',
    description: '在Web3中保持安全：发现欺诈并避免风险',
    iconClass: '🛡️',
    gradient: 'gradient-blue'
  }
];

interface AgentListProps {
  onSelectAgent: (id: string) => void;
}

const AgentList: React.FC<AgentListProps> = ({ onSelectAgent }) => {
  const featuredAgent = AGENTS[0];
  const listAgents = AGENTS.slice(1);

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] pt-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 px-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">智能体</h1>
        <button className="text-white p-2">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 21L16.65 16.65" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Featured Hero Card */}
      <div 
        onClick={() => onSelectAgent(featuredAgent.id)}
        className="relative ios-card overflow-hidden aspect-[4/3] mx-4 mb-8 group cursor-pointer active:scale-[0.98] transition-all"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/20 via-transparent to-black/80"></div>
        
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="relative w-64 h-64">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse-soft"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-soft" style={{animationDelay: '1s'}}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border border-white/5 rounded-3xl rotate-12 scale-110"></div>
              <div className="absolute w-28 h-28 border border-white/10 rounded-3xl -rotate-12 scale-90"></div>
              <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <span className="text-3xl">📄</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center space-x-4 bg-gradient-to-t from-black/90 to-transparent">
          <div className={`w-14 h-14 rounded-2xl ${featuredAgent.gradient} flex items-center justify-center text-2xl shadow-xl shrink-0`}>
            {featuredAgent.iconClass}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{featuredAgent.name}</h3>
            <p className="text-sm text-white/50 font-medium mt-0.5">{featuredAgent.description}</p>
          </div>
        </div>
      </div>

      {/* List Section */}
      <div className="px-4">
          <h2 className="text-lg font-bold text-white mb-4">Web3 中心</h2>
          <div className="space-y-4">
            {listAgents.map((agent) => (
              <div 
                key={agent.id} 
                onClick={() => onSelectAgent(agent.id)}
                className="flex items-center space-x-4 active:bg-white/5 p-2 -mx-2 rounded-2xl transition-all cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-2xl ${agent.gradient} flex items-center justify-center text-2xl shadow-lg shrink-0`}>
                  {agent.iconClass}
                </div>
                <div className="flex-1">
                  <h3 className="text-[16px] font-bold text-white leading-tight">{agent.name}</h3>
                  <p className="text-[#A1A1AA] text-sm mt-0.5 font-medium leading-snug">{agent.description}</p>
                </div>
              </div>
            ))}
          </div>
      </div>
    </div>
  );
};

export default AgentList;
