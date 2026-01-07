import React, { useState, useEffect, useRef } from 'react';
import { Difficulty, TaskType, UserStats, CollectionCategory, TaskCompletionRecord } from '../types.ts';
import TaskFlow from './TaskFlow.tsx';

interface Message {
  id: string;
  sender: 'agent' | 'user';
  type: 'text' | 'task-type-select' | 'category-select' | 'difficulty-select' | 'media-type-select' | 'account-stats-report' | 'daily-stats-report' | 'task-report';
  payload: any;
  timestamp: number;
}

interface ChatInterfaceProps {
  stats: UserStats;
  taskRecords: TaskCompletionRecord[];
  onBack: () => void;
  onUpdateTaskCompletion: (score: number, type: TaskType, difficulty: Difficulty, performance: { correctCount: number; totalCount: number; startTime: number; endTime: number }, category?: CollectionCategory) => void;
}

const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
};

const StatsBreakdown: React.FC<{stats: any, title: string}> = ({ stats, title }) => (
    <>
      <div className="mb-3">
          <p className="font-bold text-sm mb-2">🎯 {title}快判任务</p>
          <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                  <span className="text-gray-500">初级</span>
                  <div className="text-right">
                      <p className="font-bold">{stats.quickEasyScore} <span className="text-gray-400">分</span> / {stats.quickEasyCount} <span className="text-gray-400">次</span></p>
                  </div>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                  <span className="text-gray-500">中级</span>
                  <div className="text-right">
                      <p className="font-bold">{stats.quickMediumScore} <span className="text-gray-400">分</span> / {stats.quickMediumCount} <span className="text-gray-400">次</span></p>
                  </div>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                  <span className="text-gray-500">高级</span>
                  <div className="text-right">
                      <p className="font-bold">{stats.quickHardScore} <span className="text-gray-400">分</span> / {stats.quickHardCount} <span className="text-gray-400">次</span></p>
                  </div>
              </div>
          </div>
      </div>
      <div>
          <p className="font-bold text-sm mb-2">📸 {title}采集任务</p>
          <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                  <span className="text-gray-500">初级</span>
                  <div className="text-right">
                      <p className="font-bold">{stats.collectionEasyScore} <span className="text-gray-400">分</span> / {stats.collectionEasyCount} <span className="text-gray-400">次</span></p>
                  </div>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                  <span className="text-gray-500">中级</span>
                  <div className="text-right">
                      <p className="font-bold">{stats.collectionMediumScore} <span className="text-gray-400">分</span> / {stats.collectionMediumCount} <span className="text-gray-400">次</span></p>
                  </div>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                  <span className="text-gray-500">高级</span>
                  <div className="text-right">
                      <p className="font-bold">{stats.collectionHardScore} <span className="text-gray-400">分</span> / {stats.collectionHardCount} <span className="text-gray-400">次</span></p>
                  </div>
              </div>
          </div>
      </div>
    </>
);

