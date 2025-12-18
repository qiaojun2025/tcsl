
import React, { useState, useEffect, useCallback } from 'react';
import { TaskType, Difficulty, CollectionCategory } from '../types.ts';
import { detectImage, getPlaceholderImage, getRandomCategory, CATEGORIES } from '../services/imageRecognition.ts';

interface TaskFlowProps {
  type: TaskType;
  category?: CollectionCategory;
  difficulty: Difficulty;
  onStepFeedback?: (isCorrect: boolean, points: number, choiceLabel?: string) => void;
  onComplete: (score: number, type: TaskType, details: string) => void;
  onCancel: () => void;
}

const CATEGORY_MAP: Record<string, string> = {
  'dog': '狗', 'cat': '猫', 'car': '汽车', 'person': '人', 'bicycle': '自行车', 
  'motorcycle': '摩托车', 'bird': '鸟', 'bottle': '瓶子', 'chair': '椅子', 'laptop': '笔记本电脑'
};

const COLLECTION_PROMPTS = {
  [Difficulty.EASY]: [
    '请采集一张白色的狗的照片',
    '请采集家庭作业的照片',
    '请采集一张绿色植物的照片',
    '请采集一个饮用水瓶的照片',
    '请采集一张桌子的照片',
    '请采集一张笔记本电脑的照片',
    '请采集一个水果的照片（苹果/香蕉等）',
    '请采集一张椅子的照片',
    '请采集一个手提包的照片',
    '请采集一张书本的照片'
  ],
  [Difficulty.MEDIUM]: [
    '请采集街景的照片 (需包含地理位置信息)',
    '请采集繁华商业区建筑的照片 (需包含地理位置信息)',
    '请采集当地公园景观的照片 (需验证实时性)',
    '请采集公共交通站台的照片 (需验证位置与时间)',
    '请采集当地地标性雕塑的照片 (需包含定位)',
    '请采集附近超市入口的照片 (需包含定位)',
    '请采集社区健身器材的照片 (需包含定位)',
    '请采集附近十字路口红绿灯的照片 (需包含定位)',
    '请采集当地图书馆外观的照片 (需包含定位)',
    '请采集附近停车场标识的照片 (需包含定位)'
  ],
  [Difficulty.HARD]: [
    '请在 30 分钟内拍摄你正在洗碗的照片 (仅限实时拍摄)',
    '请在 30 分钟内你正在打扫房间的照片 (仅限实时拍摄)',
    '请在 30 分钟内你正在整理书架的照片 (仅限实时拍摄)',
    '请在 30 分钟内你正在进行体育锻炼的照片 (仅限实时拍摄)',
    '请在 30 分钟内拍摄你正在做饭的照片 (仅限实时拍摄)',
    '请在 30 分钟内拍摄你正在阅读的照片 (仅限实时拍摄)',
    '请在 30 分钟内拍摄你正在给植物浇水的照片 (仅限实时拍摄)',
    '请在 30 分钟内拍摄你正在办公/学习的照片 (仅限实时拍摄)',
    '请在 30 分钟内拍摄你正在整理床铺的照片 (仅限实时拍摄)',
    '请在 30 分钟内拍摄你正在整理衣柜的照片 (仅限实时拍摄)'
  ]
};

