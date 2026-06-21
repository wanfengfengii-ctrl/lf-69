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
  resolvedConflicts: Conflict[];
  newConflicts: Conflict[];
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

export type SelfRating = 'poor' | 'fair' | 'good' | 'excellent';

export const SELF_RATINGS: { value: SelfRating; label: string; color: string }[] = [
  { value: 'poor', label: '较差', color: 'red' },
  { value: 'fair', label: '一般', color: 'orange' },
  { value: 'good', label: '良好', color: 'amber' },
  { value: 'excellent', label: '优秀', color: 'emerald' },
];

export interface PracticeRecord {
  id: string;
  startTime: number;
  endTime: number;
  actualDuration: number;
  sectionId: string | null;
  sectionName: string;
  targetBpm: number;
  actualBpm: number;
  errorCount: number;
  stutterCount: number;
  selfRating: SelfRating;
  note?: string;
  createdAt: number;
}

export interface DailyStats {
  date: string;
  totalDuration: number;
  recordCount: number;
  avgRating: number;
}

export interface SectionStats {
  sectionId: string | null;
  sectionName: string;
  totalDuration: number;
  practiceCount: number;
  avgErrorCount: number;
  avgStutterCount: number;
  avgRating: number;
  lastPracticeTime: number | null;
  daysSinceLastPractice: number;
  isHighErrorRate: boolean;
  isLongUnpracticed: boolean;
}

export interface DateRange {
  start: string | null;
  end: string | null;
}

export type AnnotationTargetType = 'fingering' | 'section' | 'score';
export type AnnotationType = 'suggestion' | 'question' | 'error_mark' | 'technique_tip' | 'general';

export interface Annotation {
  id: string;
  targetType: AnnotationTargetType;
  targetId: string;
  content: string;
  author: string;
  annotationType: AnnotationType;
  createdAt: number;
  updatedAt: number;
}

export const ANNOTATION_TYPES: { value: AnnotationType; label: string; color: string }[] = [
  { value: 'suggestion', label: '建议', color: 'blue' },
  { value: 'question', label: '疑问', color: 'amber' },
  { value: 'error_mark', label: '错误标记', color: 'red' },
  { value: 'technique_tip', label: '技巧提示', color: 'emerald' },
  { value: 'general', label: '一般', color: 'stone' },
];

export const ANNOTATION_TARGET_TYPES: { value: AnnotationTargetType; label: string }[] = [
  { value: 'fingering', label: '单个指法' },
  { value: 'section', label: '练习段' },
  { value: 'score', label: '整段谱' },
];

export interface ErrorHotspot {
  fingeringId: string;
  character: string;
  errorCount: number;
  sectionId: string | null;
  sectionName: string;
}

export type MaterialMode = 'F_zhengdiao' | 'F_mandiao' | 'C_ruidiao' | 'D_biyuediao' | 'E_gumian' | 'G_qingyuandiao' | 'B_yanmoudiao' | 'A_huangzhongdiao' | 'other';

export type MaterialTechniqueCategory = 'right_hand_pluck' | 'right_hand_sweep' | 'right_hand_tremolo' | 'left_hand_slide' | 'left_hand_vibrato' | 'left_hand_press' | 'combined' | 'other';

export type MaterialScene = 'opening' | 'transition' | 'climax' | 'ending' | 'ornament' | 'sustained' | 'practice_drill' | 'other';

export interface MaterialFingering {
  character: string;
  stringIndex: number;
  huiPosition: number;
  rightHand: RightHandTechnique;
  leftHand: LeftHandTechnique;
  duration: number;
  difficulty?: DifficultyTag;
}

