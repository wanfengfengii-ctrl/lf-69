<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAnnotationStore } from '@/composables/useAnnotationStore';
import { useFingeringStore } from '@/composables/useFingeringStore';
import type { AnnotationTargetType, AnnotationType, DateRange } from '@/types/fingering';
import { ANNOTATION_TYPES, ANNOTATION_TARGET_TYPES } from '@/types/fingering';
import {
  MessageSquarePlus,
  Trash2,
  Edit3,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Download,
  BarChart3,
} from 'lucide-vue-next';

const {
  filteredAnnotations,
  annotationFilter,
  annotationStats,
  addAnnotation,
  updateAnnotation,
  deleteAnnotation,
  getAnnotationTypeColor,
  getAnnotationTypeLabel,
  setAnnotationFilter,
  clearAnnotationFilter,
  downloadAnnotationsReport,
} = useAnnotationStore();

const { sortedFingerings, practiceSections } = useFingeringStore();

const showAddForm = ref(false);
const editingId = ref<string | null>(null);
const editContent = ref('');
const expandedSections = ref<string[]>(['list', 'filter']);

const newTargetType = ref<AnnotationTargetType>('fingering');
const newTargetId = ref('');
const newContent = ref('');
const newAuthor = ref('');
const newAnnotationType = ref<AnnotationType>('general');

const filterType = ref<AnnotationType | null>(null);
const filterStart = ref('');
const filterEnd = ref('');
const filterSectionId = ref<string | null>(null);

const targetOptions = computed(() => {
  switch (newTargetType.value) {
    case 'fingering':
      return sortedFingerings.value.map((f) => ({ id: f.id, label: f.character }));
    case 'section':
      return practiceSections.value.map((s) => ({ id: s.id, label: s.name }));
    case 'score':
      return [{ id: '__whole_score__', label: '整段谱' }];
    default:
      return [];
  }
});

function handleTargetTypeChange() {
  newTargetId.value = '';
}

function handleAdd() {
  if (!newContent.value.trim()) return;
  if (!newAuthor.value.trim()) return;

  const targetId = newTargetType.value === 'score' ? '__whole_score__' : newTargetId.value;
  if (!targetId) return;

  const result = addAnnotation({
    targetType: newTargetType.value,
    targetId,
    content: newContent.value.trim(),
    author: newAuthor.value.trim(),
    annotationType: newAnnotationType.value,
  });

  if (result.success) {
    newContent.value = '';
    newAuthor.value = '';
    showAddForm.value = false;
  }
}

function handleEdit(id: string, content: string) {
  editingId.value = id;
  editContent.value = content;
}

function handleSaveEdit(id: string) {
  if (!editContent.value.trim()) return;
  updateAnnotation(id, { content: editContent.value.trim() });
  editingId.value = null;
  editContent.value = '';
}

function handleDelete(id: string) {
  if (confirm('确定要删除这条批注吗？')) {
    deleteAnnotation(id);
  }
}

function applyFilter() {
  let sectionFingeringIds: string[] = [];
  if (filterSectionId.value) {
    const section = practiceSections.value.find((s) => s.id === filterSectionId.value);
    if (section) {
      sectionFingeringIds = section.fingeringIds;
    }
  }

  setAnnotationFilter({
    type: filterType.value,
    dateRange: {
      start: filterStart.value || null,
      end: filterEnd.value || null,
    },
    targetId: null,
    sectionId: filterSectionId.value,
    sectionFingeringIds,
  });
}

function clearFilter() {
  filterType.value = null;
  filterStart.value = '';
  filterEnd.value = '';
  filterSectionId.value = null;
  clearAnnotationFilter();
}

const filterIsActive = computed(() => {
  return (
    filterType.value !== null ||
    filterStart.value !== '' ||
    filterEnd.value !== '' ||
    filterSectionId.value !== null
  );
});

function toggleSection(key: string) {
  const idx = expandedSections.value.indexOf(key);
  if (idx > -1) {
    expandedSections.value.splice(idx, 1);
  } else {
    expandedSections.value.push(key);
  }
}

