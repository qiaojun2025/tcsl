
import React, { useState, useEffect, useRef } from 'react';
import { Difficulty, TaskType, UserStats } from '../types.ts';
import TaskFlow from './TaskFlow.tsx';

interface Message {
  id: string;
  sender: 'agent' | 'user';
  type: 'text' | 'task-type-select' | 'difficulty-select' | 'stats-report' | 'task-report';
  payload: any;
  timestamp: number;
}

interface ChatInterfaceProps {
  stats: UserStats;
  onBack: () => void;
  onUpdateStats: (score: number, type: TaskType, difficulty: Difficulty) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ stats, onBack, onUpdateStats }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTask, setActiveTask] = useState<{type: TaskType, difficulty: Difficulty} | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isCompletedToday = (type: TaskType, difficulty: Difficulty) => {
    const key = `${type}_${difficulty}`;
    const timestamp = stats.completions[key];
    if (!timestamp) return false;
    
    const date = new Date(timestamp);
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isAllDifficultyDone = (type: TaskType) => {
    return [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].every(d => isCompletedToday(type, d));
  };

  // Initial sequence
  useEffect(() => {
    const welcomeId = Date.now().toString();
    const welcomeMsg: Message = {
      id: welcomeId,
      sender: 'agent',
      type: 'text',
      payload: "嘿！我是你的任务中心 Agent。我负责协调 Web3 社区的任务分发与数据校验。请注意，为了保证数据多样性，每种任务的每个难度级别每日仅限完成一次。",
      timestamp: Date.now(),
    };
    
    setMessages([welcomeMsg]);
    
    // Show task type options after a short delay
    setTimeout(() => {
      addMessage("", 'agent', 'task-type-select');
    }, 600);
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
    if (isAllDifficultyDone(type)) {
      addMessage(`我想执行【${type}】`, 'user');
      setTimeout(() => {
        addMessage(`抱歉，你今天已经完成了【${type}】的所有难度级别。请明天再来尝试，或者去看看其他任务吧！`, 'agent', 'text');
        setTimeout(() => addMessage("", 'agent', 'task-type-select'), 600);
      }, 400);
      return;
    }

    addMessage(`我想执行【${type}】`, 'user');
    setTimeout(() => {
      addMessage({ taskType: type }, 'agent', 'difficulty-select');
    }, 400);
  };

  const handleSelectDifficulty = (type: TaskType, difficulty: Difficulty) => {
    if (isCompletedToday(type, difficulty)) {
      addMessage(`选择难度：${difficulty}`, 'user');
      setTimeout(() => {
        addMessage(`该任务的【${difficulty}】级别今日已完成，请选择其他难度。`, 'agent', 'text');
        setTimeout(() => addMessage({ taskType: type }, 'agent', 'difficulty-select'), 600);
      }, 400);
      return;
    }

    addMessage(`选择难度：${difficulty}`, 'user');
    setTimeout(() => {
      addMessage("好的，任务即刻开始，请根据下方指令操作：", 'agent', 'text');
      setActiveTask({ type, difficulty });
    }, 400);
  };

  const handleStepFeedback = (isCorrect: boolean, points: number, choiceLabel?: string) => {
    if (choiceLabel) {
      addMessage(choiceLabel, 'user', 'text');
    }
    setTimeout(() => {
      if (isCorrect) {
        addMessage(`✅ 回答正确！贡献度 +${points}`, 'agent', 'text');
      } else {
        addMessage("❌ 判定不符，该项不得分。请继续下一题。", 'agent', 'text');
      }
    }, 100);
  };

  const handleTaskComplete = (score: number, type: TaskType, details: string) => {
    if (activeTask) {
      onUpdateStats(score, type, activeTask.difficulty);
    }
    setActiveTask(null);

    const reportData = {
      username: stats.username,
      timestamp: Date.now(),
      type: type,
      score: score,
      details: details
    };
    
    addMessage(reportData, 'agent', 'task-report');
    
    setTimeout(() => {
      addMessage("任务已圆满结束。该难度的任务今日已关闭，明天见！", 'agent', 'text');
      addMessage("", 'agent', 'task-type-select');
    }, 600);
  };

  const handleTaskCancel = () => {
    setActiveTask(null);
    addMessage("已取消当前任务。", 'agent', 'text');
    addMessage("", 'agent', 'task-type-select');
  };

  const showStats = () => {
    addMessage("查看我的统计", 'user', 'text');
    setTimeout(() => {
      addMessage({ ...stats, reportTimestamp: Date.now() }, 'agent', 'stats-report');
      setTimeout(() => addMessage("", 'agent', 'task-type-select'), 600);
    }, 400);
  };

  // Rendering Helpers
  const renderMessageContent = (msg: Message) => {
    switch (msg.type) {
      case 'text':
        return <p className="leading-relaxed">{msg.payload}</p>;
      
      case 'task-type-select':
        const quickAllDone = isAllDifficultyDone(TaskType.QUICK_JUDGMENT);
        const collAllDone = isAllDifficultyDone(TaskType.COLLECTION);
        return (
          <div className="space-y-3 mt-1">
            <p className="text-gray-600 mb-2">请选择你想要执行的任务类型：</p>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => handleSelectTaskType(TaskType.QUICK_JUDGMENT)}
                className={`w-full py-3 rounded-xl font-bold shadow-sm text-left px-4 flex justify-between items-center transition-all ${
                  quickAllDone ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-70' : 'bg-blue-600 text-white active:bg-blue-700'
                }`}
              >
                <span className="flex items-center">
                  <span>🎯 快判任务</span>
                  {quickAllDone && <span className="ml-2 text-[10px] bg-gray-400 text-white px-1.5 py-0.5 rounded">今日额度已满</span>}
                </span>
                <span className="text-[10px] font-normal opacity-80">图片识别</span>
              </button>
              <button 
                onClick={() => handleSelectTaskType(TaskType.COLLECTION)}
                className={`w-full py-3 rounded-xl font-bold shadow-sm text-left px-4 flex justify-between items-center transition-all ${
                  collAllDone ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-70' : 'bg-green-600 text-white active:bg-green-700'
                }`}
              >
                <span className="flex items-center">
                  <span>📸 采集任务</span>
                  {collAllDone && <span className="ml-2 text-[10px] bg-gray-400 text-white px-1.5 py-0.5 rounded">今日额度已满</span>}
                </span>
                <span className="text-[10px] font-normal opacity-80">实地拍摄</span>
              </button>
              <button 
                onClick={showStats}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-sm active:bg-indigo-700 text-left px-4 flex justify-between items-center"
              >
                <span>📈 我的统计</span>
                <span className="text-[10px] font-normal opacity-80">贡献概览</span>
              </button>
            </div>
          </div>
        );

      case 'difficulty-select':
        const t = msg.payload.taskType as TaskType;
        return (
          <div className="space-y-3 mt-1">
            <p className="text-gray-600 mb-2">请选择任务难度级别：</p>
            <div className="grid grid-cols-1 gap-2">
              {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map(d => {
                const done = isCompletedToday(t, d);
                return (
                  <button 
                    key={d}
                    disabled={done}
                    onClick={() => handleSelectDifficulty(t, d)}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all border flex justify-between items-center px-4 ${
                      done 
                        ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60' 
                        : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50 active:bg-blue-100'
                    }`}
                  >
                    <span>{d}</span>
                    {done ? (
                      <span className="text-[9px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded">今日已完成</span>
                    ) : (
                      <span className="text-[9px] text-gray-400">贡献度加成</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'task-report':
        const { username, type, score, details, timestamp } = msg.payload;
        return (
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-blue-800">任务日报 📋</h4>
              <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">COMPLETED</span>
            </div>
            <div className="space-y-1 text-[11px] text-gray-500">
              <p>用户: {username}</p>
              <p>时间: {new Date(timestamp).toLocaleString()}</p>
              <p>类型: {type}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-sm font-bold flex justify-between text-gray-800">
                <span>本次任务贡献度:</span>
                <span className="text-green-600">+{score}</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-2 italic leading-tight">{details}</p>
            </div>
          </div>
        );

      case 'stats-report':
        const s = msg.payload;
        return (
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm w-full">
            <h4 className="font-bold text-indigo-900 text-base mb-3 flex items-center">
                <span className="mr-2">📈</span> 个人贡献全量统计
            </h4>
            <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                    <span className="text-indigo-700">用户名称:</span>
                    <span className="font-bold text-gray-700">{s.username}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-indigo-700">用户 ID:</span>
                    <span className="font-mono text-gray-500 text-[10px]">{s.userId}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-indigo-700">统计时间:</span>
                    <span className="text-gray-500">{new Date(s.reportTimestamp).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-200">
                    <div className="bg-white/50 p-2 rounded-lg">
                        <p className="text-[9px] text-indigo-500 uppercase">快判任务</p>
                        <p className="text-sm font-bold">{s.quickCount} 次</p>
                        <p className="text-[10px] text-green-600">+{s.quickScore} 分</p>
                    </div>
                    <div className="bg-white/50 p-2 rounded-lg">
                        <p className="text-[9px] text-indigo-500 uppercase">采集任务</p>
                        <p className="text-sm font-bold">{s.collectionCount} 次</p>
                        <p className="text-[10px] text-green-600">+{s.collectionScore} 分</p>
                    </div>
                </div>
                <div className="pt-3 border-t border-indigo-200 flex justify-between items-center">
                    <span className="text-indigo-900 font-bold">总任务贡献度</span>
                    <span className="text-2xl font-black text-indigo-600">{s.totalScore}</span>
                </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-40 px-4 h-16 flex items-center border-b border-gray-100 shadow-sm">
        <button onClick={onBack} className="p-2 text-blue-600 -ml-2 active:bg-blue-50 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="ml-2 flex items-center">
            <div className="w-9 h-9 rounded-xl agent-gradient-4 flex items-center justify-center text-white text-lg mr-3 shadow-md">🎯</div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm leading-none">任务中心</h2>
              <p className="text-[10px] text-green-500 font-medium mt-1 flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                AI Agent 在线
              </p>
            </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-10">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'agent' && (
              <div className="w-8 h-8 rounded-lg agent-gradient-4 flex-shrink-0 flex items-center justify-center text-[10px] text-white mr-2 mt-1 shadow-sm">
                AI
              </div>
            )}
            <div className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm relative ${
              msg.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
            }`}>
              <div className={`${msg.sender === 'user' ? 'text-sm font-medium' : 'text-sm'}`}>
                {renderMessageContent(msg)}
              </div>
              <div className={`text-[8px] mt-1.5 opacity-40 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {/* Active Task UI */}
        {activeTask && (
          <div className="mt-2 animate-in slide-in-from-bottom-4 duration-300">
             <TaskFlow 
                type={activeTask.type} 
                difficulty={activeTask.difficulty} 
                onStepFeedback={handleStepFeedback}
                onComplete={handleTaskComplete}
                onCancel={handleTaskCancel}
              />
          </div>
        )}
        
        <div ref={chatEndRef} className="h-4 w-full" />
      </div>

      {/* Footer */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-50 p-2 text-center">
         <p className="text-[10px] text-gray-400 font-medium tracking-tight">对话由 Web3 AI 驱动，数据经由去中心化验证</p>
      </div>
    </div>
  );
};

export default ChatInterface;
