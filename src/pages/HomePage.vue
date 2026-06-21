<script setup lang="ts">
import { onMounted } from 'vue';
import FingeringForm from '@/components/FingeringForm.vue';
import TimelineEditor from '@/components/TimelineEditor.vue';
import StatsPanel from '@/components/StatsPanel.vue';
import FingeringList from '@/components/FingeringList.vue';
import PracticePanel from '@/components/PracticePanel.vue';
import VersionManager from '@/components/VersionManager.vue';
import { useFingeringStore } from '@/composables/useFingeringStore';
import { Music2, Sparkles } from 'lucide-vue-next';

const { loadSampleData, fingerings } = useFingeringStore();

onMounted(() => {
  if (fingerings.value.length === 0) {
    loadSampleData();
  }
});

function handleFingeringAdded() {
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100">
    <header class="bg-white/80 backdrop-blur-sm border-b border-stone-200 sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center shadow-md">
            <Music2 class="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-stone-800">古琴减字谱时间轴</h1>
            <p class="text-xs text-stone-500">Guqin Tablature Timeline Editor</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <VersionManager />
          <button
            @click="loadSampleData"
            class="px-4 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-2"
          >
            <Sparkles class="w-4 h-4" />
            加载示例
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-6">
      <div class="grid grid-cols-12 gap-6">
        <aside class="col-span-12 lg:col-span-3 space-y-6">
          <FingeringForm @added="handleFingeringAdded" />
          <PracticePanel />
        </aside>

        <section class="col-span-12 lg:col-span-6 space-y-6">
          <TimelineEditor />
          <FingeringList />
        </section>

        <aside class="col-span-12 lg:col-span-3">
          <StatsPanel />
        </aside>
      </div>
    </main>

    <footer class="mt-12 py-6 border-t border-stone-200 bg-white/50">
      <div class="max-w-7xl mx-auto px-6 text-center text-sm text-stone-500">
        <p>古琴减字谱指法时间轴编辑器 · 传统与现代的交融</p>
      </div>
    </footer>
  </div>
</template>
