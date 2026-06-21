<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Fingering } from '@/types/fingering';
import {
  RIGHT_HAND_TECHNIQUES,
  LEFT_HAND_TECHNIQUES,
  STRING_LABELS,
  HUI_POSITIONS,
} from '@/types/fingering';
import { GripVertical, Trash2, Volume2 } from 'lucide-vue-next';
import { useFingeringStore } from '@/composables/useFingeringStore';
import { useAudioPlayer } from '@/composables/useAudioPlayer';

const props = defineProps<{
  fingering: Fingering;
  totalDuration: number;
  isSelected: boolean;
  hasConflict: boolean;
  pixelPerSecond: number;
  minDuration: number;
}>();

const emit = defineEmits<{
  (e: 'select'): void;
  (e: 'durationChange', duration: number): void;
  (e: 'startTimeChange', startTime: number): void;
}>();

const { deleteFingering } = useFingeringStore();
const { playSingleFingering } = useAudioPlayer();

const isDragging = ref(false);
const isResizing = ref(false);
const dragStartX = ref(0);
const initialStartTime = ref(0);
const initialDuration = ref(0);

const rightHandLabel = computed(() => {
  const t = RIGHT_HAND_TECHNIQUES.find((t) => t.value === props.fingering.rightHand);
  return t?.label || props.fingering.rightHand;
});

const leftHandLabel = computed(() => {
  const t = LEFT_HAND_TECHNIQUES.find((t) => t.value === props.fingering.leftHand);
  return t?.label || props.fingering.leftHand;
});

const stringLabel = computed(() => STRING_LABELS[props.fingering.stringIndex - 1] || '');

const huiLabel = computed(() => {
  const h = HUI_POSITIONS.find((h) => h.value === props.fingering.huiPosition);
  return h?.label || `${props.fingering.huiPosition}徽`;
});

const itemStyle = computed(() => {
  const left = props.fingering.startTime * props.pixelPerSecond;
  const width = Math.max(props.fingering.duration * props.pixelPerSecond, 40);
  return {
    left: `${left}px`,
    width: `${width}px`,
  };
});

function handleMouseDown(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.resize-handle')) return;
  if ((e.target as HTMLElement).closest('.action-btn')) return;

  isDragging.value = true;
  dragStartX.value = e.clientX;
  initialStartTime.value = props.fingering.startTime;
  emit('select');

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

function handleResizeStart(e: MouseEvent) {
  e.stopPropagation();
  isResizing.value = true;
  dragStartX.value = e.clientX;
  initialDuration.value = props.fingering.duration;

  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeEnd);
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;
  const deltaX = e.clientX - dragStartX.value;
  const deltaTime = deltaX / props.pixelPerSecond;
  let newStartTime = initialStartTime.value + deltaTime;
  newStartTime = Math.max(0, newStartTime);
  emit('startTimeChange', newStartTime);
}

function handleMouseUp() {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
}

function handleResizeMove(e: MouseEvent) {
  if (!isResizing.value) return;
  const deltaX = e.clientX - dragStartX.value;
  const deltaTime = deltaX / props.pixelPerSecond;
  let newDuration = initialDuration.value + deltaTime;
  newDuration = Math.max(props.minDuration, newDuration);
  emit('durationChange', newDuration);
}

function handleResizeEnd() {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
}

function handleDelete(e: MouseEvent) {
  e.stopPropagation();
  deleteFingering(props.fingering.id);
}

function handlePreview(e: MouseEvent) {
  e.stopPropagation();
  playSingleFingering(props.fingering);
}

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
});
</script>

<template>
  <div
    class="timeline-item absolute top-2 bottom-2 rounded-lg cursor-pointer transition-all duration-150 select-none group"
    :class="[
      isSelected ? 'ring-2 ring-amber-500 ring-offset-1 z-10' : '',
      hasConflict ? 'bg-red-100 border-red-400 border-2' : 'bg-amber-50 border border-amber-300 hover:border-amber-400',
      isDragging ? 'opacity-80 scale-[1.02]' : '',
    ]"
    :style="itemStyle"
    @mousedown="handleMouseDown"
  >
    <div class="h-full p-2 flex flex-col justify-between overflow-hidden">
      <div class="flex items-start justify-between gap-1">
        <span
          class="text-sm font-semibold text-stone-800 truncate"
          :class="{ 'text-red-700': hasConflict }"
        >
          {{ fingering.character }}
        </span>
        <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            class="action-btn p-1 rounded hover:bg-white/60 text-stone-500 hover:text-stone-700"
            @click="handlePreview"
            title="试听"
          >
            <Volume2 class="w-3.5 h-3.5" />
          </button>
          <button
            class="action-btn p-1 rounded hover:bg-red-100 text-stone-500 hover:text-red-600"
            @click="handleDelete"
            title="删除"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div class="flex items-end justify-between text-xs text-stone-600">
        <div class="space-y-0.5">
          <div class="flex items-center gap-1">
            <span class="text-stone-400">弦:</span>
            <span class="font-medium">{{ stringLabel }}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-stone-400">徽:</span>
            <span class="font-medium">{{ huiLabel }}</span>
          </div>
        </div>
        <div class="text-right space-y-0.5">
          <div class="flex items-center gap-1 justify-end">
            <span class="text-stone-400">右:</span>
            <span class="font-medium text-amber-700">{{ rightHandLabel }}</span>
          </div>
          <div class="flex items-center gap-1 justify-end">
            <span class="text-stone-400">左:</span>
            <span class="font-medium text-emerald-700">{{ leftHandLabel }}</span>
          </div>
        </div>
      </div>

      <div class="text-xs text-stone-500 flex justify-between items-center">
        <span>{{ fingering.startTime.toFixed(1) }}s</span>
        <span class="font-medium">{{ fingering.duration.toFixed(1) }}s</span>
      </div>
    </div>

    <div
      class="resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center hover:bg-amber-200/50 rounded-r-lg"
      @mousedown="handleResizeStart"
    >
      <GripVertical class="w-3 h-3 text-stone-400" />
    </div>

    <div
      v-if="hasConflict"
      class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse"
    >
      !
    </div>
  </div>
</template>
