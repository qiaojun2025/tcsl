
import React, { useState, useEffect, useCallback } from 'react';
import { TaskType, Difficulty } from '../types';
import { detectImage, getPlaceholderImage, getRandomCategory, CATEGORIES } from '../services/imageRecognition';

interface TaskFlowProps {
  type: TaskType;
  difficulty: Difficulty;
  onStepFeedback?: (isCorrect: boolean, points: number, choiceLabel?: string) => void;
  onComplete: (score: number, type: TaskType, details: string) => void;
  onCancel: () => void;
}

const COLORS = ['白色的', '黑色的', '棕色的'];
const BEHAVIORS = ['正在吃东西', '正在奔跑', '正在睡觉', '正在玩耍'];

const CATEGORY_MAP: Record<string, string> = {
  'dog': '狗', 'cat': '猫', 'car': '汽车', 'person': '人', 'bicycle': '自行车', 
  'motorcycle': '摩托车', 'bird': '鸟', 'bottle': '瓶子', 'chair': '椅子', 'laptop': '笔记本电脑'
};

const TaskFlow: React.FC<TaskFlowProps> = ({ type, difficulty, onStepFeedback, onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [totalSteps] = useState(10);
  const [score, setScore] = useState(0);
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'skipped' | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);

  const getPointsPerTask = () => {
    if (type === TaskType.QUICK_JUDGMENT) {
      if (difficulty === Difficulty.EASY) return 1;
      if (difficulty === Difficulty.MEDIUM) return 3;
      return 6;
    } else {
      if (difficulty === Difficulty.EASY) return 2;
      if (difficulty === Difficulty.MEDIUM) return 4;
      return 8;
    }
  };

  const generateNewTask = useCallback(() => {
    setIsLoading(true);
    setFeedback(null);
    setSelectedIds([]);
    setShowAnswers(false);
    
    let target = getRandomCategory();
    
    if (type === TaskType.COLLECTION && difficulty === Difficulty.HARD) {
      const animals = ['dog', 'cat', 'bird'];
      target = animals[Math.floor(Math.random() * animals.length)];
    }
    
    const targetZh = CATEGORY_MAP[target] || target;

    if (type === TaskType.QUICK_JUDGMENT) {
      if (difficulty === Difficulty.EASY) {
        const other = CATEGORIES.filter(c => c !== target)[Math.floor(Math.random() * (CATEGORIES.length - 1))];
        setCurrentTask({
          title: '请识别下图中的物品',
          target,
          targetZh,
          imageUrl: getPlaceholderImage(target),
          options: [
            { id: target, label: targetZh },
            { id: other, label: CATEGORY_MAP[other] || other }
          ].sort(() => Math.random() - 0.5)
        });
      } else if (difficulty === Difficulty.MEDIUM) {
        const isNegative = Math.random() > 0.5;
        const displayTitle = isNegative ? `请选择：不是 ${targetZh} 的图片` : `请选择：包含 ${targetZh} 的图片`;
        const images = [
            { url: getPlaceholderImage(target), category: target },
            { url: getPlaceholderImage(target), category: target },
            { url: getPlaceholderImage('bird'), category: 'bird' }
        ].sort(() => Math.random() - 0.5);
        
        setCurrentTask({
          title: displayTitle,
          isNegative,
          targetCategory: target,
          images
        });
      } else {
        setTimeLeft(8);
        const images = Array.from({ length: 6 }).map((_, i) => {
            const isTarget = i < 3; 
            const cat = isTarget ? target : getRandomCategory();
            return { url: getPlaceholderImage(cat), category: cat, id: i };
        }).sort(() => Math.random() - 0.5);

        setCurrentTask({
          title: `请在8秒内找出所有: ${targetZh}`,
          target,
          targetZh,
          images
        });
      }
    } else {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const behavior = BEHAVIORS[Math.floor(Math.random() * BEHAVIORS.length)];
      
      let title = '';
      if (difficulty === Difficulty.EASY) title = `任务：采集一张 [${color}${targetZh}]`;
      else if (difficulty === Difficulty.MEDIUM) title = `任务：采集附近的一张 [${color}${targetZh}]`;
      else title = `任务：30分钟内采集附近一张 [${color}${targetZh}${behavior}]`;

      setCurrentTask({ 
        title,
        target, 
        targetZh,
        color,
        behavior
      });
    }
    
    setTimeout(() => setIsLoading(false), 500);
  }, [type, difficulty]);

  useEffect(() => {
    generateNewTask();
  }, [generateNewTask]);

  useEffect(() => {
    let timer: any;
    if (difficulty === Difficulty.HARD && type === TaskType.QUICK_JUDGMENT && timeLeft > 0 && !feedback) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && difficulty === Difficulty.HARD && type === TaskType.QUICK_JUDGMENT && !feedback && currentTask) {
      handleHardSubmit();
    }
    return () => clearInterval(timer);
  }, [timeLeft, feedback, currentTask]);

  const processChoice = (isCorrect: boolean | 'skipped', choiceLabel?: string) => {
    if (feedback) return; 
    
    if (isCorrect === 'skipped') {
      setFeedback('skipped');
    } else {
      setFeedback(isCorrect ? 'correct' : 'wrong');
    }
    
    const points = isCorrect === true ? getPointsPerTask() : 0;
    
    if (onStepFeedback) {
      const label = choiceLabel || (isCorrect === 'skipped' ? '跳过了此题' : '做出了选择');
      onStepFeedback(isCorrect === true, points, `第 ${step} 题：${label}`);
    }
    
    // Increase delay if wrong on hard to show answers
    const delay = (isCorrect === false && difficulty === Difficulty.HARD) ? 2500 : 1000;

    setTimeout(() => {
      const newScore = score + points;
      setScore(newScore);
      
      if (step < totalSteps) {
        setStep(prev => prev + 1);
        generateNewTask();
      } else {
        onComplete(newScore, type, `完成${totalSteps}道题目，难度：${difficulty}`);
      }
    }, delay);
  };

  const handleHardSubmit = () => {
    if (!currentTask) return;
    const correctIds = currentTask.images
      .filter((img: any) => img.category === currentTask.target)
      .map((img: any) => img.id);
    
    const isCorrect = correctIds.length === selectedIds.length && 
                      correctIds.every((id: number) => selectedIds.includes(id));
    
    if (!isCorrect) {
      setShowAnswers(true);
    }
    
    processChoice(isCorrect, `选择了 ${selectedIds.length} 张图片`);
  };

  const toggleSelect = (id: number) => {
    if (feedback) return;
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    
    const predictions = await detectImage(img);
    const found = predictions.some((p: any) => p.class === currentTask.target);
    
    setIsLoading(false);
    processChoice(found, '上传了图片并进行 AI 识别');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-gray-100 min-h-[200px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 text-sm">AI 正在处理数据...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-lg w-full relative overflow-hidden">
      {feedback && (
        <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 ${
          feedback === 'correct' ? 'bg-green-500/90' : 
          feedback === 'wrong' ? (showAnswers ? 'bg-red-500/40' : 'bg-red-500/90') : 'bg-gray-500/90'
        }`}>
          <div className="bg-white rounded-full p-4 mb-2 shadow-xl">
             {feedback === 'correct' ? (
               <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
             ) : feedback === 'wrong' ? (
               <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
             ) : (
               <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
             )}
          </div>
          <p className="text-white font-black text-2xl tracking-widest drop-shadow-md">
            {feedback === 'correct' ? '正确' : feedback === 'wrong' ? '错误' : '已跳过'}
          </p>
          {feedback === 'wrong' && showAnswers && (
            <p className="text-white font-bold mt-1 drop-shadow-sm text-sm">正确答案已为您标出</p>
          )}
          {feedback === 'correct' && (
            <p className="text-white font-bold mt-1">贡献度 +{getPointsPerTask()}</p>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">第 {step}/{totalSteps} 题</span>
        {difficulty === Difficulty.HARD && type === TaskType.QUICK_JUDGMENT && (
          <span className={`text-xs font-bold px-2 py-1 rounded ${timeLeft < 2 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-orange-50 text-orange-600'}`}>
            倒计时: {timeLeft}s
          </span>
        )}
        <button onClick={onCancel} className="text-gray-400 text-xs">退出任务</button>
      </div>

      {currentTask && (
        <div className="space-y-4">
          <p className="text-gray-800 font-bold text-center text-lg px-2 leading-snug">
            {currentTask.title}
          </p>
          
          {type === TaskType.QUICK_JUDGMENT ? (
            <div className="space-y-4">
              {difficulty === Difficulty.EASY && (
                <div className="flex flex-col items-center">
                    <img src={currentTask.imageUrl} className="w-full h-48 object-cover rounded-xl mb-4" alt="task" />
                    <div className="grid grid-cols-2 gap-3 w-full">
                        {currentTask.options.map((opt: any) => (
                            <button 
                                key={opt.id}
                                disabled={!!feedback}
                                onClick={() => processChoice(opt.id === currentTask.target, `选择了 ${opt.label}`)}
                                className="bg-blue-50 text-blue-700 font-bold py-3 rounded-xl active:bg-blue-100 capitalize disabled:opacity-50"
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
              )}

              {difficulty === Difficulty.MEDIUM && (
                 <div className="grid grid-cols-3 gap-2">
                    {currentTask.images.map((img: any, idx: number) => (
                        <img 
                            key={idx}
                            src={img.url}
                            onClick={() => {
                                const isMatch = img.category === currentTask.targetCategory;
                                const isCorrect = currentTask.isNegative ? !isMatch : isMatch;
                                processChoice(isCorrect, `选择了${CATEGORY_MAP[img.category] || img.category}图片`);
                            }}
                            className={`w-full h-24 object-cover rounded-lg active:ring-2 active:ring-blue-500 ${feedback ? 'pointer-events-none' : ''}`}
                            alt="option"
                        />
                    ))}
                 </div>
              )}

              {difficulty === Difficulty.HARD && (
                 <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                        {currentTask.images.map((img: any) => {
                            const isTarget = img.category === currentTask.target;
                            const isSelected = selectedIds.includes(img.id);
                            
                            let ringClass = '';
                            let opacityClass = '';
                            
                            if (showAnswers) {
                              if (isTarget) {
                                ringClass = 'ring-4 ring-green-500 scale-95 z-10';
                              } else if (isSelected) {
                                ringClass = 'ring-4 ring-red-500 scale-95 opacity-70';
                              } else {
                                opacityClass = 'opacity-30';
                              }
                            } else if (isSelected) {
                              ringClass = 'ring-4 ring-blue-500 scale-95';
                            }

                            return (
                                <div 
                                  key={img.id} 
                                  onClick={() => toggleSelect(img.id)}
                                  className={`relative w-full h-24 rounded-lg overflow-hidden cursor-pointer transition-all ${ringClass} ${opacityClass} ${!showAnswers ? 'active:scale-95' : ''}`}
                                >
                                    <img src={img.url} className="w-full h-full object-cover" alt="option" />
                                    {isSelected && !showAnswers && (
                                        <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5 shadow-md">
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    )}
                                    {showAnswers && isTarget && (
                                        <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5 shadow-md">
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <button 
                      onClick={handleHardSubmit}
                      disabled={!!feedback || selectedIds.length === 0}
                      className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold active:bg-blue-700 shadow-md disabled:opacity-50"
                    >
                      确认选择 ({selectedIds.length})
                    </button>
                 </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-3xl mb-2">📸</div>
                
                <div className="w-full space-y-3">
                  <label className={`w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center cursor-pointer active:bg-blue-700 shadow-md ${feedback ? 'pointer-events-none opacity-50' : ''}`}>
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {difficulty === Difficulty.HARD ? '立即实拍' : '从相册上传'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture={difficulty === Difficulty.HARD ? 'environment' : undefined} 
                        className="hidden" 
                        onChange={handleFileUpload} 
                      />
                  </label>

                  <button 
                    onClick={() => processChoice('skipped', '跳过了此项')}
                    disabled={!!feedback}
                    className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm active:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    跳过此项任务
                  </button>
                </div>
                
                {difficulty !== Difficulty.EASY && (
                    <div className="flex items-center text-[10px] text-gray-400 space-x-2">
                        <span className="flex items-center"><svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg> 经纬度校验中</span>
                        <span className="flex items-center"><svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg> 行为特征提取</span>
                    </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskFlow;
