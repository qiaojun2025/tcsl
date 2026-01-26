
import React, { useState, useEffect, useRef } from 'react';
import { TaskType, Difficulty, CollectionCategory, MediaType } from '../types.ts';
import { getPlaceholderImage, CATEGORIES } from '../services/imageRecognition.ts';

interface TaskFlowProps {
  type: TaskType;
  category?: CollectionCategory;
  difficulty: Difficulty;
  mediaType?: MediaType;
  onComplete: (score: number, type: TaskType, performance: { correctCount: number; totalCount: number; startTime: number; endTime: number }) => void;
  onCancel: () => void;
}

const SAMPLE_DATA: any = {
  [CollectionCategory.ANIMAL]: ['小狗', '小猫', '小鸟', '金鱼', '乌龟', '兔子', '蝴蝶', '蜜蜂', '鸽子', '松鼠'],
  [CollectionCategory.PLANT]: ['月季', '松树', '多肉', '红枫', '向日葵', '仙人掌', '银杏', '荷花', '芦荟', '绿萝'],
  [CollectionCategory.PERSON]: ['人脸特征', '握拳手势', '正常行走', '端正坐姿', '背影轮廓', '快速奔跑', '原地跳跃', '单手挥动', '侧脸剪影', '低头阅读'],
  [CollectionCategory.STREET]: ['沿街招牌', '斑马线', '红绿灯', '过街天桥', '公交站牌', '共享单车', '垃圾桶', '消防栓', '路边长椅', '报刊亭'],
  [CollectionCategory.LIFE]: ['咖啡杯', '记事本', '餐椅', '显示器', '充电线', '雨伞', '钥匙扣', '鼠标', '台灯', '水壶'],
  [CollectionCategory.AUDIO]: ['数字0-9', '称呼词语', '环境雨声', '键盘敲击', '纸张翻动', '木门开关', '倒水声', '时钟滴答', '爽朗笑声', '掌声雷动'],
  [CollectionCategory.VIDEO]: ['在安全道路上正常行走']
};

