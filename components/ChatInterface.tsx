
import React, { useState, useEffect, useRef, memo } from 'react';
import { GoogleGenAI } from "@google/genai";
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

const formatDuration = (seconds: number = 0) => {
    const s = Math.max(0, seconds);
    if (s < 60) return `${s}秒`;
    const minutes = Math.floor(s / 60);
    const remainingSeconds = s % 60;
    return `${minutes}分${remainingSeconds}秒`;
};

const Typewriter = memo(({ text, onComplete }: { text: string, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    if (!text) return;
    setDisplayedText("");
    indexRef.current = 0;
    const timer = setInterval(() => {
      const char = text[indexRef.current];
      if (char !== undefined) {
        setDisplayedText((prev) => prev + char);
      }
      indexRef.current++;
      if (indexRef.current >= text.length) {
        clearInterval(timer);
        onComplete?.();
      }
    }, 10);
    return () => clearInterval(timer);
  }, [text, onComplete]);

  return <p className="leading-relaxed font-semibold text-gray-800">{displayedText || ""}</p>;
});

const ChatInterface: React.FC<ChatInterfaceProps> = ({ stats, taskRecords, onBack, onUpdateTaskCompletion }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTask, setActiveTask] = useState<{type: TaskType, category?: CollectionCategory, difficulty: Difficulty | string, mediaType?: MediaType, customLabels?: string[], classification?: string} | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const [customFlowState, setCustomFlowState] = useState<'IDLE' | 'AWAITING_CLASSIFICATION' | 'AWAITING_LABELS'>('IDLE');
  const [pendingTaskInfo, setPendingTaskInfo] = useState<any>(null);
  const [customClassification, setCustomClassification] = useState('');
  const [customLabels, setCustomLabels] = useState<string[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isTaskActive = !!activeTask;

  useEffect(() => {
    setMessages([{
      id: Date.now().toString(),
      sender: 'agent',
      type: 'text',
      payload: "您好！我是您的任务中心 Agent。在这里您可以贡献高质量数据并赚取 PTS 奖励。请选择一个功能开始：",
      timestamp: Date.now(),
    }]);
    
    setTimeout(() => {
      addMessage({}, 'agent', 'task-type-select');
    }, 800);
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, activeTask, isTyping, customFlowState]);

  const addMessage = (payload: any, sender: 'agent' | 'user' = 'agent', type: Message['type'] = 'text') => {
    setMessages(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      sender,
      type,
      payload: payload || {},
      timestamp: Date.now()
    }]);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isTyping || isTaskActive) return;

    const query = userInput.trim();
    setUserInput('');
    addMessage(query, 'user');

    if (customFlowState === 'AWAITING_CLASSIFICATION') {
      setCustomClassification(query);
      setCustomFlowState('AWAITING_LABELS');
      setTimeout(() => {
        if (pendingTaskInfo.mediaType === 'VIDEO') {
          addMessage("请输入视频采集题目的标注内容", 'agent');
        } else {
          addMessage(`请输入10道采集题目的标注内容，当前 1/10`, 'agent');
        }
      }, 400);
      return;
    }

    if (customFlowState === 'AWAITING_LABELS') {
      const isVideo = pendingTaskInfo.mediaType === 'VIDEO';
      
      if (!isVideo && customLabels.includes(query)) {
        addMessage(`标注内容重复，请输入不同的内容。当前仍为 ${customLabels.length + 1}/10`, 'agent');
        return;
      }

      const nextLabels = [...customLabels, query];
      const targetCount = isVideo ? 1 : 10;

      if (nextLabels.length < targetCount) {
        setCustomLabels(nextLabels);
        setTimeout(() => {
          addMessage(`请输入10道采集题目的标注内容，当前 ${nextLabels.length + 1}/10`, 'agent');
        }, 400);
      } else {
        setCustomFlowState('IDLE');
        const info = pendingTaskInfo;
        setPendingTaskInfo(null);
        setTimeout(() => {
          addMessage(`信息采集完成，准备开始自定义任务。`, 'agent');
          setTimeout(() => {
            setActiveTask({ 
              type: info.taskType, 
              difficulty: '自定义', 
              category: CollectionCategory.CUSTOM, 
              mediaType: info.mediaType,
              classification: customClassification,
              customLabels: nextLabels
            });
          }, 600);
        }, 400);
      }
      return;
    }

    setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = `你是一个Web3任务中心的Agent。当前用户：${stats.username}。
      职责：引导用户完成快判与采集任务。请用简练、专业的语言回复用户咨询。`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: { systemInstruction }
      });

      setIsTyping(false);
      addMessage(response.text || "我还在学习中，请选择下方按钮进行操作。", 'agent');
    } catch (error) {
      setIsTyping(false);
      addMessage("系统忙，请重试。", 'agent');
    }
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
    addMessage(`文件类型：${mediaType === 'IMAGE' ? '图片' : mediaType === 'AUDIO' ? '音频' : '视频'}`, 'user');
    setTimeout(() => addMessage({ taskType: type, mediaType }, 'agent', 'difficulty-select'), 400);
  };

  const handleSelectDifficulty = (type: TaskType, difficulty: any, mediaType?: MediaType) => {
    addMessage(`难度：${difficulty}`, 'user');
    if (difficulty === '自定义' && type === TaskType.COLLECTION) {
        setCustomFlowState('AWAITING_CLASSIFICATION');
        setPendingTaskInfo({ taskType: type, mediaType });
        setCustomLabels([]);
        setTimeout(() => addMessage("请输入采集分类", 'agent'), 400);
    } else if (type === TaskType.QUICK_JUDGMENT) {
        setActiveTask({ type, difficulty: difficulty as Difficulty });
    } else {
        setTimeout(() => addMessage({ taskType: type, difficulty, mediaType }, 'agent', 'category-select'), 400);
    }
  };

  const handleSelectCategory = (taskType: TaskType, difficulty: Difficulty | string, category: CollectionCategory, mediaType?: MediaType) => {
    addMessage(`分类：${category}`, 'user');
    setActiveTask({ type: taskType, difficulty, category, mediaType });
  };

  const handleGoBack = (to: 'type' | 'media' | 'difficulty' | 'category', data: any) => {
    addMessage("返回上一层", 'user');
    if (customFlowState !== 'IDLE') {
        setCustomFlowState('IDLE');
        setCustomLabels([]);
        setCustomClassification('');
    }
    setTimeout(() => {
        if (to === 'type') addMessage({}, 'agent', 'task-type-select');
        else if (to === 'media') addMessage({ taskType: data?.taskType }, 'agent', 'media-type-select');
        else if (to === 'difficulty') addMessage({ taskType: data?.taskType, mediaType: data?.mediaType }, 'agent', 'difficulty-select');
    }, 400);
  };

  const handleTaskComplete = (score: number, type: TaskType, performance: { correctCount: number; totalCount: number; startTime: number; endTime: number }) => {
    const d = activeTask?.difficulty || Difficulty.EASY;
    const c = activeTask?.category;
    onUpdateTaskCompletion(score, type, d as Difficulty, performance, c);
    
    addMessage({
      taskNumber: `SN-${performance.endTime.toString().slice(-6)}`,
      username: stats.username,
      startTime: performance.startTime,
      duration: Math.round((performance.endTime - performance.startTime) / 1000),
      type,
      difficulty: d,
      category: c,
      accuracy: `${performance.correctCount}/${performance.totalCount}`,
      score
    }, 'agent', 'task-report');
    
    setActiveTask(null);
    setTimeout(() => addMessage({}, 'agent', 'task-type-select'), 1500);
  };

  const renderMessageContent = (msg: Message, isLast: boolean) => {
    const isDisabled = isTaskActive || customFlowState !== 'IDLE' || !isLast;

    switch (msg.type) {
      case 'text': 
        return isLast && msg.sender === 'agent' ? <Typewriter text={msg.payload || ""} /> : <p className="leading-relaxed font-semibold text-gray-800">{msg.payload || ""}</p>;
      case 'task-type-select': return (
        <div className="grid grid-cols-1 gap-3 mt-2">
          <button disabled={isDisabled} onClick={() => handleSelectTaskType(TaskType.QUICK_JUDGMENT)} className="w-full py-4 rounded-2xl font-black bg-blue-600 text-white shadow-lg active:scale-95 disabled:opacity-50">【快判任务】</button>
          <button disabled={isDisabled} onClick={() => handleSelectTaskType(TaskType.COLLECTION)} className="w-full py-4 rounded-2xl font-black bg-emerald-600 text-white shadow-lg active:scale-95 disabled:opacity-50">【采集任务】</button>
          <button disabled={isDisabled} onClick={() => { addMessage("【我的日报统计】", 'user'); setTimeout(() => {
              const startOfDay = new Date().setHours(0, 0, 0, 0);
              const todaysRecords = taskRecords.filter(r => r.timestamp >= startOfDay);
              const dailyStats = todaysRecords.reduce((acc, r) => { acc.totalDuration += r.duration; acc.totalScore += r.score; return acc; }, { totalDuration: 0, totalScore: 0 });
              addMessage({ ...dailyStats }, 'agent', 'daily-stats-report');
              setTimeout(() => addMessage({}, 'agent', 'task-type-select'), 600);
          }, 400); }} className="w-full py-4 rounded-2xl font-black bg-indigo-500 text-white shadow-lg active:scale-95 disabled:opacity-50">【我的日报统计】</button>
          <button disabled={isDisabled} onClick={() => { addMessage("【我的账户统计】", 'user'); setTimeout(() => {
              addMessage({ ...stats }, 'agent', 'account-stats-report');
              setTimeout(() => addMessage({}, 'agent', 'task-type-select'), 600);
          }, 400); }} className="w-full py-4 rounded-2xl font-black bg-slate-700 text-white shadow-lg active:scale-95 disabled:opacity-50">【我的账户统计】</button>
        </div>
      );
      case 'media-type-select': return (
        <div className="grid grid-cols-1 gap-2 mt-2">
           {['IMAGE', 'AUDIO', 'VIDEO'].map(mt => (
               <button key={mt} disabled={isDisabled} onClick={() => handleSelectMediaType(msg.payload.taskType, mt as MediaType)} className="w-full py-3.5 rounded-2xl font-black bg-white border-2 border-gray-100 text-gray-700 active:bg-gray-50 disabled:opacity-50">
                   {mt === 'IMAGE' ? '图片' : mt === 'AUDIO' ? '音频' : '视频'}
               </button>
           ))}
           <button disabled={isDisabled} onClick={() => handleGoBack('type', null)} className="w-full py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">↩️ 返回上一层</button>
        </div>
      );
      case 'difficulty-select': return (
        <div className="grid grid-cols-1 gap-2 mt-2">
          {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD, '自定义'].map(d => (
            <button disabled={isDisabled} key={d} onClick={() => handleSelectDifficulty(msg.payload.taskType, d, msg.payload.mediaType)} className="w-full py-3.5 rounded-2xl font-black border-2 border-blue-50 text-blue-600 bg-white active:bg-blue-50 disabled:opacity-50">{d}</button>
          ))}
          <button disabled={isDisabled} onClick={() => handleGoBack(msg.payload.taskType === TaskType.COLLECTION ? 'media' : 'type', msg.payload)} className="w-full py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">↩️ 返回上一层</button>
        </div>
      );
      case 'category-select':
        const { taskType, difficulty, mediaType } = msg.payload;
        let cats = [];
        if (mediaType === 'AUDIO') cats = [CollectionCategory.AUDIO];
        else if (mediaType === 'VIDEO') cats = [CollectionCategory.VIDEO];
        else cats = [CollectionCategory.ANIMAL, CollectionCategory.PLANT, CollectionCategory.PERSON, CollectionCategory.STREET, CollectionCategory.LIFE];
        return (
          <div className="grid grid-cols-1 gap-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              {cats.map(c => (
                <button disabled={isDisabled} key={c} onClick={() => handleSelectCategory(taskType, difficulty, c, mediaType)} className="py-4 rounded-2xl border-2 border-gray-100 font-black text-gray-700 bg-white text-sm active:bg-gray-50 disabled:opacity-50">{c}</button>
              ))}
            </div>
            <button disabled={isDisabled} onClick={() => handleGoBack('difficulty', msg.payload)} className="w-full py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">↩️ 返回上一层</button>
          </div>
        );
      case 'task-report':
        const r = msg.payload;
        return (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl w-full text-sm">
            <h4 className="font-black text-gray-900 text-xl mb-4 text-center">任务报告</h4>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between"><span className="text-gray-400 font-bold">用户名</span><span className="font-black">{r.username}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务ID</span><span className="font-mono">{r.taskNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务类型</span><span className="font-black">{r.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务级别</span><span className="font-black text-blue-600">{r.difficulty}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">开始时间</span><span className="font-black text-gray-600">{new Date(r.startTime).toLocaleTimeString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务耗时</span><span className="font-black">{formatDuration(r.duration)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务准确率</span><span className="font-black text-lg text-emerald-600">{r.accuracy}</span></div>
              <div className="flex justify-between border-t pt-2 mt-2"><span className="text-gray-400 font-bold">获得贡献度</span><span className="font-black text-xl text-blue-600">+{r.score} PTS</span></div>
              {r.category && <div className="flex justify-between"><span className="text-gray-400 font-bold">任务分类</span><span className="font-black text-amber-600">{r.category}</span></div>}
            </div>
          </div>
        );
      case 'daily-stats-report':
      case 'account-stats-report':
          const s = msg.payload;
          return (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl w-full text-gray-800">
              <h4 className="font-black text-gray-900 text-xl mb-4">{msg.type === 'daily-stats-report' ? '今日统计' : '账户概览'}</h4>
              <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-2xl"><p className="text-[9px] text-gray-400 font-black mb-1 uppercase">总耗时</p><p className="font-black text-sm">{formatDuration(s.totalDuration || 0)}</p></div>
                  <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-100"><p className="text-[9px] text-blue-100 font-black mb-1 uppercase">贡献度</p><p className="font-black text-sm">{(s.totalScore || 0).toLocaleString()} PTS</p></div>
              </div>
            </div>
          );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFF] relative">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center px-4 h-16 shadow-sm">
        {!isTaskActive && customFlowState === 'IDLE' && (
          <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        <div className="flex flex-col ml-2">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">任务中心</h2>
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Online</span>
        </div>
        <div className="ml-auto bg-blue-600 px-4 py-1.5 rounded-full shadow-lg">
          <span className="text-[11px] font-black text-white">{stats.totalScore.toLocaleString()} PTS</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] ${msg.sender === 'agent' ? msg.type === 'text' ? 'bg-white text-gray-800 rounded-3xl rounded-tl-sm shadow-md border border-gray-50 p-4' : 'w-full' : 'bg-blue-600 text-white rounded-3xl rounded-tr-sm shadow-xl p-4 font-black'}`}>
              {renderMessageContent(msg, idx === messages.length - 1)}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex space-x-1">
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        )}

        {activeTask && (
          <div className="mt-4 animate-in slide-in-from-bottom-8 duration-500">
            <TaskFlow 
              {...activeTask} 
              onComplete={handleTaskComplete} 
              onCancel={() => { 
                setActiveTask(null); 
                addMessage("任务已退出。", 'agent'); 
                setTimeout(() => addMessage({}, 'agent', 'task-type-select'), 500); 
              }} 
            />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {!isTaskActive && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex flex-col">
          {customFlowState !== 'IDLE' && (
            <div className="flex justify-end mb-2 px-1">
              <button 
                onClick={() => handleGoBack('category', pendingTaskInfo)}
                className="flex items-center space-x-1.5 py-1.5 px-4 bg-white border-2 border-gray-100 rounded-full text-[11px] font-black text-blue-600 shadow-sm active:scale-95 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span>返回重新选择</span>
              </button>
            </div>
          )}
          <div className="flex space-x-2">
            <input 
              type="text" 
              placeholder={
                customFlowState === 'AWAITING_CLASSIFICATION' ? "请输入本次自定义采集任务的分类..." :
                customFlowState === 'AWAITING_LABELS' ? (pendingTaskInfo.mediaType === 'VIDEO' ? "请输入标注内容..." : `请输入第 ${customLabels.length + 1} 题标注内容...`) :
                "输入标注内容或咨询信息..."
              } 
              className={`flex-1 px-4 py-3 ${customFlowState !== 'IDLE' ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'} border rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button 
              onClick={handleSendMessage}
              disabled={!userInput.trim() || isTyping}
              className={`w-12 h-12 ${customFlowState !== 'IDLE' ? 'bg-emerald-600' : 'bg-blue-600'} rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-all disabled:opacity-50`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
