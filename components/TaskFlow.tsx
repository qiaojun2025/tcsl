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
    [Difficulty.MEDIUM]: ['朗读数字：9527', '朗读：狐狸跳过狗', '朗读：葡萄皮绕口令', '大声说出名字', '朗读：红鲤鱼与绿鲤鱼', '朗读今天日期', '模仿猫叫', '大笑三声', '朗读：八百标兵', '唱一句歌词'],
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
        console.error("Failed to parse file hashes from localStorage", e);
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
  
  // State for Task Intro Screen - Only show for Collection Tasks
  const [showIntro, setShowIntro] = useState(type === TaskType.COLLECTION);

  // Audio/Video specific states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Initialization: Generate Task Queue
  useEffect(() => {
    // Determine batch size: Video = 1, others = 10
    const count = category === CollectionCategory.VIDEO ? 1 : 10;
    setTotalSteps(count);
    
    const newQueue: any[] = [];
    
    if (type === TaskType.QUICK_JUDGMENT) {
        // ... (Existing Quick Judgment generation logic, simplified for batch)
        // Since Quick Judgment generates on the fly in previous logic, we can pre-generate prompts
        // For consistency with previous code, we will generate "placeholders" here and instantiate content in generateNewTask
        // But the previous code structure for Quick Judgment relies on generating one by one.
        // Let's keep Quick Judgment generation dynamic but populate the queue with dummy items to track progress
        for(let i=0; i<count; i++) newQueue.push({ type: 'QUICK', index: i });
    } else {
        // Collection Tasks
        const pool = COLLECTION_POOLS[category!][difficulty];
        // Shuffle and pick 'count' items. If pool is smaller, repeat.
        for (let i = 0; i < count; i++) {
            const prompt = pool[i % pool.length]; // Simple rotation if pool is small
            // Or random: const prompt = pool[Math.floor(Math.random() * pool.length)];
            
            let title = prompt;
            let description = prompt;
            let requirements: string[] = [];

            if (category === CollectionCategory.VIDEO) {
                 description = `请拍摄一段清晰的【${prompt}】视频。`;
                 requirements = ["画面无剧烈抖动", "时长需大于5秒", "需包含完整主体动作"];
                 if (difficulty === Difficulty.HARD) {
                    description = "请仔细阅读场景要求，拍摄符合描述的视频片段。";
                    requirements = ["需符合特定场景描述", "光线充足，运镜平稳"];
                 }
            } else if (category === CollectionCategory.AUDIO) {
                 description = `请朗读或录制：${prompt}`;
                 requirements = ["环境安静清晰", "语速适中", `时长需大于${difficulty === Difficulty.HARD ? 10 : 5}秒`];
            } else {
                 description = `请采集一张【${prompt}】的照片。`;
                 requirements = ["图片主体清晰可见", "禁止使用网络图片", "光线充足"];
            }

            newQueue.push({
                title,
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

  // Load current task when step changes
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
       // ... Existing Quick Judgment Logic ...
      let target;
      const targetZh = getRandomCategory(); // Simplified for brevity, ideal to use map
      // Re-using the random logic from before for actual content
      const available = CATEGORIES;
      target = available[Math.floor(Math.random() * available.length)];
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
      // Collection Task - use queued item
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
        if (difficulty === Difficulty.EASY) return 4;
        if (difficulty === Difficulty.MEDIUM) return 8;
        return 11;
    }
    if (difficulty === Difficulty.EASY) return 1;
    if (difficulty === Difficulty.MEDIUM) return 3;
    return 6;
  };

  // ... (Media Recording functions remain mostly the same, ensuring validation matches requirements)
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
    } catch (err) { alert(`无法访问${isVideo ? '摄像头' : '麦克风'}`); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  const handleMediaSubmit = (isVideo: boolean) => {
    if (!mediaBlob) return;
    
    // Audio Size Validation: < 2MB
    if (category === CollectionCategory.AUDIO) {
        const sizeInMB = mediaBlob.size / (1024 * 1024);
        if (sizeInMB > 2) {
            alert("音频文件不能超过 2 MB，请重新录制。");
            setMediaBlob(null); setRecordingDuration(0); return;
        }
    }

    // Min duration check
    if (recordingDuration < 1) { // Assuming minimal check, actual task requirements might vary
         alert("录制时间太短"); return;
    }

    computeFileHash(mediaBlob).then(hash => {
        const submittedHashes = getSubmittedFileHashes();
        if (submittedHashes.has(hash)) {
            setShowDuplicateWarning(true);
            setTimeout(() => setShowDuplicateWarning(false), 3000);
        } else {
            addSubmittedFileHash(hash);
            submitResult(true);
        }
    });
  };

  const handleQuickHardSubmit = () => {
    if (!currentTask || !currentTask.images) return;
    const isCorrect = selectedIds.length > 0 && selectedIds.every(id => {
      const img = currentTask.images.find((img: any) => img.id === id);
      return img && img.cat === currentTask.target;
    });
    submitResult(isCorrect);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isMedia: boolean = false) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setIsUploading(true);
    
    // Audio Size Check
    if (category === CollectionCategory.AUDIO && file.size > 2 * 1024 * 1024) {
         alert("音频文件不能超过 2 MB。");
         event.target.value = ''; setIsUploading(false); return;
    }

    try {
        const hash = await computeFileHash(file);
        const submittedHashes = getSubmittedFileHashes();
        // Image Duplicate Check (applied to all file uploads really)
        if (submittedHashes.has(hash)) {
            setShowDuplicateWarning(true);
            setTimeout(() => setShowDuplicateWarning(false), 3000);
            event.target.value = ''; setIsUploading(false); return;
        }

        if (isMedia) {
             const url = URL.createObjectURL(file);
             const element = category === CollectionCategory.VIDEO ? document.createElement('video') : document.createElement('audio');
             element.preload = 'metadata';
             element.onloadedmetadata = () => {
                setRecordingDuration(Math.round(element.duration));
                setMediaBlob(file);
                setIsUploading(false);
             };
             element.src = url;
        } else {
             addSubmittedFileHash(hash);
             submitResult(true);
             setIsUploading(false);
        }
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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
  };

  // --------------------------------------------------------------------------------
  // TASK PREVIEW SCREEN
  // --------------------------------------------------------------------------------
  if (showIntro) {
    let reqText = "请拍摄清晰、光线充足的照片。主体需位于画面中心，避免模糊或遮挡。";
    if (category === CollectionCategory.VIDEO) {
        reqText = "在人行道上或绕过障碍物正常行走的同时，使用应用内相机录制视频。将相机保持在胸部高度，避免直接拍摄他人的面部。";
    } else if (category === CollectionCategory.AUDIO) {
        reqText = "请在安静的环境下录制音频，保持语速适中，吐字清晰。";
    }

    return (
      <div className="bg-white rounded-2xl p-0 shadow-lg w-full relative overflow-hidden animate-in fade-in max-h-[85vh] flex flex-col">
         {/* 1. Title Area */}
         <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-100">
             <div className="flex justify-between items-start mb-2">
                 <h2 className="text-2xl font-black text-gray-900">{category || type}</h2>
                 <button onClick={onCancel} className="bg-white p-1 rounded-full text-gray-400 hover:text-red-500 shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
             </div>
             <p className="text-blue-700 text-sm font-medium">参与此项任务可以提高你的报酬结算比例。</p>
         </div>

         <div className="p-6 overflow-y-auto space-y-6 flex-1">
             {/* 2. Task Area */}
             <div>
                <div className="flex items-center space-x-2 mb-3">
                    <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                    <h3 className="font-bold text-gray-900">任务预览 ({totalSteps}项)</h3>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="space-y-3 max-h-40 overflow-y-auto">
                        {taskQueue.map((t, idx) => (
                            <div key={idx} className="flex items-start">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-gray-200 text-xs font-mono flex items-center justify-center text-gray-500 mr-3 mt-0.5">
                                    {idx + 1}
                                </span>
                                <p className="text-sm text-gray-700 font-medium leading-relaxed">
                                    {t.prompt || `第 ${idx+1} 条快判任务`}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
             
             {/* 3. Requirements Area */}
             <div>
                <div className="flex items-center space-x-2 mb-3">
                    <span className="w-1 h-4 bg-green-500 rounded-full"></span>
                    <h3 className="font-bold text-gray-900">任务要求</h3>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <p className="text-sm text-orange-800 font-medium leading-relaxed">
                        {reqText}
                    </p>
                </div>
             </div>
         </div>
         
         {/* 4. Button Area */}
         <div className="p-6 pt-0 bg-white">
            <button 
                onClick={() => setShowIntro(false)}
                className="w-full py-4 rounded-xl bg-gray-900 text-white font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center text-lg mb-3"
            >
                开始任务
            </button>
            <button 
                onClick={onCancel}
                className="w-full py-3 rounded-xl bg-white border-2 border-gray-100 text-gray-500 font-bold active:bg-gray-50 transition-colors"
            >
                返回
            </button>
            <p className="text-xs text-gray-400 text-center mt-3 font-medium">
                继续完成采集任务。
            </p>
         </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------------
  // ACTION SCREEN (Execution)
  // --------------------------------------------------------------------------------
  if (isLoading || !currentTask) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-lg w-full">
        <p className="text-gray-400 font-bold animate-pulse">正在加载任务数据...</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl p-5 shadow-lg w-full relative overflow-hidden animate-in fade-in">
      <div className="flex justify-between items-center mb-4">
        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">任务进度 {step}/{totalSteps}</span>
        {timeLeft > 0 && <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded">限时 {formatTime(timeLeft)}</span>}
        <button onClick={() => submitResult('skipped')} className="text-gray-400 hover:text-blue-600 text-xs font-bold underline">跳过此题</button>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-4 leading-tight">{currentTask.title}</h1>

      {type === TaskType.QUICK_JUDGMENT ? (
        // ... (Quick Judgment UI kept mostly same)
        <div className="space-y-4">
            {difficulty === Difficulty.EASY && currentTask.imageUrl && (
              <div className="space-y-4">
                <div className="w-full aspect-square rounded-xl overflow-hidden shadow-inner bg-gray-100">
                   <img src={currentTask.imageUrl} className="w-full h-full object-cover" alt="Target" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {currentTask.options?.map((opt: any) => (
                    <button key={opt.id} onClick={() => submitResult(opt.id === currentTask.target)} className="py-3 rounded-xl bg-blue-50 text-blue-600 font-bold border border-blue-100 active:bg-blue-100">{opt.label}</button>
                  ))}
                </div>
              </div>
            )}
            {difficulty === Difficulty.MEDIUM && currentTask.images && (
              <div className="grid grid-cols-3 gap-2">
                {currentTask.images.map((img: any, i: number) => (
                  <div key={i} onClick={() => submitResult(currentTask.isNegative ? img.cat !== currentTask.target : img.cat === currentTask.target)} className="aspect-square rounded-xl overflow-hidden cursor-pointer active:scale-95 border border-gray-100">
                    <img src={img.url} className="w-full h-full object-cover" alt="Option" />
                  </div>
                ))}
              </div>
            )}
            {difficulty === Difficulty.HARD && currentTask.images && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {currentTask.images.map((img: any, index: number) => (
                    <div key={img.id} onClick={() => setSelectedIds(prev => prev.includes(img.id) ? prev.filter(x => x !== img.id) : [...prev, img.id])} className={`flex items-center p-2 space-x-4 rounded-xl cursor-pointer border-2 ${selectedIds.includes(img.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                      <img src={img.url} className="w-16 h-16 object-cover rounded-lg" alt="Option" />
                      <div className="flex-1 font-semibold text-gray-800">选项 {index + 1}</div>
                      <div className={`w-6 h-6 rounded-full border-2 ${selectedIds.includes(img.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}></div>
                    </div>
                  ))}
                </div>
                <button onClick={handleQuickHardSubmit} disabled={selectedIds.length === 0} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold disabled:bg-gray-200">提交</button>
              </div>
            )}
        </div>
      ) : (
        // Collection Task UI
        <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 font-medium leading-relaxed border border-gray-100 mb-4">
                {currentTask.description}
            </div>

            {isRecording && (
                <div className="space-y-4">
                <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg relative">
                    <video ref={videoPreviewRef} className="w-full h-full object-cover" playsInline autoPlay muted />
                    <div className="absolute top-4 right-4 bg-red-600 text-white font-mono text-sm px-2 py-1 rounded animate-pulse">REC {formatTime(recordingDuration)}</div>
                </div>
                <button onClick={stopRecording} className="w-full py-4 rounded-xl bg-red-600 text-white font-bold shadow-lg">停止录制</button>
                </div>
            )}

            {!isRecording && mediaBlob && (
                <div className="space-y-4">
                <div className="w-full aspect-video bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center">
                    {category === CollectionCategory.VIDEO ? <video src={URL.createObjectURL(mediaBlob)} className="w-full h-full object-contain" controls /> : <div className="text-white font-bold">已录制 ({recordingDuration}s)</div>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { setMediaBlob(null); setRecordingDuration(0); }} className="py-3 rounded-xl border border-gray-200 font-bold text-gray-600">重录</button>
                    <button onClick={() => handleMediaSubmit(category === CollectionCategory.VIDEO)} className="py-3 rounded-xl bg-blue-600 text-white font-bold">提交</button>
                </div>
                </div>
            )}

            {!isRecording && !mediaBlob && (
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => document.getElementById('file-upload')?.click()} className="h-32 flex flex-col items-center justify-center rounded-2xl border-2 border-gray-100 bg-white active:bg-gray-50" disabled={isUploading}>
                        <div className="w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mb-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></div>
                        <span className="text-sm font-bold text-gray-700">上传文件</span>
                    </button>
                    <button onClick={() => { 
                        if (category === CollectionCategory.VIDEO || category === CollectionCategory.AUDIO) startRecording(category === CollectionCategory.VIDEO); 
                        else document.getElementById('camera-upload')?.click(); 
                    }} className="h-32 flex flex-col items-center justify-center rounded-2xl border-2 border-blue-50 bg-blue-50 active:bg-blue-100" disabled={isUploading}>
                        <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center mb-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg></div>
                        <span className="text-sm font-bold text-blue-700">{category === CollectionCategory.VIDEO ? '拍摄视频' : category === CollectionCategory.AUDIO ? '录制' : '拍照'}</span>
                    </button>
                </div>
            )}
            
            <input type="file" className="hidden" id="file-upload" accept={category === CollectionCategory.VIDEO ? "video/*" : category === CollectionCategory.AUDIO ? "audio/*" : "image/*"} onChange={(e) => handleFileUpload(e, true)} disabled={isUploading} />
            <input type="file" className="hidden" id="camera-upload" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, false)} disabled={isUploading} />
            
            {showDuplicateWarning && <div className="text-center text-red-500 text-xs font-bold animate-shake bg-red-50 p-2 rounded">⚠️ 图片/文件重复，请重新提交</div>}
            {isUploading && <p className="text-center text-xs text-gray-400">正在上传校验中...</p>}
        </div>
      )}

      {feedback && (
        <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center animate-in fade-in duration-300 ${feedback === 'correct' ? 'bg-green-500/90' : feedback === 'wrong' ? 'bg-red-500/90' : 'bg-gray-800/90'}`}>
          <div className="bg-white rounded-full p-4 mb-2 shadow-xl scale-110">
            {feedback === 'correct' ? <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg> : feedback === 'wrong' ? <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg> : <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>}
          </div>
          <p className="text-white font-black text-xl uppercase tracking-widest">{feedback === 'correct' ? '校验通过' : feedback === 'wrong' ? '校验不匹配' : '已跳过'}</p>
          {feedback === 'correct' && <p className="text-white text-xs mt-2 font-bold animate-bounce">贡献度 +{getPoints()}</p>}
        </div>
      )}
    </div>
  );
};

export default TaskFlow;