<script setup lang="ts">
import { ref, computed } from 'vue';
import { useReviewStore } from '@/composables/useReviewStore';
import { usePracticeTracker } from '@/composables/usePracticeTracker';
import { useFingeringStore } from '@/composables/useFingeringStore';
import type { DateRange } from '@/types/fingering';
import {
  ClipboardList,
  Trash2,
  Download,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  AlertTriangle,
  FileText,
  CheckSquare,
  Square,
  Edit3,
} from 'lucide-vue-next';

const {
  filteredReviewRecords,
  reviewFilter,
  addReviewRecord,
  updateReviewRecord,
  deleteReviewRecord,
  setReviewFilter,
  clearReviewFilter,
  downloadReviewReport,
} = useReviewStore();

const { practiceRecords, filteredRecords, formatDuration, getRatingLabel } = usePracticeTracker();
const { practiceSections } = useFingeringStore();

const showGenerateForm = ref(false);
const selectedPracticeIds = ref<string[]>([]);
const customSuggestions = ref('');
const customSummary = ref('');
const editingReviewId = ref<string | null>(null);
const editSuggestions = ref('');
const editSummary = ref('');
const expandedSections = ref<string[]>(['list', 'filter']);

const filterStart = ref('');
const filterEnd = ref('');
const filterSectionId = ref<string | null>(null);

const availablePracticeRecords = computed(() => {
  return [...practiceRecords.value].sort((a, b) => b.startTime - a.startTime);
});

function togglePracticeSelection(id: string) {
  const idx = selectedPracticeIds.value.indexOf(id);
  if (idx > -1) {
    selectedPracticeIds.value.splice(idx, 1);
  } else {
    selectedPracticeIds.value.push(id);
  }
}

function selectAllVisible() {
  selectedPracticeIds.value = filteredRecords.value.map((r) => r.id);
}

function clearSelection() {
  selectedPracticeIds.value = [];
}

function handleGenerate() {
  if (selectedPracticeIds.value.length === 0) return;

  const result = addReviewRecord(
    selectedPracticeIds.value,
    customSuggestions.value.trim(),
    customSummary.value.trim(),
  );

  if (result.success) {
    selectedPracticeIds.value = [];
    customSuggestions.value = '';
    customSummary.value = '';
    showGenerateForm.value = false;
  }
}

function handleEditReview(id: string, suggestions: string, summary: string) {
  editingReviewId.value = id;
  editSuggestions.value = suggestions;
  editSummary.value = summary;
}

function handleSaveEdit(id: string) {
  updateReviewRecord(id, {
    improvementSuggestions: editSuggestions.value.trim(),
    summary: editSummary.value.trim(),
  });
  editingReviewId.value = null;
}

function handleDelete(id: string) {
  if (confirm('确定要删除这条复盘记录吗？')) {
    deleteReviewRecord(id);
  }
}

function applyFilter() {
  setReviewFilter({
    dateRange: {
      start: filterStart.value || null,
      end: filterEnd.value || null,
    },
    sectionId: filterSectionId.value,
  });
}

function clearFilter() {
  filterStart.value = '';
  filterEnd.value = '';
  filterSectionId.value = null;
  clearReviewFilter();
}

