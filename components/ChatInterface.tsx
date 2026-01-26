
import React, { useState, useEffect, useRef, memo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Difficulty, TaskType, UserStats, CollectionCategory, TaskCompletionRecord, MediaType } from '../types.ts';
import TaskFlow from './TaskFlow.tsx';

interface Message {
  id: string;
  sender: 'agent' | 'user';
  type: 'text' | 'task-type-select' | 'media-type-select' | 'difficulty-select' | 'category-select' | 'account-stats-report' | 'daily-stats-report' | 'task-report';
  payload: any;
  timestamp: number;
}

interface ChatInterfaceProps {
  stats: UserStats;
  taskRecords: TaskCompletionRecord[];
  onBack: () => void;
  onUpdateTaskCompletion: (score: number, type: TaskType, difficulty: Difficulty, performance: { correctCount: number; totalCount: number; startTime: number; endTime: number }, category?: CollectionCategory) => void;
}

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

  return <p className="leading-relaxed font-semibold text-gray-800">{displayedText}</p>;
});

const ChatInterface: React.FC<ChatInterfaceProps> = ({ stats, taskRecords, onBack, onUpdateTaskCompletion }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTask, setActiveTask] = useState<{type: TaskType, category?: CollectionCategory, difficulty: Difficulty | string, mediaType?: MediaType, prompt: string, totalTasks: number, currentIndex: number} | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const [workflowState, setWorkflowState] = useState<'IDLE' | 'AWAITING_CLASSIFICATION' | 'AWAITING_LABELS'>('IDLE');
  const [tempConfig, setTempConfig] = useState<any>(null);
  const [customLabels, setCustomLabels] = useState<string[]>([]);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState(0);
  const [sessionStats, setSessionStats] = useState({ score: 0, correct: 0 });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isTaskActive = !!activeTask;

  useEffect(() => {
    setMessages([{
      id: Date.now().toString(),
      sender: 'agent',
      type: 'text',
      payload: "您好！我是您的任务中心 Agent。请选择一个任务类型开始您的 Web3 数据贡献之旅。",
      timestamp: Date.now(),
    }]);
    
    setTimeout(() => {
      addMessage({}, 'agent', 'task-type-select');
    }, 800);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTask, isTyping, workflowState]);

  const addMessage = (payload: any, sender: 'agent' | 'user' = 'agent', type: Message['type'] = 'text') => {
    setMessages(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      sender,
      type,
      payload: payload || {},
      timestamp: Date.now()
    }]);
  };

  const startTaskExecution = (label: string, isFirstCustom: boolean = false) => {
    const mediaType = tempConfig?.mediaType || activeTask?.mediaType;
    const isVideo = mediaType === 'VIDEO';
    
    let intro = "";
    if (label) {
      const actionText = mediaType === 'IMAGE' ? '相册上传或者拍摄图片上传' : mediaType === 'AUDIO' ? '录制音频上传' : '录制视频上传';
      intro = `好的，我已经记录了您的标注内容：【${label}】。现在请${actionText}。`;
    }

    if (intro) addMessage(intro, 'agent');

    setTimeout(() => {
      setActiveTask({
        type: TaskType.COLLECTION,
        category: CollectionCategory.CUSTOM,
        difficulty: '自定义',
        mediaType: mediaType,
        prompt: label,
        totalTasks: 1, // 自定义任务每次输入后执行一条
        currentIndex: customLabels.length
      });
    }, 800);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isTyping || isTaskActive) return;

    const val = userInput.trim();
    setUserInput('');
    addMessage(val, 'user');

    if (workflowState === 'AWAITING_CLASSIFICATION') {
      setCustomCategoryName(val);
      setWorkflowState('AWAITING_LABELS');
      setSessionStartTime(Date.now());
      setSessionStats({ score: 0, correct: 0 });
      setTimeout(() => {
        if (tempConfig.mediaType === 'VIDEO') {
          addMessage("请输入视频采集题目的标注内容", 'agent');
        } else {
          addMessage(`请输入10道采集题目的标注内容，当前 1/10。`, 'agent');
        }
      }, 400);
      return;
    }

    if (workflowState === 'AWAITING_LABELS') {
      const isVideo = tempConfig.mediaType === 'VIDEO';
      if (!isVideo && customLabels.includes(val)) {
        addMessage("标注内容重复，请输入不同的内容。", 'agent');
        return;
      }
      
      // 记录当前正在进行的标注
      setTempConfig(prev => ({ ...prev, currentLabel: val }));
      startTaskExecution(val, customLabels.length === 0);
      return;
    }

    setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: val,
        config: { systemInstruction: "你是一个任务中心助手。帮助用户解答任务规则和状态。" }
      });
      setIsTyping(false);
      addMessage(response.text || "请通过下方功能按钮进行操作。", 'agent');
    } catch (e) {
      setIsTyping(false);
      addMessage("系统忙，请重试。", 'agent');
    }
  };

  const handleAction = (type: string, data: any) => {
    if (isTaskActive) return;
    
    switch(type) {
      case 'SELECT_TYPE':
        addMessage(`【${data}】`, 'user');
        if (data === TaskType.COLLECTION) {
          setTimeout(() => addMessage({ taskType: data }, 'agent', 'media-type-select'), 400);
        } else {
          setTimeout(() => addMessage({ taskType: data }, 'agent', 'difficulty-select'), 400);
        }
        break;
      case 'SELECT_MEDIA':
        addMessage(`文件类型：${data === 'IMAGE' ? '图片' : data === 'AUDIO' ? '音频' : '视频'}`, 'user');
        setTimeout(() => addMessage({ taskType: TaskType.COLLECTION, mediaType: data }, 'agent', 'difficulty-select'), 400);
        break;
      case 'SELECT_DIFFICULTY':
        addMessage(`难度：${data}`, 'user');
        if (data === '自定义') {
          setWorkflowState('AWAITING_CLASSIFICATION');
          setTempConfig({ taskType: TaskType.COLLECTION, mediaType: messages[messages.length-1].payload.mediaType });
          setTimeout(() => addMessage("请输入采集分类", 'agent'), 400);
        } else if (messages[messages.length-1].payload.taskType === TaskType.QUICK_JUDGMENT) {
          setActiveTask({ type: TaskType.QUICK_JUDGMENT, difficulty: data, prompt: '', totalTasks: 10, currentIndex: 0 });
        } else {
          setTimeout(() => addMessage({ ...messages[messages.length-1].payload, difficulty: data }, 'agent', 'category-select'), 400);
        }
        break;
      case 'SELECT_CATEGORY':
        addMessage(`分类：${data}`, 'user');
        const mType = messages[messages.length-1].payload.mediaType;
        const total = mType === 'VIDEO' ? 1 : 10;
        setActiveTask({ 
          ...messages[messages.length-1].payload, 
          category: data, 
          type: TaskType.COLLECTION, 
          prompt: '', 
          totalTasks: total, 
          currentIndex: 0 
        });
        break;
      case 'GO_BACK':
        addMessage("返回上一层", 'user');
        if (workflowState !== 'IDLE') {
          setWorkflowState('IDLE');
          setTempConfig(null);
          setCustomLabels([]);
        }
        setTimeout(() => addMessage({}, 'agent', data), 400);
        break;
      case 'DAILY_REPORT':
        addMessage("【我的日报统计】", 'user');
        setTimeout(() => {
          const startOfDay = new Date().setHours(0,0,0,0);
          const daily = taskRecords.filter(r => r.timestamp >= startOfDay);
          addMessage({
            totalDuration: daily.reduce((a,b) => a + b.duration, 0),
            totalScore: daily.reduce((a,b) => a + b.score, 0)
          }, 'agent', 'daily-stats-report');
          setTimeout(() => addMessage({}, 'agent', 'task-type-select'), 1000);
        }, 400);
        break;
      case 'ACCOUNT_STATS':
        addMessage("【我的账户统计】", 'user');
        setTimeout(() => {
          addMessage({ ...stats }, 'agent', 'account-stats-report');
          setTimeout(() => addMessage({}, 'agent', 'task-type-select'), 1000);
        }, 400);
        break;
    }
  };

  const handleTaskComplete = (score: number, type: TaskType, performance: { correctCount: number; totalCount: number; startTime: number; endTime: number }) => {
    // 处理普通任务
    if (!activeTask?.category || activeTask.category !== CollectionCategory.CUSTOM) {
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
      return;
    }

    // 处理自定义任务的一道题
    const isVideo = tempConfig.mediaType === 'VIDEO';
    const targetCount = isVideo ? 1 : 10;
    const nextLabels = [...customLabels, tempConfig.currentLabel];
    const nextStats = { 
      score: sessionStats.score + score, 
      correct: sessionStats.correct + (performance.correctCount > 0 ? 1 : 0) 
    };
    
    setCustomLabels(nextLabels);
    setSessionStats(nextStats);
    setActiveTask(null);

    if (nextLabels.length < targetCount) {
      setTimeout(() => {
        addMessage(`任务完成后，请输入下一道题目的标注内容，当前 ${nextLabels.length + 1}/10。`, 'agent');
      }, 500);
    } else {
      // 自定义任务全部结束
      const endTime = Date.now();
      const perf = {
        correctCount: nextStats.correct,
        totalCount: targetCount,
        startTime: sessionStartTime,
        endTime
      };
      
      onUpdateTaskCompletion(nextStats.score, TaskType.COLLECTION, Difficulty.EASY, perf, CollectionCategory.CUSTOM);
      
      addMessage({
        taskNumber: `SN-${endTime.toString().slice(-6)}`,
        username: stats.username,
        startTime: sessionStartTime,
        duration: Math.round((endTime - sessionStartTime) / 1000),
        type: TaskType.COLLECTION,
        difficulty: '自定义',
        category: customCategoryName,
        accuracy: `${nextStats.correct}/${targetCount}`,
        score: nextStats.score
      }, 'agent', 'task-report');

      setWorkflowState('IDLE');
      setCustomLabels([]);
      setTempConfig(null);
      setTimeout(() => addMessage({}, 'agent', 'task-type-select'), 1500);
    }
  };

  const renderButtons = (msg: Message, isLast: boolean) => {
    const disabled = isTaskActive || workflowState !== 'IDLE' || !isLast;
    const btnClass = "w-full py-3.5 rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-40 disabled:grayscale ";
    
    switch(msg.type) {
      case 'task-type-select': return (
        <div className="space-y-3 mt-2">
          <button disabled={disabled} onClick={() => handleAction('SELECT_TYPE', TaskType.QUICK_JUDGMENT)} className={btnClass + "bg-blue-600 text-white shadow-lg shadow-blue-100"}>【快判任务】</button>
          <button disabled={disabled} onClick={() => handleAction('SELECT_TYPE', TaskType.COLLECTION)} className={btnClass + "bg-emerald-600 text-white shadow-lg shadow-emerald-100"}>【采集任务】</button>
          <button disabled={disabled} onClick={() => handleAction('DAILY_REPORT', null)} className={btnClass + "bg-indigo-500 text-white"}>【我的日报统计】</button>
          <button disabled={disabled} onClick={() => handleAction('ACCOUNT_STATS', null)} className={btnClass + "bg-slate-700 text-white"}>【我的账户统计】</button>
        </div>
      );
      case 'media-type-select': return (
        <div className="space-y-2 mt-2">
          {['IMAGE', 'AUDIO', 'VIDEO'].map(t => (
            <button key={t} disabled={disabled} onClick={() => handleAction('SELECT_MEDIA', t)} className={btnClass + "bg-white border-2 border-gray-100 text-gray-700"}>{t === 'IMAGE' ? '图片' : t === 'AUDIO' ? '音频' : '视频'}</button>
          ))}
          <button disabled={disabled} onClick={() => handleAction('GO_BACK', 'task-type-select')} className="w-full py-2 text-xs font-black text-gray-400 uppercase tracking-widest mt-2">↩️ 返回上一层</button>
        </div>
      );
      case 'difficulty-select': return (
        <div className="space-y-2 mt-2">
          {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD, '自定义'].map(d => (
            <button key={d} disabled={disabled} onClick={() => handleAction('SELECT_DIFFICULTY', d)} className={btnClass + "bg-white border-2 border-blue-50 text-blue-600"}>{d}</button>
          ))}
          <button disabled={disabled} onClick={() => handleAction('GO_BACK', msg.payload.taskType === TaskType.COLLECTION ? 'media-type-select' : 'task-type-select')} className="w-full py-2 text-xs font-black text-gray-400 uppercase tracking-widest mt-2">↩️ 返回上一层</button>
        </div>
      );
      case 'category-select': return (
        <div className="grid grid-cols-2 gap-3 mt-2">
          {(msg.payload.mediaType === 'AUDIO' ? [CollectionCategory.AUDIO] : 
            msg.payload.mediaType === 'VIDEO' ? [CollectionCategory.VIDEO] : 
            [CollectionCategory.ANIMAL, CollectionCategory.PLANT, CollectionCategory.PERSON, CollectionCategory.STREET, CollectionCategory.LIFE]).map(c => (
            <button key={c} disabled={disabled} onClick={() => handleAction('SELECT_CATEGORY', c)} className={btnClass + "bg-white border-2 border-gray-100 text-gray-700 text-xs"}>{c}</button>
          ))}
          <button disabled={disabled} onClick={() => handleAction('GO_BACK', 'difficulty-select')} className="col-span-2 py-2 text-xs font-black text-gray-400 uppercase tracking-widest">↩️ 返回上一层</button>
        </div>
      );
      case 'task-report':
        const r = msg.payload;
        return (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl w-full text-sm">
            <h4 className="font-black text-gray-900 text-xl mb-4 text-center border-b pb-2">任务报告</h4>
            <div className="space-y-2.5 mb-6">
              <div className="flex justify-between"><span className="text-gray-400 font-bold">用户名</span><span className="font-black">{r.username}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务ID</span><span className="font-mono">{r.taskNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务类型</span><span className="font-black">{r.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务级别</span><span className="font-black text-blue-600">{r.difficulty}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">开始时间</span><span className="font-black text-gray-600">{new Date(r.startTime).toLocaleTimeString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务耗时</span><span className="font-black text-indigo-600">{r.duration}s</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务准确率</span><span className="font-black text-lg text-emerald-600">{r.accuracy}</span></div>
              {r.category && <div className="flex justify-between"><span className="text-gray-400 font-bold">采集分类</span><span className="font-black text-amber-600">{r.category}</span></div>}
            </div>
            <div className="bg-blue-600 p-4 rounded-2xl text-white text-center shadow-lg">
              <p className="text-2xl font-black">+{r.score} PTS</p>
            </div>
          </div>
        );
      case 'daily-stats-report':
      case 'account-stats-report':
          const s = msg.payload;
          return (
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xl w-full">
              <h4 className="font-black text-gray-900 text-lg mb-3">{msg.type === 'daily-stats-report' ? '今日统计' : '账户概览'}</h4>
              <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-2xl"><p className="text-[9px] text-gray-400 font-black mb-1 uppercase">总耗时</p><p className="font-black text-sm">{s.totalDuration}s</p></div>
                  <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-md"><p className="text-[9px] text-blue-100 font-black mb-1 uppercase">贡献度</p><p className="font-black text-sm">{s.totalScore.toLocaleString()} PTS</p></div>
              </div>
            </div>
          );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFF] relative">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center px-4 h-16 shadow-sm">
        {!isTaskActive && workflowState === 'IDLE' && (
          <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        <div className="flex flex-col ml-2">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">任务中心 Agent</h2>
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Online</span>
        </div>
        <div className="ml-auto bg-blue-600 px-4 py-1.5 rounded-full shadow-lg">
          <span className="text-[11px] font-black text-white">{stats.totalScore.toLocaleString()} PTS</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-28">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] ${msg.sender === 'agent' ? msg.type === 'text' ? 'bg-white text-gray-800 rounded-3xl rounded-tl-sm shadow-md border border-gray-50 p-4' : 'w-full' : 'bg-blue-600 text-white rounded-3xl rounded-tr-sm shadow-xl p-4 font-black'}`}>
              {msg.type === 'text' && msg.sender === 'agent' && idx === messages.length - 1 ? <Typewriter text={msg.payload} /> : 
               msg.type === 'text' ? <p className="leading-relaxed font-semibold text-gray-800">{msg.payload}</p> : null}
              {renderButtons(msg, idx === messages.length - 1)}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex space-x-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.4s'}}></div>
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
                if (workflowState === 'IDLE') {
                  setTimeout(() => addMessage({}, 'agent', 'task-type-select'), 800); 
                } else {
                   // 如果在自定义标注过程中退出，询问下一个标注
                   addMessage(`任务已退出。请输入下一道题目的标注内容，当前 ${customLabels.length + 1}/10。`, 'agent');
                }
              }} 
            />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {!isTaskActive && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex flex-col">
          {workflowState !== 'IDLE' && (
            <div className="flex justify-end mb-2 px-1">
              <button 
                onClick={() => handleAction('GO_BACK', 'media-type-select')}
                className="flex items-center space-x-1.5 py-1.5 px-4 bg-white border-2 border-gray-100 rounded-full text-[11px] font-black text-blue-600 shadow-sm active:scale-95 transition-all"
              >
                <span>↩️ 返回上一层重新选择</span>
              </button>
            </div>
          )}
          <div className="flex space-x-2">
            <input 
              type="text" 
              placeholder={
                workflowState === 'AWAITING_CLASSIFICATION' ? "请输入本次自定义采集任务的分类..." :
                workflowState === 'AWAITING_LABELS' ? (tempConfig.mediaType === 'VIDEO' ? "请输入视频标注..." : `请输入第 ${customLabels.length + 1} 题标注内容...`) :
                "输入标注内容或咨询信息..."
              } 
              className={`flex-1 px-4 py-3.5 ${workflowState !== 'IDLE' ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'} border rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button 
              onClick={handleSendMessage}
              disabled={!userInput.trim() || isTyping}
              className={`w-14 h-14 ${workflowState !== 'IDLE' ? 'bg-emerald-600' : 'bg-blue-600'} rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-all disabled:opacity-50`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
