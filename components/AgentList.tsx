
import React from 'react';
import { Agent } from '../types';

const AGENTS: Agent[] = [
  {
    id: 'security-coach',
    name: '安全意识教练',
    description: '在Web3中保持安全：发现欺诈并避免风险',
    iconClass: '🛡️',
    gradient: 'agent-gradient-1'
  },
  {
    id: 'web3-radar',
    name: 'Web3 趋势雷达',
    description: '实时发现Web3趋势',
    iconClass: '📡',
    gradient: 'agent-gradient-2'
  },
  {
    id: 'token-designer',
    name: '代币经济学设计师',
    description: '轻松设计完整的代币模型',
    iconClass: '📊',
    gradient: 'agent-gradient-3'
  },
  {
    id: 'task-center',
    name: '任务中心',
    description: '通过完成任务贡献数据并获得奖励',
    iconClass: '🎯',
    gradient: 'agent-gradient-4'
  }
];

interface AgentListProps {
  onSelectAgent: (id: string) => void;
}

const AgentList: React.FC<AgentListProps> = ({ onSelectAgent }) => {
  return (
    <div className="flex flex-col h-full bg-white px-6 pt-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">智能体</h1>
        <button className="text-gray-400 p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 117.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.256-3.905 14.162 0M5.636 5.636l1.414 1.414m10.606 10.606l1.414 1.414M17 12a5 5 0 01-10 0" /></svg>
        </button>
      </div>

      <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Web3 中心</h2>
          <div className="space-y-6">
            {AGENTS.map((agent) => (
              <div 
                key={agent.id} 
                onClick={() => onSelectAgent(agent.id)}
                className="flex items-center space-x-4 active:scale-95 transition-transform cursor-pointer"
              >
                <div className={`w-16 h-16 rounded-2xl ${agent.gradient} flex items-center justify-center text-3xl shadow-lg`}>
                  {agent.iconClass}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 leading-tight">{agent.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">{agent.description}</p>
                </div>
              </div>
            ))}
          </div>
      </div>
    </div>
  );
};

export default AgentList;
