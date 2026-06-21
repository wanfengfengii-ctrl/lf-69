import { ref, computed } from 'vue';
import type {
  Fingering,
  FingeringStats,
  PracticeConfig,
  PracticeSection,
  HistoryState,
  ScoreVersion,
  VersionDiff,
  PracticeViewData,
  DifficultyTag,
  TimeAxisMode,
} from '@/types/fingering';
import { DEFAULT_PRACTICE_CONFIG } from '@/types/fingering';
import { generateId, validateFingering } from '@/utils/validation';
import {
  calculateHighFrequencyTechniques,
  calculateDifficultSections,
  calculateDifficultyDistribution,
  createHistoryState,
  createVersion,
  diffVersions,
  generatePracticeViewData,
  createPracticeSection,
  secondsToBeats,
  beatsToSeconds,
  getBarStartTimes,
} from '@/utils/practice';

const fingerings = ref<Fingering[]>([]);
const selectedId = ref<string | null>(null);
const practiceConfig = ref<PracticeConfig>({ ...DEFAULT_PRACTICE_CONFIG });
const practiceSections = ref<PracticeSection[]>([]);

const history = ref<HistoryState[]>([]);
const historyIndex = ref(-1);
const MAX_HISTORY_SIZE = 50;

const versions = ref<ScoreVersion[]>([]);

let isUndoRedoOperation = false;

