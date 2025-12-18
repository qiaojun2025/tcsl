
export enum Difficulty {
  EASY = '初级',
  MEDIUM = '中级',
  HARD = '高级'
}

export enum TaskType {
  QUICK_JUDGMENT = '快判任务',
  COLLECTION = '采集任务'
}

export enum CollectionCategory {
  IMAGE = '图片采集',
  VIDEO = '视频采集',
  AUDIO = '音频采集',
  TEXT = '文本采集'
}

export interface TaskRecord {
  id: string;
  timestamp: number;
  type: TaskType;
  difficulty: Difficulty;
  score: number;
  details: string;
}

export interface UserStats {
  userId: string;
  username: string;
  quickCount: number;
  collectionCount: number;
  quickScore: number;
  collectionScore: number;
  totalScore: number;
  // Key format: "TaskType_Difficulty_Timestamp"
  completions: Record<string, number>;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  iconClass: string;
  gradient: string;
}
