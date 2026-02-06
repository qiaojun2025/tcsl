
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Difficulty, TaskType, UserStats, CollectionCategory, TaskCompletionRecord, MediaType } from '../types.ts';

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
  type: 'text' | 'selection' | 'report' | 'daily_report' | 'account_report' | 'system' | 'menu_options' | 'task_summary' | 'status';
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
  
  // flowState manages the operational flow
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
    
    // Initial Greeting
    setMessages([{
      id: 'init-1',
      sender: 'agent',
      type: 'text',
      payload: "您好！我是您的 AI 标注助手。很高兴为您介绍数据标注：简单来说，数据标注是给原始数据（如图片、文字）打上标签，让 AI 能够学习和理解。您可以点击右下角菜单开启任务，让我们一起训练更聪明的 AI！",
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
      addMessage("系统通信异常，请重试。", 'agent');
    } finally { setIsTyping(false); }
  };

  const handleOpenMenu = () => {
    if (flowState !== 'IDLE') return;
    setFlowState('SELECT_TYPE');
    addMessage("请选择功能：", 'agent', 'menu_options');
  };

  const handleActionSelect = (action: string, value: any) => {
    switch (action) {
      case 'TYPE':
        addMessage(value, 'user');
        setCurrentTaskConfig(prev => ({ ...prev, type: value }));
        setFlowState('SELECT_MEDIA');
        addMessage(`开启【${value}】。请选择文件类型：`, 'agent');
        break;
      case 'MEDIA':
        addMessage(value, 'user');
        const media = value === '文本' ? 'TEXT' : 'IMAGE';
        setCurrentTaskConfig(prev => ({ ...prev, mediaType: media }));
        if (value === '文本') {
          addMessage("系统提示：已激活“情绪快判”专项任务。请选择任务难度：", 'agent');
        } else {
          addMessage("请选择任务难度：", 'agent');
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
      "这个新功能太棒了，我非常喜欢！",
      "客服的态度极其恶劣，令人愤怒。",
      "我对明天的面试感到非常紧张和害怕。",
      "天哪！这真是个意外的惊喜！",
      "今天的天气阴沉沉的，让人感到沮丧。",
      "看到家人的笑容，我感到非常幸福。",
      "这个产品的质量简直是垃圾，太失望了。",
      "终于完成了大项目，真是如释重负。",
      "漆黑的走廊里传来奇怪的声音，好吓人。",
      "万万没想到他会出现在这里，太惊讶了！"
    ];
    addMessage(`[任务 ${idx + 1}/10]\n"${questions[idx % questions.length]}"\n请判别情绪（正面/负面）：`, 'agent');
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
    addMessage("您的答案已经提交，审核人员将校对您的答案，任务报告将以应用内通知的方式提供。", 'agent', 'status');
    
    // Simulate auditing after 10 seconds
    setTimeout(() => {
      const endTime = Date.now();
      const duration = Math.round((endTime - currentTaskConfig.startTime) / 1000);
      const score = finalCorrect * 15; // Contribution score
      
      onUpdateTaskCompletion(score, currentTaskConfig.type, currentTaskConfig.difficulty, {
        correctCount: finalCorrect,
        totalCount: 10,
        startTime: currentTaskConfig.startTime,
        endTime
      }, CollectionCategory.EMOTION);

      addMessage("您的答案已经审核，请查看任务报告：", 'agent');
      
      const reportPayload = {
        username: stats.username,
        taskId: `TASK-${endTime.toString().slice(-6)}`,
        taskType: currentTaskConfig.type,
        level: currentTaskConfig.difficulty,
        fileType: currentTaskConfig.mediaType === 'TEXT' ? '文本' : '图片',
        startTime: new Date(currentTaskConfig.startTime).toLocaleTimeString(),
        duration: `${duration}s`,
        accuracy: `${finalCorrect}/10`,
        contribution: `+${score} PTS`
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
          <div key={m.id} className="grid grid-cols-2 gap-3 mt-4 px-2">
            <button onClick={() => handleActionSelect('TYPE', TaskType.QUICK_JUDGMENT)} className="py-4 bg-[#161618] border border-white/5 rounded-2xl text-white font-bold active:scale-95 transition-all shadow-lg">🎯 快判任务</button>
            <button onClick={() => handleActionSelect('TYPE', TaskType.COLLECTION)} className="py-4 bg-[#161618] border border-white/5 rounded-2xl text-white font-bold active:scale-95 transition-all shadow-lg">📸 采集任务</button>
            <button onClick={() => handleActionSelect('DAILY', null)} className="py-4 bg-[#161618] border border-white/5 rounded-2xl text-white font-bold active:scale-95 transition-all shadow-lg">📊 日报统计</button>
            <button onClick={() => handleActionSelect('ACCOUNT', null)} className="py-4 bg-[#161618] border border-white/5 rounded-2xl text-white font-bold active:scale-95 transition-all shadow-lg">👤 账户统计</button>
          </div>
        );
      }

      if (flowState === 'SELECT_MEDIA' && m.sender === 'agent' && m.type === 'text') {
        return (
          <div key={m.id} className="grid grid-cols-2 gap-3 mt-4 px-2">
            <button onClick={() => handleActionSelect('MEDIA', '图片')} className="py-4 bg-[#161618] border border-white/5 rounded-2xl text-white font-bold active:scale-95 transition-all shadow-lg">🖼️ 图片</button>
            <button onClick={() => handleActionSelect('MEDIA', '文本')} className="py-4 bg-[#161618] border border-white/5 rounded-2xl text-white font-bold active:scale-95 transition-all shadow-lg">📝 文本</button>
          </div>
        );
      }

      if (flowState === 'SELECT_DIFFICULTY' && m.sender === 'agent' && m.type === 'text') {
        return (
          <div key={m.id} className="grid grid-cols-3 gap-2 mt-4 px-2">
            {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map(d => (
              <button key={d} onClick={() => handleActionSelect('DIFFICULTY', d)} className="py-4 bg-[#161618] border border-white/5 rounded-2xl text-white font-bold text-xs active:scale-95 transition-all shadow-lg">{d}</button>
            ))}
          </div>
        );
      }

      if (flowState === 'EMOTION_LOOP' && m.sender === 'agent' && m.payload.includes('[任务')) {
        return (
          <div key={m.id} className="flex flex-col space-y-3 mt-4 px-2">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleEmotionSubmit(true)} className="py-5 bg-blue-600 rounded-3xl font-black text-white text-[17px] shadow-lg shadow-blue-600/20 active:scale-95 transition-all">正面 (Positive)</button>
              <button onClick={() => handleEmotionSubmit(false)} className="py-5 bg-[#232326] border border-white/5 rounded-3xl font-black text-white text-[17px] active:scale-95 transition-all">负面 (Negative)</button>
            </div>
            <button onClick={() => {setFlowState('IDLE'); addMessage("已退出当前任务并返回对话模式。", 'agent');}} className="w-full py-3 bg-red-500/10 text-red-500 rounded-2xl text-xs font-bold uppercase tracking-widest border border-red-500/10">退出当前任务</button>
          </div>
        );
      }

      return null;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] relative">
      {/* Header */}
      <div className="h-16 flex items-center px-4 shrink-0 bg-black/40 backdrop-blur-lg border-b border-white/5 z-50">
        <button 
          disabled={isLocked}
          onClick={onBack} 
          className={`p-2 -ml-2 transition-all ${isLocked ? 'opacity-10 cursor-not-allowed' : 'text-white active:scale-90'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"/></svg>
        </button>
        <div className="flex flex-col ml-2">
          <h2 className="text-[17px] font-bold text-white leading-none tracking-tight">AI 标注智能体</h2>
          <span className="text-[10px] text-green-500 font-black uppercase tracking-widest mt-1">
            {isLocked ? 'Task Running' : 'Agent Active'}
          </span>
        </div>
        <div className="ml-auto bg-blue-600 px-3 py-1.5 rounded-[12px] text-[12px] font-black text-white shadow-lg">{stats.totalScore} PTS</div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-48">
        {messages.map((m) => (
          <div key={m.id} className="animate-in slide-in-from-bottom-2 duration-300">
            {m.sender === 'agent' && <div className="text-[10px] text-white/20 font-black uppercase ml-1 mb-1 tracking-widest">Annotator</div>}
            <div className={`flex ${m.sender === 'agent' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[90%] p-4 rounded-3xl shadow-2xl ${m.sender === 'agent' ? 'bg-[#161618] border border-white/5 text-white/95' : 'bg-blue-600 text-white font-bold text-[15px]'}`}>
                {m.type === 'task_summary' ? (
                  <div className="space-y-3 min-w-[260px] p-2">
                    <h4 className="font-bold border-b border-white/10 pb-3 mb-1 text-center text-blue-400">任务结算报告</h4>
                    <div className="space-y-2">
                      {Object.entries(m.payload).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-[13px]">
                          <span className="text-white/30 font-medium">{k}</span>
                          <span className="font-bold">{v as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : m.type === 'daily_report' ? (
                  <div className="space-y-4 min-w-[220px]">
                    <h4 className="font-bold text-blue-400 border-b border-white/5 pb-2">今日日报统计</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 p-3 rounded-2xl"><p className="text-[10px] text-white/30 font-bold">总积分</p><p className="text-xl font-black text-blue-400">{m.payload.totalScore}</p></div>
                      <div className="bg-white/5 p-3 rounded-2xl"><p className="text-[10px] text-white/30 font-bold">总时长</p><p className="text-xl font-black">{m.payload.totalDuration}s</p></div>
                    </div>
                  </div>
                ) : m.type === 'account_report' ? (
                  <div className="space-y-4 min-w-[220px]">
                    <h4 className="font-bold text-purple-400 border-b border-white/5 pb-2">账户资产报告</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center"><span className="text-white/30 text-xs">用户名</span><span className="font-bold">{m.payload.username}</span></div>
                      <div className="flex justify-between items-center"><span className="text-white/30 text-xs">累计积分</span><span className="text-blue-500 font-black text-lg">{m.payload.totalScore}</span></div>
                      <div className="flex justify-between items-center"><span className="text-white/30 text-xs">累计标注</span><span className="font-bold">{m.payload.totalAttempted} 条</span></div>
                    </div>
                  </div>
                ) : m.type === 'status' ? (
                  <div className="flex items-center space-x-3 py-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <p className="text-[14px] font-medium text-yellow-500/80 italic">{m.payload}</p>
                  </div>
                ) : (
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{m.payload}</p>
                )}
              </div>
            </div>
          </div>
        ))}
        {renderButtons()}
        {isTyping && <div className="flex items-center space-x-2 ml-1 mt-2"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-150"></div><div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-300"></div></div>}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-10 bg-gradient-to-t from-black via-black/90 to-transparent z-40">
        <div className={`flex items-center bg-[#161618] border border-white/10 rounded-[32px] px-4 py-2 shadow-2xl transition-all duration-500 ${isLocked ? 'opacity-30 grayscale' : 'opacity-100 shadow-blue-900/10'}`}>
          <input 
            type="text" 
            disabled={isLocked}
            value={userInput} 
            onChange={e => setUserInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder={isLocked ? "任务处理中..." : "与智能体交流..."}
            className="flex-1 bg-transparent px-2 py-3 text-[15px] text-white focus:outline-none placeholder:text-white/20"
          />
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleOpenMenu}
              disabled={isLocked}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isLocked ? 'text-white/10' : 'text-blue-500 active:scale-90 hover:bg-white/5'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeWidth="2.5"/></svg>
            </button>
            
            <button 
              onClick={handleSendMessage}
              disabled={!userInput.trim() || isTyping || isLocked}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${userInput.trim() && !isTyping && !isLocked ? 'bg-blue-600 text-white shadow-lg active:scale-90' : 'bg-white/5 text-white/20'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l7-7-7-7M5 12h14" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
