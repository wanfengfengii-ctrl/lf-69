<script setup lang="ts">
import { ref, computed } from 'vue';
import { useFingeringStore } from '@/composables/useFingeringStore';
import {
  Save,
  FolderOpen,
  Trash2,
  GitCompare,
  Plus,
  X,
  Clock,
  Check,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  Edit3,
} from 'lucide-vue-next';
import type { ScoreVersion, VersionDiff } from '@/types/fingering';

const emit = defineEmits<{
  (e: 'versionLoaded'): void;
}>();

const {
  versions,
  saveVersion,
  loadVersion,
  deleteVersion,
  compareVersions,
  canUndo,
  canRedo,
  undo,
  redo,
  history,
  historyIndex,
} = useFingeringStore();

const showVersionModal = ref(false);
const showDiffModal = ref(false);
const newVersionName = ref('');
const newVersionDesc = ref('');
const compareV1 = ref<string | null>(null);
const compareV2 = ref<string | null>(null);
const currentDiff = ref<VersionDiff | null>(null);

const sortedVersions = computed(() => {
  return [...versions.value].sort((a, b) => b.updatedAt - a.updatedAt);
});

const recentHistory = computed(() => {
  return [...history.value]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
});

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function handleSaveVersion() {
  if (!newVersionName.value.trim()) return;
  saveVersion(newVersionName.value.trim(), newVersionDesc.value.trim() || undefined);
  newVersionName.value = '';
  newVersionDesc.value = '';
}

function handleLoadVersion(versionId: string) {
  const result = loadVersion(versionId);
  if (result.success) {
    emit('versionLoaded');
  }
}

function handleDeleteVersion(versionId: string, e: Event) {
  e.stopPropagation();
  if (confirm('确定要删除这个版本吗？')) {
    deleteVersion(versionId);
  }
}

function handleCompare() {
  if (!compareV1.value || !compareV2.value) return;
  currentDiff.value = compareVersions(compareV1.value, compareV2.value);
  showDiffModal.value = true;
}

function closeDiffModal() {
  showDiffModal.value = false;
  currentDiff.value = null;
  compareV1.value = null;
  compareV2.value = null;
}

function getVersionName(versionId: string): string {
  return versions.value.find((v) => v.id === versionId)?.name || '';
}
</script>

