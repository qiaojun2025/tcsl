import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TaskType, Difficulty, CollectionCategory } from '../types.ts';
import { getPlaceholderImage, getRandomCategory, CATEGORIES } from '../services/imageRecognition.ts';

interface TaskFlowProps {
  type: TaskType;
  category?: CollectionCategory;
  difficulty: Difficulty;
  onComplete: (score: number, type: TaskType, performance: { correctCount: number; totalCount: number; startTime: number; endTime: number }) => void;
  onCancel: () => void;
}

const CATEGORY_MAP: Record<string, string> = {
  'dog': '狗', 'cat': '猫', 'car': '汽车', 'person': '人', 'bicycle': '自行车', 
  'motorcycle': '摩托车', 'bird': '鸟', 'bottle': '瓶子', 'chair': '椅子', 'laptop': '笔记本电脑'
};

const COLLECTION_POOLS: Record<CollectionCategory, Record<Difficulty, string[]>> = {
  [CollectionCategory.ANIMAL]: {
    [Difficulty.EASY]: ['狗', '猫', '老虎', '狮子', '兔子', '仓鼠', '金鱼', '乌龟', '鹦鹉', '鸭子'],
    [Difficulty.MEDIUM]: ['白色的狗', '黑色的猫', '正在奔跑的马', '睡着的考拉', '吃竹子的熊猫', '树上的猴子', '飞翔的老鹰', '水里的河马', '斑点狗', '三花猫'],
    [Difficulty.HARD]: ['狗接飞盘', '猫捕猎', '鸟喂食', '蚂蚁搬家', '鱼跃出水面', '宠物洗澡', '动物打哈欠', '蝴蝶停在花朵', '蜘蛛织网', '壁虎爬墙']
  },
  [CollectionCategory.PLANT]: {
    [Difficulty.EASY]: ['玫瑰', '梧桐树', '向日葵', '仙人掌', '荷花', '柳树', '银杏叶', '蒲公英', '竹子', '梅花'],
    [Difficulty.MEDIUM]: ['盛开的红玫瑰', '秋天的梧桐树叶', '带刺的仙人掌', '紫色的薰衣草', '白色的百合花', '巨大的榕树', '爬满墙的爬山虎', '多肉植物特写', '水中的睡莲', '松树的松果'],
    [Difficulty.HARD]: ['丁达尔效应下的树叶', '沾满露水的花瓣', '植物种子破土', '枯木逢春', '花朵绽放过程', '风吹麦浪', '树根错综复杂', '苔藓微观世界', '落叶铺满地面', '果实挂满枝头']
  },
  [CollectionCategory.PERSON]: {
    [Difficulty.EASY]: ['手部照片', '腿部照片', '正脸自拍', '侧脸照片', '背影照片', '脚部特写', '眼睛特写', '耳朵特写', '头发特写', '手臂照片'],
    [Difficulty.MEDIUM]: ['带手表的手腕', '穿着运动鞋的脚', '戴眼镜的人像', '扎马尾的背影', '涂指甲油的手', '穿着西装的半身像', '戴帽子的人像', '穿着裙子的全身像', '正在看书的侧脸', '拿着手机的手'],
    [Difficulty.HARD]: ['弹钢琴的手', '跑步的腿部动态', '大笑的人物表情', '老人布满皱纹的手', '婴儿熟睡', '做瑜伽的高难度动作', '专注画画的人', '跳舞的动态模糊', '工人挥汗如雨', '医生正在工作']
  },
  [CollectionCategory.STREET]: {
    [Difficulty.EASY]: ['城市街道', '农村田野', '乡镇集市', '学校大门', '公交车站', '天桥', '十字路口', '公园长椅', '便利店门口', '路灯'],
    [Difficulty.MEDIUM]: ['图书馆正面', '农村的麦田', '胡同的入口', '陆家嘴远景', '广州塔夜景', '茶馆门口', '西湖断桥', '轻轨穿楼', '长江大桥', '冰雪大世界'],
    [Difficulty.HARD]: ['夜晚CBD', '清晨无人的街道', '雨中十字路口', '夕阳下的田野', '施工工地', '早市摊位', '老旧小区墙面', '火车站广场', '地铁站人群', '雪后初晴街道']
  },
  [CollectionCategory.LIFE]: {
    [Difficulty.EASY]: ['作业本', '做饭的锅铲', '洗碗的海绵', '牙刷', '毛巾', '水杯', '拖鞋', '遥控器', '枕头', '充电器'],
    [Difficulty.MEDIUM]: ['写满字的作业', '正在翻炒的菜肴', '堆满泡沫的碗筷', '刚洗好的水果', '折叠整齐的衣服', '摆放整齐的书桌', '热气腾腾的咖啡', '播放画面的电视', '打开的笔记本电脑', '挂满衣服的衣架'],
    [Difficulty.HARD]: ['正在洗碗', '正在做饭', '正在打扫房间', '辅导孩子写作业', '修理家电', '整理衣柜', '给宠物喂食', '正在浇花', '正在熨衣服', '组装家具']
  },
  [CollectionCategory.AUDIO]: {
    [Difficulty.EASY]: ['朗读：人工智能改变世界', '朗读：Web3重塑价值', '朗读：慢生活与健康', '朗读：区块链信任机制', '朗读：环境保护', '朗读：终身学习', '朗读：阅读的意义', '朗读：健康运动', '朗读：数字经济', '朗读：诚信立本'],
    [Difficulty.MEDIUM]: ['朗读数字：9527', '朗读：狐狸跳过狗', '朗读：葡萄皮绕口令', '大声说出名字', '朗读：红鲤鱼与绿鲤鱼', '朗读今天日期', '模仿猫叫', '大声说出名字', '朗读：八百标兵', '唱一句歌词'],
    [Difficulty.HARD]: ['环境音：咖啡厅/街道', '窗外的风雨声', '键盘敲击声', '电视广播背景音', '公交地铁运行声', '厨房做饭声', '公园鸟叫声', '商场人声', '汽车内部声音', '图书馆翻书声']
  },
  [CollectionCategory.VIDEO]: {
    [Difficulty.EASY]: ['旋转展示矿泉水', '旋转展示水杯', '旋转展示书籍', '旋转展示手机', '旋转展示遥控器', '旋转展示鼠标', '旋转展示苹果', '旋转展示订书机', '旋转展示闹钟', '旋转展示玩具'],
    [Difficulty.MEDIUM]: ['便利店收银台', '公交站台候车', '公园长椅环境', '咖啡厅吧台', '图书馆书架', '办公室工位', '健身房器械', '停车场入口', '学校操场', '商场扶梯'],
    [Difficulty.HARD]: ['扫码支付过程', '自动售货机购买', '共享单车开锁', 'ATM机操作', '电梯按键操作', '自助点餐机下单', '复印机操作', '微波炉加热', '洗衣机设置', '电脑登录邮箱']
  }
};

