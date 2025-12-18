
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

const SUB_CATEGORIES: Record<string, string[]> = {
  [CollectionCategory.IMAGE]: [
    '动物（如：狗、猫、鹦鹉等）', 
    '街景（如：纽约、巴黎、东京等）', 
    '商品（如：电话、平板、苹果、香蕉等）', 
    '证件（如：身份证、通行证、银行卡等）'
  ],
  [CollectionCategory.VIDEO]: ['动作', '行为', '场景'],
  [CollectionCategory.AUDIO]: ['语音朗读', '环境音'],
  [CollectionCategory.TEXT]: ['手写内容', '场景描述', '问答采集']
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

  const getPointsPerTask = () => {
    if (type === TaskType.QUICK_JUDGMENT) {
      return difficulty === Difficulty.EASY ? 1 : difficulty === Difficulty.MEDIUM ? 3 : 6;
    } else {
      return difficulty === Difficulty.EASY ? 2 : difficulty === Difficulty.MEDIUM ? 4 : 8;
    }
  };

  const generateNewTask = useCallback(() => {
    setIsLoading(true);
    setFeedback(null);
    setSelectedIds([]);
    setTextInput('');
    
    if (type === TaskType.QUICK_JUDGMENT) {
      let target = getRandomCategory();
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
      const modality = category || CollectionCategory.IMAGE;
      const subs = SUB_CATEGORIES[modality];
      const sub = subs[Math.floor(Math.random() * subs.length)];
      
      let title = '';
      const isImage = modality === CollectionCategory.IMAGE;
      const suffix = isImage ? "的图片" : "";

      if (difficulty === Difficulty.EASY) {
        title = `[采集任务] 请上传一张“${sub}”${suffix}`;
      } else if (difficulty === Difficulty.MEDIUM) {
        title = `[中级任务] 请在附近拍摄并上传一张真实的“${sub}”${suffix}，我们将验证其时间与位置`;
      } else {
        title = `[高级挑战] 请在 30 分钟内实地拍摄一张“${sub}”正在进行特定行为${suffix}`;
      }

      setCurrentTask({ title, modality, sub });
    }
    setTimeout(() => setIsLoading(false), 400);
  }, [type, difficulty, category]);

  useEffect(() => { generateNewTask(); }, [generateNewTask]);

  useEffect(() => {
    if (timeLeft > 0 && !feedback && difficulty === Difficulty.HARD && type === TaskType.QUICK_JUDGMENT) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && difficulty === Difficulty.HARD && type === TaskType.QUICK_JUDGMENT && !feedback && currentTask) {
      handleHardSubmit();
    }
  }, [timeLeft, feedback, currentTask]);

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
        onComplete(score + pts, type, `完成 [${difficulty}] 任务, 分类: ${category || '图片采集'}`); 
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
        processChoice(true, `成功采集文件: ${e.target.files![0].name}`);
      }, 800);
    }
  };

  if (isLoading) return <div className="p-10 text-center text-gray-400 font-bold animate-pulse">AI 任务加载中...</div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-lg w-full relative overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 uppercase tracking-widest">任务进度 {step}/{totalSteps}</span>
        <button onClick={onCancel} className="text-gray-300 hover:text-red-400 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
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
              {category === CollectionCategory.TEXT ? (
                <div className="space-y-3">
                  <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} className="w-full h-32 border-2 border-gray-100 rounded-2xl p-4 text-sm focus:border-blue-500 outline-none transition-colors" placeholder="在此输入采集的信息内容..." />
                  <button onClick={() => processChoice(true, "已提交文本内容")} disabled={textInput.trim().length < 5} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg shadow-blue-100 disabled:bg-gray-200">提交数据</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center bg-gray-50 transition-colors hover:border-blue-300">
                    <span className="text-4xl mb-3">{category === CollectionCategory.VIDEO ? '🎥' : category === CollectionCategory.AUDIO ? '🎤' : '🖼️'}</span>
                    <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">等待文件上传</p>
                  </div>
                  <input type="file" className="hidden" id="task-upload" onChange={handleFileUpload} accept={category === CollectionCategory.IMAGE ? "image/*" : category === CollectionCategory.VIDEO ? "video/*" : category === CollectionCategory.AUDIO ? "audio/*" : "*"} />
                  <label htmlFor="task-upload" className="block w-full bg-blue-600 text-white py-4 rounded-xl font-black text-center cursor-pointer shadow-lg shadow-blue-100 active:bg-blue-700 transition-all">{difficulty === Difficulty.HARD ? '立即拍摄采集' : '从相册/文件上传'}</label>
                </div>
              )}
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
        </div>
      )}
    </div>
  );
};

export default TaskFlow;
