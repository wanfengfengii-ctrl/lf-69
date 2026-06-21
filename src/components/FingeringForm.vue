<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  RIGHT_HAND_TECHNIQUES,
  LEFT_HAND_TECHNIQUES,
  HUI_POSITIONS,
  DIFFICULTY_TAGS,
  type RightHandTechnique,
  type LeftHandTechnique,
  type Fingering,
  type DifficultyTag,
} from '@/types/fingering';
import { useFingeringStore } from '@/composables/useFingeringStore';
import { useMaterialStore } from '@/composables/useMaterialStore';
import { validateFingering } from '@/utils/validation';
import { Volume2, StickyNote, Tag, Package, Search, BookmarkPlus, X } from 'lucide-vue-next';
import { useAudioPlayer } from '@/composables/useAudioPlayer';

const emit = defineEmits<{
  (e: 'added'): void;
}>();

const { addFingering, totalDuration } = useFingeringStore();
const { playSingleFingering } = useAudioPlayer();
const { searchMaterials, getMaterialById, recordUsage, getDifficultyLabel, getModeLabel } = useMaterialStore();

const character = ref('');
const stringIndex = ref(5);
const huiPosition = ref(7);
const rightHand = ref<RightHandTechnique>('tao');
const leftHand = ref<LeftHandTechnique>('none');
const duration = ref(1);
const note = ref('');
const difficulty = ref<DifficultyTag | ''>('');
const errors = ref<string[]>([]);

const showMaterialSearch = ref(false);
const materialSearchQuery = ref('');

const materialSearchResults = computed(() => {
  if (!materialSearchQuery.value.trim()) return [];
  return searchMaterials(materialSearchQuery.value, 5);
});

function handleInsertMaterial(materialId: string) {
  const material = getMaterialById(materialId);
  if (!material) return;

  let startTime = totalDuration.value;
  for (const f of material.fingerings) {
    const result = addFingering({
      character: f.character,
      stringIndex: f.stringIndex,
      huiPosition: f.huiPosition,
      rightHand: f.rightHand,
      leftHand: f.leftHand,
      duration: f.duration,
      startTime,
      difficulty: f.difficulty,
    });
    if (result.success && result.fingering) {
      startTime = result.fingering.startTime + result.fingering.duration;
    }
  }

  recordUsage(materialId);
  materialSearchQuery.value = '';
  showMaterialSearch.value = false;
  emit('added');
}

function getDifficultyColor(d: DifficultyTag): string {
  switch (d) {
    case 'easy': return 'bg-emerald-100 text-emerald-700';
    case 'medium': return 'bg-amber-100 text-amber-700';
    case 'hard': return 'bg-orange-100 text-orange-700';
    case 'expert': return 'bg-red-100 text-red-700';
    default: return 'bg-stone-100 text-stone-700';
  }
}

const huiOptions = computed(() => HUI_POSITIONS);
const rightHandOptions = computed(() => RIGHT_HAND_TECHNIQUES);
const leftHandOptions = computed(() => LEFT_HAND_TECHNIQUES);
const difficultyOptions = computed(() => DIFFICULTY_TAGS);

const formData = computed(() => ({
  character: character.value,
  stringIndex: stringIndex.value,
  huiPosition: huiPosition.value,
  rightHand: rightHand.value,
  leftHand: leftHand.value,
  duration: duration.value,
  startTime: totalDuration.value,
  note: note.value.trim() || undefined,
  difficulty: difficulty.value || undefined,
}));

function validateForm() {
  const result = validateFingering(formData.value);
  errors.value = result.errors;
  return result.valid;
}

function handleSubmit() {
  if (!validateForm()) return;

  const result = addFingering(formData.value);
  if (result.success) {
    character.value = '';
    note.value = '';
    difficulty.value = '';
    errors.value = [];
    emit('added');
  } else {
    errors.value = result.errors || ['添加失败'];
  }
}

function handlePreview() {
  if (!validateForm()) return;
  playSingleFingering(formData.value as Fingering);
}

watch(formData, () => {
  if (errors.value.length > 0) {
    validateForm();
  }
});
</script>

