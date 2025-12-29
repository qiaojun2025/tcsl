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
    [Difficulty.HARD]: [
        '请拍摄一张狗正在接飞盘的照片', 
        '请拍摄一张猫正在捕猎玩具的照片', 
        '请拍摄一张鸟儿喂食幼鸟的照片', 
        '请拍摄一群蚂蚁搬家的照片', 
        '请拍摄一张鱼跃出水面的照片', 
        '请拍摄一张宠物正在洗澡的照片', 
        '请拍摄一张动物打哈欠的照片', 
        '请拍摄一张蝴蝶停在花朵上的照片', 
        '请拍摄一张蜘蛛织网的照片', 
        '请拍摄一张壁虎爬墙的照片'
    ]
  },
  [CollectionCategory.PLANT]: {
    [Difficulty.EASY]: ['玫瑰', '梧桐树', '向日葵', '仙人掌', '荷花', '柳树', '银杏叶', '蒲公英', '竹子', '梅花'],
    [Difficulty.MEDIUM]: ['盛开的红玫瑰', '秋天的梧桐树叶', '带刺的仙人掌', '紫色的薰衣草', '白色的百合花', '巨大的榕树', '爬满墙的爬山虎', '多肉植物特写', '水中的睡莲', '松树的松果'],
    [Difficulty.HARD]: [
        '请拍摄一张阳光透过树叶（丁达尔效应）的照片', 
        '请拍摄一张雨后沾满露水的花瓣照片', 
        '请拍摄一张植物种子破土而出的照片', 
        '请拍摄一张枯木逢春（老树发新芽）的照片', 
        '请拍摄一张花朵正在绽放过程的照片', 
        '请拍摄一张风吹麦浪的照片', 
        '请拍摄一张树根错综复杂的特写照片', 
        '请拍摄一张苔藓微观世界的照片', 
        '请拍摄一张落叶铺满地面的照片', 
        '请拍摄一张果实挂满枝头的照片'
    ]
  },
  [CollectionCategory.PERSON]: {
    [Difficulty.EASY]: ['手部照片', '腿部照片', '正脸自拍', '侧脸照片', '背影照片', '脚部特写', '眼睛特写', '耳朵特写', '头发特写', '手臂照片'],
    [Difficulty.MEDIUM]: ['带手表的手腕', '穿着运动鞋的脚', '戴眼镜的人像', '扎马尾的背影', '涂指甲油的手', '穿着西装的半身像', '戴帽子的人像', '穿着裙子的全身像', '正在看书的侧脸', '拿着手机的手'],
    [Difficulty.HARD]: [
        '请拍摄一张正在弹钢琴的手部特写', 
        '请拍摄一张正在跑步的腿部动态照片', 
        '请拍摄一张正在大笑的人物表情抓拍', 
        '请拍摄一张老人布满皱纹的手部特写', 
        '请拍摄一张婴儿熟睡的照片', 
        '请拍摄一张正在做瑜伽的高难度动作照片', 
        '请拍摄一张正在画画的人专注的神态', 
        '请拍摄一张正在跳舞的动态模糊照片', 
        '请拍摄一张工地上工人挥汗如雨的照片', 
        '请拍摄一张医生正在工作的照片'
    ]
  },
  [CollectionCategory.STREET]: {
    [Difficulty.EASY]: ['城市街道', '农村田野', '乡镇集市', '学校大门', '公交车站', '天桥', '十字路口', '公园长椅', '便利店门口', '路灯'],
    [Difficulty.MEDIUM]: ['南京市图书馆正面', '西安农村的麦田', '北京胡同的入口', '上海陆家嘴的远景', '广州塔的夜景', '成都的茶馆门口', '杭州西湖的断桥', '重庆的轻轨穿楼', '武汉的长江大桥', '哈尔滨的冰雪大世界'],
    [Difficulty.HARD]: [
        '请在30分钟内，采集一张夜晚灯火通明的城市CBD照片', 
        '请在30分钟内，采集一张清晨无人的街道照片', 
        '请在30分钟内，采集一张雨中熙熙攘攘的十字路口照片', 
        '请在30分钟内，采集一张夕阳下的农村田野照片', 
        '请在30分钟内，采集一张正在施工的建筑工地照片', 
        '请在30分钟内，采集一张繁忙的早市摊位照片', 
        '请在30分钟内，采集一张老旧小区的斑驳墙面照片', 
        '请在30分钟内，采集一张火车站广场人流穿梭的照片', 
        '请在30分钟内，采集一张地铁站内匆忙人群的照片', 
        '请在30分钟内，采集一张雪后初晴的街道照片'
    ]
  },
  [CollectionCategory.LIFE]: {
    [Difficulty.EASY]: ['作业本', '做饭的锅铲', '洗碗的海绵', '牙刷', '毛巾', '水杯', '拖鞋', '遥控器', '枕头', '充电器'],
    [Difficulty.MEDIUM]: ['写满字的家庭作业', '正在翻炒的菜肴', '堆满泡沫的碗筷', '刚洗好的水果', '折叠整齐的衣服', '摆放整齐的书桌', '热气腾腾的咖啡', '正在播放画面的电视', '打开的笔记本电脑', '挂满衣服的衣架'],
    [Difficulty.HARD]: [
        '请在30分钟内，拍摄一张你正在洗碗的照片', 
        '请在30分钟内，拍摄一张你正在做饭的照片', 
        '请在30分钟内，拍摄一张你正在打扫房间的照片', 
        '请在30分钟内，拍摄一张你正在辅导孩子写作业的照片', 
        '请在30分钟内，拍摄一张你正在修理家电的照片', 
        '请在30分钟内，拍摄一张你正在整理衣柜的照片', 
        '请在30分钟内，拍摄一张你正在给宠物喂食的照片', 
        '请在30分钟内，拍摄一张你正在浇花的照片', 
        '请在30分钟内，拍摄一张你正在熨衣服的照片', 
        '请在30分钟内，拍摄一张你正在组装家具的照片'
    ]
  },
  [CollectionCategory.AUDIO]: {
    [Difficulty.EASY]: [
      '请朗读：人工智能正在改变我们的生活方式。',
      '请朗读：Web3 是下一代互联网的形态。',
      '请朗读：今天的天气非常适合户外运动。',
      '请朗读：去中心化网络保护了用户的数据主权。',
      '请朗读：区块链技术具有不可篡改的特性。',
      '请朗读：机器学习需要大量的高质量数据。',
      '请朗读：保护环境，从垃圾分类做起。',
      '请朗读：保持好奇心是学习的源动力。',
      '请朗读：数字货币市场充满了机遇与挑战。',
      '请朗读：坚持锻炼身体，保持健康作息。'
    ],
    [Difficulty.MEDIUM]: [
      '请在 3 秒内开始朗读屏幕出现的数字：9527',
      '请在 3 秒内开始朗读：快速的棕色狐狸跳过了懒惰的狗。',
      '请在 3 秒内开始朗读：吃葡萄不吐葡萄皮。',
      '请在 3 秒内开始大声说出你的名字。',
      '请在 3 秒内开始朗读：红鲤鱼与绿鲤鱼与驴。',
      '请在 3 秒内开始朗读今天的日期。',
      '请在 3 秒内开始模仿猫叫一声。',
      '请在 3 秒内开始大笑三声。',
      '请在 3 秒内开始朗读：八百标兵奔北坡。',
      '请在 3 秒内开始说出一句你喜欢的歌词。'
    ],
    [Difficulty.HARD]: [
      '请录制 10 秒你所在环境的声音（如咖啡厅/街道）。',
      '请录制 10 秒窗外的风声或雨声。',
      '请录制 10 秒键盘敲击的声音。',
      '请录制 10 秒家中电视或广播的背景音。',
      '请录制 10 秒公交车或地铁运行的声音。',
      '请录制 10 秒厨房做饭的嘈杂声。',
      '请录制 10 秒公园里的鸟叫声。',
      '请录制 10 秒商场里的人声鼎沸。',
      '请录制 10 秒正在行驶的汽车内部声音。',
      '请录制 10 秒安静图书馆内的翻书声。'
    ]
  }
};

