
import React, { useState, useEffect } from 'react';
import AgentList from './components/AgentList.tsx';
import ChatInterface from './components/ChatInterface.tsx';
import { UserStats, TaskType, Difficulty, CollectionCategory } from './types.ts';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'list' | 'chat'>('list');
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('web3_task_stats');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        // Ensure all numeric fields exist
        const s = {
          userId: p.userId || 'WEB3_USER_' + Math.random().toString(36).substr(2, 9),
          username: p.username || '探路者',
          totalDuration: Number(p.totalDuration) || 0,
          totalCorrect: Number(p.totalCorrect) || 0,
          totalAttempted: Number(p.totalAttempted) || 0,
          
          quickEasyCount: Number(p.quickEasyCount) || 0,
          quickEasyScore: Number(p.quickEasyScore) || 0,
          quickMediumCount: Number(p.quickMediumCount) || 0,
          quickMediumScore: Number(p.quickMediumScore) || 0,
          quickHardCount: Number(p.quickHardCount) || 0,
          quickHardScore: Number(p.quickHardScore) || 0,
          
          collectionEasyCount: Number(p.collectionEasyCount) || 0,
          collectionEasyScore: Number(p.collectionEasyScore) || 0,
          collectionMediumCount: Number(p.collectionMediumCount) || 0,
          collectionMediumScore: Number(p.collectionMediumScore) || 0,
          collectionHardCount: Number(p.collectionHardCount) || 0,
          collectionHardScore: Number(p.collectionHardScore) || 0,
          
          completions: p.completions || {},
          
          // Derived totals (calculated below for safety)
          quickCount: 0,
          collectionCount: 0,
          quickScore: 0,
          collectionScore: 0,
          totalScore: 0
        };

        // Recalculate aggregate totals for data integrity
        s.quickCount = s.quickEasyCount + s.quickMediumCount + s.quickHardCount;
        s.quickScore = s.quickEasyScore + s.quickMediumScore + s.quickHardScore;
        
        s.collectionCount = s.collectionEasyCount + s.collectionMediumCount + s.collectionHardCount;
        s.collectionScore = s.collectionEasyScore + s.collectionMediumScore + s.collectionHardScore;
        
        s.totalScore = s.quickScore + s.collectionScore;

        return s;
      } catch (e) {
        console.error("Failed to parse stats", e);
      }
    }
    
    return {
      userId: 'WEB3_USER_' + Math.random().toString(36).substr(2, 9),
      username: '探路者',
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
      totalScore: 0,
      completions: {}
    };
  });

  useEffect(() => {
    localStorage.setItem('web3_task_stats', JSON.stringify(stats));
  }, [stats]);

  const updateStats = (
    score: number, 
    type: TaskType, 
    difficulty: Difficulty, 
    performance: { correctCount: number; totalCount: number; duration: number },
    category?: CollectionCategory
  ) => {
    setStats(prev => {
      const isQuick = type === TaskType.QUICK_JUDGMENT;
      const timestamp = Date.now();
      const completionKey = category ? `${type}_${category}_${difficulty}_${timestamp}` : `${type}_${difficulty}_${timestamp}`;
      
      // Deep copy numeric stats but shallow copy object references we plan to spread
      const newStats = { ...prev, completions: { ...prev.completions, [completionKey]: timestamp } };
      
      // 1. Update Global Performance Metrics
      newStats.totalDuration += performance.duration;
      newStats.totalCorrect += performance.correctCount;
      newStats.totalAttempted += performance.totalCount;

      // 2. Update Specific Difficulty/Type Buckets
      if (isQuick) {
        if (difficulty === Difficulty.EASY) {
          newStats.quickEasyCount += 1;
          newStats.quickEasyScore += score;
        } else if (difficulty === Difficulty.MEDIUM) {
          newStats.quickMediumCount += 1;
          newStats.quickMediumScore += score;
        } else if (difficulty === Difficulty.HARD) {
          newStats.quickHardCount += 1;
          newStats.quickHardScore += score;
        }
      } else {
        if (difficulty === Difficulty.EASY) {
          newStats.collectionEasyCount += 1;
          newStats.collectionEasyScore += score;
        } else if (difficulty === Difficulty.MEDIUM) {
          newStats.collectionMediumCount += 1;
          newStats.collectionMediumScore += score;
        } else if (difficulty === Difficulty.HARD) {
          newStats.collectionHardCount += 1;
          newStats.collectionHardScore += score;
        }
      }

      // 3. Recalculate All Aggregate Totals to prevent any possibility of sync issues
      newStats.quickCount = newStats.quickEasyCount + newStats.quickMediumCount + newStats.quickHardCount;
      newStats.quickScore = newStats.quickEasyScore + newStats.quickMediumScore + newStats.quickHardScore;
      
      newStats.collectionCount = newStats.collectionEasyCount + newStats.collectionMediumCount + newStats.collectionHardCount;
      newStats.collectionScore = newStats.collectionEasyScore + newStats.collectionMediumScore + newStats.collectionHardScore;
      
      newStats.totalScore = newStats.quickScore + newStats.collectionScore;

      return newStats;
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
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
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
