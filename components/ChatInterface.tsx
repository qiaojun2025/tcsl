
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

const EMOTION_TEXTS = [
  "这个 APP 更新之后变得很卡，体验明显不如以前。",
  "客服响应速度非常快，问题解决得很圆满，给个赞！",
  "产品设计很美观，但是电池续航稍微有点短。",
  "物流真的太慢了，等了五天还没到，以后不在这家买了。",
  "功能很全，几乎涵盖了我所有的日常办公需求。",
  "系统经常闪退，严重影响工作效率，希望能尽快修复。",
  "音质非常惊艳，超出了这个价位的预期。",
  "说明书写得太简略了，折腾了半天才会用。",
  "包装非常精美，送人很有面子。",
  "价格虽然贵一点，但质量确实没得说。"
];

// Mock Ground Truth for validation
const EMOTION_ANSWERS = [
  ['负面', '强', '包含'],
  ['正面', '强', '不包含'],
  ['负面', '弱', '不包含'],
  ['负面', '强', '包含'],
  ['正面', '中', '不包含'],
  ['负面', '强', '包含'],
  ['正面', '强', '不包含'],
  ['负面', '中', '包含'],
  ['正面', '中', '不包含'],
  ['正面', '中', '不包含']
];

const EMOTION_CONFIG = [
  { label: '情绪方向', options: ['正面', '负面', '中性'] },
  { label: '情绪强度', options: ['弱', '中', '强'] },
  { label: '是否包含投诉', options: ['包含', '不包含'] }
];

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

  return <div className="whitespace-pre-wrap leading-relaxed font-semibold text-gray-800">{displayedText}</div>;
});

