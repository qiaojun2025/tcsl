
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Difficulty, TaskType, UserStats, CollectionCategory, TaskCompletionRecord, MediaType } from '../types.ts';
import TaskFlow from './TaskFlow.tsx';

interface ChatInterfaceProps {
  stats: UserStats;
  taskRecords: TaskCompletionRecord[];
  onBack: () => void;
  onUpdateTaskCompletion: (
    score: number, 
    type: TaskType, 
    difficulty: Difficulty, 
    performance: { correctCount: number; totalCount: number; startTime: number; endTime: number },
    category?: CollectionCategory
  ) => void;
}

interface Message {
  id: string;
  sender: 'agent' | 'user';
  type: 'text' | 'selection' | 'report' | 'daily_report' | 'account_report' | 'system' | 'feedback';
  payload: any;
  timestamp: number;
}

// Strictly 6 emotion labels as requested
const EMOTION_LABELS = ["sadness", "joy", "love", "anger", "fear", "surprise"];

const EMOTION_POOL = {
  [Difficulty.EASY]: [
    { text: "i just feel really helpless and heavy hearted.", labels: ["sadness"] },
    { text: "i am feeling so happy today because i got the job!", labels: ["joy"] },
    { text: "i feel so much love for my family and friends.", labels: ["love"] },
    { text: "i am absolutely furious with the customer service.", labels: ["anger"] },
    { text: "i am terrified of what might happen next.", labels: ["fear"] },
    { text: "i was completely surprised by the sudden party!", labels: ["surprise"] },
    { text: "it makes me so angry when people lie to me.", labels: ["anger"] },
    { text: "seeing her smile brought so much warmth to my heart.", labels: ["love"] }
  ],
  [Difficulty.MEDIUM]: [
    { text: "I can't believe they lied to me after all we went through, it hurts so much", labels: ["anger", "sadness"] },
    { text: "I am so excited to see what happens next, but also a bit nervous.", labels: ["joy", "fear"] },
    { text: "That was an incredible performance! I love watching them dance.", labels: ["joy", "love"] },
    { text: "I'm shocked you said that, it really makes me feel quite low.", labels: ["surprise", "sadness"] },
    { text: "It's so infuriating that they won't help, I'm genuinely worried now.", labels: ["anger", "fear"] }
  ],
  [Difficulty.HARD]: [
    { text: "I'm shocked you did this, but I love the outcome, even though I'm still quite angry about the process.", labels: ["surprise", "love", "anger"] },
    { text: "I'm terrified for our future, yet filled with joy to be with you, and I feel so much love.", labels: ["fear", "joy", "love"] },
    { text: "It was a total surprise when he yelled at me; it broke my heart and made me so sad.", labels: ["surprise", "anger", "sadness"] }
  ]
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ stats, taskRecords, onBack, onUpdateTaskCompletion }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const [flowState, setFlowState] = useState<'IDLE' | 'SELECT_TYPE' | 'SELECT_MEDIA' | 'SELECT_CATEGORY' | 'SELECT_DIFFICULTY' | 'EMOTION_LOOP'>('SELECT_TYPE');
  const [pendingTask, setPendingTask] = useState<any>({ type: TaskType.QUICK_JUDGMENT });
  
  const [emotionIndex, setEmotionIndex] = useState(0);
  const [emotionTaskStartTime, setEmotionTaskStartTime] = useState(0);
  const [emotionCorrectCount, setEmotionCorrectCount] = useState(0);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>(Difficulty.EASY);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  const INITIAL_MESSAGE: Message = {
    id: 'init-1',
    sender: 'agent',
    type: 'text',
    payload: "您好！我是您的任务中心 Agent。准备好开始今天的标注工作了吗？\n\n请选择下方的任务类型：",
    timestamp: Date.now()
  };

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { 
        systemInstruction: `你是 Web3 任务中心 Agent。你正在协助用户进行情绪快判任务。可选标签只有：${EMOTION_LABELS.join(', ')}。` 
      },
    });

    setMessages([INITIAL_MESSAGE]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTask, flowState, isTyping, selectedEmotions]);

  const addMessage = (payload: any, sender: 'agent' | 'user' = 'agent', type: Message['type'] = 'text') => {
    setMessages(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
      sender,
      type,
      payload,
      timestamp: Date.now()
    }]);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isTyping) return;
    const text = userInput.trim();
    setUserInput('');

    if (flowState === 'EMOTION_LOOP') {
      addMessage(text, 'user');
      handleEmotionResponse(text);
      return;
    }

    addMessage(text, 'user');
    setIsTyping(true);
    try {
      const response = await chatRef.current.sendMessage({ message: text });
      addMessage(response.text, 'agent');
    } catch (e) {
      addMessage("抱歉，连接稍有波动，请稍后再试。", 'agent');
    } finally { setIsTyping(false); }
  };

  const handleEmotionResponse = (val: string) => {
    const lowerVal = val.toLowerCase();
    if (lowerVal === '退出' || lowerVal === 'exit') {
      // CLEAR HISTORY ON EXIT
      setMessages([INITIAL_MESSAGE]);
      setFlowState('SELECT_TYPE');
      setSelectedEmotions([]);
      setEmotionIndex(0);
      return;
    }
    if (lowerVal === '跳过' || lowerVal === 'skip') {
      addMessage("已跳过当前题目。", 'agent');
      moveToNextEmotionText();
      return;
    }

    if (lowerVal === 'submit' || lowerVal === '确定') {
      submitEmotionChoice();
      return;
    }

    if (EMOTION_LABELS.includes(lowerVal)) {
      toggleEmotionSelection(lowerVal);
    }
  };

  const toggleEmotionSelection = (label: string) => {
    const reqCount = currentDifficulty === Difficulty.HARD ? 3 : currentDifficulty === Difficulty.MEDIUM ? 2 : 1;
    
    setSelectedEmotions(prev => {
      if (prev.includes(label)) {
        return prev.filter(l => l !== label);
      }
      if (prev.length < reqCount) {
        const next = [...prev, label];
        // For easy mode (1 label), auto-submit for smoother experience
        if (reqCount === 1) {
          setTimeout(() => submitEmotionChoice(next), 200);
        }
        return next;
      }
      return prev;
    });
  };

  const submitEmotionChoice = (forcedSelection?: string[]) => {
    const selection = forcedSelection || selectedEmotions;
    const reqCount = currentDifficulty === Difficulty.HARD ? 3 : currentDifficulty === Difficulty.MEDIUM ? 2 : 1;
    
    if (selection.length < reqCount) {
      addMessage(`判定未完成，请根据难度选择 ${reqCount} 个情绪。`, 'agent', 'system');
      return;
    }

    const pool = (EMOTION_POOL as any)[currentDifficulty];
    const currentData = pool[emotionIndex % pool.length];
    const correctLabels = currentData.labels.map((l: string) => l.toLowerCase());
    
    // Check if user selection matches correct labels exactly
    const isCorrect = selection.length === correctLabels.length && selection.every(s => correctLabels.includes(s));
    
    if (isCorrect) {
      setEmotionCorrectCount(prev => prev + 1);
      addMessage(`✅ 判断正确！该文本情绪为: ${correctLabels.join(' & ')}`, 'agent', 'system');
    } else {
      addMessage(`❌ 判断有误。正确答案应该是: ${correctLabels.join(' & ')}`, 'agent', 'system');
    }

    setTimeout(() => {
      moveToNextEmotionText();
    }, 1200);
  };

  const moveToNextEmotionText = () => {
    const taskLimit = 10;
    setSelectedEmotions([]);
    
    if (emotionIndex < taskLimit - 1) {
      const nextIdx = emotionIndex + 1;
      setEmotionIndex(nextIdx);
      const pool = (EMOTION_POOL as any)[currentDifficulty];
      const nextData = pool[nextIdx % pool.length];
      const reqCount = currentDifficulty === Difficulty.HARD ? 3 : currentDifficulty === Difficulty.MEDIUM ? 2 : 1;
      addMessage(`[任务 ${nextIdx + 1}/${taskLimit}]\n"${nextData.text}"\n请根据文本选择 ${reqCount} 个情绪：`, 'agent');
    } else {
      completeEmotionTask();
    }
  };

  const completeEmotionTask = () => {
    addMessage("感谢您的贡献！任务已完成，正在生成审计报告...", 'agent');
    const end = Date.now();
    const finalCount = emotionCorrectCount;
    setFlowState('SELECT_TYPE');
    setTimeout(() => sendFinalReport(TaskType.QUICK_JUDGMENT, currentDifficulty, { correctCount: finalCount, totalCount: 10, startTime: emotionTaskStartTime, endTime: end }, CollectionCategory.EMOTION), 4000);
  };

  const sendFinalReport = (type: TaskType, diff: Difficulty, perf: any, cat?: CollectionCategory) => {
    onUpdateTaskCompletion(100, type, diff, perf, cat);
    addMessage("通知：您的最新情绪快判报告已送达。", 'agent');
    const report: any = {
      '判定等级': diff,
      '判定总数': perf.totalCount,
      '准确判定': perf.correctCount,
      '准确率': `${Math.round((perf.correctCount / perf.totalCount) * 100)}%`,
      '奖励积分': `+${perf.correctCount * 15} PTS`
    };
    addMessage(report, 'agent', 'report');
  };

  const onSelectAction = (action: string, data: any) => {
    if (activeTask || flowState === 'EMOTION_LOOP') return;
    
    switch (action) {
      case 'TYPE':
        setPendingTask({ type: data });
        setFlowState('SELECT_MEDIA');
        addMessage(`【${data}】`, 'user');
        addMessage("请选择媒体类型：", 'agent');
        break;
      case 'MEDIA':
        const updated = { ...pendingTask, mediaType: data };
        setPendingTask(updated);
        addMessage(`${data === 'TEXT' ? '文本' : data === 'IMAGE' ? '图片' : data === 'AUDIO' ? '音频' : '视频'}`, 'user');
        
        if (updated.type === TaskType.QUICK_JUDGMENT) {
          setFlowState('SELECT_DIFFICULTY');
          addMessage("请选择任务难度：", 'agent');
        } else {
          setFlowState('SELECT_CATEGORY');
          addMessage("请选择采集分类：", 'agent');
        }
        break;
      case 'CATEGORY':
        setPendingTask(prev => ({ ...prev, category: data }));
        addMessage(`${data}`, 'user');
        setFlowState('SELECT_DIFFICULTY');
        addMessage("请选择任务难度：", 'agent');
        break;
      case 'DIFFICULTY':
        addMessage(`${data}`, 'user');
        setCurrentDifficulty(data as Difficulty);
        if (pendingTask.type === TaskType.QUICK_JUDGMENT && pendingTask.mediaType === 'TEXT') {
          setFlowState('EMOTION_LOOP');
          setEmotionIndex(0);
          setEmotionCorrectCount(0);
          setSelectedEmotions([]);
          setEmotionTaskStartTime(Date.now());
          const reqCount = data === Difficulty.HARD ? 3 : data === Difficulty.MEDIUM ? 2 : 1;
          addMessage(`已开启【情绪快判】${data}任务。可选情绪：${EMOTION_LABELS.join(', ')}。`, 'agent');
          const pool = (EMOTION_POOL as any)[data as Difficulty];
          const firstTask = pool[0];
          addMessage(`[任务 1/10]\n"${firstTask.text}"\n请判别其表达的情绪（需选 ${reqCount} 个）：`, 'agent');
        } else {
          setFlowState('IDLE');
          setActiveTask({ ...pendingTask, difficulty: data });
        }
        break;
      case 'BACK':
        addMessage("↩ 返回", 'user');
        if (flowState === 'SELECT_MEDIA') setFlowState('SELECT_TYPE');
        else if (flowState === 'SELECT_CATEGORY') setFlowState('SELECT_MEDIA');
        else if (flowState === 'SELECT_DIFFICULTY') {
          if (pendingTask.type === TaskType.QUICK_JUDGMENT) setFlowState('SELECT_MEDIA');
          else setFlowState('SELECT_CATEGORY');
        }
        addMessage("请重新选择：", 'agent');
        break;
      case 'DAILY':
        generateDailyReport();
        break;
      case 'ACCOUNT':
        generateAccountReport();
        break;
    }
  };

  const generateDailyReport = () => {
    addMessage("📊 正在提取今日贡献统计...", 'agent');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRecords = taskRecords.filter(r => r.timestamp >= today.getTime());
      const payload = {
        username: stats.username,
        userId: stats.userId.slice(-8),
        timestamp: new Date().toLocaleString(),
        totalDuration: todayRecords.reduce((acc, curr) => acc + curr.duration, 0),
        accuracy: todayRecords.length > 0 ? Math.round((todayRecords.reduce((a,b)=>a+b.correctCount,0)/todayRecords.reduce((a,b)=>a+b.totalCount,0))*100) : 0,
        totalScore: todayRecords.reduce((acc, curr) => acc + curr.score, 0),
      };
      addMessage(payload, 'agent', 'daily_report');
    }, 800);
  };

  const generateAccountReport = () => {
    addMessage(stats, 'agent', 'account_report');
  };

  const renderButtons = () => {
    if (activeTask || flowState === 'IDLE') return null;
    
    const menuBtn = "w-full py-5 bg-[#161618] border border-white/[0.05] rounded-[24px] text-[16px] font-bold text-white flex items-center justify-center transition-all active:scale-[0.97] hover:bg-[#1C1C1E] shadow-xl";
    const subBtn = "w-full py-4 bg-[#161618] border border-white/[0.05] rounded-[20px] text-[15px] font-bold text-white flex items-center justify-center transition-all active:scale-[0.97]";

    if (flowState === 'EMOTION_LOOP') {
      const isMulti = currentDifficulty !== Difficulty.EASY;
      const reqCount = currentDifficulty === Difficulty.HARD ? 3 : currentDifficulty === Difficulty.MEDIUM ? 2 : 1;

      return (
        <div className="flex flex-col space-y-3 mt-4 w-full px-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 gap-2">
            {EMOTION_LABELS.map((label) => {
              const isSelected = selectedEmotions.includes(label);
              return (
                <button 
                  key={label} 
                  onClick={() => toggleEmotionSelection(label)} 
                  className={`py-4 rounded-[16px] text-[12px] font-black uppercase transition-all active:scale-95 border ${
                    isSelected 
                      ? 'bg-blue-600 text-white border-blue-400 shadow-lg' 
                      : 'bg-white/5 text-white/40 border-white/5'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {isMulti && (
            <button 
              onClick={() => handleEmotionResponse('submit')} 
              disabled={selectedEmotions.length !== reqCount}
              className={`w-full py-5 rounded-[22px] font-black text-[15px] transition-all ${
                selectedEmotions.length === reqCount 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'bg-white/5 text-white/10 cursor-not-allowed'
              }`}
            >
              提交判定 ({selectedEmotions.length}/{reqCount})
            </button>
          )}

          <div className="grid grid-cols-2 gap-3 mt-2">
            <button onClick={() => handleEmotionResponse('skip')} className="py-4 bg-[#232326] border border-white/5 rounded-[20px] text-[14px] font-bold text-white/40 active:scale-95 transition-all">⏭ 跳过</button>
            <button onClick={() => handleEmotionResponse('exit')} className="py-4 bg-red-500/10 border border-red-500/20 rounded-[20px] text-[14px] font-bold text-red-500/60 active:scale-95 transition-all">⏹ 退出任务</button>
          </div>
        </div>
      );
    }

    switch (flowState) {
      case 'SELECT_TYPE':
        return (
          <div className="flex flex-col space-y-3 mt-6 w-full px-2">
            <button onClick={() => onSelectAction('TYPE', TaskType.QUICK_JUDGMENT)} className={menuBtn}>🎯 快判任务</button>
            <button onClick={() => onSelectAction('TYPE', TaskType.COLLECTION)} className={menuBtn}>📸 采集任务</button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => onSelectAction('DAILY', null)} className={subBtn}>📊 今日统计</button>
              <button onClick={() => onSelectAction('ACCOUNT', null)} className={subBtn}>👤 账户总览</button>
            </div>
          </div>
        );
      case 'SELECT_MEDIA':
        const media = pendingTask.type === TaskType.QUICK_JUDGMENT ? ['IMAGE', 'TEXT'] : ['IMAGE', 'AUDIO', 'VIDEO'];
        return (
          <div className="flex flex-col space-y-3 mt-6 w-full px-2">
            {media.map(m => (
              <button key={m} onClick={() => onSelectAction('MEDIA', m)} className={subBtn}>
                {m === 'TEXT' ? '📝 文本' : m === 'IMAGE' ? '🖼️ 图片' : m === 'AUDIO' ? '🎙️ 音频' : '📹 视频'}
              </button>
            ))}
            <button onClick={() => onSelectAction('BACK', null)} className="py-3 text-[14px] text-blue-400 font-bold active:opacity-50">返回</button>
          </div>
        );
      case 'SELECT_CATEGORY':
        const cats = [CollectionCategory.ANIMAL, CollectionCategory.PLANT, CollectionCategory.PERSON, CollectionCategory.STREET, CollectionCategory.LIFE];
        return (
          <div className="flex flex-col space-y-3 mt-6 w-full px-2">
            <div className="grid grid-cols-2 gap-2">
              {cats.map(c => (
                <button key={c} onClick={() => onSelectAction('CATEGORY', c)} className={subBtn}>{c}</button>
              ))}
            </div>
            <button onClick={() => onSelectAction('BACK', null)} className="py-3 text-[14px] text-blue-400 font-bold active:opacity-50">返回</button>
          </div>
        );
      case 'SELECT_DIFFICULTY':
        const diffs = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];
        return (
          <div className="flex flex-col space-y-3 mt-6 w-full px-2">
            {diffs.map(d => (
              <button key={d} onClick={() => onSelectAction('DIFFICULTY', d)} className={subBtn}>{d}</button>
            ))}
            <button onClick={() => onSelectAction('BACK', null)} className="py-3 text-[14px] text-blue-400 font-bold active:opacity-50">返回</button>
          </div>
        );
      default: return null;
    }
  };

  const renderGenericReport = (payload: any, isAccount: boolean) => {
    return (
      <div className="w-full bg-[#161618] rounded-[28px] p-6 border border-white/[0.03] space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-[17px] font-bold text-white">{isAccount ? '账户总览' : '今日成果'}</h3>
            <p className="text-[11px] text-white/30 font-medium">{isAccount ? stats.userId : payload.timestamp}</p>
          </div>
          <div className="bg-blue-600/10 px-3 py-1 rounded-full">
             <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{isAccount ? 'VIB NODE' : 'SYNCED'}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.02]">
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">贡献积分</p>
              <p className="text-2xl font-black text-white">{isAccount ? stats.totalScore : payload.totalScore} <span className="text-[12px] text-blue-500 ml-1">PTS</span></p>
           </div>
           <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.02]">
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">累计时长</p>
              <p className="text-2xl font-black text-white">{isAccount ? stats.totalDuration : payload.totalDuration} <span className="text-[12px] text-white/40 ml-1">S</span></p>
           </div>
        </div>
        <button onClick={() => setFlowState('SELECT_TYPE')} className="w-full py-4 bg-white/5 rounded-2xl text-[14px] font-bold text-white/60 active:bg-white/10">查看明细</button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] relative">
      <div className="h-16 flex items-center px-4 shrink-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/5">
        <button onClick={onBack} className="p-2 -ml-2 text-white/90 active:opacity-50 transition-opacity">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="flex flex-col ml-1">
          <h2 className="text-[17px] font-bold text-white tracking-tight leading-none">AI 标注中心</h2>
          <div className="flex items-center mt-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
            <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">Connected</span>
          </div>
        </div>
        <div className="ml-auto bg-blue-600 px-3 py-1.5 rounded-[12px] text-[12px] font-black text-white shadow-lg">
          {stats.totalScore} PTS
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-48">
        {messages.map((m, idx) => (
          <div key={m.id} className="animate-in slide-in-from-bottom-2 duration-300">
            {m.sender === 'agent' && (
              <div className="flex items-center space-x-2 mb-2 ml-1">
                <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-[10px]">📄</div>
                <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Agent</span>
              </div>
            )}
            
            <div className={`flex ${m.sender === 'agent' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[92%] shadow-2xl ${
                m.sender === 'agent' 
                  ? 'bg-[#161618] rounded-[24px] rounded-tl-[4px] p-5 border border-white/[0.03]' 
                  : 'bg-blue-600 rounded-[24px] rounded-tr-[4px] p-4 font-bold text-white text-[15px]'
              } ${m.type === 'system' ? 'bg-white/5 border-none italic text-white/60 text-[13px] py-2 px-4 rounded-full' : ''}`}>
                {m.type === 'daily_report' || m.type === 'account_report' ? (
                  renderGenericReport(m.payload, m.type === 'account_report')
                ) : m.type === 'report' ? (
                  <div className="space-y-4 min-w-[240px]">
                    <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
                      <h3 className="text-[11px] font-black uppercase text-blue-400 tracking-widest">任务审核结果</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(m.payload).map(([k, v]: any) => (
                        <div key={k}>
                          <p className="text-white/30 text-[9px] font-black uppercase tracking-wider">{k}</p>
                          <p className="text-white text-[13px] font-bold truncate">{v?.toString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[15px] leading-[1.6] text-white/95 whitespace-pre-wrap font-medium">{m.payload}</p>
                )}
              </div>
            </div>
            {idx === messages.length - 1 && renderButtons()}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-center space-x-2 ml-1">
             <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-[10px]">📄</div>
             <div className="bg-[#161618] px-4 py-2 rounded-full border border-white/5 text-[11px] text-white/30 font-bold animate-pulse">处理中...</div>
          </div>
        )}

        {activeTask && (
          <div className="mt-4 pb-10">
            <TaskFlow 
              {...activeTask} 
              onComplete={(s, t, p) => { 
                setActiveTask(null); 
                setFlowState('SELECT_TYPE'); 
                addMessage("任务已提交至审核审计点。", 'agent');
                setTimeout(() => sendFinalReport(t, activeTask.difficulty, p, activeTask.category), 8000);
              }} 
              onCancel={() => { 
                setActiveTask(null); 
                setFlowState('SELECT_TYPE'); 
                addMessage("任务已中止。", 'agent'); 
              }} 
            />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 pb-10 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/90 to-transparent z-40">
        <div className="flex space-x-3 items-center bg-[#161618] border border-white/10 rounded-[32px] px-6 py-1 shadow-2xl">
          <input 
            type="text" 
            value={userInput} 
            onChange={e => setUserInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
            placeholder={flowState === 'EMOTION_LOOP' ? "点击下方按钮判定情绪..." : "对话、提问或开启任务..."} 
            className="flex-1 bg-transparent py-4 text-[15px] text-white focus:outline-none placeholder:text-white/20" 
            disabled={!!activeTask}
          />
          <button 
            onClick={handleSendMessage} 
            disabled={!userInput.trim() || !!activeTask}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              userInput.trim() ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-white/20'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l7-7-7-7M5 12h14"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
