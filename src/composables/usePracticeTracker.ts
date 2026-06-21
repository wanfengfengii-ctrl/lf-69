import { ref, computed, watch } from 'vue';
import type {
  PracticeRecord,
  DailyStats,
  SectionStats,
  DateRange,
  SelfRating,
  PracticeSection,
} from '@/types/fingering';
import { SELF_RATINGS } from '@/types/fingering';
import { generateId } from '@/utils/validation';

const STORAGE_KEY = 'guqin-practice-records';

const practiceRecords = ref<PracticeRecord[]>([]);
const dateRange = ref<DateRange>({ start: null, end: null });

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      practiceRecords.value = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load practice records:', e);
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(practiceRecords.value));
  } catch (e) {
    console.error('Failed to save practice records:', e);
  }
}

loadFromStorage();

watch(practiceRecords, saveToStorage, { deep: true });

const LONG_UNPRACTICED_DAYS = 7;
const HIGH_ERROR_RATE_THRESHOLD = 3;

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ratingToNumber(rating: SelfRating): number {
  const map: Record<SelfRating, number> = {
    poor: 1,
    fair: 2,
    good: 3,
    excellent: 4,
  };
  return map[rating] || 0;
}

function numberToRating(n: number): SelfRating {
  if (n <= 1) return 'poor';
  if (n <= 2) return 'fair';
  if (n <= 3) return 'good';
  return 'excellent';
}

