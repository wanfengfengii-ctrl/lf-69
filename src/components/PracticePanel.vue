<script setup lang="ts">
import { ref, computed } from 'vue';
import { useFingeringStore } from '@/composables/useFingeringStore';
import { useAudioPlayer } from '@/composables/useAudioPlayer';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Gauge,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Music,
} from 'lucide-vue-next';
import type { PracticeSection, DifficultyTag } from '@/types/fingering';
import { DIFFICULTY_TAGS, TIME_SIGNATURES } from '@/types/fingering';

const emit = defineEmits<{
  (e: 'playSection', section: PracticeSection): void;
}>();

const {
  practiceConfig,
  practiceSections,
  sortedFingerings,
  selectedId,
  setBPM,
  setTimeSignature,
  setTimeAxisMode,
  addPracticeSection,
  updatePracticeSection,
  deletePracticeSection,
  addFingeringToSection,
  removeFingeringFromSection,
  canUndo,
  canRedo,
  undo,
  redo,
} = useFingeringStore();

const {
  isPlaying,
  play,
  pause,
  stop,
  tempoMultiplier,
  setTempoMultiplier,
  activeSection,
  currentLoop,
  loopCount,
  setActiveSection,
  playSection,
} = useAudioPlayer();

const newSectionName = ref('');
const newSectionLoop = ref(false);
const newSectionLoopCount = ref(2);
const newSectionTempo = ref(1);
const showAddSection = ref(false);
const editingSectionId = ref<string | null>(null);
const editSectionName = ref('');

const bpmInput = ref(practiceConfig.value.bpm);
const tempoInput = ref(tempoMultiplier.value);

const selectedForSection = ref<string[]>([]);

const timeSignatureOptions = TIME_SIGNATURES;
const difficultyOptions = DIFFICULTY_TAGS;

const currentTimeSignatureLabel = computed(() => {
  const sig = practiceConfig.value.timeSignature;
  return `${sig.beats}/${sig.beatType}`;
});

function handleBpmChange() {
  setBPM(bpmInput.value);
}

function handleTempoChange() {
  setTempoMultiplier(tempoInput.value);
}

function handleTimeSignatureChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  const [beats, beatType] = value.split('/').map(Number);
  setTimeSignature(beats, beatType);
}

function handleModeChange(mode: 'seconds' | 'beats') {
  setTimeAxisMode(mode);
}

function toggleFingeringForSection(id: string) {
  const idx = selectedForSection.value.indexOf(id);
  if (idx > -1) {
    selectedForSection.value.splice(idx, 1);
  } else {
    selectedForSection.value.push(id);
  }
}

function handleAddSection() {
  if (!newSectionName.value.trim()) return;
  if (selectedForSection.value.length === 0) {
    selectedForSection.value = sortedFingerings.value
      .filter((f) => (selectedId.value ? f.id === selectedId.value : true))
      .map((f) => f.id);
  }
  addPracticeSection(
    newSectionName.value.trim(),
    selectedForSection.value,
    newSectionLoop.value,
    newSectionLoopCount.value,
    newSectionTempo.value,
  );
  newSectionName.value = '';
  newSectionLoop.value = false;
  newSectionLoopCount.value = 2;
  newSectionTempo.value = 1;
  selectedForSection.value = [];
  showAddSection.value = false;
}

function handlePlaySection(section: PracticeSection) {
  playSection(section, sortedFingerings.value);
}

function handleStopSection() {
  setActiveSection(null);
  stop();
}

function startEditSection(section: PracticeSection) {
  editingSectionId.value = section.id;
  editSectionName.value = section.name;
}

function saveEditSection(section: PracticeSection) {
  updatePracticeSection(section.id, { name: editSectionName.value.trim() });
  editingSectionId.value = null;
}

function cancelEditSection() {
  editingSectionId.value = null;
}

function toggleSectionLoop(section: PracticeSection) {
  updatePracticeSection(section.id, { loop: !section.loop });
}

function updateSectionLoopCount(section: PracticeSection, count: number) {
  updatePracticeSection(section.id, { loopCount: count });
}

function updateSectionTempo(section: PracticeSection, tempo: number) {
  updatePracticeSection(section.id, { tempoMultiplier: tempo });
}