const TaskFlow: React.FC<TaskFlowProps> = ({ type, category, difficulty, onStepFeedback, onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [totalSteps] = useState(10);
  const [score, setScore] = useState(0);
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'skipped' | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [textInput, setTextInput] = useState('');
  
  // Track used items to prevent duplicates within one session
  const [usedIndices, setUsedIndices] = useState<Set<number | string>>(new Set());

  const getPointsPerTask = () => {
    if (difficulty === Difficulty.EASY) return 1;
    if (difficulty === Difficulty.MEDIUM) return 3;
    return 6;
  };

  const generateNewTask = useCallback(() => {
    setIsLoading(true);
    setFeedback(null);
    setSelectedIds([]);
    setTextInput('');
    
    if (type === TaskType.QUICK_JUDGMENT) {
      // Find a category that hasn't been used as target yet
      const availableCategories = CATEGORIES.filter(c => !usedIndices.has(c));
      
      // If exhausted (unlikely given pool size), reset
      const pool = availableCategories.length > 0 ? availableCategories : CATEGORIES;
      const target = pool[Math.floor(Math.random() * pool.length)];
      
      setUsedIndices(prev => new Set(prev).add(target));
      const targetZh = CATEGORY_MAP[target] || target;

      if (difficulty === Difficulty.EASY) {
        const other = CATEGORIES.filter(c => c !== target)[Math.floor(Math.random() * (CATEGORIES.length - 1))];
        setCurrentTask({ 
          title: '请识别下图中的物品', 
          target, 
          imageUrl: getPlaceholderImage(target), 
          options: [{ id: target, label: targetZh }, { id: other, label: CATEGORY_MAP[other] || other }].sort(() => Math.random() - 0.5) 
        });
      } else if (difficulty === Difficulty.MEDIUM) {
        const isNegative = Math.random() > 0.5;
        setCurrentTask({ 
          title: isNegative ? `请选择：不是 ${targetZh} 的图片` : `请选择：包含 ${targetZh} 的图片`, 
          isNegative, 
          target, 
          images: Array.from({length: 3}).map((_, i) => ({ url: getPlaceholderImage(i === 0 ? target : getRandomCategory()), category: i === 0 ? target : 'other' })).sort(() => Math.random() - 0.5) 
        });
      } else {
        setTimeLeft(8);
        setCurrentTask({ 
          title: `8秒内选择所有: ${targetZh}`, 
          target, 
          images: Array.from({length: 6}).map((_, i) => ({ url: getPlaceholderImage(i < 3 ? target : getRandomCategory()), category: i < 3 ? target : 'other', id: i })).sort(() => Math.random() - 0.5) 
        });
      }
    } else {
      // Collection Task
      const promptList = COLLECTION_PROMPTS[difficulty];
      const availableIndices = promptList.map((_, i) => i).filter(i => !usedIndices.has(i));
      
      // If pool exhausted, reset indices for this category
      const poolIndices = availableIndices.length > 0 ? availableIndices : promptList.map((_, i) => i);
      const randomIndex = poolIndices[Math.floor(Math.random() * poolIndices.length)];
      
      setUsedIndices(prev => new Set(prev).add(randomIndex));
      const randomPrompt = promptList[randomIndex];
      
      if (difficulty === Difficulty.HARD) {
        setTimeLeft(1800); 
      }

      setCurrentTask({ title: randomPrompt, sub: randomPrompt });
    }
    setTimeout(() => setIsLoading(false), 400);
  }, [type, difficulty, usedIndices]);

  useEffect(() => { generateNewTask(); }, []); // Run once on mount

  useEffect(() => {
    if (timeLeft > 0 && !feedback && difficulty === Difficulty.HARD) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && difficulty === Difficulty.HARD && type === TaskType.QUICK_JUDGMENT && !feedback && currentTask) {
      handleHardSubmit();
    }
  }, [timeLeft, feedback, currentTask, type, difficulty]);

  const processChoice = (isCorrect: boolean | 'skipped', choiceLabel?: string) => {
    if (feedback) return;
    setFeedback(isCorrect === 'skipped' ? 'skipped' : (isCorrect ? 'correct' : 'wrong'));
    const pts = isCorrect === true ? getPointsPerTask() : 0;
    
    if (onStepFeedback) {
      onStepFeedback(isCorrect === true, pts, `Q${step}：${choiceLabel || (isCorrect === true ? '校验成功' : '校验失败')}`);
    }

    setTimeout(() => {
      setScore(prev => prev + pts);
      if (step < totalSteps) { 
        setStep(prev => prev + 1); 
        generateNewTask(); 
      } 
      else { 
        onComplete(score + pts, type, `完成 [${difficulty}] 任务`); 
      }
    }, 1000);
  };

  const handleHardSubmit = () => {
    const isCorrect = selectedIds.length > 0 && selectedIds.every(id => currentTask.images.find((img: any) => img.id === id).category === currentTask.target);
    processChoice(isCorrect, `提交了 ${selectedIds.length} 项选择`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        processChoice(true, `已上传采集图片并完成 AI 校验`);
      }, 1200);
    }
  };

  if (isLoading) return <div className="p-10 text-center text-gray-400 font-bold animate-pulse">AI 正在处理数据...</div>;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-lg w-full relative overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 uppercase tracking-widest">任务进度 {step}/{totalSteps}</span>
        {difficulty === Difficulty.HARD && timeLeft > 0 && (
          <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100 animate-pulse">
            剩余时间: {formatTime(timeLeft)}
          </span>
        )}
        <button onClick={onCancel} className="text-gray-300 hover:text-red-400 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {currentTask && (
        <div className="space-y-5">
          <p className="text-gray-900 font-black text-center text-lg leading-tight px-2">{currentTask.title}</p>
          
          {type === TaskType.QUICK_JUDGMENT ? (
            <div className="space-y-4">
              {difficulty === Difficulty.EASY && (
                <div className="flex flex-col items-center">
                  <div className="w-full aspect-square rounded-2xl overflow-hidden border border-gray-100 mb-4 bg-gray-50 shadow-inner">
                    <img src={currentTask.imageUrl} className="w-full h-full object-cover" alt="Task" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {currentTask.options.map((opt: any) => (
                      <button key={opt.id} onClick={() => processChoice(opt.id === currentTask.target, `判定为: ${opt.label}`)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 py-3.5 rounded-xl font-black text-sm transition-all border border-blue-100 active:scale-95">{opt.label}</button>
                    ))}
                  </div>
                </div>
              )}
              {difficulty === Difficulty.MEDIUM && (
                <div className="grid grid-cols-3 gap-2">
                  {currentTask.images.map((img: any, i: number) => (
                    <div key={i} onClick={() => processChoice(currentTask.isNegative ? img.category !== currentTask.target : img.category === currentTask.target, `选择了图像 ${i+1}`)} className="aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50 active:scale-95 transition-transform cursor-pointer">
                      <img src={img.url} className="w-full h-full object-cover" alt="Option" />
                    </div>
                  ))}
                </div>
              )}
              {difficulty === Difficulty.HARD && (
                <div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {currentTask.images.map((img: any) => (
                      <div key={img.id} onClick={() => setSelectedIds(prev => prev.includes(img.id) ? prev.filter(x => x !== img.id) : [...prev, img.id])} className={`relative aspect-square rounded-xl overflow-hidden border transition-all cursor-pointer ${selectedIds.includes(img.id) ? 'ring-4 ring-blue-500' : 'border-gray-100'}`}>
                        <img src={img.url} className="w-full h-full object-cover" alt="Option" />
                        {selectedIds.includes(img.id) && <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"><div className="bg-white rounded-full p-1"><svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg></div></div>}
                      </div>
                    ))}
                  </div>
                  <button onClick={handleHardSubmit} disabled={selectedIds.length === 0} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg shadow-blue-200 active:bg-blue-700 disabled:opacity-50">确认提交 ({selectedIds.length})</button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center bg-gray-50 transition-colors hover:border-blue-300">
                  <span className="text-4xl mb-3">
                    {difficulty === Difficulty.HARD ? '📸' : '🖼️'}
                  </span>
                  <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase text-center">
                    {difficulty === Difficulty.HARD ? '仅支持摄像头实时拍摄' : '支持相册上传或现场拍摄'}
                  </p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  id="task-upload" 
                  onChange={handleFileUpload} 
                  accept="image/*"
                  capture={difficulty === Difficulty.HARD ? "environment" : undefined}
                />
                <label htmlFor="task-upload" className="block w-full bg-blue-600 text-white py-4 rounded-xl font-black text-center cursor-pointer shadow-lg shadow-blue-100 active:bg-blue-700 transition-all">
                  {difficulty === Difficulty.HARD ? '立即开启摄像头拍摄' : '上传图片采集内容'}
                </label>
              </div>
              <button onClick={() => processChoice('skipped', '跳过了此项')} className="w-full text-gray-400 text-[10px] font-bold tracking-widest uppercase py-2">暂时跳过此项</button>
            </div>
          )}
        </div>
      )}

      {feedback && (
        <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center transition-all animate-in fade-in duration-300 ${feedback === 'correct' ? 'bg-green-600/90' : feedback === 'wrong' ? 'bg-red-600/90' : 'bg-gray-800/90'}`}>
          <div className="bg-white rounded-full p-4 mb-2 shadow-xl">
            {feedback === 'correct' ? <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg> : feedback === 'wrong' ? <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg> : <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>}
          </div>
          <p className="text-white font-black text-xl tracking-widest uppercase">{feedback === 'correct' ? '校验通过' : feedback === 'wrong' ? '校验失败' : '已跳过'}</p>
          {feedback === 'correct' && <p className="text-white text-xs mt-2 font-bold">贡献度 +{getPointsPerTask()}</p>}
        </div>
      )}
    </div>
  );
};

export default TaskFlow;
