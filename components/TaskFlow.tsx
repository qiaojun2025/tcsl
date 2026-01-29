
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
  
  const [showPreview, setShowPreview] = useState(isCollection && !isCustom);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'skipped' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [hasCaptured, setHasCaptured] = useState(false);
  
  // Simulated image duplication check state
  const capturedFingerprints = useRef<Set<string>>(new Set());
  
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
          ? '请录制5-10秒视频。保持相机稳定，主体清晰。' 
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
    if (type === TaskType.QUICK_JUDGMENT && mediaType === 'IMAGE') {
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
    } catch (e) { alert('权限请求失败，请检查设置。'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setHasCaptured(true);
  };

  const validateAndSubmit = async () => {
    if (mediaType === 'AUDIO' && mediaBlob) {
      if (mediaBlob.size > 2 * 1024 * 1024) {
        alert('语音文件超过 2MB，请重新录制。');
        return;
      }
    }
    if (mediaType === 'IMAGE') {
      // Simulated fingerprint for duplicate check
      const fingerprint = `fp-${Math.floor(Math.random() * 20)}`; 
      if (capturedFingerprints.current.has(fingerprint)) {
        alert('校验结果：检测到图片高度重复，请拍摄一个更独特的视角。');
        setHasCaptured(false);
        return;
      }
      capturedFingerprints.current.add(fingerprint);
    }
    handleNext(true);
  };

  if (showPreview) {
    return (
      <div className="bg-[#161618] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/5 animate-in zoom-in-95 duration-500 max-h-[85vh]">
        <div className="bg-[#1A4BD3] p-6 text-white shrink-0 shadow-lg">
          <h2 className="text-2xl font-black mb-1">{category || "任务预览"}</h2>
          <p className="text-blue-100 text-[11px] font-bold opacity-90 leading-relaxed tracking-wider uppercase">
            数据贡献任务预览
          </p>
        </div>
        
        <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-[#161618]">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
              <span className="text-[11px] font-black text-white/50 uppercase tracking-widest">采集清单 ({taskQueue.length}项)</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 space-y-2.5 border border-white/5">
              {taskQueue.map((t, idx) => (
                <div key={idx} className="flex items-start text-sm text-white/80 font-bold border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <span className="w-6 text-blue-500 font-mono text-xs font-black">{idx + 1}.</span>
                  <span className="flex-1">{t.prompt}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
              <span className="text-[11px] font-black text-white/50 uppercase tracking-widest">采集要求</span>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-500 leading-relaxed font-bold italic">
              {taskQueue[0]?.requirement}
            </div>
          </div>
        </div>

        <div className="p-6 bg-black/20 border-t border-white/5 shrink-0">
          <div className="grid grid-cols-2 gap-4">
            <button onClick={onCancel} className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white/50 font-black active:bg-white/10 transition-colors">取消退出</button>
            <button onClick={() => setShowPreview(false)} className="py-4 rounded-2xl bg-[#1A4BD3] text-white font-black shadow-xl shadow-blue-500/10 active:scale-95 transition-all">确认开始</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#161618] rounded-3xl p-6 shadow-2xl relative border border-white/5 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-full uppercase border border-blue-400/20">
          {isCustom ? `自定义环节 (${currentIndex + 1}/10)` : `进度: ${step} / ${currentTotal}`}
        </span>
        <button onClick={() => handleNext('skipped')} className="text-[10px] font-black text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full active:bg-red-500/20 transition-colors">退出当前</button>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-bold text-white leading-tight mb-1">
          {type === TaskType.QUICK_JUDGMENT ? `图中是否包含 ${currentTask?.target}?` : `采集目标：${currentTask?.prompt}`}
        </h3>
        <p className="text-[10px] text-white/30 font-bold leading-relaxed">{currentTask?.requirement}</p>
      </div>

      <div className="mt-4 min-h-[260px] flex flex-col items-center justify-center bg-black/20 rounded-3xl border-2 border-dashed border-white/5 overflow-hidden relative">
        {type === TaskType.QUICK_JUDGMENT && mediaType === 'IMAGE' ? (
          <div className="w-full h-full flex flex-col p-4 space-y-4">
            <img src={currentTask?.imageUrl} className="aspect-square rounded-2xl object-cover shadow-inner bg-black" alt="Judge" />
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleNext(true)} className="py-4 border-2 border-[#1A4BD3] text-[#3E8BFF] font-bold rounded-2xl active:bg-[#1A4BD3] active:text-white transition-all">包含</button>
              <button onClick={() => handleNext(false)} className="py-4 border-2 border-white/5 text-white/30 font-bold rounded-2xl active:bg-white/10 transition-all">不包含</button>
            </div>
          </div>
        ) : (
          <div className="w-full p-4 space-y-4">
            {mediaType === 'VIDEO' ? (
              <div className="w-full aspect-video bg-black rounded-2xl relative overflow-hidden">
                <video ref={videoPreviewRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                {isRecording && <div className="absolute top-4 left-4 flex items-center space-x-1.5 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-full animate-pulse"><span>REC</span></div>}
              </div>
            ) : mediaType === 'AUDIO' ? (
              <div className="w-full h-32 bg-white/5 rounded-2xl flex flex-col items-center justify-center border border-white/5">
                 {isRecording && <div className="flex space-x-1 mb-2 animate-bounce">{[...Array(5)].map((_, i) => <div key={i} className="w-1 bg-blue-500 rounded-full" style={{height: `${Math.random()*15 + 10}px`}}></div>)}</div>}
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{isRecording ? '录制中...' : '准备录音'}</span>
              </div>
            ) : (
              <div className={`w-full aspect-square bg-white/5 border-2 border-white/5 rounded-3xl flex flex-col items-center justify-center relative transition-all ${hasCaptured ? 'bg-blue-500/10 border-blue-500/20' : ''}`} onClick={() => !hasCaptured && setHasCaptured(true)}>
                {hasCaptured ? <div className="flex flex-col items-center animate-in zoom-in"><svg className="w-12 h-12 text-blue-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg><span className="text-[10px] font-bold text-blue-500 uppercase">采集成功</span></div> : <div className="flex flex-col items-center text-white/20"><svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span className="text-[10px] font-bold uppercase">拍摄或上传图片</span></div>}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {(mediaType === 'VIDEO' || mediaType === 'AUDIO') ? (
                isRecording ? (
                  <button onClick={stopRecording} className="py-4 bg-red-600 text-white font-bold rounded-2xl active:scale-95 transition-all">停止</button>
                ) : (
                  <button onClick={startRecording} className="py-4 bg-[#1A4BD3] text-white font-bold rounded-2xl active:scale-95 transition-all">{hasCaptured ? '重新采集' : '开始采集'}</button>
                )
              ) : (
                <button onClick={() => setHasCaptured(true)} className="py-4 bg-[#1A4BD3] text-white font-bold rounded-2xl active:scale-95 transition-all">{hasCaptured ? '重新采集' : '点击采集'}</button>
              )}
              
              {hasCaptured && !isRecording && (
                <button onClick={validateAndSubmit} className="py-4 bg-[#10B981] text-white font-bold rounded-2xl animate-in fade-in slide-in-from-top-2">确认提交</button>
              )}
            </div>
          </div>
        )}
      </div>

      {feedback && feedback !== 'skipped' && (
        <div className={`absolute inset-0 z-[60] rounded-3xl flex flex-col items-center justify-center animate-in fade-in duration-300 ${feedback === 'correct' ? 'bg-[#10B981]/95' : 'bg-red-600/95'}`}>
          <div className="bg-white/20 p-4 rounded-full mb-4">
             <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={feedback === 'correct' ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} /></svg>
          </div>
          <p className="text-white font-black text-2xl uppercase tracking-widest">{feedback === 'correct' ? '通过' : '无效'}</p>
        </div>
      )}
    </div>
  );
};

export default TaskFlow;