export function useFingeringStore() {
  const sortedFingerings = computed(() => {
    return [...fingerings.value].sort((a, b) => a.startTime - b.startTime);
  });

  const totalDuration = computed(() => {
    if (sortedFingerings.value.length === 0) return 0;
    const last = sortedFingerings.value[sortedFingerings.value.length - 1];
    return last.startTime + last.duration;
  });

  const totalBeats = computed(() => {
    return secondsToBeats(totalDuration.value, practiceConfig.value.bpm);
  });

  const barStartTimes = computed(() => {
    return getBarStartTimes(totalDuration.value, practiceConfig.value);
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
      highFrequencyTechniques: calculateHighFrequencyTechniques(fingerings.value, 5),
      difficultSections: calculateDifficultSections(fingerings.value, 3),
      difficultyDistribution: calculateDifficultyDistribution(fingerings.value),
    };
  });

  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);

  function saveHistory(description: string) {
    if (isUndoRedoOperation) return;

    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1);
    }

    const state = createHistoryState(
      fingerings.value,
      practiceSections.value,
      practiceConfig.value,
      description,
    );

    history.value.push(state);

    if (history.value.length > MAX_HISTORY_SIZE) {
      history.value.shift();
    } else {
      historyIndex.value++;
    }
  }

  function undo() {
    if (!canUndo.value) return;

    isUndoRedoOperation = true;
    historyIndex.value--;
    const state = history.value[historyIndex.value];

    fingerings.value = JSON.parse(JSON.stringify(state.fingerings));
    practiceSections.value = JSON.parse(JSON.stringify(state.practiceSections));
    practiceConfig.value = JSON.parse(JSON.stringify(state.practiceConfig));

    isUndoRedoOperation = false;
  }

  function redo() {
    if (!canRedo.value) return;

    isUndoRedoOperation = true;
    historyIndex.value++;
    const state = history.value[historyIndex.value];

    fingerings.value = JSON.parse(JSON.stringify(state.fingerings));
    practiceSections.value = JSON.parse(JSON.stringify(state.practiceSections));
    practiceConfig.value = JSON.parse(JSON.stringify(state.practiceConfig));

    isUndoRedoOperation = false;
  }

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

    saveHistory(`添加指法: ${newFingering.character}`);

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

    saveHistory(`更新指法: ${updated.character}`);

    return { success: true, fingering: updated };
  }

  function updateFingeringNote(id: string, note: string) {
    return updateFingering(id, { note });
  }

  function updateFingeringDifficulty(id: string, difficulty: DifficultyTag) {
    return updateFingering(id, { difficulty });
  }

  function updateFingeringTags(id: string, tags: string[]) {
    return updateFingering(id, { tags });
  }

  function deleteFingering(id: string) {
    const index = fingerings.value.findIndex((f) => f.id === id);
    if (index > -1) {
      const deleted = fingerings.value[index];
      fingerings.value.splice(index, 1);

      for (const section of practiceSections.value) {
        const idx = section.fingeringIds.indexOf(id);
        if (idx > -1) {
          section.fingeringIds.splice(idx, 1);
        }
      }

      if (selectedId.value === id) {
        selectedId.value = null;
      }

      saveHistory(`删除指法: ${deleted.character}`);
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
    saveHistory('重新排序');
  }

  function clearAll() {
    const oldCount = fingerings.value.length;
    fingerings.value = [];
    practiceSections.value = [];
    selectedId.value = null;
    saveHistory(`清空所有 (${oldCount}个指法)`);
  }

  function setTimeAxisMode(mode: TimeAxisMode) {
    practiceConfig.value.timeAxisMode = mode;
    saveHistory(`切换时间轴模式: ${mode === 'seconds' ? '按秒' : '按拍'}`);
  }

  function setBPM(bpm: number) {
    if (bpm < 20 || bpm > 300) return;
    practiceConfig.value.bpm = bpm;
    saveHistory(`设置 BPM: ${bpm}`);
  }

  function setTimeSignature(beats: number, beatType: number) {
    practiceConfig.value.timeSignature = { beats, beatType };
    saveHistory(`设置节拍: ${beats}/${beatType}`);
  }

  function updatePracticeConfig(config: Partial<PracticeConfig>) {
    practiceConfig.value = { ...practiceConfig.value, ...config };
    saveHistory('更新练习配置');
  }

  function addPracticeSection(
    name: string,
    fingeringIds: string[],
    loop: boolean = false,
    loopCount: number = 1,
    tempoMultiplier: number = 1,
    note?: string,
  ) {
    const validIds = fingeringIds.filter((id) =>
      fingerings.value.some((f) => f.id === id),
    );

    if (validIds.length === 0) {
      return { success: false, errors: ['请选择有效的指法'] };
    }

    const section = createPracticeSection(
      name,
      validIds,
      loop,
      loopCount,
      tempoMultiplier,
      note,
    );

    practiceSections.value.push(section);
    saveHistory(`添加练习段: ${name}`);

    return { success: true, section };
  }

  function updatePracticeSection(id: string, updates: Partial<PracticeSection>) {
    const index = practiceSections.value.findIndex((s) => s.id === id);
    if (index === -1) return { success: false, errors: ['练习段不存在'] };

    practiceSections.value[index] = { ...practiceSections.value[index], ...updates };
    saveHistory(`更新练习段: ${practiceSections.value[index].name}`);

    return { success: true, section: practiceSections.value[index] };
  }

  function deletePracticeSection(id: string) {
    const index = practiceSections.value.findIndex((s) => s.id === id);
    if (index > -1) {
      const deleted = practiceSections.value[index];
      practiceSections.value.splice(index, 1);
      saveHistory(`删除练习段: ${deleted.name}`);
    }
  }

  function addFingeringToSection(sectionId: string, fingeringId: string) {
    const section = practiceSections.value.find((s) => s.id === sectionId);
    if (!section) return { success: false, errors: ['练习段不存在'] };

    if (!fingerings.value.some((f) => f.id === fingeringId)) {
      return { success: false, errors: ['指法不存在'] };
    }

    if (!section.fingeringIds.includes(fingeringId)) {
      section.fingeringIds.push(fingeringId);
      saveHistory(`添加指法到练习段: ${section.name}`);
    }

    return { success: true };
  }

  function removeFingeringFromSection(sectionId: string, fingeringId: string) {
    const section = practiceSections.value.find((s) => s.id === sectionId);
    if (!section) return { success: false, errors: ['练习段不存在'] };

    const idx = section.fingeringIds.indexOf(fingeringId);
    if (idx > -1) {
      section.fingeringIds.splice(idx, 1);
      saveHistory(`从练习段移除指法: ${section.name}`);
    }

    return { success: true };
  }

  function saveVersion(name: string, description?: string) {
    const version = createVersion(
      name,
      fingerings.value,
      practiceSections.value,
      practiceConfig.value,
      description,
    );
    versions.value.push(version);
    return version;
  }

  function loadVersion(versionId: string) {
    const version = versions.value.find((v) => v.id === versionId);
    if (!version) return { success: false, errors: ['版本不存在'] };

    isUndoRedoOperation = true;

    fingerings.value = JSON.parse(JSON.stringify(version.fingerings));
    practiceSections.value = JSON.parse(JSON.stringify(version.practiceSections));
    practiceConfig.value = JSON.parse(JSON.stringify(version.practiceConfig));
    selectedId.value = null;

    isUndoRedoOperation = false;
    saveHistory(`加载版本: ${version.name}`);

    return { success: true };
  }

  function deleteVersion(versionId: string) {
    const index = versions.value.findIndex((v) => v.id === versionId);
    if (index > -1) {
      versions.value.splice(index, 1);
    }
  }

  function compareVersions(v1Id: string, v2Id: string): VersionDiff | null {
    const v1 = versions.value.find((v) => v.id === v1Id);
    const v2 = versions.value.find((v) => v.id === v2Id);

    if (!v1 || !v2) return null;

    return diffVersions(v1, v2);
  }

  function exportJson(): string {
    return JSON.stringify(
      {
        fingerings: sortedFingerings.value,
        practiceSections: practiceSections.value,
        practiceConfig: practiceConfig.value,
        totalDuration: totalDuration.value,
        totalBeats: totalBeats.value,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
  }

  function exportPracticeView(title: string = '古琴练习谱'): PracticeViewData {
    return generatePracticeViewData(
      title,
      fingerings.value,
      practiceSections.value,
      practiceConfig.value,
    );
  }

  function exportPracticeViewJson(title: string = '古琴练习谱'): string {
    const data = generatePracticeViewData(
      title,
      fingerings.value,
      practiceSections.value,
      practiceConfig.value,
    );
    return JSON.stringify(data, null, 2);
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
        difficulty: 'easy',
        note: '开场音，要稳定',
      },
      {
        character: '散勾六',
        stringIndex: 6,
        huiPosition: 7,
        rightHand: 'gou',
        leftHand: 'none',
        duration: 1,
        startTime: 1,
        difficulty: 'easy',
      },
      {
        character: '抹五',
        stringIndex: 5,
        huiPosition: 9,
        rightHand: 'mo',
        leftHand: 'none',
        duration: 1.5,
        startTime: 2,
        difficulty: 'medium',
      },
      {
        character: '挑四',
        stringIndex: 4,
        huiPosition: 9,
        rightHand: 'tao',
        leftHand: 'shang',
        duration: 2,
        startTime: 3.5,
        difficulty: 'hard',
        note: '上滑音要流畅',
      },
      {
        character: '勾三',
        stringIndex: 3,
        huiPosition: 10,
        rightHand: 'gou',
        leftHand: 'xia',
        duration: 1.5,
        startTime: 5.5,
        difficulty: 'hard',
        note: '下滑音注意力度',
      },
      {
        character: '撮七二',
        stringIndex: 7,
        huiPosition: 7,
        rightHand: 'cuo',
        leftHand: 'none',
        duration: 2,
        startTime: 7,
        difficulty: 'medium',
      },
    ];

    fingerings.value = samples.map((s) => ({ ...s, id: generateId() }));

    const firstSixIds = fingerings.value.slice(0, 6).map((f) => f.id);
    practiceSections.value = [
      {
        id: generateId(),
        name: '开场段落',
        fingeringIds: firstSixIds.slice(0, 3),
        loop: true,
        loopCount: 2,
        tempoMultiplier: 0.8,
        note: '慢速练习，熟悉指法',
      },
      {
        id: generateId(),
        name: '技巧段落',
        fingeringIds: firstSixIds.slice(3, 6),
        loop: true,
        loopCount: 3,
        tempoMultiplier: 0.7,
        note: '重点练习上下滑音',
      },
    ];

    practiceConfig.value = {
      bpm: 60,
      timeSignature: { beats: 4, beatType: 4 },
      timeAxisMode: 'seconds',
    };

    history.value = [];
    historyIndex.value = -1;
    saveHistory('加载示例数据');
  }

  return {
    fingerings,
    sortedFingerings,
    totalDuration,
    totalBeats,
    barStartTimes,
    selectedId,
    selectedFingering,
    stats,
    practiceConfig,
    practiceSections,
    history,
    historyIndex,
    canUndo,
    canRedo,
    versions,
    addFingering,
    updateFingering,
    updateFingeringNote,
    updateFingeringDifficulty,
    updateFingeringTags,
    deleteFingering,
    selectFingering,
    updateDuration,
    updateStartTime,
    reorderByStartTime,
    clearAll,
    setTimeAxisMode,
    setBPM,
    setTimeSignature,
    updatePracticeConfig,
    addPracticeSection,
    updatePracticeSection,
    deletePracticeSection,
    addFingeringToSection,
    removeFingeringFromSection,
    undo,
    redo,
    saveVersion,
    loadVersion,
    deleteVersion,
    compareVersions,
    exportJson,
    exportPracticeView,
    exportPracticeViewJson,
    loadSampleData,
  };
}