function isSectionExpanded(key: string) {
  return expandedSections.value.includes(key);
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTargetLabel(annotation: { targetType: AnnotationTargetType; targetId: string }): string {
  if (annotation.targetType === 'score') return '整段谱';
  if (annotation.targetType === 'section') {
    const section = practiceSections.value.find((s) => s.id === annotation.targetId);
    return section?.name || '已删除段落';
  }
  const fingering = sortedFingerings.value.find((f) => f.id === annotation.targetId);
  return fingering?.character || '已删除指法';
}

function getTargetLabelForExport(targetType: AnnotationTargetType, targetId: string): string {
  return getTargetLabel({ targetType, targetId });
}

function handleExport() {
  downloadAnnotationsReport(undefined, getTargetLabelForExport);
}
</script>

<template>
  <div class="annotation-panel space-y-4">
    <div class="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div class="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-stone-800 flex items-center gap-2">
          <span class="w-1 h-5 bg-blue-600 rounded-full"></span>
          协作批注
        </h3>
        <button
          @click="showAddForm = !showAddForm"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1.5"
        >
          <MessageSquarePlus class="w-4 h-4" />
          添加批注
        </button>
      </div>

      <div v-if="showAddForm" class="p-4 border-b border-stone-200 bg-blue-50 space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">批注对象</label>
            <select
              v-model="newTargetType"
              class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-stone-800 bg-white text-sm"
              @change="handleTargetTypeChange"
            >
              <option v-for="t in ANNOTATION_TARGET_TYPES" :key="t.value" :value="t.value">
                {{ t.label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">批注类型</label>
            <select
              v-model="newAnnotationType"
              class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-stone-800 bg-white text-sm"
            >
              <option v-for="t in ANNOTATION_TYPES" :key="t.value" :value="t.value">
                {{ t.label }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="newTargetType !== 'score'">
          <label class="block text-xs font-medium text-stone-700 mb-1">
            选择{{ newTargetType === 'fingering' ? '指法' : '练习段' }}
          </label>
          <select
            v-model="newTargetId"
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-stone-800 bg-white text-sm"
          >
            <option value="" disabled>请选择</option>
            <option v-for="opt in targetOptions" :key="opt.id" :value="opt.id">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1">批注人</label>
          <input
            v-model="newAuthor"
            type="text"
            placeholder="输入姓名"
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-stone-800 text-sm"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1">批注内容</label>
          <textarea
            v-model="newContent"
            rows="3"
            placeholder="输入批注内容（不能为空）..."
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-stone-800 text-sm resize-none"
          ></textarea>
        </div>

        <div class="flex gap-2">
          <button
            @click="showAddForm = false"
            class="flex-1 px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors text-sm"
          >
            取消
          </button>
          <button
            @click="handleAdd"
            :disabled="!newContent.trim() || !newAuthor.trim() || (newTargetType !== 'score' && !newTargetId)"
            class="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            添加
          </button>
        </div>
      </div>

      <div
        class="p-4 border-b border-stone-200 cursor-pointer"
        @click="toggleSection('filter')"
      >
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold text-stone-800 flex items-center gap-2">
            <Filter class="w-4 h-4 text-blue-600" />
            筛选批注
          </h4>
          <div class="flex items-center gap-2">
            <span v-if="filterIsActive" class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              筛选中
            </span>
            <ChevronUp v-if="isSectionExpanded('filter')" class="w-4 h-4 text-stone-500" />
            <ChevronDown v-else class="w-4 h-4 text-stone-500" />
          </div>
        </div>
      </div>

      <div v-if="isSectionExpanded('filter')" class="p-4 border-b border-stone-200 bg-stone-50 space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">批注类型</label>
            <select
              v-model="filterType"
              class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-stone-800 bg-white text-sm"
            >
              <option :value="null">全部类型</option>
              <option v-for="t in ANNOTATION_TYPES" :key="t.value" :value="t.value">
                {{ t.label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">练习段</label>
            <select
              v-model="filterSectionId"
              class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-stone-800 bg-white text-sm"
            >
              <option :value="null">全部练习段</option>
              <option v-for="s in practiceSections" :key="s.id" :value="s.id">
                {{ s.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="flex items-end gap-1">
          <div class="flex-1">
            <label class="block text-xs font-medium text-stone-700 mb-1">开始日期</label>
            <input
              v-model="filterStart"
              type="date"
              class="w-full px-2 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <span class="text-stone-400 mb-2">~</span>
          <div class="flex-1">
            <label class="block text-xs font-medium text-stone-700 mb-1">结束日期</label>
            <input
              v-model="filterEnd"
              type="date"
              class="w-full px-2 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
        <div class="flex gap-2">
          <button
            @click="applyFilter"
            class="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            应用筛选
          </button>
          <button
            v-if="filterIsActive"
            @click="clearFilter"
            class="px-3 py-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors text-sm flex items-center gap-1"
          >
            <X class="w-3 h-3" />
            清除
          </button>
        </div>
      </div>

      <div
        class="p-4 border-b border-stone-200 bg-stone-50 cursor-pointer"
        @click="toggleSection('list')"
      >
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold text-stone-800 flex items-center gap-2">
            <MessageCircle class="w-4 h-4 text-blue-600" />
            批注列表（{{ filteredAnnotations.length }}）
          </h4>
          <ChevronUp v-if="isSectionExpanded('list')" class="w-4 h-4 text-stone-500" />
          <ChevronDown v-else class="w-4 h-4 text-stone-500" />
        </div>
      </div>

      <div v-if="isSectionExpanded('list')" class="p-4">
        <div class="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <BarChart3 class="w-4 h-4 text-blue-600" />
              <span class="text-sm font-semibold text-blue-800">批注统计</span>
            </div>
            <button
              @click="handleExport"
              class="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <Download class="w-3 h-3" />
              导出报告
            </button>
          </div>
          <div class="grid grid-cols-3 gap-2 text-xs">
            <div class="text-center">
              <div class="text-lg font-bold text-blue-700">{{ annotationStats.total }}</div>
              <div class="text-blue-600">总批注数</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold text-blue-700">{{ annotationStats.uniqueAuthors }}</div>
              <div class="text-blue-600">批注人数</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold text-blue-700">{{ Object.keys(annotationStats.byType).length }}</div>
              <div class="text-blue-600">批注类型</div>
            </div>
          </div>
        </div>

        <div v-if="filteredAnnotations.length === 0" class="text-center py-8 text-stone-400 text-sm">
          暂无批注，点击"添加批注"开始协作
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="a in filteredAnnotations"
            :key="a.id"
            class="p-3 bg-gradient-to-r from-stone-50 to-blue-50 rounded-lg border border-stone-200 hover:border-blue-300 transition-all"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span class="text-sm font-medium text-stone-800">{{ getTargetLabel(a) }}</span>
                  <span
                    class="px-2 py-0.5 text-xs rounded-full font-medium"
                    :class="getAnnotationTypeColor(a.annotationType)"
                  >
                    {{ getAnnotationTypeLabel(a.annotationType) }}
                  </span>
                </div>
                <div class="text-xs text-stone-500">
                  {{ a.author }} · {{ formatDateTime(a.createdAt) }}
                </div>
              </div>
              <div class="flex items-center gap-1 ml-2">
                <button
                  @click="handleEdit(a.id, a.content)"
                  class="p-1.5 rounded hover:bg-stone-200 text-stone-500 hover:text-stone-700 transition-colors"
                  title="编辑"
                >
                  <Edit3 class="w-3.5 h-3.5" />
                </button>
                <button
                  @click="handleDelete(a.id)"
                  class="p-1.5 rounded hover:bg-red-100 text-stone-500 hover:text-red-600 transition-colors"
                  title="删除"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div v-if="editingId === a.id" class="space-y-2">
              <textarea
                v-model="editContent"
                rows="2"
                class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-stone-800 text-sm resize-none"
              ></textarea>
              <div class="flex gap-2">
                <button
                  @click="editingId = null"
                  class="px-3 py-1 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors text-xs"
                >
                  取消
                </button>
                <button
                  @click="handleSaveEdit(a.id)"
                  class="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                >
                  保存
                </button>
              </div>
            </div>
            <div v-else class="text-sm text-stone-700 bg-white rounded px-2 py-1.5 border border-stone-200">
              {{ a.content }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
