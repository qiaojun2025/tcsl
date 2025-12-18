
import React, { useState, useEffect, useRef } from 'react';
import { Difficulty, TaskType, UserStats, CollectionCategory } from '../types.ts';
import TaskFlow from './TaskFlow.tsx';

interface Message {
  id: string;
  sender: 'agent' | 'user';
  type: 'text' | 'task-type-select' | 'category-select' | 'difficulty-select' | 'stats-report' | 'task-report';
  payload: any;
  timestamp: number;
}

interface ChatInterfaceProps {
  stats: UserStats;
  onBack: () => void;
  onUpdateStats: (score: number, type: TaskType, difficulty: Difficulty, category?: CollectionCategory) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ stats, onBack, onUpdateStats }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTask, setActiveTask] = useState<{type: TaskType, category?: CollectionCategory, difficulty: Difficulty} | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initial sequence
  useEffect(() => {
    const welcomeId = Date.now().toString();
    const welcomeMsg: Message = {
      id: welcomeId,
      sender: 'agent',
      type: 'text',
      payload: "你好！欢迎来到 Web3 任务中心。我是您的任务导引 Agent。在这里，您可以多次完成任务来累积社区贡献度。我们已取消每日次数限制，欢迎持续贡献数据！",
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
    addMessage(`我想执行【${type}】`, 'user');
    if (type === TaskType.QUICK_JUDGMENT) {
      setTimeout(() => addMessage({ taskType: type }, 'agent', 'difficulty-select'), 400);
    } else {
      // Skip category select and go directly to difficulty for collection tasks
      setTimeout(() => addMessage({ taskType: type, category: CollectionCategory.IMAGE }, 'agent', 'difficulty-select'), 400);
    }
  };

  const handleSelectDifficulty = (type: TaskType, difficulty: Difficulty, category?: CollectionCategory) => {
    addMessage(`选择难度：${difficulty}`, 'user');
    setTimeout(() => {
      addMessage("好的，正在为您匹配校验节点。任务即将开始：", 'agent', 'text');
      setActiveTask({ type, difficulty, category: category || CollectionCategory.IMAGE });
    }, 400);
  };

  const handleStepFeedback = (isCorrect: boolean, points: number, choiceLabel?: string) => {
    if (choiceLabel) {
      addMessage(choiceLabel, 'user', 'text');
    }
    setTimeout(() => {
      if (isCorrect) {
        addMessage(`✅ 校验通过！贡献度 +${points}`, 'agent', 'text');
      } else {
        addMessage("❌ 校验不匹配，此题无贡献度. 继续下一项。", 'agent', 'text');
      }
    }, 100);
  };

  const handleTaskComplete = (score: number, type: TaskType, details: string) => {
    if (activeTask) {
      onUpdateStats(score, type, activeTask.difficulty, activeTask.category);
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
      addMessage("任务圆满结束。数据已提交至去中心化网络进行最终存证。", 'agent', 'text');
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

  const renderMessageContent = (msg: Message) => {
    switch (msg.type) {
      case 'text':
        return <p className="leading-relaxed">{msg.payload}</p>;
      
      case 'task-type-select':
        return (
          <div className="space-y-3 mt-1">
            <p className="text-gray-600 mb-2">请选择任务类型：</p>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => handleSelectTaskType(TaskType.QUICK_JUDGMENT)} className="w-full py-3 rounded-xl font-bold shadow-sm text-left px-4 flex justify-between items-center transition-all bg-blue-600 text-white active:bg-blue-700">
                <span>🎯 快判任务</span>
                <span className="text-[10px] font-normal opacity-80 text-white">图片识别</span>
              </button>
              <button onClick={() => handleSelectTaskType(TaskType.COLLECTION)} className="w-full py-3 rounded-xl font-bold shadow-sm text-left px-4 flex justify-between items-center transition-all bg-green-600 text-white active:bg-green-700">
                <span>📸 采集任务</span>
                <span className="text-[10px] font-normal opacity-80 text-white">图片采集</span>
              </button>
              <button onClick={showStats} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-sm active:bg-indigo-700 text-left px-4 flex justify-between items-center">
                <span>📈 我的统计</span>
                <span className="text-[10px] font-normal opacity-80">贡献概览</span>
              </button>
            </div>
          </div>
        );

      case 'difficulty-select':
        const { taskType, category } = msg.payload;
        return (
          <div className="space-y-3 mt-1">
            <p className="text-gray-600 mb-2">请选择难度级别：</p>
            <div className="grid grid-cols-1 gap-2">
              {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map(d => (
                <button key={d} onClick={() => handleSelectDifficulty(taskType, d, category)} className="w-full py-3 rounded-xl font-bold text-sm transition-all border flex justify-between items-center px-4 bg-white text-blue-600 border-blue-100 hover:bg-blue-50 active:bg-blue-100">
                  <span>{d}</span>
                  <span className="text-[9px] text-gray-400">贡献度加成</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'task-report':
        const { username, type, score, timestamp } = msg.payload;
        return (
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-blue-800">任务日报 📋</h4>
              <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">已同步</span>
            </div>
            <div className="space-y-1 text-[11px] text-gray-500">
              <p>贡献者: {username}</p>
              <p>时间: {new Date(timestamp).toLocaleString()}</p>
              <p>任务类型: {type}</p>
              <p className="text-sm font-bold text-gray-800 pt-2 border-t mt-2 flex justify-between">
                <span>本次贡献得分:</span>
                <span className="text-green-600">+{score}</span>
              </p>
            </div>
          </div>
        );

      case 'stats-report':
        const s = msg.payload;
        return (
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm w-full">
            <h4 className="font-bold text-indigo-900 mb-3 flex items-center">
              <span className="mr-2 text-indigo-500">📈</span> 个人贡献统计
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[10px] text-indigo-400 mb-2">
                <span>用户 UID: {s.userId.slice(-8)}</span>
                <span>{new Date(s.reportTimestamp).toLocaleDateString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded-lg border border-indigo-100">
                  <p className="text-[9px] text-gray-400 uppercase">快判完成</p>
                  <p className="text-sm font-bold text-gray-800">{s.quickCount} 次</p>
                  <p className="text-[10px] text-green-600 font-medium">+{s.quickScore} 分</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-indigo-100">
                  <p className="text-[9px] text-gray-400 uppercase">采集完成</p>
                  <p className="text-sm font-bold text-gray-800">{s.collectionCount} 次</p>
                  <p className="text-[10px] text-green-600 font-medium">+{s.collectionScore} 分</p>
                </div>
              </div>
              <div className="pt-3 border-t border-indigo-200 flex justify-between items-center">
                <span className="text-indigo-900 font-bold">累计总贡献度</span>
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
        <button onClick={onBack} className="p-2 text-blue-600 -ml-2 rounded-full active:bg-blue-50 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="ml-2 flex flex-col justify-center">
          <h2 className="font-bold text-gray-900 text-sm leading-none">任务中心</h2>
          <span className="text-[10px] text-green-500 font-medium mt-1">AI 数据引擎 在线</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-10">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
              <div className="text-sm">{renderMessageContent(msg)}</div>
            </div>
          </div>
        ))}

        {activeTask && (
          <div className="mt-4 animate-in slide-in-from-bottom-4 duration-300">
            <TaskFlow 
              type={activeTask.type} 
              category={activeTask.category}
              difficulty={activeTask.difficulty} 
              onStepFeedback={handleStepFeedback} 
              onComplete={handleTaskComplete} 
              onCancel={handleTaskCancel} 
            />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-50 p-2 text-center">
         <p className="text-[10px] text-gray-400 font-medium">分布式验证协议 • Powered by Web3 AI</p>
      </div>
    </div>
  );
};

export default ChatInterface;
