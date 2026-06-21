<script setup lang="ts">
import { computed } from 'vue';
import { useFingeringStore } from '@/composables/useFingeringStore';
import { useConflictDetector } from '@/composables/useConflictDetector';
import {
  RIGHT_HAND_TECHNIQUES,
  LEFT_HAND_TECHNIQUES,
  STRING_LABELS,
  HUI_POSITIONS,
  DIFFICULTY_TAGS,
} from '@/types/fingering';
import type { DifficultyTag } from '@/types/fingering';
import { Trash2, Volume2, AlertTriangle, StickyNote } from 'lucide-vue-next';
import { useAudioPlayer } from '@/composables/useAudioPlayer';

const { sortedFingerings, selectedId, selectFingering, deleteFingering } = useFingeringStore();
const { isFingeringInConflict, getConflictsForFingering } = useConflictDetector(sortedFingerings);
const { playSingleFingering } = useAudioPlayer();

const difficultyOptions = DIFFICULTY_TAGS;

function getRightHandLabel(value: string) {
  return RIGHT_HAND_TECHNIQUES.find((t) => t.value === value)?.label || value;
}

function getLeftHandLabel(value: string) {
  return LEFT_HAND_TECHNIQUES.find((t) => t.value === value)?.label || value;
}

function getStringLabel(index: number) {
  return STRING_LABELS[index - 1] || '';
}

function getHuiLabel(pos: number) {
  return HUI_POSITIONS.find((h) => h.value === pos)?.label || `${pos}徽`;
}

function getDifficultyColor(difficulty?: DifficultyTag): string {
  if (!difficulty) return '';
  const diff = difficultyOptions.find((d) => d.value === difficulty);
  switch (diff?.color) {
    case 'emerald':
      return 'bg-emerald-500';
    case 'amber':
      return 'bg-amber-500';
    case 'orange':
      return 'bg-orange-500';
    case 'red':
      return 'bg-red-500';
    default:
      return 'bg-stone-400';
  }
}

function getDifficultyLabel(difficulty?: DifficultyTag): string {
  if (!difficulty) return '';
  return difficultyOptions.find((d) => d.value === difficulty)?.label || '';
}

function handlePlay(fing: typeof sortedFingerings.value[0]) {
  playSingleFingering(fing);
}

function handleDelete(id: string) {
  deleteFingering(id);
}
</script>

<template>
  <div class="fingering-list bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
    <div class="p-4 border-b border-stone-200 bg-stone-50">
      <h3 class="text-lg font-semibold text-stone-800 flex items-center gap-2">
        <span class="w-1 h-5 bg-amber-600 rounded-full"></span>
        指法列表
        <span class="text-sm font-normal text-stone-500">({{ sortedFingerings.length }})</span>
      </h3>
    </div>

    <div class="max-h-80 overflow-y-auto">
      <div v-if="sortedFingerings.length === 0" class="p-8 text-center text-stone-400">
        暂无指法，请在左侧录入
      </div>

      <div v-else class="divide-y divide-stone-100">
        <div
          v-for="(fing, index) in sortedFingerings"
          :key="fing.id"
          class="p-3 hover:bg-stone-50 cursor-pointer transition-colors"
          :class="{ 'bg-amber-50': selectedId === fing.id }"
          @click="selectFingering(fing.id)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-3 flex-1 min-w-0">
              <div class="flex flex-col items-center">
                <span class="text-xs text-stone-400">{{ index + 1 }}</span>
                <div class="flex flex-col items-center gap-1 mt-1">
                  <div
                    v-if="isFingeringInConflict(fing.id)"
                    :title="getConflictsForFingering(fing.id).map(c => c.description).join('\n')"
                  >
                    <AlertTriangle class="w-4 h-4 text-red-500" />
                  </div>
                  <span
                    v-if="fing.difficulty"
                    class="w-2 h-2 rounded-full"
                    :class="getDifficultyColor(fing.difficulty)"
                    :title="`难度: ${getDifficultyLabel(fing.difficulty)}`"
                  ></span>
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-stone-800 truncate">
                    {{ fing.character }}
                  </span>
                  <span
                    v-if="fing.difficulty"
                    class="text-xs px-1.5 py-0.5 rounded-full"
                    :class="{
                      'bg-emerald-100 text-emerald-700': fing.difficulty === 'easy',
                      'bg-amber-100 text-amber-700': fing.difficulty === 'medium',
                      'bg-orange-100 text-orange-700': fing.difficulty === 'hard',
                      'bg-red-100 text-red-700': fing.difficulty === 'expert',
                    }"
                  >
                    {{ getDifficultyLabel(fing.difficulty) }}
                  </span>
                  <StickyNote
                    v-if="fing.note"
                    class="w-3.5 h-3.5 text-amber-500 shrink-0"
                    :title="fing.note"
                  />
                </div>
                <div class="text-xs text-stone-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span>{{ getStringLabel(fing.stringIndex) }}</span>
                  <span>{{ getHuiLabel(fing.huiPosition) }}</span>
                  <span class="text-amber-600">右:{{ getRightHandLabel(fing.rightHand) }}</span>
                  <span v-if="fing.leftHand !== 'none'" class="text-emerald-600">
                    左:{{ getLeftHandLabel(fing.leftHand) }}
                  </span>
                </div>
                <div class="text-xs text-stone-400 mt-1">
                  {{ fing.startTime.toFixed(1) }}s - {{ (fing.startTime + fing.duration).toFixed(1) }}s
                  <span class="text-stone-300 mx-1">|</span>
                  时长 {{ fing.duration.toFixed(1) }}s
                </div>
                <div
                  v-if="fing.note"
                  class="text-xs text-stone-600 mt-1 px-2 py-1 bg-amber-50 rounded border border-amber-100"
                >
                  {{ fing.note }}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <button
                class="p-1.5 rounded hover:bg-stone-200 text-stone-500 hover:text-stone-700 transition-colors"
                @click.stop="handlePlay(fing)"
                title="试听"
              >
                <Volume2 class="w-4 h-4" />
              </button>
              <button
                class="p-1.5 rounded hover:bg-red-100 text-stone-500 hover:text-red-600 transition-colors"
                @click.stop="handleDelete(fing.id)"
                title="删除"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
