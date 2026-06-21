import type {
  PracticeConfig,
  Fingering,
  PracticeSection,
  ScoreVersion,
  VersionDiff,
  HistoryState,
  PracticeViewData,
  DifficultyTag,
  RightHandTechnique,
  LeftHandTechnique,
} from '@/types/fingering';
import { RIGHT_HAND_TECHNIQUES, LEFT_HAND_TECHNIQUES } from '@/types/fingering';
import { generateId } from './validation';

export function secondsToBeats(seconds: number, bpm: number): number {
  return (seconds * bpm) / 60;
}

export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats * 60) / bpm;
}

export function getBeatDuration(bpm: number): number {
  return 60 / bpm;
}

export function getBarDuration(config: PracticeConfig): number {
  const beatDur = getBeatDuration(config.bpm);
  return beatDur * config.timeSignature.beats;
}

export function getBarForTime(time: number, config: PracticeConfig): number {
  const barDur = getBarDuration(config);
  return Math.floor(time / barDur) + 1;
}

export function getBarStartTimes(totalDuration: number, config: PracticeConfig): number[] {
  const barDur = getBarDuration(config);
  const times: number[] = [];
  for (let t = 0; t < totalDuration + barDur; t += barDur) {
    times.push(t);
  }
  return times;
}

export function getTechniqueLabel(
  technique: string,
  type: 'right' | 'left',
): string {
  if (type === 'right') {
    return RIGHT_HAND_TECHNIQUES.find((t) => t.value === technique)?.label || technique;
  }
  return LEFT_HAND_TECHNIQUES.find((t) => t.value === technique)?.label || technique;
}

