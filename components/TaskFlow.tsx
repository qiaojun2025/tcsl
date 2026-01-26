
import React, { useState, useEffect, useRef } from 'react';
import { TaskType, Difficulty, CollectionCategory, MediaType } from '../types.ts';
import { getPlaceholderImage, CATEGORIES } from '../services/imageRecognition.ts';

interface TaskFlowProps {
  type: TaskType;
  category?: CollectionCategory;
  difficulty: Difficulty | string;
  mediaType?: MediaType;
  customLabels?: string[];
  classification?: string;
  onComplete: (score: number, type: TaskType, performance: { correctCount: number; totalCount: number; startTime: number; endTime: number }) => void;
  onCancel: () => void;
}

const PREDEFINED_POOL: any = {
  [CollectionCategory.ANIMAL]: ['小狗漫步', '小猫午睡', '飞鸟归巢', '鱼跃龙门', '松鼠采松果', '蝴蝶起舞', '蜜蜂采蜜', '兔子吃草', '麻雀觅食', '流浪猫巡逻'],
  [CollectionCategory.PLANT]: ['红玫瑰特写', '向日葵花田', '多肉植物特写', '仙人掌剪影', '秋季枫叶', '青松针叶', '野花丛生', '盛放荷花', '银杏叶黄', '绿萝垂挂'],
  [CollectionCategory.PERSON]: ['微笑人脸', '点赞手势', '公园行走', '认真办公', '远去的背影', '少年奔跑', '空中跳跃', '挥手致意', '夕阳剪影', '低头阅读'],
  [CollectionCategory.STREET]: ['禁停标志', '古典路灯', '消火栓特写', '公园长椅', '分类垃圾桶', '霓虹招牌', '斑马线行人', '等待红绿灯', '道路护栏', '共享单车'],
  [CollectionCategory.LIFE]: ['简约玻璃杯', '机械键盘', '无线鼠标', '温馨台灯', '合上的书本', '一把钥匙', '挂耳式耳机', '数据线特写', '电脑显示器', '充电宝'],
  [CollectionCategory.AUDIO]: ['数字1-10朗读', '今天天气不错', '淅沥雨声采集', '清脆键盘敲击', '翻书的声音', '门铃叮咚声', '水滴石穿声', '滴答闹钟声', '热烈的掌声', '办公室背景音'],
  [CollectionCategory.VIDEO]: ['在安全道路上正常行走拍摄']
};