const TaskFlow: React.FC<TaskFlowProps> = ({ type, category, difficulty, mediaType, onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [totalSteps] = useState(mediaType === 'VIDEO' ? 1 : 10);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [taskQueue, setTaskQueue] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(type === TaskType.COLLECTION);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'skipped' | null>(null);
  const [customAnnotation, setCustomAnnotation] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [hasCaptured, setHasCaptured] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const queue = [];
    const isCustom = category === CollectionCategory.CUSTOM;
    const pool = isCustom ? [] : (SAMPLE_DATA[category!] || ['默认项']);
    
    for (let i = 0; i < totalSteps; i++) {
      const prompt = isCustom ? '自定义标注内容' : (pool[i] || pool[0]);
      queue.push({
        id: i,
        prompt: prompt,
        requirement: mediaType === 'VIDEO' 
          ? '在人行道上或绕过障碍物正常行走的同时，使用应用内相机录制视频。将相机保持在胸部高度，避免直接拍摄他人的面部。' 
          : mediaType === 'AUDIO' 
          ? '请在安静环境下录制，确保语音清晰有力，不要有杂音干扰。'
          : '确保采集主体在画面中央，光线适中，背景尽量简洁。'
      });
    }
    setTaskQueue(queue);
    generateCurrentTask(0, queue);
  }, [type, category, totalSteps, mediaType]);

  const generateCurrentTask = (idx: number, queue: any[]) => {
    setFeedback(null);
    setMediaBlob(null);
    setCustomAnnotation('');
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
        onComplete(score + (isActuallyCorrect ? getPoints() : 0), type, {
          correctCount: correctCount + (isActuallyCorrect ? 1 : 0),
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
        setMediaBlob(new Blob(chunks, { type: mediaType === 'VIDEO' ? 'video/webm' : 'audio/webm' }));
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) { alert('媒体权限获取失败，请检查浏览器权限设置。'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setHasCaptured(true);
  };

  const validateAndSubmit = async () => {
    const isCustom = category === CollectionCategory.CUSTOM;
    if (isCustom && !customAnnotation.trim()) {
      alert('标注内容不能为空，请输入标注内容。'); 
      return;
    }
    
    if (mediaType === 'AUDIO' && mediaBlob && mediaBlob.size > 2 * 1024 * 1024) {
      alert('语音文件超过 2 MB 限制，请重新录制。'); 
      return;
    }

    if (mediaType === 'IMAGE') {
      if (Math.random() < 0.05) { // Duplicate simulation
        alert('图片重复校验未通过，请尝试重新拍摄。');
        return;
      }
    }

    handleNext(true);
  };

  if (showPreview) {
    const isCustom = category === CollectionCategory.CUSTOM;
    return (
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-100 animate-in zoom-in-95 duration-500">
        {/* 1. 标题区域 */}
        <div className="bg-blue-600 p-6 text-white shrink-0">
          <h2 className="text-2xl font-black mb-1">{isCustom ? '自定义分类' : category}</h2>
          <p className="text-blue-100 text-xs opacity-90 leading-relaxed font-bold">参与此项任务可以提高你的报酬结算比例。</p>
        </div>
        
        {/* 2. 任务区域 */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[40vh]">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
              <span className="text-sm font-black text-gray-900 tracking-wider">采集列表</span>
            </div>
            {isCustom ? (
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center opacity-60 italic">
                <p className="text-xs text-gray-500 font-bold">自定义分类，任务列表将在采集时动态定义。</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100">
                {taskQueue.map((t, idx) => (
                  <div key={idx} className="flex items-center text-sm text-gray-700 py-1.5 border-b border-gray-200/50 last:border-0">
                    <span className="w-6 text-blue-500 font-mono text-xs font-black">{idx + 1}.</span>
                    <span className="font-bold">{t.prompt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. 任务要求区域 */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-1.5 h-4 bg-green-500 rounded-full"></span>
              <span className="text-sm font-black text-gray-900 tracking-wider">采集要求</span>
            </div>
            <div className="bg-green-50/50 border border-green-100 rounded-2xl p-4">
              <p className="text-sm text-green-800 leading-relaxed font-bold opacity-80">
                {taskQueue[0]?.requirement}
              </p>
            </div>
          </div>
        </div>

        {/* 4. 按钮区域 */}
        <div className="p-6 bg-white border-t border-gray-50 shrink-0">
          <p className="text-[11px] text-gray-400 text-center mb-4 uppercase font-black tracking-[0.2em] opacity-80">继续完成采集任务</p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={onCancel} className="py-4 rounded-2xl bg-gray-100 text-gray-600 font-black active:bg-gray-200 transition-colors">返回</button>
            <button onClick={() => setShowPreview(false)} className="py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-100 active:scale-95 transition-all">开始按钮</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-widest border border-blue-100">进度 {step} / {totalSteps}</span>
        <button onClick={() => handleNext('skipped')} className="text-[10px] font-black text-red-500 bg-red-50 px-3 py-1.5 rounded-full uppercase active:bg-red-100 transition-colors">退出跳过</button>
      </div>

      <div className="mb-6">
        <h3 className="text-2xl font-black text-gray-900 leading-tight mb-2 tracking-tight">
          {type === TaskType.QUICK_JUDGMENT ? `它是 ${currentTask?.target} 吗？` : `目标：${currentTask?.prompt}`}
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed font-black opacity-60 uppercase">{currentTask?.requirement}</p>
      </div>

      <div className="mt-4 min-h-[220px] flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 overflow-hidden relative group">
        {type === TaskType.QUICK_JUDGMENT ? (
          <div className="w-full h-full flex flex-col p-4 space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-inner bg-white">
              <img src={currentTask?.imageUrl} className="w-full h-full object-cover" alt="Task" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleNext(true)} className="py-4 bg-white border-2 border-blue-600 text-blue-600 font-black rounded-2xl active:bg-blue-600 active:text-white transition-all transform active:scale-95">是</button>
              <button onClick={() => handleNext(false)} className="py-4 bg-white border-2 border-gray-200 text-gray-400 font-black rounded-2xl active:bg-gray-100 transition-all transform active:scale-95">否</button>
            </div>
          </div>
        ) : (
          <div className="w-full p-4 space-y-4">
            {mediaType === 'VIDEO' ? (
              <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative shadow-inner">
                <video ref={videoPreviewRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                {isRecording && (
                  <div className="absolute top-4 left-4 flex items-center bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 bg-white rounded-full mr-2"></span>REC
                  </div>
                )}
              </div>
            ) : mediaType === 'AUDIO' ? (
              <div className="w-full h-32 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center border border-indigo-100 relative">
                {isRecording ? (
                  <div className="flex items-end space-x-1.5 h-10">
                    {[1,2,3,4,5,6,7,8].map(i => (
                      <div key={i} className="w-1.5 bg-indigo-500 rounded-full animate-bounce" style={{height: `${Math.random()*30+10}px`, animationDelay: `${i*0.1}s`}}></div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <svg className="w-10 h-10 text-indigo-400 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                    <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">录音器就绪</span>
                  </div>
                )}
              </div>
            ) : (
              <div className={`w-full aspect-square bg-white border-2 border-gray-100 rounded-3xl flex flex-col items-center justify-center transition-all ${hasCaptured ? 'border-green-200 bg-green-50' : 'hover:border-blue-100 cursor-pointer'}`} onClick={() => !hasCaptured && setHasCaptured(true)}>
                {hasCaptured ? (
                  <div className="flex flex-col items-center text-green-600 animate-in zoom-in duration-300">
                    <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">捕获成功</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-gray-300">
                    <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">点击模拟拍照</span>
                  </div>
                )}
              </div>
            )}

            {category === CollectionCategory.CUSTOM && (
              <div className="animate-in slide-in-from-bottom-2 duration-300">
                 <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">采集标注内容</label>
                 <input 
                   placeholder={mediaType === 'AUDIO' ? "请输入语音文本内容..." : (mediaType === 'VIDEO' ? "请输入视频标注内容..." : "请输入图片标注内容...")} 
                   className={`w-full px-5 py-4 bg-white border-2 ${customAnnotation.trim() ? 'border-blue-100' : 'border-red-50'} rounded-2xl outline-none focus:border-blue-500 transition-all text-sm font-bold`}
                   value={customAnnotation}
                   onChange={e => setCustomAnnotation(e.target.value)}
                 />
                 {!customAnnotation.trim() && <p className="text-[9px] text-red-500 font-black mt-2">必填项，内容不能为空。</p>}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {(mediaType === 'VIDEO' || mediaType === 'AUDIO') ? (
                isRecording ? (
                  <button onClick={stopRecording} className="py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-100 transition-all active:scale-95">停止录制</button>
                ) : (
                  <button onClick={startRecording} className="py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95">{hasCaptured ? '重新录制' : '开始录制'}</button>
                )
              ) : (
                <button onClick={() => { setHasCaptured(true); alert('模拟：已通过相机接口捕获新照片'); }} className="py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95">{hasCaptured ? '重新拍照' : '点击拍照'}</button>
              )}
              
              {hasCaptured && !isRecording && (
                <button onClick={validateAndSubmit} className={`py-4 ${category === CollectionCategory.CUSTOM && !customAnnotation.trim() ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white shadow-green-100 shadow-xl active:scale-95'} font-black rounded-2xl transition-all animate-in fade-in`}>确认提交并采集</button>
              )}
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`absolute inset-0 z-[60] flex flex-col items-center justify-center animate-in fade-in duration-300 ${feedback === 'correct' ? 'bg-green-600/95' : feedback === 'wrong' ? 'bg-red-600/95' : 'bg-gray-800/95'}`}>
          <div className="bg-white rounded-full p-6 mb-4 shadow-2xl scale-125">
            {feedback === 'correct' ? <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg> : <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>}
          </div>
          <p className="text-white font-black text-2xl tracking-tighter uppercase">{feedback === 'correct' ? '采集验证通过' : feedback === 'wrong' ? '验证未通过' : '已跳过'}</p>
        </div>
      )}
    </div>
  );
};

export default TaskFlow;
