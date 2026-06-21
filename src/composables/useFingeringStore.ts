import { ref, computed } from 'vue';
import type { Fingering, FingeringStats } from '@/types/fingering';
import { generateId, validateFingering } from '@/utils/validation';

const fingerings = ref<Fingering[]>([]);
const selectedId = ref<string | null>(null);

export function useFingeringStore() {
  const sortedFingerings = computed(() => {
    return [...fingerings.value].sort((a, b) => a.startTime - b.startTime);
  });

  const totalDuration = computed(() => {
    if (sortedFingerings.value.length === 0) return 0;
    const last = sortedFingerings.value[sortedFingerings.value.length - 1];
    return last.startTime + last.duration;
  });

  const selectedFingering = computed(() => {
    if (!selectedId.value) return null;
    return fingerings.value.find((f) => f.id === selectedId.value) || null;
  });

  const stats = computed<FingeringStats>(() => {
    const rightHand: Record<string, number> = {};
    const leftHand: Record<string, number> = {};

    for (const f of fingerings.value) {
      rightHand[f.rightHand] = (rightHand[f.rightHand] || 0) + 1;
      if (f.leftHand !== 'none') {
        leftHand[f.leftHand] = (leftHand[f.leftHand] || 0) + 1;
      }
    }

    return {
      rightHand,
      leftHand,
      total: fingerings.value.length,
    };
  });

  function addFingering(fingeringData: Omit<Fingering, 'id'>) {
    const validation = validateFingering(fingeringData);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const newFingering: Fingering = {
      ...fingeringData,
      id: generateId(),
    };

    fingerings.value.push(newFingering);
    selectedId.value = newFingering.id;
    return { success: true, fingering: newFingering };
  }

  function updateFingering(id: string, updates: Partial<Fingering>) {
    const index = fingerings.value.findIndex((f) => f.id === id);
    if (index === -1) return { success: false, errors: ['指法不存在'] };

    const updated = { ...fingerings.value[index], ...updates };
    const validation = validateFingering(updated);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    fingerings.value[index] = updated;
    return { success: true, fingering: updated };
  }

  function deleteFingering(id: string) {
    const index = fingerings.value.findIndex((f) => f.id === id);
    if (index > -1) {
      fingerings.value.splice(index, 1);
      if (selectedId.value === id) {
        selectedId.value = null;
      }
    }
  }

  function selectFingering(id: string | null) {
    selectedId.value = id;
  }

  function updateDuration(id: string, duration: number) {
    if (duration <= 0) return;
    updateFingering(id, { duration });
  }

  function updateStartTime(id: string, startTime: number) {
    if (startTime < 0) startTime = 0;
    updateFingering(id, { startTime });
  }

  function reorderByStartTime() {
    fingerings.value.sort((a, b) => a.startTime - b.startTime);
  }

  function clearAll() {
    fingerings.value = [];
    selectedId.value = null;
  }

  function exportJson(): string {
    return JSON.stringify(
      {
        fingerings: sortedFingerings.value,
        totalDuration: totalDuration.value,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
  }

  function loadSampleData() {
    const samples: Omit<Fingering, 'id'>[] = [
      {
        character: '散挑七',
        stringIndex: 7,
        huiPosition: 7,
        rightHand: 'tao',
        leftHand: 'none',
        duration: 1,
        startTime: 0,
      },
      {
        character: '散勾六',
        stringIndex: 6,
        huiPosition: 7,
        rightHand: 'gou',
        leftHand: 'none',
        duration: 1,
        startTime: 1,
      },
      {
        character: '抹五',
        stringIndex: 5,
        huiPosition: 9,
        rightHand: 'mo',
        leftHand: 'none',
        duration: 1.5,
        startTime: 2,
      },
      {
        character: '挑四',
        stringIndex: 4,
        huiPosition: 9,
        rightHand: 'tao',
        leftHand: 'shang',
        duration: 2,
        startTime: 3.5,
      },
      {
        character: '勾三',
        stringIndex: 3,
        huiPosition: 10,
        rightHand: 'gou',
        leftHand: 'xia',
        duration: 1.5,
        startTime: 5.5,
      },
      {
        character: '撮七二',
        stringIndex: 7,
        huiPosition: 7,
        rightHand: 'cuo',
        leftHand: 'none',
        duration: 2,
        startTime: 7,
      },
    ];

    fingerings.value = samples.map((s) => ({ ...s, id: generateId() }));
  }

  return {
    fingerings,
    sortedFingerings,
    totalDuration,
    selectedId,
    selectedFingering,
    stats,
    addFingering,
    updateFingering,
    deleteFingering,
    selectFingering,
    updateDuration,
    updateStartTime,
    reorderByStartTime,
    clearAll,
    exportJson,
    loadSampleData,
  };
}