const getSubmittedImageHashes = (): Set<string> => {
    try {
        const hashes = localStorage.getItem('submitted_image_hashes');
        return hashes ? new Set(JSON.parse(hashes)) : new Set();
    } catch (e) {
        console.error("Failed to parse image hashes from localStorage", e);
        return new Set();
    }
};

const addSubmittedImageHash = (hash: string) => {
    const hashes = getSubmittedImageHashes();
    hashes.add(hash);
    localStorage.setItem('submitted_image_hashes', JSON.stringify(Array.from(hashes)));
};

const computeFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const TaskFlow: React.FC<TaskFlowProps> = ({ type, category, difficulty, onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [totalSteps] = useState(10);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'skipped' | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [usedTasks, setUsedTasks] = useState<Set<string>>(new Set());
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Audio specific states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getPoints = () => {
    if (difficulty === Difficulty.EASY) return 1;
    if (difficulty === Difficulty.MEDIUM) return 3;
    return 6;
  };

  const generateNewTask = useCallback(() => {
    setIsLoading(true);
    setFeedback(null);
    setSelectedIds([]);
    setAudioBlob(null);
    setRecordingDuration(0);
    setIsRecording(false);
    
    if (type === TaskType.QUICK_JUDGMENT) {
      let target;
      const available = CATEGORIES.filter(c => !usedTasks.has(c));
      target = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : getRandomCategory();
      setUsedTasks(prev => new Set(prev).add(target));
      const targetZh = CATEGORY_MAP[target] || target;

      if (difficulty === Difficulty.EASY) {
        const other = CATEGORIES.filter(c => c !== target)[0] || (target === 'dog' ? 'cat' : 'dog');
        setCurrentTask({ 
          title: `请判断下图中的主要内容是什么？`, 
          target, 
          imageUrl: getPlaceholderImage(target),
          options: [{ id: target, label: targetZh }, { id: other, label: CATEGORY_MAP[other] || other }].sort(() => Math.random() - 0.5)
        });
      } else if (difficulty === Difficulty.MEDIUM) {
        const isNegative = Math.random() > 0.5;
        setCurrentTask({
          title: isNegative ? `请选择：【不是】${targetZh}的图片` : `请选择：包含【${targetZh}】的图片`,
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
          title: `请在10秒内选出所有【${targetZh}】`,
          target,
          images: Array.from({length: 6}).map((_, i) => ({ 
            id: i, url: getPlaceholderImage(i < 3 ? target : getRandomCategory()), 
            cat: i < 3 ? target : 'other' 
          })).sort(() => Math.random() - 0.5)
        });
      }
    } else {
      const pool = COLLECTION_POOLS[category!][difficulty];
      const available = pool.filter(p => !usedTasks.has(p));
      const prompt = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : pool[Math.floor(Math.random() * pool.length)];
      setUsedTasks(prev => new Set(prev).add(prompt));

      if (difficulty === Difficulty.HARD && category !== CollectionCategory.AUDIO) {
        setTimeLeft(1800); 
      }
      
      let title = `任务：${prompt}`;
      if (category === CollectionCategory.AUDIO) {
        title = `${difficulty}音频采集`;
      }
      setCurrentTask({ title, prompt });
    }
    setTimeout(() => setIsLoading(false), 400);
  }, [type, difficulty, category, usedTasks]);

  useEffect(() => { 
    generateNewTask(); 
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && !feedback) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !feedback && currentTask) {
      if (difficulty === Difficulty.HARD && type === TaskType.QUICK_JUDGMENT) {
        handleQuickHardSubmit();
      }
    }
  }, [timeLeft, feedback, difficulty, type, currentTask]);

  // Audio Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("无法访问麦克风，请检查权限设置。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleAudioSubmit = () => {
    if (!audioBlob) return;
    
    // Logic check based on difficulty
    let isValid = true;
    if (difficulty === Difficulty.EASY) {
      // Must be > 5s
      if (recordingDuration < 5) {
        alert("录音时长不足 5 秒，请重试。");
        isValid = false;
      }
    } else if (difficulty === Difficulty.HARD) {
      // Must be around 10s (let's say > 8s)
      if (recordingDuration < 8) {
        alert("环境音采集时长不足 8 秒，请重试。");
        isValid = false;
      }
    }

    if (isValid) {
      submitResult(true);
    } else {
      setAudioBlob(null);
      setRecordingDuration(0);
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
    if (!event.target.files || event.target.files.length === 0) {
        return;
    }
    const file = event.target.files[0];
    setIsUploading(true);

    try {
        const hash = await computeFileHash(file);
        const submittedHashes = getSubmittedImageHashes();

        if (submittedHashes.has(hash)) {
            setShowDuplicateWarning(true);
            setTimeout(() => setShowDuplicateWarning(false), 3000);
            event.target.value = '';
            return;
        }

        addSubmittedImageHash(hash);
        submitResult(true);

    } catch (error) {
        console.error("Error processing file:", error);
    } finally {
        setIsUploading(false);
    }
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
        generateNewTask();
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

  if (isLoading || !currentTask) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-lg w-full">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 bg-blue-100 rounded-full mb-4 flex items-center justify-center">
           <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-400 font-bold">正在匹配校验节点 {step}/{totalSteps}...</p>
      </div>
    </div>
  );

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-lg w-full relative overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 uppercase tracking-widest">任务进度 {step}/{totalSteps}</span>
        {timeLeft > 0 && (
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border animate-pulse ${timeLeft < 5 ? 'text-red-600 bg-red-50 border-red-100' : 'text-orange-600 bg-orange-50 border-orange-100'}`}>
            限时: {formatTime(timeLeft)}
          </span>
        )}
        <button onClick={onCancel} className="text-gray-300 hover:text-red-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>

      <div className="space-y-4">
        <h3 className="text-center font-bold text-gray-900 leading-tight">{currentTask.title}</h3>
        
        {type === TaskType.QUICK_JUDGMENT ? (
          <div className="space-y-4">
            {difficulty === Difficulty.EASY && currentTask.imageUrl && (
              <div className="space-y-4">
                <div className="w-full aspect-square rounded-xl overflow-hidden shadow-inner border border-gray-100">
                   <img src={currentTask.imageUrl} className="w-full h-full object-cover" alt="Verification Target" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {currentTask.options?.map((opt: any) => (
                    <button key={opt.id} onClick={() => submitResult(opt.id === currentTask.target)} className="py-3 rounded-xl bg-blue-50 text-blue-600 font-bold border border-blue-100 active:bg-blue-100 transition-colors">{opt.label}</button>
                  ))}
                </div>
              </div>
            )}
            {difficulty === Difficulty.MEDIUM && currentTask.images && (
              <div className="grid grid-cols-3 gap-2">
                {currentTask.images.map((img: any, i: number) => (
                  <div key={i} onClick={() => submitResult(currentTask.isNegative ? img.cat !== currentTask.target : img.cat === currentTask.target)} className="aspect-square rounded-xl overflow-hidden cursor-pointer active:scale-95 transition-transform border border-gray-100">
                    <img src={img.url} className="w-full h-full object-cover" alt="Option" />
                  </div>
                ))}
              </div>
            )}
            {difficulty === Difficulty.HARD && currentTask.images && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {currentTask.images.map((img: any, index: number) => (
                    <div
                      key={img.id}
                      onClick={() => setSelectedIds(prev => prev.includes(img.id) ? prev.filter(x => x !== img.id) : [...prev, img.id])}
                      className={`flex items-center p-2 space-x-4 rounded-xl cursor-pointer transition-all border-2 ${selectedIds.includes(img.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
                      role="checkbox"
                      aria-checked={selectedIds.includes(img.id)}
                      tabIndex={0}
                    >
                      <img src={img.url} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" alt={`选项 ${index + 1}`} />
                      <div className="flex-1 font-semibold text-gray-800">图片选项 {index + 1}</div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all ${selectedIds.includes(img.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                        {selectedIds.includes(img.id) && <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handleQuickHardSubmit} disabled={selectedIds.length === 0} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold disabled:bg-gray-200">确认选择提交</button>
              </div>
            )}
          </div>
        ) : (
          category === CollectionCategory.AUDIO ? (
            // AUDIO TASK UI
            <div className="space-y-6 text-center">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-sm font-bold text-gray-800 leading-relaxed">{currentTask.prompt}</p>
                {difficulty === Difficulty.EASY && <p className="text-[10px] text-blue-500 mt-2">* 需朗读 5 秒以上</p>}
                {difficulty === Difficulty.MEDIUM && <p className="text-[10px] text-orange-500 mt-2">* 请快速开始朗读</p>}
                {difficulty === Difficulty.HARD && <p className="text-[10px] text-purple-500 mt-2">* 需采集 10 秒环境音</p>}
              </div>

              <div className="flex flex-col items-center justify-center space-y-4">
                {audioBlob ? (
                  <div className="w-full space-y-3 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-green-50 text-green-700 py-3 rounded-xl border border-green-200 flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="font-bold text-sm">录制完成 ({recordingDuration}s)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <button onClick={() => { setAudioBlob(null); setRecordingDuration(0); }} className="py-3 rounded-xl border border-gray-200 font-bold text-gray-600">重录</button>
                       <button onClick={handleAudioSubmit} className="py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg">提交录音</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      {isRecording && <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-red-500 font-mono text-2xl font-black">{formatTime(recordingDuration)}</span>}
                      <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all ${isRecording ? 'bg-red-100 border-4 border-red-500' : 'bg-red-500 hover:bg-red-600 border-4 border-red-100'}`}
                      >
                         {isRecording ? (
                           <div className="w-8 h-8 bg-red-500 rounded-lg animate-pulse"></div>
                         ) : (
                           <div className="w-8 h-8 bg-white rounded-full"></div>
                         )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{isRecording ? '正在录音...' : '点击开始录音'}</p>
                  </>
                )}
              </div>
              <button onClick={() => submitResult('skipped')} className="w-full text-gray-400 text-[10px] font-bold uppercase py-2 tracking-widest">跳过此项任务</button>
            </div>
          ) : (
            // IMAGE COLLECTION UI
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50">
                <span className="text-4xl mb-2">{difficulty === Difficulty.HARD ? '📸' : '🖼️'}</span>
                <p className="text-[10px] text-gray-400 text-center font-medium leading-relaxed">
                  {difficulty === Difficulty.HARD ? '高级采集：请根据任务提示，在规定时间内拍摄或上传一张真实的行为照片。' : (difficulty === Difficulty.MEDIUM ? '中级采集：支持上传，将严审时间与位置信息' : '初级采集：支持从相册选取或拍照')}
                </p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                id="upload" 
                accept="image/*" 
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <label htmlFor="upload" className={`block w-full py-4 rounded-xl text-white font-black text-center shadow-lg active:scale-[0.98] transition-all ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 active:bg-green-700 cursor-pointer'}`}>
                {isUploading ? (
                    <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span>正在校验图片...</span>
                    </div>
                ) : (
                    '点击上传/拍摄照片'
                )}
              </label>
              {showDuplicateWarning && (
                  <div className="text-center text-red-500 bg-red-50 border border-red-200 p-2 rounded-lg text-xs font-bold animate-shake">
                      您已提交过这张图片，请选择一张新的图片。
                  </div>
              )}
              <button onClick={() => submitResult('skipped')} className="w-full text-gray-400 text-[10px] font-bold uppercase py-2 tracking-widest">跳过此项任务</button>
            </div>
          )
        )}
      </div>

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