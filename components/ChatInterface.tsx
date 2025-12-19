
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
  onUpdateStats: (score: number, type: TaskType, difficulty: Difficulty, category?: CollectionCategory) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ stats, onBack, onUpdateStats }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTask, setActiveTask] = useState<{type: TaskType, category?: CollectionCategory, difficulty: Difficulty} | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcomeId = Date.now().toString();
    // Welcome message + Three buttons as requested
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
      addMessage("好的，正在为您匹配去中心化验证节点。任务即将开始：", 'agent', 'text');
      setActiveTask({ type, difficulty, category });
    }, 400);
  };

  const handleTaskComplete = (score: number, type: TaskType, details: string) => {
    const d = activeTask?.difficulty || Difficulty.EASY;
    const c = activeTask?.category;
    
    onUpdateStats(score, type, d, c);
    setActiveTask(null);

    const reportData = {
      username: stats.username,
      timestamp: Date.now(),
      type: type,
      difficulty: d,
      category: c,
      score: score,
      details: details
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
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm w-full">
            <h4 className="font-bold text-blue-800 mb-3 flex items-center">
               <span className="mr-2">📋</span> 任务日报
            </h4>
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between border-b pb-1"><span>用户名</span> <span className="font-bold">{r.username}</span></div>
              <div className="flex justify-between border-b pb-1"><span>时间戳</span> <span className="font-mono">{r.timestamp}</span></div>
              <div className="flex justify-between border-b pb-1"><span>任务类型</span> <span className="font-bold">{r.type}</span></div>
              <div className="flex justify-between border-b pb-1"><span>难度</span> <span>{r.difficulty}</span></div>
              {r.category && <div className="flex justify-between border-b pb-1"><span>分类</span> <span>{r.category}</span></div>}
              <div className="pt-3 flex justify-between items-center">
                <span className="font-bold text-gray-800">本次贡献得分</span>
                <span className="text-green-600 font-black text-xl">+{r.score}</span>
              </div>
            </div>
          </div>
        );
      case 'stats-report':
        const s = msg.payload;
        return (
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm w-full">
            <h4 className="font-bold text-indigo-900 mb-3 flex items-center">
               <span className="mr-2">📈</span> 累计统计报告
            </h4>
            <div className="space-y-1.5 text-xs text-indigo-800">
              <div className="flex justify-between border-b border-indigo-100 pb-1"><span>用户名</span> <span className="font-bold">{s.username}</span></div>
              <div className="flex justify-between border-b border-indigo-100 pb-1"><span>用户ID</span> <span className="font-mono text-[9px]">{s.userId}</span></div>
              <div className="flex justify-between border-b border-indigo-100 pb-1"><span>时间戳</span> <span className="font-mono">{s.reportTimestamp}</span></div>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                  <p className="text-[8px] text-gray-400 uppercase font-black">快判完成</p>
                  <p className="text-sm font-bold mt-0.5">{s.quickCount} 次</p>
                  <p className="text-[10px] text-green-600 font-bold mt-1">+{s.quickScore} 分</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                  <p className="text-[8px] text-gray-400 uppercase font-black">采集完成</p>
                  <p className="text-sm font-bold mt-0.5">{s.collectionCount} 次</p>
                  <p className="text-[10px] text-green-600 font-bold mt-1">+{s.collectionScore} 分</p>
                </div>
              </div>
              <div className="pt-4 border-t border-indigo-200 mt-2 flex justify-between items-center">
                <span className="font-bold text-indigo-900">累计任务贡献度</span>
                <span className="text-2xl font-black text-indigo-600">{s.totalScore}</span>
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
