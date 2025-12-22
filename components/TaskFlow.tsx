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
    [Difficulty.EASY]: ['白色的狗', '黑色的猫', '小黄鸭', '金鱼', '彩色鹦鹉', '长耳朵兔子', '小乌龟', '白色公鸡', '花斑奶牛', '黑色小羊'],
    [Difficulty.MEDIUM]: ['草丛里的老虎', '森林里的狮子', '树上的猴子', '奔跑的豹子', '展翅的苍鹰', '吃竹子的熊猫', '河边的大象', '吃树叶的长颈鹿', '草原上的斑马', '嚎叫的灰狼'],
    [Difficulty.HARD]: [
        '请拍摄一张动物正在捕猎的照片', 
        '请拍摄一张动物正在睡觉的照片', 
        '请拍摄一张动物正在嬉戏的照片', 
        '请拍摄一张动物群体迁徙的照片', 
        '请拍摄一张鸟儿正在筑巢的照片', 
        '请拍摄一张动物跃出水面的照片', 
        '请拍摄一张动物正在蜕皮或换毛的照片', 
        '请拍摄一张动物正在捕鱼的照片', 
        '请拍摄一张动物在冰雪环境中的照片', 
        '请拍摄一张母兽与幼崽互动的照片'
    ]
  },
  [CollectionCategory.PLANT]: {
    [Difficulty.EASY]: ['红色的玫瑰', '绿色的梧桐树叶', '仙人掌', '多肉植物', '向日葵', '郁金香', '吊兰', '菊花', '芦荟', '牵牛花'],
    [Difficulty.MEDIUM]: ['公园里的梧桐树大道', '盛开的玫瑰花园', '原始森林里的古树', '沙漠中的绿洲植物', '大片盛开的薰衣草田', '挺拔的白杨树', '垂落的柳树枝条', '高大的棕榈树', '红色的枫叶林', '清新的竹林'],
    [Difficulty.HARD]: [
        '请拍摄一张阳光穿过树叶的照片', 
        '请拍摄一张沾满露水的花瓣或叶子的照片', 
        '请拍摄一张正在开花的非典型植物（如仙人掌）的照片', 
        '请拍摄一张枯木上长出新芽的照片', 
        '请拍摄一张雨滴打在植物上的照片', 
        '请拍摄一张含苞待放的花朵特写', 
        '请拍摄一张秋天落叶的照片', 
        '请拍摄一张植物向阳生长的照片', 
        '请拍摄一张有丁达尔效应的森林照片', 
        '请拍摄一张恶劣环境（如冻土、沙漠）中的植物照片'
    ]
  },
  [CollectionCategory.PERSON]: {
    [Difficulty.EASY]: ['手部照片', '腿部照片', '头发特写', '肩膀照片', '背影照片', '手臂特写', '脚步特写', '耳朵特写', '指甲特写', '颈部照片'],
    [Difficulty.MEDIUM]: ['正在写字的手', '正在跑步的腿', '正在整理头发的动作', '在敲击键盘的手', '正在走路的姿态', '在拿水杯的手', '正在阅读的侧影', '正在系鞋带的动作', '正在挥手告别的姿态', '正在思考时的手托腮'],
    [Difficulty.HARD]: [
        '请拍摄一张手正在弹钢琴的照片', 
        '请拍摄一张运动员正在跨栏的照片', 
        '请拍摄一张正在编织头发的照片', 
        '请拍摄一张人物正在做高难度瑜伽动作的照片', 
        '请拍摄一张外科医生正在做手术的照片', 
        '请拍摄一张工人正在进行精密组装的照片', 
        '请拍摄一张书法家正在写字的照片', 
        '请拍摄一张舞蹈演员正在跳舞的照片', 
        '请拍摄一张攀岩者正在攀岩的照片', 
        '请拍摄一张篮球运动员正在投篮的照片'
    ]
  },
  [CollectionCategory.STREET]: {
    [Difficulty.EASY]: ['城市街道', '农村田野', '乡镇集市', '学校操场', '社区公园', '公交车站', '天桥景观', '火车站广场景观', '购物中心门口', '安静的居民区街道'],
    [Difficulty.MEDIUM]: ['南京市图书馆正面', '西安农村的麦田', '繁华的上海南京路', '古老的江南水乡小巷', '标志性的城市钟楼', '跨海大桥的宏伟远景', '热闹的夜市摊位', '清晨无人的步行街', '充满涂鸦的艺术街区', '老旧斑驳的弄堂口'],
    [Difficulty.HARD]: [
        '请拍摄一张人们在图书馆内阅读的照片', 
        '请拍摄一张田野里收割机正在工作的照片', 
        '请拍摄一张城市夜晚霓虹闪烁的街道照片', 
        '请拍摄一张雨后古镇的倒影照片', 
        '请拍摄一张环卫工人正在清扫街道的照片', 
        '请拍摄一张雨中十字路口的照片', 
        '请拍摄一张夜市收摊时的照片', 
        '请拍摄一张灯火辉煌的CBD建筑群照片', 
        '请拍摄一张被雪覆盖的街道照片', 
        '请拍摄一张夕阳映照在建筑上的照片'
    ]
  },
  [CollectionCategory.LIFE]: {
    [Difficulty.EASY]: ['家庭作业图片', '做饭的原材料', '待洗的碗筷', '扫把和簸箕', '一杯热咖啡', '摊开的书本', '挂在架子上的钥匙', '整齐的床铺', '整理好的书包', '阳台上的晾衣架'],
    [Difficulty.MEDIUM]: ['认真书写的家庭作业', '正在锅里翻炒的菜肴', '水槽里打满泡沫的碗筷', '整洁干净的房间', '充满蒸汽的浴室一角', '正在充电的电子设备', '正在浇灌阳台花卉', '摆放整齐的书架', '热气腾腾的晚餐桌面', '正在使用的健身器材'],
    [Difficulty.HARD]: [
        '请在30分钟内，拍摄一张你正在洗碗的照片', 
        '请在30分钟内，拍摄一张你正在打扫房间的照片', 
        '请在30分钟内，拍摄一张你正在做饭的照片', 
        '请在30分钟内，拍摄一张你正在整理书桌的照片', 
        '请在30分钟内，拍摄一张你正在熨烫衣服的照片', 
        '请在30分钟内，拍摄一张你正在修理东西的照片', 
        '请在30分钟内，拍摄一张你正在组装家具的照片', 
        '请在30分钟内，拍摄一张你正在练习乐器的照片', 
        '请在30分钟内，拍摄一张你正在给宠物洗澡的照片', 
        '请在30分钟内，拍摄一张你正在整理衣柜的照片'
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

  const getPoints = () => {
    if (difficulty === Difficulty.EASY) return 1;
    if (difficulty === Difficulty.MEDIUM) return 3;
    return 6;
  };

  const generateNewTask = useCallback(() => {
    setIsLoading(true);
    setFeedback(null);
    setSelectedIds([]);
    
    if (type === TaskType.QUICK_JUDGMENT) {
      let target;
      const available = CATEGORIES.filter(c => !usedTasks.has(c));
      target = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : getRandomCategory();
      setUsedTasks(prev => new Set(prev).add(target));
      const targetZh = CATEGORY_MAP[target] || target;

      if (difficulty === Difficulty.EASY) {
        const other = CATEGORIES.filter(c => c !== target)[0] || (target === 'dog' ? 'cat' : 'dog');
        setCurrentTask({ 
          title: `请识别：哪个是【${targetZh}】？`, 
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

      if (difficulty === Difficulty.HARD) {
        setTimeLeft(1800); 
      }
      setCurrentTask({ title: `任务：${prompt}`, prompt });
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