const TaskFlow: React.FC<TaskFlowProps> = ({ type, category, difficulty, mediaType, customLabels, classification, onComplete, onCancel }) => {
  const isCustom = category === CollectionCategory.CUSTOM;
  const isCollection = type === TaskType.COLLECTION;
  
  const getInitialStepsCount = () => {
    if (mediaType === 'VIDEO') return 1;
    if (isCustom && customLabels) return customLabels.length;
    return 10;
  };

  const [step, setStep] = useState(1);
  const [totalSteps] = useState(getInitialStepsCount());
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [taskQueue, setTaskQueue] = useState<any[]>([]);
  
  const [showPreview, setShowPreview] = useState(isCollection && !isCustom);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'skipped' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [hasCaptured, setHasCaptured] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // 初始化预览逻辑：如果是自定义，在执行阶段直接显示
  useEffect(() => {
    if (isCollection && isCustom) setShowPreview(true);
  }, [isCollection, isCustom]);

  useEffect(() => {
    const queue = [];
    let pool = [];
    if (isCustom) {
      pool = customLabels || ['自定义采集目标'];
    } else {
      pool = PREDEFINED_POOL[category!] || ['默认采集目标'];
    }
    
    for (let i = 0; i < totalSteps; i++) {
      queue.push({
        id: i,
        prompt: pool[i] || pool[0] || '目标采集',
        requirement: mediaType === 'VIDEO' 
          ? '在人行道上或绕过障碍物正常行走的同时，使用应用内相机录制视频。将相机保持在胸部高度，避免直接拍摄他人的面部。' 
          : mediaType === 'AUDIO' 
          ? '请在安静环境下录制，确保语音清晰。文件大小不得超过 2MB。'
          : '确保采集主体居中，光线良好。系统将自动进行重复性校验。'
      });
    }
    setTaskQueue(queue);
    generateCurrentTask(0, queue);
  }, [type, category, mediaType, customLabels, totalSteps]);

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

  const handleNext = (isCorrect: boolean | 'skipped') => {
    const isActuallyCorrect = isCorrect === true;
    setFeedback(isActuallyCorrect ? 'correct' : isCorrect === 'skipped' ? 'skipped' : 'wrong');
    
    setTimeout(() => {
      const points = isActuallyCorrect ? 10 : 0;
      const curCorrect = isActuallyCorrect ? 1 : 0;
      
      if (step < totalSteps) {
        setScore(s => s + points);
        setCorrectCount(c => c + curCorrect);
        setStep(s => s + 1);
        generateCurrentTask(step, taskQueue);
      } else {
        onComplete(score + points, type, {
          correctCount: correctCount + curCorrect,
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
        const blob = new Blob(chunks, { type: mediaType === 'VIDEO' ? 'video/mp4' : 'audio/webm' });
        setMediaBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) { alert('获取权限失败，请确保开启摄像头和麦克风。'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setHasCaptured(true);
  };

  const validateAndSubmit = async () => {
    if (mediaType === 'AUDIO' && mediaBlob && mediaBlob.size > 2 * 1024 * 1024) {
      alert('语音文件大小超过 2MB，请重新录制较短的内容。');
      return;
    }
    if (mediaType === 'IMAGE') {
      if (Math.random() < 0.05) {
        alert('校验提示：该图片与历史库数据重复，请拍摄一个更独特的视角。');
        setHasCaptured(false);
        return;
      }
    }
    handleNext(true);
  };

  if (showPreview) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-100 animate-in zoom-in-95 duration-500 max-h-[85vh]">
        {/* 标题区域 */}
        <div className="bg-blue-600 p-6 text-white shrink-0">
          <h2 className="text-2xl font-black mb-1">{isCustom ? "自定义" : (category || "采集任务")}</h2>
          <p className="text-blue-100 text-[10px] font-bold opacity-90 leading-relaxed uppercase tracking-widest">
            {isCustom ? `分类：${classification}` : "参与此项任务可以提高你的报酬结算比例"}
          </p>
        </div>
        
        {/* 任务区域 */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
              <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">任务标签 ({taskQueue.length}项)</span>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100 shadow-inner">
              {taskQueue.map((t, idx) => (
                <div key={idx} className="flex items-start text-sm text-gray-700 font-bold border-b border-gray-200/50 pb-1 last:border-0">
                  <span className="w-6 text-blue-500 font-mono text-xs">{idx + 1}.</span>
                  <span className="flex-1">{t.prompt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 任务要求区域 */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
              <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">任务要求标签</span>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed font-bold italic">
              {taskQueue[0]?.requirement}
            </div>
          </div>
        </div>

        {/* 按钮区域 */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 shrink-0">
          <p className="text-[9px] text-gray-400 text-center mb-4 uppercase font-black tracking-widest">继续完成采集任务</p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={onCancel} className="py-4 rounded-2xl bg-white border border-gray-200 text-gray-600 font-black active:bg-gray-100">返回</button>
            <button onClick={() => setShowPreview(false)} className="py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-100 active:scale-95 transition-all">立即开始</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-2xl relative border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase border border-blue-100">
          进度: {step} / {totalSteps}
        </span>
        <button onClick={() => handleNext('skipped')} className="text-[10px] font-black text-red-500 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100">退出当前任务</button>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-black text-gray-900 leading-tight mb-2">
          {type === TaskType.QUICK_JUDGMENT ? `图中是否包含 ${currentTask?.target}?` : `当前目标：${currentTask?.prompt}`}
        </h3>
        <p className="text-[10px] text-gray-400 font-bold leading-relaxed">{currentTask?.requirement}</p>
      </div>

      <div className="mt-4 min-h-[260px] flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 overflow-hidden relative">
        {type === TaskType.QUICK_JUDGMENT ? (
          <div className="w-full h-full flex flex-col p-4 space-y-4">
            <img src={currentTask?.imageUrl} className="aspect-square rounded-2xl object-cover shadow-inner bg-white" alt="Judge" />
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleNext(true)} className="py-4 border-2 border-blue-600 text-blue-600 font-black rounded-2xl active:bg-blue-600 active:text-white">包含</button>
              <button onClick={() => handleNext(false)} className="py-4 border-2 border-gray-200 text-gray-400 font-black rounded-2xl active:bg-gray-100">不包含</button>
            </div>
          </div>
        ) : (
          <div className="w-full p-4 space-y-4">
            {mediaType === 'VIDEO' ? (
              <div className="w-full aspect-video bg-black rounded-2xl relative overflow-hidden">
                <video ref={videoPreviewRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                {isRecording && <div className="absolute top-4 left-4 flex items-center space-x-1.5 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-full animate-pulse"><span className="w-1.5 h-1.5 bg-white rounded-full"></span><span>REC</span></div>}
              </div>
            ) : mediaType === 'AUDIO' ? (
              <div className="w-full h-32 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center border border-indigo-100">
                 {isRecording && <div className="flex space-x-1 mb-2 animate-bounce">{[...Array(5)].map((_, i) => <div key={i} className="w-1 bg-blue-500 rounded-full" style={{height: `${Math.random()*15 + 10}px`}}></div>)}</div>}
                <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{isRecording ? '捕获音频中' : '准备录制...'}</span>
              </div>
            ) : (
              <div className={`w-full aspect-square bg-white border-2 border-gray-100 rounded-3xl flex flex-col items-center justify-center relative ${hasCaptured ? 'bg-emerald-50 border-emerald-200' : ''}`} onClick={() => !hasCaptured && setHasCaptured(true)}>
                {hasCaptured ? <div className="flex flex-col items-center"><svg className="w-12 h-12 text-emerald-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg><span className="text-[10px] font-black text-emerald-600 uppercase">捕获成功</span></div> : <div className="flex flex-col items-center text-gray-300"><svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span className="text-[10px] font-black uppercase">点击采集图像</span></div>}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {(mediaType === 'VIDEO' || mediaType === 'AUDIO') ? (
                isRecording ? (
                  <button onClick={stopRecording} className="py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-100 active:scale-95 transition-all">停止录制</button>
                ) : (
                  <button onClick={startRecording} className="py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-all">{hasCaptured ? '重新录制' : '开始录制'}</button>
                )
              ) : (
                <button onClick={() => setHasCaptured(true)} className="py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all">{hasCaptured ? '重拍' : '点击拍摄'}</button>
              )}
              
              {hasCaptured && !isRecording && (
                <button onClick={validateAndSubmit} className="py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 animate-in fade-in slide-in-from-top-2">确认并提交</button>
              )}
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`absolute inset-0 z-[60] rounded-3xl flex flex-col items-center justify-center animate-in fade-in duration-300 ${feedback === 'correct' ? 'bg-emerald-600/95' : 'bg-rose-600/95'}`}>
          <div className="bg-white/20 p-4 rounded-full mb-4">
             <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={feedback === 'correct' ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} /></svg>
          </div>
          <p className="text-white font-black text-2xl uppercase tracking-[0.2em]">{feedback === 'correct' ? '数据有效' : '采集失败'}</p>
        </div>
      )}
    </div>
  );
};

export default TaskFlow;
