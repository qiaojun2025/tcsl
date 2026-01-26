
import React, { useState, useEffect, useRef } from 'react';
import { TaskType, Difficulty, CollectionCategory, MediaType } from '../types.ts';
import { getPlaceholderImage, CATEGORIES } from '../services/imageRecognition.ts';

interface TaskFlowProps {
  type: TaskType;
  category?: CollectionCategory;
  difficulty: Difficulty;
  mediaType?: MediaType;
  customLabel?: string;
  onComplete: (score: number, type: TaskType, performance: { correctCount: number; totalCount: number; startTime: number; endTime: number }) => void;
  onCancel: () => void;
}

const PREDEFINED_TASKS: any = {
  [CollectionCategory.ANIMAL]: ['猫咪', '狗狗', '鸟类', '松鼠', '蝴蝶', '鱼类', '兔子', '昆虫', '蜜蜂', '鸽子'],
  [CollectionCategory.PLANT]: ['玫瑰', '多肉', '绿萝', '向日葵', '仙人掌', '枫叶', '松针', '荷花', '银杏', '芦荟'],
  [CollectionCategory.PERSON]: ['人脸', '手势', '行走', '坐姿', '背影', '奔跑', '跳跃', '挥手', '剪影', '低头'],
  [CollectionCategory.STREET]: ['招牌', '斑马线', '红绿灯', '天桥', '公交站', '垃圾桶', '路灯', '消防栓', '长椅', '报刊亭'],
  [CollectionCategory.LIFE]: ['杯子', '书本', '椅子', '显示器', '充电线', '雨伞', '钥匙', '鼠标', '台灯', '水壶'],
  [CollectionCategory.AUDIO]: ['数字朗读', '日常语', '雨声', '键盘声', '翻书声', '门铃', '倒水声', '闹钟', '笑声', '拍手'],
  [CollectionCategory.VIDEO]: ['在安全道路上正常行走']
};