export function usePracticeTracker() {
  const filteredRecords = computed(() => {
    let result = [...practiceRecords.value];

    if (dateRange.value.start) {
      const startTs = new Date(dateRange.value.start + 'T00:00:00').getTime();
      result = result.filter((r) => r.startTime >= startTs);
    }

    if (dateRange.value.end) {
      const endTs = new Date(dateRange.value.end + 'T23:59:59').getTime();
      result = result.filter((r) => r.startTime <= endTs);
    }

    return result.sort((a, b) => b.startTime - a.startTime);
  });

  const recentRecords = computed(() => {
    return [...practiceRecords.value]
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 10);
  });

  const dailyStats = computed<DailyStats[]>(() => {
    const byDate: Record<string, PracticeRecord[]> = {};

    for (const r of filteredRecords.value) {
      const date = formatDate(r.startTime);
      if (!byDate[date]) {
        byDate[date] = [];
      }
      byDate[date].push(r);
    }

    const stats: DailyStats[] = Object.entries(byDate).map(([date, records]) => {
      const totalDuration = records.reduce((sum, r) => sum + r.actualDuration, 0);
      const avgRating =
        records.reduce((sum, r) => sum + ratingToNumber(r.selfRating), 0) / records.length;

      return {
        date,
        totalDuration,
        recordCount: records.length,
        avgRating,
      };
    });

    return stats.sort((a, b) => (a.date < b.date ? 1 : -1));
  });

  const sectionStats = computed<SectionStats[]>(() => {
    const bySection: Record<string, PracticeRecord[]> = {};
    const sectionNames: Record<string, string> = {};

    for (const r of practiceRecords.value) {
      const key = r.sectionId || '__no_section__';
      if (!bySection[key]) {
        bySection[key] = [];
      }
      bySection[key].push(r);
      sectionNames[key] = r.sectionName;
    }

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    return Object.entries(bySection).map(([key, records]) => {
      const totalDuration = records.reduce((sum, r) => sum + r.actualDuration, 0);
      const avgErrorCount =
        records.reduce((sum, r) => sum + r.errorCount, 0) / records.length;
      const avgStutterCount =
        records.reduce((sum, r) => sum + r.stutterCount, 0) / records.length;
      const avgRating =
        records.reduce((sum, r) => sum + ratingToNumber(r.selfRating), 0) / records.length;

      const lastPracticeTime = records.reduce(
        (max, r) => (r.endTime > max ? r.endTime : max),
        0,
      );
      const daysSinceLastPractice =
        lastPracticeTime > 0 ? Math.floor((now - lastPracticeTime) / DAY_MS) : 999;

      const isHighErrorRate = avgErrorCount >= HIGH_ERROR_RATE_THRESHOLD;
      const isLongUnpracticed = daysSinceLastPractice >= LONG_UNPRACTICED_DAYS;

      return {
        sectionId: key === '__no_section__' ? null : key,
        sectionName: sectionNames[key] || '自由练习',
        totalDuration,
        practiceCount: records.length,
        avgErrorCount,
        avgStutterCount,
        avgRating,
        lastPracticeTime: lastPracticeTime > 0 ? lastPracticeTime : null,
        daysSinceLastPractice,
        isHighErrorRate,
        isLongUnpracticed,
      };
    });
  });

  const totalStats = computed(() => {
    const records = filteredRecords.value;
    const totalDuration = records.reduce((sum, r) => sum + r.actualDuration, 0);
    const totalErrors = records.reduce((sum, r) => sum + r.errorCount, 0);
    const totalStutters = records.reduce((sum, r) => sum + r.stutterCount, 0);
    const avgRating =
      records.length > 0
        ? records.reduce((sum, r) => sum + ratingToNumber(r.selfRating), 0) / records.length
        : 0;

    return {
      totalDuration,
      totalRecords: records.length,
      totalErrors,
      totalStutters,
      avgRating,
    };
  });

  function validatePracticeRecord(
    data: Omit<PracticeRecord, 'id' | 'createdAt'>,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.startTime || !data.endTime) {
      errors.push('开始时间和结束时间不能为空');
    }
    if (data.endTime < data.startTime) {
      errors.push('结束时间不能早于开始时间');
    }
    if (data.actualDuration <= 0) {
      errors.push('练习时长必须大于 0');
    }
    if (data.targetBpm <= 0) {
      errors.push('目标速度必须大于 0');
    }
    if (data.actualBpm <= 0) {
      errors.push('实际速度必须大于 0');
    }
    if (data.errorCount < 0) {
      errors.push('错误次数不能为负数');
    }
    if (data.stutterCount < 0) {
      errors.push('卡顿次数不能为负数');
    }
    if (!data.selfRating) {
      errors.push('请选择自评等级');
    }

    return { valid: errors.length === 0, errors };
  }

  function addPracticeRecord(
    data: Omit<PracticeRecord, 'id' | 'createdAt'>,
  ): { success: boolean; errors?: string[]; record?: PracticeRecord } {
    const validation = validatePracticeRecord(data);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const record: PracticeRecord = {
      ...data,
      id: generateId(),
      createdAt: Date.now(),
    };

    practiceRecords.value.push(record);
    return { success: true, record };
  }

  function updatePracticeRecord(
    id: string,
    updates: Partial<PracticeRecord>,
  ): { success: boolean; errors?: string[] } {
    const index = practiceRecords.value.findIndex((r) => r.id === id);
    if (index === -1) {
      return { success: false, errors: ['练习记录不存在'] };
    }

    const updated = { ...practiceRecords.value[index], ...updates };
    const validation = validatePracticeRecord({
      startTime: updated.startTime,
      endTime: updated.endTime,
      actualDuration: updated.actualDuration,
      sectionId: updated.sectionId,
      sectionName: updated.sectionName,
      targetBpm: updated.targetBpm,
      actualBpm: updated.actualBpm,
      errorCount: updated.errorCount,
      stutterCount: updated.stutterCount,
      selfRating: updated.selfRating,
      note: updated.note,
    });

    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    practiceRecords.value[index] = updated;
    return { success: true };
  }

  function deletePracticeRecord(id: string) {
    const index = practiceRecords.value.findIndex((r) => r.id === id);
    if (index > -1) {
      practiceRecords.value.splice(index, 1);
    }
  }

  function setDateRange(range: DateRange) {
    dateRange.value = range;
  }

  function clearDateRange() {
    dateRange.value = { start: null, end: null };
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(0)} 秒`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins < 60) return `${mins} 分 ${secs} 秒`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours} 小时 ${remainMins} 分 ${secs} 秒`;
  }

  function getRatingLabel(rating: SelfRating): string {
    return SELF_RATINGS.find((r) => r.value === rating)?.label || rating;
  }

  function getRatingColor(rating: SelfRating): string {
    const color = SELF_RATINGS.find((r) => r.value === rating)?.color;
    switch (color) {
      case 'red':
        return 'bg-red-100 text-red-700';
      case 'orange':
        return 'bg-orange-100 text-orange-700';
      case 'amber':
        return 'bg-amber-100 text-amber-700';
      case 'emerald':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-stone-100 text-stone-700';
    }
  }

  function getRatingDotColor(rating: number): string {
    if (rating <= 1) return 'bg-red-500';
    if (rating <= 2) return 'bg-orange-500';
    if (rating <= 3) return 'bg-amber-500';
    return 'bg-emerald-500';
  }

  function exportReport(): string {
    const records = filteredRecords.value;
    const lines: string[] = [];

    lines.push('古琴练习报告');
    lines.push('='.repeat(50));
    lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);

    if (dateRange.value.start || dateRange.value.end) {
      lines.push(
        `时间范围: ${dateRange.value.start || '不限'} ~ ${dateRange.value.end || '不限'}`,
      );
    }
    lines.push('');

    const stats = totalStats.value;
    lines.push('【总体统计】');
    lines.push(`练习次数: ${stats.totalRecords} 次`);
    lines.push(`总练习时长: ${formatDuration(stats.totalDuration)}`);
    lines.push(`总错误次数: ${stats.totalErrors} 次`);
    lines.push(`总卡顿次数: ${stats.totalStutters} 次`);
    lines.push(`平均自评: ${stats.avgRating > 0 ? numberToRating(stats.avgRating) : '暂无'}`);
    lines.push('');

    lines.push('【按日统计】');
    for (const d of dailyStats.value) {
      lines.push(
        `${d.date}: 练习 ${d.recordCount} 次, 时长 ${formatDuration(d.totalDuration)}, 平均自评 ${
          d.avgRating > 0 ? numberToRating(d.avgRating) : '暂无'
        }`,
      );
    }
    lines.push('');

    lines.push('【按段落统计】');
    for (const s of sectionStats.value) {
      const warnings: string[] = [];
      if (s.isHighErrorRate) warnings.push('高错误率');
      if (s.isLongUnpracticed) warnings.push(`长期未练习(${s.daysSinceLastPractice}天)`);
      const warnStr = warnings.length > 0 ? ` [${warnings.join(', ')}]` : '';
      lines.push(
        `${s.sectionName}: 练习 ${s.practiceCount} 次, 时长 ${formatDuration(
          s.totalDuration,
        )}, 平均错误 ${s.avgErrorCount.toFixed(1)}, 平均卡顿 ${s.avgStutterCount.toFixed(1)}${warnStr}`,
      );
    }
    lines.push('');

    lines.push('【练习记录明细】');
    for (const r of records) {
      const startStr = new Date(r.startTime).toLocaleString('zh-CN');
      lines.push(
        `- ${startStr} | ${r.sectionName} | 时长: ${formatDuration(
          r.actualDuration,
        )} | 目标: ${r.targetBpm}BPM | 实际: ${r.actualBpm}BPM | 错误: ${r.errorCount} | 卡顿: ${
          r.stutterCount
        } | 自评: ${getRatingLabel(r.selfRating)}${r.note ? ` | 备注: ${r.note}` : ''}`,
      );
    }

    return lines.join('\n');
  }

  function downloadReport() {
    const content = exportReport();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `古琴练习报告_${formatDate(Date.now())}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    practiceRecords,
    filteredRecords,
    recentRecords,
    dailyStats,
    sectionStats,
    totalStats,
    dateRange,
    setDateRange,
    clearDateRange,
    addPracticeRecord,
    updatePracticeRecord,
    deletePracticeRecord,
    formatDuration,
    getRatingLabel,
    getRatingColor,
    getRatingDotColor,
    exportReport,
    downloadReport,
    validatePracticeRecord,
    ratingToNumber,
    numberToRating,
    formatDate,
  };
}
