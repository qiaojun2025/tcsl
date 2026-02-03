
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
  type: 'text' | 'selection' | 'report' | 'daily_report' | 'account_report' | 'system';
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
  
  const [flowState, setFlowState] = useState<'IDLE' | 'SELECT_TYPE' | 'SELECT_MEDIA' | 'SELECT_CATEGORY' | 'SELECT_DIFFICULTY' | 'EMOTION_LOOP'>('SELECT_TYPE');
  const [pendingTask, setPendingTask] = useState<any>({ type: TaskType.QUICK_JUDGMENT });
  
  const [emotionIndex, setEmotionIndex] = useState(0);
  const [emotionSubStep, setEmotionSubStep] = useState(0); // 0: Direction, 1: Strength, 2: Complaint
  const [emotionTaskStartTime, setEmotionTaskStartTime] = useState(0);
  const [emotionCorrectCount, setEmotionCorrectCount] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { 
        systemInstruction: `你是 Web3 任务中心 Agent。你正在协助用户完成数据标注任务。语气专业、简洁、鼓励。用户在执行情绪快判任务时，你需要通过对话引导其完成判定。` 
      },
    });

    setMessages([
      {
        id: 'init-1',
        sender: 'agent',
        type: 'text',
        payload: "您好！我是您的任务中心 Agent。准备好开始今天的标注工作了吗？\n\n您可以选择下方的任务类型，或者直接告诉我您的需求。",
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
      addMessage("抱歉，连接稍有波动，请稍后再试。", 'agent');
    } finally { setIsTyping(false); }
  };

  const handleEmotionResponse = (val: string) => {
    // Basic command handling
    if (val === '退出' || val === 'exit') {
      addMessage("已为您退出当前任务。", 'agent');
      setFlowState('SELECT_TYPE');
      return;
    }
    if (val === '跳过' || val === 'skip') {
      addMessage("已跳过当前文本。", 'agent');
      moveToNextEmotionText();
      return;
    }

    const steps = [
      ["正面", "负面", "中性"],
      ["高", "中", "低"],
      ["包含投诉", "不包含投诉"]
    ];
    const currentOptions = steps[emotionSubStep];
    
    const choice = parseInt(val);
    let valid = false;
    if (!isNaN(choice) && choice > 0 && choice <= currentOptions.length) {
        valid = true;
    } else if (currentOptions.some(opt => val.includes(opt))) {
        valid = true;
    }

    if (!valid) {
      addMessage(`输入无效。请回复序号或关键字（如：1 或 正面）：\n${currentOptions.map((o,i)=>`${i+1}.${o}`).join(' ')}`, 'agent');
      return;
    }

    if (emotionSubStep < 2) {
      const nextStep = emotionSubStep + 1;
      setEmotionSubStep(nextStep);
      askEmotionSubStep(emotionIndex, nextStep);
    } else {
      setEmotionCorrectCount(prev => prev + 1);
      moveToNextEmotionText();
    }
  };

  const moveToNextEmotionText = () => {
    if (emotionIndex < EMOTION_TEXTS.length - 1) {
      const nextIdx = emotionIndex + 1;
      setEmotionIndex(nextIdx);
      setEmotionSubStep(0);
      addMessage(`[任务 ${nextIdx + 1}/10]\n"${EMOTION_TEXTS[nextIdx]}"`, 'agent');
      askEmotionSubStep(nextIdx, 0);
    } else {
      completeEmotionTask();
    }
  };

  const completeEmotionTask = () => {
    addMessage("感谢您的贡献！您的答案已经提交审核。校对完成后，详细的任务报告将发送给您，任务报告同时保存在：我的-账户-任务报告 中。", 'agent');
    const end = Date.now();
    const finalCount = emotionCorrectCount;
    setFlowState('SELECT_TYPE');
    setTimeout(() => sendFinalReport(TaskType.QUICK_JUDGMENT, Difficulty.EASY, { correctCount: finalCount, totalCount: 10, startTime: emotionTaskStartTime, endTime: end }, CollectionCategory.EMOTION), 8000);
  };

  const askEmotionSubStep = (idx: number, step: number) => {
    const titles = ["情绪方向", "情绪强度", "是否包含投诉"];
    const options = [["正面", "负面", "中性"], ["高", "中", "低"], ["包含投诉", "不包含投诉"]][step];
    addMessage(`请选择【${titles[step]}】：\n${options.map((o,i)=>`${i+1}. ${o}`).join('   ')}`, 'agent');
  };

  const sendFinalReport = (type: TaskType, diff: Difficulty, perf: any, cat?: CollectionCategory) => {
    onUpdateTaskCompletion(100, type, diff, perf, cat);
    addMessage("通知：您的一份标注任务已通过审核，点击查看报告。", 'agent');
    const report: any = {
      '用户名': stats.username,
      '任务ID': `ID-${perf.startTime.toString().slice(-6)}`,
      '任务类型': type,
      '任务级别': diff,
      '准确率': `${perf.correctCount}/${perf.totalCount}`,
      '耗时': `${Math.round((perf.endTime - perf.startTime)/1000)}秒`,
      '结算贡献度': `+${perf.correctCount * 10} PTS`
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
        addMessage("请选择文件类型：", 'agent');
        break;
      case 'MEDIA':
        const updated = { ...pendingTask, mediaType: data };
        setPendingTask(updated);
        addMessage(`${data === 'TEXT' ? '文本' : data === 'IMAGE' ? '图片' : data === 'AUDIO' ? '音频' : '视频'}`, 'user');
        
        if (updated.type === TaskType.QUICK_JUDGMENT) {
          setFlowState('SELECT_DIFFICULTY');
          addMessage("请选择难度：", 'agent');
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
          setFlowState('EMOTION_LOOP');
          setEmotionIndex(0);
          setEmotionSubStep(0);
          setEmotionCorrectCount(0);
          setEmotionTaskStartTime(Date.now());
          addMessage("进入【情绪快判】对话模式。请根据提示输入序号或内容。过程中回复“跳过”可跳过当前条目，“退出”可返回主菜单。", 'agent');
          addMessage(`[任务 1/10]\n"${EMOTION_TEXTS[0]}"`, 'agent');
          askEmotionSubStep(0, 0);
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
    addMessage("📊 正在统计今日成果...", 'agent');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRecords = taskRecords.filter(r => r.timestamp >= today.getTime());
      const totalScore = todayRecords.reduce((acc, curr) => acc + curr.score, 0);
      const payload = {
        username: stats.username,
        userId: stats.userId.slice(-8),
        timestamp: new Date().toLocaleString(),
        totalDuration: todayRecords.reduce((acc, curr) => acc + curr.duration, 0),
        accuracy: todayRecords.length > 0 ? Math.round((todayRecords.reduce((a,b)=>a+b.correctCount,0)/todayRecords.reduce((a,b)=>a+b.totalCount,0))*100) : 0,
        totalScore,
        quickBreakdown: { easy: { score: 0, count: 0 }, medium: { score: 0, count: 0 }, hard: { score: 0, count: 0 } }, // Mocked for simplicity
        collectionBreakdown: { easy: { score: 0, count: 0 }, medium: { score: 0, count: 0 }, hard: { score: 0, count: 0 } }
      };
      addMessage(payload, 'agent', 'daily_report');
    }, 1000);
  };

  const generateAccountReport = () => {
    addMessage(stats, 'agent', 'account_report');
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
             <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{isAccount ? 'VIB NODE' : 'ACTIVE'}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.02]">
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">总积分</p>
              <p className="text-2xl font-black text-white">{isAccount ? stats.totalScore : payload.totalScore} <span className="text-[12px] text-blue-500 ml-1">PTS</span></p>
           </div>
           <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.02]">
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">总耗时</p>
              <p className="text-2xl font-black text-white">{isAccount ? stats.totalDuration : payload.totalDuration} <span className="text-[12px] text-white/40 ml-1">S</span></p>
           </div>
        </div>
        <button onClick={() => setFlowState('SELECT_TYPE')} className="w-full py-4 bg-white/5 rounded-2xl text-[14px] font-bold text-white/60 active:bg-white/10">查看详细明细</button>
      </div>
    );
  };

  const renderButtons = () => {
    if (activeTask || flowState === 'IDLE') return null;
    
    // Quick action buttons for emotion loop
    if (flowState === 'EMOTION_LOOP') {
      return (
        <div className="grid grid-cols-2 gap-3 mt-4 w-full px-2">
          <button onClick={() => handleEmotionResponse('跳过')} className="py-4 bg-[#232326] border border-white/5 rounded-[20px] text-[15px] font-bold text-white/60 active:scale-95 transition-all">
            ⏭ 跳过当前
          </button>
          <button onClick={() => handleEmotionResponse('退出')} className="py-4 bg-[#232326] border border-white/5 rounded-[20px] text-[15px] font-bold text-red-500/80 active:scale-95 transition-all">
            ⏹ 退出任务
          </button>
        </div>
      );
    }

    const menuBtn = "w-full py-5 bg-[#161618] border border-white/[0.05] rounded-[24px] text-[16px] font-bold text-white flex items-center justify-center transition-all active:scale-[0.97] hover:bg-[#1C1C1E] shadow-xl";
    const subBtn = "w-full py-4 bg-[#161618] border border-white/[0.05] rounded-[20px] text-[15px] font-bold text-white flex items-center justify-center transition-all active:scale-[0.97]";

    switch (flowState) {
      case 'SELECT_TYPE':
        return (
          <div className="flex flex-col space-y-3 mt-6 w-full px-2">
            <button onClick={() => onSelectAction('TYPE', TaskType.QUICK_JUDGMENT)} className={menuBtn}>
              <span className="mr-3 text-xl">🎯</span>快判任务
            </button>
            <button onClick={() => onSelectAction('TYPE', TaskType.COLLECTION)} className={menuBtn}>
              <span className="mr-3 text-xl">📸</span>采集任务
            </button>
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
        const isTextQuick = pendingTask.type === TaskType.QUICK_JUDGMENT && pendingTask.mediaType === 'TEXT';
        const diffs = isTextQuick ? [Difficulty.EASY, Difficulty.MEDIUM] : [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];
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

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] relative">
      <div className="h-16 flex items-center px-4 shrink-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/5">
        <button onClick={onBack} className="p-2 -ml-2 text-white/90 active:opacity-50">
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

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
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
              }`}>
                {m.type === 'daily_report' || m.type === 'account_report' ? (
                  renderGenericReport(m.payload, m.type === 'account_report')
                ) : m.type === 'report' ? (
                  <div className="space-y-4 min-w-[240px]">
                    <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
                      <h3 className="text-[11px] font-black uppercase text-blue-400 tracking-widest">任务审计通过</h3>
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
             <div className="bg-[#161618] px-4 py-2 rounded-full border border-white/5 text-[11px] text-white/30 font-bold animate-pulse">正在处理...</div>
          </div>
        )}

        {activeTask && (
          <div className="mt-4 pb-10">
            <TaskFlow 
              {...activeTask} 
              onComplete={(s, t, p) => { 
                setActiveTask(null); 
                setFlowState('SELECT_TYPE'); 
                addMessage("任务完成！您的贡献已进入审核序列。", 'agent');
                setTimeout(() => sendFinalReport(t, activeTask.difficulty, p, activeTask.category), 10000);
              }} 
              onCancel={() => { 
                setActiveTask(null); 
                setFlowState('SELECT_TYPE'); 
                addMessage("当前任务已终止。", 'agent'); 
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
            placeholder={flowState === 'EMOTION_LOOP' ? "在此回复判定结果或“跳过”..." : "对话、提问或开启任务..."} 
            className="flex-1 bg-transparent py-4 text-[15px] text-white focus:outline-none placeholder:text-white/20" 
            disabled={!!activeTask}
          />
          <button 
            onClick={handleSendMessage} 
            disabled={!userInput.trim() || !!activeTask}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              userInput.trim() ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 text-white/20'
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
