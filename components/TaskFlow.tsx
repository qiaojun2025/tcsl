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
      '请朗读：人工智能正在深刻地改变着我们的世界，从智能家居到自动驾驶，科技的进步正在让我们的生活变得更加便捷和舒适。',
      '请朗读：Web3 技术正在重塑互联网的价值体系，通过去中心化的网络结构，让每一个参与者都能真正拥有自己的数字资产和数据主权。',
      '请朗读：在快节奏的现代生活中，我们不仅要追求事业上的成功，更要学会放慢脚步，去感受生活中的点滴美好，保持身心的健康与平衡。',
      '请朗读：区块链不仅仅是一种技术创新，更是一种思维方式的变革，它试图通过建立去中心化的信任机制，来解决传统社会中存在的信任难题。',
      '请朗读：环境保护需要我们每个人的共同努力，无论是减少塑料制品的使用，还是坚持绿色出行，每一个小小的举动都能汇聚成改变世界的力量。',
      '请朗读：终身学习是适应这个快速变化时代的唯一途径，保持一颗好奇心，不断探索未知的领域，我们才能在未来的竞争中立于不败之地。',
      '请朗读：阅读是心灵的避风港，当我们沉浸在书本的海洋中时，不仅能获取知识，更能跨越时空与伟大的思想进行对话，获得精神上的升华。',
      '请朗读：健康的体魄是革命的本钱，建议每天保持至少三十分钟的中等强度运动，并保持规律的作息时间，这样才能以饱满的精力面对挑战。',
      '请朗读：数字经济时代充满了机遇与挑战，我们需要时刻保持敏锐的洞察力，学会利用大数据和人工智能工具，为自己的职业发展赋能。',
      '请朗读：诚信是立人之本，无论是在虚拟的网络世界还是现实生活中，我们都应该遵守承诺，真诚待人，共同构建一个和谐友善的社会环境。'
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
  },
  [CollectionCategory.VIDEO]: {
    [Difficulty.EASY]: [
      '请拍摄一段视频：缓慢旋转展示一瓶矿泉水的正反面。',
      '请拍摄一段视频：缓慢旋转展示一个水杯的正反面。',
      '请拍摄一段视频：缓慢旋转展示一本书的封面和封底。',
      '请拍摄一段视频：缓慢旋转展示一部手机的正反面（对着镜子）。',
      '请拍摄一段视频：缓慢旋转展示一个遥控器的各个角度。',
      '请拍摄一段视频：缓慢旋转展示一个鼠标的各个角度。',
      '请拍摄一段视频：缓慢旋转展示一个苹果的各个角度。',
      '请拍摄一段视频：缓慢旋转展示一个订书机的各个角度。',
      '请拍摄一段视频：缓慢旋转展示一个闹钟的正反面。',
      '请拍摄一段视频：缓慢旋转展示一个玩具的各个角度。'
    ],
    [Difficulty.MEDIUM]: [
      '请拍摄一段 8–15 秒的视频，展示一家便利店的收银台区域。',
      '请拍摄一段 8–15 秒的视频，展示一个公交站台的候车区域。',
      '请拍摄一段 8–15 秒的视频，展示一个公园的长椅和周围环境。',
      '请拍摄一段 8–15 秒的视频，展示一个咖啡厅的吧台制作区域。',
      '请拍摄一段 8–15 秒的视频，展示一个图书馆的书架区域。',
      '请拍摄一段 8–15 秒的视频，展示一个办公室的工位区域。',
      '请拍摄一段 8–15 秒的视频，展示一个健身房的器械区域。',
      '请拍摄一段 8–15 秒的视频，展示一个停车场的入口区域。',
      '请拍摄一段 8–15 秒的视频，展示一个学校的操场区域。',
      '请拍摄一段 8–15 秒的视频，展示一个商场的扶梯区域。'
    ],
    [Difficulty.HARD]: [
      '请录制一段视频，展示手机扫码并进入支付页面的过程。',
      '请录制一段视频，展示在自动售货机上购买饮料的全过程。',
      '请录制一段视频，展示使用共享单车扫码开锁的全过程。',
      '请录制一段视频，展示在ATM机上查询余额的操作过程（注意遮挡敏感信息）。',
      '请录制一段视频，展示使用电梯上下楼的按键操作过程。',
      '请录制一段视频，展示在自助点餐机上下单的全过程。',
      '请录制一段视频，展示使用复印机复印文件的操作过程。',
      '请录制一段视频，展示使用微波炉加热食物的操作过程。',
      '请录制一段视频，展示使用洗衣机设置程序的按键操作过程。',
      '请录制一段视频，展示在电脑上登录邮箱的操作过程（注意遮挡敏感信息）。'
    ]
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
  
  // State for Task Intro Screen (Image/Video only)
  const [showIntro, setShowIntro] = useState(false);
  // Track if intro has been dismissed for this session
  const [introDismissed, setIntroDismissed] = useState(false);

  // Audio/Video specific states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

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

  const generateNewTask = useCallback(() => {
    setIsLoading(true);
    setFeedback(null);
    setSelectedIds([]);
    setMediaBlob(null);
    setRecordingDuration(0);
    setIsRecording(false);
    
    // Only show intro if it's a collection task, not audio, and hasn't been dismissed yet
    if (type === TaskType.COLLECTION && category !== CollectionCategory.AUDIO && !introDismissed) {
        setShowIntro(true);
    } else {
        setShowIntro(false);
    }
    
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

      if (difficulty === Difficulty.HARD && category !== CollectionCategory.AUDIO && category !== CollectionCategory.VIDEO) {
        setTimeLeft(1800); 
      }
      
      let title = `任务：${prompt}`;
      let taskData: any = { title, prompt };

      if (category === CollectionCategory.AUDIO) {
        title = `${difficulty}音频采集`;
        taskData = { title, prompt, description: prompt, requirements: [`时长需大于${difficulty === Difficulty.HARD ? 10 : 5}秒`, '环境安静清晰', '语速适中'] };
      } else {
        title = prompt; 
        
        let desc = prompt;
        const requirements = [];

        if (category === CollectionCategory.VIDEO) {
            if (difficulty === Difficulty.EASY) {
                requirements.push("视频画面清晰");
                requirements.push("时长需大于5秒");
                desc = `请拍摄一段清晰的【${prompt}】视频。`;
            } else if (difficulty === Difficulty.MEDIUM) {
                requirements.push("画面无剧烈抖动");
                requirements.push("时长需在8-15秒之间");
                requirements.push("需包含完整主体动作");
                desc = `请拍摄一段【${prompt}】的视频，注意时长和稳定性。`;
            } else {
                requirements.push("需符合特定场景描述");
                requirements.push("时长需在10秒以上");
                requirements.push("光线充足，运镜平稳");
                desc = "请仔细阅读上述标题中的具体场景要求，拍摄符合描述的视频片段。";
            }
        } else {
            if (difficulty === Difficulty.EASY) {
                requirements.push("图片主体清晰可见");
                requirements.push("内容与描述相符");
                desc = `请采集一张清晰的【${prompt}】照片。`;
            } else if (difficulty === Difficulty.MEDIUM) {
                requirements.push("必须为真实拍摄照片");
                requirements.push("禁止使用网络图片或截图");
                requirements.push("图片内容需包含完整主体");
                desc = `请采集一张【${prompt}】的照片，需保证真实性。`;
            } else {
                requirements.push("需符合特定的场景描述");
                requirements.push("必须在规定时间内完成拍摄");
                requirements.push("图片构图完整，光线充足");
                desc = "请仔细阅读上述标题中的具体场景要求，拍摄符合描述的瞬间。";
            }
        }
        
        taskData = {
            title,
            prompt,
            theme: category,
            description: desc,
            requirements
        };
      }
      setCurrentTask(taskData);
    }
    setTimeout(() => setIsLoading(false), 400);
  }, [type, difficulty, category, usedTasks, introDismissed]);

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

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const mimeType = isVideo ? 'video/webm' : 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        setMediaBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert(`无法访问${isVideo ? '摄像头/麦克风' : '麦克风'}，请检查权限设置。`);
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

  const handleMediaSubmit = (isVideo: boolean) => {
    if (!mediaBlob) return;
    
    if (category === CollectionCategory.AUDIO) {
        const sizeInMB = mediaBlob.size / (1024 * 1024);
        if (sizeInMB > 2) {
            alert("音频文件不能超过 2 MB，请重新录制。");
            setMediaBlob(null);
            setRecordingDuration(0);
            return;
        }
    }

    let isValid = true;
    let minDuration = 5; 
    
    if (category === CollectionCategory.VIDEO) {
        if (difficulty === Difficulty.MEDIUM) minDuration = 8;
        if (difficulty === Difficulty.HARD) minDuration = 10;
    } else if (category === CollectionCategory.AUDIO) {
        if (difficulty === Difficulty.EASY) minDuration = 5;
        if (difficulty === Difficulty.HARD) minDuration = 8;
    }

    if (recordingDuration < minDuration) {
        alert(`${isVideo ? '视频' : '录音'}时长不足 ${minDuration} 秒，请重试。`);
        isValid = false;
    }

    if (isValid) {
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
    } else {
      setMediaBlob(null);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isMedia: boolean = false) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setIsUploading(true);

    try {
        if (category === CollectionCategory.AUDIO) {
            if (file.size > 2 * 1024 * 1024) {
                 alert("音频文件不能超过 2 MB，请重新选择。");
                 event.target.value = '';
                 setIsUploading(false);
                 return;
            }
        }

        const hash = await computeFileHash(file);
        const submittedHashes = getSubmittedFileHashes();

        if (submittedHashes.has(hash)) {
            setShowDuplicateWarning(true);
            setTimeout(() => setShowDuplicateWarning(false), 3000);
            event.target.value = '';
            setIsUploading(false);
            return;
        }

        if (isMedia) {
            const url = URL.createObjectURL(file);
            const element = category === CollectionCategory.VIDEO ? document.createElement('video') : document.createElement('audio');
            element.preload = 'metadata';
            
            element.onloadedmetadata = () => {
                const duration = element.duration;
                setRecordingDuration(Math.round(duration));
                setMediaBlob(file);
                setIsUploading(false);
            };

            element.onerror = () => {
                alert("无法读取文件信息，请重试。");
                setIsUploading(false);
            };
            element.src = url;
        } else {
            addSubmittedFileHash(hash);
            submitResult(true);
            setIsUploading(false);
        }
    } catch (error) {
        console.error("Error processing file:", error);
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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
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

  // Reusable Header Component for Action Screen
  const renderTaskHeader = () => (
      <>
        <div className="flex justify-between items-center mb-4">
            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                任务进度 {step}/{totalSteps}
            </span>
            {timeLeft > 0 && (
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border animate-pulse ${timeLeft < 5 ? 'text-red-600 bg-red-50 border-red-100' : 'text-orange-600 bg-orange-50 border-orange-100'}`}>
                限时: {formatTime(timeLeft)}
              </span>
            )}
            <button onClick={onCancel} className="text-gray-300 hover:text-red-400 p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        
        {/* Main H1 Title */}
        <h1 className="text-xl font-bold text-gray-900 mb-4 leading-tight">
            {currentTask.title}
        </h1>

        {/* Blue Info Card */}
        <div className="bg-[#eff6ff] rounded-2xl p-4 mb-6">
            <div className="flex items-center space-x-2 mb-2">
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-md">
                    {currentTask.theme || category || type}
                </span>
                <span className="text-xs font-black text-blue-600 tracking-tight">AI TRAINING DATA</span>
            </div>
            <div className="bg-white rounded-lg p-3 mt-3 flex items-center shadow-sm">
                 <svg className="w-4 h-4 text-indigo-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                 <span className="text-xs font-bold text-indigo-600">完成此任务可提升您的贡献值获取效率。</span>
            </div>
        </div>
      </>
  );

  const renderDescriptionAndReqs = (isIntro: boolean = false) => {
      let descriptionText = currentTask.description || currentTask.prompt || currentTask.title;
      
      if (isIntro && category) {
          const name = category.replace('类', '');
          if (category === CollectionCategory.VIDEO) {
               descriptionText = `请拍摄一段清晰的${name}视频。`;
          } else if (category === CollectionCategory.AUDIO) {
               descriptionText = `请录制一段清晰的${name}音频。`;
          } else {
               descriptionText = `请采集一张清晰的${name}照片。`;
          }
      }

      return (
      <>
        {/* Description */}
        <div className="mb-4">
            <label className="text-gray-400 text-xs font-bold mb-2 block">
                {isIntro ? '采集主题描述 (Collection Subject Description)' : '任务描述'}
            </label>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 font-medium leading-relaxed border border-gray-100">
                {descriptionText}
            </div>
        </div>
        
        {/* Requirements */}
        {currentTask.requirements && currentTask.requirements.length > 0 && (
            <div className="mb-6">
                <label className="text-gray-400 text-xs font-bold mb-2 block">
                    {isIntro ? '采集任务要求 (Collection Subject Task Requirements)' : '任务要求'}
                </label>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <ul className="space-y-3">
                        {currentTask.requirements.map((req: string, idx: number) => (
                            <li key={idx} className="flex items-start text-sm text-gray-700 font-medium">
                                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                {req}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        )}
      </>
      );
  };

  // INTRO SCREEN
  if (showIntro) {
    const taskList = category && difficulty ? COLLECTION_POOLS[category][difficulty] : [];
    
    // Determine specific requirement text based on category
    let requirementsText = "请拍摄清晰、光线充足的照片。主体需位于画面中心，避免模糊或遮挡。";
    if (category === CollectionCategory.VIDEO) {
        requirementsText = "在人行道上或绕过障碍物正常行走的同时，使用应用内相机录制视频。将相机保持在胸部高度，避免直接拍摄他人的面部。";
    } else if (category === CollectionCategory.AUDIO) {
        requirementsText = "请在安静的环境下录制音频，保持语速适中，吐字清晰。";
    }

    return (
      <div className="bg-white rounded-2xl p-5 shadow-lg w-full relative overflow-hidden animate-in fade-in max-h-[85vh] overflow-y-auto">
         {/* 1. Title Area */}
         <div className="mb-6">
             <div className="flex justify-between items-center mb-4">
                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                    {category || currentTask.theme}
                  </span>
                   <button onClick={onCancel} className="text-gray-300 hover:text-red-400 p-1">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
              </div>

             <div className="bg-[#eff6ff] rounded-2xl p-4">
                 <div className="flex items-center space-x-2 mb-2">
                     <span className="text-xs font-black text-blue-600 tracking-tight">AI TRAINING DATA</span>
                 </div>
                 <div className="bg-white rounded-lg p-3 mt-3 flex items-center shadow-sm">
                     <svg className="w-4 h-4 text-indigo-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                     <span className="text-xs font-bold text-indigo-600">
                        参与此项任务可以提高你的报酬结算比例。
                     </span>
                 </div>
              </div>
         </div>

         {/* 2. Task Area (List of 10 tasks) */}
         <div className="mb-6">
            <label className="text-gray-400 text-xs font-bold mb-2 flex justify-between items-center">
                <span>包含10道采集任务</span>
                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px]">PREVIEW</span>
            </label>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="max-h-32 overflow-y-auto pr-2 space-y-2">
                    {taskList.map((task, idx) => (
                        <div key={idx} className="flex items-start text-xs text-gray-600">
                            <span className="font-mono text-gray-400 mr-2">{(idx + 1).toString().padStart(2, '0')}</span>
                            <span>{task}</span>
                        </div>
                    ))}
                </div>
            </div>
         </div>
         
         {/* 3. Requirements Area */}
         <div className="mb-6">
            <label className="text-gray-400 text-xs font-bold mb-2 block">
                任务要求
            </label>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 font-medium leading-relaxed border border-gray-100">
                {requirementsText}
            </div>
         </div>
         
         {/* 4. Button Area */}
         <div className="space-y-3 mt-4">
            <button 
                onClick={() => {
                    setIntroDismissed(true);
                    setShowIntro(false);
                }}
                className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center text-sm tracking-wide"
            >
                开始
            </button>
            <button 
                onClick={onCancel}
                className="w-full py-3 rounded-xl bg-white border border-gray-200 text-gray-500 font-bold active:bg-gray-50 transition-colors text-sm"
            >
                返回
            </button>
            <p className="text-[10px] text-gray-400 text-center leading-tight px-4 pt-2">
                继续完成采集任务。
            </p>
         </div>
      </div>
    );
  }

  // ACTION SCREEN
  return (
    <div className="bg-white rounded-2xl p-5 shadow-lg w-full relative overflow-hidden animate-in fade-in">
      {type === TaskType.QUICK_JUDGMENT ? (
         <>
            <div className="flex justify-between items-center mb-4">
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">任务进度 {step}/{totalSteps}</span>
                {timeLeft > 0 && <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded">限时 {formatTime(timeLeft)}</span>}
                <button onClick={onCancel}><svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <h3 className="text-center font-bold text-gray-900 leading-tight mb-4">{currentTask.title}</h3>
            {/* Quick Judgment UI logic remains same ... */}
            <div className="space-y-4">
            {difficulty === Difficulty.EASY && currentTask.imageUrl && (
              <div className="space-y-4">
                <div className="w-full aspect-square rounded-xl overflow-hidden shadow-inner border border-gray-100">
                   <img src={currentTask.imageUrl} className="w-full h-full object-cover" alt="Target" />
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
                    <div key={img.id} onClick={() => setSelectedIds(prev => prev.includes(img.id) ? prev.filter(x => x !== img.id) : [...prev, img.id])} className={`flex items-center p-2 space-x-4 rounded-xl cursor-pointer transition-all border-2 ${selectedIds.includes(img.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                      <img src={img.url} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" alt="Option" />
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
         </>
      ) : (
          // COLLECTION TASK (Action View)
          <div className="space-y-4">
              {renderTaskHeader()}

              {/* Only show description/reqs if not recording/previewing to save space, or keep if UI demands. The screenshot implies they are visible before action. */}
              {(!isRecording && !mediaBlob) && renderDescriptionAndReqs(false)}

              {/* Action Area */}
              <div className="pt-2">
                  {isRecording && (
                     <div className="space-y-4 mb-4">
                        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg relative">
                           <video ref={videoPreviewRef} className="w-full h-full object-cover" playsInline autoPlay muted />
                           <div className="absolute top-4 right-4 bg-red-600 text-white font-mono text-sm px-2 py-1 rounded animate-pulse">REC {formatTime(recordingDuration)}</div>
                        </div>
                        <button onClick={stopRecording} className="w-full py-4 rounded-xl bg-red-600 text-white font-bold shadow-lg flex items-center justify-center">停止录制</button>
                     </div>
                  )}

                  {(!isRecording && mediaBlob) && (
                     <div className="space-y-4 mb-4">
                        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg flex items-center justify-center bg-gray-900">
                           {category === CollectionCategory.VIDEO ? (
                               <video src={URL.createObjectURL(mediaBlob)} className="w-full h-full object-contain" controls />
                           ) : (
                               <div className="text-white font-bold">已录制音频 ({recordingDuration}s)</div>
                           )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           <button onClick={() => { setMediaBlob(null); setRecordingDuration(0); }} className="py-3 rounded-xl border border-gray-200 font-bold text-gray-600">重录/重传</button>
                           <button onClick={() => handleMediaSubmit(category === CollectionCategory.VIDEO)} className="py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg">提交</button>
                        </div>
                     </div>
                  )}

                  {(!isRecording && !mediaBlob) && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                      <button 
                        onClick={() => document.getElementById('file-upload')?.click()}
                        className="h-32 flex flex-col items-center justify-center rounded-2xl border-2 border-gray-50 bg-white active:bg-gray-50 transition-all shadow-sm hover:shadow-md"
                        disabled={isUploading}
                      >
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          </div>
                          <span className="text-sm font-bold text-gray-700">上传{category === CollectionCategory.VIDEO ? '视频' : category === CollectionCategory.AUDIO ? '音频' : '图片'}</span>
                      </button>

                      <button 
                         onClick={() => {
                             if (category === CollectionCategory.VIDEO || category === CollectionCategory.AUDIO) {
                                 startRecording(category === CollectionCategory.VIDEO);
                             } else {
                                 document.getElementById('camera-upload')?.click();
                             }
                         }}
                         className="h-32 flex flex-col items-center justify-center rounded-2xl border-2 border-blue-50 bg-blue-50 active:bg-blue-100 transition-all shadow-sm hover:shadow-md"
                         disabled={isUploading}
                      >
                          <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mb-3 shadow-md">
                              {category === CollectionCategory.VIDEO ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                              ) : category === CollectionCategory.AUDIO ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                              ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              )}
                          </div>
                          <span className="text-sm font-bold text-blue-700">
                             {category === CollectionCategory.VIDEO ? '拍摄视频' : category === CollectionCategory.AUDIO ? '录制音频' : '拍摄照片'}
                          </span>
                      </button>
                  </div>
                  )}
              </div>
              
              <input type="file" className="hidden" id="file-upload" accept={category === CollectionCategory.VIDEO ? "video/*" : category === CollectionCategory.AUDIO ? "audio/*" : "image/*"} onChange={(e) => handleFileUpload(e, category !== CollectionCategory.PERSON && category !== CollectionCategory.STREET && category !== CollectionCategory.ANIMAL && category !== CollectionCategory.PLANT && category !== CollectionCategory.LIFE)} disabled={isUploading} />
              <input type="file" className="hidden" id="camera-upload" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, false)} disabled={isUploading} />
              
              {isUploading && (
                   <div className="flex items-center justify-center py-2 text-green-600 font-bold text-xs bg-green-50 rounded-lg">
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span>正在校验并上传...</span>
                   </div>
              )}
              {showDuplicateWarning && <div className="text-center text-red-500 bg-red-50 border border-red-200 p-2 rounded-lg text-xs font-bold animate-shake">⚠️ 提交重复，请重新选择。</div>}
              
              <div className="pt-2 text-center">
                  <button onClick={() => submitResult('skipped')} className="text-gray-400 text-xs font-bold hover:text-gray-600 py-2">跳过此任务</button>
              </div>
              <p className="text-[10px] text-gray-300 text-center leading-tight">所有上传内容均需人工与AI双重审核。</p>
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