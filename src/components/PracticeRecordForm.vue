<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { usePracticeTracker } from '@/composables/usePracticeTracker';
import { useFingeringStore } from '@/composables/useFingeringStore';
import { SELF_RATINGS } from '@/types/fingering';
import type { SelfRating, PracticeRecord } from '@/types/fingering';
import {
  Play,
  Square,
  Save,
  X,
  Clock,
  Target,
  Gauge,
  AlertCircle,
  Star,
  Tag,
  FileText,
  RotateCcw,
} from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'recordSaved'): void;
}>();

const { addPracticeRecord, updatePracticeRecord, formatDuration } = usePracticeTracker();
const { practiceSections, practiceConfig } = useFingeringStore();

const props = defineProps<{
  editingRecord?: PracticeRecord | null;
}>();

const isTimerRunning = ref(false);
const timerStart = ref(0);
const timerElapsed = ref(0);
let timerInterval: number | null = null;

const startTime = ref('');
const endTime = ref('');
const actualDuration = ref(0);
const sectionId = ref<string | null>(null);
const sectionName = ref('自由练习');
const targetBpm = ref(60);
const actualBpm = ref(60);
const errorCount = ref(0);
const stutterCount = ref(0);
const selfRating = ref<SelfRating>('good');
const note = ref('');
const errors = ref<string[]>([]);

const ratingOptions = SELF_RATINGS;

const sectionOptions = computed(() => [
  { id: null, name: '自由练习' },
  ...practiceSections.value.map((s) => ({ id: s.id, name: s.name })),
]);

const formattedElapsed = computed(() => formatDuration(timerElapsed.value));

function resetForm() {
  startTime.value = '';
  endTime.value = '';
  actualDuration.value = 0;
  sectionId.value = null;
  sectionName.value = '自由练习';
  targetBpm.value = practiceConfig.value.bpm;
  actualBpm.value = practiceConfig.value.bpm;
  errorCount.value = 0;
  stutterCount.value = 0;
  selfRating.value = 'good';
  note.value = '';
  errors.value = [];
  isTimerRunning.value = false;
  timerElapsed.value = 0;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function loadEditingRecord() {
  if (!props.editingRecord) {
    resetForm();
    return;
  }
  const r = props.editingRecord;
  startTime.value = formatDateTimeLocal(r.startTime);
  endTime.value = formatDateTimeLocal(r.endTime);
  actualDuration.value = r.actualDuration;
  sectionId.value = r.sectionId;
  sectionName.value = r.sectionName;
  targetBpm.value = r.targetBpm;
  actualBpm.value = r.actualBpm;
  errorCount.value = r.errorCount;
  stutterCount.value = r.stutterCount;
  selfRating.value = r.selfRating;
  note.value = r.note || '';
  errors.value = [];
}

watch(
  () => props.editingRecord,
  () => {
    loadEditingRecord();
  },
);

function formatDateTimeLocal(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

function parseDateTimeLocal(str: string): number {
  if (!str) return 0;
  return new Date(str).getTime();
}

function startTimer() {
  isTimerRunning.value = true;
  timerStart.value = Date.now();
  startTime.value = formatDateTimeLocal(timerStart.value);
  timerElapsed.value = 0;

  timerInterval = window.setInterval(() => {
    timerElapsed.value = Math.floor((Date.now() - timerStart.value) / 1000);
  }, 1000);
}

function stopTimer() {
  isTimerRunning.value = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  endTime.value = formatDateTimeLocal(Date.now());
  actualDuration.value = timerElapsed.value;
}

function handleSectionChange() {
  const selected = sectionOptions.value.find((s) => s.id === sectionId.value);
  if (selected) {
    sectionName.value = selected.name;
  }
}

function handleStartTimeChange() {
  if (startTime.value && endTime.value) {
    const start = parseDateTimeLocal(startTime.value);
    const end = parseDateTimeLocal(endTime.value);
    if (end > start) {
      actualDuration.value = Math.floor((end - start) / 1000);
    }
  }
}

function handleEndTimeChange() {
  handleStartTimeChange();
}

function handleDurationChange() {
  if (startTime.value && actualDuration.value > 0) {
    const start = parseDateTimeLocal(startTime.value);
    const end = start + actualDuration.value * 1000;
    endTime.value = formatDateTimeLocal(end);
  }
}

function handleSubmit() {
  errors.value = [];

  if (!startTime.value) {
    errors.value.push('请选择开始时间');
  }
  if (!endTime.value) {
    errors.value.push('请选择结束时间');
  }

  const startTs = parseDateTimeLocal(startTime.value);
  const endTs = parseDateTimeLocal(endTime.value);

  if (startTs && endTs && endTs < startTs) {
    errors.value.push('结束时间不能早于开始时间');
  }

  if (actualDuration.value <= 0 && !errors.value.some((e) => e.includes('时长'))) {
    errors.value.push('练习时长必须大于 0');
  }

  if (targetBpm.value <= 0) {
    errors.value.push('目标速度必须大于 0');
  }
  if (actualBpm.value <= 0) {
    errors.value.push('实际速度必须大于 0');
  }
  if (errorCount.value < 0) {
    errors.value.push('错误次数不能为负数');
  }
  if (stutterCount.value < 0) {
    errors.value.push('卡顿次数不能为负数');
  }

  if (errors.value.length > 0) {
    return;
  }

  const recordData = {
    startTime: startTs,
    endTime: endTs,
    actualDuration: actualDuration.value,
    sectionId: sectionId.value,
    sectionName: sectionName.value,
    targetBpm: targetBpm.value,
    actualBpm: actualBpm.value,
    errorCount: errorCount.value,
    stutterCount: stutterCount.value,
    selfRating: selfRating.value,
    note: note.value.trim() || undefined,
  };

  let result;
  if (props.editingRecord) {
    result = updatePracticeRecord(props.editingRecord.id, recordData);
  } else {
    result = addPracticeRecord(recordData);
  }

  if (result.success) {
    emit('recordSaved');
    resetForm();
  } else if (result.errors) {
    errors.value = result.errors;
  }
}

function handleCancel() {
  emit('recordSaved');
  resetForm();
}

watch(sectionId, handleSectionChange);

onMounted(() => {
  targetBpm.value = practiceConfig.value.bpm;
  actualBpm.value = practiceConfig.value.bpm;
  if (props.editingRecord) {
    loadEditingRecord();
  }
});

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});
</script>

