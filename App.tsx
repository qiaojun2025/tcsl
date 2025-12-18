
import React, { useState, useEffect } from 'react';
import AgentList from './components/AgentList';
import ChatInterface from './components/ChatInterface';
import { UserStats } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'list' | 'chat'>('list');
  const [stats, setStats] = useState<UserStats>({
    userId: 'WEB3_USER_' + Math.random().toString(36).substr(2, 9),
    username: '探路者',
    quickCount: 0,
    collectionCount: 0,
    quickScore: 0,
    collectionScore: 0,
    totalScore: 0
  });

  const updateStats = (score: number, type: string) => {
    setStats(prev => {
      const isQuick = type === '快判任务';
      return {
        ...prev,
        quickCount: isQuick ? prev.quickCount + 1 : prev.quickCount,
        collectionCount: !isQuick ? prev.collectionCount + 1 : prev.collectionCount,
        quickScore: isQuick ? prev.quickScore + score : prev.quickScore,
        collectionScore: !isQuick ? prev.collectionScore + score : prev.collectionScore,
        totalScore: prev.totalScore + score
      };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative overflow-hidden flex flex-col shadow-2xl">
      {currentView === 'list' ? (
        <AgentList onSelectAgent={(id) => id === 'task-center' && setCurrentView('chat')} />
      ) : (
        <ChatInterface 
          stats={stats} 
          onBack={() => setCurrentView('list')} 
          onUpdateStats={updateStats}
        />
      )}
      
      {/* Tab Bar (Only on List View) */}
      {currentView === 'list' && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 flex justify-around items-center h-16 px-6 z-50">
          <button className="text-blue-600"><HomeIcon /></button>
          <button className="text-gray-400"><TaskIcon /></button>
          <button className="text-gray-400"><CompassIcon /></button>
          <button className="text-gray-400"><UserIcon /></button>
        </div>
      )}
    </div>
  );
};

const HomeIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);

const TaskIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const CompassIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export default App;
