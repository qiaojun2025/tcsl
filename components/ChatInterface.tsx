
import React, { useState, useEffect, useRef, memo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Difficulty, TaskType, UserStats, CollectionCategory, TaskCompletionRecord, MediaType } from '../types.ts';
import TaskFlow from './TaskFlow.tsx';

// Define emotion task constants
const EMOTION_TEXTS = [
  "今天天气真好，心情也很愉快！",
  "这个产品真的太难用了，简直是在浪费时间。",
  "刚刚收到面试通过的通知，太激动了！",
  "路上堵车堵了一个多小时，真是烦死了。",
  "看完这部电影，心里久久不能平静，很感人。",
  "这家店的服务态度极其恶劣，再也不来了。",
  "终于完成了这个项目，感觉如释重负。",
  "明明是他做错了，为什么还要指责我？太委屈了。",
  "听说你要回国了，我真的太开心了！",
  "昨晚没睡好，今天感觉整个人都很疲惫。"
];

const EMOTION_CONFIG = [
  {
    label: "情感倾向",
    options: ["积极", "中性", "消极"]
  },
  {
    label: "情绪强度",
    options: ["低", "中", "高"]
  }
];

const EMOTION_ANSWERS = [
  ["积极", "高"],
  ["消极", "高"],
  ["积极", "高"],
  ["消极", "中"],
  ["积极", "中"],
  ["消极", "高"],
  ["积极", "中"],
  ["消极", "高"],
  ["积极", "高"],
  ["消极", "中"]
];

interface Message {
  id: string;
  sender: 'agent' | 'user';
  type: 'text' | 'task-type-select' | 'media-type-select' | 'difficulty-select' | 'category-select' | 'account-stats-report' | 'daily-stats-report' | 'emotion-options';
  payload: any;
  timestamp: number;
}

interface TaskReportData {
  taskNumber: string;
  username: string;
  startTime: number;
  duration: number;
  type: TaskType;
  difficulty: Difficulty | string;
  category?: string;
  accuracy: string;
  score: number;
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

  return <div className="whitespace-pre-wrap leading-relaxed font-semibold text-white/90">{displayedText}</div>;
});

