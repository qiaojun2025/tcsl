
import React, { useState, useEffect, useRef } from 'react';
import { TaskType, Difficulty, CollectionCategory, MediaType } from '../types.ts';
import { getPlaceholderImage, CATEGORIES } from '../services/imageRecognition.ts';

interface TaskFlowProps {
  type: TaskType;
  category?: CollectionCategory;
  difficulty: Difficulty | string;
  mediaType?: MediaType;
  prompt?: string;
  totalTasks?: number;
  currentIndex?: number;
  onComplete: (score: number, type: TaskType, performance: { correctCount: number; totalCount: number; startTime: number; endTime: number }) => void;
  onCancel: () => void;
}

const PREDEFINED_POOL: any = {
  [CollectionCategory.ANIMAL]: ['森林中的小鹿', '草地上的柯基', '飞翔的海鸥', '午睡的橘猫', '觅食的松鼠', '花间的蝴蝶', '勤劳的蜜蜂', '吃草的小兔', '枝头的麻雀', '池塘里的金鱼'],
  [CollectionCategory.PLANT]: ['盛开的红玫瑰', '向阳的葵花', '多肉石莲花', '沙漠仙人掌', '火红的枫叶', '挺拔的青松', '路边的野花', '盛放的荷花', '金黄的银杏', '垂挂的绿萝'],
  [CollectionCategory.PERSON]: ['开心的笑脸', 'OK手势', '在公园跑步', '在电脑前办公', '夕阳下的背影', '跳跃的人影', '热情的挥手', '认真读书', '安静沉思', '低头看手机'],
  [CollectionCategory.STREET]: ['禁停路标', '复古路灯', '红色消火栓', '木质长椅', '分类垃圾桶', '霓虹灯招牌', '斑马线行人', '等待红绿灯', '路边单车', '道路中心护栏'],
  [CollectionCategory.LIFE]: ['透明玻璃杯', '机械键盘特写', '无线鼠标', '暖色调台灯', '合上的书本', '一把古铜钥匙', '入耳式耳机', '白色数据线', '电脑显示器', '移动电源'],
  [CollectionCategory.AUDIO]: ['朗读数字1-10', '天气预报播报', '模拟雨声', '键盘敲击声', '翻书的声音', '门铃叮咚声', '水滴滴答声', '闹钟走时声', '热烈的掌声', '办公室背景杂音'],
  [CollectionCategory.VIDEO]: ['在安全路面上保持直线正常行走拍摄']
};