const ChatInterface: React.FC<ChatInterfaceProps> = ({ stats, taskRecords, onBack, onUpdateTaskCompletion }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTask, setActiveTask] = useState<{type: TaskType, category?: CollectionCategory, difficulty: Difficulty} | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isTaskActive = !!activeTask;

  useEffect(() => {
    setMessages([{
      id: Date.now().toString(),
      sender: 'agent',
      type: 'text',
      payload: "您好！我是 Web3 任务中心 Agent。在这里，您可以参与快判或采集任务，贡献高质量 AI 训练数据并获取社区贡献度。请选择您想要执行的操作：",
      timestamp: Date.now(),
    }]);
    
    setTimeout(() => {
      addMessage("", 'agent', 'task-type-select');
    }, 600);
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, activeTask]);

  const addMessage = (payload: any, sender: 'agent' | 'user' = 'agent', type: Message['type'] = 'text') => {
    setMessages(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      sender,
      type,
      payload,
      timestamp: Date.now()
    }]);
  };

  // 1. Select Task Type
  const handleSelectTaskType = (type: TaskType) => {
    addMessage(`选择【${type}】`, 'user');
    if (type === TaskType.COLLECTION) {
        setTimeout(() => addMessage({ taskType: type }, 'agent', 'media-type-select'), 400);
    } else {
        setTimeout(() => addMessage({ taskType: type }, 'agent', 'difficulty-select'), 400);
    }
  };

  // 2. Select Media Type (Collection Only)
  const handleSelectMediaType = (type: TaskType, mediaType: 'IMAGE' | 'AUDIO' | 'VIDEO') => {
    let typeLabel = mediaType === 'IMAGE' ? '图片' : mediaType === 'AUDIO' ? '音频' : '视频';
    addMessage(`文件类型：${typeLabel}`, 'user');
    setTimeout(() => addMessage({ taskType: type, mediaType }, 'agent', 'difficulty-select'), 400);
  };

  // 3. Select Difficulty
  const handleSelectDifficulty = (type: TaskType, difficulty: Difficulty, mediaType?: 'IMAGE' | 'AUDIO' | 'VIDEO') => {
    addMessage(`难度：${difficulty}`, 'user');
    
    if (type === TaskType.QUICK_JUDGMENT) {
        setTimeout(() => {
          addMessage("好的，正在为您匹配去中心化验证节点. 任务即将开始：", 'agent', 'text');
          setActiveTask({ type, difficulty });
        }, 400);
    } else {
        // Collection Flow: After difficulty, ask for Category (Image only) or Start (Audio/Video)
        if (mediaType === 'IMAGE') {
           setTimeout(() => addMessage({ taskType: type, difficulty, mediaType }, 'agent', 'category-select'), 400);
        } else {
           const category = mediaType === 'AUDIO' ? CollectionCategory.AUDIO : CollectionCategory.VIDEO;
           setTimeout(() => {
              addMessage(`好的，已锁定【${difficulty}】级别的【${category}】采集任务。请查看任务预览...`, 'agent', 'text');
              setActiveTask({ type, difficulty, category });
           }, 400);
        }
    }
  };

  // 4. Select Category (Image Only)
  const handleSelectCategory = (type: TaskType, difficulty: Difficulty, category: CollectionCategory) => {
    addMessage(`分类：${category}`, 'user');
    setTimeout(() => {
      addMessage(`好的，已锁定【${difficulty}】级别的【${category}】采集任务。请查看任务预览...`, 'agent', 'text');
      setActiveTask({ type, difficulty, category });
    }, 400);
  };

  // Navigation Handlers (Back Buttons)
  const handleBackToTaskType = () => {
    addMessage("返回上一层", 'user');
    setTimeout(() => addMessage("", 'agent', 'task-type-select'), 400);
  };

  const handleBackToMediaType = (type: TaskType) => {
    addMessage("返回上一层", 'user');
    setTimeout(() => addMessage({ taskType: type }, 'agent', 'media-type-select'), 400);
  };
  
  const handleBackToDifficulty = (type: TaskType, mediaType: 'IMAGE' | 'AUDIO' | 'VIDEO') => {
    addMessage("返回上一层", 'user');
    setTimeout(() => addMessage({ taskType: type, mediaType }, 'agent', 'difficulty-select'), 400);
  };

  const handleTaskComplete = (score: number, type: TaskType, performance: { correctCount: number; totalCount: number; startTime: number; endTime: number }) => {
    const d = activeTask?.difficulty || Difficulty.EASY;
    const c = activeTask?.category;
    
    onUpdateTaskCompletion(score, type, d, performance, c);
    
    setActiveTask(null);

    const reportData = {
      taskNumber: `TASK-${performance.endTime}`,
      username: stats.username,
      userId: stats.userId,
      timestamp: performance.endTime,
      startTime: performance.startTime,
      duration: Math.round((performance.endTime - performance.startTime) / 1000),
      type: type,
      difficulty: d,
      category: c,
      accuracy: `${performance.correctCount}/${performance.totalCount}`,
      score: score
    };
    
    addMessage(reportData, 'agent', 'task-report');
    setTimeout(() => addMessage("", 'agent', 'task-type-select'), 1000);
  };

  const showDailyReport = () => {
    addMessage("📈 查看我的日报统计", 'user');
    setTimeout(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfDay = today.getTime();
      const todaysRecords = taskRecords.filter(r => r.timestamp >= startOfDay);

      const dailyStats = todaysRecords.reduce((acc, r) => {
        acc.totalDuration += r.duration;
        acc.totalCorrect += r.correctCount;
        acc.totalAttempted += r.totalCount;
        acc.totalScore += r.score;
        const isQuick = r.type === TaskType.QUICK_JUDGMENT;

        if (isQuick) {
          if (r.difficulty === Difficulty.EASY) { acc.quickEasyCount++; acc.quickEasyScore += r.score; }
          else if (r.difficulty === Difficulty.MEDIUM) { acc.quickMediumCount++; acc.quickMediumScore += r.score; }
          else { acc.quickHardCount++; acc.quickHardScore += r.score; }
        } else {
          if (r.difficulty === Difficulty.EASY) { acc.collectionEasyCount++; acc.collectionEasyScore += r.score; }
          else if (r.difficulty === Difficulty.MEDIUM) { acc.collectionMediumCount++; acc.collectionMediumScore += r.score; }
          else { acc.collectionHardCount++; acc.collectionHardScore += r.score; }
        }
        return acc;
      }, {
        totalDuration: 0, totalCorrect: 0, totalAttempted: 0, totalScore: 0,
        quickEasyCount: 0, quickEasyScore: 0, quickMediumCount: 0, quickMediumScore: 0, quickHardCount: 0, quickHardScore: 0,
        collectionEasyCount: 0, collectionEasyScore: 0, collectionMediumCount: 0, collectionMediumScore: 0, collectionHardCount: 0, collectionHardScore: 0,
      });

      addMessage({ ...dailyStats, reportTimestamp: Date.now(), username: stats.username, userId: stats.userId }, 'agent', 'daily-stats-report');
      setTimeout(() => addMessage("", 'agent', 'task-type-select'), 600);
    }, 400);
  };

  const showAccountStats = () => {
    addMessage("🏦 查看我的账户统计", 'user');
    setTimeout(() => {
      addMessage({ ...stats, reportTimestamp: Date.now() }, 'agent', 'account-stats-report');
      setTimeout(() => addMessage("", 'agent', 'task-type-select'), 600);
    }, 400);
  };


  const renderMessageContent = (msg: Message, isLast: boolean) => {
    // Disable buttons if a task is running OR if this is not the last message (history)
    const isDisabled = isTaskActive || !isLast;

    switch (msg.type) {
      case 'text': return <p className="leading-relaxed">{msg.payload}</p>;
      case 'task-type-select':
        return (
          <div className="space-y-2.5 mt-1">
            <button disabled={isDisabled} onClick={() => handleSelectTaskType(TaskType.QUICK_JUDGMENT)} className="w-full py-3.5 rounded-xl font-bold bg-blue-600 text-white shadow-md active:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">🎯 快判任务</button>
            <button disabled={isDisabled} onClick={() => handleSelectTaskType(TaskType.COLLECTION)} className="w-full py-3.5 rounded-xl font-bold bg-green-600 text-white shadow-md active:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">📸 采集任务</button>
            <button disabled={isDisabled} onClick={showDailyReport} className="w-full py-3.5 rounded-xl font-bold bg-indigo-500 text-white shadow-md active:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">📈 我的日报统计</button>
            <button disabled={isDisabled} onClick={showAccountStats} className="w-full py-3.5 rounded-xl font-bold bg-gray-700 text-white shadow-md active:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">🏦 我的账户统计</button>
          </div>
        );
      case 'media-type-select':
        const { taskType: mediaTaskType } = msg.payload;
        return (
          <div className="space-y-2.5 mt-1">
             <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">请选择采集文件类型</p>
             <button disabled={isDisabled} onClick={() => handleSelectMediaType(mediaTaskType, 'IMAGE')} className="w-full py-3 rounded-xl font-bold bg-white border border-green-200 text-green-700 shadow-sm active:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed">🖼️ 图片采集</button>
             <button disabled={isDisabled} onClick={() => handleSelectMediaType(mediaTaskType, 'AUDIO')} className="w-full py-3 rounded-xl font-bold bg-white border border-purple-200 text-purple-700 shadow-sm active:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed">🎙️ 音频采集</button>
             <button disabled={isDisabled} onClick={() => handleSelectMediaType(mediaTaskType, 'VIDEO')} className="w-full py-3 rounded-xl font-bold bg-white border border-red-200 text-red-700 shadow-sm active:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed">📹 视频采集</button>
             <button disabled={isDisabled} onClick={handleBackToTaskType} className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600 mt-2 disabled:opacity-50 disabled:cursor-not-allowed">↩️ 返回上一层</button>
          </div>
        );
      case 'difficulty-select':
        const { taskType: diffType, mediaType: diffMediaType } = msg.payload;
        return (
          <div className="space-y-2 mt-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">请选择难度等级</p>
            {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map(d => (
              <button disabled={isDisabled} key={d} onClick={() => handleSelectDifficulty(diffType, d, diffMediaType)} className="w-full py-3 rounded-xl font-bold border border-blue-200 text-blue-600 bg-white active:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{d}</button>
            ))}
            <button disabled={isDisabled} onClick={() => {
                if (diffType === TaskType.COLLECTION) {
                    handleBackToMediaType(diffType);
                } else {
                    handleBackToTaskType();
                }
            }} className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600 mt-2 disabled:opacity-50 disabled:cursor-not-allowed">↩️ 返回上一层</button>
          </div>
        );
      case 'category-select':
        const { difficulty: catDiff, taskType: catType, mediaType: catMediaType } = msg.payload;
        // Filter out AUDIO and VIDEO from category selection as they are handled in media type select
        const categories = Object.values(CollectionCategory).filter(c => c !== CollectionCategory.AUDIO && c !== CollectionCategory.VIDEO);
        return (
          <div className="space-y-2 mt-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">请选择任务分类 (当前难度: {catDiff})</p>
            <div className="grid grid-cols-2 gap-2">
              {categories.map(c => (
                <button disabled={isDisabled} key={c} onClick={() => handleSelectCategory(catType, catDiff, c)} className="py-3 rounded-xl border border-gray-200 font-bold text-gray-700 bg-white active:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed">{c}</button>
              ))}
            </div>
            <button disabled={isDisabled} onClick={() => handleBackToDifficulty(catType, catMediaType)} className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600 mt-2 disabled:opacity-50 disabled:cursor-not-allowed">↩️ 返回上一层</button>
          </div>
        );
      case 'task-report':
        const r = msg.payload;
        return (
          <div className="bg-white p-5 rounded-2xl border-2 border-blue-100 shadow-xl w-full">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h4 className="font-black text-blue-900 text-lg">任务报告</h4>
                  <p className="text-[10px] text-gray-400 font-mono">{r.taskNumber}</p>
               </div>
               <div className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded">COMPLETED</div>
            </div>
            <div className="space-y-2 border-t border-b border-gray-100 py-3 mb-3">
              <div className="flex justify-between text-sm"><span className="text-gray-400">用户名</span><span className="font-bold">{r.username}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">任务ID</span><span className="font-mono text-xs">{r.taskNumber}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">任务类型</span><span className="font-bold">{r.type}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">任务级别</span><span className="font-bold">{r.difficulty}</span></div>
              {r.category && <div className="flex justify-between text-sm"><span className="text-gray-400">采集任务分类</span><span className="font-bold">{r.category}</span></div>}
              <div className="flex justify-between text-sm"><span className="text-gray-400">任务开始时间</span><span className="font-mono text-xs">{new Date(r.startTime).toLocaleTimeString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">任务耗时</span><span className="font-bold">{formatDuration(r.duration)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">任务准确率</span><span className="font-bold text-green-600">{r.accuracy}</span></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-900 font-black text-xs">获得贡献度</span>
              <span className="text-2xl font-black text-blue-600">+{r.score}</span>
            </div>
          </div>
        );
      case 'daily-stats-report':
      case 'account-stats-report':
          const s = msg.payload;
          const isDaily = msg.type === 'daily-stats-report';
          return (
            <div className="bg-white p-5 rounded-2xl border-2 border-gray-100 shadow-xl w-full text-gray-800">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-gray-900 text-lg">{isDaily ? '我的日报统计' : '我的账户统计'}</h4>
                  <p className="text-[10px] text-gray-400 font-mono">
                    {new Date(s.reportTimestamp).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded">{isDaily ? 'DAILY' : 'LIFETIME'}</div>
              </div>
  
              <div className="space-y-1 border-t border-b border-gray-100 py-3 mb-3 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">用户名</span><span className="font-bold">{s.username}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">用户ID</span><span className="font-mono text-[10px]">{s.userId}</span></div>
              </div>
  
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-gray-50 p-2 rounded-lg">
                      <p className="text-[9px] text-gray-500 uppercase font-bold">总耗时</p>
                      <p className="font-bold text-sm text-gray-900">{formatDuration(s.totalDuration)}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg">
                      <p className="text-[9px] text-gray-500 uppercase font-bold">准确率</p>
                      <p className="font-bold text-sm text-green-600">
                        {s.totalAttempted > 0 ? `${Math.round((s.totalCorrect / s.totalAttempted) * 100)}%` : 'N/A'}
                      </p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-lg">
                      <p className="text-[9px] text-blue-500 uppercase font-bold">{isDaily ? '今日贡献度' : '总贡献度'}</p>
                      <p className="font-bold text-sm text-blue-700">{s.totalScore}</p>
                  </div>
              </div>
              <StatsBreakdown stats={s} title={isDaily ? '今日' : ''} />
            </div>
          );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center px-4 h-16">
        {!isTaskActive && (
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 active:bg-gray-100 rounded-full transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        )}
        <div className={`flex flex-col ${!isTaskActive ? 'ml-2' : ''}`}>
          <h2 className="text-lg font-black text-gray-900 leading-none">任务中心</h2>
          <span className="text-[10px] font-bold text-emerald-500 uppercase mt-0.5 tracking-tighter">AI DATA NODE ACTIVE</span>
        </div>
        <div className="ml-auto flex items-center bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mr-2"></span>
          <span className="text-xs font-black text-blue-700">{stats.totalScore} PTS</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, index) => (
          <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] ${msg.sender === 'agent' 
              ? msg.type === 'text' ? 'bg-white text-gray-800 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 p-4' : 'w-full'
              : 'bg-blue-600 text-white rounded-2xl rounded-tr-sm shadow-md p-3.5'}`}>
              {renderMessageContent(msg, index === messages.length - 1)}
              <div className={`text-[8px] mt-1 font-bold uppercase tracking-widest opacity-30 ${msg.sender === 'user' ? 'text-right' : ''}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {activeTask && (
          <div className="mt-4">
            <TaskFlow 
              type={activeTask.type} 
              difficulty={activeTask.difficulty} 
              category={activeTask.category}
              onComplete={handleTaskComplete}
              onCancel={() => { setActiveTask(null); addMessage("", 'agent', 'task-type-select'); }}
            />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
};

export default ChatInterface;