const ChatInterface: React.FC<ChatInterfaceProps> = ({ stats, taskRecords, onBack, onUpdateTaskCompletion }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTask, setActiveTask] = useState<{type: TaskType, category?: CollectionCategory, difficulty: Difficulty | string, mediaType?: MediaType, prompt: string, totalTasks: number, currentIndex: number} | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [notification, setNotification] = useState<TaskReportData | null>(null);
  
  const [workflowState, setWorkflowState] = useState<'IDLE' | 'AWAITING_CLASSIFICATION' | 'AWAITING_LABELS' | 'EMOTION_LOOP'>('IDLE');
  const [tempConfig, setTempConfig] = useState<any>(null);
  const [customLabels, setCustomLabels] = useState<string[]>([]);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState(0);
  const [sessionStats, setSessionStats] = useState({ score: 0, correct: 0 });

  const [emotionTaskState, setEmotionTaskState] = useState({ index: 0, subStep: 0, currentAnswers: [] as string[] });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isTaskActive = !!activeTask || workflowState === 'EMOTION_LOOP';

  useEffect(() => {
    setMessages([{
      id: Date.now().toString(),
      sender: 'agent',
      type: 'text',
      payload: "您好！我是您的任务中心 Agent。在这里您可以通过贡献数据获得 PTS。请选择一个功能开始：",
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

  const startEmotionTask = () => {
    setWorkflowState('EMOTION_LOOP');
    setSessionStartTime(Date.now());
    setSessionStats({ score: 0, correct: 0 });
    setEmotionTaskState({ index: 0, subStep: 0, currentAnswers: [] });
    
    sendEmotionStep(0, 0, []);
  };

  const sendEmotionStep = (index: number, subStep: number, currentAnswers: string[]) => {
    const text = EMOTION_TEXTS[index];
    if (subStep === 0) {
      addMessage(`[任务 ${index + 1}/10] 请判别以下文本：\n\n"${text}"`, 'agent');
    }
    
    const config = EMOTION_CONFIG[subStep];
    setTimeout(() => {
      addMessage({
        label: config.label,
        options: config.options,
        index,
        subStep
      }, 'agent', 'emotion-options');
    }, 600);
  };

  const handleEmotionSelection = (option: string) => {
    const { index, subStep, currentAnswers } = emotionTaskState;
    addMessage(option, 'user');
    
    const newAnswers = [...currentAnswers, option];
    const nextSubStep = subStep + 1;

    if (nextSubStep >= EMOTION_CONFIG.length) {
      const truth = EMOTION_ANSWERS[index];
      const isItemCorrect = newAnswers.every((ans, i) => ans === truth[i]);
      const itemScore = isItemCorrect ? 10 : 0;
      
      const newTotalScore = sessionStats.score + itemScore;
      const newTotalCorrect = sessionStats.correct + (isItemCorrect ? 1 : 0);
      setSessionStats({ score: newTotalScore, correct: newTotalCorrect });

      const nextItemIndex = index + 1;
      if (nextItemIndex >= 10) {
        // 1. Confirmation message immediately
        addMessage("您的答案已经提交，审核人员将校对您的答案。校对后，任务报告将在应用内通知", 'agent');
        
        // 2. Clear workflow state and show menu immediately
        setWorkflowState('IDLE');
        setTimeout(() => addMessage({}, 'agent', 'task-type-select'), 500);
        
        const endTime = Date.now();
        // 3. Mandatory 10-second delay for notification banner
        setTimeout(() => {
          onUpdateTaskCompletion(newTotalScore, TaskType.QUICK_JUDGMENT, Difficulty.EASY, {
            correctCount: newTotalCorrect,
            totalCount: 10,
            startTime: sessionStartTime,
            endTime
          }, CollectionCategory.EMOTION);
          
          setNotification({
            taskNumber: `SN-${endTime.toString().slice(-6)}`,
            username: stats.username,
            startTime: sessionStartTime,
            duration: Math.round((endTime - sessionStartTime) / 1000),
            type: TaskType.QUICK_JUDGMENT,
            difficulty: Difficulty.EASY,
            category: '情绪快判',
            accuracy: `${newTotalCorrect}/10`,
            score: newTotalScore
          });
        }, 10000);
      } else {
        setEmotionTaskState({ index: nextItemIndex, subStep: 0, currentAnswers: [] });
        setTimeout(() => sendEmotionStep(nextItemIndex, 0, []), 800);
      }
    } else {
      setEmotionTaskState({ index, subStep: nextSubStep, currentAnswers: newAnswers });
      sendEmotionStep(index, nextSubStep, newAnswers);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isTyping) return;
    if (workflowState !== 'AWAITING_CLASSIFICATION' && workflowState !== 'AWAITING_LABELS') return;

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
    } else if (workflowState === 'AWAITING_LABELS') {
      const isVideo = tempConfig.mediaType === 'VIDEO';
      if (!isVideo && customLabels.includes(val)) {
        addMessage("标注内容重复，请输入不同的内容。", 'agent');
        return;
      }
      setTempConfig(prev => ({ ...prev, currentLabel: val }));
      const mediaType = tempConfig?.mediaType || activeTask?.mediaType;
      addMessage(`好的，标注内容：【${val}】。请从相册上传或者拍摄图片上传。`, 'agent');
      
      setTimeout(() => {
        setActiveTask({
          type: TaskType.COLLECTION,
          category: CollectionCategory.CUSTOM,
          difficulty: '自定义',
          mediaType: mediaType,
          prompt: val,
          totalTasks: 1,
          currentIndex: customLabels.length
        });
      }, 800);
    }
  };

  const handleAction = (type: string, data: any) => {
    if (isTaskActive && type !== 'GO_BACK') return;
    
    switch(type) {
      case 'SELECT_TYPE':
        addMessage(`【${data}】`, 'user');
        setTimeout(() => addMessage({ taskType: data }, 'agent', 'media-type-select'), 400);
        break;
      case 'SELECT_MEDIA':
        const currentTaskType = messages.filter(m => m.type === 'media-type-select').slice(-1)[0]?.payload.taskType || data;
        addMessage(`文件类型：${data === 'IMAGE' ? '图片' : data === 'AUDIO' ? '音频' : data === 'VIDEO' ? '视频' : '文本'}`, 'user');
        if (data === 'TEXT') addMessage("准备开始：情绪快判", 'agent');
        setTimeout(() => addMessage({ taskType: currentTaskType, mediaType: data }, 'agent', 'difficulty-select'), 400);
        break;
      case 'SELECT_DIFFICULTY':
        addMessage(`难度：${data}`, 'user');
        const prevPayload = messages.filter(m => m.type === 'difficulty-select').slice(-1)[0]?.payload;
        if (data === '自定义') {
          setWorkflowState('AWAITING_CLASSIFICATION');
          setTempConfig({ taskType: TaskType.COLLECTION, mediaType: prevPayload.mediaType });
          setTimeout(() => addMessage("请输入采集主题内容", 'agent'), 400);
        } else if (prevPayload.taskType === TaskType.QUICK_JUDGMENT) {
          if (prevPayload.mediaType === 'TEXT') {
             startEmotionTask();
          } else {
            setActiveTask({ 
              type: TaskType.QUICK_JUDGMENT, 
              difficulty: data, 
              mediaType: prevPayload.mediaType,
              prompt: '', 
              totalTasks: 10, 
              currentIndex: 0 
            });
          }
        } else {
          setTimeout(() => addMessage({ ...prevPayload, difficulty: data }, 'agent', 'category-select'), 400);
        }
        break;
      case 'SELECT_CATEGORY':
        addMessage(`分类：${data}`, 'user');
        const mType = messages.filter(m => m.type === 'category-select').slice(-1)[0]?.payload.mediaType;
        const total = mType === 'VIDEO' ? 1 : 10;
        setActiveTask({ 
          ...messages.filter(m => m.type === 'category-select').slice(-1)[0]?.payload, 
          category: data, 
          type: TaskType.COLLECTION, 
          prompt: '', 
          totalTasks: total, 
          currentIndex: 0 
        });
        break;
      case 'GO_BACK':
        addMessage("返回上一层", 'user');
        if (workflowState === 'EMOTION_LOOP') setWorkflowState('IDLE');
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
    // 1. Agent immediately outputs confirmation message
    addMessage("您的答案已经提交，审核人员将校对您的答案。校对后，任务报告将在应用内通知", 'agent');
    
    // 2. Clear task interface immediately (removes mask layer)
    const taskDetails = { ...activeTask };
    setActiveTask(null);
    setWorkflowState('IDLE');

    // 3. Immediately show the main task selection menu back in the chat
    setTimeout(() => addMessage({}, 'agent', 'task-type-select'), 500);

    // 4. Mandatory 10-second delay for notification banner
    setTimeout(() => {
      if (!taskDetails?.category || taskDetails.category !== CollectionCategory.CUSTOM) {
        const d = taskDetails?.difficulty || Difficulty.EASY;
        const c = taskDetails?.category;
        onUpdateTaskCompletion(score, type, d as Difficulty, performance, c);
        
        setNotification({
          taskNumber: `SN-${performance.endTime.toString().slice(-6)}`,
          username: stats.username,
          startTime: performance.startTime,
          duration: Math.round((performance.endTime - performance.startTime) / 1000),
          type,
          difficulty: d,
          category: c || (taskDetails?.mediaType === 'TEXT' ? CollectionCategory.EMOTION : undefined),
          accuracy: `${performance.correctCount}/${performance.totalCount}`,
          score
        });
      } else {
        const isVideo = tempConfig.mediaType === 'VIDEO';
        const targetCount = isVideo ? 1 : 10;
        const nextLabels = [...customLabels, tempConfig.currentLabel];
        const nextStats = { 
          score: sessionStats.score + score, 
          correct: sessionStats.correct + (performance.correctCount > 0 ? 1 : 0) 
        };
        
        setCustomLabels(nextLabels);
        setSessionStats(nextStats);

        if (nextLabels.length < targetCount) {
          setTimeout(() => {
            addMessage(`请输入第 ${nextLabels.length + 1} 题自定义采集任务的标注内容，当前 ${nextLabels.length + 1}/${targetCount}。`, 'agent');
          }, 400);
        } else {
          const endTime = Date.now();
          const perf = {
            correctCount: nextStats.correct,
            totalCount: targetCount,
            startTime: sessionStartTime,
            endTime
          };
          
          onUpdateTaskCompletion(nextStats.score, TaskType.COLLECTION, Difficulty.EASY, perf, CollectionCategory.CUSTOM);
          
          setNotification({
            taskNumber: `SN-${endTime.toString().slice(-6)}`,
            username: stats.username,
            startTime: sessionStartTime,
            duration: Math.round((endTime - sessionStartTime) / 1000),
            type: TaskType.COLLECTION,
            difficulty: '自定义',
            category: customCategoryName,
            accuracy: `${nextStats.correct}/${targetCount}`,
            score: nextStats.score
          });

          setWorkflowState('IDLE');
          setCustomLabels([]);
          setTempConfig(null);
        }
      }
    }, 10000);
  };

  const renderButtons = (msg: Message, isLast: boolean) => {
    // Requirements: Hide all historical buttons during task execution.
    // Also, buttons are only active on the latest message when idle.
    if (isTaskActive) return null;
    
    const disabled = !isLast;
    const btnClass = "w-full py-4 rounded-2xl font-bold text-[15px] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale ";
    
    switch(msg.type) {
      case 'task-type-select': return (
        <div className="space-y-3 mt-3">
          <button disabled={disabled} onClick={() => handleAction('SELECT_TYPE', TaskType.QUICK_JUDGMENT)} className={btnClass + "bg-[#1A4BD3] text-white"}>【快判任务】</button>
          <button disabled={disabled} onClick={() => handleAction('SELECT_TYPE', TaskType.COLLECTION)} className={btnClass + "bg-[#161618] text-white border border-white/10"}>【采集任务】</button>
          <button disabled={disabled} onClick={() => handleAction('DAILY_REPORT', null)} className={btnClass + "bg-[#161618] text-white/70 border border-white/10"}>【我的日报统计】</button>
          <button disabled={disabled} onClick={() => handleAction('ACCOUNT_STATS', null)} className={btnClass + "bg-[#161618] text-white/70 border border-white/10"}>【我的账户统计】</button>
        </div>
      );
      case 'media-type-select': 
        const isQuick = msg.payload.taskType === TaskType.QUICK_JUDGMENT;
        return (
          <div className="space-y-3 mt-3">
            {isQuick ? (
              <>
                <button disabled={disabled} onClick={() => handleAction('SELECT_MEDIA', 'IMAGE')} className={btnClass + "bg-[#161618] border border-white/10 text-white"}>图片</button>
                <button disabled={disabled} onClick={() => handleAction('SELECT_MEDIA', 'TEXT')} className={btnClass + "bg-[#161618] border border-white/10 text-white"}>文本</button>
              </>
            ) : (
              ['IMAGE', 'AUDIO', 'VIDEO'].map(t => (
                <button key={t} disabled={disabled} onClick={() => handleAction('SELECT_MEDIA', t)} className={btnClass + "bg-[#161618] border border-white/10 text-white"}>{t === 'IMAGE' ? '图片' : t === 'AUDIO' ? '音频' : '视频'}</button>
              ))
            )}
            <button disabled={disabled} onClick={() => handleAction('GO_BACK', 'task-type-select')} className="w-full py-2 text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">↩️ 返回上一层</button>
          </div>
        );
      case 'difficulty-select':
        const media = msg.payload.mediaType;
        const isEmotion = msg.payload.taskType === TaskType.QUICK_JUDGMENT && media === 'TEXT';
        return (
          <div className="space-y-3 mt-3">
            {isEmotion ? (
              <button disabled={disabled} onClick={() => handleAction('SELECT_DIFFICULTY', Difficulty.EASY)} className={btnClass + "bg-[#161618] border border-[#1A4BD3] text-[#3E8BFF]"}>{Difficulty.EASY}</button>
            ) : (
              [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD, '自定义'].filter(d => msg.payload.taskType === TaskType.COLLECTION || d !== '自定义').map(d => (
                <button key={d} disabled={disabled} onClick={() => handleAction('SELECT_DIFFICULTY', d)} className={btnClass + "bg-[#161618] border border-white/10 text-white"}>{d}</button>
              ))
            )}
            <button disabled={disabled} onClick={() => handleAction('GO_BACK', 'media-type-select')} className="w-full py-2 text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">↩️ 返回上一层</button>
          </div>
        );
      case 'category-select': return (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {(msg.payload.mediaType === 'AUDIO' ? [CollectionCategory.AUDIO] : 
            msg.payload.mediaType === 'VIDEO' ? [CollectionCategory.VIDEO] : 
            [CollectionCategory.ANIMAL, CollectionCategory.PLANT, CollectionCategory.PERSON, CollectionCategory.STREET, CollectionCategory.LIFE]).map(c => (
            <button key={c} disabled={disabled} onClick={() => handleAction('SELECT_CATEGORY', c)} className={btnClass + "bg-[#161618] border border-white/10 text-white text-xs"}>{c}</button>
          ))}
          <button disabled={disabled} onClick={() => handleAction('GO_BACK', 'difficulty-select')} className="col-span-2 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest">↩️ 返回上一层</button>
        </div>
      );
      case 'emotion-options':
        return (
          <div className="space-y-3 mt-3">
            <p className="text-xs text-blue-400 font-bold mb-1 uppercase tracking-wider">{msg.payload.label}</p>
            {msg.payload.options.map((opt: string) => (
              <button key={opt} disabled={!isLast} onClick={() => handleEmotionSelection(opt)} className={btnClass + "bg-[#161618] border border-white/10 text-white"}>{opt}</button>
            ))}
            <button disabled={!isLast} onClick={() => handleAction('GO_BACK', 'task-type-select')} className="w-full py-2 text-xs font-bold text-red-500 uppercase tracking-widest mt-2">退出任务</button>
          </div>
        );
      case 'daily-stats-report':
      case 'account-stats-report':
          const s = msg.payload;
          return (
            <div className="ios-card p-5 w-full">
              <h4 className="font-bold text-white text-[16px] mb-4">{msg.type === 'daily-stats-report' ? '今日统计' : '账户概览'}</h4>
              <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5"><p className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-wider">总耗时</p><p className="font-bold text-white">{s.totalDuration}s</p></div>
                  <div className="bg-[#1A4BD3] p-4 rounded-2xl text-white shadow-md"><p className="text-[10px] text-white/60 font-bold mb-1 uppercase tracking-wider">总报酬</p><p className="font-bold text-white">{s.totalScore.toLocaleString()} PTS</p></div>
              </div>
            </div>
          );
      default: return null;
    }
  };

  const showFooterInput = workflowState === 'AWAITING_CLASSIFICATION' || workflowState === 'AWAITING_LABELS';

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] relative">
      {/* Top Banner Notification */}
      {notification && (
        <div className="absolute top-0 left-0 right-0 z-[100] px-4 pt-4 animate-in slide-in-from-top duration-500">
          <div className="w-full ios-card p-4 shadow-2xl border border-[#1A4BD3]/30 bg-[#161618]/95 backdrop-blur-md relative overflow-hidden ring-1 ring-[#1A4BD3]/20">
            <div className="absolute top-0 right-0 px-3 py-1 bg-blue-600 rounded-bl-xl text-[9px] font-black uppercase tracking-wider text-white">站内通知</div>
            
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h4 className="font-bold text-white text-sm leading-none">任务报告</h4>
                <p className="text-[10px] text-blue-400 font-bold mt-1 uppercase tracking-widest">{notification.taskNumber}</p>
              </div>
              <button onClick={() => setNotification(null)} className="ml-auto p-1 text-white/30 hover:text-white transition-colors">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 mb-4">
              <div className="flex flex-col"><span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">用户名</span><span className="font-bold text-white text-xs">{notification.username}</span></div>
              <div className="flex flex-col"><span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">任务类型</span><span className="font-bold text-white text-xs">{notification.type}</span></div>
              <div className="flex flex-col"><span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">任务级别</span><span className="font-bold text-blue-400 text-xs">{notification.difficulty}</span></div>
              <div className="flex flex-col"><span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">开始时间</span><span className="font-bold text-white/80 text-xs">{new Date(notification.startTime).toLocaleTimeString()}</span></div>
              <div className="flex flex-col"><span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">耗时 / 准确率</span><span className="font-bold text-white text-xs">{notification.duration}s · <span className="text-[#10B981]">{notification.accuracy}</span></span></div>
              {notification.category && (
                <div className="flex flex-col"><span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">任务分类</span><span className="font-bold text-amber-500 text-xs truncate">{notification.category}</span></div>
              )}
            </div>

            <div className="bg-[#1A4BD3] py-2 px-4 rounded-xl text-white flex justify-between items-center shadow-lg">
               <span className="text-[10px] font-black uppercase tracking-widest text-blue-100 opacity-80">获得贡献度</span>
               <span className="text-sm font-black">+{notification.score} PTS</span>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-50 ios-blur border-b border-white/5 flex items-center px-6 h-16 pt-safe box-content">
        {!isTaskActive && workflowState === 'IDLE' && (
          <button onClick={onBack} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        <div className="flex flex-col ml-3">
          <h2 className="text-[16px] font-bold text-white tracking-tight">AI 标注</h2>
          <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-widest flex items-center">
            <span className="w-1 h-1 bg-[#10B981] rounded-full mr-1.5 animate-pulse"></span> Online
          </span>
        </div>
        <div className="ml-auto bg-[#1A4BD3] px-3 py-1 rounded-full">
          <span className="text-[12px] font-bold text-white">{stats.totalScore.toLocaleString()} PTS</span>
        </div>
      </div>
      
      <div className={`flex-1 overflow-y-auto p-4 space-y-6 ${showFooterInput ? 'pb-32' : 'pb-10'}`}>
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] ${msg.sender === 'agent' ? (msg.type === 'text') ? 'bg-[#1C1C1E] text-white rounded-[20px] rounded-tl-none border border-white/5 p-4' : 'w-full' : 'bg-[#1A4BD3] text-white rounded-[20px] rounded-tr-none shadow-xl p-4 font-semibold'}`}>
              {msg.type === 'text' && msg.sender === 'agent' && idx === messages.length - 1 ? <Typewriter text={msg.payload} /> : 
               msg.type === 'text' ? <div className="whitespace-pre-wrap leading-relaxed font-semibold">{msg.payload}</div> : null}
              {renderButtons(msg, idx === messages.length - 1)}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#1C1C1E] rounded-full px-4 py-3 border border-white/5 flex space-x-1">
              <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div>
              <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{animationDelay:'0.4s'}}></div>
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
                addMessage("任务已退出流程。", 'agent'); 
                if (workflowState === 'IDLE') {
                  setTimeout(() => addMessage({}, 'agent', 'task-type-select'), 800); 
                }
              }} 
            />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {showFooterInput && (
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-safe ios-blur border-t border-white/5 flex flex-col z-50">
          <div className="flex space-x-3 items-center">
            <div className="flex-1 relative">
                <input 
                  type="text" 
                  autoFocus
                  placeholder={
                    workflowState === 'AWAITING_CLASSIFICATION' ? "输入采集主题内容..." :
                    workflowState === 'AWAITING_LABELS' ? "输入标注内容..." :
                    "输入内容..."
                  } 
                  className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-[15px] font-medium text-white outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all placeholder:text-white/20"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
            </div>
            <button 
              onClick={handleSendMessage}
              disabled={!userInput.trim() || isTyping}
              className={`w-14 h-14 bg-[#1A4BD3] rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all disabled:opacity-20`}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M14 5L21 12M21 12L14 19M21 12H3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
