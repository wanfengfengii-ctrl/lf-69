<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMaterialStore } from '@/composables/useMaterialStore';
import { useFingeringStore } from '@/composables/useFingeringStore';
import type {
  MaterialFingering,
  MaterialMode,
  MaterialTechniqueCategory,
  MaterialScene,
  DifficultyTag,
  RightHandTechnique,
  LeftHandTechnique,
  PracticeGoal,
  PracticeSequenceItem,
  MaterialCategoryUsageStats,
} from '@/types/fingering';
import {
  MATERIAL_MODES,
  MATERIAL_TECHNIQUE_CATEGORIES,
  MATERIAL_SCENES,
  DIFFICULTY_TAGS,
  RIGHT_HAND_TECHNIQUES,
  LEFT_HAND_TECHNIQUES,
  PRACTICE_GOALS,
} from '@/types/fingering';
import {
  Plus,
  Search,
  Star,
  StarOff,
  Copy,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  X,
  BookmarkPlus,
  BarChart3,
  Lightbulb,
  Filter,
  Package,
  Target,
  ListOrdered,
  TrendingUp,
} from 'lucide-vue-next';

const {
  filteredMaterials,
  materialFilter,
  categoryStats,
  categoryUsageStats,
  topUsedMaterials,
  addMaterial,
  deleteMaterial,
  renameMaterial,
  copyMaterial,
  toggleFavorite,
  recordUsage,
  setMaterialFilter,
  clearMaterialFilter,
  recommendMaterials,
  recommendPracticeSequence,
  searchMaterials,
  getModeLabel,
  getTechniqueCategoryLabel,
  getSceneLabel,
  getDifficultyLabel,
  getGoalLabel,
} = useMaterialStore();

const { addFingering, totalDuration, practiceConfig, sortedFingerings } = useFingeringStore();

const showAddForm = ref(false);
const showRecommendations = ref(false);
const expandedSections = ref<string[]>(['library', 'stats']);

const newName = ref('');
const newMode = ref<MaterialMode>('F_zhengdiao');
const newTechniqueCategory = ref<MaterialTechniqueCategory>('right_hand_pluck');
const newDifficulty = ref<DifficultyTag>('easy');
const newScene = ref<MaterialScene>('opening');
const newFingerings = ref<MaterialFingering[]>([
  { character: '', stringIndex: 5, huiPosition: 7, rightHand: 'tao', leftHand: 'none', duration: 1 },
]);
const formErrors = ref<string[]>([]);

const editingId = ref<string | null>(null);
const editName = ref('');

const filterKeyword = ref('');
const filterMode = ref<MaterialMode | null>(null);
const filterTechniqueCategory = ref<MaterialTechniqueCategory | null>(null);
const filterDifficulty = ref<DifficultyTag | null>(null);
const filterScene = ref<MaterialScene | null>(null);
const filterFavorite = ref<boolean | null>(null);

const practiceGoal = ref<PracticeGoal | null>(null);
const showSequence = ref(false);

const recommendations = computed(() => {
  const currentBpm = practiceConfig.value.bpm;
  const currentTechniques: RightHandTechnique[] = sortedFingerings.value.length > 0
    ? [...new Set(sortedFingerings.value.map((f) => f.rightHand))]
    : [];
  const currentDifficulty = sortedFingerings.value.length > 0
    ? sortedFingerings.value[sortedFingerings.value.length - 1].difficulty
    : undefined;
  const currentMode = sortedFingerings.value.length > 0
    ? undefined
    : undefined;
  return recommendMaterials(currentBpm, currentTechniques, currentDifficulty, currentMode, practiceGoal.value, 5);
});

const practiceSequence = computed(() => {
  const currentBpm = practiceConfig.value.bpm;
  const currentTechniques: RightHandTechnique[] = sortedFingerings.value.length > 0
    ? [...new Set(sortedFingerings.value.map((f) => f.rightHand))]
    : [];
  const currentDifficulty = sortedFingerings.value.length > 0
    ? sortedFingerings.value[sortedFingerings.value.length - 1].difficulty
    : undefined;
  return recommendPracticeSequence(currentBpm, currentTechniques, currentDifficulty, undefined, practiceGoal.value, 5);
});

