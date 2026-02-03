
import React, { useState, useEffect, useRef } from 'react';
import { TaskType, Difficulty, CollectionCategory, MediaType } from '../types.ts';
import { getPlaceholderImage, CATEGORIES } from '../services/imageRecognition.ts';

interface TaskFlowProps {
  type: TaskType;
  category?: CollectionCategory;
  difficulty: Difficulty | string;
  mediaType?: MediaType;
  labels?: string[];
  onComplete: (score: number, type: TaskType, performance: { correctCount: number; totalCount: number; startTime: number; endTime: number }) => void;
  onCancel: () => void;
}

const MISSION_POOL: any = {
  [CollectionCategory.ANIMAL]: ['森林里的梅花鹿', '草地上的金毛犬', '树枝上的小鸟', '草丛里的野兔', '水中嬉戏的天鹅', '午睡的大熊猫', '奔跑的骏马', '树上的松鼠', '草原上的狮子', '深海里的鲸鱼'],
  [CollectionCategory.PLANT]: ['路边的蒲公英', '娇艳的郁金香', '挺拔的翠竹', '多肉植物特写', '秋天的银杏叶', '盛开的荷花', '沙漠中的仙人掌', '合欢树花', '清晨的牵牛花', '成熟的麦穗'],
  [CollectionCategory.PERSON]: ['微笑的职员', '专注的背影', '热情的挥手', '奔跑的运动员', '阅读的少年', '跳跃的姿势', '思考的侧脸', '远眺的眼神', '忙碌的双手', 'OK手势'],
  [CollectionCategory.STREET]: ['十字路口的红绿灯', '黄色的消火栓', '蓝色的共享单车', '路边的垃圾桶', '街角的长椅', '禁停交通标志', '霓虹灯招牌', '涂鸦墙面', '雨后的水洼', '路边报刊亭'],
  [CollectionCategory.LIFE]: ['咖啡杯特写', '打开的记事本', '整洁的书桌', '窗台上的小绿植', '合上的笔记本电脑', '一串车钥匙', '木质餐具', '温暖的台灯', '墙上的装饰画', '无线耳机'],
  [CollectionCategory.AUDIO]: ['环境背景音', '键盘敲击声', '翻书声', '滴水声', '远处鸟鸣', '汽车经过声', '清脆掌声', '拉链声', '咳嗽声', '敲门声'],
  [CollectionCategory.VIDEO]: ['一段人物行走视频']
};