const filterIsActive = computed(() => {
  return filterStart.value !== '' || filterEnd.value !== '' || filterSectionId.value !== null;
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

const sectionFilterOptions = computed(() => {
  return [
    { id: null, name: '全部段落' },
    ...practiceSections.value.map((s) => ({ id: s.id, name: s.name })),
  ];
});
</script>

<template>
  <div class="review-panel space-y-4">
    <div class="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div class="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-stone-800 flex items-center gap-2">
          <span class="w-1 h-5 bg-purple-600 rounded-full"></span>
          练习复盘
        </h3>
        <button
          @click="showGenerateForm = !showGenerateForm"
          class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-1.5"
        >
          <Plus class="w-4 h-4" />
          生成复盘
        </button>
      </div>

      <div v-if="showGenerateForm" class="p-4 border-b border-stone-200 bg-purple-50 space-y-3">
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-medium text-stone-700">选择练习记录（至少一条）</label>
            <div class="flex gap-2">
              <button
                @click="selectAllVisible"
                class="text-xs text-purple-600 hover:text-purple-800"
              >
                全选可见
              </button>
              <button
                @click="clearSelection"
                class="text-xs text-stone-500 hover:text-stone-700"
              >
                清除选择
              </button>
            </div>
          </div>
          <div class="max-h-40 overflow-y-auto space-y-1 bg-white rounded-lg border border-stone-200 p-2">
            <div
              v-for="r in availablePracticeRecords"
              :key="r.id"
              class="flex items-center gap-2 p-1.5 rounded hover:bg-stone-50 cursor-pointer text-xs"
              :class="{ 'bg-purple-100': selectedPracticeIds.includes(r.id) }"
              @click="togglePracticeSelection(r.id)"
            >
              <CheckSquare v-if="selectedPracticeIds.includes(r.id)" class="w-3.5 h-3.5 text-purple-600" />
              <Square v-else class="w-3.5 h-3.5 text-stone-400" />
              <span class="text-stone-700">{{ formatDateTime(r.startTime) }}</span>
              <span class="text-stone-400">·</span>
              <span class="text-stone-600">{{ r.sectionName }}</span>
              <span class="text-stone-400">·</span>
              <span class="text-red-600">错误 {{ r.errorCount }}</span>
            </div>
          </div>
          <div v-if="availablePracticeRecords.length === 0" class="text-center py-4 text-stone-400 text-xs">
            暂无练习记录，请先记录练习
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1">
            改进建议
            <span class="text-stone-400 font-normal">（可选，留空自动生成）</span>
          </label>
          <textarea
            v-model="customSuggestions"
            rows="2"
            placeholder="输入改进建议..."
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 text-sm resize-none"
          ></textarea>
        </div>

        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1">
            复盘概要
            <span class="text-stone-400 font-normal">（可选，留空自动生成）</span>
          </label>
          <textarea
            v-model="customSummary"
            rows="2"
            placeholder="输入复盘概要..."
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 text-sm resize-none"
          ></textarea>
        </div>

        <div class="flex gap-2">
          <button
            @click="showGenerateForm = false"
            class="flex-1 px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors text-sm"
          >
            取消
          </button>
          <button
            @click="handleGenerate"
            :disabled="selectedPracticeIds.length === 0"
            class="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            生成复盘
          </button>
        </div>
      </div>

      <div
        class="p-4 border-b border-stone-200 cursor-pointer"
        @click="toggleSection('filter')"
      >
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold text-stone-800 flex items-center gap-2">
            <Filter class="w-4 h-4 text-purple-600" />
            筛选复盘
          </h4>
          <div class="flex items-center gap-2">
            <span v-if="filterIsActive" class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
              筛选中
            </span>
            <ChevronUp v-if="isSectionExpanded('filter')" class="w-4 h-4 text-stone-500" />
            <ChevronDown v-else class="w-4 h-4 text-stone-500" />
          </div>
        </div>
      </div>

      <div v-if="isSectionExpanded('filter')" class="p-4 border-b border-stone-200 bg-stone-50 space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">开始日期</label>
            <input
              v-model="filterStart"
              type="date"
              class="w-full px-2 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">结束日期</label>
            <input
              v-model="filterEnd"
              type="date"
              class="w-full px-2 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">练习段</label>
            <select
              v-model="filterSectionId"
              class="w-full px-2 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
            >
              <option v-for="s in sectionFilterOptions" :key="s.id ?? 'all'" :value="s.id">
                {{ s.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            @click="applyFilter"
            class="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
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
            <ClipboardList class="w-4 h-4 text-purple-600" />
            复盘记录（{{ filteredReviewRecords.length }}）
          </h4>
          <ChevronUp v-if="isSectionExpanded('list')" class="w-4 h-4 text-stone-500" />
          <ChevronDown v-else class="w-4 h-4 text-stone-500" />
        </div>
      </div>

      <div v-if="isSectionExpanded('list')" class="p-4">
        <div v-if="filteredReviewRecords.length === 0" class="text-center py-8 text-stone-400 text-sm">
          暂无复盘记录，点击"生成复盘"开始
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="review in filteredReviewRecords"
            :key="review.id"
            class="p-3 bg-gradient-to-r from-stone-50 to-purple-50 rounded-lg border border-stone-200 hover:border-purple-300 transition-all"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-medium text-stone-800">
                    复盘 · {{ formatDateTime(review.createdAt) }}
                  </span>
                  <span class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                    {{ review.practiceRecordIds.length }} 条练习
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1 ml-2">
                <button
                  @click="downloadReviewReport(review.id)"
                  class="p-1.5 rounded hover:bg-stone-200 text-stone-500 hover:text-stone-700 transition-colors"
                  title="导出报告"
                >
                  <Download class="w-3.5 h-3.5" />
                </button>
                <button
                  @click="handleEditReview(review.id, review.improvementSuggestions, review.summary)"
                  class="p-1.5 rounded hover:bg-stone-200 text-stone-500 hover:text-stone-700 transition-colors"
                  title="编辑"
                >
                  <Edit3 class="w-3.5 h-3.5" />
                </button>
                <button
                  @click="handleDelete(review.id)"
                  class="p-1.5 rounded hover:bg-red-100 text-stone-500 hover:text-red-600 transition-colors"
                  title="删除"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div class="text-sm text-stone-700 bg-white rounded px-2 py-1.5 border border-stone-200 mb-2">
              {{ review.summary }}
            </div>

            <div v-if="review.errorHotspots.length > 0" class="mb-2">
              <div class="flex items-center gap-1 mb-1">
                <AlertTriangle class="w-3.5 h-3.5 text-red-500" />
                <span class="text-xs font-medium text-red-700">错误集中位置</span>
              </div>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="h in review.errorHotspots.slice(0, 5)"
                  :key="h.fingeringId"
                  class="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full border border-red-200"
                >
                  {{ h.character }} ({{ h.errorCount }}次)
                </span>
              </div>
            </div>

            <div class="text-xs text-stone-600 bg-stone-50 rounded px-2 py-1.5 border border-stone-200 whitespace-pre-line">
              {{ review.improvementSuggestions }}
            </div>

            <div v-if="editingReviewId === review.id" class="mt-3 space-y-2">
              <div>
                <label class="block text-xs font-medium text-stone-700 mb-1">改进建议</label>
                <textarea
                  v-model="editSuggestions"
                  rows="2"
                  class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 text-sm resize-none"
                ></textarea>
              </div>
              <div>
                <label class="block text-xs font-medium text-stone-700 mb-1">复盘概要</label>
                <textarea
                  v-model="editSummary"
                  rows="2"
                  class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 text-sm resize-none"
                ></textarea>
              </div>
              <div class="flex gap-2">
                <button
                  @click="editingReviewId = null"
                  class="px-3 py-1 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors text-xs"
                >
                  取消
                </button>
                <button
                  @click="handleSaveEdit(review.id)"
                  class="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