<template>
  <div class="practice-record-form bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
    <div class="p-4 border-b border-stone-200 bg-stone-50">
      <h3 class="text-lg font-semibold text-stone-800 flex items-center gap-2">
        <span class="w-1 h-5 bg-emerald-600 rounded-full"></span>
        {{ editingRecord ? '编辑练习记录' : '记录练习' }}
      </h3>
    </div>

    <div class="p-4 space-y-4">
      <div v-if="errors.length > 0" class="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
        <div
          v-for="(err, idx) in errors"
          :key="idx"
          class="flex items-center gap-2 text-sm text-red-700"
        >
          <AlertCircle class="w-4 h-4" />
          {{ err }}
        </div>
      </div>

      <div class="flex gap-2">
        <button
          v-if="!isTimerRunning"
          @click="startTimer"
          class="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Play class="w-4 h-4" />
          开始计时
        </button>
        <button
          v-else
          @click="stopTimer"
          class="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Square class="w-4 h-4" />
          停止计时
          <span class="bg-red-500 px-2 py-0.5 rounded text-sm">{{ formattedElapsed }}</span>
        </button>
        <button
          @click="resetForm"
          class="px-3 py-3 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
          title="重置"
        >
          <RotateCcw class="w-4 h-4" />
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="flex items-center gap-1 text-sm font-medium text-stone-700 mb-1.5">
            <Clock class="w-4 h-4 text-stone-400" />
            开始时间
          </label>
          <input
            v-model="startTime"
            type="datetime-local"
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-stone-800 text-sm"
            @change="handleStartTimeChange"
          />
        </div>
        <div>
          <label class="flex items-center gap-1 text-sm font-medium text-stone-700 mb-1.5">
            <Clock class="w-4 h-4 text-stone-400" />
            结束时间
          </label>
          <input
            v-model="endTime"
            type="datetime-local"
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-stone-800 text-sm"
            @change="handleEndTimeChange"
          />
        </div>
      </div>

      <div>
        <label class="flex items-center gap-1 text-sm font-medium text-stone-700 mb-1.5">
          <Clock class="w-4 h-4 text-stone-400" />
          实际练习时长（秒）
          <span class="text-xs text-stone-400 font-normal">({{ formatDuration(actualDuration) }})</span>
        </label>
        <input
          v-model.number="actualDuration"
          type="number"
          min="1"
          class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-stone-800 text-sm"
          @change="handleDurationChange"
        />
      </div>

      <div>
        <label class="flex items-center gap-1 text-sm font-medium text-stone-700 mb-1.5">
          <Tag class="w-4 h-4 text-stone-400" />
          练习段落
        </label>
        <select
          v-model="sectionId"
          class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-stone-800 text-sm bg-white"
        >
          <option v-for="s in sectionOptions" :key="s.id === null ? 'none' : s.id" :value="s.id">
            {{ s.name }}
          </option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="flex items-center gap-1 text-sm font-medium text-stone-700 mb-1.5">
            <Target class="w-4 h-4 text-stone-400" />
            目标速度（BPM）
          </label>
          <input
            v-model.number="targetBpm"
            type="number"
            min="1"
            max="300"
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-stone-800 text-sm"
          />
        </div>
        <div>
          <label class="flex items-center gap-1 text-sm font-medium text-stone-700 mb-1.5">
            <Gauge class="w-4 h-4 text-stone-400" />
            实际速度（BPM）
          </label>
          <input
            v-model.number="actualBpm"
            type="number"
            min="1"
            max="300"
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-stone-800 text-sm"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="flex items-center gap-1 text-sm font-medium text-stone-700 mb-1.5">
            <AlertCircle class="w-4 h-4 text-red-400" />
            错误次数
          </label>
          <input
            v-model.number="errorCount"
            type="number"
            min="0"
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-stone-800 text-sm"
          />
        </div>
        <div>
          <label class="flex items-center gap-1 text-sm font-medium text-stone-700 mb-1.5">
            <AlertCircle class="w-4 h-4 text-orange-400" />
            卡顿次数
          </label>
          <input
            v-model.number="stutterCount"
            type="number"
            min="0"
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-stone-800 text-sm"
          />
        </div>
      </div>

      <div>
        <label class="flex items-center gap-1 text-sm font-medium text-stone-700 mb-1.5">
          <Star class="w-4 h-4 text-amber-400" />
          自评等级
        </label>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="r in ratingOptions"
            :key="r.value"
            @click="selfRating = r.value"
            class="px-2 py-2 rounded-lg border text-sm font-medium transition-all"
            :class="[
              selfRating === r.value
                ? r.color === 'red'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : r.color === 'orange'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : r.color === 'amber'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300',
            ]"
          >
            {{ r.label }}
          </button>
        </div>
      </div>

      <div>
        <label class="flex items-center gap-1 text-sm font-medium text-stone-700 mb-1.5">
          <FileText class="w-4 h-4 text-stone-400" />
          备注（可选）
        </label>
        <textarea
          v-model="note"
          rows="2"
          placeholder="记录练习感受、需要注意的地方..."
          class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-stone-800 text-sm resize-none"
        ></textarea>
      </div>

      <div class="flex gap-2 pt-2">
        <button
          v-if="editingRecord"
          @click="handleCancel"
          class="flex-1 px-4 py-2.5 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-sm font-medium flex items-center justify-center gap-1.5"
        >
          <X class="w-4 h-4" />
          取消
        </button>
        <button
          @click="handleSubmit"
          class="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center justify-center gap-1.5"
        >
          <Save class="w-4 h-4" />
          {{ editingRecord ? '更新记录' : '保存记录' }}
        </button>
      </div>
    </div>
  </div>
</template>
