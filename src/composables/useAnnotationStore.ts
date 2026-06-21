import { ref, computed, watch } from 'vue';
import type { Annotation, AnnotationType, AnnotationTargetType, DateRange } from '@/types/fingering';
import { ANNOTATION_TYPES } from '@/types/fingering';
import { generateId } from '@/utils/validation';

const STORAGE_KEY = 'guqin-annotations';

const annotations = ref<Annotation[]>([]);
const annotationFilter = ref<{
  type: AnnotationType | null;
  dateRange: DateRange;
  targetId: string | null;
  sectionId: string | null;
}>({
  type: null,
  dateRange: { start: null, end: null },
  targetId: null,
  sectionId: null,
});

const filterSectionFingeringIds = ref<string[]>([]);

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      annotations.value = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load annotations:', e);
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations.value));
  } catch (e) {
    console.error('Failed to save annotations:', e);
  }
}

loadFromStorage();

watch(annotations, saveToStorage, { deep: true });

export function useAnnotationStore() {
  const filteredAnnotations = computed(() => {
    let result = [...annotations.value];

    if (annotationFilter.value.type) {
      result = result.filter((a) => a.annotationType === annotationFilter.value.type);
    }

    if (annotationFilter.value.dateRange.start) {
      const startTs = new Date(annotationFilter.value.dateRange.start + 'T00:00:00').getTime();
      result = result.filter((a) => a.createdAt >= startTs);
    }

    if (annotationFilter.value.dateRange.end) {
      const endTs = new Date(annotationFilter.value.dateRange.end + 'T23:59:59').getTime();
      result = result.filter((a) => a.createdAt <= endTs);
    }

    if (annotationFilter.value.targetId) {
      result = result.filter(
        (a) =>
          a.targetId === annotationFilter.value.targetId ||
          a.targetType === 'score',
      );
    }

    if (annotationFilter.value.sectionId && filterSectionFingeringIds.value.length > 0) {
      result = result.filter((a) => {
        if (a.targetType === 'section' && a.targetId === annotationFilter.value.sectionId) {
          return true;
        }
        if (a.targetType === 'fingering' && filterSectionFingeringIds.value.includes(a.targetId)) {
          return true;
        }
        if (a.targetType === 'score') {
          return true;
        }
        return false;
      });
    }

    return result.sort((a, b) => b.createdAt - a.createdAt);
  });

  const annotatedFingeringIds = computed(() => {
    const ids = new Set<string>();
    for (const a of annotations.value) {
      if (a.targetType === 'fingering') {
        ids.add(a.targetId);
      }
    }
    return ids;
  });

  const annotatedSectionIds = computed(() => {
    const ids = new Set<string>();
    for (const a of annotations.value) {
      if (a.targetType === 'section') {
        ids.add(a.targetId);
      }
    }
    return ids;
  });

  function getAnnotationsForTarget(targetType: AnnotationTargetType, targetId: string): Annotation[] {
    return annotations.value.filter(
      (a) => a.targetType === targetType && a.targetId === targetId,
    );
  }

  function isFingeringAnnotated(fingeringId: string): boolean {
    return annotatedFingeringIds.value.has(fingeringId);
  }

  function isSectionAnnotated(sectionId: string): boolean {
    return annotatedSectionIds.value.has(sectionId);
  }

  function getAnnotationTypeColor(type: AnnotationType): string {
    const found = ANNOTATION_TYPES.find((t) => t.value === type);
    switch (found?.color) {
      case 'blue':
        return 'bg-blue-100 text-blue-700';
      case 'amber':
        return 'bg-amber-100 text-amber-700';
      case 'red':
        return 'bg-red-100 text-red-700';
      case 'emerald':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-stone-100 text-stone-700';
    }
  }

  function getAnnotationTypeDotColor(type: AnnotationType): string {
    const found = ANNOTATION_TYPES.find((t) => t.value === type);
    switch (found?.color) {
      case 'blue':
        return 'bg-blue-500';
      case 'amber':
        return 'bg-amber-500';
      case 'red':
        return 'bg-red-500';
      case 'emerald':
        return 'bg-emerald-500';
      default:
        return 'bg-stone-500';
    }
  }

  function getAnnotationTypeLabel(type: AnnotationType): string {
    return ANNOTATION_TYPES.find((t) => t.value === type)?.label || type;
  }

  function addAnnotation(
    data: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>,
  ): { success: boolean; errors?: string[]; annotation?: Annotation } {
    const errors: string[] = [];

    if (!data.content || data.content.trim() === '') {
      errors.push('批注内容不能为空');
    }

    if (!data.targetId || data.targetId.trim() === '') {
      errors.push('批注目标不能为空');
    }

    if (!data.author || data.author.trim() === '') {
      errors.push('批注人不能为空');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const annotation: Annotation = {
      ...data,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    annotations.value.push(annotation);
    return { success: true, annotation };
  }

  function updateAnnotation(
    id: string,
    updates: Partial<Pick<Annotation, 'content' | 'annotationType' | 'author'>>,
  ): { success: boolean; errors?: string[] } {
    const index = annotations.value.findIndex((a) => a.id === id);
    if (index === -1) {
      return { success: false, errors: ['批注不存在'] };
    }

    if (updates.content !== undefined && updates.content.trim() === '') {
      return { success: false, errors: ['批注内容不能为空'] };
    }

    annotations.value[index] = {
      ...annotations.value[index],
      ...updates,
      updatedAt: Date.now(),
    };

    return { success: true };
  }

  function deleteAnnotation(id: string) {
    const index = annotations.value.findIndex((a) => a.id === id);
    if (index > -1) {
      annotations.value.splice(index, 1);
    }
  }

  function removeAnnotationsByTarget(targetType: AnnotationTargetType, targetId: string) {
    annotations.value = annotations.value.filter(
      (a) => !(a.targetType === targetType && a.targetId === targetId),
    );
  }

  function setAnnotationFilter(filter: {
    type: AnnotationType | null;
    dateRange: DateRange;
    targetId: string | null;
    sectionId?: string | null;
    sectionFingeringIds?: string[];
  }) {
    annotationFilter.value = {
      type: filter.type,
      dateRange: filter.dateRange,
      targetId: filter.targetId,
      sectionId: filter.sectionId ?? null,
    };
    if (filter.sectionFingeringIds) {
      filterSectionFingeringIds.value = [...filter.sectionFingeringIds];
    }
  }

  function clearAnnotationFilter() {
    annotationFilter.value = {
      type: null,
      dateRange: { start: null, end: null },
      targetId: null,
      sectionId: null,
    };
    filterSectionFingeringIds.value = [];
  }

  function setSectionFilter(sectionId: string | null, fingeringIds: string[] = []) {
    annotationFilter.value.sectionId = sectionId;
    filterSectionFingeringIds.value = sectionId ? [...fingeringIds] : [];
  }

  function getAnnotationCountForTarget(targetType: AnnotationTargetType, targetId: string): number {
    return annotations.value.filter(
      (a) => a.targetType === targetType && a.targetId === targetId,
    ).length;
  }

  function getAnnotationsForSection(sectionId: string, fingeringIds: string[]): Annotation[] {
    return annotations.value.filter((a) => {
      if (a.targetType === 'section' && a.targetId === sectionId) return true;
      if (a.targetType === 'fingering' && fingeringIds.includes(a.targetId)) return true;
      return false;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }

  const annotationStats = computed(() => {
    const list = filteredAnnotations.value;
    const typeCounts: Record<string, number> = {};
    const targetTypeCounts: Record<string, number> = { fingering: 0, section: 0, score: 0 };
    const authorSet = new Set<string>();

    for (const a of list) {
      typeCounts[a.annotationType] = (typeCounts[a.annotationType] || 0) + 1;
      targetTypeCounts[a.targetType] = (targetTypeCounts[a.targetType] || 0) + 1;
      authorSet.add(a.author);
    }

    return {
      total: list.length,
      byType: typeCounts,
      byTargetType: targetTypeCounts,
      uniqueAuthors: authorSet.size,
    };
  });

  function exportAnnotationsReport(
    annotationsList?: Annotation[],
    getTargetLabel?: (targetType: AnnotationTargetType, targetId: string) => string,
  ): string {
    const list = annotationsList || filteredAnnotations.value;
    const lines: string[] = [];

    lines.push('古琴谱批注报告');
    lines.push('='.repeat(50));
    lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
    lines.push(`批注总数: ${list.length}`);
    lines.push('');

    const typeStats: Record<string, number> = {};
    for (const a of list) {
      typeStats[a.annotationType] = (typeStats[a.annotationType] || 0) + 1;
    }
    lines.push('【按类型统计】');
    for (const [type, count] of Object.entries(typeStats)) {
      lines.push(`- ${getAnnotationTypeLabel(type as AnnotationType)}: ${count} 条`);
    }
    lines.push('');

    if (annotationFilter.value.type || annotationFilter.value.dateRange.start || annotationFilter.value.dateRange.end || annotationFilter.value.sectionId) {
      lines.push('【筛选条件】');
      if (annotationFilter.value.type) {
        lines.push(`- 批注类型: ${getAnnotationTypeLabel(annotationFilter.value.type)}`);
      }
      if (annotationFilter.value.dateRange.start || annotationFilter.value.dateRange.end) {
        lines.push(`- 时间范围: ${annotationFilter.value.dateRange.start || '不限'} ~ ${annotationFilter.value.dateRange.end || '不限'}`);
      }
      if (annotationFilter.value.sectionId) {
        lines.push(`- 练习段筛选: 已启用`);
      }
      lines.push('');
    }

    lines.push('【批注列表】');
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      let targetLabel = '';
      if (getTargetLabel) {
        targetLabel = getTargetLabel(a.targetType, a.targetId);
      } else {
        targetLabel = a.targetType === 'score' ? '整段谱' : a.targetId;
      }
      lines.push(`${i + 1}. [${getAnnotationTypeLabel(a.annotationType)}] ${targetLabel}`);
      lines.push(`   批注人: ${a.author}`);
      lines.push(`   时间: ${new Date(a.createdAt).toLocaleString('zh-CN')}`);
      lines.push(`   内容: ${a.content}`);
      if (a.updatedAt !== a.createdAt) {
        lines.push(`   更新时间: ${new Date(a.updatedAt).toLocaleString('zh-CN')}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  function downloadAnnotationsReport(
    annotationsList?: Annotation[],
    getTargetLabel?: (targetType: AnnotationTargetType, targetId: string) => string,
  ) {
    const content = exportAnnotationsReport(annotationsList, getTargetLabel);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `古琴批注报告_${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    annotations,
    filteredAnnotations,
    annotatedFingeringIds,
    annotatedSectionIds,
    annotationFilter,
    annotationStats,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    removeAnnotationsByTarget,
    getAnnotationsForTarget,
    isFingeringAnnotated,
    isSectionAnnotated,
    getAnnotationTypeColor,
    getAnnotationTypeDotColor,
    getAnnotationTypeLabel,
    setAnnotationFilter,
    clearAnnotationFilter,
    setSectionFilter,
    getAnnotationCountForTarget,
    getAnnotationsForSection,
    exportAnnotationsReport,
    downloadAnnotationsReport,
  };
}
