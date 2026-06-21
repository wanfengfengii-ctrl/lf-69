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

export interface Fingering {
  id: string;
  character: string;
  stringIndex: number;
  huiPosition: number;
  rightHand: RightHandTechnique;
  leftHand: LeftHandTechnique;
  duration: number;
  startTime: number;
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