<template>
  <div class="fingering-form bg-stone-50 rounded-xl p-5 border border-stone-200 shadow-sm">
    <h3 class="text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
      <span class="w-1 h-5 bg-amber-600 rounded-full"></span>
      录入指法
    </h3>

    <div v-if="errors.length > 0" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
      <ul class="text-sm text-red-600 space-y-1">
        <li v-for="(err, idx) in errors" :key="idx" class="flex items-start gap-2">
          <span class="text-red-500 mt-0.5">!</span>
          {{ err }}
        </li>
      </ul>
    </div>

    <div class="space-y-4">
      <div class="border border-amber-200 rounded-lg overflow-hidden">
        <button
          @click="showMaterialSearch = !showMaterialSearch"
          class="w-full px-3 py-2 bg-amber-50 text-amber-700 text-sm font-medium flex items-center justify-between hover:bg-amber-100 transition-colors"
        >
          <span class="flex items-center gap-1.5">
            <Package class="w-4 h-4" />
            从素材库插入
          </span>
          <X v-if="showMaterialSearch" class="w-3.5 h-3.5" />
          <BookmarkPlus v-else class="w-3.5 h-3.5" />
        </button>
        <div v-if="showMaterialSearch" class="p-3 bg-amber-50/50 border-t border-amber-200 space-y-2">
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              v-model="materialSearchQuery"
              type="text"
              placeholder="搜索素材名称或谱字..."
              class="w-full pl-8 pr-3 py-1.5 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-stone-800 text-xs bg-white"
            />
          </div>
          <div v-if="materialSearchQuery.trim() && materialSearchResults.length === 0" class="text-xs text-stone-400 text-center py-2">
            未找到匹配素材
          </div>
          <div v-else-if="materialSearchResults.length > 0" class="space-y-1.5 max-h-48 overflow-y-auto">
            <div
              v-for="m in materialSearchResults"
              :key="m.id"
              class="p-2 bg-white rounded-lg border border-amber-200 flex items-center justify-between hover:border-amber-300 transition-colors"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 mb-0.5">
                  <span class="text-xs font-medium text-stone-800 truncate">{{ m.name }}</span>
                  <span class="px-1 py-0.5 text-xs rounded-full" :class="getDifficultyColor(m.difficulty)">{{ getDifficultyLabel(m.difficulty) }}</span>
                </div>
                <div class="text-xs text-stone-400">
                  {{ m.fingerings.length }}个指法 · {{ getModeLabel(m.mode) }} · 使用{{ m.usageCount }}次
                </div>
              </div>
              <button
                @click="handleInsertMaterial(m.id)"
                class="px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 transition-colors font-medium flex items-center gap-1 ml-2"
              >
                <BookmarkPlus class="w-3 h-3" />
                插入
              </button>
            </div>
          </div>
          <div v-else class="text-xs text-stone-400 text-center py-2">
            输入关键词搜索素材库
          </div>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-stone-700 mb-1.5">谱字 <span class="text-red-500">*</span></label>
        <input
          v-model="character"
          type="text"
          placeholder="例如：散挑七"
          class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-stone-800"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1.5">弦位</label>
          <select
            v-model.number="stringIndex"
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-stone-800 bg-white"
          >
            <option v-for="i in 7" :key="i" :value="i">{{ ['一', '二', '三', '四', '五', '六', '七'][i - 1] }}弦</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1.5">徽位</label>
          <select
            v-model.number="huiPosition"
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-stone-800 bg-white"
          >
            <option v-for="hui in huiOptions" :key="hui.value" :value="hui.value">{{ hui.label }}</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1.5">右手指法</label>
          <select
            v-model="rightHand"
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-stone-800 bg-white"
          >
            <option v-for="tech in rightHandOptions" :key="tech.value" :value="tech.value">{{ tech.label }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1.5">左手技法</label>
          <select
            v-model="leftHand"
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-stone-800 bg-white"
          >
            <option v-for="tech in leftHandOptions" :key="tech.value" :value="tech.value">{{ tech.label }}</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-stone-700 mb-1.5">持续时长 (秒)</label>
        <div class="flex items-center gap-3">
          <input
            v-model.number="duration"
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            class="flex-1 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
          />
          <span class="text-sm font-medium text-stone-700 w-12 text-right">{{ duration.toFixed(1) }}s</span>
        </div>
      </div>

      <div class="border-t border-stone-200 pt-4">
        <h4 class="text-sm font-medium text-stone-700 mb-3 flex items-center gap-1.5">
          <Tag class="w-4 h-4 text-amber-600" />
          练习信息
        </h4>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-stone-600 mb-1.5">难度标签</label>
            <select
              v-model="difficulty"
              class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-stone-800 bg-white text-sm"
            >
              <option value="">未设置</option>
              <option v-for="d in difficultyOptions" :key="d.value" :value="d.value">
                {{ d.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-stone-600 mb-1.5 flex items-center gap-1">
              <StickyNote class="w-3.5 h-3.5" />
              练习备注
            </label>
            <textarea
              v-model="note"
              rows="2"
              placeholder="添加练习备注（可选）..."
              class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-stone-800 text-sm resize-none"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="flex gap-2 pt-2">
        <button
          @click="handlePreview"
          class="flex-1 px-4 py-2.5 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors font-medium text-sm flex items-center justify-center gap-1.5"
        >
          <Volume2 class="w-4 h-4" />
          试听
        </button>
        <button
          @click="handleSubmit"
          class="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
        >
          添加指法
        </button>
      </div>
    </div>
  </div>
</template>
