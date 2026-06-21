<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { Fingering } from '@/types/fingering';
import { useFingeringStore } from '@/composables/useFingeringStore';
import { useConflictDetector } from '@/composables/useConflictDetector';
import { useAudioPlayer } from '@/composables/useAudioPlayer';
import TimelineItem from './TimelineItem.vue';
import { Play, Pause, Square, SkipBack, Download, Trash2, FileJson } from 'lucide-vue-next';

const props = defineProps<{
  pixelPerSecond?: number;
  minDuration?: number;
}>();

const emit = defineEmits<{
  (e: 'export'): void;
}>();

const {
  sortedFingerings,
  totalDuration,
  selectedId,
  selectFingering,
  updateDuration,
  updateStartTime,
  clearAll,
  fingerings,
  exportJson,
} = useFingeringStore();

const { isFingeringInConflict, conflicts, hasConflicts } = useConflictDetector(
  sortedFingerings,
);

const { isPlaying, currentTime, play, pause, stop, seek, setFingerings } = useAudioPlayer();

const timelineRef = ref<HTMLElement | null>(null);
const showExportModal = ref(false);
const pps = computed(() => props.pixelPerSecond || 100);
const minDur = computed(() => props.minDuration || 0.5);

const timelineWidth = computed(() => {
  const minWidth = 800;
  const calculated = totalDuration.value * pps.value + 200;
  return Math.max(minWidth, calculated);
});

const playbackLineStyle = computed(() => ({
  left: `${currentTime.value * pps.value}px`,
}));

const timeMarkers = computed(() => {
  const markers: number[] = [];
  const step = 1;
  const end = Math.ceil(totalDuration.value) + 2;
  for (let i = 0; i <= end; i += step) {
    markers.push(i);
  }
  return markers;
});

function handleTimelineClick(e: MouseEvent) {
  if (!timelineRef.value) return;
  const rect = timelineRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const time = x / pps.value;
  if (time >= 0 && time <= totalDuration.value) {
    seek(time);
  }
}

function handleSelect(id: string) {
  selectFingering(id);
}

function handleDurationChange(id: string, duration: number) {
  updateDuration(id, duration);
}

function handleStartTimeChange(id: string, startTime: number) {
  updateStartTime(id, startTime);
}

function handlePlay() {
  if (isPlaying.value) {
    pause();
  } else {
    play();
  }
}

function handleStop() {
  stop();
}

function handleRestart() {
  stop();
  setTimeout(() => {
    play();
  }, 50);
}

function handleExport() {
  emit('export');
}

