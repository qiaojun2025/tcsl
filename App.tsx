
import React, { useState, useEffect } from 'react';
import AgentList from './components/AgentList.tsx';
import ChatInterface from './components/ChatInterface.tsx';
import { UserStats, TaskType, Difficulty, CollectionCategory, TaskCompletionRecord } from './types.ts';

const DEFAULT_STATS: UserStats = {
  userId: 'UID-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
  username: '探路者_' + Math.floor(Math.random() * 900 + 100),
  totalDuration: 0, 
  totalCorrect: 0, 
  totalAttempted: 0,
  quickEasyCount: 0, 
  quickEasyScore: 0,
  quickMediumCount: 0, 
  quickMediumScore: 0,
  quickHardCount: 0, 
  quickHardScore: 0,
  collectionEasyCount: 0, 
  collectionEasyScore: 0,
  collectionMediumCount: 0, 
  collectionMediumScore: 0,
  collectionHardCount: 0, 
  collectionHardScore: 0,
  quickCount: 0, 
  collectionCount: 0, 
  quickScore: 0, 
  collectionScore: 0, 
  totalScore: 0
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'list' | 'chat'>('list');
  const [activeTab, setActiveTab] = useState('home');
  
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('task_stats_v5');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_STATS, ...parsed };
      } catch (e) { 
        console.error("Failed to parse stats:", e); 
      }
    }
    return DEFAULT_STATS;
  });

  const [taskRecords, setTaskRecords] = useState<TaskCompletionRecord[]>(() => {
    const saved = localStorage.getItem('task_records_v5');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('task_stats_v5', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('task_records_v5', JSON.stringify(taskRecords));
  }, [taskRecords]);

  const handleUpdateTaskCompletion = (
    score: number, 
    type: TaskType, 
    difficulty: Difficulty, 
    performance: { correctCount: number; totalCount: number; startTime: number; endTime: number },
    category?: CollectionCategory
  ) => {
    const duration = Math.round((performance.endTime - performance.startTime) / 1000);
    const newRecord: TaskCompletionRecord = {
      id: `SN-${performance.endTime.toString().slice(-6)}`,
      timestamp: performance.endTime,
      startTime: performance.startTime,
      duration,
      type,
      difficulty,
      category: category || undefined,
      score,
      correctCount: performance.correctCount,
      totalCount: performance.totalCount,
    };
    setTaskRecords(prev => [...prev, newRecord]);

    setStats(prev => {
      const isQuick = type === TaskType.QUICK_JUDGMENT;
      const newStats = { ...prev };
      
      newStats.totalDuration = (newStats.totalDuration || 0) + duration;
      newStats.totalCorrect = (newStats.totalCorrect || 0) + performance.correctCount;
      newStats.totalAttempted = (newStats.totalAttempted || 0) + performance.totalCount;

      if (isQuick) {
        if (difficulty === Difficulty.EASY) { 
          newStats.quickEasyCount = (newStats.quickEasyCount || 0) + 1; 
          newStats.quickEasyScore = (newStats.quickEasyScore || 0) + score; 
        } else if (difficulty === Difficulty.MEDIUM) { 
          newStats.quickMediumCount = (newStats.quickMediumCount || 0) + 1; 
          newStats.quickMediumScore = (newStats.quickMediumScore || 0) + score; 
        } else if (difficulty === Difficulty.HARD) { 
          newStats.quickHardCount = (newStats.quickHardCount || 0) + 1; 
          newStats.quickHardScore = (newStats.quickHardScore || 0) + score; 
        }
      } else {
        if (difficulty === Difficulty.EASY) { 
          newStats.collectionEasyCount = (newStats.collectionEasyCount || 0) + 1; 
          newStats.collectionEasyScore = (newStats.collectionEasyScore || 0) + score; 
        } else if (difficulty === Difficulty.MEDIUM) { 
          newStats.collectionMediumCount = (newStats.collectionMediumCount || 0) + 1; 
          newStats.collectionMediumScore = (newStats.collectionMediumScore || 0) + score; 
        } else if (difficulty === Difficulty.HARD) { 
          newStats.collectionHardCount = (newStats.collectionHardCount || 0) + 1; 
          newStats.collectionHardScore = (newStats.collectionHardScore || 0) + score; 
        }
      }

      newStats.quickCount = (newStats.quickEasyCount || 0) + (newStats.quickMediumCount || 0) + (newStats.quickHardCount || 0);
      newStats.quickScore = (newStats.quickEasyScore || 0) + (newStats.quickMediumScore || 0) + (newStats.quickHardScore || 0);
      newStats.collectionCount = (newStats.collectionEasyCount || 0) + (newStats.collectionMediumCount || 0) + (newStats.collectionHardCount || 0);
      newStats.collectionScore = (newStats.collectionEasyScore || 0) + (newStats.collectionMediumScore || 0) + (newStats.collectionHardScore || 0);
      newStats.totalScore = (newStats.quickScore || 0) + (newStats.collectionScore || 0);
      
      return newStats;
    });
  };

  return (
    <div className="h-screen bg-[#0A0A0A] max-w-md mx-auto relative flex flex-col overflow-hidden text-white pt-safe">
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {currentView === 'list' ? (
          <div className="h-full overflow-y-auto pb-24 px-4 pt-4">
            <AgentList onSelectAgent={(id) => id === 'task-center' && setCurrentView('chat')} />
          </div>
        ) : (
          <div className="h-full">
            <ChatInterface 
              stats={stats} 
              taskRecords={taskRecords}
              onBack={() => setCurrentView('list')} 
              onUpdateTaskCompletion={handleUpdateTaskCompletion}
            />
          </div>
        )}
      </div>
      
      {currentView === 'list' && (
        <div className="absolute bottom-0 left-0 right-0 ios-blur border-t border-white/5 flex justify-around items-center h-20 px-6 z-40 pb-safe">
          <button onClick={() => setActiveTab('home')} className={`p-2 transition-colors ${activeTab === 'home' ? 'text-white' : 'text-[#71717A]'}`}><HomeIcon /></button>
          <button onClick={() => setActiveTab('task')} className={`p-2 transition-colors ${activeTab === 'task' ? 'text-white' : 'text-[#71717A]'}`}><TaskIcon /></button>
          <button onClick={() => setActiveTab('explore')} className={`p-2 transition-colors ${activeTab === 'explore' ? 'text-white' : 'text-[#71717A]'}`}><CompassIcon /></button>
          <button onClick={() => setActiveTab('user')} className={`p-2 transition-colors ${activeTab === 'user' ? 'text-white' : 'text-[#71717A]'}`}><UserIcon /></button>
        </div>
      )}
    </div>
  );
};

const HomeIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9.5L12 3L21 9.5V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V9.5Z" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 20V12H15V20" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const TaskIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 8H17" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 12H17" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 16H13" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const CompassIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 3V21M3 12H21" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const UserIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5.5 21C5.5 17.134 8.41015 14.2239 12.2761 14.2239V14.2239C16.1421 14.2239 19.0522 17.134 19.0522 21" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default App;
