<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { Fingering, PracticeSection } from '@/types/fingering';
import { useFingeringStore } from '@/composables/useFingeringStore';
import { useConflictDetector } from '@/composables/useConflictDetector';
import { useAudioPlayer } from '@/composables/useAudioPlayer';
import { useAnnotationStore } from '@/composables/useAnnotationStore';
import { useReviewStore } from '@/composables/useReviewStore';
import TimelineItem from './TimelineItem.vue';
import { Play, Pause, Square, SkipBack, Download, Trash2, FileJson, FileText, Undo2, Redo2, Clock, Music2, MessageCircle, AlertTriangle } from 'lucide-vue-next';
import { secondsToBeats, beatsToSeconds } from '@/utils/practice';

const props = defineProps<{
  pixelPerSecond?: number;
  pixelPerBeat?: number;
  minDuration?: number;
}>();

const emit = defineEmits<{
  (e: 'export'): void;
  (e: 'playSection', section: PracticeSection): void;
}>();

const {
  sortedFingerings,
  totalDuration,
  totalBeats,
  barStartTimes,
  selectedId,
  selectFingering,
  updateDuration,
  updateStartTime,
  clearAll,
  fingerings,
  exportJson,
  exportPracticeViewJson,
  practiceConfig,
  practiceSections,
  canUndo,
  canRedo,
  undo,
  redo,
} = useFingeringStore();

const { isFingeringInConflict, conflicts, hasConflicts } = useConflictDetector(
  sortedFingerings,
);

const {
  isPlaying,
  currentTime,
  playDuration,
  tempoMultiplier,
  activeSection,
  play,
  pause,
  stop,
  seek,
  setFingerings,
  playSection,
  setActiveSection,
} = useAudioPlayer();

const {
  isFingeringAnnotated,
  getAnnotationsForTarget,
  annotations,
  annotatedFingeringIds,
  annotatedSectionIds,
} = useAnnotationStore();

const {
  reviewRecords,
} = useReviewStore();

const timelineRef = ref<HTMLElement | null>(null);
const showExportModal = ref(false);
const pps = computed(() => props.pixelPerSecond || 100);

const highErrorFingeringIds = computed(() => {
  const ids = new Set<string>();
  for (const review of reviewRecords.value) {
    for (const hotspot of review.errorHotspots) {
      ids.add(hotspot.fingeringId);
    }
  }
  return ids;
});

function getAnnotationCountForFingering(fingeringId: string): number {
  return getAnnotationsForTarget('fingering', fingeringId).length;
}

function isFingeringHighErrorRate(fingeringId: string): boolean {
  return highErrorFingeringIds.value.has(fingeringId);
}
const ppb = computed(() => props.pixelPerBeat || 100);
const minDur = computed(() => props.minDuration || 0.5);

const pixelPerUnit = computed(() => {
  return practiceConfig.value.timeAxisMode === 'seconds' ? pps.value : ppb.value;
});

const timelineWidth = computed(() => {
  const minWidth = 800;
  const totalLength = practiceConfig.value.timeAxisMode === 'seconds'
    ? totalDuration.value
    : totalBeats.value;
  const calculated = totalLength * pixelPerUnit.value + 200;
  return Math.max(minWidth, calculated);
});

const displayTime = computed(() => {
  if (activeSection.value) {
    const sectionStart = sortedFingerings.value
      .filter((f) => activeSection.value!.fingeringIds.includes(f.id))
      .sort((a, b) => a.startTime - b.startTime)[0]?.startTime || 0;
    return (currentTime.value * tempoMultiplier.value + sectionStart);
  }
  return currentTime.value * tempoMultiplier.value;
});

const playbackLineStyle = computed(() => {
  const position = practiceConfig.value.timeAxisMode === 'seconds'
    ? displayTime.value * pps.value
    : secondsToBeats(displayTime.value, practiceConfig.value.bpm) * ppb.value;
  return {
    left: `${position}px`,
  };
});

const timeMarkers = computed(() => {
  const markers: Array<{ value: number; label: string; isBar?: boolean }> = [];

  if (practiceConfig.value.timeAxisMode === 'seconds') {
    const step = 1;
    const end = Math.ceil(totalDuration.value) + 2;
    for (let i = 0; i <= end; i += step) {
      markers.push({ value: i, label: `${i}s` });
    }
  } else {
    const { beats } = practiceConfig.value.timeSignature;
    const end = Math.ceil(totalBeats.value) + beats;
    for (let i = 0; i <= end; i++) {
      const isBar = i % beats === 0;
      const barNumber = Math.floor(i / beats) + 1;
      const beatInBar = (i % beats) + 1;
      const label = isBar ? `${barNumber}` : `${beatInBar}`;
      markers.push({ value: i, label, isBar });
    }
  }

  return markers;
});