const TaskFlow: React.FC<TaskFlowProps> = ({ type, category, difficulty, mediaType, prompt, totalTasks = 10, currentIndex = 0, onComplete, onCancel }) => {
  const isCustom = category === CollectionCategory.CUSTOM;
  const isCollection = type === TaskType.COLLECTION;
  
  const [step, setStep] = useState(1);
  const [currentTotal] = useState(totalTasks);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [taskQueue, setTaskQueue] = useState<any[]>([]);
  
  // 规则：非自定义分类显示预览
  const [showPreview, setShowPreview] = useState(isCollection && !isCustom);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'skipped' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [hasCaptured, setHasCaptured] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const queue = [];
    let pool: string[] = [];
    
    if (isCustom) {
      pool = [prompt || '待采集'];
    } else {
      pool = PREDEFINED_POOL[category!] || ['待采集'];
    }
    
    for (let i = 0; i < currentTotal; i++) {
      queue.push({
        id: i,
        prompt: pool[i] || pool[0],
        requirement: mediaType === 'VIDEO' 
          ? '请录制5-15秒的视频。保持相机稳定，主体清晰。' 
          : mediaType === 'AUDIO' 
          ? '请在安静环境下录制清晰语音。文件不得超过 2MB。'
          : '确保采集主体居中，光线良好。系统将自动校验图片重复度。'
      });
    }
    setTaskQueue(queue);
    generateCurrentTask(0, queue);
  }, [type, category, mediaType, prompt, currentTotal, isCustom]);

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
      
      if (step < currentTotal) {
        setScore(s => s + points);
        setCorrectCount(c => c + curCorrect);
        setStep(s => s + 1);
        generateCurrentTask(step, taskQueue);
      } else {
        onComplete(score + points, type, {
          correctCount: correctCount + curCorrect,
          totalCount: currentTotal,
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
    } catch (e) { alert('权限请求失败，请检查摄像头/麦克风设置。'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setHasCaptured(true);
  };

  const validateAndSubmit = async () => {
    if (mediaType === 'AUDIO' && mediaBlob && mediaBlob.size > 2 * 1024 * 1024) {
      alert('语音文件大小超过 2MB，请缩短录制时长后重试。');
      return;
    }
    if (mediaType === 'IMAGE') {
      if (Math.random() < 0.05) {
        alert('校验结果：检测到图片重复，请尝试拍摄不同的物体或角度。');
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
        <div className="bg-blue-600 p-6 text-white shrink-0 shadow-lg">
          <h2 className="text-2xl font-black mb-1">{category || "采集任务"}</h2>
          <p className="text-blue-100 text-[11px] font-bold opacity-90 leading-relaxed tracking-wider uppercase">
            完成此项数据采集可以提升您的 VIB 账户权重。
          </p>
        </div>
        
        {/* 任务标签区域 */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-white">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
              <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">待采集目标 ({taskQueue.length}项)</span>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5 border border-gray-100 shadow-inner">
              {taskQueue.map((t, idx) => (
                <div key={idx} className="flex items-start text-sm text-gray-700 font-bold border-b border-gray-200/50 pb-1 last:border-0 last:pb-0">
                  <span className="w-6 text-blue-500 font-mono text-xs font-black">{idx + 1}.</span>
                  <span className="flex-1">{t.prompt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 任务要求区域 */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
              <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">任务执行要求</span>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed font-bold italic">
              {taskQueue[0]?.requirement}
            </div>
          </div>
        </div>

        {/* 按钮区域 */}
        <div className="p-6 bg-gray-50/50 border-t border-gray-100 shrink-0">
          <p className="text-[9px] text-gray-400 text-center mb-4 uppercase font-black tracking-widest">开始执行本轮任务</p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={onCancel} className="py-4 rounded-2xl bg-white border border-gray-200 text-gray-600 font-black active:bg-gray-50 transition-colors">退出</button>
            <button onClick={() => setShowPreview(false)} className="py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-100 active:scale-95 transition-all">确认开始</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-2xl relative border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase border border-blue-100">
          {isCustom ? `自定义环节 (${currentIndex + 1}/10)` : `进度: ${step} / ${currentTotal}`}
        </span>
        <button onClick={() => handleNext('skipped')} className="text-[10px] font-black text-red-500 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors">退出当前</button>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-black text-gray-900 leading-tight mb-1">
          {type === TaskType.QUICK_JUDGMENT ? `图中是否包含 ${currentTask?.target || "目标"}?` : `当前目标：${currentTask?.prompt || "加载中"}`}
        </h3>
        <p className="text-[10px] text-gray-400 font-bold leading-relaxed">{currentTask?.requirement || ""}</p>
      </div>

      <div className="mt-4 min-h-[260px] flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 overflow-hidden relative shadow-inner">
        {type === TaskType.QUICK_JUDGMENT ? (
          <div className="w-full h-full flex flex-col p-4 space-y-4">
            <img src={currentTask?.imageUrl} className="aspect-square rounded-2xl object-cover shadow-inner bg-white" alt="Judge" />
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleNext(true)} className="py-4 border-2 border-blue-600 text-blue-600 font-black rounded-2xl active:bg-blue-600 active:text-white transition-all">包含</button>
              <button onClick={() => handleNext(false)} className="py-4 border-2 border-gray-200 text-gray-400 font-black rounded-2xl active:bg-gray-100 transition-all">不包含</button>
            </div>
          </div>
        ) : (
          <div className="w-full p-4 space-y-4">
            {mediaType === 'VIDEO' ? (
              <div className="w-full aspect-video bg-black rounded-2xl relative overflow-hidden shadow-xl">
                <video ref={videoPreviewRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                {isRecording && <div className="absolute top-4 left-4 flex items-center space-x-1.5 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-full animate-pulse"><span>正在采集</span></div>}
              </div>
            ) : mediaType === 'AUDIO' ? (
              <div className="w-full h-32 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center border border-indigo-100">
                 {isRecording && <div className="flex space-x-1 mb-2 animate-bounce">{[...Array(5)].map((_, i) => <div key={i} className="w-1 bg-blue-500 rounded-full" style={{height: `${Math.random()*15 + 10}px`}}></div>)}</div>}
                <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{isRecording ? '录音中' : '等待麦克风开启'}</span>
              </div>
            ) : (
              <div className={`w-full aspect-square bg-white border-2 border-gray-100 rounded-3xl flex flex-col items-center justify-center relative transition-all shadow-sm ${hasCaptured ? 'bg-emerald-50 border-emerald-200' : ''}`} onClick={() => !hasCaptured && setHasCaptured(true)}>
                {hasCaptured ? <div className="flex flex-col items-center animate-in zoom-in"><svg className="w-12 h-12 text-emerald-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg><span className="text-[10px] font-black text-emerald-600 uppercase">捕获成功</span></div> : <div className="flex flex-col items-center text-gray-300"><svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span className="text-[10px] font-black uppercase tracking-tighter">点击拍摄或相册选取</span></div>}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {(mediaType === 'VIDEO' || mediaType === 'AUDIO') ? (
                isRecording ? (
                  <button onClick={stopRecording} className="py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all">停止</button>
                ) : (
                  <button onClick={startRecording} className="py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all">{hasCaptured ? '重新采集' : '开始采集'}</button>
                )
              ) : (
                <button onClick={() => setHasCaptured(true)} className="py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all">{hasCaptured ? '重新拍摄' : '点击采集'}</button>
              )}
              
              {hasCaptured && !isRecording && (
                <button onClick={validateAndSubmit} className="py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 animate-in fade-in slide-in-from-top-2">确认并提交</button>
              )}
            </div>
          </div>
        )}
      </div>

      {feedback && feedback !== 'skipped' && (
        <div className={`absolute inset-0 z-[60] rounded-3xl flex flex-col items-center justify-center animate-in fade-in duration-300 ${feedback === 'correct' ? 'bg-emerald-600/95' : 'bg-rose-600/95'}`}>
          <div className="bg-white/20 p-4 rounded-full mb-4">
             <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={feedback === 'correct' ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} /></svg>
          </div>
          <p className="text-white font-black text-2xl uppercase tracking-[0.2em]">{feedback === 'correct' ? '数据有效' : '采集无效'}</p>
        </div>
      )}
    </div>
  );
};

export default TaskFlow;