function getDifficultyColor(difficulty?: DifficultyTag) {
  if (!difficulty) return 'bg-stone-200';
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

function getDifficultyLabel(difficulty?: DifficultyTag) {
  if (!difficulty) return '';
  return difficultyOptions.find((d) => d.value === difficulty)?.label || '';
}
</script>

<template>
  <div class="practice-panel bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
    <div class="p-4 border-b border-stone-200 bg-stone-50">
      <h3 class="text-lg font-semibold text-stone-800 flex items-center gap-2">
        <span class="w-1 h-5 bg-amber-600 rounded-full"></span>
        练习模式
      </h3>
    </div>

    <div class="p-4 space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-stone-50 rounded-lg p-3 border border-stone-200">
          <div class="text-2xl font-bold text-stone-800">{{ practiceConfig.bpm }}</div>
          <div class="text-xs text-stone-500">BPM</div>
        </div>
        <div class="bg-stone-50 rounded-lg p-3 border border-stone-200">
          <div class="text-2xl font-bold text-stone-800">
            {{ practiceConfig.timeSignature.beats }}/{{ practiceConfig.timeSignature.beatType }}
          </div>
          <div class="text-xs text-stone-500">节拍</div>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-stone-700 mb-1.5">BPM (速度</label>
        <div class="flex items-center gap-2">
          <input
            v-model.number="bpmInput"
            type="range"
            min="20"
            max="300"
            step="5"
            class="flex-1 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            @change="handleBpmChange"
          />
          <span class="text-sm font-medium text-stone-700 w-12 text-right">{{ bpmInput }}</span>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-stone-700 mb-1.5">节拍</label>
        <select
          :value="currentTimeSignatureLabel"
          class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-stone-800 bg-white"
          @change="handleTimeSignatureChange"
        >
          <option v-for="sig in timeSignatureOptions" :key="sig.label" :value="sig.label">
            {{ sig.label }}
          </option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-stone-700 mb-1.5">时间轴模式</label>
        <div class="flex bg-stone-100 rounded-lg p-1">
          <button
            @click="handleModeChange('seconds')"
            class="flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            :class="practiceConfig.timeAxisMode === 'seconds'
              ? 'bg-white text-amber-700 shadow-sm'
              : 'text-stone-600 hover:text-stone-800'"
          >
            按秒
          </button>
          <button
            @click="handleModeChange('beats')"
            class="flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            :class="practiceConfig.timeAxisMode === 'beats'
              ? 'bg-white text-amber-700 shadow-sm'
              : 'text-stone-600 hover:text-stone-800'"
          >
            按拍
          </button>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-stone-700 mb-1.5">播放速度</label>
        <div class="flex items-center gap-2">
          <Gauge class="w-4 h-4 text-stone-400" />
          <input
            v-model.number="tempoInput"
            type="range"
            min="0.25"
            max="2"
            step="0.05"
            class="flex-1 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            @change="handleTempoChange"
          />
          <span class="text-sm font-medium text-stone-700 w-12 text-right">{{ tempoInput.toFixed(2) }}x</span>
        </div>
      </div>

      <div class="flex gap-2">
        <button
          @click="undo"
          :disabled="!canUndo"
          class="flex-1 px-3 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          撤销
        </button>
        <button
          @click="redo"
          :disabled="!canRedo"
          class="flex-1 px-3 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          重做
        </button>
      </div>

      <div class="border-t border-stone-200 pt-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-semibold text-stone-700 flex items-center gap-2">
            <Music class="w-4 h-4 text-amber-600" />
            练习段
          </h4>
          <button
            @click="showAddSection = !showAddSection"
            class="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
          >
            <Plus class="w-4 h-4" />
          </button>
        </div>

        <div v-if="showAddSection" class="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">练习段名称</label>
            <input
              v-model="newSectionName"
              type="text"
              placeholder="例如：开场段落"
              class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-stone-800 text-sm"
            />
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-medium text-stone-700">选择指法</label>
            <div class="max-h-32 overflow-y-auto space-y-1 bg-white rounded-lg border border-stone-200 p-2">
              <div
                v-for="f in sortedFingerings"
                :key="f.id"
                class="flex items-center gap-2 p-1.5 rounded hover:bg-stone-50 cursor-pointer text-xs"
                :class="{ 'bg-amber-100': selectedForSection.includes(f.id) }"
                @click="toggleFingeringForSection(f.id)"
              >
                <input
                type="checkbox"
                :checked="selectedForSection.includes(f.id)"
                class="w-3.5 h-3.5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <span class="text-stone-700 truncate">{{ f.character }}</span>
                <span v-if="f.difficulty" :class="['text-xs px-1.5 py-0.5 rounded-full', getDifficultyColor(f.difficulty)]">
                  {{ getDifficultyLabel(f.difficulty) }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input
              v-model="newSectionLoop"
              type="checkbox"
              id="sectionLoop"
              class="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
            />
            <label for="sectionLoop" class="text-xs text-stone-700">循环播放</label>
          </div>

          <div v-if="newSectionLoop" class="flex items-center gap-2">
            <label class="text-xs text-stone-600">循环次数:</label>
            <input
              v-model.number="newSectionLoopCount"
              type="number"
              min="1"
              max="99"
              class="w-16 px-2 py-1 border border-stone-300 rounded text-sm text-stone-800"
            />
          </div>

          <div class="flex items-center gap-2">
            <label class="text-xs text-stone-600">速度:</label>
            <input
              v-model.number="newSectionTempo"
              type="range"
              min="0.25"
              max="2"
              step="0.05"
              class="flex-1 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <span class="text-xs font-medium text-stone-600 w-10 text-right">{{ newSectionTempo.toFixed(2) }}x</span>
          </div>

          <div class="flex gap-2">
            <button
              @click="showAddSection = false"
              class="flex-1 px-3 py-2 text-stone-600 hover:bg-stone-200 rounded-lg transition-colors text-sm"
            >
              取消
            </button>
            <button
              @click="handleAddSection"
              :disabled="!newSectionName.trim()"
              class="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              创建
            </button>
          </div>
        </div>

        <div v-if="practiceSections.length === 0" class="text-center py-6 text-stone-400 text-sm">
          暂无练习段，点击 + 添加
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="section in practiceSections"
            :key="section.id"
            class="p-3 rounded-lg border transition-all"
            :class="[
              activeSection?.id === section.id
                ? 'border-amber-400 bg-amber-50'
                : 'border-stone-200 bg-white hover:border-stone-300',
            ]"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <div v-if="editingSectionId === section.id" class="flex items-center gap-1 flex-1">
                  <input
                    v-model="editSectionName"
                    type="text"
                    class="flex-1 px-2 py-1 border border-stone-300 rounded text-sm text-stone-800"
                    @keyup.enter="saveEditSection(section)"
                  />
                  <button @click="saveEditSection(section)" class="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                    <Check class="w-3.5 h-3.5" />
                  </button>
                  <button @click="cancelEditSection" class="p-1 text-stone-500 hover:bg-stone-100 rounded">
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>
                <div v-else class="flex items-center gap-2 flex-1 min-w-0">
                  <span class="font-medium text-stone-800 truncate">{{ section.name }}</span>
                  <button
                    @click.stop="startEditSection(section)"
                    class="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit3 class="w-3 h-3" />
                  </button>
                </div>
              </div>
              <button
                @click.stop="deletePracticeSection(section.id)"
                class="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>

            <div class="text-xs text-stone-500 mb-2">
              {{ section.fingeringIds.length }} 个指法
              <span v-if="section.note" class="ml-2 text-stone-400">{{ section.note }}</span>
            </div>

            <div class="flex items-center gap-3 text-xs">
              <button
                @click="toggleSectionLoop(section)"
                class="flex items-center gap-1 px-2 py-1 rounded transition-colors"
                :class="section.loop ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'"
              >
                <Repeat class="w-3 h-3" />
                {{ section.loop ? '循环' : '单次' }}
              </button>

              <div v-if="section.loop" class="flex items-center gap-1">
                <span class="text-stone-500">x{{ section.loopCount }}</span>
              </div>

              <span class="text-stone-500">{{ section.tempoMultiplier.toFixed(2) }}x</span>
            </div>

            <div class="flex items-center gap-2 mt-3">
              <button
                v-if="activeSection?.id !== section.id"
                @click="handlePlaySection(section)"
                class="flex-1 px-2 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors text-xs font-medium flex items-center justify-center gap-1"
              >
                <Play class="w-3 h-3" />
                播放
              </button>
              <template v-else>
                <button
                  v-if="isPlaying"
                  @click="pause"
                  class="flex-1 px-2 py-1.5 bg-stone-600 text-white rounded hover:bg-stone-700 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                >
                  <Pause class="w-3 h-3" />
                  暂停
                </button>
                <button
                  v-else
                  @click="play"
                  class="flex-1 px-2 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                >
                  <Play class="w-3 h-3" />
                  播放
                </button>
                <button
                  @click="handleStopSection"
                  class="px-2 py-1.5 bg-stone-100 text-stone-700 rounded hover:bg-stone-200 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                >
                  <Square class="w-3 h-3" />
                  停止
                </button>
              </template>
            </div>

            <div v-if="activeSection?.id === section.id && loopCount > 0" class="mt-2 text-xs text-center text-amber-600">
              循环: {{ currentLoop + 1 }} / {{ loopCount }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
