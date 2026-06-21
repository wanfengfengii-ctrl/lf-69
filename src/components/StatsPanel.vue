<script setup lang="ts">
import { computed } from 'vue';
import { useFingeringStore } from '@/composables/useFingeringStore';
import {
  RIGHT_HAND_TECHNIQUES,
  LEFT_HAND_TECHNIQUES,
  DIFFICULTY_TAGS,
} from '@/types/fingering';
import type { DifficultyTag } from '@/types/fingering';
import { BarChart3, Hand, HandMetal, TrendingUp, AlertTriangle, Target } from 'lucide-vue-next';

const { stats, totalDuration, totalBeats, practiceConfig } = useFingeringStore();

const rightHandStats = computed(() => {
  return RIGHT_HAND_TECHNIQUES.map((tech) => ({
    ...tech,
    count: stats.value.rightHand[tech.value] || 0,
  })).filter((item) => item.count > 0);
});

const leftHandStats = computed(() => {
  return LEFT_HAND_TECHNIQUES.filter((t) => t.value !== 'none').map((tech) => ({
    ...tech,
    count: stats.value.leftHand[tech.value] || 0,
  })).filter((item) => item.count > 0);
});

const maxRightCount = computed(() => {
  if (rightHandStats.value.length === 0) return 1;
  return Math.max(...rightHandStats.value.map((s) => s.count), 1);
});

const maxLeftCount = computed(() => {
  if (leftHandStats.value.length === 0) return 1;
  return Math.max(...leftHandStats.value.map((s) => s.count), 1);
});

const highFreqStats = computed(() => stats.value.highFrequencyTechniques);
const difficultSections = computed(() => stats.value.difficultSections);
const difficultyDist = computed(() => stats.value.difficultyDistribution);

const maxFreqCount = computed(() => {
  if (highFreqStats.value.length === 0) return 1;
  return Math.max(...highFreqStats.value.map((s) => s.count), 1);
});

const difficultyOptions = DIFFICULTY_TAGS;

