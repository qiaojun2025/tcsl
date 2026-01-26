
import React, { useState, useEffect, useRef, memo } from 'react';
import { Difficulty, TaskType, UserStats, CollectionCategory, TaskCompletionRecord, MediaType } from '../types.ts';
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

const Typewriter = memo(({ text, onComplete }: { text: string, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    if (!text) return;
    const timer = setInterval(() => {
      setDisplayedText((prev) => prev + text[indexRef.current]);
      indexRef.current++;
      if (indexRef.current >= text.length) {
        clearInterval(timer);
        onComplete?.();
      }
    }, 10);
    return () => clearInterval(timer);
  }, [text, onComplete]);

  return <p className="leading-relaxed font-semibold text-gray-800">{displayedText}</p>;
});

const ChatInterface: React.FC<ChatInterfaceProps> = ({ stats, taskRecords, onBack, onUpdateTaskCompletion }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTask, setActiveTask] = useState<{type: TaskType, category?: CollectionCategory, difficulty: Difficulty, mediaType?: MediaType} | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isTaskActive = !!activeTask;

  useEffect(() => {
    setMessages([{
      id: Date.now().toString(),
      sender: 'agent',
      type: 'text',
      payload: "您好！我是您的任务中心助手。在这里，您可以通过参与数据标注与采集来贡献价值，并获得相应的贡献度。请选择您想参与的任务：",
      timestamp: Date.now(),
    }]);
    
    setTimeout(() => {
      addMessage("", 'agent', 'task-type-select');
    }, 1000);
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
    addMessage(`【${type}】`, 'user');
    if (type === TaskType.COLLECTION) {
        setTimeout(() => addMessage({ taskType: type }, 'agent', 'media-type-select'), 400);
    } else {
        setTimeout(() => addMessage({ taskType: type }, 'agent', 'difficulty-select'), 400);
    }
  };

  const handleSelectMediaType = (type: TaskType, mediaType: MediaType) => {
    let typeLabel = mediaType === 'IMAGE' ? '图片' : mediaType === 'AUDIO' ? '音频' : '视频';
    addMessage(`文件类型：${typeLabel}`, 'user');
    setTimeout(() => addMessage({ taskType: type, mediaType }, 'agent', 'difficulty-select'), 400);
  };

  const handleSelectDifficulty = (type: TaskType, difficulty: Difficulty, mediaType?: MediaType) => {
    addMessage(`难度：${difficulty}`, 'user');
    if (type === TaskType.QUICK_JUDGMENT) {
        setTimeout(() => setActiveTask({ type, difficulty }), 400);
    } else {
        setTimeout(() => addMessage({ taskType: type, difficulty, mediaType }, 'agent', 'category-select'), 400);
    }
  };

  const handleSelectCategory = (type: TaskType, difficulty: Difficulty, category: CollectionCategory, mediaType?: MediaType) => {
    addMessage(`分类：${category}`, 'user');
    setTimeout(() => setActiveTask({ type, difficulty, category, mediaType }), 400);
  };

  const handleBackToTaskType = () => {
    addMessage("返回上一步", 'user');
    setTimeout(() => addMessage("", 'agent', 'task-type-select'), 400);
  };

  const handleBackToMediaType = (type: TaskType) => {
    addMessage("返回选择文件类型", 'user');
    setTimeout(() => addMessage({ taskType: type }, 'agent', 'media-type-select'), 400);
  };
  
  const handleBackToDifficulty = (type: TaskType, mediaType?: MediaType) => {
    addMessage("返回选择难度", 'user');
    setTimeout(() => addMessage({ taskType: type, mediaType }, 'agent', 'difficulty-select'), 400);
  };

  const handleTaskComplete = (score: number, type: TaskType, performance: { correctCount: number; totalCount: number; startTime: number; endTime: number }) => {
    const d = activeTask?.difficulty || Difficulty.EASY;
    const c = activeTask?.category;
    onUpdateTaskCompletion(score, type, d, performance, c);
    setActiveTask(null);

    addMessage({
      taskNumber: `T${performance.endTime.toString().slice(-6)}`,
      username: stats.username,
      userId: stats.userId,
      timestamp: performance.endTime,
      startTime: performance.startTime,
      duration: Math.round((performance.endTime - performance.startTime) / 1000),
      type,
      difficulty: d,
      category: c,
      accuracy: `${performance.correctCount}/${performance.totalCount}`,
      score
    }, 'agent', 'task-report');
    
    setTimeout(() => addMessage("", 'agent', 'task-type-select'), 1500);
  };

  const showDailyReport = () => {
    addMessage("【我的日报统计】", 'user');
    setTimeout(() => {
      const startOfDay = new Date().setHours(0, 0, 0, 0);
      const todaysRecords = taskRecords.filter(r => r.timestamp >= startOfDay);
      const dailyStats = todaysRecords.reduce((acc, r) => {
        acc.totalDuration += r.duration; acc.totalScore += r.score;
        return acc;
      }, { totalDuration: 0, totalScore: 0 });
      addMessage({ ...dailyStats, reportTimestamp: Date.now() }, 'agent', 'daily-stats-report');
      setTimeout(() => addMessage("", 'agent', 'task-type-select'), 600);
    }, 400);
  };

  const showAccountStats = () => {
    addMessage("【我的账户统计】", 'user');
    setTimeout(() => {
      addMessage({ ...stats, reportTimestamp: Date.now() }, 'agent', 'account-stats-report');
      setTimeout(() => addMessage("", 'agent', 'task-type-select'), 600);
    }, 400);
  };

  const renderMessageContent = (msg: Message, isLast: boolean) => {
    // Buttons are disabled if a task is active OR if it's not the latest message in chat
    const isDisabled = isTaskActive || !isLast;

    switch (msg.type) {
      case 'text': return isLast && msg.sender === 'agent' ? <Typewriter text={msg.payload} /> : <p className="leading-relaxed font-semibold text-gray-800">{msg.payload}</p>;
      case 'task-type-select': return (
        <div className="grid grid-cols-1 gap-3 mt-2">
          <button disabled={isDisabled} onClick={() => handleSelectTaskType(TaskType.QUICK_JUDGMENT)} className="w-full py-4 rounded-2xl font-black bg-blue-600 text-white shadow-lg active:bg-blue-700 transition-all disabled:opacity-50">【快判任务】</button>
          <button disabled={isDisabled} onClick={() => handleSelectTaskType(TaskType.COLLECTION)} className="w-full py-4 rounded-2xl font-black bg-emerald-600 text-white shadow-lg active:bg-emerald-700 transition-all disabled:opacity-50">【采集任务】</button>
          <button disabled={isDisabled} onClick={showDailyReport} className="w-full py-4 rounded-2xl font-black bg-indigo-500 text-white shadow-lg active:bg-indigo-600 transition-all disabled:opacity-50">【我的日报统计】</button>
          <button disabled={isDisabled} onClick={showAccountStats} className="w-full py-4 rounded-2xl font-black bg-slate-700 text-white shadow-lg active:bg-slate-800 transition-all disabled:opacity-50">【我的账户统计】</button>
        </div>
      );
      case 'media-type-select': return (
        <div className="grid grid-cols-1 gap-2 mt-2">
           <button disabled={isDisabled} onClick={() => handleSelectMediaType(msg.payload.taskType, 'IMAGE')} className="w-full py-3.5 rounded-2xl font-black bg-white border-2 border-emerald-100 text-emerald-700 active:bg-emerald-50 disabled:opacity-50 transition-colors">图片</button>
           <button disabled={isDisabled} onClick={() => handleSelectMediaType(msg.payload.taskType, 'AUDIO')} className="w-full py-3.5 rounded-2xl font-black bg-white border-2 border-purple-100 text-purple-700 active:bg-purple-50 disabled:opacity-50 transition-colors">音频</button>
           <button disabled={isDisabled} onClick={() => handleSelectMediaType(msg.payload.taskType, 'VIDEO')} className="w-full py-3.5 rounded-2xl font-black bg-white border-2 border-rose-100 text-rose-700 active:bg-rose-50 disabled:opacity-50 transition-colors">视频</button>
           <button disabled={isDisabled} onClick={handleBackToTaskType} className="w-full py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest disabled:opacity-50">↩️ 返回上一层</button>
        </div>
      );
      case 'difficulty-select': return (
        <div className="grid grid-cols-1 gap-2 mt-2">
          {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map(d => (
            <button disabled={isDisabled} key={d} onClick={() => handleSelectDifficulty(msg.payload.taskType, d, msg.payload.mediaType)} className="w-full py-3.5 rounded-2xl font-black border-2 border-blue-50 text-blue-600 bg-white hover:border-blue-200 active:bg-blue-50 disabled:opacity-50 transition-all">{d}</button>
          ))}
          <button disabled={isDisabled} onClick={() => msg.payload.taskType === TaskType.COLLECTION ? handleBackToMediaType(msg.payload.taskType) : handleBackToTaskType()} className="w-full py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest disabled:opacity-50">↩️ 返回上一层</button>
        </div>
      );
      case 'category-select':
        const { taskType: catType, difficulty: catDiff, mediaType: catMedia } = msg.payload;
        let categories = [];
        if (catMedia === 'AUDIO') categories = [CollectionCategory.AUDIO];
        else if (catMedia === 'VIDEO') categories = [CollectionCategory.VIDEO];
        else categories = [CollectionCategory.ANIMAL, CollectionCategory.PLANT, CollectionCategory.PERSON, CollectionCategory.STREET, CollectionCategory.LIFE];
        categories.push(CollectionCategory.CUSTOM);
        return (
          <div className="grid grid-cols-1 gap-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              {categories.map(c => (
                <button disabled={isDisabled} key={c} onClick={() => handleSelectCategory(catType, catDiff, c, catMedia)} className="py-4 rounded-2xl border-2 border-gray-100 font-black text-gray-700 bg-white text-sm hover:border-gray-200 active:bg-gray-50 disabled:opacity-50 transition-all">{c}</button>
              ))}
            </div>
            <button disabled={isDisabled} onClick={() => handleBackToDifficulty(catType, catMedia)} className="w-full py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest disabled:opacity-50">↩️ 返回上一层</button>
          </div>
        );
      case 'task-report':
        const r = msg.payload;
        return (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl w-full text-sm animate-in zoom-in-95 duration-500">
            <h4 className="font-black text-gray-900 text-xl mb-4">任务报告</h4>
            <div className="space-y-2.5 mb-6">
              <div className="flex justify-between"><span className="text-gray-400 font-bold">用户名</span><span className="font-black text-gray-900">{r.username}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务ID</span><span className="font-mono text-gray-600">{r.taskNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务类型</span><span className="font-black text-gray-900">{r.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务级别</span><span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px]">{r.difficulty}</span></div>
              {r.category && <div className="flex justify-between"><span className="text-gray-400 font-bold">分类</span><span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">{r.category}</span></div>}
              <div className="flex justify-between"><span className="text-gray-400 font-bold">开始时间</span><span className="font-mono text-xs">{new Date(r.startTime).toLocaleTimeString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">耗时</span><span className="font-black text-gray-900">{formatDuration(r.duration)}</span></div>
              <div className="flex justify-between items-center border-t border-dashed pt-2 mt-2"><span className="text-gray-400 font-bold">准确率</span><span className="font-black text-lg text-emerald-600">{r.accuracy}</span></div>
            </div>
            <div className="flex justify-between items-center bg-blue-600 p-4 rounded-2xl text-white">
              <span className="font-black text-xs uppercase tracking-widest opacity-80">获得贡献度</span>
              <span className="text-3xl font-black">+{r.score}</span>
            </div>
          </div>
        );
      case 'daily-stats-report':
      case 'account-stats-report':
          const s = msg.payload;
          const isDaily = msg.type === 'daily-stats-report';
          return (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl w-full text-gray-800 animate-in slide-in-from-right-4">
              <h4 className="font-black text-gray-900 text-xl mb-1">{isDaily ? '今日统计' : '账户概览'}</h4>
              <p className="text-[10px] text-gray-400 font-mono mb-4">{new Date(s.reportTimestamp).toLocaleString()}</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 p-3 rounded-2xl"><p className="text-[9px] text-gray-400 font-black uppercase mb-1">总耗时</p><p className="font-black text-sm">{formatDuration(s.totalDuration)}</p></div>
                  <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><p className="text-[9px] text-blue-100 font-black uppercase mb-1">贡献度</p><p className="font-black text-sm">{s.totalScore || s.totalScore === 0 ? s.totalScore : (s.quickScore + s.collectionScore)}</p></div>
              </div>
            </div>
          );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFF]">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center px-4 h-16 shadow-sm">
        {!isTaskActive && (
          <button onClick={onBack} className="p-2 -ml-2 text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        <div className="flex flex-col ml-2">
          <h2 className="text-lg font-black text-gray-900">任务中心</h2>
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
        </div>
        <div className="ml-auto bg-blue-600 px-4 py-1.5 rounded-full shadow-lg shadow-blue-100">
          <span className="text-[11px] font-black text-white">{stats.totalScore} PTS</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] ${msg.sender === 'agent' ? msg.type === 'text' ? 'bg-white text-gray-800 rounded-3xl rounded-tl-sm shadow-md border border-gray-50 p-4' : 'w-full' : 'bg-blue-600 text-white rounded-3xl rounded-tr-sm shadow-xl p-4 font-black'}`}>
              {renderMessageContent(msg, idx === messages.length - 1)}
            </div>
          </div>
        ))}
        {activeTask && (
          <div className="mt-4 animate-in slide-in-from-bottom-8 duration-500">
            <TaskFlow 
              {...activeTask} 
              onComplete={handleTaskComplete} 
              onCancel={() => { 
                setActiveTask(null); 
                addMessage("已取消任务", 'user'); 
                setTimeout(() => addMessage("", 'agent', 'task-type-select'), 500); 
              }} 
            />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
};

export default ChatInterface;
