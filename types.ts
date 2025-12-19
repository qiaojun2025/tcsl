
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
  ANIMAL = '动物类',
  PLANT = '植物类',
  PERSON = '人物类',
  STREET = '街景类',
  LIFE = '生活类'
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
  completions: Record<string, number>;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  iconClass: string;
  gradient: string;
}