const barLines = computed(() => {
  if (practiceConfig.value.timeAxisMode === 'seconds') {
    return barStartTimes.value.map((time) => ({
      position: time * pps.value,
      isMajor: true,
    }));
  }
  const { beats } = practiceConfig.value.timeSignature;
  const totalBars = Math.ceil(totalBeats.value / beats) + 1;
  const lines: Array<{ position: number; isMajor: boolean }> = [];
  for (let i = 0; i <= totalBars; i++) {
    lines.push({
      position: i * beats * ppb.value,
      isMajor: true,
    });
  }
  return lines;
});

const sectionRanges = computed(() => {
  return practiceSections.value
    .map((section) => {
      const sectionFings = sortedFingerings.value.filter((f) =>
        section.fingeringIds.includes(f.id),
      );
      if (sectionFings.length === 0) return null;

      const sorted = [...sectionFings].sort((a, b) => a.startTime - b.startTime);
      const startTime = sorted[0].startTime;
      const endTime = sorted[sorted.length - 1].startTime + sorted[sorted.length - 1].duration;

      let startPos: number, endPos: number;

      if (practiceConfig.value.timeAxisMode === 'seconds') {
        startPos = startTime * pps.value;
        endPos = endTime * pps.value;
      } else {
        startPos = secondsToBeats(startTime, practiceConfig.value.bpm) * ppb.value;
        endPos = secondsToBeats(endTime, practiceConfig.value.bpm) * ppb.value;
      }

      return {
        id: section.id,
        name: section.name,
        left: startPos,
        width: endPos - startPos,
        isActive: activeSection.value?.id === section.id,
        loop: section.loop,
      };
    })
    .filter(Boolean);
});