const TaskFlow: React.FC<TaskFlowProps> = ({ type, category, difficulty, mediaType, onComplete, onCancel }) => {
  const totalItems = 10;
  const [step, setStep] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [taskQueue, setTaskQueue] = useState<any[]>([]);
  const [hasCaptured, setHasCaptured] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);

  useEffect(() => {
    const queue = [];
    const pool = MISSION_POOL[category!] || ['默认目标'];
    for (let i = 0; i < totalItems; i++) {
      queue.push({ 
        id: i, 
        prompt: pool[i % pool.length], 
        requirement: type === TaskType.QUICK_JUDGMENT ? '请快速判断图中内容' : '请根据描述进行采集' 
      });
    }
    setTaskQueue(queue);
    generateTask(0, queue);
  }, [type, category, mediaType, difficulty]);

  const generateTask = (idx: number, queue: any[]) => {
    setHasCaptured(false); 
    setMediaBlob(null);
    const item = queue[idx];
    if (type === TaskType.QUICK_JUDGMENT && mediaType === 'IMAGE') {
      const target = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      setCurrentTask({ ...item, imageUrl: getPlaceholderImage(target), target });
    } else {
      setCurrentTask(item);
    }
  };

  const handleNext = (success: boolean | 'skip' | 'exit') => {
    if (success === 'exit') {
      onCancel();
      return;
    }
    
    if (success === 'skip') {
      if (step < totalItems) {
        setStep(s => s + 1);
        generateTask(step, taskQueue);
        return;
      } else {
        onComplete(correctCount * 10, type, { correctCount, totalCount: totalItems, startTime, endTime: Date.now() });
        return;
      }
    }
    
    const isSuccess = success === true;
    const finalCorrect = correctCount + (isSuccess ? 1 : 0);

    if (step < totalItems) {
      setCorrectCount(finalCorrect); 
      setStep(s => s + 1);
      generateTask(step, taskQueue);
    } else {
      onComplete(finalCorrect * 10, type, { correctCount: finalCorrect, totalCount: totalItems, startTime, endTime: Date.now() });
    }
  };

  const startCapture = async () => {
    if (mediaType === 'IMAGE') { 
      setHasCaptured(true); 
      return; 
    }
    try {
      const isVideo = mediaType === 'VIDEO';
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      setIsRecording(true);
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: isVideo ? 'video/mp4' : 'audio/webm' });
        setMediaBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setTimeout(() => { 
        if (recorder.state === 'recording') { 
          recorder.stop(); 
          setIsRecording(false); 
          setHasCaptured(true); 
        } 
      }, 3000);
    } catch (e) { 
      alert('权限获取失败，请确保已授权麦克风或摄像头。'); 
    }
  };

  return (
    <div className="bg-[#161618] rounded-[32px] p-6 border border-white/5 shadow-2xl animate-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center mb-8">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Mission Progress</span>
          <div className="flex items-center space-x-2">
            <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(step/totalItems)*100}%` }}></div>
            </div>
            <span className="text-[13px] font-bold text-white/50">{step}/{totalItems}</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => handleNext('skip')} className="px-4 py-2 bg-white/5 rounded-xl text-[12px] font-bold text-white/40 active:bg-white/10 transition-colors">
            跳过
          </button>
          <button onClick={() => handleNext('exit')} className="px-4 py-2 bg-white/5 rounded-xl text-[12px] font-bold text-red-500/40 active:bg-white/10 transition-colors">
            退出
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-[20px] font-bold text-white mb-2">
          {type === TaskType.QUICK_JUDGMENT ? `图中包含 【${currentTask?.target}】 吗？` : `采集：${currentTask?.prompt}`}
        </h3>
        <p className="text-[13px] text-white/30 font-medium">{currentTask?.requirement}</p>
      </div>

      <div className="aspect-[4/3] bg-black/60 rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden mb-8 relative">
        {type === TaskType.QUICK_JUDGMENT && mediaType === 'IMAGE' ? (
          <img src={currentTask?.imageUrl} className="w-full h-full object-cover" alt="Annotation Target" />
        ) : (
          <div className="flex flex-col items-center">
             {isRecording ? (
               <div className="flex flex-col items-center">
                 <div className="w-20 h-20 bg-red-600 rounded-full animate-ping opacity-20 absolute"></div>
                 <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white font-black z-10">REC</div>
                 <p className="mt-4 text-[12px] text-red-500 font-bold uppercase tracking-widest">Recording...</p>
               </div>
             ) : hasCaptured ? (
               <div className="flex flex-col items-center">
                 <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-3xl text-green-500">✓</div>
                 <p className="mt-4 text-[12px] text-green-500 font-bold uppercase tracking-widest">Captured</p>
               </div>
             ) : (
               <div className="text-center">
                 <div className="text-5xl opacity-10 mb-4">{mediaType === 'VIDEO' ? '📹' : mediaType === 'AUDIO' ? '🎙️' : '📸'}</div>
                 <p className="text-[12px] text-white/20 font-bold uppercase tracking-widest">Wait for Action</p>
               </div>
             )}
          </div>
        )}
      </div>

      <div className="flex flex-col space-y-4">
        {type === TaskType.QUICK_JUDGMENT ? (
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleNext(true)} className="py-5 bg-blue-600 rounded-[22px] font-bold text-white text-[17px] shadow-lg shadow-blue-600/20 active:scale-95 transition-all">确认 (Yes)</button>
            <button onClick={() => handleNext(false)} className="py-5 bg-[#232326] border border-white/5 rounded-[22px] font-bold text-white text-[17px] active:scale-95 transition-all">否定 (No)</button>
          </div>
        ) : (
          <>
            {!hasCaptured ? (
              <button onClick={startCapture} disabled={isRecording} className="w-full py-5 bg-blue-600 rounded-[22px] font-bold text-white text-[17px] shadow-lg shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50">
                {isRecording ? '正在处理...' : '点击开始采集'}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setHasCaptured(false)} className="py-5 bg-[#232326] border border-white/5 rounded-[22px] font-bold text-white text-[17px] active:scale-95 transition-all">重新采集</button>
                <button onClick={() => handleNext(true)} className="py-5 bg-green-600 rounded-[22px] font-bold text-white text-[17px] shadow-lg active:scale-95 transition-all">提交并继续</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TaskFlow;
