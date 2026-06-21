export type RightHandTechnique =
  | 'tuo'
  | 'pi'
  | 'mo'
  | 'tao'
  | 'gou'
  | 'ti'
  | 'da'
  | 'zhai'
  | 'bo'
  | 'fu'
  | 'lun'
  | 'cuo'
  | 'zhuang'
  | 'ling'
  | 'ren';

export type LeftHandTechnique =
  | 'none'
  | 'tao'
  | 'ni'
  | 'fuo'
  | 'zhuang'
  | 'xian'
  | 'zhu'
  | 'chi'
  | 'chang'
  | 'duan'
  | 'shang'
  | 'xia'
  | 'jin'
  | 'tui'
  | 'fu';

export type DifficultyTag = 'easy' | 'medium' | 'hard' | 'expert';
export type TimeAxisMode = 'seconds' | 'beats';

export interface Fingering {
  id: string;
  character: string;
  stringIndex: number;
  huiPosition: number;
  rightHand: RightHandTechnique;
  leftHand: LeftHandTechnique;
  duration: number;
  startTime: number;
  note?: string;
  difficulty?: DifficultyTag;
  tags?: string[];
}

export interface Conflict {
  id: string;
  fingeringIds: string[];
  type: 'left_hand' | 'right_hand' | 'timing';
  description: string;
}

export interface FingeringStats {
  rightHand: Partial<Record<RightHandTechnique, number>>;
  leftHand: Partial<Record<LeftHandTechnique, number>>;
  total: number;
  highFrequencyTechniques: Array<{ technique: string; label: string; count: number; type: 'right' | 'left' }>;
  difficultSections: Array<{ startFingeringId: string; endFingeringId: string; startTime: number; endTime: number; difficulty: DifficultyTag; fingeringCount: number }>;
  difficultyDistribution: Record<DifficultyTag, number>;
}

export interface TimeSignature {
  beats: number;
  beatType: number;
}

export interface PracticeConfig {
  bpm: number;
  timeSignature: TimeSignature;
  timeAxisMode: TimeAxisMode;
}

export interface PracticeSection {
  id: string;
  name: string;
  fingeringIds: string[];
  loop: boolean;
  loopCount: number;
  tempoMultiplier: number;
  note?: string;
}

export interface HistoryState {
  fingerings: Fingering[];
  practiceSections: PracticeSection[];
  practiceConfig: PracticeConfig;
  timestamp: number;
  description: string;
}

export interface ScoreVersion {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  description?: string;
  fingerings: Fingering[];
  practiceSections: PracticeSection[];
  practiceConfig: PracticeConfig;
}

export interface VersionDiff {
  addedFingerings: Fingering[];
  removedFingerings: Fingering[];
  modifiedFingerings: Array<{ old: Fingering; new: Fingering }>;
  addedSections: PracticeSection[];
  removedSections: PracticeSection[];
  modifiedSections: Array<{ old: PracticeSection; new: PracticeSection }>;
  configChanged: boolean;
  oldConfig?: PracticeConfig;
  newConfig?: PracticeConfig;
}

export interface PracticeViewData {
  title: string;
  totalDuration: number;
  totalBeats: number;
  bpm: number;
  timeSignature: TimeSignature;
  sections: Array<{
    name: string;
    startBeat: number;
    endBeat: number;
    startTime: number;
    endTime: number;
    loop: boolean;
    tempoMultiplier: number;
    fingerings: Array<{
      character: string;
      beat: number;
      duration: number;
      stringIndex: number;
      huiPosition: number;
      rightHand: string;
      leftHand: string;
      note?: string;
      difficulty?: DifficultyTag;
    }>;
  }>;
  highFrequencyTechniques: Array<{ technique: string; label: string; count: number }>;
  difficultSections: Array<{ name: string; difficulty: DifficultyTag; fingeringCount: number }>;
}