const searchResults = computed(() => {
  if (!filterKeyword.value.trim()) return [];
  return searchMaterials(filterKeyword.value, 10);
});

const filterIsActive = computed(() => {
  return (
    filterKeyword.value.trim() !== '' ||
    filterMode.value !== null ||
    filterTechniqueCategory.value !== null ||
    filterDifficulty.value !== null ||
    filterScene.value !== null ||
    filterFavorite.value !== null
  );
});

function toggleSection(key: string) {
  const idx = expandedSections.value.indexOf(key);
  if (idx > -1) {
    expandedSections.value.splice(idx, 1);
  } else {
    expandedSections.value.push(key);
  }
}

function isSectionExpanded(key: string) {
  return expandedSections.value.includes(key);
}

function getGoalDescription(goal: PracticeGoal): string {
  return PRACTICE_GOALS.find((g) => g.value === goal)?.description || '';
}

function addFingeringRow() {
  newFingerings.value.push({
    character: '',
    stringIndex: 5,
    huiPosition: 7,
    rightHand: 'tao',
    leftHand: 'none',
    duration: 1,
  });
}

function removeFingeringRow(index: number) {
  if (newFingerings.value.length > 1) {
    newFingerings.value.splice(index, 1);
  }
}

function handleAdd() {
  formErrors.value = [];
  const result = addMaterial({
    name: newName.value,
    fingerings: newFingerings.value,
    mode: newMode.value,
    techniqueCategory: newTechniqueCategory.value,
    difficulty: newDifficulty.value,
    scene: newScene.value,
  });

  if (result.success) {
    newName.value = '';
    newFingerings.value = [
      { character: '', stringIndex: 5, huiPosition: 7, rightHand: 'tao', leftHand: 'none', duration: 1 },
    ];
    formErrors.value = [];
    showAddForm.value = false;
  } else {
    formErrors.value = result.errors || [];
  }
}

function handleRename(id: string) {
  const result = renameMaterial(id, editName.value);
  if (result.success) {
    editingId.value = null;
    editName.value = '';
  }
}

function handleStartRename(id: string, currentName: string) {
  editingId.value = id;
  editName.value = currentName;
}

function handleCopy(id: string) {
  copyMaterial(id);
}

function handleDelete(id: string) {
  if (confirm('确定要删除此素材吗？删除后相关推荐与统计将同步更新。')) {
    deleteMaterial(id);
  }
}

function handleToggleFavorite(id: string) {
  toggleFavorite(id);
}

function handleInsert(materialId: string) {
  const { getMaterialById } = useMaterialStore();
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
}

function applyFilter() {
  setMaterialFilter({
    keyword: filterKeyword.value,
    mode: filterMode.value,
    techniqueCategory: filterTechniqueCategory.value,
    difficulty: filterDifficulty.value,
    scene: filterScene.value,
    isFavorite: filterFavorite.value,
  });
}

