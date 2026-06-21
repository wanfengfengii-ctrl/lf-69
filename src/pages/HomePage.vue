<script setup lang="ts">
import { onMounted, ref } from 'vue';
import FingeringForm from '@/components/FingeringForm.vue';
import TimelineEditor from '@/components/TimelineEditor.vue';
import StatsPanel from '@/components/StatsPanel.vue';
import FingeringList from '@/components/FingeringList.vue';
import PracticePanel from '@/components/PracticePanel.vue';
import VersionManager from '@/components/VersionManager.vue';
import PracticeTrackerPanel from '@/components/PracticeTrackerPanel.vue';
import AnnotationPanel from '@/components/AnnotationPanel.vue';
import ReviewPanel from '@/components/ReviewPanel.vue';
import MaterialLibraryPanel from '@/components/MaterialLibraryPanel.vue';
import { useFingeringStore } from '@/composables/useFingeringStore';
import { Music2, Sparkles, Clock3, Sliders, MessageCircle, ClipboardList, Package } from 'lucide-vue-next';

const { loadSampleData, fingerings } = useFingeringStore();

type TabKey = 'editor' | 'tracker' | 'collab' | 'materials';
const activeTab = ref<TabKey>('editor');

onMounted(() => {
  if (fingerings.value.length === 0) {
    loadSampleData();
  }
});

function handleFingeringAdded() {}
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
          <div class="flex bg-stone-100 rounded-lg p-1 mr-2">
            <button
              @click="activeTab = 'editor'"
              class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5"
              :class="
                activeTab === 'editor'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-stone-600 hover:text-stone-800'
              "
            >
              <Sliders class="w-4 h-4" />
              谱面编辑
            </button>
            <button
              @click="activeTab = 'tracker'"
              class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5"
              :class="
                activeTab === 'tracker'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-stone-600 hover:text-stone-800'
              "
            >
              <Clock3 class="w-4 h-4" />
              练习评估
            </button>
            <button
              @click="activeTab = 'collab'"
              class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5"
              :class="
                activeTab === 'collab'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-stone-600 hover:text-stone-800'
              "
            >
              <MessageCircle class="w-4 h-4" />
              协作批注
            </button>
            <button
              @click="activeTab = 'materials'"
              class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5"
              :class="
                activeTab === 'materials'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-stone-600 hover:text-stone-800'
              "
            >
              <Package class="w-4 h-4" />
              素材库
            </button>
          </div>
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
      <template v-if="activeTab === 'editor'">
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
      </template>

      <template v-else-if="activeTab === 'tracker'">
        <div class="grid grid-cols-12 gap-6">
          <aside class="col-span-12 lg:col-span-4 space-y-6">
            <PracticeTrackerPanel />
          </aside>
          <section class="col-span-12 lg:col-span-8 space-y-6">
            <PracticePanel />
            <StatsPanel />
          </section>
        </div>
      </template>

      <template v-else-if="activeTab === 'collab'">
        <div class="grid grid-cols-12 gap-6">
          <aside class="col-span-12 lg:col-span-4 space-y-6">
            <AnnotationPanel />
          </aside>
          <section class="col-span-12 lg:col-span-8 space-y-6">
            <ReviewPanel />
            <TimelineEditor />
          </section>
        </div>
      </template>

      <template v-else-if="activeTab === 'materials'">
        <div class="grid grid-cols-12 gap-6">
          <aside class="col-span-12 lg:col-span-5 space-y-6">
            <MaterialLibraryPanel />
          </aside>
          <section class="col-span-12 lg:col-span-7 space-y-6">
            <TimelineEditor />
            <FingeringList />
          </section>
        </div>
      </template>
    </main>

    <footer class="mt-12 py-6 border-t border-stone-200 bg-white/50">
      <div class="max-w-7xl mx-auto px-6 text-center text-sm text-stone-500">
        <p>古琴减字谱指法时间轴编辑器 · 传统与现代的交融</p>
      </div>
    </footer>
  </div>
</template>
