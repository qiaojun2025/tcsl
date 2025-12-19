
import React, { useState, useEffect, useRef } from 'react';
import { Difficulty, TaskType, UserStats, CollectionCategory } from '../types.ts';
import TaskFlow from './TaskFlow.tsx';

interface Message {
  id: string;
  sender: 'agent' | 'user';
  type: 'text' | 'task-type-select' | 'category-select' | 'difficulty-select' | 'stats-report' | 'task-report';
  payload: any;
  timestamp: number;
}

interface ChatInterfaceProps {
  stats: UserStats;
  onBack: () => void;
  onUpdateStats: (score: number, type: TaskType, difficulty: Difficulty, performance: { correctCount: number; totalCount: number; duration: number }, category?: CollectionCategory) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ stats, onBack, onUpdateStats }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTask, setActiveTask] = useState<{type: TaskType, category?: CollectionCategory, difficulty: Difficulty} | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcomeId = Date.now().toString();
    setMessages([{
      id: welcomeId,
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

  const handleSelectTaskType = (type: TaskType) => {
    addMessage(`选择【${type}】`, 'user');
    if (type === TaskType.QUICK_JUDGMENT) {
      setTimeout(() => addMessage({ taskType: type }, 'agent', 'difficulty-select'), 400);
    } else {
      setTimeout(() => addMessage("", 'agent', 'category-select'), 400);
    }
  };

  const handleSelectCategory = (category: CollectionCategory) => {
    addMessage(`分类：${category}`, 'user');
    setTimeout(() => addMessage({ taskType: TaskType.COLLECTION, category }, 'agent', 'difficulty-select'), 400);
  };

  const handleSelectDifficulty = (type: TaskType, difficulty: Difficulty, category?: CollectionCategory) => {
    addMessage(`难度：${difficulty}`, 'user');
    setTimeout(() => {
      addMessage("好的，正在为您匹配去中心化验证节点. 任务即将开始：", 'agent', 'text');
      setActiveTask({ type, difficulty, category });
    }, 400);
  };

  const handleTaskComplete = (score: number, type: TaskType, performance: { correctCount: number; totalCount: number; startTime: number; endTime: number }) => {
    const d = activeTask?.difficulty || Difficulty.EASY;
    const c = activeTask?.category;
    
    const duration = Math.floor((performance.endTime - performance.startTime) / 1000);
    
    onUpdateStats(score, type, d, {
        correctCount: performance.correctCount,
        totalCount: performance.totalCount,
        duration: duration
    }, c);
    
    setActiveTask(null);

    const taskNumber = `TASK-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const reportData = {
      taskNumber: taskNumber,
      username: stats.username,
      userId: stats.userId,
      timestamp: performance.endTime,
      startTime: performance.startTime,
      duration: duration,
      type: type,
      difficulty: d,
      category: c,
      accuracy: `${performance.correctCount}/${performance.totalCount}`,
      score: score
    };
    
    addMessage(reportData, 'agent', 'task-report');
    setTimeout(() => addMessage("", 'agent', 'task-type-select'), 1000);
  };

  const showStats = () => {
    addMessage("📊 查看我的统计", 'user', 'text');
    setTimeout(() => {
      addMessage({ ...stats, reportTimestamp: Date.now() }, 'agent', 'stats-report');
      setTimeout(() => addMessage("", 'agent', 'task-type-select'), 600);
    }, 400);
  };

  const renderMessageContent = (msg: Message) => {
    switch (msg.type) {
      case 'text': return <p className="leading-relaxed">{msg.payload}</p>;
      case 'task-type-select':
        return (
          <div className="space-y-2.5 mt-1">
            <button onClick={() => handleSelectTaskType(TaskType.QUICK_JUDGMENT)} className="w-full py-3.5 rounded-xl font-bold bg-blue-600 text-white shadow-md active:bg-blue-700 transition-colors">🎯 快判任务</button>
            <button onClick={() => handleSelectTaskType(TaskType.COLLECTION)} className="w-full py-3.5 rounded-xl font-bold bg-green-600 text-white shadow-md active:bg-green-700 transition-colors">📸 采集任务</button>
            <button onClick={showStats} className="w-full py-3.5 rounded-xl font-bold bg-indigo-600 text-white shadow-md active:bg-indigo-700 transition-colors">📈 我的统计</button>
          </div>
        );
      case 'category-select':
        const cats = Object.values(CollectionCategory);
        return (
          <div className="space-y-2 mt-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">请选择任务分类</p>
            <div className="grid grid-cols-2 gap-2">
              {cats.map(c => (
                <button key={c} onClick={() => handleSelectCategory(c)} className="py-3 rounded-xl border border-gray-200 font-bold text-gray-700 bg-white active:bg-gray-50 text-sm">{c}</button>
              ))}
            </div>
          </div>
        );
      case 'difficulty-select':
        const { taskType, category } = msg.payload;
        return (
          <div className="space-y-2 mt-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">请选择难度等级</p>
            {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map(d => (
              <button key={d} onClick={() => handleSelectDifficulty(taskType, d, category)} className="w-full py-3 rounded-xl font-bold border border-blue-200 text-blue-600 bg-white active:bg-blue-50 transition-colors">{d}</button>
            ))}
          </div>
        );
      case 'task-report':
        const r = msg.payload;
        return (
          <div className="bg-white p-5 rounded-2xl border-2 border-blue-100 shadow-xl w-full">
            <h4 className="font-black text-blue-900 mb-4 flex items-center justify-between border-b border-blue-50 pb-2">
               <span className="flex items-center text-lg"><span className="mr-2">📋</span> 任务报告</span>
               <span className="text-[8px] bg-blue-50 text-blue-400 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-tighter font-black">Verified</span>
            </h4>
            <div className="space-y-2.5 text-[11px] text-gray-600">
              <div className="flex justify-between items-center border-b border-gray-50 pb-1.5">
                <span className="text-gray-400">任务编号</span>
                <span className="font-mono text-[9px] text-blue-500 font-bold">{r.taskNumber}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-1.5">
                <span className="text-gray-400">用户名</span>
                <span className="font-bold text-gray-800">{r.username}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-1.5">
                <span className="text-gray-400">用户 ID</span>
                <span className="font-mono text-[9px] text-gray-500">{r.userId}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-1.5">
                <span className="text-gray-400">任务类型</span>
                <span className="font-bold text-blue-600">{r.type}</span>
              </div>
              {r.type === TaskType.COLLECTION && r.category && (
                <div className="flex justify-between items-center border-b border-gray-50 pb-1.5 bg-green-50/20 px-1 rounded">
                  <span className="text-gray-400">采集任务分类</span>
                  <span className="font-black text-green-600">{r.category}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-b border-gray-50 pb-1.5">
                <span className="text-gray-400">任务级别</span>
                <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold text-gray-700">{r.difficulty}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-1.5">
                <span className="text-gray-400">任务开始时间</span>
                <span className="text-gray-500 font-mono">{new Date(r.startTime).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-1.5">
                <span className="text-gray-400">任务耗时</span>
                <span className="font-black text-gray-800">{r.duration} 秒</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-1.5">
                <span className="text-gray-400">任务准确率</span>
                <span className={`font-black ${r.accuracy.split('/')[0] === r.accuracy.split('/')[1] ? 'text-green-600' : 'text-blue-600'}`}>{r.accuracy}</span>
              </div>
              
              <div className="pt-4 flex justify-between items-center">
                <span className="font-black text-gray-900 text-sm italic">获得贡献度</span>
                <div className="flex items-baseline">
                  <span className="text-2xl font-black text-green-600">+{r.score}</span>
                  <span className="ml-1 text-[8px] text-green-400 font-bold uppercase tracking-widest">Points</span>
                </div>
              </div>
            </div>
          </div>
        );
      case 'stats-report':
        const s = msg.payload as UserStats & { reportTimestamp: number };
        const totalAccuracy = s.totalAttempted > 0 
            ? ((s.totalCorrect / s.totalAttempted) * 100).toFixed(1) + '%' 
            : '0%';
        
        return (
          <div className="bg-white p-5 rounded-2xl border-2 border-indigo-100 shadow-xl w-full">
            <h4 className="font-black text-indigo-900 mb-4 flex items-center justify-between border-b border-indigo-50 pb-3">
               <span className="flex items-center text-lg"><span className="mr-2">📈</span> 累计统计日报</span>
               <span className="text-[9px] bg-indigo-50 text-indigo-500 px-2 py-1 rounded-full border border-indigo-100 font-black uppercase tracking-tighter">Chain Stats</span>
            </h4>
            
            <div className="space-y-2.5 text-[11px] text-gray-600">
              <div className="flex justify-between border-b border-gray-50 pb-1.5">
                <span className="text-gray-400">用户名</span>
                <span className="font-bold text-gray-800">{s.username}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5">
                <span className="text-gray-400">用户 ID</span>
                <span className="font-mono text-[9px] text-gray-500">{s.userId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5">
                <span className="text-gray-400">统计时间戳</span>
                <span className="font-mono text-gray-400">{new Date(s.reportTimestamp).toLocaleString('zh-CN')}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5">
                <span className="text-gray-400">总的任务耗时</span>
                <span className="font-bold text-indigo-600">{s.totalDuration} 秒</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5">
                <span className="text-gray-400">总的任务准确率</span>
                <span className="font-black text-indigo-700">{s.totalCorrect}/{s.totalAttempted} ({totalAccuracy})</span>
              </div>

              {/* 快判明细 */}
              <div className="mt-4 pt-2">
                <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-2 border-l-2 border-blue-500 pl-2">快判任务明细</p>
                <div className="grid grid-cols-1 gap-1.5">
                   <div className="flex justify-between bg-blue-50/50 p-2 rounded-lg">
                      <span>初级快判完成</span>
                      <span className="font-bold">{s.quickEasyCount} 次 | <span className="text-green-600">+{s.quickEasyScore}分</span></span>
                   </div>
                   <div className="flex justify-between bg-blue-50/50 p-2 rounded-lg">
                      <span>中级快判完成</span>
                      <span className="font-bold">{s.quickMediumCount} 次 | <span className="text-green-600">+{s.quickMediumScore}分</span></span>
                   </div>
                   <div className="flex justify-between bg-blue-50/50 p-2 rounded-lg">
                      <span>高级快判完成</span>
                      <span className="font-bold">{s.quickHardCount} 次 | <span className="text-green-600">+{s.quickHardScore}分</span></span>
                   </div>
                </div>
              </div>

              {/* 采集明细 */}
              <div className="mt-4 pt-2">
                <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mb-2 border-l-2 border-green-500 pl-2">采集任务明细</p>
                <div className="grid grid-cols-1 gap-1.5">
                   <div className="flex justify-between bg-green-50/50 p-2 rounded-lg">
                      <span>初级采集完成</span>
                      <span className="font-bold">{s.collectionEasyCount} 次 | <span className="text-green-600">+{s.collectionEasyScore}分</span></span>
                   </div>
                   <div className="flex justify-between bg-green-50/50 p-2 rounded-lg">
                      <span>中级采集完成</span>
                      <span className="font-bold">{s.collectionMediumCount} 次 | <span className="text-green-600">+{s.collectionMediumScore}分</span></span>
                   </div>
                   <div className="flex justify-between bg-green-50/50 p-2 rounded-lg">
                      <span>高级采集完成</span>
                      <span className="font-bold">{s.collectionHardCount} 次 | <span className="text-green-600">+{s.collectionHardScore}分</span></span>
                   </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t-2 border-indigo-100 flex justify-between items-center">
                <span className="font-black text-gray-900 text-sm">总的任务贡献度</span>
                <div className="flex items-baseline">
                  <span className="text-3xl font-black text-indigo-600">{s.totalScore}</span>
                  <span className="ml-1 text-[9px] text-indigo-400 font-bold uppercase tracking-widest">Points</span>
                </div>
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-40 px-4 h-16 flex items-center border-b border-gray-100 shadow-sm">
        <button onClick={onBack} className="p-2 text-blue-600 -ml-2 rounded-full active:bg-blue-50 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="ml-2">
           <h2 className="font-bold text-gray-900 text-sm leading-none">任务中心 Agent</h2>
           <p className="text-[9px] text-green-500 font-bold mt-1 tracking-wider uppercase">Node Connected</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-20 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
              <div className="text-sm">{renderMessageContent(msg)}</div>
            </div>
          </div>
        ))}
        {activeTask && (
          <div className="mt-4 animate-in slide-in-from-bottom-4 duration-500">
            <TaskFlow 
              type={activeTask.type} 
              category={activeTask.category}
              difficulty={activeTask.difficulty} 
              onComplete={handleTaskComplete} 
              onCancel={() => { setActiveTask(null); addMessage("已取消当前任务", 'agent'); setTimeout(() => addMessage("", 'agent', 'task-type-select'), 400); }} 
            />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
};

export default ChatInterface;