const TaskFlow: React.FC<TaskFlowProps> = ({ type, category, difficulty, mediaType, customLabel, onComplete, onCancel }) => {
  const isCustom = category === CollectionCategory.CUSTOM;
  const isCollection = type === TaskType.COLLECTION;
  
  const getInitialSteps = () => {
    if (isCustom) return 1;
    if (mediaType === 'VIDEO') return 1;
    return 10;
  };

  const [step, setStep] = useState(1);
  const [totalSteps] = useState(getInitialSteps());
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [taskQueue, setTaskQueue] = useState<any[]>([]);
  
  // 预览状态：只有非自定义的采集任务才显示预览
  const [showPreview, setShowPreview] = useState(isCollection && !isCustom);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'skipped' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [hasCaptured, setHasCaptured] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const queue = [];
    const pool = isCustom ? [customLabel || '自定义采集项'] : (PREDEFINED_TASKS[category!] || ['采集目标']);
    
    for (let i = 0; i < totalSteps; i++) {
      queue.push({
        id: i,
        prompt: pool[i] || pool[0],
        requirement: mediaType === 'VIDEO' 
          ? '请保持手机平稳，在安全路段进行录制。' 
          : mediaType === 'AUDIO' 
          ? '请在安静环境下录制，确保语音清晰有力，不要有杂音干扰。'
          : '确保采集主体在画面中央，光线充足，背景尽量简洁。'
      });
    }
    setTaskQueue(queue);
    generateCurrentTask(0, queue);
  }, [type, category, totalSteps, mediaType, customLabel]);

  const generateCurrentTask = (idx: number, queue: any[]) => {
    setFeedback(null);
    setMediaBlob(null);
    setHasCaptured(false);
    const item = queue[idx];
    if (type === TaskType.QUICK_JUDGMENT) {
      const target = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      setCurrentTask({ imageUrl: getPlaceholderImage(target), target });
    } else {
      setCurrentTask(item);
    }
  };

  const getPoints = () => {
    if (difficulty === Difficulty.EASY) return 5;
    if (difficulty === Difficulty.MEDIUM) return 10;
    return 15;
  };

  const handleNext = (isCorrect: boolean | 'skipped') => {
    const isActuallyCorrect = isCorrect === true;
    setFeedback(isActuallyCorrect ? 'correct' : isCorrect === 'skipped' ? 'skipped' : 'wrong');
    
    setTimeout(() => {
      if (isActuallyCorrect) {
        setScore(s => s + getPoints());
        setCorrectCount(c => c + 1);
      }
      if (step < totalSteps) {
        setStep(s => s + 1);
        generateCurrentTask(step, taskQueue);
      } else {
        const finalScore = score + (isActuallyCorrect ? getPoints() : 0);
        const finalCorrect = correctCount + (isActuallyCorrect ? 1 : 0);
        onComplete(finalScore, type, {
          correctCount: finalCorrect,
          totalCount: totalSteps,
          startTime,
          endTime: Date.now()
        });
      }
    }, 800);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mediaType === 'VIDEO' });
      if (mediaType === 'VIDEO' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        setMediaBlob(new Blob(chunks, { type: mediaType === 'VIDEO' ? 'video/mp4' : 'audio/webm' }));
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) { alert('获取媒体权限失败。'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setHasCaptured(true);
  };

  const validateAndSubmit = async () => {
    if (mediaType === 'AUDIO' && mediaBlob && mediaBlob.size > 2 * 1024 * 1024) {
      alert('语音文件大小超过 2 MB 限制，请重新录制。'); 
      return;
    }

    if (mediaType === 'IMAGE') {
      if (Math.random() < 0.05) { 
        alert('系统相似度校验失败：检测到重复或低质量内容。');
        return;
      }
    }

    handleNext(true);
  };

  // --- 预览界面 (四区域) ---
  if (showPreview) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-100 animate-in zoom-in-95 duration-500">
        <div className="bg-blue-600 p-6 text-white shrink-0">
          <h2 className="text-2xl font-black mb-1">{category}</h2>
          <p className="text-blue-100 text-[10px] font-bold opacity-90 leading-relaxed tracking-wider">
            参与此项任务可以提高你的报酬结算比例，最高额外获得 20% 奖励。
          </p>
        </div>
        
        <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[40vh]">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
              <span className="text-sm font-black text-gray-900 uppercase tracking-widest">任务标签 ({totalSteps}道)</span>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100">
              {taskQueue.map((t, idx) => (
                <div key={idx} className="flex items-center text-sm text-gray-700 py-1.5 border-b border-gray-200/50 last:border-0 font-bold">
                  <span className="w-6 text-blue-500 font-mono text-xs font-black">{idx + 1}.</span>
                  <span>{t.prompt}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-1.5 h-4 bg-green-500 rounded-full"></span>
              <span className="text-sm font-black text-gray-900 uppercase tracking-widest">任务要求标签</span>
            </div>
            <div className="bg-green-50/50 border border-green-100 rounded-2xl p-4 text-xs text-green-800 leading-relaxed font-bold">
              {taskQueue[0]?.requirement}
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-gray-50 shrink-0">
          <p className="text-[11px] text-gray-400 text-center mb-4 uppercase font-black tracking-widest opacity-80 italic">继续完成采集任务</p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={onCancel} className="py-4 rounded-2xl bg-gray-100 text-gray-600 font-black">返回</button>
            <button onClick={() => setShowPreview(false)} className="py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-100 active:scale-95 transition-all">开始任务</button>
          </div>
        </div>
      </div>
    );
  }

  // --- 执行界面 ---
  return (
    <div className="bg-white rounded-3xl p-6 shadow-2xl relative border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase border border-blue-100">
          {step} / {totalSteps}
        </span>
        <button onClick={() => handleNext('skipped')} className="text-[10px] font-black text-red-500 bg-red-50 px-3 py-1.5 rounded-full uppercase">退出任务</button>
      </div>

      <div className="mb-6">
        <h3 className="text-2xl font-black text-gray-900 leading-tight mb-2">
          {type === TaskType.QUICK_JUDGMENT ? `它属于 ${currentTask?.target} 吗？` : isCustom ? `标注内容：${currentTask?.prompt}` : `采集目标：${currentTask?.prompt}`}
        </h3>
        <p className="text-xs text-gray-400 font-black uppercase">{currentTask?.requirement}</p>
      </div>

      <div className="mt-4 min-h-[220px] flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 overflow-hidden relative">
        {type === TaskType.QUICK_JUDGMENT ? (
          <div className="w-full h-full flex flex-col p-4 space-y-4">
            <img src={currentTask?.imageUrl} className="aspect-square rounded-2xl object-cover shadow-inner bg-white" alt="Task" />
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleNext(true)} className="py-4 border-2 border-blue-600 text-blue-600 font-black rounded-2xl active:bg-blue-600 active:text-white transition-all">是</button>
              <button onClick={() => handleNext(false)} className="py-4 border-2 border-gray-200 text-gray-400 font-black rounded-2xl active:bg-gray-100 transition-all">否</button>
            </div>
          </div>
        ) : (
          <div className="w-full p-4 space-y-4">
            {mediaType === 'VIDEO' ? (
              <div className="w-full aspect-video bg-black rounded-2xl relative overflow-hidden">
                <video ref={videoPreviewRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                {isRecording && (
                  <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse">REC</div>
                )}
              </div>
            ) : mediaType === 'AUDIO' ? (
              <div className="w-full h-32 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
                <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{isRecording ? '录音中...' : '麦克风已就绪'}</span>
              </div>
            ) : (
              <div className={`w-full aspect-square bg-white border-2 border-gray-100 rounded-3xl flex flex-col items-center justify-center ${hasCaptured ? 'bg-green-50' : ''}`} onClick={() => !hasCaptured && setHasCaptured(true)}>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{hasCaptured ? '采集成功' : '点击模拟拍照'}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {(mediaType === 'VIDEO' || mediaType === 'AUDIO') ? (
                isRecording ? (
                  <button onClick={stopRecording} className="py-4 bg-red-600 text-white font-black rounded-2xl">停止录制</button>
                ) : (
                  <button onClick={startRecording} className="py-4 bg-blue-600 text-white font-black rounded-2xl">{hasCaptured ? '重新录制' : '开始录制'}</button>
                )
              ) : (
                <button onClick={() => { setHasCaptured(true); alert('系统已捕获图像。'); }} className="py-4 bg-blue-600 text-white font-black rounded-2xl">{hasCaptured ? '重新拍照' : '点击拍照'}</button>
              )}
              
              {hasCaptured && !isRecording && (
                <button onClick={validateAndSubmit} className="py-4 bg-green-600 text-white font-black rounded-2xl shadow-xl shadow-green-100 animate-in fade-in">确认提交</button>
              )}
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`absolute inset-0 z-[60] flex flex-col items-center justify-center animate-in fade-in ${feedback === 'correct' ? 'bg-green-600/90' : 'bg-red-600/90'}`}>
          <p className="text-white font-black text-2xl uppercase tracking-widest">{feedback === 'correct' ? '校验通过' : '校验失败'}</p>
        </div>
      )}
    </div>
  );
};

export default TaskFlow;