function getDifficultyColor(difficulty: DifficultyTag): string {
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

function getDifficultyBgColor(difficulty: DifficultyTag): string {
  const diff = difficultyOptions.find((d) => d.value === difficulty);
  switch (diff?.color) {
    case 'emerald':
      return 'bg-emerald-100 text-emerald-700';
    case 'amber':
      return 'bg-amber-100 text-amber-700';
    case 'orange':
      return 'bg-orange-100 text-orange-700';
    case 'red':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-stone-100 text-stone-700';
  }
}

function getDifficultyLabel(difficulty: DifficultyTag): string {
  return difficultyOptions.find((d) => d.value === difficulty)?.label || '';
}
</script>

<template>
  <div class="stats-panel bg-stone-50 rounded-xl p-5 border border-stone-200 shadow-sm space-y-5">
    <div>
      <h3 class="text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
        <span class="w-1 h-5 bg-amber-600 rounded-full"></span>
        指法统计
      </h3>

      <div class="grid grid-cols-2 gap-3">
        <div class="bg-white rounded-lg p-3 border border-stone-200">
          <div class="text-2xl font-bold text-stone-800">{{ stats.total }}</div>
          <div class="text-xs text-stone-500">指法总数</div>
        </div>
        <div class="bg-white rounded-lg p-3 border border-stone-200">
          <div class="text-2xl font-bold text-stone-800">{{ totalDuration.toFixed(1) }}s</div>
          <div class="text-xs text-stone-500">总时长</div>
        </div>
        <div class="bg-white rounded-lg p-3 border border-stone-200">
          <div class="text-2xl font-bold text-stone-800">{{ totalBeats.toFixed(1) }}</div>
          <div class="text-xs text-stone-500">总拍数</div>
        </div>
        <div class="bg-white rounded-lg p-3 border border-stone-200">
          <div class="text-2xl font-bold text-stone-800">{{ practiceConfig.bpm }}</div>
          <div class="text-xs text-stone-500">BPM</div>
        </div>
      </div>
    </div>

    <div class="border-t border-stone-200 pt-5">
      <div class="flex items-center gap-2 mb-2">
        <TrendingUp class="w-4 h-4 text-amber-600" />
        <span class="text-sm font-medium text-stone-700">高频技法</span>
        <span class="text-xs text-stone-400">({{ highFreqStats.length }} 种)</span>
      </div>

      <div v-if="highFreqStats.length > 0" class="space-y-1.5">
        <div
          v-for="item in highFreqStats"
          :key="item.technique + item.type"
          class="flex items-center gap-2"
        >
          <span
            class="text-xs w-10 shrink-0"
            :class="item.type === 'right' ? 'text-amber-700' : 'text-emerald-700'"
          >
            {{ item.label }}
          </span>
          <div class="flex-1 h-5 bg-stone-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="item.type === 'right' ? 'bg-amber-400' : 'bg-emerald-400'"
              :style="{ width: `${(item.count / maxFreqCount) * 100}%` }"
            ></div>
          </div>
          <span class="text-xs font-medium text-stone-600 w-6 text-right">{{ item.count }}</span>
        </div>
      </div>
      <div v-else class="text-sm text-stone-400 text-center py-4">
        暂无数据
      </div>
    </div>

    <div class="border-t border-stone-200 pt-5">
      <div class="flex items-center gap-2 mb-2">
        <Target class="w-4 h-4 text-red-500" />
        <span class="text-sm font-medium text-stone-700">高难段落</span>
        <span class="text-xs text-stone-400">({{ difficultSections.length }} 处)</span>
      </div>

      <div v-if="difficultSections.length > 0" class="space-y-2">
        <div
          v-for="(section, idx) in difficultSections"
          :key="idx"
          class="p-2 rounded-lg border text-xs"
          :class="getDifficultyBgColor(section.difficulty)"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="font-medium">难点段落 {{ idx + 1 }}</span>
            <span class="px-1.5 py-0.5 rounded-full text-xs" :class="getDifficultyBgColor(section.difficulty)">
              {{ getDifficultyLabel(section.difficulty) }}
            </span>
          </div>
          <div class="text-stone-600">
            {{ section.startTime.toFixed(1) }}s - {{ section.endTime.toFixed(1) }}s
            <span class="text-stone-400"> · {{ section.fingeringCount }} 个指法</span>
          </div>
        </div>
      </div>
      <div v-else class="text-sm text-stone-400 text-center py-4">
        暂无高难段落
      </div>
    </div>

    <div class="border-t border-stone-200 pt-5">
      <div class="flex items-center gap-2 mb-3">
        <AlertTriangle class="w-4 h-4 text-orange-500" />
        <span class="text-sm font-medium text-stone-700">难度分布</span>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="diff in difficultyOptions"
          :key="diff.value"
          class="bg-white rounded-lg p-2 border border-stone-200 text-center"
        >
          <div class="w-3 h-3 rounded-full mx-auto mb-1" :class="getDifficultyColor(diff.value)"></div>
          <div class="text-lg font-bold text-stone-800">{{ difficultyDist[diff.value] }}</div>
          <div class="text-xs text-stone-500">{{ diff.label }}</div>
        </div>
      </div>
    </div>

    <div class="border-t border-stone-200 pt-5">
      <div class="flex items-center gap-2 mb-2">
        <Hand class="w-4 h-4 text-amber-600" />
        <span class="text-sm font-medium text-stone-700">右手指法</span>
        <span class="text-xs text-stone-400">({{ rightHandStats.length }} 种)</span>
      </div>

      <div v-if="rightHandStats.length > 0" class="space-y-1.5">
        <div
          v-for="item in rightHandStats"
          :key="item.value"
          class="flex items-center gap-2"
        >
          <span class="text-xs text-stone-600 w-10 shrink-0">{{ item.label }}</span>
          <div class="flex-1 h-5 bg-stone-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-amber-400 rounded-full transition-all duration-300"
              :style="{ width: `${(item.count / maxRightCount) * 100}%` }"
            ></div>
          </div>
          <span class="text-xs font-medium text-stone-600 w-6 text-right">{{ item.count }}</span>
        </div>
      </div>
      <div v-else class="text-sm text-stone-400 text-center py-4">
        暂无数据
      </div>
    </div>

    <div class="border-t border-stone-200 pt-5">
      <div class="flex items-center gap-2 mb-2">
        <HandMetal class="w-4 h-4 text-emerald-600" />
        <span class="text-sm font-medium text-stone-700">左手技法</span>
        <span class="text-xs text-stone-400">({{ leftHandStats.length }} 种)</span>
      </div>

      <div v-if="leftHandStats.length > 0" class="space-y-1.5">
        <div
          v-for="item in leftHandStats"
          :key="item.value"
          class="flex items-center gap-2"
        >
          <span class="text-xs text-stone-600 w-10 shrink-0">{{ item.label }}</span>
          <div class="flex-1 h-5 bg-stone-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-400 rounded-full transition-all duration-300"
              :style="{ width: `${(item.count / maxLeftCount) * 100}%` }"
            ></div>
          </div>
          <span class="text-xs font-medium text-stone-600 w-6 text-right">{{ item.count }}</span>
        </div>
      </div>
      <div v-else class="text-sm text-stone-400 text-center py-4">
        暂无数据
      </div>
    </div>
  </div>
</template>
