import React, { useState, useEffect } from 'react';
import AgentList from './components/AgentList.tsx';
import ChatInterface from './components/ChatInterface.tsx';
import { UserStats, TaskType, Difficulty, CollectionCategory, TaskCompletionRecord } from './types.ts';

const App: React.FC = () => {
  // Views: 'email-entry' -> 'email-sent' (simulation) -> 'email-verify-code' -> 'list' -> 'chat'
  const [currentView, setCurrentView] = useState<'email-entry' | 'email-verify-code' | 'email-sent' | 'list' | 'chat'>('email-entry');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeInputError, setCodeInputError] = useState('');
  
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

  // Email Flow Handlers
  const handleRequestCode = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('请输入有效的电子邮件地址');
      return;
    }
    setEmailError('');
    // Generate a simple 5-digit code for simulation
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    setGeneratedCode(code);
    setCurrentView('email-sent');
  };

  const handleVerifyCode = () => {
    if (verificationCode === generatedCode) {
      const newUsername = email.split('@')[0];
      setStats(prev => ({
          ...prev,
          username: newUsername
      }));
      setCurrentView('list');
    } else {
      setCodeInputError('验证码错误，请重新输入');
    }
  };

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

  // Render Add Email View (添加用户)
  if (currentView === 'email-entry') {
    return (
      <div className="h-screen bg-gray-50 max-w-md mx-auto relative flex flex-col shadow-2xl overflow-hidden">
        <div className="flex-1 flex flex-col p-6 bg-white">
          <div className="mt-12 mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2">添加用户</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              将现有邮件账户添加为VIB用户，你需要验证你拥有此电子邮件地址。我们将发送验证码到输入的邮箱地址，请填写邮件中的验证码以添加用户。
            </p>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 mb-2">电子邮件</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-gray-900 font-medium"
            />
            {emailError && <p className="text-red-500 text-xs mt-2 font-medium">{emailError}</p>}
          </div>

          <div className="mt-8 pb-10">
            <button 
              onClick={handleRequestCode}
              className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg shadow-lg active:bg-blue-700 transition-colors"
            >
              验证邮件
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Verification Code View (校验验证码)
  if (currentView === 'email-verify-code') {
    return (
      <div className="h-screen bg-gray-50 max-w-md mx-auto relative flex flex-col shadow-2xl overflow-hidden">
        <div className="flex-1 flex flex-col p-6 bg-white">
          <div className="mt-12 mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2">校验验证码</h1>
            <p className="text-gray-500 text-sm">请输入发送至 {email} 的验证码。</p>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 mb-2">验证码</label>
            <input 
              type="text" 
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="00000"
              maxLength={5}
              className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-gray-900 font-black tracking-widest text-center text-3xl"
            />
            {codeInputError && <p className="text-red-500 text-xs mt-2 font-medium">{codeInputError}</p>}
          </div>

          <div className="space-y-3 mt-8 pb-10">
            <button 
              onClick={handleVerifyCode}
              className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg shadow-lg active:bg-blue-700 transition-colors"
            >
              校验
            </button>
            <button 
              onClick={() => setCurrentView('email-entry')}
              className="w-full py-4 rounded-xl bg-gray-50 text-gray-500 font-bold text-lg active:bg-gray-100 transition-colors"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Simulated Email Screen
  if (currentView === 'email-sent') {
    return (
      <div className="h-screen bg-gray-50 max-w-md mx-auto relative flex flex-col shadow-2xl overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-left">
           <div className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 mb-6">
              <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">模拟邮件内容 (Inbox)</p>
              <div className="bg-white p-5 rounded-lg shadow-sm text-sm text-gray-800 leading-relaxed space-y-4 font-sans border border-gray-100">
                  <h3 className="font-bold text-lg text-gray-900 border-b pb-2 mb-2">欢迎使用VIB</h3>
                  <p className="font-medium">你的VIB 账号是：<span className="text-blue-600 font-bold">{email}</span></p>
                  <p className="font-medium">验证码是：<span className="text-2xl font-black text-gray-900">{generatedCode}</span></p>
                  <div className="pt-4 border-t border-gray-50 text-xs text-gray-400">
                    此邮件为系统自动发送，请勿直接回复。
                  </div>
              </div>
           </div>
           <button 
             onClick={() => setCurrentView('email-verify-code')}
             className="w-full py-4 rounded-xl bg-gray-900 text-white font-bold text-lg shadow-lg active:scale-95 transition-transform"
           >
             去填写验证码
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 max-w-md mx-auto relative flex flex-col shadow-2xl overflow-hidden">
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
        
        {currentView === 'list' && (
            <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 flex justify-around items-center h-16 px-6 z-40">
            <button className="text-blue-600"><HomeIcon /></button>
            <button className="text-gray-400"><TaskIcon /></button>
            <button className="text-gray-400"><CompassIcon /></button>
            <button className="text-gray-400"><UserIcon /></button>
            </div>
        )}
      </div>
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