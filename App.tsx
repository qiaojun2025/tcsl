
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
  
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('task_stats_v5');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        // Deeply merge with DEFAULT_STATS to ensure no missing properties
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
    <div className="h-screen bg-gray-50 max-w-md mx-auto relative flex flex-col shadow-2xl overflow-hidden font-sans">
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {currentView === 'list' ? (
          <div className="h-full overflow-y-auto pb-20">
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
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 flex justify-around items-center h-16 px-6 z-40">
          <button className="text-blue-600 p-2"><HomeIcon /></button>
          <button className="text-gray-400 p-2"><TaskIcon /></button>
          <button className="text-gray-400 p-2"><CompassIcon /></button>
          <button className="text-gray-400 p-2"><UserIcon /></button>
        </div>
      )}
    </div>
  );
};

const HomeIcon = () => <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>;
const TaskIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
const CompassIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const UserIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;

export default App;