export interface Material {
  id: string;
  name: string;
  fingerings: MaterialFingering[];
  mode: MaterialMode;
  techniqueCategory: MaterialTechniqueCategory;
  difficulty: DifficultyTag;
  scene: MaterialScene;
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface MaterialFilter {
  keyword: string;
  mode: MaterialMode | null;
  techniqueCategory: MaterialTechniqueCategory | null;
  difficulty: DifficultyTag | null;
  scene: MaterialScene | null;
  isFavorite: boolean | null;
}

export interface MaterialCategoryStats {
  byMode: Partial<Record<MaterialMode, number>>;
  byTechniqueCategory: Partial<Record<MaterialTechniqueCategory, number>>;
  byDifficulty: Partial<Record<DifficultyTag, number>>;
  byScene: Partial<Record<MaterialScene, number>>;
  total: number;
  favorites: number;
}

export type PracticeGoal = 'technique_mastery' | 'speed_training' | 'accuracy' | 'endurance' | 'expression' | 'full_run';

export const PRACTICE_GOALS: { value: PracticeGoal; label: string; description: string }[] = [
  { value: 'technique_mastery', label: '技法掌握', description: '专注掌握特定指法技巧' },
  { value: 'speed_training', label: '速度训练', description: '提升演奏速度与流畅度' },
  { value: 'accuracy', label: '精准度', description: '提高指法准确性与音准' },
  { value: 'endurance', label: '耐力练习', description: '增强持续演奏能力' },
  { value: 'expression', label: '表现力', description: '提升音乐表现与情感传达' },
  { value: 'full_run', label: '完整演奏', description: '从头到尾完整练习' },
];

export interface MaterialCategoryUsageStats {
  byMode: Partial<Record<MaterialMode, number>>;
  byTechniqueCategory: Partial<Record<MaterialTechniqueCategory, number>>;
  byDifficulty: Partial<Record<DifficultyTag, number>>;
  byScene: Partial<Record<MaterialScene, number>>;
  totalUsage: number;
}

export interface PracticeSequenceItem {
  material: Material;
  order: number;
  reason: string;
  estimatedDuration: number;
}

export interface MaterialRecommendation {
  material: Material;
  score: number;
  reason: string;
}

export const MATERIAL_MODES: { value: MaterialMode; label: string }[] = [
  { value: 'F_zhengdiao', label: 'F调正调' },
  { value: 'F_mandiao', label: 'F调慢调' },
  { value: 'C_ruidiao', label: 'C调蕤宾调' },
  { value: 'D_biyuediao', label: 'D调碧玉调' },
  { value: 'E_gumian', label: 'E调姑悯' },
  { value: 'G_qingyuandiao', label: 'G调清商调' },
  { value: 'B_yanmoudiao', label: 'B调淹留调' },
  { value: 'A_huangzhongdiao', label: 'A调黄钟调' },
  { value: 'other', label: '其他调式' },
];

export const MATERIAL_TECHNIQUE_CATEGORIES: { value: MaterialTechniqueCategory; label: string }[] = [
  { value: 'right_hand_pluck', label: '右手指拨' },
  { value: 'right_hand_sweep', label: '右手扫拂' },
  { value: 'right_hand_tremolo', label: '右手轮指' },
  { value: 'left_hand_slide', label: '左手滑音' },
  { value: 'left_hand_vibrato', label: '左手吟猱' },
  { value: 'left_hand_press', label: '左手按弦' },
  { value: 'combined', label: '双手组合' },
  { value: 'other', label: '其他技法' },
];

export const MATERIAL_SCENES: { value: MaterialScene; label: string }[] = [
  { value: 'opening', label: '起势' },
  { value: 'transition', label: '过渡' },
  { value: 'climax', label: '高潮' },
  { value: 'ending', label: '收势' },
  { value: 'ornament', label: '装饰' },
  { value: 'sustained', label: '长音' },
  { value: 'practice_drill', label: '练习片段' },
  { value: 'other', label: '其他场景' },
];

export interface ReviewRecord {
  id: string;
  practiceRecordIds: string[];
  errorHotspots: ErrorHotspot[];
  improvementSuggestions: string;
  summary: string;
  createdAt: number;
}
