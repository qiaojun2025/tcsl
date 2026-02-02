
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
  type: 'text' | 'selection' | 'report' | 'daily_report' | 'account_report';
  payload: any;
  timestamp: number;
}

const EMOTION_TEXTS = [
  "这个 APP 更新之后变得很卡，体验明显不如以前。",
  "终于拿到了心仪已久的 Offer，太开心了！",
  "客服推诿责任，半天不解决问题，极其不推荐。",
  "今天的天气虽然阴沉，但心情却意外地平静。",
  "这款相机的画质超出了我的预期，性价比极高。",
  "排队等了两个小时，最后告诉我已经卖完了，真的很无语。",
  "看到家乡的变化这么大，内心充满了自豪。",
  "明明说好的时间，结果迟到了一个小时还没到，也没个电话。",
  "新开的这家餐厅味道中规中矩，环境倒是不错。",
  "这篇文章写得太深刻了，引发了我很多的思考。"
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({ stats, taskRecords, onBack, onUpdateTaskCompletion }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // States for the task configuration flow
  const [flowState, setFlowState] = useState<'IDLE' | 'SELECT_TYPE' | 'SELECT_MEDIA' | 'SELECT_CATEGORY' | 'SELECT_DIFFICULTY' | 'EMOTION_LOOP'>('SELECT_TYPE');
  const [pendingTask, setPendingTask] = useState<any>({ type: TaskType.QUICK_JUDGMENT });
  
  // State for Emotion Judgment conversational flow
  const [emotionIndex, setEmotionIndex] = useState(0);
  const [emotionSubStep, setEmotionSubStep] = useState(0); // 0: Direction, 1: Strength, 2: Complaint
  const [emotionTaskStartTime, setEmotionTaskStartTime] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { 
        systemInstruction: `你是 Web3 任务中心 Agent。你正在协助用户完成数据标注任务。你的语气专业、简洁、且具有鼓励性。如果用户正在执行任务，请根据任务上下文回应。` 
      },
    });

    setMessages([
      {
        id: 'init-1',
        sender: 'agent',
        type: 'text',
        payload: "您好！我是您的任务中心 Agent。欢迎回到标注平台。您可以点击下方按钮开始今天的任务，或者直接对我提问：",
        timestamp: Date.now()
      }
    ]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTask, flowState, isTyping]);

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
      addMessage("抱歉，我目前遇到了一些网络连接问题，请稍后再试。", 'agent');
    } finally { setIsTyping(false); }
  };

  const handleEmotionResponse = (val: string) => {
    const steps = [
      ["正面", "负面", "中性"],
      ["高", "中", "低"],
      ["包含投诉", "不包含投诉"]
    ];
    const currentOptions = steps[emotionSubStep];
    
    // Simple index or text matching
    const choice = parseInt(val);
    let valid = false;
    if (!isNaN(choice) && choice > 0 && choice <= currentOptions.length) {
        valid = true;
    } else if (currentOptions.some(opt => val.includes(opt))) {
        valid = true;
    }

    if (!valid) {
      addMessage(`输入无效，请回复序号或文字：${currentOptions.map((o,i)=>`${i+1}.${o}`).join(' ')}`, 'agent');
      return;
    }

    if (emotionSubStep < 2) {
      const nextStep = emotionSubStep + 1;
      setEmotionSubStep(nextStep);
      askEmotionSubStep(emotionIndex, nextStep);
    } else {
      // Completed one text sample
      if (emotionIndex < 9) {
        const nextIdx = emotionIndex + 1;
        setEmotionIndex(nextIdx);
        setEmotionSubStep(0);
        addMessage(`[任务 ${nextIdx+1}/10]\n文本内容：\n"${EMOTION_TEXTS[nextIdx]}"`, 'agent');
        askEmotionSubStep(nextIdx, 0);
      } else {
        // Finished all 10
        addMessage("感谢您的贡献！您的答案已经提交审核。校对完成后，详细的任务报告将发送给您，任务报告同时保存在我的-账户-任务报告 中", 'agent');
        setFlowState('SELECT_TYPE');
        const end = Date.now();
        // Wait 10 seconds before sending report
        setTimeout(() => sendFinalReport(TaskType.QUICK_JUDGMENT, Difficulty.EASY, { correctCount: 9, totalCount: 10, startTime: emotionTaskStartTime, endTime: end }, CollectionCategory.EMOTION), 10000);
      }
    }
  };

  const askEmotionSubStep = (idx: number, step: number) => {
    const titles = ["情绪方向", "情绪强度", "是否包含投诉"];
    const options = [["正面", "负面", "中性"], ["高", "中", "低"], ["包含投诉", "不包含投诉"]][step];
    addMessage(`请选择【${titles[step]}】：\n${options.map((o,i)=>`${i+1}. ${o}`).join('   ')}`, 'agent');
  };

  const sendFinalReport = (type: TaskType, diff: Difficulty, perf: any, cat?: CollectionCategory) => {
    onUpdateTaskCompletion(100, type, diff, perf, cat);
    addMessage("您的答案已经审核，请查看任务报告", 'agent');
    const report: any = {
      '用户名': stats.username,
      '任务ID': `TID-${Date.now().toString().slice(-6)}`,
      '任务类型': type,
      '任务级别': diff,
      '文件类型': type === TaskType.QUICK_JUDGMENT ? (cat === CollectionCategory.EMOTION ? 'TEXT' : 'IMAGE') : pendingTask.mediaType,
      '开始时间': new Date(perf.startTime).toLocaleString(),
      '任务耗时': `${Math.round((perf.endTime - perf.startTime)/1000)}秒`,
      '任务准确率': `${perf.correctCount}/${perf.totalCount}`,
      '获得贡献度': `${perf.correctCount * 10} PTS`
    };
    addMessage(report, 'agent', 'report');
    setFlowState('SELECT_TYPE');
  };

  const onSelectAction = (action: string, data: any) => {
    if (activeTask || flowState === 'EMOTION_LOOP') return;
    
    switch (action) {
      case 'TYPE':
        setPendingTask({ type: data });
        setFlowState('SELECT_MEDIA');
        addMessage(`【${data}】`, 'user');
        addMessage("请选择文件类型：", 'agent');
        break;
      case 'MEDIA':
        const updated = { ...pendingTask, mediaType: data };
        setPendingTask(updated);
        addMessage(`${data === 'TEXT' ? '文本' : data === 'IMAGE' ? '图片' : data === 'AUDIO' ? '音频' : '视频'}`, 'user');
        
        if (updated.type === TaskType.QUICK_JUDGMENT) {
          if (data === 'TEXT') {
            setFlowState('SELECT_DIFFICULTY');
            addMessage("请选择任务难度（文本快判目前支持）：", 'agent');
          } else {
            setFlowState('SELECT_DIFFICULTY');
            addMessage("请选择难度：", 'agent');
          }
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
        if (pendingTask.type === TaskType.QUICK_JUDGMENT && pendingTask.mediaType === 'TEXT') {
          // Enter Emotion Judgment conversational loop
          setFlowState('EMOTION_LOOP');
          setEmotionIndex(0);
          setEmotionSubStep(0);
          setEmotionTaskStartTime(Date.now());
          addMessage("进入【情绪快判】任务。我将逐条为您展示文本，请回复选项序号或文字进行判定。", 'agent');
          addMessage(`[任务 1/10]\n文本内容：\n"${EMOTION_TEXTS[0]}"`, 'agent');
          askEmotionSubStep(0, 0);
        } else {
          setFlowState('IDLE');
          setActiveTask({ ...pendingTask, difficulty: data });
        }
        break;
      case 'BACK':
        addMessage("↩ 返回上一层", 'user');
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRecords = taskRecords.filter(r => r.timestamp >= today.getTime());
    const totalDuration = todayRecords.reduce((acc, curr) => acc + curr.duration, 0);
    const totalCorrect = todayRecords.reduce((acc, curr) => acc + curr.correctCount, 0);
    const totalItems = todayRecords.reduce((acc, curr) => acc + curr.totalCount, 0);
    const totalScore = todayRecords.reduce((acc, curr) => acc + curr.score, 0);
    const accuracy = totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0;

    const getBreakdown = (type: TaskType) => {
      const filtered = todayRecords.filter(r => r.type === type);
      return {
        easy: { score: filtered.filter(r => r.difficulty === Difficulty.EASY).reduce((a,b)=>a+b.score,0), count: filtered.filter(r => r.difficulty === Difficulty.EASY).length },
        medium: { score: filtered.filter(r => r.difficulty === Difficulty.MEDIUM).reduce((a,b)=>a+b.score,0), count: filtered.filter(r => r.difficulty === Difficulty.MEDIUM).length },
        hard: { score: filtered.filter(r => r.difficulty === Difficulty.HARD).reduce((a,b)=>a+b.score,0), count: filtered.filter(r => r.difficulty === Difficulty.HARD).length },
      };
    };

    const payload = {
      username: stats.username,
      userId: stats.userId.slice(-8),
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
      totalDuration,
      accuracy,
      totalScore,
      quickBreakdown: getBreakdown(TaskType.QUICK_JUDGMENT),
      collectionBreakdown: getBreakdown(TaskType.COLLECTION)
    };

    addMessage("【任务日报统计】", 'user');
    addMessage(payload, 'agent', 'daily_report');
  };

  const generateAccountReport = () => {
    const accuracy = stats.totalAttempted > 0 ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 0;
    const payload = {
      username: stats.username,
      userId: stats.userId.slice(-8),
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
      totalDuration: stats.totalDuration,
      accuracy,
      totalScore: stats.totalScore,
      quickBreakdown: {
        easy: { score: stats.quickEasyScore || 0, count: stats.quickEasyCount || 0 },
        medium: { score: stats.quickMediumScore || 0, count: stats.quickMediumCount || 0 },
        hard: { score: stats.quickHardScore || 0, count: stats.quickHardCount || 0 },
      },
      collectionBreakdown: {
        easy: { score: stats.collectionEasyScore || 0, count: stats.collectionEasyCount || 0 },
        medium: { score: stats.collectionMediumScore || 0, count: stats.collectionMediumCount || 0 },
        hard: { score: stats.collectionHardScore || 0, count: stats.collectionHardCount || 0 },
      }
    };

    addMessage("【账户统计报告】", 'user');
    addMessage(payload, 'agent', 'account_report');
  };

  const renderGenericReport = (payload: any, isAccount: boolean) => {
    return (
      <div className="w-full bg-[#161618] rounded-[28px] p-6 border border-white/[0.03] space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-[17px] font-bold text-white">{isAccount ? '账户概览' : '今日统计'}</h3>
            <p className="text-[12px] text-white/30 font-medium">{payload.timestamp}</p>
          </div>
          <div className="bg-blue-600/10 px-3 py-1 rounded-full">
             <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{isAccount ? 'TOTAL' : 'TODAY'}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/[0.05]">
          <div className="text-center space-y-1">
            <div className="text-[18px] font-bold text-white">{payload.totalDuration}s</div>
            <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">耗时</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-[18px] font-bold text-green-500">{payload.accuracy}%</div>
            <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">准确率</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-[18px] font-bold text-white">{payload.totalScore}</div>
            <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">贡献度</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white/[0.02] p-4 rounded-2xl">
            <h4 className="text-[12px] font-bold text-white/60 mb-3 uppercase tracking-widest">快判任务明细</h4>
            <div className="space-y-2">
              {['easy', 'medium', 'hard'].map((d, i) => (
                <div key={d} className="flex justify-between items-center text-[13px]">
                  <span className="text-white/40">{['初级', '中级', '困难'][i]}</span>
                  <span className="text-white/80 font-bold">{(payload.quickBreakdown as any)[d].score} PTS / {(payload.quickBreakdown as any)[d].count} 次</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/[0.02] p-4 rounded-2xl">
            <h4 className="text-[12px] font-bold text-white/60 mb-3 uppercase tracking-widest">采集任务明细</h4>
            <div className="space-y-2">
              {['easy', 'medium', 'hard'].map((d, i) => (
                <div key={d} className="flex justify-between items-center text-[13px]">
                  <span className="text-white/40">{['初级', '中级', '困难'][i]}</span>
                  <span className="text-white/80 font-bold">{(payload.collectionBreakdown as any)[d].score} PTS / {(payload.collectionBreakdown as any)[d].count} 次</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderButtons = () => {
    // Hide buttons if task is active or during conversational loop
    if (activeTask || flowState === 'IDLE' || flowState === 'EMOTION_LOOP') return null;
    
    const menuBtn = "w-full py-5 bg-[#161618] border border-white/[0.05] rounded-[24px] text-[16px] font-bold text-white flex items-center justify-center transition-all active:scale-[0.97] hover:bg-[#1C1C1E] shadow-xl";
    const subBtn = "w-full py-4 bg-[#161618] border border-white/[0.05] rounded-[20px] text-[15px] font-bold text-white flex items-center justify-center transition-all active:scale-[0.97]";

    switch (flowState) {
      case 'SELECT_TYPE':
        return (
          <div className="flex flex-col space-y-3 mt-6 w-full px-2">
            <button onClick={() => onSelectAction('TYPE', TaskType.QUICK_JUDGMENT)} className={menuBtn}>
              <span className="mr-2 opacity-80">🎯</span>快判任务
            </button>
            <button onClick={() => onSelectAction('TYPE', TaskType.COLLECTION)} className={menuBtn}>
              <span className="mr-2 opacity-80">📸</span>采集任务
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => onSelectAction('DAILY', null)} className={subBtn}>
                <span className="mr-2 opacity-80">📊</span>日报统计
              </button>
              <button onClick={() => onSelectAction('ACCOUNT', null)} className={subBtn}>
                <span className="mr-2 opacity-80">👤</span>账户统计
              </button>
            </div>
          </div>
        );
      case 'SELECT_MEDIA':
        const media = pendingTask.type === TaskType.QUICK_JUDGMENT ? ['IMAGE', 'TEXT'] : ['IMAGE', 'AUDIO', 'VIDEO'];
        return (
          <div className="flex flex-col space-y-3 mt-6 w-full px-2">
            {media.map(m => (
              <button key={m} onClick={() => onSelectAction('MEDIA', m)} className={subBtn}>
                {m === 'TEXT' ? '文本' : m === 'IMAGE' ? '图片' : m === 'AUDIO' ? '音频' : '视频'}
              </button>
            ))}
            <button onClick={() => onSelectAction('BACK', null)} className="py-3 text-[14px] text-blue-400 font-bold active:opacity-50">返回上一层</button>
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
            <button onClick={() => onSelectAction('BACK', null)} className="py-3 text-[14px] text-blue-400 font-bold active:opacity-50">返回上一层</button>
          </div>
        );
      case 'SELECT_DIFFICULTY':
        const isTextQuick = pendingTask.type === TaskType.QUICK_JUDGMENT && pendingTask.mediaType === 'TEXT';
        const diffs = isTextQuick ? [Difficulty.EASY, Difficulty.MEDIUM] : [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];
        return (
          <div className="flex flex-col space-y-3 mt-6 w-full px-2">
            {diffs.map(d => (
              <button key={d} onClick={() => onSelectAction('DIFFICULTY', d)} className={subBtn}>{d}</button>
            ))}
            <button onClick={() => onSelectAction('BACK', null)} className="py-3 text-[14px] text-blue-400 font-bold active:opacity-50">返回上一层</button>
          </div>
        );
      default: return null;
    }
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
          <h2 className="text-[17px] font-bold text-white tracking-tight leading-none">AI标注</h2>
          <div className="flex items-center mt-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
            <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">LIVE AGENT</span>
          </div>
        </div>
        <div className="ml-auto bg-blue-600 px-3 py-1.5 rounded-[12px] text-[12px] font-black text-white shadow-lg shadow-blue-600/20">
          {stats.totalScore} PTS
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        {messages.map((m, idx) => (
          <div key={m.id} className="animate-in slide-in-from-bottom-2 duration-300">
            {m.sender === 'agent' && (
              <div className="flex items-center space-x-2 mb-2 ml-1">
                <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-[10px]">📄</div>
                <span className="text-[12px] font-bold text-white/50">Task Center</span>
              </div>
            )}
            
            <div className={`flex ${m.sender === 'agent' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[92%] shadow-2xl ${
                m.sender === 'agent' 
                  ? 'bg-[#161618] rounded-[24px] rounded-tl-[4px] p-5 border border-white/[0.03]' 
                  : 'bg-blue-600 rounded-[24px] rounded-tr-[4px] p-4 font-bold text-white text-[15px]'
              }`}>
                {m.type === 'daily_report' || m.type === 'account_report' ? (
                  renderGenericReport(m.payload, m.type === 'account_report')
                ) : m.type === 'report' ? (
                  <div className="space-y-4 min-w-[240px]">
                    <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
                      <h3 className="text-[11px] font-black uppercase text-blue-400 tracking-widest">📊 任务完成报告</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                      {Object.entries(m.payload).map(([k, v]: any) => (
                        <div key={k} className="flex flex-col">
                          <span className="text-white/30 text-[9px] font-black uppercase tracking-wider mb-0.5">{k}</span>
                          <span className="text-white/90 text-[13px] font-bold truncate">{v?.toString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[15px] leading-[1.6] text-white/95 whitespace-pre-wrap font-medium">{m.payload}</p>
                )}
              </div>
            </div>
            {/* Show selection buttons ONLY for the last message if not in a special state */}
            {idx === messages.length - 1 && renderButtons()}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-center space-x-2 ml-1">
             <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-[10px]">📄</div>
             <div className="bg-[#161618] px-4 py-2 rounded-full border border-white/5 text-[11px] text-white/30 font-bold animate-pulse">Agent 正在思考...</div>
          </div>
        )}

        {activeTask && (
          <div className="mt-4 pb-10">
            <TaskFlow 
              {...activeTask} 
              onComplete={(s, t, p) => { 
                setActiveTask(null); 
                setFlowState('SELECT_TYPE'); 
                addMessage("您的答案已经提交，审核人员将校对您的答案，任务报告将以应用内通知的方式提供。", 'agent');
                // 10 second delay for report
                setTimeout(() => sendFinalReport(t, activeTask.difficulty, p, activeTask.category), 10000);
              }} 
              onCancel={() => { 
                setActiveTask(null); 
                setFlowState('SELECT_TYPE'); 
                addMessage("任务已取消。我们可以重新开始其他任务。", 'agent'); 
              }} 
            />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 pb-10 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/90 to-transparent z-40">
        <div className="flex space-x-3 items-center bg-[#161618] border border-white/10 rounded-[32px] px-6 py-2 shadow-2xl">
          <input 
            type="text" 
            value={userInput} 
            onChange={e => setUserInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
            placeholder={activeTask ? "任务进行中..." : flowState === 'EMOTION_LOOP' ? "在此输入您的判断..." : "有什么可以帮您？"} 
            className="flex-1 bg-transparent py-3 text-[15px] text-white focus:outline-none placeholder:text-white/20" 
            disabled={!!activeTask && flowState !== 'EMOTION_LOOP'}
          />
          <button 
            onClick={handleSendMessage} 
            disabled={!userInput.trim() || (!!activeTask && flowState !== 'EMOTION_LOOP')}
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
