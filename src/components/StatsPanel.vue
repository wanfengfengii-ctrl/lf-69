<script setup lang="ts">
import { computed } from 'vue';
import { useFingeringStore } from '@/composables/useFingeringStore';
import {
  RIGHT_HAND_TECHNIQUES,
  LEFT_HAND_TECHNIQUES,
} from '@/types/fingering';
import { BarChart3, Hand, HandMetal } from 'lucide-vue-next';

const { stats, totalDuration } = useFingeringStore();

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
</script>

<template>
  <div class="stats-panel bg-stone-50 rounded-xl p-5 border border-stone-200 shadow-sm">
    <h3 class="text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
      <span class="w-1 h-5 bg-amber-600 rounded-full"></span>
      指法统计
    </h3>

    <div class="space-y-5">
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-white rounded-lg p-3 border border-stone-200">
          <div class="text-2xl font-bold text-stone-800">{{ stats.total }}</div>
          <div class="text-xs text-stone-500">指法总数</div>
        </div>
        <div class="bg-white rounded-lg p-3 border border-stone-200">
          <div class="text-2xl font-bold text-stone-800">{{ totalDuration.toFixed(1) }}s</div>
          <div class="text-xs text-stone-500">总时长</div>
        </div>
      </div>

      <div>
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

      <div>
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
  </div>
</template>