function handleTimelineClick(e: MouseEvent) {
  if (!timelineRef.value) return;
  const rect = timelineRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;

  let time: number;
  if (practiceConfig.value.timeAxisMode === 'seconds') {
    time = x / pps.value;
  } else {
    const beat = x / ppb.value;
    time = beatsToSeconds(beat, practiceConfig.value.bpm);
  }

  if (activeSection.value) {
    const sectionStart = sortedFingerings.value
      .filter((f) => activeSection.value!.fingeringIds.includes(f.id))
      .sort((a, b) => a.startTime - b.startTime)[0]?.startTime || 0;
    const relativeTime = Math.max(0, time - sectionStart);
    seek(relativeTime / tempoMultiplier.value);
  } else {
    if (time >= 0 && time <= totalDuration.value) {
      seek(time / tempoMultiplier.value);
    }
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
  setActiveSection(null);
  stop();
}

function handleRestart() {
  if (activeSection.value) {
    stop();
    setTimeout(() => {
      playSection(activeSection.value!, sortedFingerings.value);
    }, 50);
  } else {
    stop();
    setTimeout(() => {
      play();
    }, 50);
  }
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

function handleDownloadPracticeView() {
  const jsonStr = exportPracticeViewJson('古琴练习谱');
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `guqin-practice-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showExportModal.value = false;
}

function handlePlaySection(section: PracticeSection) {
  emit('playSection', section);
}

function getTimeLabel(time: number): string {
  if (practiceConfig.value.timeAxisMode === 'seconds') {
    return `${time.toFixed(1)}s`;
  }
  return `${secondsToBeats(time, practiceConfig.value.bpm).toFixed(1)}拍`;
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
        <span
          v-if="annotatedFingeringIds.size > 0"
          class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1"
        >
          <MessageCircle class="w-3 h-3" />
          {{ annotatedFingeringIds.size }} 处批注
        </span>
        <span
          v-if="activeSection"
          class="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1"
        >
          <Music2 class="w-3 h-3" />
          {{ activeSection.name }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
          <button
            @click="undo"
            :disabled="!canUndo"
            class="p-2 rounded-md hover:bg-white transition-colors text-stone-600 hover:text-stone-800 disabled:opacity-40 disabled:cursor-not-allowed"
            title="撤销"
          >
            <Undo2 class="w-4 h-4" />
          </button>
          <button
            @click="redo"
            :disabled="!canRedo"
            class="p-2 rounded-md hover:bg-white transition-colors text-stone-600 hover:text-stone-800 disabled:opacity-40 disabled:cursor-not-allowed"
            title="重做"
          >
            <Redo2 class="w-4 h-4" />
          </button>
        </div>

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
        <Clock class="w-4 h-4" />
        <span>
          总时长: {{ totalDuration.toFixed(1) }}s / {{ totalBeats.toFixed(1) }}拍
          <span v-if="tempoMultiplier !== 1" class="text-amber-600"> ({{ tempoMultiplier.toFixed(2) }}x)</span>
        </span>
        <span class="text-stone-300">|</span>
        <span>{{ sortedFingerings.length }} 个指法</span>
        <span class="text-stone-300">|</span>
        <span>BPM: {{ practiceConfig.bpm }}</span>
        <span class="text-stone-300">|</span>
        <span>节拍: {{ practiceConfig.timeSignature.beats }}/{{ practiceConfig.timeSignature.beatType }}</span>
      </div>

      <div
        ref="timelineRef"
        class="relative overflow-x-auto rounded-lg border border-stone-200 bg-stone-50"
        style="height: 240px"
        @click="handleTimelineClick"
      >
        <div class="relative" :style="{ width: `${timelineWidth}px`, height: '100%' }">
          <div
            v-for="section in sectionRanges"
            :key="'section-' + section!.id"
            class="absolute top-8 bottom-0 rounded-md transition-all pointer-events-none z-5"
            :class="section!.isActive ? 'bg-amber-200/30 border-2 border-amber-400' : 'bg-blue-100/20 border border-blue-300'"
            :style="{
              left: `${section!.left}px`,
              width: `${section!.width}px`,
            }"
          >
            <div class="absolute -top-5 left-1 text-xs font-medium text-stone-600 flex items-center gap-1">
              {{ section!.name }}
              <span v-if="section!.loop" class="text-amber-600">↻</span>
            </div>
          </div>

          <div class="absolute top-0 left-0 right-0 h-8 border-b border-stone-200 bg-white flex items-end px-2">
            <div
              v-for="marker in timeMarkers"
              :key="marker.value"
              class="absolute bottom-0 text-xs transition-all"
              :class="[
                marker.isBar ? 'text-amber-700 font-semibold' : 'text-stone-400',
              ]"
              :style="{
                left: `${marker.value * pixelPerUnit}px`,
                transform: marker.isBar ? 'translateX(-50%)' : 'translateX(-50%)',
              }"
            >
              {{ marker.label }}
            </div>
          </div>

          <div class="absolute top-8 left-0 right-0 bottom-0">
            <div
              v-for="(line, idx) in barLines"
              :key="'bar-' + idx"
              class="absolute top-0 bottom-0 transition-all"
              :class="line.isMajor ? 'w-0.5 bg-amber-300' : 'w-px bg-stone-200'"
              :style="{ left: `${line.position}px` }"
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
              :is-annotated="isFingeringAnnotated(fing.id)"
              :is-high-error-rate="isFingeringHighErrorRate(fing.id)"
              :annotation-count="getAnnotationCountForFingering(fing.id)"
              :pixel-per-second="practiceConfig.timeAxisMode === 'seconds' ? pps : beatsToSeconds(1, practiceConfig.bpm) * ppb"
              :min-duration="minDur"
              :time-axis-mode="practiceConfig.timeAxisMode"
              :bpm="practiceConfig.bpm"
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

      <div class="mt-3 flex items-center gap-4 text-xs text-stone-500 flex-wrap">
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 bg-amber-50 border border-amber-300 rounded"></div>
          <span>正常指法</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 bg-red-100 border-2 border-red-400 rounded"></div>
          <span>冲突指法</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 bg-blue-50 border border-blue-300 rounded"></div>
          <span>已批注</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 bg-red-50 border-2 border-red-300 rounded"></div>
          <span>高错误率</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-0.5 h-3 bg-amber-300"></div>
          <span>小节线</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 bg-blue-100/50 border border-blue-300 rounded"></div>
          <span>练习段</span>
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
              <Download class="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-stone-800">导出练习谱</h3>
              <p class="text-sm text-stone-500">选择导出格式</p>
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

          <div class="space-y-3">
            <button
              @click="handleDownloadJson"
              class="w-full px-4 py-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors flex items-center gap-3 text-left"
              :class="{ 'opacity-50 cursor-not-allowed': conflicts.length > 0 }"
              :disabled="conflicts.length > 0"
            >
              <FileJson class="w-5 h-5 text-amber-600" />
              <div>
                <div class="font-medium text-stone-800">完整数据 (JSON)</div>
                <div class="text-xs text-stone-500">包含所有指法、练习段、配置信息</div>
              </div>
            </button>

            <button
              @click="handleDownloadPracticeView"
              class="w-full px-4 py-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-3 text-left"
              :class="{ 'opacity-50 cursor-not-allowed': conflicts.length > 0 }"
              :disabled="conflicts.length > 0"
            >
              <FileText class="w-5 h-5 text-amber-600" />
              <div>
                <div class="font-medium text-stone-800">练习视图 (JSON)</div>
                <div class="text-xs text-stone-500">适用于练习展示的结构化数据</div>
              </div>
            </button>
          </div>

          <div class="flex justify-end mt-6">
            <button
              @click="showExportModal = false"
              class="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
