import { computed, type Ref, type ComputedRef } from 'vue';
import type { Fingering, Conflict } from '@/types/fingering';
import { isTimeOverlap, generateId } from '@/utils/validation';

const CONFLICTING_LEFT_HAND: string[][] = [
  ['shang', 'xia'],
  ['jin', 'tui'],
  ['shang', 'fu'],
  ['xia', 'fu'],
];

const CONFLICTING_RIGHT_HAND: string[][] = [
  ['tuo', 'pi'],
  ['mo', 'tao'],
  ['gou', 'ti'],
  ['da', 'zhai'],
];

export function useConflictDetector(
  fingerings: Ref<Fingering[]> | ComputedRef<Fingering[]>,
) {
  const conflicts = computed<Conflict[]>(() => {
    const result: Conflict[] = [];
    const fings = [...fingerings.value].sort((a, b) => a.startTime - b.startTime);

    for (let i = 0; i < fings.length; i++) {
      for (let j = i + 1; j < fings.length; j++) {
        const f1 = fings[i];
        const f2 = fings[j];

        const end1 = f1.startTime + f1.duration;
        const end2 = f2.startTime + f2.duration;

        if (!isTimeOverlap(f1.startTime, end1, f2.startTime, end2)) {
          continue;
        }

        if (hasLeftHandConflict(f1.leftHand, f2.leftHand)) {
          result.push({
            id: generateId(),
            fingeringIds: [f1.id, f2.id],
            type: 'left_hand',
            description: `时间重叠的左手技法冲突: ${f1.character} 与 ${f2.character}`,
          });
        }

        if (hasRightHandConflict(f1.rightHand, f2.rightHand)) {
          result.push({
            id: generateId(),
            fingeringIds: [f1.id, f2.id],
            type: 'right_hand',
            description: `时间重叠的右手指法冲突: ${f1.character} 与 ${f2.character}`,
          });
        }
      }
    }

    return result;
  });

  const hasConflicts = computed(() => conflicts.value.length > 0);

  const conflictCount = computed(() => conflicts.value.length);

  function isFingeringInConflict(fingeringId: string): boolean {
    return conflicts.value.some((c) => c.fingeringIds.includes(fingeringId));
  }

  function getConflictsForFingering(fingeringId: string): Conflict[] {
    return conflicts.value.filter((c) => c.fingeringIds.includes(fingeringId));
  }

  function hasLeftHandConflict(lh1: string, lh2: string): boolean {
    if (lh1 === 'none' || lh2 === 'none') return false;
    return CONFLICTING_LEFT_HAND.some(
      (pair) =>
        (pair[0] === lh1 && pair[1] === lh2) || (pair[0] === lh2 && pair[1] === lh1),
    );
  }

  function hasRightHandConflict(rh1: string, rh2: string): boolean {
    return CONFLICTING_RIGHT_HAND.some(
      (pair) =>
        (pair[0] === rh1 && pair[1] === rh2) || (pair[0] === rh2 && pair[1] === rh1),
    );
  }

  return {
    conflicts,
    hasConflicts,
    conflictCount,
    isFingeringInConflict,
    getConflictsForFingering,
  };
}