function handleDownloadJson() {
  const jsonStr = exportJson();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `guqin-score-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showExportModal.value = false;
}

watch(
  sortedFingerings,
  (fings) => {
    setFingerings(fings);
  },
  { deep: true, immediate: true },
);

onMounted(() => {
  setFingerings(sortedFingerings.value);
});
</script>

<template>
  <div class="timeline-editor bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
    <div class="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
      <div class="flex items-center gap-3">
        <h3 class="text-lg font-semibold text-stone-800 flex items-center gap-2">
          <span class="w-1 h-5 bg-amber-600 rounded-full"></span>
          指法时间轴
        </h3>
        <span
          v-if="conflicts.length > 0"
          class="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full"
        >
          {{ conflicts.length }} 处冲突
        </span>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
          <button
            @click="handleRestart"
            class="p-2 rounded-md hover:bg-white transition-colors text-stone-600 hover:text-stone-800"
            title="从头播放"
          >
            <SkipBack class="w-4 h-4" />
          </button>
          <button
            @click="handlePlay"
            class="p-2 rounded-md hover:bg-white transition-colors text-stone-600 hover:text-stone-800"
            :title="isPlaying ? '暂停' : '播放'"
          >
            <Pause v-if="isPlaying" class="w-4 h-4" />
            <Play v-else class="w-4 h-4" />
          </button>
          <button
            @click="handleStop"
            class="p-2 rounded-md hover:bg-white transition-colors text-stone-600 hover:text-stone-800"
            title="停止"
          >
            <Square class="w-4 h-4" />
          </button>
        </div>

        <div class="h-6 w-px bg-stone-300"></div>

        <button
          @click="clearAll"
          class="p-2 rounded-lg hover:bg-red-50 transition-colors text-stone-500 hover:text-red-600"
          title="清空所有"
        >
          <Trash2 class="w-4 h-4" />
        </button>

        <button
          @click="showExportModal = true"
          class="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium flex items-center gap-1.5"
          :class="{ 'opacity-50 cursor-not-allowed': conflicts.length > 0 }"
          :disabled="conflicts.length > 0"
          :title="conflicts.length > 0 ? '请先解决技法冲突后再导出' : '导出练习谱'"
        >
          <Download class="w-4 h-4" />
          导出
        </button>
      </div>
    </div>

    <div class="p-4">
      <div class="text-sm text-stone-500 mb-2 flex items-center gap-2">
        <span>总时长: {{ totalDuration.toFixed(1) }}s</span>
        <span class="text-stone-300">|</span>
        <span>{{ sortedFingerings.length }} 个指法</span>
      </div>

      <div
        ref="timelineRef"
        class="relative overflow-x-auto rounded-lg border border-stone-200 bg-stone-50"
        style="height: 220px"
        @click="handleTimelineClick"
      >
        <div class="relative" :style="{ width: `${timelineWidth}px`, height: '100%' }">
          <div class="absolute top-0 left-0 right-0 h-8 border-b border-stone-200 bg-white flex items-end px-2">
            <div
              v-for="time in timeMarkers"
              :key="time"
              class="absolute bottom-0 text-xs text-stone-400"
              :style="{ left: `${time * pps}px` }"
            >
              {{ time }}s
            </div>
          </div>

          <div class="absolute top-8 left-0 right-0 bottom-0">
            <div
              v-for="time in timeMarkers"
              :key="'line-' + time"
              class="absolute top-0 bottom-0 w-px bg-stone-200"
              :style="{ left: `${time * pps}px` }"
            ></div>
          </div>

          <div class="absolute top-8 left-0 right-0 bottom-0">
            <TimelineItem
              v-for="fing in sortedFingerings"
              :key="fing.id"
              :fingering="fing"
              :total-duration="totalDuration"
              :is-selected="selectedId === fing.id"
              :has-conflict="isFingeringInConflict(fing.id)"
              :pixel-per-second="pps"
              :min-duration="minDur"
              @select="handleSelect(fing.id)"
              @duration-change="(d) => handleDurationChange(fing.id, d)"
              @start-time-change="(t) => handleStartTimeChange(fing.id, t)"
            />
          </div>

          <div
            v-if="totalDuration > 0"
            class="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none transition-all duration-75"
            :style="playbackLineStyle"
          >
            <div class="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
          </div>
        </div>
      </div>

      <div class="mt-3 flex items-center gap-4 text-xs text-stone-500">
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 bg-amber-50 border border-amber-300 rounded"></div>
          <span>正常指法</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 bg-red-100 border-2 border-red-400 rounded"></div>
          <span>冲突指法</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-0.5 h-3 bg-red-500"></div>
          <span>播放位置</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showExportModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showExportModal = false"
      >
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <FileJson class="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-stone-800">导出练习谱</h3>
              <p class="text-sm text-stone-500">将指法数据导出为 JSON 格式</p>
            </div>
          </div>

          <div
            v-if="conflicts.length > 0"
            class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <p class="text-sm text-red-600 font-medium">
              ⚠️ 存在 {{ conflicts.length }} 处技法冲突，请先解决后再导出
            </p>
          </div>

          <div class="flex gap-3 justify-end mt-6">
            <button
              @click="showExportModal = false"
              class="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              @click="handleDownloadJson"
              class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium flex items-center gap-2"
              :class="{ 'opacity-50 cursor-not-allowed': conflicts.length > 0 }"
              :disabled="conflicts.length > 0"
            >
              <Download class="w-4 h-4" />
              下载 JSON
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