export function calculateHighFrequencyTechniques(
  fingerings: Fingering[],
  topN: number = 5,
): Array<{ technique: string; label: string; count: number; type: 'right' | 'left' }> {
  const counts: Record<string, { count: number; type: 'right' | 'left' }> = {};

  for (const f of fingerings) {
    const rightKey = `right:${f.rightHand}`;
    counts[rightKey] = {
      count: (counts[rightKey]?.count || 0) + 1,
      type: 'right',
    };

    if (f.leftHand !== 'none') {
      const leftKey = `left:${f.leftHand}`;
      counts[leftKey] = {
        count: (counts[leftKey]?.count || 0) + 1,
        type: 'left',
      };
    }
  }

  const sorted = Object.entries(counts)
    .map(([key, data]) => {
      const [type, technique] = key.split(':');
      return {
        technique,
        label: getTechniqueLabel(technique, type as 'right' | 'left'),
        count: data.count,
        type: data.type,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  return sorted;
}

export function calculateDifficultSections(
  fingerings: Fingering[],
  minGroupSize: number = 3,
): Array<{
  startFingeringId: string;
  endFingeringId: string;
  startTime: number;
  endTime: number;
  difficulty: DifficultyTag;
  fingeringCount: number;
}> {
  const sorted = [...fingerings].sort((a, b) => a.startTime - b.startTime);
  const sections: Array<{
    startFingeringId: string;
    endFingeringId: string;
    startTime: number;
    endTime: number;
    difficulty: DifficultyTag;
    fingeringCount: number;
  }> = [];

  const difficultyRank: Record<DifficultyTag, number> = {
    easy: 0,
    medium: 1,
    hard: 2,
    expert: 3,
  };

  let i = 0;
  while (i < sorted.length) {
    const current = sorted[i];
    const currentDiff = current.difficulty || 'easy';

    if (currentDiff === 'easy') {
      i++;
      continue;
    }

    let group: Fingering[] = [current];
    let j = i + 1;

    while (j < sorted.length) {
      const next = sorted[j];
      const nextDiff = next.difficulty || 'easy';
      const timeGap = next.startTime - (sorted[j - 1].startTime + sorted[j - 1].duration);

      if (
        nextDiff !== 'easy' &&
        difficultyRank[nextDiff] >= difficultyRank[currentDiff] - 1 &&
        timeGap < 1
      ) {
        group.push(next);
        j++;
      } else {
        break;
      }
    }

    if (group.length >= minGroupSize) {
      const maxDiff = group.reduce(
        (max, f) =>
          difficultyRank[f.difficulty || 'easy'] > difficultyRank[max]
            ? (f.difficulty || 'easy')
            : max,
        currentDiff,
      );

      sections.push({
        startFingeringId: group[0].id,
        endFingeringId: group[group.length - 1].id,
        startTime: group[0].startTime,
        endTime: group[group.length - 1].startTime + group[group.length - 1].duration,
        difficulty: maxDiff,
        fingeringCount: group.length,
      });
    }

    i = j;
  }

  return sections;
}

export function calculateDifficultyDistribution(
  fingerings: Fingering[],
): Record<DifficultyTag, number> {
  const distribution: Record<DifficultyTag, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
    expert: 0,
  };

  for (const f of fingerings) {
    distribution[f.difficulty || 'easy']++;
  }

  return distribution;
}

export function createHistoryState(
  fingerings: Fingering[],
  sections: PracticeSection[],
  config: PracticeConfig,
  description: string,
): HistoryState {
  return {
    fingerings: JSON.parse(JSON.stringify(fingerings)),
    practiceSections: JSON.parse(JSON.stringify(sections)),
    practiceConfig: JSON.parse(JSON.stringify(config)),
    timestamp: Date.now(),
    description,
  };
}

export function createVersion(
  name: string,
  fingerings: Fingering[],
  sections: PracticeSection[],
  config: PracticeConfig,
  description?: string,
): ScoreVersion {
  return {
    id: generateId(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    description,
    fingerings: JSON.parse(JSON.stringify(fingerings)),
    practiceSections: JSON.parse(JSON.stringify(sections)),
    practiceConfig: JSON.parse(JSON.stringify(config)),
  };
}

export function diffVersions(v1: ScoreVersion, v2: ScoreVersion): VersionDiff {
  const diff: VersionDiff = {
    addedFingerings: [],
    removedFingerings: [],
    modifiedFingerings: [],
    addedSections: [],
    removedSections: [],
    modifiedSections: [],
    configChanged: false,
  };

  const v1FingMap = new Map(v1.fingerings.map((f) => [f.id, f]));
  const v2FingMap = new Map(v2.fingerings.map((f) => [f.id, f]));

  for (const f of v2.fingerings) {
    if (!v1FingMap.has(f.id)) {
      diff.addedFingerings.push(f);
    } else {
      const old = v1FingMap.get(f.id)!;
      if (JSON.stringify(old) !== JSON.stringify(f)) {
        diff.modifiedFingerings.push({ old, new: f });
      }
    }
  }

  for (const f of v1.fingerings) {
    if (!v2FingMap.has(f.id)) {
      diff.removedFingerings.push(f);
    }
  }

  const v1SecMap = new Map(v1.practiceSections.map((s) => [s.id, s]));
  const v2SecMap = new Map(v2.practiceSections.map((s) => [s.id, s]));

  for (const s of v2.practiceSections) {
    if (!v1SecMap.has(s.id)) {
      diff.addedSections.push(s);
    } else {
      const old = v1SecMap.get(s.id)!;
      if (JSON.stringify(old) !== JSON.stringify(s)) {
        diff.modifiedSections.push({ old, new: s });
      }
    }
  }

  for (const s of v1.practiceSections) {
    if (!v2SecMap.has(s.id)) {
      diff.removedSections.push(s);
    }
  }

  if (JSON.stringify(v1.practiceConfig) !== JSON.stringify(v2.practiceConfig)) {
    diff.configChanged = true;
    diff.oldConfig = v1.practiceConfig;
    diff.newConfig = v2.practiceConfig;
  }

  return diff;
}

export function generatePracticeViewData(
  title: string,
  fingerings: Fingering[],
  sections: PracticeSection[],
  config: PracticeConfig,
): PracticeViewData {
  const sorted = [...fingerings].sort((a, b) => a.startTime - b.startTime);
  const totalDuration =
    sorted.length > 0 ? sorted[sorted.length - 1].startTime + sorted[sorted.length - 1].duration : 0;
  const totalBeats = secondsToBeats(totalDuration, config.bpm);

  const viewSections = sections.map((section) => {
    const sectionFingerings = sorted
      .filter((f) => section.fingeringIds.includes(f.id))
      .sort((a, b) => a.startTime - b.startTime);

    const startTime =
      sectionFingerings.length > 0 ? sectionFingerings[0].startTime : 0;
    const endTime =
      sectionFingerings.length > 0
        ? sectionFingerings[sectionFingerings.length - 1].startTime +
          sectionFingerings[sectionFingerings.length - 1].duration
        : 0;

    return {
      name: section.name,
      startBeat: secondsToBeats(startTime, config.bpm),
      endBeat: secondsToBeats(endTime, config.bpm),
      startTime,
      endTime,
      loop: section.loop,
      tempoMultiplier: section.tempoMultiplier,
      fingerings: sectionFingerings.map((f) => ({
        character: f.character,
        beat: secondsToBeats(f.startTime, config.bpm),
        duration: f.duration,
        stringIndex: f.stringIndex,
        huiPosition: f.huiPosition,
        rightHand: getTechniqueLabel(f.rightHand, 'right'),
        leftHand: f.leftHand === 'none' ? '无' : getTechniqueLabel(f.leftHand, 'left'),
        note: f.note,
        difficulty: f.difficulty,
      })),
    };
  });

  const highFreq = calculateHighFrequencyTechniques(fingerings, 5);
  const difficultSecs = calculateDifficultSections(fingerings, 2);

  return {
    title,
    totalDuration,
    totalBeats,
    bpm: config.bpm,
    timeSignature: config.timeSignature,
    sections: viewSections,
    highFrequencyTechniques: highFreq.map((t) => ({
      technique: t.technique,
      label: t.label,
      count: t.count,
    })),
    difficultSections: difficultSecs.map((s, i) => ({
      name: `难点段落 ${i + 1}`,
      difficulty: s.difficulty,
      fingeringCount: s.fingeringCount,
    })),
  };
}

export function createPracticeSection(
  name: string,
  fingeringIds: string[],
  loop: boolean = false,
  loopCount: number = 1,
  tempoMultiplier: number = 1,
  note?: string,
): PracticeSection {
  return {
    id: generateId(),
    name,
    fingeringIds: [...fingeringIds],
    loop,
    loopCount,
    tempoMultiplier,
    note,
  };
}