const ChatInterface: React.FC<ChatInterfaceProps> = ({ stats, taskRecords, onBack, onUpdateTaskCompletion }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTask, setActiveTask] = useState<{type: TaskType, category?: CollectionCategory, difficulty: Difficulty | string, mediaType?: MediaType, prompt: string, totalTasks: number, currentIndex: number} | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
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

  const getEmotionPrompt = (subStep: number) => {
    const safeIndex = Math.min(Math.max(0, subStep), EMOTION_CONFIG.length - 1);
    const config = EMOTION_CONFIG[safeIndex];
    const optionsText = config.options.map((opt, i) => `${i + 1}, ${opt}`).join('  ');
    return `请选择【${config.label}】：\n${optionsText}\n(提示：回复数字或选项文字)`;
  };

  const startEmotionTask = () => {
    setWorkflowState('EMOTION_LOOP');
    setSessionStartTime(Date.now());
    setSessionStats({ score: 0, correct: 0 });
    setEmotionTaskState({ index: 0, subStep: 0, currentAnswers: [] });
    
    const text = EMOTION_TEXTS[0];
    addMessage(`[任务 1/10] 请判别以下文本：\n\n"${text}"`, 'agent');
    setTimeout(() => {
      addMessage(getEmotionPrompt(0), 'agent');
    }, 800);
  };

  const processEmotionInput = (val: string) => {
    const { index, subStep, currentAnswers } = emotionTaskState;
    if (subStep >= EMOTION_CONFIG.length) return; // Safety guard
    
    const config = EMOTION_CONFIG[subStep];
    let selectedOption = "";

    const num = parseInt(val);
    if (!isNaN(num) && num >= 1 && num <= config.options.length) {
      selectedOption = config.options[num - 1];
    } else {
      const found = config.options.find(opt => val.includes(opt));
      if (found) selectedOption = found;
    }

    if (!selectedOption) {
      addMessage(`识别失败。请回复 1-${config.options.length} 之间的数字，或者直接输入选项内容。`, 'agent');
      return;
    }

    addMessage(selectedOption, 'user');
    const newAnswers = [...currentAnswers, selectedOption];
    
    const nextStepIndex = subStep + 1;

    if (nextStepIndex >= EMOTION_CONFIG.length) {
      // Validate item answers
      const truth = EMOTION_ANSWERS[index];
      const isItemCorrect = newAnswers.every((ans, i) => ans === truth[i]);
      
      const itemScore = isItemCorrect ? 10 : 0;
      const currentTotalScore = sessionStats.score + itemScore;
      const currentTotalCorrect = sessionStats.correct + (isItemCorrect ? 1 : 0);
      
      setSessionStats({ score: currentTotalScore, correct: currentTotalCorrect });

      // Feedback to user
      setTimeout(() => {
        if (isItemCorrect) {
          addMessage(`✅ 恭喜！本条任务判别准确。贡献度 +10 PTS。当前累计：${currentTotalScore} PTS`, 'agent');
        } else {
          addMessage(`❌ 抱歉，本条任务判别与标准结果不符。本次不得分。`, 'agent');
        }

        const nextItemIndex = index + 1;

        if (nextItemIndex >= 10) {
          const endTime = Date.now();
          onUpdateTaskCompletion(currentTotalScore, TaskType.QUICK_JUDGMENT, Difficulty.EASY, {
            correctCount: currentTotalCorrect,
            totalCount: 10,
            startTime: sessionStartTime,
            endTime
          }, CollectionCategory.EMOTION);
          
          addMessage({
            taskNumber: `SN-${endTime.toString().slice(-6)}`,
            username: stats.username,
            startTime: sessionStartTime,
            duration: Math.round((endTime - sessionStartTime) / 1000),
            type: TaskType.QUICK_JUDGMENT,
            difficulty: Difficulty.EASY,
            category: '情绪快判',
            accuracy: `${currentTotalCorrect}/10`,
            score: currentTotalScore
          }, 'agent', 'task-report');

          setWorkflowState('IDLE');
          setEmotionTaskState({ index: 0, subStep: 0, currentAnswers: [] });
          setTimeout(() => addMessage({}, 'agent', 'task-type-select'), 1500);
        } else {
          // Proceed to next item
          setEmotionTaskState({ index: nextItemIndex, subStep: 0, currentAnswers: [] });
          setTimeout(() => {
            const nextText = EMOTION_TEXTS[nextItemIndex];
            addMessage(`[任务 ${nextItemIndex + 1}/10] 下一条文本：\n\n"${nextText}"`, 'agent');
            setTimeout(() => {
              addMessage(getEmotionPrompt(0), 'agent');
            }, 800);
          }, 1200);
        }
      }, 600);
    } else {
      // Same item, next sub-step
      setEmotionTaskState({ index, subStep: nextStepIndex, currentAnswers: newAnswers });
      setTimeout(() => {
        addMessage(getEmotionPrompt(nextStepIndex), 'agent');
      }, 600);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isTyping) return;
    
    // During active collection task or selection flows, handle input based on state
    if (activeTask && !workflowState.includes('EMOTION')) {
      // TaskFlow is handling its own UI, but chat input might still trigger
      return; 
    }

    const val = userInput.trim();
    setUserInput('');

    if (workflowState === 'EMOTION_LOOP') {
      processEmotionInput(val);
      return;
    }

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
      setTempConfig(prev => ({ ...prev, currentLabel: val }));
      const mediaType = tempConfig?.mediaType || activeTask?.mediaType;
      const actionText = mediaType === 'IMAGE' ? '相册上传或者拍摄图片上传' : mediaType === 'AUDIO' ? '录制音频上传' : '录制视频上传';
      addMessage(`好的，当前标注内容为：【${val}】。现在请${actionText}。`, 'agent');
      
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
      addMessage(response.text || "抱歉，我无法理解您的指令。请使用功能按钮进行操作。", 'agent');
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
        setTimeout(() => addMessage({ taskType: data }, 'agent', 'media-type-select'), 400);
        break;
      case 'SELECT_MEDIA':
        const taskType = messages[messages.length-1].payload.taskType;
        addMessage(`文件类型：${data === 'IMAGE' ? '图片' : data === 'AUDIO' ? '音频' : data === 'VIDEO' ? '视频' : '文本'}`, 'user');
        if (taskType === TaskType.QUICK_JUDGMENT && data === 'TEXT') {
           addMessage("准备开始情绪快判任务。我们将通过对话方式完成数据标注。", 'agent');
        }
        setTimeout(() => addMessage({ taskType, mediaType: data }, 'agent', 'difficulty-select'), 400);
        break;
      case 'SELECT_DIFFICULTY':
        addMessage(`难度：${data}`, 'user');
        const prevPayload = messages[messages.length-1].payload;
        if (data === '自定义') {
          setWorkflowState('AWAITING_CLASSIFICATION');
          setTempConfig({ taskType: TaskType.COLLECTION, mediaType: prevPayload.mediaType });
          setTimeout(() => addMessage("请输入采集分类", 'agent'), 400);
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
        category: c || (activeTask?.mediaType === 'TEXT' ? CollectionCategory.EMOTION : undefined),
        accuracy: `${performance.correctCount}/${performance.totalCount}`,
        score
      }, 'agent', 'task-report');
      
      setActiveTask(null);
      setTimeout(() => addMessage({}, 'agent', 'task-type-select'), 1500);
      return;
    }

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
    const disabled = isTaskActive || (workflowState !== 'IDLE') || !isLast;
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
      case 'media-type-select': 
        const isQuick = msg.payload.taskType === TaskType.QUICK_JUDGMENT;
        return (
          <div className="space-y-2 mt-2">
            {isQuick ? (
              <>
                <button disabled={disabled} onClick={() => handleAction('SELECT_MEDIA', 'IMAGE')} className={btnClass + "bg-white border-2 border-gray-100 text-gray-700"}>图片</button>
                <button disabled={disabled} onClick={() => handleAction('SELECT_MEDIA', 'TEXT')} className={btnClass + "bg-white border-2 border-gray-100 text-gray-700"}>文本</button>
              </>
            ) : (
              ['IMAGE', 'AUDIO', 'VIDEO'].map(t => (
                <button key={t} disabled={disabled} onClick={() => handleAction('SELECT_MEDIA', t)} className={btnClass + "bg-white border-2 border-gray-100 text-gray-700"}>{t === 'IMAGE' ? '图片' : t === 'AUDIO' ? '音频' : '视频'}</button>
              ))
            )}
            <button disabled={disabled} onClick={() => handleAction('GO_BACK', 'task-type-select')} className="w-full py-2 text-xs font-black text-gray-400 uppercase tracking-widest mt-2">↩️ 返回上一层</button>
          </div>
        );
      case 'difficulty-select':
        const media = msg.payload.mediaType;
        const isEmotion = msg.payload.taskType === TaskType.QUICK_JUDGMENT && media === 'TEXT';
        return (
          <div className="space-y-2 mt-2">
            {isEmotion ? (
              <button disabled={disabled} onClick={() => handleAction('SELECT_DIFFICULTY', Difficulty.EASY)} className={btnClass + "bg-white border-2 border-blue-50 text-blue-600"}>{Difficulty.EASY}</button>
            ) : (
              [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD, '自定义'].filter(d => msg.payload.taskType === TaskType.COLLECTION || d !== '自定义').map(d => (
                <button key={d} disabled={disabled} onClick={() => handleAction('SELECT_DIFFICULTY', d)} className={btnClass + "bg-white border-2 border-blue-50 text-blue-600"}>{d}</button>
              ))
            )}
            <button disabled={disabled} onClick={() => handleAction('GO_BACK', 'media-type-select')} className="w-full py-2 text-xs font-black text-gray-400 uppercase tracking-widest mt-2">↩️ 返回上一层</button>
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
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl w-full text-sm animate-in zoom-in duration-300">
            <h4 className="font-black text-gray-900 text-xl mb-4 text-center border-b pb-2">任务报告</h4>
            <div className="space-y-2.5 mb-6">
              <div className="flex justify-between"><span className="text-gray-400 font-bold">用户名</span><span className="font-black">{r.username}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务ID</span><span className="font-mono">{r.taskNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务类型</span><span className="font-black">{r.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务级别</span><span className="font-black text-blue-600">{r.difficulty}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">开始时间</span><span className="font-black text-gray-600">{new Date(r.startTime).toLocaleTimeString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务耗时</span><span className="font-black text-indigo-600">{r.duration}s</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">任务准确率</span><span className="font-black text-lg text-emerald-600">{r.accuracy}</span></div>
              {r.category && <div className="flex justify-between"><span className="text-gray-400 font-bold">任务分类</span><span className="font-black text-amber-600">{r.category}</span></div>}
            </div>
            <div className="bg-blue-600 p-4 rounded-2xl text-white text-center shadow-lg">
              <span className="text-2xl font-black">+{r.score} PTS</span>
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
            <div className={`max-w-[85%] ${msg.sender === 'agent' ? (msg.type === 'text') ? 'bg-white text-gray-800 rounded-3xl rounded-tl-sm shadow-md border border-gray-50 p-4' : 'w-full' : 'bg-blue-600 text-white rounded-3xl rounded-tr-sm shadow-xl p-4 font-black'}`}>
              {msg.type === 'text' && msg.sender === 'agent' && idx === messages.length - 1 ? <Typewriter text={msg.payload} /> : 
               msg.type === 'text' ? <div className="whitespace-pre-wrap leading-relaxed font-semibold text-gray-800">{msg.payload}</div> : null}
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
                   addMessage(`任务已退出。您可以继续输入或选择其他任务。`, 'agent');
                }
              }} 
            />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {!activeTask && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex flex-col">
          {workflowState !== 'IDLE' && (
            <div className="flex justify-end mb-2 px-1">
              <button 
                onClick={() => handleAction('GO_BACK', 'media-type-select')}
                className="flex items-center space-x-1.5 py-1.5 px-4 bg-white border-2 border-gray-100 rounded-full text-[11px] font-black text-blue-600 shadow-sm active:scale-95 transition-all"
              >
                <span>↩️ 返回并重新选择</span>
              </button>
            </div>
          )}
          <div className="flex space-x-2">
            <input 
              type="text" 
              placeholder={
                workflowState === 'AWAITING_CLASSIFICATION' ? "请输入本次采集任务的分类..." :
                workflowState === 'AWAITING_LABELS' ? "请输入当前题目的标注内容..." :
                workflowState === 'EMOTION_LOOP' ? "请输入 1, 2, 3 或文字..." :
                "输入内容并发送..."
              } 
              className={`flex-1 px-4 py-3.5 ${workflowState !== 'IDLE' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-200'} border rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button 
              onClick={handleSendMessage}
              disabled={!userInput.trim() || isTyping}
              className={`w-14 h-14 ${workflowState !== 'IDLE' ? 'bg-blue-600 animate-pulse' : 'bg-blue-600'} rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-all disabled:opacity-50`}
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
