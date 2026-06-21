import type { Fingering } from '@/types/fingering';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateFingering(fingering: Partial<Fingering>): ValidationResult {
  const errors: string[] = [];

  if (!fingering.character || fingering.character.trim() === '') {
    errors.push('谱字不能为空');
  }

  if (fingering.stringIndex === undefined || fingering.stringIndex === null) {
    errors.push('请选择弦位');
  } else if (fingering.stringIndex < 1 || fingering.stringIndex > 7) {
    errors.push('弦位必须在 1-7 之间');
  }

  if (fingering.huiPosition === undefined || fingering.huiPosition === null) {
    errors.push('请选择徽位');
  } else if (!isValidHuiPosition(fingering.huiPosition)) {
    errors.push('徽位范围不合法，必须在半徽到十三徽之间');
  }

  if (fingering.duration === undefined || fingering.duration === null) {
    errors.push('请设置持续时长');
  } else if (fingering.duration <= 0) {
    errors.push('持续时长必须大于 0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isValidHuiPosition(hui: number): boolean {
  if (hui < 0.5 || hui > 13) {
    return false;
  }
  const decimal = hui % 1;
  return decimal === 0 || decimal === 0.5;
}

export function isTimeOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number,
): boolean {
  return start1 < end2 && start2 < end1;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}