<template>
  <div class="version-manager bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
    <div class="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
      <h3 class="text-lg font-semibold text-stone-800 flex items-center gap-2">
        <span class="w-1 h-5 bg-amber-600 rounded-full"></span>
        版本管理
      </h3>
      <button
        @click="showVersionModal = true"
        class="p-2 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
        title="管理版本"
      >
        <FolderOpen class="w-4 h-4" />
      </button>
    </div>

    <div class="p-4 space-y-4">
      <div class="space-y-2">
        <button
          @click="showVersionModal = true"
          class="w-full px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <Save class="w-4 h-4" />
          保存新版本
        </button>
      </div>

      <div class="border-t border-stone-200 pt-4">
        <h4 class="text-sm font-medium text-stone-700 mb-3 flex items-center gap-2">
          <Clock class="w-4 h-4 text-stone-400" />
          历史记录
        </h4>
        <div v-if="recentHistory.length === 0" class="text-center py-4 text-stone-400 text-sm">
          暂无历史记录
        </div>
        <div v-else class="space-y-1 max-h-40 overflow-y-auto">
          <div
            v-for="(item, idx) in recentHistory"
            :key="idx"
            class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-stone-50 text-xs"
            :class="{ 'bg-amber-50': history.length - 1 - idx === historyIndex }"
          >
            <span class="text-stone-700 truncate">{{ item.description }}</span>
            <span class="text-stone-400 shrink-0 ml-2">{{ formatDate(item.timestamp) }}</span>
          </div>
        </div>
      </div>

      <div class="border-t border-stone-200 pt-4">
        <div class="flex gap-2 mb-3">
          <button
            @click="undo"
            :disabled="!canUndo"
            class="flex-1 px-3 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            撤销
          </button>
          <button
            @click="redo"
            :disabled="!canRedo"
            class="flex-1 px-3 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            重做
          </button>
        </div>

        <div v-if="sortedVersions.length > 0" class="space-y-2">
          <h4 class="text-sm font-medium text-stone-700">已保存版本 ({{ sortedVersions.length }})</h4>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            <div
              v-for="version in sortedVersions"
              :key="version.id"
              class="p-2.5 rounded-lg border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all cursor-pointer group"
              @click="handleLoadVersion(version.id)"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium text-stone-800 truncate">{{ version.name }}</span>
                <button
                  @click.stop="handleDeleteVersion(version.id, $event)"
                  class="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
              <div class="text-xs text-stone-500">
                {{ formatDate(version.updatedAt) }}
                <span v-if="version.description" class="ml-2 text-stone-400">{{ version.description }}</span>
              </div>
              <div class="text-xs text-stone-400 mt-1">
                {{ version.fingerings.length }} 个指法 · {{ version.practiceSections.length }} 个练习段
              </div>
            </div>
          </div>
        </div>

        <div v-if="sortedVersions.length >= 2" class="mt-4 pt-4 border-t border-stone-200">
          <h4 class="text-sm font-medium text-stone-700 mb-3 flex items-center gap-2">
            <GitCompare class="w-4 h-4 text-amber-600" />
            版本对比
          </h4>
          <div class="grid grid-cols-5 gap-2 items-center mb-3">
            <select
              v-model="compareV1"
              class="col-span-2 px-2 py-1.5 border border-stone-300 rounded text-xs text-stone-800 bg-white"
            >
              <option :value="null">选择版本</option>
              <option v-for="v in sortedVersions" :key="v.id" :value="v.id">{{ v.name }}</option>
            </select>
            <ArrowRight class="w-4 h-4 text-stone-400 mx-auto" />
            <select
              v-model="compareV2"
              class="col-span-2 px-2 py-1.5 border border-stone-300 rounded text-xs text-stone-800 bg-white"
            >
              <option :value="null">选择版本</option>
              <option v-for="v in sortedVersions" :key="v.id" :value="v.id">{{ v.name }}</option>
            </select>
          </div>
          <button
            @click="handleCompare"
            :disabled="!compareV1 || !compareV2"
            class="w-full px-3 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            对比版本
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showVersionModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showVersionModal = false"
      >
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-stone-800">保存新版本</h3>
            <button
              @click="showVersionModal = false"
              class="p-1 text-stone-400 hover:text-stone-600 rounded"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1.5">版本名称 <span class="text-red-500">*</span></label>
              <input
                v-model="newVersionName"
                type="text"
                placeholder="例如：初稿、修改版、最终版"
                class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-stone-800"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1.5">版本说明</label>
              <textarea
                v-model="newVersionDesc"
                rows="3"
                placeholder="可选：描述这个版本的主要变化"
                class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-stone-800 resize-none"
              ></textarea>
            </div>
          </div>

          <div class="flex gap-3 justify-end mt-6">
            <button
              @click="showVersionModal = false"
              class="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              @click="handleSaveVersion"
              :disabled="!newVersionName.trim()"
              class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Save class="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showDiffModal && currentDiff"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeDiffModal"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div class="p-4 border-b border-stone-200 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-stone-800">
              版本对比: {{ getVersionName(compareV1!) }} → {{ getVersionName(compareV2!) }}
            </h3>
            <button
              @click="closeDiffModal"
              class="p-1 text-stone-400 hover:text-stone-600 rounded"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="p-4 overflow-y-auto flex-1 space-y-6">
            <div v-if="currentDiff.configChanged" class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 class="text-sm font-medium text-amber-800 mb-2">练习配置变更</h4>
              <div class="text-xs text-amber-700 space-y-1">
                <div v-if="currentDiff.oldConfig?.bpm !== currentDiff.newConfig?.bpm">
                  BPM: {{ currentDiff.oldConfig?.bpm }} → {{ currentDiff.newConfig?.bpm }}
                </div>
                <div v-if="JSON.stringify(currentDiff.oldConfig?.timeSignature) !== JSON.stringify(currentDiff.newConfig?.timeSignature)">
                  节拍: {{ currentDiff.oldConfig?.timeSignature.beats }}/{{ currentDiff.oldConfig?.timeSignature.beatType }}
                  → {{ currentDiff.newConfig?.timeSignature.beats }}/{{ currentDiff.newConfig?.timeSignature.beatType }}
                </div>
              </div>
            </div>

            <div v-if="currentDiff.addedFingerings.length > 0" class="space-y-2">
              <h4 class="text-sm font-medium text-stone-700 flex items-center gap-2">
                <PlusCircle class="w-4 h-4 text-emerald-500" />
                新增指法 ({{ currentDiff.addedFingerings.length }})
              </h4>
              <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1">
                <div v-for="f in currentDiff.addedFingerings" :key="f.id" class="text-sm text-emerald-700">
                  + {{ f.character }}
                </div>
              </div>
            </div>

            <div v-if="currentDiff.removedFingerings.length > 0" class="space-y-2">
              <h4 class="text-sm font-medium text-stone-700 flex items-center gap-2">
                <MinusCircle class="w-4 h-4 text-red-500" />
                删除指法 ({{ currentDiff.removedFingerings.length }})
              </h4>
              <div class="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                <div v-for="f in currentDiff.removedFingerings" :key="f.id" class="text-sm text-red-700">
                  - {{ f.character }}
                </div>
              </div>
            </div>

            <div v-if="currentDiff.modifiedFingerings.length > 0" class="space-y-2">
              <h4 class="text-sm font-medium text-stone-700 flex items-center gap-2">
                <Edit3 class="w-4 h-4 text-amber-500" />
                修改指法 ({{ currentDiff.modifiedFingerings.length }})
              </h4>
              <div class="space-y-2">
                <div
                  v-for="item in currentDiff.modifiedFingerings"
                  :key="item.old.id"
                  class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm"
                >
                  <div class="font-medium text-amber-800 mb-2">{{ item.old.character }}</div>
                  <div class="grid grid-cols-2 gap-3 text-xs">
                    <div class="text-red-600">
                      <div class="font-medium mb-1">修改前</div>
                      <div v-if="item.old.duration !== item.new.duration">
                        时长: {{ item.old.duration.toFixed(1) }}s
                      </div>
                      <div v-if="item.old.startTime !== item.new.startTime">
                        开始: {{ item.old.startTime.toFixed(1) }}s
                      </div>
                      <div v-if="item.old.note !== item.new.note">
                        备注: {{ item.old.note || '(无)' }}
                      </div>
                      <div v-if="item.old.difficulty !== item.new.difficulty">
                        难度: {{ item.old.difficulty || '未设置' }}
                      </div>
                    </div>
                    <div class="text-emerald-600">
                      <div class="font-medium mb-1">修改后</div>
                      <div v-if="item.old.duration !== item.new.duration">
                        时长: {{ item.new.duration.toFixed(1) }}s
                      </div>
                      <div v-if="item.old.startTime !== item.new.startTime">
                        开始: {{ item.new.startTime.toFixed(1) }}s
                      </div>
                      <div v-if="item.old.note !== item.new.note">
                        备注: {{ item.new.note || '(无)' }}
                      </div>
                      <div v-if="item.old.difficulty !== item.new.difficulty">
                        难度: {{ item.new.difficulty || '未设置' }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="currentDiff.addedSections.length > 0" class="space-y-2">
              <h4 class="text-sm font-medium text-stone-700 flex items-center gap-2">
                <PlusCircle class="w-4 h-4 text-emerald-500" />
                新增练习段 ({{ currentDiff.addedSections.length }})
              </h4>
              <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1">
                <div v-for="s in currentDiff.addedSections" :key="s.id" class="text-sm text-emerald-700">
                  + {{ s.name }} ({{ s.fingeringIds.length }}个指法)
                </div>
              </div>
            </div>

            <div v-if="currentDiff.removedSections.length > 0" class="space-y-2">
              <h4 class="text-sm font-medium text-stone-700 flex items-center gap-2">
                <MinusCircle class="w-4 h-4 text-red-500" />
                删除练习段 ({{ currentDiff.removedSections.length }})
              </h4>
              <div class="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                <div v-for="s in currentDiff.removedSections" :key="s.id" class="text-sm text-red-700">
                  - {{ s.name }}
                </div>
              </div>
            </div>

            <div v-if="currentDiff.modifiedSections.length > 0" class="space-y-2">
              <h4 class="text-sm font-medium text-stone-700 flex items-center gap-2">
                <Edit3 class="w-4 h-4 text-amber-500" />
                修改练习段 ({{ currentDiff.modifiedSections.length }})
              </h4>
              <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <div v-for="item in currentDiff.modifiedSections" :key="item.old.id" class="text-sm">
                  <span class="text-amber-700">{{ item.old.name }}</span>
                  <span v-if="item.old.loop !== item.new.loop" class="text-amber-600 ml-2">
                    (循环: {{ item.old.loop }} → {{ item.new.loop }})
                  </span>
                  <span v-if="item.old.tempoMultiplier !== item.new.tempoMultiplier" class="text-amber-600 ml-2">
                    (速度: {{ item.old.tempoMultiplier }}x → {{ item.new.tempoMultiplier }}x)
                  </span>
                </div>
              </div>
            </div>

            <div
              v-if="currentDiff.addedFingerings.length === 0 &&
                currentDiff.removedFingerings.length === 0 &&
                currentDiff.modifiedFingerings.length === 0 &&
                currentDiff.addedSections.length === 0 &&
                currentDiff.removedSections.length === 0 &&
                currentDiff.modifiedSections.length === 0 &&
                !currentDiff.configChanged"
              class="text-center py-8 text-stone-400"
            >
              <Check class="w-12 h-12 mx-auto mb-2 text-emerald-400" />
              <p>两个版本完全相同</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
