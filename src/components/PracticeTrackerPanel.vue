<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { usePracticeTracker } from '@/composables/usePracticeTracker';
import type { PracticeRecord } from '@/types/fingering';
import {
  Trash2,
  Edit3,
  Download,
  Calendar,
  BarChart3,
  Clock,
  AlertTriangle,
  CalendarRange,
  X,
  History,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
  Star,
} from 'lucide-vue-next';
import PracticeRecordForm from './PracticeRecordForm.vue';

const {
  filteredRecords,
  dailyStats,
  sectionStats,
  totalStats,
  dateRange,
  setDateRange,
  clearDateRange,
  deletePracticeRecord,
  formatDuration,
  getRatingLabel,
  getRatingColor,
  getRatingDotColor,
  downloadReport,
  numberToRating,
} = usePracticeTracker();

const editingRecord = ref<PracticeRecord | null>(null);
const showForm = ref(false);
const filterStart = ref('');
const filterEnd = ref('');
const expandedSections = ref<string[]>(['summary', 'records', 'daily', 'sections']);

watch(
  [filterStart, filterEnd],
  () => {
    setDateRange({
      start: filterStart.value || null,
      end: filterEnd.value || null,
    });
  },
);

const filterIsActive = computed(() => {
  return filterStart.value !== '' || filterEnd.value !== '';
});

function handleEdit(record: PracticeRecord) {
  editingRecord.value = record;
  showForm.value = true;
  toggleSection('form');
}

function handleDelete(id: string) {
  if (confirm('确定要删除这条练习记录吗？')) {
    deletePracticeRecord(id);
  }
}

function handleRecordSaved() {
  editingRecord.value = null;
  showForm.value = false;
}

function handleClearFilter() {
  filterStart.value = '';
  filterEnd.value = '';
}

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

function getMaxDailyDuration(): number {
  if (dailyStats.value.length === 0) return 1;
  return Math.max(...dailyStats.value.map((d) => d.totalDuration), 1);
}

const warningSections = computed(() => {
  return sectionStats.value.filter((s) => s.isHighErrorRate || s.isLongUnpracticed);
});
</script>