function clearFilter() {
  filterKeyword.value = '';
  filterMode.value = null;
  filterTechniqueCategory.value = null;
  filterDifficulty.value = null;
  filterScene.value = null;
  filterFavorite.value = null;
  clearMaterialFilter();
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

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <div class="material-library-panel space-y-4">
    <div class="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div class="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-stone-800 flex items-center gap-2">
          <span class="w-1 h-5 bg-purple-600 rounded-full"></span>
          指法素材库
        </h3>
        <div class="flex items-center gap-2">
          <button
            @click="showRecommendations = !showRecommendations"
            class="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium flex items-center gap-1.5 border border-purple-200"
          >
            <Lightbulb class="w-4 h-4" />
            推荐
          </button>
          <button
            @click="showAddForm = !showAddForm"
            class="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-1.5"
          >
            <Plus class="w-4 h-4" />
            新建素材
          </button>
        </div>
      </div>

      <div v-if="showRecommendations" class="p-4 border-b border-stone-200 bg-purple-50 space-y-3">
        <h4 class="text-sm font-semibold text-purple-800 flex items-center gap-1.5">
          <Lightbulb class="w-4 h-4 text-purple-600" />
          智能推荐（基于当前 BPM: {{ practiceConfig.bpm }}<span v-if="practiceGoal"> · {{ getGoalLabel(practiceGoal) }}</span>）
        </h4>

        <div>
          <label class="block text-xs font-medium text-purple-700 mb-1">练习目标</label>
          <select
            v-model="practiceGoal"
            class="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 bg-white text-sm"
          >
            <option :value="null">不限目标</option>
            <option v-for="g in PRACTICE_GOALS" :key="g.value" :value="g.value">{{ g.label }}</option>
          </select>
          <div v-if="practiceGoal" class="text-xs text-purple-500 mt-1">{{ getGoalDescription(practiceGoal) }}</div>
        </div>

        <div class="flex gap-2">
          <button
            @click="showSequence = false"
            class="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
            :class="!showSequence ? 'bg-purple-600 text-white' : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-100'"
          >
            <Target class="w-3.5 h-3.5" />
            推荐素材
          </button>
          <button
            @click="showSequence = true"
            class="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
            :class="showSequence ? 'bg-purple-600 text-white' : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-100'"
          >
            <ListOrdered class="w-3.5 h-3.5" />
            推荐练习顺序
          </button>
        </div>

        <div v-if="!showSequence">
          <div v-if="recommendations.length === 0" class="text-sm text-purple-500 py-2">
            暂无推荐，请先添加素材到素材库
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="rec in recommendations"
              :key="rec.material.id"
              class="p-3 bg-white rounded-lg border border-purple-200 flex items-center justify-between"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-medium text-stone-800">{{ rec.material.name }}</span>
                  <span class="px-1.5 py-0.5 text-xs rounded-full" :class="getDifficultyColor(rec.material.difficulty)">
                    {{ getDifficultyLabel(rec.material.difficulty) }}
                  </span>
                </div>
                <div class="text-xs text-purple-600">{{ rec.reason }}</div>
                <div class="text-xs text-stone-400 mt-0.5">
                  {{ rec.material.fingerings.length }}个指法 · 匹配度 {{ rec.score }}分
                </div>
              </div>
              <button
                @click="handleInsert(rec.material.id)"
                class="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-1"
              >
                <BookmarkPlus class="w-3.5 h-3.5" />
                插入
              </button>
            </div>
          </div>
        </div>

        <div v-else>
          <div v-if="practiceSequence.length === 0" class="text-sm text-purple-500 py-2">
            暂无推荐顺序，请先添加素材到素材库
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="item in practiceSequence"
              :key="item.material.id"
              class="p-3 bg-white rounded-lg border border-purple-200 flex items-center justify-between"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="w-5 h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center font-medium">{{ item.order }}</span>
                  <span class="text-sm font-medium text-stone-800">{{ item.material.name }}</span>
                  <span class="px-1.5 py-0.5 text-xs rounded-full" :class="getDifficultyColor(item.material.difficulty)">
                    {{ getDifficultyLabel(item.material.difficulty) }}
                  </span>
                </div>
                <div class="text-xs text-purple-600">{{ item.reason }}</div>
                <div class="text-xs text-stone-400 mt-0.5">
                  预计时长 {{ item.estimatedDuration }}拍 · {{ item.material.fingerings.length }}个指法
                </div>
              </div>
              <button
                @click="handleInsert(item.material.id)"
                class="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-1"
              >
                <BookmarkPlus class="w-3.5 h-3.5" />
                插入
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showAddForm" class="p-4 border-b border-stone-200 bg-purple-50 space-y-3">
        <h4 class="text-sm font-semibold text-purple-800 flex items-center gap-1.5">
          <Plus class="w-4 h-4 text-purple-600" />
          新建素材
        </h4>

        <div v-if="formErrors.length > 0" class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <ul class="text-sm text-red-600 space-y-1">
            <li v-for="(err, idx) in formErrors" :key="idx" class="flex items-start gap-2">
              <span class="text-red-500 mt-0.5">!</span>
              {{ err }}
            </li>
          </ul>
        </div>

        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1">素材名称 <span class="text-red-500">*</span></label>
          <input
            v-model="newName"
            type="text"
            placeholder="输入素材名称"
            class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 text-sm"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">调式</label>
            <select
              v-model="newMode"
              class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 bg-white text-sm"
            >
              <option v-for="m in MATERIAL_MODES" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">技法类型</label>
            <select
              v-model="newTechniqueCategory"
              class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 bg-white text-sm"
            >
              <option v-for="c in MATERIAL_TECHNIQUE_CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">难度</label>
            <select
              v-model="newDifficulty"
              class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 bg-white text-sm"
            >
              <option v-for="d in DIFFICULTY_TAGS" :key="d.value" :value="d.value">{{ d.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">适用场景</label>
            <select
              v-model="newScene"
              class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 bg-white text-sm"
            >
              <option v-for="s in MATERIAL_SCENES" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
        </div>

        <div class="border-t border-stone-200 pt-3">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-medium text-stone-700">指法列表 <span class="text-red-500">*</span></label>
            <button
              @click="addFingeringRow"
              class="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 transition-colors flex items-center gap-1"
            >
              <Plus class="w-3 h-3" />
              添加指法
            </button>
          </div>
          <div class="space-y-2">
            <div
              v-for="(f, idx) in newFingerings"
              :key="idx"
              class="p-2 bg-white rounded-lg border border-stone-200 space-y-2"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-stone-600">指法 {{ idx + 1 }}</span>
                <button
                  v-if="newFingerings.length > 1"
                  @click="removeFingeringRow(idx)"
                  class="p-1 rounded hover:bg-red-100 text-stone-400 hover:text-red-600 transition-colors"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <input
                  v-model="f.character"
                  type="text"
                  placeholder="谱字"
                  class="px-2 py-1.5 border border-stone-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800"
                />
                <select
                  v-model.number="f.stringIndex"
                  class="px-2 py-1.5 border border-stone-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 bg-white"
                >
                  <option v-for="i in 7" :key="i" :value="i">{{ ['一','二','三','四','五','六','七'][i-1] }}弦</option>
                </select>
                <select
                  v-model.number="f.huiPosition"
                  class="px-2 py-1.5 border border-stone-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 bg-white"
                >
                  <option v-for="hui in [0.5,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9,9.5,10,10.5,11,11.5,12,12.5,13]" :key="hui" :value="hui">{{ hui }}徽</option>
                </select>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <select
                  v-model="f.rightHand"
                  class="px-2 py-1.5 border border-stone-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 bg-white"
                >
                  <option v-for="tech in RIGHT_HAND_TECHNIQUES" :key="tech.value" :value="tech.value">{{ tech.label }}</option>
                </select>
                <select
                  v-model="f.leftHand"
                  class="px-2 py-1.5 border border-stone-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 bg-white"
                >
                  <option v-for="tech in LEFT_HAND_TECHNIQUES" :key="tech.value" :value="tech.value">{{ tech.label }}</option>
                </select>
                <input
                  v-model.number="f.duration"
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="时长"
                  class="px-2 py-1.5 border border-stone-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            @click="showAddForm = false"
            class="flex-1 px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors text-sm"
          >
            取消
          </button>
          <button
            @click="handleAdd"
            class="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            保存素材
          </button>
        </div>
      </div>

      <div
        class="p-4 border-b border-stone-200 cursor-pointer"
        @click="toggleSection('filter')"
      >
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold text-stone-800 flex items-center gap-2">
            <Filter class="w-4 h-4 text-purple-600" />
            筛选素材
          </h4>
          <div class="flex items-center gap-2">
            <span v-if="filterIsActive" class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
              筛选中
            </span>
            <ChevronUp v-if="isSectionExpanded('filter')" class="w-4 h-4 text-stone-500" />
            <ChevronDown v-else class="w-4 h-4 text-stone-500" />
          </div>
        </div>
      </div>

      <div v-if="isSectionExpanded('filter')" class="p-4 border-b border-stone-200 bg-stone-50 space-y-3">
        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1">关键词搜索</label>
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              v-model="filterKeyword"
              type="text"
              placeholder="搜索素材名称或谱字..."
              class="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 text-sm"
              @input="applyFilter"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">调式</label>
            <select
              v-model="filterMode"
              class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 bg-white text-sm"
              @change="applyFilter"
            >
              <option :value="null">全部调式</option>
              <option v-for="m in MATERIAL_MODES" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">技法类型</label>
            <select
              v-model="filterTechniqueCategory"
              class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 bg-white text-sm"
              @change="applyFilter"
            >
              <option :value="null">全部技法</option>
              <option v-for="c in MATERIAL_TECHNIQUE_CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">难度</label>
            <select
              v-model="filterDifficulty"
              class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 bg-white text-sm"
              @change="applyFilter"
            >
              <option :value="null">全部难度</option>
              <option v-for="d in DIFFICULTY_TAGS" :key="d.value" :value="d.value">{{ d.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">适用场景</label>
            <select
              v-model="filterScene"
              class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-stone-800 bg-white text-sm"
              @change="applyFilter"
            >
              <option :value="null">全部场景</option>
              <option v-for="s in MATERIAL_SCENES" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              :checked="filterFavorite === true"
              @change="filterFavorite = filterFavorite === true ? null : true; applyFilter()"
              class="rounded border-stone-300 text-purple-600 focus:ring-purple-500"
            />
            仅显示收藏
          </label>
        </div>

        <div class="flex gap-2">
          <button
            @click="applyFilter"
            class="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            应用筛选
          </button>
          <button
            v-if="filterIsActive"
            @click="clearFilter"
            class="px-3 py-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors text-sm flex items-center gap-1"
          >
            <X class="w-3 h-3" />
            清除
          </button>
        </div>
      </div>

      <div
        class="p-4 border-b border-stone-200 bg-stone-50 cursor-pointer"
        @click="toggleSection('stats')"
      >
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold text-stone-800 flex items-center gap-2">
            <BarChart3 class="w-4 h-4 text-purple-600" />
            素材统计
          </h4>
          <ChevronUp v-if="isSectionExpanded('stats')" class="w-4 h-4 text-stone-500" />
          <ChevronDown v-else class="w-4 h-4 text-stone-500" />
        </div>
      </div>

      <div v-if="isSectionExpanded('stats')" class="p-4 border-b border-stone-200 space-y-3">
        <div class="grid grid-cols-4 gap-2 text-xs">
          <div class="text-center p-2 bg-purple-50 rounded-lg">
            <div class="text-lg font-bold text-purple-700">{{ categoryStats.total }}</div>
            <div class="text-purple-600">总素材数</div>
          </div>
          <div class="text-center p-2 bg-amber-50 rounded-lg">
            <div class="text-lg font-bold text-amber-700">{{ categoryStats.favorites }}</div>
            <div class="text-amber-600">收藏数</div>
          </div>
          <div class="text-center p-2 bg-emerald-50 rounded-lg">
            <div class="text-lg font-bold text-emerald-700">{{ Object.keys(categoryStats.byMode).length }}</div>
            <div class="text-emerald-600">调式覆盖</div>
          </div>
          <div class="text-center p-2 bg-blue-50 rounded-lg">
            <div class="text-lg font-bold text-blue-700">{{ categoryUsageStats.totalUsage }}</div>
            <div class="text-blue-600">总使用次数</div>
          </div>
        </div>

        <div v-if="topUsedMaterials.length > 0" class="mt-2">
          <div class="text-xs font-medium text-stone-700 mb-1.5">高频使用素材 TOP5</div>
          <div class="space-y-1">
            <div
              v-for="m in topUsedMaterials.slice(0, 5)"
              :key="m.id"
              class="flex items-center justify-between py-1 px-2 bg-stone-50 rounded text-xs"
            >
              <span class="text-stone-700 truncate flex-1">{{ m.name }}</span>
              <span class="text-purple-600 font-medium ml-2">{{ m.usageCount }}次</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div class="font-medium text-stone-700 mb-1">按技法类型</div>
            <div class="space-y-0.5">
              <div v-for="(count, key) in categoryStats.byTechniqueCategory" :key="key" class="flex justify-between text-stone-600">
                <span>{{ getTechniqueCategoryLabel(key as MaterialTechniqueCategory) }}</span>
                <span class="font-medium">{{ count }}</span>
              </div>
              <div v-if="Object.keys(categoryStats.byTechniqueCategory).length === 0" class="text-stone-400">暂无数据</div>
            </div>
          </div>
          <div>
            <div class="font-medium text-stone-700 mb-1">按难度</div>
            <div class="space-y-0.5">
              <div v-for="(count, key) in categoryStats.byDifficulty" :key="key" class="flex justify-between text-stone-600">
                <span>{{ getDifficultyLabel(key as DifficultyTag) }}</span>
                <span class="font-medium">{{ count }}</span>
              </div>
              <div v-if="Object.keys(categoryStats.byDifficulty).length === 0" class="text-stone-400">暂无数据</div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div class="font-medium text-stone-700 mb-1">按适用场景</div>
            <div class="space-y-0.5">
              <div v-for="(count, key) in categoryStats.byScene" :key="key" class="flex justify-between text-stone-600">
                <span>{{ getSceneLabel(key as MaterialScene) }}</span>
                <span class="font-medium">{{ count }}</span>
              </div>
              <div v-if="Object.keys(categoryStats.byScene).length === 0" class="text-stone-400">暂无数据</div>
            </div>
          </div>
          <div>
            <div class="font-medium text-stone-700 mb-1">按调式</div>
            <div class="space-y-0.5">
              <div v-for="(count, key) in categoryStats.byMode" :key="key" class="flex justify-between text-stone-600">
                <span>{{ getModeLabel(key as MaterialMode) }}</span>
                <span class="font-medium">{{ count }}</span>
              </div>
              <div v-if="Object.keys(categoryStats.byMode).length === 0" class="text-stone-400">暂无数据</div>
            </div>
          </div>
        </div>

        <div>
          <div class="text-xs font-medium text-stone-700 mb-1.5 flex items-center gap-1.5">
            <TrendingUp class="w-3.5 h-3.5 text-purple-600" />
            使用频次统计
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div class="font-medium text-stone-600 mb-1">按技法类型</div>
              <div class="space-y-0.5">
                <div v-for="(count, key) in categoryUsageStats.byTechniqueCategory" :key="key" class="flex justify-between text-stone-600">
                  <span>{{ getTechniqueCategoryLabel(key as MaterialTechniqueCategory) }}</span>
                  <span class="font-medium">{{ count }}次</span>
                </div>
                <div v-if="Object.keys(categoryUsageStats.byTechniqueCategory).length === 0" class="text-stone-400">暂无数据</div>
              </div>
            </div>
            <div>
              <div class="font-medium text-stone-600 mb-1">按适用场景</div>
              <div class="space-y-0.5">
                <div v-for="(count, key) in categoryUsageStats.byScene" :key="key" class="flex justify-between text-stone-600">
                  <span>{{ getSceneLabel(key as MaterialScene) }}</span>
                  <span class="font-medium">{{ count }}次</span>
                </div>
                <div v-if="Object.keys(categoryUsageStats.byScene).length === 0" class="text-stone-400">暂无数据</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="p-4 border-b border-stone-200 bg-stone-50 cursor-pointer"
        @click="toggleSection('library')"
      >
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold text-stone-800 flex items-center gap-2">
            <Package class="w-4 h-4 text-purple-600" />
            素材列表（{{ filteredMaterials.length }}）
          </h4>
          <ChevronUp v-if="isSectionExpanded('library')" class="w-4 h-4 text-stone-500" />
          <ChevronDown v-else class="w-4 h-4 text-stone-500" />
        </div>
      </div>

      <div v-if="isSectionExpanded('library')" class="p-4">
        <div v-if="filteredMaterials.length === 0" class="text-center py-8 text-stone-400 text-sm">
          <Package class="w-8 h-8 mx-auto mb-2 text-stone-300" />
          暂无素材，点击"新建素材"添加
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="m in filteredMaterials"
            :key="m.id"
            class="p-3 bg-gradient-to-r from-stone-50 to-purple-50 rounded-lg border border-stone-200 hover:border-purple-300 transition-all"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1 min-w-0">
                <div v-if="editingId === m.id" class="flex items-center gap-2 mb-1">
                  <input
                    v-model="editName"
                    type="text"
                    class="flex-1 px-2 py-1 border border-purple-300 rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none text-stone-800"
                    @keyup.enter="handleRename(m.id)"
                    @keyup.escape="editingId = null"
                  />
                  <button
                    @click="handleRename(m.id)"
                    class="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                  >
                    保存
                  </button>
                  <button
                    @click="editingId = null"
                    class="px-2 py-1 bg-stone-100 text-stone-600 text-xs rounded hover:bg-stone-200"
                  >
                    取消
                  </button>
                </div>
                <div v-else class="flex items-center gap-2 mb-1 flex-wrap">
                  <span class="text-sm font-medium text-stone-800">{{ m.name }}</span>
                  <span class="px-1.5 py-0.5 text-xs rounded-full" :class="getDifficultyColor(m.difficulty)">
                    {{ getDifficultyLabel(m.difficulty) }}
                  </span>
                  <span class="px-1.5 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                    {{ getModeLabel(m.mode) }}
                  </span>
                  <span class="px-1.5 py-0.5 text-xs rounded-full bg-stone-100 text-stone-600">
                    {{ getTechniqueCategoryLabel(m.techniqueCategory) }}
                  </span>
                </div>
                <div class="text-xs text-stone-500 flex items-center gap-2 flex-wrap">
                  <span>{{ getSceneLabel(m.scene) }}</span>
                  <span>·</span>
                  <span>{{ m.fingerings.length }}个指法</span>
                  <span>·</span>
                  <span>使用{{ m.usageCount }}次</span>
                  <span v-if="m.lastUsedAt">· {{ formatDateTime(m.lastUsedAt) }}</span>
                </div>
              </div>
              <div class="flex items-center gap-1 ml-2">
                <button
                  @click="handleToggleFavorite(m.id)"
                  class="p-1.5 rounded hover:bg-amber-100 transition-colors"
                  :class="m.isFavorite ? 'text-amber-500' : 'text-stone-400 hover:text-amber-500'"
                  :title="m.isFavorite ? '取消收藏' : '收藏'"
                >
                  <Star v-if="m.isFavorite" class="w-4 h-4 fill-amber-400" />
                  <StarOff v-else class="w-4 h-4" />
                </button>
                <button
                  @click="handleInsert(m.id)"
                  class="p-1.5 rounded hover:bg-purple-100 text-stone-500 hover:text-purple-600 transition-colors"
                  title="插入到谱面"
                >
                  <BookmarkPlus class="w-4 h-4" />
                </button>
                <button
                  @click="handleStartRename(m.id, m.name)"
                  class="p-1.5 rounded hover:bg-stone-200 text-stone-500 hover:text-stone-700 transition-colors"
                  title="重命名"
                >
                  <Edit3 class="w-3.5 h-3.5" />
                </button>
                <button
                  @click="handleCopy(m.id)"
                  class="p-1.5 rounded hover:bg-stone-200 text-stone-500 hover:text-stone-700 transition-colors"
                  title="复制"
                >
                  <Copy class="w-3.5 h-3.5" />
                </button>
                <button
                  @click="handleDelete(m.id)"
                  class="p-1.5 rounded hover:bg-red-100 text-stone-500 hover:text-red-600 transition-colors"
                  title="删除"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="(f, idx) in m.fingerings"
                :key="idx"
                class="px-1.5 py-0.5 bg-white text-stone-700 text-xs rounded border border-stone-200"
              >
                {{ f.character || '—' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