export const RIGHT_HAND_TECHNIQUES: { value: RightHandTechnique; label: string }[] = [
  { value: 'tuo', label: '托' },
  { value: 'pi', label: '擘' },
  { value: 'mo', label: '抹' },
  { value: 'tao', label: '挑' },
  { value: 'gou', label: '勾' },
  { value: 'ti', label: '剔' },
  { value: 'da', label: '打' },
  { value: 'zhai', label: '摘' },
  { value: 'bo', label: '拨' },
  { value: 'fu', label: '拂' },
  { value: 'lun', label: '轮' },
  { value: 'cuo', label: '撮' },
  { value: 'zhuang', label: '撞' },
  { value: 'ling', label: '铃' },
  { value: 'ren', label: '认' },
];

export const LEFT_HAND_TECHNIQUES: { value: LeftHandTechnique; label: string }[] = [
  { value: 'none', label: '无' },
  { value: 'tao', label: '韬' },
  { value: 'ni', label: '匿' },
  { value: 'fuo', label: '伏' },
  { value: 'zhuang', label: '撞' },
  { value: 'xian', label: '罨' },
  { value: 'zhu', label: '注' },
  { value: 'chi', label: '迟' },
  { value: 'chang', label: '长' },
  { value: 'duan', label: '短' },
  { value: 'shang', label: '上' },
  { value: 'xia', label: '下' },
  { value: 'jin', label: '进' },
  { value: 'tui', label: '退' },
  { value: 'fu', label: '复' },
];

export const STRING_LABELS = ['一弦', '二弦', '三弦', '四弦', '五弦', '六弦', '七弦'];

export const HUI_POSITIONS = [
  { value: 0.5, label: '半徽' },
  { value: 1, label: '一徽' },
  { value: 1.5, label: '一徽半' },
  { value: 2, label: '二徽' },
  { value: 2.5, label: '二徽半' },
  { value: 3, label: '三徽' },
  { value: 3.5, label: '三徽半' },
  { value: 4, label: '四徽' },
  { value: 4.5, label: '四徽半' },
  { value: 5, label: '五徽' },
  { value: 5.5, label: '五徽半' },
  { value: 6, label: '六徽' },
  { value: 6.5, label: '六徽半' },
  { value: 7, label: '七徽' },
  { value: 7.5, label: '七徽半' },
  { value: 8, label: '八徽' },
  { value: 8.5, label: '八徽半' },
  { value: 9, label: '九徽' },
  { value: 9.5, label: '九徽半' },
  { value: 10, label: '十徽' },
  { value: 10.5, label: '十徽半' },
  { value: 11, label: '十一徽' },
  { value: 11.5, label: '十一徽半' },
  { value: 12, label: '十二徽' },
  { value: 12.5, label: '十二徽半' },
  { value: 13, label: '十三徽' },
];

export const DIFFICULTY_TAGS: { value: DifficultyTag; label: string; color: string }[] = [
  { value: 'easy', label: '简单', color: 'emerald' },
  { value: 'medium', label: '中等', color: 'amber' },
  { value: 'hard', label: '困难', color: 'orange' },
  { value: 'expert', label: '专家', color: 'red' },
];

export const TIME_SIGNATURES: { value: TimeSignature; label: string }[] = [
  { value: { beats: 2, beatType: 4 }, label: '2/4' },
  { value: { beats: 3, beatType: 4 }, label: '3/4' },
  { value: { beats: 4, beatType: 4 }, label: '4/4' },
  { value: { beats: 5, beatType: 4 }, label: '5/4' },
  { value: { beats: 6, beatType: 8 }, label: '6/8' },
  { value: { beats: 7, beatType: 8 }, label: '7/8' },
];

export const DEFAULT_PRACTICE_CONFIG: PracticeConfig = {
  bpm: 60,
  timeSignature: { beats: 4, beatType: 4 },
  timeAxisMode: 'seconds',
};