<template>
  <div class="practice-tracker-panel space-y-4">
    <div v-if="!showForm" class="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div class="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-stone-800 flex items-center gap-2">
          <span class="w-1 h-5 bg-emerald-600 rounded-full"></span>
          练习评估与进度跟踪
        </h3>
        <div class="flex items-center gap-2">
          <button
            v-if="warningSections.length > 0"
            class="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium flex items-center gap-1"
            @click="toggleSection('warnings')"
          >
            <AlertTriangle class="w-3.5 h-3.5" />
            {{ warningSections.length }} 个提醒
          </button>
          <button
            @click="showForm = true; toggleSection('form')"
            class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-1.5"
          >
            <FileText class="w-4 h-4" />
            记录练习
          </button>
          <button
            @click="downloadReport"
            class="px-3 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-sm flex items-center gap-1.5"
          >
            <Download class="w-4 h-4" />
            导出报告
          </button>
        </div>
      </div>

      <div class="p-4 border-b border-stone-200">
        <div class="flex items-center gap-2 flex-wrap">
          <CalendarRange class="w-4 h-4 text-stone-400" />
          <span class="text-sm text-stone-600">时间筛选:</span>
          <input
            v-model="filterStart"
            type="date"
            class="px-2 py-1.5 border border-stone-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          <span class="text-stone-400">~</span>
          <input
            v-model="filterEnd"
            type="date"
            class="px-2 py-1.5 border border-stone-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          <button
            v-if="filterIsActive"
            @click="handleClearFilter"
            class="px-2 py-1.5 text-xs bg-stone-100 text-stone-600 rounded-md hover:bg-stone-200 transition-colors flex items-center gap-1"
          >
            <X class="w-3 h-3" />
            清除筛选
          </button>
        </div>
      </div>
    </div>

    <div v-if="showForm" class="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div class="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-stone-800 flex items-center gap-2">
          <span class="w-1 h-5 bg-emerald-600 rounded-full"></span>
          {{ editingRecord ? '编辑练习记录' : '新增练习记录' }}
        </h3>
        <button
          @click="showForm = false; editingRecord = null"
          class="p-1.5 rounded-lg hover:bg-stone-200 text-stone-500 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
      <div class="p-4">
        <PracticeRecordForm :editing-record="editingRecord" @record-saved="handleRecordSaved" />
      </div>
    </div>

    <div
      v-if="warningSections.length > 0 && isSectionExpanded('warnings')"
      class="bg-red-50 rounded-xl border border-red-200 shadow-sm overflow-hidden"
    >
      <div
        class="p-4 border-b border-red-200 flex items-center justify-between cursor-pointer"
        @click="toggleSection('warnings')"
      >
        <h4 class="text-sm font-semibold text-red-800 flex items-center gap-2">
          <AlertTriangle class="w-4 h-4" />
          练习提醒（{{ warningSections.length }}）
        </h4>
        <ChevronUp v-if="isSectionExpanded('warnings')" class="w-4 h-4 text-red-600" />
        <ChevronDown v-else class="w-4 h-4 text-red-600" />
      </div>
      <div class="p-4 space-y-2">
        <div
          v-for="s in warningSections"
          :key="s.sectionId || 'none'"
          class="p-3 bg-white rounded-lg border border-red-100"
        >
          <div class="flex items-center gap-2 mb-1">
            <span class="font-medium text-stone-800">{{ s.sectionName }}</span>
            <span v-if="s.isHighErrorRate" class="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
              高错误率 ({{ s.avgErrorCount.toFixed(1) }}次/次)
            </span>
            <span v-if="s.isLongUnpracticed" class="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
              {{ s.daysSinceLastPractice }} 天未练习
            </span>
          </div>
          <div class="text-xs text-stone-500">
            已练习 {{ s.practiceCount }} 次 · 总时长 {{ formatDuration(s.totalDuration) }}
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isSectionExpanded('summary')"
      class="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden"
    >
      <div
        class="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between cursor-pointer"
        @click="toggleSection('summary')"
      >
        <h4 class="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <BarChart3 class="w-4 h-4 text-emerald-600" />
          总体统计
        </h4>
        <ChevronUp class="w-4 h-4 text-stone-500" />
      </div>
      <div class="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div class="bg-stone-50 rounded-lg p-3 border border-stone-200">
          <div class="text-2xl font-bold text-stone-800">{{ totalStats.totalRecords }}</div>
          <div class="text-xs text-stone-500 flex items-center gap-1">
            <History class="w-3 h-3" />
            练习次数
          </div>
        </div>
        <div class="bg-stone-50 rounded-lg p-3 border border-stone-200">
          <div class="text-2xl font-bold text-stone-800">{{ formatDuration(totalStats.totalDuration).split(' ')[0] }}</div>
          <div class="text-xs text-stone-500 flex items-center gap-1">
            <Clock class="w-3 h-3" />
            总时长
          </div>
        </div>
        <div class="bg-red-50 rounded-lg p-3 border border-red-200">
          <div class="text-2xl font-bold text-red-700">{{ totalStats.totalErrors }}</div>
          <div class="text-xs text-red-600">总错误</div>
        </div>
        <div class="bg-orange-50 rounded-lg p-3 border border-orange-200">
          <div class="text-2xl font-bold text-orange-700">{{ totalStats.totalStutters }}</div>
          <div class="text-xs text-orange-600">总卡顿</div>
        </div>
        <div class="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
          <div class="flex items-center gap-1">
            <span
              class="w-3 h-3 rounded-full"
              :class="getRatingDotColor(totalStats.avgRating)"
            ></span>
            <span class="text-2xl font-bold text-stone-800">
              {{ totalStats.avgRating > 0 ? getRatingLabel(numberToRating(totalStats.avgRating)) : '-' }}
            </span>
          </div>
          <div class="text-xs text-stone-500 flex items-center gap-1">
            <Star class="w-3 h-3" />
            平均自评
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isSectionExpanded('daily')"
      class="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden"
    >
      <div
        class="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between cursor-pointer"
        @click="toggleSection('daily')"
      >
        <h4 class="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <Calendar class="w-4 h-4 text-blue-600" />
          按日统计
        </h4>
        <ChevronUp v-if="isSectionExpanded('daily')" class="w-4 h-4 text-stone-500" />
        <ChevronDown v-else class="w-4 h-4 text-stone-500" />
      </div>
      <div v-if="isSectionExpanded('daily')" class="p-4">
        <div v-if="dailyStats.length === 0" class="text-center py-8 text-stone-400 text-sm">
          暂无练习数据
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="d in dailyStats"
            :key="d.date"
            class="p-3 bg-stone-50 rounded-lg border border-stone-200"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-stone-800">{{ d.date }}</span>
              <div class="flex items-center gap-3 text-xs">
                <span class="text-stone-600">{{ d.recordCount }} 次</span>
                <span class="text-stone-600">{{ formatDuration(d.totalDuration) }}</span>
                <span class="flex items-center gap-1">
                  <span
                    class="w-2 h-2 rounded-full"
                    :class="getRatingDotColor(d.avgRating)"
                  ></span>
                  <span class="text-stone-600">{{ getRatingLabel(numberToRating(d.avgRating)) }}</span>
                </span>
              </div>
            </div>
            <div class="h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-300"
                :style="{ width: `${(d.totalDuration / getMaxDailyDuration()) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isSectionExpanded('sections')"
      class="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden"
    >
      <div
        class="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between cursor-pointer"
        @click="toggleSection('sections')"
      >
        <h4 class="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <TrendingUp class="w-4 h-4 text-amber-600" />
          按段落统计
        </h4>
        <ChevronUp v-if="isSectionExpanded('sections')" class="w-4 h-4 text-stone-500" />
        <ChevronDown v-else class="w-4 h-4 text-stone-500" />
      </div>
      <div v-if="isSectionExpanded('sections')" class="p-4">
        <div v-if="sectionStats.length === 0" class="text-center py-8 text-stone-400 text-sm">
          暂无练习数据
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="s in sectionStats"
            :key="s.sectionId || 'none'"
            class="p-3 rounded-lg border transition-all"
            :class="[
              s.isHighErrorRate || s.isLongUnpracticed
                ? 'bg-red-50 border-red-200'
                : 'bg-stone-50 border-stone-200',
            ]"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-medium text-stone-800">{{ s.sectionName }}</span>
                <span v-if="s.isHighErrorRate" class="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                  高错误率
                </span>
                <span v-if="s.isLongUnpracticed" class="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                  {{ s.daysSinceLastPractice }}天未练
                </span>
              </div>
              <span class="text-xs text-stone-500">
                {{ s.practiceCount }} 次 · {{ formatDuration(s.totalDuration) }}
              </span>
            </div>
            <div class="grid grid-cols-4 gap-2 text-xs">
              <div>
                <div class="text-stone-400">平均错误</div>
                <div class="font-medium text-red-700">{{ s.avgErrorCount.toFixed(1) }}</div>
              </div>
              <div>
                <div class="text-stone-400">平均卡顿</div>
                <div class="font-medium text-orange-700">{{ s.avgStutterCount.toFixed(1) }}</div>
              </div>
              <div>
                <div class="text-stone-400">平均自评</div>
                <div class="flex items-center gap-1">
                  <span
                    class="w-2 h-2 rounded-full"
                    :class="getRatingDotColor(s.avgRating)"
                  ></span>
                  <span class="font-medium text-stone-700">{{ getRatingLabel(numberToRating(s.avgRating)) }}</span>
                </div>
              </div>
              <div>
                <div class="text-stone-400">最近练习</div>
                <div class="font-medium text-stone-700">
                  {{ s.lastPracticeTime ? formatDateTime(s.lastPracticeTime) : '无' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isSectionExpanded('records')"
      class="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden"
    >
      <div
        class="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between cursor-pointer"
        @click="toggleSection('records')"
      >
        <h4 class="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <History class="w-4 h-4 text-purple-600" />
          练习记录（{{ filteredRecords.length }}）
        </h4>
        <ChevronUp v-if="isSectionExpanded('records')" class="w-4 h-4 text-stone-500" />
        <ChevronDown v-else class="w-4 h-4 text-stone-500" />
      </div>
      <div v-if="isSectionExpanded('records')" class="p-4">
        <div v-if="filteredRecords.length === 0" class="text-center py-8 text-stone-400 text-sm">
          暂无练习记录
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="r in filteredRecords"
            :key="r.id"
            class="p-3 bg-stone-50 rounded-lg border border-stone-200 hover:border-stone-300 transition-all"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-medium text-stone-800">{{ r.sectionName }}</span>
                  <span
                    class="px-2 py-0.5 text-xs rounded-full font-medium"
                    :class="getRatingColor(r.selfRating)"
                  >
                    {{ getRatingLabel(r.selfRating) }}
                  </span>
                </div>
                <div class="text-xs text-stone-500">
                  {{ formatDateTime(r.startTime) }} · {{ formatDuration(r.actualDuration) }}
                </div>
              </div>
              <div class="flex items-center gap-1 ml-2">
                <button
                  @click="handleEdit(r)"
                  class="p-1.5 rounded hover:bg-stone-200 text-stone-500 hover:text-stone-700 transition-colors"
                  title="编辑"
                >
                  <Edit3 class="w-4 h-4" />
                </button>
                <button
                  @click="handleDelete(r.id)"
                  class="p-1.5 rounded hover:bg-red-100 text-stone-500 hover:text-red-600 transition-colors"
                  title="删除"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="grid grid-cols-4 gap-2 text-xs">
              <div>
                <div class="text-stone-400">目标 BPM</div>
                <div class="font-medium text-stone-700">{{ r.targetBpm }}</div>
              </div>
              <div>
                <div class="text-stone-400">实际 BPM</div>
                <div class="font-medium text-emerald-700">{{ r.actualBpm }}</div>
              </div>
              <div>
                <div class="text-stone-400">错误</div>
                <div class="font-medium text-red-700">{{ r.errorCount }}</div>
              </div>
              <div>
                <div class="text-stone-400">卡顿</div>
                <div class="font-medium text-orange-700">{{ r.stutterCount }}</div>
              </div>
            </div>
            <div v-if="r.note" class="mt-2 text-xs text-stone-600 bg-white rounded px-2 py-1.5 border border-stone-200">
              {{ r.note }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
