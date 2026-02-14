
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Difficulty, TaskType, UserStats, CollectionCategory, TaskCompletionRecord } from '../types.ts';

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
  type: 'text' | 'menu_options' | 'report' | 'daily_report' | 'account_report' | 'task_summary' | 'status';
  payload: any;
  timestamp: number;
}

const AGENT_SYSTEM_PROMPT = `
你是一个【可聊天的数据标注 AI Agent】。
你的核心目标是：
在与用户自然对话的过程中，介绍下数据标注是什么，介绍数据标注的概念之类的。

重要原则：
- 对用户：你是友好、自然的助手
- 对系统：你是严格、克制的标注引擎
- 不向用户暴露任何标签、规则或标注逻辑
- 不确定时，允许继续提问
`;

const ChatInterface: React.FC<ChatInterfaceProps> = ({ stats, taskRecords, onBack, onUpdateTaskCompletion }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // flowState manages the interactive workflow
  const [flowState, setFlowState] = useState<'IDLE' | 'SELECT_TYPE' | 'SELECT_MEDIA' | 'SELECT_DIFFICULTY' | 'EMOTION_LOOP' | 'SUBMITTED'>('IDLE');
  
  const [currentTaskConfig, setCurrentTaskConfig] = useState<any>({
    type: null,
    mediaType: null,
    difficulty: Difficulty.EASY,
    startTime: 0
  });

  const [taskProgress, setTaskProgress] = useState({ index: 0, correct: 0 });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const aiChatRef = useRef<any>(null);

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    aiChatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction: AGENT_SYSTEM_PROMPT },
    });
    
    // Initial Intro
    setMessages([{
      id: 'init-1',
      sender: 'agent',
      type: 'text',
      payload: "您好！我是您的 AI 标注助手。数据标注简单来说就是给原始数据打上“标签”，好让 AI 像人类一样理解世界。很高兴为您服务，您可以随时通过右侧菜单开启任务！",
      timestamp: Date.now()
    }]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, flowState, taskProgress]);

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
    if (!userInput.trim() || isTyping || flowState !== 'IDLE') return;
    const text = userInput.trim();
    setUserInput('');
    addMessage(text, 'user');
    setIsTyping(true);
    
    try {
      const result = await aiChatRef.current.sendMessage({ message: text });
      addMessage(result.text, 'agent');
    } catch (e) {
      addMessage("抱歉，信号有些微弱，请稍后再试。", 'agent');
    } finally { setIsTyping(false); }
  };

  const handleOpenMenu = () => {
    if (flowState !== 'IDLE') return;
    
    // Change state and send a single combined message to avoid empty bubbles
    setFlowState('SELECT_TYPE');
    addMessage("请选择您想要执行的功能：", 'agent', 'menu_options');
  };

  const handleActionSelect = (action: string, value: any) => {
    switch (action) {
      case 'TYPE':
        addMessage(value, 'user');
        setCurrentTaskConfig(prev => ({ ...prev, type: value }));
        setFlowState('SELECT_MEDIA');
        addMessage(`已为您开启【${value}】流程。请问您想处理什么类型的媒体？`, 'agent');
        break;
      case 'MEDIA':
        addMessage(value, 'user');
        const media = value === '文本' ? 'TEXT' : 'IMAGE';
        setCurrentTaskConfig(prev => ({ ...prev, mediaType: media }));
        if (value === '文本') {
          addMessage("检测到媒体类型为文本，已为您匹配“情绪快判”数据集。请选择挑战难度：", 'agent');
        } else {
          addMessage("请选择该任务的难度：", 'agent');
        }
        setFlowState('SELECT_DIFFICULTY');
        break;
      case 'DIFFICULTY':
        addMessage(value, 'user');
        setCurrentTaskConfig(prev => ({ ...prev, difficulty: value, startTime: Date.now() }));
        setTaskProgress({ index: 0, correct: 0 });
        setFlowState('EMOTION_LOOP');
        showNextQuestion(0);
        break;
      case 'DAILY':
        addMessage("【我的日报统计】", 'user');
        renderDailyReport();
        setFlowState('IDLE');
        break;
      case 'ACCOUNT':
        addMessage("【我的账户统计】", 'user');
        addMessage(stats, 'agent', 'account_report');
        setFlowState('IDLE');
        break;
    }
  };

  const showNextQuestion = (idx: number) => {
    const questions = [
      "这种生活方式让我感到无比的自由和欢愉。",
      "产品还没用两次就坏了，售后服务也是一团糟。",
      "想到明天的挑战，心里总是空落落的，有些害怕。",
      "哇！你居然能在这么短的时间内完成，太令人惊喜了！",
      "窗外的雨下个不停，我的心情也跟着沉到了谷底。",
      "漫步在公园的小径上，感受到大自然带来的宁静与喜悦。",
      "这种敷衍了事的回复简直是在浪费我的时间，很生气。",
      "终于赢得了比赛！所有的汗水在这一刻都化作了甜蜜。",
      "走在漆黑的小巷里，风声鹤唳，让我有些毛骨悚然。",
      "没想到竟然在这里遇到了你，真是太意外、太惊喜了！"
    ];
    addMessage(`[任务进行中 ${idx + 1}/10]\n"${questions[idx % questions.length]}"\n请判定情绪倾向（正面/负面）：`, 'agent');
  };

  const handleEmotionSubmit = (isCorrect: boolean) => {
    const nextIdx = taskProgress.index + 1;
    const nextCorrect = taskProgress.correct + (isCorrect ? 1 : 0);
    setTaskProgress({ index: nextIdx, correct: nextCorrect });

    if (nextIdx < 10) {
      showNextQuestion(nextIdx);
    } else {
      finishTask(nextCorrect);
    }
  };

  const finishTask = (finalCorrect: number) => {
    setFlowState('SUBMITTED');
    addMessage("正在为您提交结果并计算贡献值...", 'agent', 'status');
    
    setTimeout(() => {
      const endTime = Date.now();
      const duration = Math.round((endTime - currentTaskConfig.startTime) / 1000);
      const score = finalCorrect * 15;
      
      onUpdateTaskCompletion(score, currentTaskConfig.type, currentTaskConfig.difficulty, {
        correctCount: finalCorrect,
        totalCount: 10,
        startTime: currentTaskConfig.startTime,
        endTime
      }, CollectionCategory.EMOTION);

      addMessage("结果已审核，任务已入库。这是您的任务结算报告：", 'agent');
      
      const reportPayload = {
        用户名: stats.username,
        任务ID: `ID-${endTime.toString().slice(-6)}`,
        任务类型: currentTaskConfig.type,
        任务级别: currentTaskConfig.difficulty,
        开始时间: new Date(currentTaskConfig.startTime).toLocaleTimeString(),
        任务耗时: `${duration}s`,
        准确率: `${finalCorrect}/10`,
        奖励积分: `+${score} PTS`
      };
      
      addMessage(reportPayload, 'agent', 'task_summary');
      setFlowState('IDLE');
    }, 10000);
  };

  const renderDailyReport = () => {
    const today = new Date().setHours(0,0,0,0);
    const todayRecords = taskRecords.filter(r => r.timestamp >= today);
    const payload = {
      username: stats.username,
      totalScore: todayRecords.reduce((a, b) => a + b.score, 0),
      totalDuration: todayRecords.reduce((a, b) => a + b.duration, 0),
      count: todayRecords.length
    };
    addMessage(payload, 'agent', 'daily_report');
  };

  const isLocked = flowState !== 'IDLE';

  const renderButtons = () => {
    const isLast = (mIdx: number) => mIdx === messages.length - 1;
    
    return messages.map((m, idx) => {
      if (!isLast(idx)) return null;

      if (m.type === 'menu_options' && flowState === 'SELECT_TYPE') {
        return (
          <div key={m.id} className="grid grid-cols-2 gap-3 mt-4 px-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => handleActionSelect('TYPE', TaskType.QUICK_JUDGMENT)} className="py-4 bg-white border border-black/[0.05] rounded-2xl text-black font-bold active:scale-95 transition-all shadow-sm">【快判任务】</button>
            <button onClick={() => handleActionSelect('TYPE', TaskType.COLLECTION)} className="py-4 bg-white border border-black/[0.05] rounded-2xl text-black font-bold active:scale-95 transition-all shadow-sm">【采集任务】</button>
            <button onClick={() => handleActionSelect('DAILY', null)} className="py-4 bg-white border border-black/[0.05] rounded-2xl text-black font-bold active:scale-95 transition-all shadow-sm">【我的日报统计】</button>
            <button onClick={() => handleActionSelect('ACCOUNT', null)} className="py-4 bg-white border border-black/[0.05] rounded-2xl text-black font-bold active:scale-95 transition-all shadow-sm">【我的账户统计】</button>
          </div>
        );
      }

      if (flowState === 'SELECT_MEDIA' && m.sender === 'agent' && m.type === 'text') {
        return (
          <div key={m.id} className="grid grid-cols-2 gap-3 mt-4 px-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => handleActionSelect('MEDIA', '图片')} className="py-4 bg-white border border-black/[0.05] rounded-2xl text-black font-bold active:scale-95 transition-all shadow-sm">🖼️ 图片类型</button>
            <button onClick={() => handleActionSelect('MEDIA', '文本')} className="py-4 bg-white border border-black/[0.05] rounded-2xl text-black font-bold active:scale-95 transition-all shadow-sm">📝 文本类型</button>
          </div>
        );
      }

      if (flowState === 'SELECT_DIFFICULTY' && m.sender === 'agent' && m.type === 'text') {
        return (
          <div key={m.id} className="grid grid-cols-3 gap-2 mt-4 px-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map(d => (
              <button key={d} onClick={() => handleActionSelect('DIFFICULTY', d)} className="py-4 bg-white border border-black/[0.05] rounded-2xl text-black font-bold text-xs active:scale-95 transition-all shadow-sm">{d}</button>
            ))}
          </div>
        );
      }

      if (flowState === 'EMOTION_LOOP' && m.sender === 'agent' && m.payload && typeof m.payload === 'string' && m.payload.includes('[任务进行中')) {
        return (
          <div key={m.id} className="flex flex-col space-y-3 mt-4 px-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleEmotionSubmit(true)} className="py-5 bg-[#007AFF] rounded-3xl font-black text-white text-[17px] shadow-lg shadow-blue-500/20 active:scale-95 transition-all">正面 (Yes)</button>
              <button onClick={() => handleEmotionSubmit(false)} className="py-5 bg-black/5 rounded-3xl font-black text-black text-[17px] active:scale-95 transition-all">负面 (No)</button>
            </div>
            <button onClick={() => {setFlowState('IDLE'); addMessage("任务已中止，返回对话模式。", 'agent');}} className="w-full py-3 bg-red-500/10 text-red-500 rounded-2xl text-xs font-bold uppercase tracking-widest border border-red-500/10 active:bg-red-500/20 transition-all">退出当前任务</button>
          </div>
        );
      }

      return null;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] relative">
      {/* Top Header */}
      <div className="h-16 flex items-center px-4 shrink-0 bg-white/80 backdrop-blur-lg border-b border-black/[0.05] z-50 pt-safe">
        <button 
          disabled={isLocked}
          onClick={onBack} 
          className={`p-2 -ml-2 transition-all ${isLocked ? 'opacity-10 cursor-not-allowed grayscale' : 'text-black active:scale-90 hover:bg-black/5 rounded-full'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"/></svg>
        </button>
        <div className="flex flex-col ml-2">
          <h2 className="text-[17px] font-bold text-black leading-none tracking-tight">AI 标注智能体</h2>
          <span className="text-[10px] text-[#34C759] font-black uppercase tracking-widest mt-1">
            {isLocked ? 'Processing...' : 'Agent Ready'}
          </span>
        </div>
        <div className="ml-auto bg-[#007AFF] px-3 py-1.5 rounded-[12px] text-[12px] font-black text-white shadow-md shadow-blue-500/10">{stats.totalScore} PTS</div>
      </div>

      {/* Chat Display Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-48">
        {messages.map((m) => {
          if (!m.payload && m.type !== 'status') return <div key={m.id} />;

          return (
            <div key={m.id} className="animate-in slide-in-from-bottom-2 duration-300">
              {m.sender === 'agent' && m.type !== 'status' && <div className="text-[10px] text-black/20 font-black uppercase ml-1 mb-1 tracking-widest">Annotator</div>}
              <div className={`flex ${m.sender === 'agent' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[90%] p-4 rounded-[24px] shadow-sm ${m.sender === 'agent' ? 'bg-white border border-black/[0.03] text-black/90' : 'bg-[#007AFF] text-white font-bold text-[15px]'}`}>
                  {m.type === 'task_summary' ? (
                    <div className="space-y-3 min-w-[260px] p-2">
                      <h4 className="font-bold border-b border-black/5 pb-3 mb-1 text-center text-[#007AFF]">任务结算报告</h4>
                      <div className="space-y-2">
                        {Object.entries(m.payload).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-[13px]">
                            <span className="text-black/30 font-medium">{k}</span>
                            <span className="font-bold">{v as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : m.type === 'daily_report' ? (
                    <div className="space-y-4 min-w-[220px]">
                      <h4 className="font-bold text-[#007AFF] border-b border-black/5 pb-2">今日日报统计</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/5 p-3 rounded-2xl border border-black/[0.02]"><p className="text-[10px] text-black/30 font-bold">总积分</p><p className="text-xl font-black text-[#007AFF]">{m.payload.totalScore}</p></div>
                        <div className="bg-black/5 p-3 rounded-2xl border border-black/[0.02]"><p className="text-[10px] text-black/30 font-bold">总耗时</p><p className="text-xl font-black">{m.payload.totalDuration}s</p></div>
                      </div>
                    </div>
                  ) : m.type === 'account_report' ? (
                    <div className="space-y-4 min-w-[220px]">
                      <h4 className="font-bold text-[#AF52DE] border-b border-black/5 pb-2">账户资产报告</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><span className="text-black/30 text-xs">用户名</span><span className="font-bold">{m.payload.username}</span></div>
                        <div className="flex justify-between items-center"><span className="text-black/30 text-xs">累计积分</span><span className="text-[#007AFF] font-black text-lg">{m.payload.totalScore}</span></div>
                        <div className="flex justify-between items-center"><span className="text-black/30 text-xs">累计标注</span><span className="font-bold">{m.payload.totalAttempted} 条</span></div>
                      </div>
                    </div>
                  ) : m.type === 'status' ? (
                    <div className="flex items-center space-x-3 py-1">
                      <div className="w-2 h-2 bg-[#FF9500] rounded-full animate-pulse"></div>
                      <p className="text-[14px] font-medium text-[#FF9500] italic">{m.payload}</p>
                    </div>
                  ) : m.payload ? (
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{typeof m.payload === 'string' ? m.payload : JSON.stringify(m.payload)}</p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {renderButtons()}
        {isTyping && <div className="flex items-center space-x-2 ml-1 mt-2"><div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full animate-bounce delay-150"></div><div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full animate-bounce delay-300"></div></div>}
        <div ref={chatEndRef} />
      </div>

      {/* Modern Fixed Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-10 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/90 to-transparent z-40 pb-safe">
        <div className={`flex items-center bg-white border border-black/[0.08] rounded-[32px] px-4 py-2 shadow-lg transition-all duration-500 ${isLocked ? 'opacity-30 grayscale' : 'opacity-100 shadow-blue-500/5'}`}>
          <input 
            type="text" 
            disabled={isLocked}
            value={userInput} 
            onChange={e => setUserInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder={isLocked ? "正在执行任务..." : "输入消息或提问..."}
            className="flex-1 bg-transparent px-2 py-3 text-[15px] text-black focus:outline-none placeholder:text-black/20 transition-opacity"
          />
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleOpenMenu}
              disabled={isLocked}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isLocked ? 'text-black/10 cursor-not-allowed opacity-20' : 'text-[#007AFF] active:scale-90 hover:bg-black/5'}`}
              title="任务功能菜单"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round"/></svg>
            </button>
            
            <button 
              onClick={handleSendMessage}
              disabled={!userInput.trim() || isTyping || isLocked}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${userInput.trim() && !isTyping && !isLocked ? 'bg-[#007AFF] text-white shadow-md active:scale-90' : 'bg-black/5 text-black/10'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M12 19l7-7-7-7M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