const getSubmittedFileHashes = (): Set<string> => {
    try {
        const hashes = localStorage.getItem('submitted_file_hashes');
        return hashes ? new Set(JSON.parse(hashes)) : new Set();
    } catch (e) {
        return new Set();
    }
};

const addSubmittedFileHash = (hash: string) => {
    const hashes = getSubmittedFileHashes();
    hashes.add(hash);
    localStorage.setItem('submitted_file_hashes', JSON.stringify(Array.from(hashes)));
};

const computeFileHash = async (file: File | Blob): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const TaskFlow: React.FC<TaskFlowProps> = ({ type, category, difficulty, onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(10);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [taskQueue, setTaskQueue] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'skipped' | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [showIntro, setShowIntro] = useState(type === TaskType.COLLECTION);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const count = category === CollectionCategory.VIDEO ? 1 : 10;
    setTotalSteps(count);
    
    const newQueue: any[] = [];
    
    if (type === TaskType.QUICK_JUDGMENT) {
        for(let i=0; i<count; i++) newQueue.push({ type: 'QUICK', index: i });
    } else {
        const pool = COLLECTION_POOLS[category!][difficulty];
        for (let i = 0; i < count; i++) {
            const prompt = pool[Math.floor(Math.random() * pool.length)];
            
            let description = `请采集一张【${prompt}】的照片。`;
            let requirements = ["图片主体清晰可见", "禁止使用网络图片", "光线充足"];

            if (category === CollectionCategory.VIDEO) {
                 description = `请拍摄一段清晰的【${prompt}】视频。`;
                 requirements = ["画面无剧烈抖动", "时长需大于5秒", "需包含完整主体动作"];
            } else if (category === CollectionCategory.AUDIO) {
                 description = `请录制：${prompt}`;
                 requirements = ["环境安静清晰", "语速适中", "文件大小限制 2MB 内"];
            }

            newQueue.push({
                prompt,
                description,
                requirements,
                theme: category
            });
        }
    }
    setTaskQueue(newQueue);
    setIsLoading(false);
  }, [type, category, difficulty]);

  useEffect(() => {
      if (taskQueue.length > 0 && step <= taskQueue.length) {
          generateTaskContent(taskQueue[step - 1]);
      }
  }, [step, taskQueue]);

  const generateTaskContent = useCallback((queueItem: any) => {
    setIsLoading(true);
    setFeedback(null);
    setSelectedIds([]);
    setMediaBlob(null);
    setRecordingDuration(0);
    setIsRecording(false);
    
    if (type === TaskType.QUICK_JUDGMENT) {
      let target = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const targetName = CATEGORY_MAP[target] || target;

      if (difficulty === Difficulty.EASY) {
        const other = CATEGORIES.filter(c => c !== target)[0];
        setCurrentTask({ 
          title: `请判断下图中的主要内容是什么？`, 
          target, 
          imageUrl: getPlaceholderImage(target),
          options: [{ id: target, label: targetName }, { id: other, label: CATEGORY_MAP[other] || other }].sort(() => Math.random() - 0.5)
        });
      } else if (difficulty === Difficulty.MEDIUM) {
        const isNegative = Math.random() > 0.5;
        setCurrentTask({
          title: isNegative ? `请选择：【不是】${targetName}的图片` : `请选择：包含【${targetName}】的图片`,
          isNegative,
          target,
          images: Array.from({length: 3}).map((_, i) => ({ 
            url: getPlaceholderImage(i === 0 ? target : getRandomCategory()), 
            cat: i === 0 ? target : 'other' 
          })).sort(() => Math.random() - 0.5)
        });
      } else {
        setTimeLeft(10);
        setCurrentTask({
          title: `请在10秒内选出所有【${targetName}】`,
          target,
          images: Array.from({length: 6}).map((_, i) => ({ 
            id: i, url: getPlaceholderImage(i < 3 ? target : getRandomCategory()), 
            cat: i < 3 ? target : 'other' 
          })).sort(() => Math.random() - 0.5)
        });
      }
    } else {
      setCurrentTask(queueItem);
    }
    setTimeout(() => setIsLoading(false), 300);
  }, [type, difficulty]);

  useEffect(() => {
    if (timeLeft > 0 && !feedback) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !feedback && currentTask && type === TaskType.QUICK_JUDGMENT && difficulty === Difficulty.HARD) {
        handleQuickHardSubmit();
    }
  }, [timeLeft, feedback, difficulty, type, currentTask]);

  const getPoints = () => {
    if (category === CollectionCategory.VIDEO) {
        if (difficulty === Difficulty.EASY) return 10;
        if (difficulty === Difficulty.MEDIUM) return 20;
        return 30;
    }
    if (difficulty === Difficulty.EASY) return 1;
    if (difficulty === Difficulty.MEDIUM) return 3;
    return 6;
  };

  const startRecording = async (isVideo: boolean) => {
    try {
      const constraints = isVideo ? { audio: true, video: { facingMode: "environment" } } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (isVideo && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true; 
        videoPreviewRef.current.play();
      }
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const mimeType = isVideo ? 'video/webm' : 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        setMediaBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
      };
      mediaRecorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } catch (err) { alert(`无法访问设备`); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  const handleMediaSubmit = async () => {
    if (!mediaBlob) return;
    
    if (category === CollectionCategory.AUDIO && mediaBlob.size > 2 * 1024 * 1024) {
        alert("音频文件不能超过 2 MB，请重新录制。");
        setMediaBlob(null); setRecordingDuration(0); return;
    }

    const hash = await computeFileHash(mediaBlob);
    const submittedHashes = getSubmittedFileHashes();
    if (submittedHashes.has(hash)) {
        setShowDuplicateWarning(true);
        setTimeout(() => setShowDuplicateWarning(false), 3000);
    } else {
        addSubmittedFileHash(hash);
        submitResult(true);
    }
  };

  const handleQuickHardSubmit = () => {
    if (!currentTask || !currentTask.images) return;
    const isCorrect = selectedIds.length > 0 && selectedIds.every(id => {
      const img = currentTask.images.find((img: any) => img.id === id);
      return img && img.cat === currentTask.target;
    });
    submitResult(isCorrect);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setIsUploading(true);
    
    if (category === CollectionCategory.AUDIO && file.size > 2 * 1024 * 1024) {
         alert("音频文件不能超过 2 MB。");
         event.target.value = ''; setIsUploading(false); return;
    }

    try {
        const hash = await computeFileHash(file);
        const submittedHashes = getSubmittedFileHashes();
        if (submittedHashes.has(hash)) {
            setShowDuplicateWarning(true);
            setTimeout(() => setShowDuplicateWarning(false), 3000);
            event.target.value = ''; setIsUploading(false); return;
        }
        addSubmittedFileHash(hash);
        submitResult(true);
        setIsUploading(false);
    } catch (error) { setIsUploading(false); }
  };

  const submitResult = (isCorrect: boolean | 'skipped') => {
    if (feedback) return;
    const isActuallyCorrect = isCorrect === true;
    setFeedback(isCorrect === 'skipped' ? 'skipped' : (isActuallyCorrect ? 'correct' : 'wrong'));
    const pts = isActuallyCorrect ? getPoints() : 0;
    
    setTimeout(() => {
      const newScore = score + pts;
      const newCorrectCount = isActuallyCorrect ? correctCount + 1 : correctCount;
      setScore(newScore);
      setCorrectCount(newCorrectCount);
      
      if (step < totalSteps) {
        setStep(prev => prev + 1);
      } else {
        onComplete(newScore, type, {
          correctCount: newCorrectCount,
          totalCount: totalSteps,
          startTime: startTime,
          endTime: Date.now()
        });
      }
    }, 1000);
  };

  if (showIntro) {
    return (
      <div className="bg-white rounded-2xl p-0 shadow-lg w-full relative overflow-hidden flex flex-col max-h-[85vh]">
         <div className="bg-blue-600 p-6 text-white">
             <h2 className="text-2xl font-black mb-1">任务预览</h2>
             <p className="text-blue-100 text-sm">{category} - {difficulty}</p>
         </div>

         <div className="p-6 overflow-y-auto space-y-6 flex-1">
             <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                    待采集任务 ({totalSteps}项)
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                    {taskQueue.map((t, idx) => (
                        <div key={idx} className="flex text-sm text-gray-600 font-medium">
                            <span className="mr-3 text-gray-400 font-mono">#{idx+1}</span>
                            <span>{t.prompt}</span>
                        </div>
                    ))}
                </div>
             </div>
             
             <div>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                    任务规范
                </h3>
                <ul className="text-xs text-gray-500 space-y-1 ml-3.5 list-disc">
                    <li>确保环境光线充足，拍摄主体清晰</li>
                    <li>严禁提交重复、低质量或网络素材</li>
                    <li>{category === CollectionCategory.AUDIO ? '音频录制需保持安静，吐字清晰' : '提交后的数据将经过共识节点校验'}</li>
                </ul>
             </div>
         </div>
         
         <div className="p-6 pt-0">
            <button onClick={() => setShowIntro(false)} className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold shadow-lg active:scale-95 transition-transform text-lg mb-3">
                开始执行
            </button>
            <button onClick={onCancel} className="w-full py-3 rounded-xl bg-gray-50 text-gray-500 font-bold active:bg-gray-100 transition-colors">
                退出
            </button>
         </div>
      </div>
    );
  }

  if (isLoading || !currentTask) return null;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-lg w-full relative overflow-hidden animate-in fade-in">
      <div className="flex justify-between items-center mb-4">
        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">Progress {step}/{totalSteps}</span>
        <button onClick={() => submitResult('skipped')} className="text-gray-400 hover:text-blue-600 text-xs font-bold underline">退出当前并跳过</button>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-4 leading-tight">
        {type === TaskType.QUICK_JUDGMENT ? currentTask.title : currentTask.description}
      </h1>

      {type === TaskType.QUICK_JUDGMENT ? (
        <div className="space-y-4">
            {difficulty === Difficulty.EASY && (
              <div className="space-y-4">
                <div className="w-full aspect-square rounded-xl overflow-hidden shadow-inner bg-gray-100 border border-gray-100">
                   <img src={currentTask.imageUrl} className="w-full h-full object-cover" alt="Target" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {currentTask.options?.map((opt: any) => (
                    <button key={opt.id} onClick={() => submitResult(opt.id === currentTask.target)} className="py-3.5 rounded-xl bg-white text-blue-600 font-bold border-2 border-blue-50 active:bg-blue-50 transition-colors">{opt.label}</button>
                  ))}
                </div>
              </div>
            )}
            {difficulty === Difficulty.MEDIUM && (
              <div className="grid grid-cols-3 gap-2">
                {currentTask.images.map((img: any, i: number) => (
                  <div key={i} onClick={() => submitResult(currentTask.isNegative ? img.cat !== currentTask.target : img.cat === currentTask.target)} className="aspect-square rounded-xl overflow-hidden cursor-pointer active:scale-95 border border-gray-100">
                    <img src={img.url} className="w-full h-full object-cover" alt="Option" />
                  </div>
                ))}
              </div>
            )}
            {difficulty === Difficulty.HARD && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {currentTask.images.map((img: any) => (
                    <div key={img.id} onClick={() => setSelectedIds(prev => prev.includes(img.id) ? prev.filter(x => x !== img.id) : [...prev, img.id])} className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-4 ${selectedIds.includes(img.id) ? 'border-blue-600' : 'border-transparent'}`}>
                      <img src={img.url} className="w-full h-full object-cover" alt="Option" />
                      {selectedIds.includes(img.id) && <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-0.5 text-white"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg></div>}
                    </div>
                  ))}
                </div>
                <button onClick={handleQuickHardSubmit} disabled={selectedIds.length === 0} className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold shadow-lg disabled:bg-gray-100 disabled:text-gray-400">提交选择</button>
              </div>
            )}
        </div>
      ) : (
        <div className="space-y-4">
            {isRecording && (
                <div className="space-y-4">
                <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative">
                    <video ref={videoPreviewRef} className="w-full h-full object-cover" playsInline autoPlay muted />
                    <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600/90 text-white font-mono text-xs px-2.5 py-1.5 rounded-full animate-pulse">
                        <span className="w-2 h-2 bg-white rounded-full"></span>
                        <span>REC {recordingDuration}s</span>
                    </div>
                </div>
                <button onClick={stopRecording} className="w-full py-4 rounded-xl bg-red-600 text-white font-bold shadow-lg">结束录制</button>
                </div>
            )}

            {!isRecording && mediaBlob && (
                <div className="space-y-4">
                <div className="w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center border-4 border-gray-100">
                    {category === CollectionCategory.VIDEO ? <video src={URL.createObjectURL(mediaBlob)} className="w-full h-full object-contain" controls /> : <div className="text-white font-bold text-center p-4">🎙️ 已就绪 ({recordingDuration}s)<br/><span className="text-[10px] text-gray-500">{(mediaBlob.size / 1024 / 1024).toFixed(2)} MB</span></div>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setMediaBlob(null); setRecordingDuration(0); }} className="py-4 rounded-xl border-2 border-gray-100 font-bold text-gray-500">重录</button>
                    <button onClick={handleMediaSubmit} className="py-4 rounded-xl bg-blue-600 text-white font-bold shadow-lg">上传提交</button>
                </div>
                </div>
            )}

            {!isRecording && !mediaBlob && (
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => document.getElementById('file-upload')?.click()} className="h-32 flex flex-col items-center justify-center rounded-2xl border-2 border-gray-100 bg-white active:bg-gray-50 transition-colors" disabled={isUploading}>
                        <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></div>
                        <span className="text-sm font-bold text-gray-700">选择文件</span>
                    </button>
                    <button onClick={() => { 
                        if (category === CollectionCategory.VIDEO || category === CollectionCategory.AUDIO) startRecording(category === CollectionCategory.VIDEO); 
                        else document.getElementById('camera-upload')?.click(); 
                    }} className="h-32 flex flex-col items-center justify-center rounded-2xl border-2 border-blue-100 bg-blue-50 active:bg-blue-100 transition-colors" disabled={isUploading}>
                        <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mb-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg></div>
                        <span className="text-sm font-bold text-blue-700">{category === CollectionCategory.VIDEO ? '拍摄视频' : category === CollectionCategory.AUDIO ? '录制语音' : '实时拍照'}</span>
                    </button>
                </div>
            )}
            
            <input type="file" className="hidden" id="file-upload" accept={category === CollectionCategory.VIDEO ? "video/*" : category === CollectionCategory.AUDIO ? "audio/*" : "image/*"} onChange={handleFileUpload} disabled={isUploading} />
            <input type="file" className="hidden" id="camera-upload" accept="image/*" capture="environment" onChange={handleFileUpload} disabled={isUploading} />
            
            {showDuplicateWarning && <div className="text-center text-red-500 text-xs font-bold animate-shake bg-red-50 p-3 rounded-lg border border-red-100">⚠️ 数据重复校验失败，请勿提交重复内容</div>}
            {isUploading && <div className="flex items-center justify-center space-x-2"><div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div><p className="text-center text-xs text-gray-500 font-bold uppercase tracking-wider">Verifying & Uploading...</p></div>}
        </div>
      )}

      {feedback && (
        <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center animate-in fade-in duration-300 ${feedback === 'correct' ? 'bg-green-500/95' : feedback === 'wrong' ? 'bg-red-500/95' : 'bg-gray-800/95'}`}>
          <div className="bg-white rounded-full p-5 mb-3 shadow-2xl scale-110">
            {feedback === 'correct' ? <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg> : feedback === 'wrong' ? <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg> : <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>}
          </div>
          <p className="text-white font-black text-2xl uppercase tracking-tighter">{feedback === 'correct' ? '通过校验' : feedback === 'wrong' ? '不符合标准' : '任务跳过'}</p>
          {feedback === 'correct' && <p className="text-white text-sm mt-2 font-bold animate-pulse">CONTRIBUTION POINTS +{getPoints()}</p>}
        </div>
      )}
    </div>
  );
};

export default TaskFlow;