import React, { useState, useEffect } from 'react';
import AgentList from './components/AgentList.tsx';
import ChatInterface from './components/ChatInterface.tsx';
import { UserStats, TaskType, Difficulty, CollectionCategory, TaskCompletionRecord } from './types.ts';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'list' | 'chat'>('list');
  const [adCountdown, setAdCountdown] = useState(10);
  
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('web3_task_stats_cumulative');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse cumulative stats", e);
      }
    }
    return {
      userId: 'WEB3_USER_' + Math.random().toString(36).substr(2, 9),
      username: '探路者',
      totalDuration: 0, totalCorrect: 0, totalAttempted: 0,
      quickEasyCount: 0, quickEasyScore: 0,
      quickMediumCount: 0, quickMediumScore: 0,
      quickHardCount: 0, quickHardScore: 0,
      collectionEasyCount: 0, collectionEasyScore: 0,
      collectionMediumCount: 0, collectionMediumScore: 0,
      collectionHardCount: 0, collectionHardScore: 0,
      quickCount: 0, collectionCount: 0, quickScore: 0, collectionScore: 0, totalScore: 0
    };
  });

  const [taskRecords, setTaskRecords] = useState<TaskCompletionRecord[]>(() => {
    const saved = localStorage.getItem('web3_task_records');
    return saved ? JSON.parse(saved) : [];
  });


  useEffect(() => {
    localStorage.setItem('web3_task_stats_cumulative', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('web3_task_records', JSON.stringify(taskRecords));
  }, [taskRecords]);

  useEffect(() => {
    if (adCountdown > 0) {
      const timer = setTimeout(() => {
        setAdCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [adCountdown]);

  const handleUpdateTaskCompletion = (
    score: number, 
    type: TaskType, 
    difficulty: Difficulty, 
    performance: { correctCount: number; totalCount: number; startTime: number; endTime: number },
    category?: CollectionCategory
  ) => {
    const duration = Math.round((performance.endTime - performance.startTime) / 1000);

    const newRecord: TaskCompletionRecord = {
      id: `TASK-${performance.endTime}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: performance.endTime,
      startTime: performance.startTime,
      duration,
      type,
      difficulty,
      category,
      score,
      correctCount: performance.correctCount,
      totalCount: performance.totalCount,
    };
    setTaskRecords(prev => [...prev, newRecord]);

    setStats(prev => {
      const isQuick = type === TaskType.QUICK_JUDGMENT;
      const newStats = { ...prev };
      
      newStats.totalDuration += duration;
      newStats.totalCorrect += performance.correctCount;
      newStats.totalAttempted += performance.totalCount;

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

      newStats.quickCount = newStats.quickEasyCount + newStats.quickMediumCount + newStats.quickHardCount;
      newStats.quickScore = newStats.quickEasyScore + newStats.quickMediumScore + newStats.quickHardScore;
      
      newStats.collectionCount = newStats.collectionEasyCount + newStats.collectionMediumCount + newStats.collectionHardCount;
      newStats.collectionScore = newStats.collectionEasyScore + newStats.collectionMediumScore + newStats.collectionHardScore;
      
      newStats.totalScore = newStats.quickScore + newStats.collectionScore;

      return newStats;
    });
  };

  return (
    <div className="h-screen bg-gray-50 max-w-md mx-auto relative flex flex-col shadow-2xl overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden relative">
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
        
        {/* Bottom Navigation (Only for List View) */}
        {currentView === 'list' && (
            <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 flex justify-around items-center h-16 px-6 z-40">
            <button className="text-blue-600"><HomeIcon /></button>
            <button className="text-gray-400"><TaskIcon /></button>
            <button className="text-gray-400"><CompassIcon /></button>
            <button className="text-gray-400"><UserIcon /></button>
            </div>
        )}
      </div>

      {/* Anchor Ad Banner - Fixed Height (160px) at Bottom - VIB AI Promotion */}
      {adCountdown > 0 && (
        <div className="h-[160px] shrink-0 w-full bg-white border-t border-gray-100 z-50 flex flex-col relative shadow-[0_-8px_30px_rgba(0,0,0,0.04)] animate-in fade-in slide-in-from-bottom duration-500">
          <div className="absolute top-0 right-0 bg-gray-100 text-[10px] text-gray-400 px-2 py-0.5 rounded-bl z-10 font-mono">
            广告 · {adCountdown}s
          </div>
          
          <div className="flex-1 flex items-center px-5 relative overflow-hidden">
             {/* Decorative Background Blob */}
             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

             {/* App Icon */}
             <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0 mr-4 relative group cursor-pointer active:scale-95 transition-transform">
                <div className="absolute inset-0 bg-white opacity-10 rounded-2xl transform rotate-3 group-hover:rotate-6 transition-transform"></div>
                <span className="text-3xl font-black text-white italic tracking-tighter relative z-10">VIB</span>
             </div>
             
             {/* Text Content */}
             <div className="flex-1 flex flex-col justify-center min-w-0 pr-2">
                <div className="flex items-center mb-1">
                    <h3 className="text-xl font-black text-gray-900 leading-none mr-2">VIB AI</h3>
                    <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Featured</span>
                </div>
                <p className="text-sm text-gray-500 font-medium leading-snug mb-2 line-clamp-2">
                   您的专属 AI 伙伴。沉浸式对话，情感陪伴，全能助手。
                </p>
                <div className="flex items-center space-x-1">
                   {[1,2,3,4,5].map(i => (
                     <svg key={i} className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                   ))}
                   <span className="text-xs text-gray-400 font-medium ml-1">4.9</span>
                </div>
             </div>

             {/* Action Button */}
             <div className="flex flex-col items-center justify-center shrink-0">
                <button className="bg-black text-white w-[88px] h-[36px] rounded-full font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center hover:bg-gray-800">
                    打开
                </button>
             </div>
          </div>
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