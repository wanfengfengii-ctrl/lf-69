import { ref, computed, watch } from 'vue';
import type { ReviewRecord, ErrorHotspot, PracticeRecord, DateRange } from '@/types/fingering';
import { generateId } from '@/utils/validation';
import { useAnnotationStore } from './useAnnotationStore';
import { usePracticeTracker } from './usePracticeTracker';
import { useFingeringStore } from './useFingeringStore';

const STORAGE_KEY = 'guqin-review-records';

const reviewRecords = ref<ReviewRecord[]>([]);
const reviewFilter = ref<{
  dateRange: DateRange;
  sectionId: string | null;
}>({
  dateRange: { start: null, end: null },
  sectionId: null,
});

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      reviewRecords.value = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load review records:', e);
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviewRecords.value));
  } catch (e) {
    console.error('Failed to save review records:', e);
  }
}

loadFromStorage();

watch(reviewRecords, saveToStorage, { deep: true });

export function useReviewStore() {
  const { annotations, getAnnotationsForTarget, getAnnotationTypeLabel } = useAnnotationStore();
  const { practiceRecords, filteredRecords, formatDuration, getRatingLabel, ratingToNumber, numberToRating } = usePracticeTracker();
  const { fingerings, practiceSections, sortedFingerings, exportJson, totalDuration, totalBeats, practiceConfig } = useFingeringStore();

  const filteredReviewRecords = computed(() => {
    let result = [...reviewRecords.value];

    if (reviewFilter.value.dateRange.start) {
      const startTs = new Date(reviewFilter.value.dateRange.start + 'T00:00:00').getTime();
      result = result.filter((r) => r.createdAt >= startTs);
    }

    if (reviewFilter.value.dateRange.end) {
      const endTs = new Date(reviewFilter.value.dateRange.end + 'T23:59:59').getTime();
      result = result.filter((r) => r.createdAt <= endTs);
    }

    if (reviewFilter.value.sectionId) {
      result = result.filter((r) =>
        r.errorHotspots.some((h) => h.sectionId === reviewFilter.value.sectionId),
      );
    }

    return result.sort((a, b) => b.createdAt - a.createdAt);
  });

  function computeErrorHotspots(practiceRecordIds: string[]): ErrorHotspot[] {
    const selectedRecords = practiceRecords.value.filter((r) =>
      practiceRecordIds.includes(r.id),
    );

    if (selectedRecords.length === 0) return [];

    const fingeringErrors: Record<string, { count: number; sectionId: string | null; sectionName: string }> = {};

    for (const record of selectedRecords) {
      if (record.sectionId && record.errorCount > 0) {
        const section = practiceSections.value.find((s) => s.id === record.sectionId);
        if (section) {
          for (const fingeringId of section.fingeringIds) {
            if (!fingeringErrors[fingeringId]) {
              const f = fingerings.value.find((fi) => fi.id === fingeringId);
              fingeringErrors[fingeringId] = {
                count: 0,
                sectionId: record.sectionId,
                sectionName: record.sectionName,
              };
            }
            fingeringErrors[fingeringId].count += record.errorCount;
          }
        }
      }
    }

    const hotspots: ErrorHotspot[] = Object.entries(fingeringErrors)
      .map(([fingeringId, data]) => {
        const f = fingerings.value.find((fi) => fi.id === fingeringId);
        return {
          fingeringId,
          character: f?.character || '未知',
          errorCount: data.count,
          sectionId: data.sectionId,
          sectionName: data.sectionName,
        };
      })
      .sort((a, b) => b.errorCount - a.errorCount);

    return hotspots;
  }

  function generateAutoSuggestions(hotspots: ErrorHotspot[], selectedRecords: PracticeRecord[]): string {
    const lines: string[] = [];

    if (hotspots.length > 0) {
      const topHotspots = hotspots.slice(0, 3);
      lines.push('【错误集中指法】');
      for (const h of topHotspots) {
        lines.push(`- ${h.character}（${h.sectionName}）: 累计错误 ${h.errorCount} 次，建议重点练习`);
      }
    }

    const avgRating = selectedRecords.length > 0
      ? selectedRecords.reduce((sum, r) => sum + ratingToNumber(r.selfRating), 0) / selectedRecords.length
      : 0;

    if (avgRating <= 2) {
      lines.push('整体自评偏低，建议放慢速度、分小段练习');
    }

    const highErrorRecords = selectedRecords.filter((r) => r.errorCount >= 3);
    if (highErrorRecords.length > 0) {
      lines.push(`${highErrorRecords.length} 次练习错误率较高，建议针对性练习相关段落`);
    }

    if (lines.length === 0) {
      lines.push('本次练习表现良好，继续保持');
    }

    return lines.join('\n');
  }

  function generateAutoSummary(selectedRecords: PracticeRecord[], hotspots: ErrorHotspot[]): string {
    const totalDuration = selectedRecords.reduce((sum, r) => sum + r.actualDuration, 0);
    const totalErrors = selectedRecords.reduce((sum, r) => sum + r.errorCount, 0);
    const avgRating = selectedRecords.length > 0
      ? selectedRecords.reduce((sum, r) => sum + ratingToNumber(r.selfRating), 0) / selectedRecords.length
      : 0;

    const lines: string[] = [];
    lines.push(`共练习 ${selectedRecords.length} 次，总时长 ${formatDuration(totalDuration)}`);
    lines.push(`总错误 ${totalErrors} 次，平均自评 ${avgRating > 0 ? getRatingLabel(selectedRecords[0]?.selfRating || 'fair') : '暂无'}`);

    if (hotspots.length > 0) {
      lines.push(`错误集中在 ${hotspots.length} 个指法上`);
    }

    return lines.join('；');
  }

  function addReviewRecord(
    practiceRecordIds: string[],
    improvementSuggestions: string,
    summary: string,
  ): { success: boolean; errors?: string[]; record?: ReviewRecord } {
    const errors: string[] = [];

    const validIds = practiceRecordIds.filter((id) =>
      practiceRecords.value.some((r) => r.id === id),
    );

    if (validIds.length === 0) {
      errors.push('复盘记录必须关联至少一条有效的练习记录');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const hotspots = computeErrorHotspots(validIds);
    const selectedRecords = practiceRecords.value.filter((r) => validIds.includes(r.id));
    const autoSummary = summary || generateAutoSummary(selectedRecords, hotspots);
    const autoSuggestions = improvementSuggestions || generateAutoSuggestions(hotspots, selectedRecords);

    const record: ReviewRecord = {
      id: generateId(),
      practiceRecordIds: validIds,
      errorHotspots: hotspots,
      improvementSuggestions: autoSuggestions,
      summary: autoSummary,
      createdAt: Date.now(),
    };

    reviewRecords.value.push(record);
    return { success: true, record };
  }

  function updateReviewRecord(
    id: string,
    updates: Partial<Pick<ReviewRecord, 'improvementSuggestions' | 'summary'>>,
  ): { success: boolean; errors?: string[] } {
    const index = reviewRecords.value.findIndex((r) => r.id === id);
    if (index === -1) {
      return { success: false, errors: ['复盘记录不存在'] };
    }

    reviewRecords.value[index] = {
      ...reviewRecords.value[index],
      ...updates,
    };

    return { success: true };
  }

  function deleteReviewRecord(id: string) {
    const index = reviewRecords.value.findIndex((r) => r.id === id);
    if (index > -1) {
      reviewRecords.value.splice(index, 1);
    }
  }

  function setReviewFilter(filter: { dateRange: DateRange; sectionId: string | null }) {
    reviewFilter.value = { ...filter };
  }

  function clearReviewFilter() {
    reviewFilter.value = {
      dateRange: { start: null, end: null },
      sectionId: null,
    };
  }

  function exportReviewReport(reviewId: string): string {
    const review = reviewRecords.value.find((r) => r.id === reviewId);
    if (!review) return '';

    const selectedRecords = practiceRecords.value.filter((r) =>
      review.practiceRecordIds.includes(r.id),
    );

    const relatedSectionIds = new Set<string>();
    const relatedFingeringIds = new Set<string>();
    for (const r of selectedRecords) {
      if (r.sectionId) {
        relatedSectionIds.add(r.sectionId);
        const section = practiceSections.value.find((s) => s.id === r.sectionId);
        if (section) {
          for (const fid of section.fingeringIds) {
            relatedFingeringIds.add(fid);
          }
        }
      }
    }

    const reviewAnnotations = annotations.value.filter((a) => {
      if (a.targetType === 'score') return true;
      if (a.targetType === 'section' && relatedSectionIds.has(a.targetId)) return true;
      if (a.targetType === 'fingering' && relatedFingeringIds.has(a.targetId)) return true;
      return false;
    }).sort((a, b) => b.createdAt - a.createdAt);

    const lines: string[] = [];
    lines.push('古琴练习复盘报告');
    lines.push('='.repeat(50));
    lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
    lines.push(`复盘时间: ${new Date(review.createdAt).toLocaleString('zh-CN')}`);
    lines.push('');

    lines.push('【谱面信息】');
    lines.push(`指法总数: ${sortedFingerings.value.length}`);
    lines.push(`练习段数: ${practiceSections.value.length}`);
    lines.push(`总时长: ${totalDuration.value.toFixed(1)} 秒 / ${totalBeats.value.toFixed(1)} 拍`);
    lines.push(`BPM: ${practiceConfig.value.bpm}`);
    lines.push(`节拍: ${practiceConfig.value.timeSignature.beats}/${practiceConfig.value.timeSignature.beatType}`);
    lines.push('');

    if (practiceSections.value.length > 0) {
      lines.push('【练习段列表】');
      for (const section of practiceSections.value) {
        const sectionFings = sortedFingerings.value.filter((f) =>
          section.fingeringIds.includes(f.id),
        );
        const startTime = sectionFings.length > 0 ? sectionFings[0].startTime : 0;
        const endTime = sectionFings.length > 0
          ? sectionFings[sectionFings.length - 1].startTime + sectionFings[sectionFings.length - 1].duration
          : 0;
        lines.push(
          `- ${section.name}: ${section.fingeringIds.length} 个指法, 时长 ${(endTime - startTime).toFixed(1)}s${section.loop ? ` (循环${section.loopCount}次)` : ''}`,
        );
      }
      lines.push('');
    }

    lines.push('【复盘概要】');
    lines.push(review.summary);
    lines.push('');

    if (reviewAnnotations.length > 0) {
      lines.push(`【相关批注】(${reviewAnnotations.length}条)`);
      for (const a of reviewAnnotations) {
        let targetLabel = '';
        if (a.targetType === 'score') {
          targetLabel = '整段谱';
        } else if (a.targetType === 'section') {
          const section = practiceSections.value.find((s) => s.id === a.targetId);
          targetLabel = section ? `练习段: ${section.name}` : '已删除练习段';
        } else {
          const fing = sortedFingerings.value.find((f) => f.id === a.targetId);
          targetLabel = fing ? `指法: ${fing.character}` : '已删除指法';
        }
        lines.push(
          `- [${getAnnotationTypeLabel(a.annotationType)}] ${targetLabel} | ${a.author}: ${a.content} (${new Date(a.createdAt).toLocaleString('zh-CN')})`,
        );
      }
      lines.push('');
    }

    lines.push('【练习统计】');
    const practiceTotalDuration = selectedRecords.reduce((sum, r) => sum + r.actualDuration, 0);
    const totalErrors = selectedRecords.reduce((sum, r) => sum + r.errorCount, 0);
    const totalStutters = selectedRecords.reduce((sum, r) => sum + r.stutterCount, 0);
    const avgRating = selectedRecords.length > 0
      ? selectedRecords.reduce((sum, r) => sum + ratingToNumber(r.selfRating), 0) / selectedRecords.length
      : 0;

    lines.push(`关联练习次数: ${selectedRecords.length}`);
    lines.push(`总练习时长: ${formatDuration(practiceTotalDuration)}`);
    lines.push(`总错误次数: ${totalErrors}`);
    lines.push(`总卡顿次数: ${totalStutters}`);
    lines.push(
      `平均自评: ${avgRating > 0 ? getRatingLabel(numberToRating(avgRating)) : '暂无'} (${avgRating.toFixed(1)}/4)`,
    );
    lines.push('');

    if (review.errorHotspots.length > 0) {
      lines.push(`【错误集中位置】(${review.errorHotspots.length}个)`);
      for (const h of review.errorHotspots) {
        lines.push(`- ${h.character}（${h.sectionName}）: 累计错误 ${h.errorCount} 次`);
      }
      lines.push('');
    }

    lines.push('【改进建议】');
    lines.push(review.improvementSuggestions);
    lines.push('');

    lines.push('【练习记录明细】');
    for (const r of selectedRecords) {
      const startStr = new Date(r.startTime).toLocaleString('zh-CN');
      lines.push(
        `- ${startStr} | ${r.sectionName} | 时长: ${formatDuration(r.actualDuration)} | 目标: ${r.targetBpm}BPM | 实际: ${r.actualBpm}BPM | 错误: ${r.errorCount} | 卡顿: ${r.stutterCount} | 自评: ${getRatingLabel(r.selfRating)}${r.note ? ` | 备注: ${r.note}` : ''}`,
      );
    }

    return lines.join('\n');
  }

  function downloadReviewReport(reviewId: string) {
    const content = exportReviewReport(reviewId);
    if (!content) return;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `古琴复盘报告_${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    reviewRecords,
    filteredReviewRecords,
    reviewFilter,
    addReviewRecord,
    updateReviewRecord,
    deleteReviewRecord,
    setReviewFilter,
    clearReviewFilter,
    computeErrorHotspots,
    exportReviewReport,
    downloadReviewReport,
  };
}
