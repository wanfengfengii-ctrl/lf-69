import { ref, computed, watch } from 'vue';
import type {
  Material,
  MaterialFingering,
  MaterialFilter,
  MaterialCategoryStats,
  MaterialCategoryUsageStats,
  MaterialRecommendation,
  MaterialMode,
  MaterialTechniqueCategory,
  MaterialScene,
  DifficultyTag,
  RightHandTechnique,
  LeftHandTechnique,
  PracticeGoal,
  PracticeSequenceItem,
} from '@/types/fingering';
import {
  MATERIAL_MODES,
  MATERIAL_TECHNIQUE_CATEGORIES,
  MATERIAL_SCENES,
  DIFFICULTY_TAGS,
  PRACTICE_GOALS,
} from '@/types/fingering';
import { generateId } from '@/utils/validation';

const STORAGE_KEY = 'guqin-materials';

const materials = ref<Material[]>([]);

const materialFilter = ref<MaterialFilter>({
  keyword: '',
  mode: null,
  techniqueCategory: null,
  difficulty: null,
  scene: null,
  isFavorite: null,
});

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      materials.value = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load materials:', e);
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(materials.value));
  } catch (e) {
    console.error('Failed to save materials:', e);
  }
}

loadFromStorage();

watch(materials, saveToStorage, { deep: true });

export function useMaterialStore() {
  const filteredMaterials = computed(() => {
    let result = [...materials.value];
    const f = materialFilter.value;

    if (f.keyword.trim()) {
      const kw = f.keyword.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(kw) ||
          m.fingerings.some((fg) => fg.character.toLowerCase().includes(kw)),
      );
    }

    if (f.mode) {
      result = result.filter((m) => m.mode === f.mode);
    }

    if (f.techniqueCategory) {
      result = result.filter((m) => m.techniqueCategory === f.techniqueCategory);
    }

    if (f.difficulty) {
      result = result.filter((m) => m.difficulty === f.difficulty);
    }

    if (f.scene) {
      result = result.filter((m) => m.scene === f.scene);
    }

    if (f.isFavorite !== null) {
      result = result.filter((m) => m.isFavorite === f.isFavorite);
    }

    return result.sort((a, b) => b.updatedAt - a.updatedAt);
  });

  const categoryStats = computed<MaterialCategoryStats>(() => {
    const byMode: Partial<Record<MaterialMode, number>> = {};
    const byTechniqueCategory: Partial<Record<MaterialTechniqueCategory, number>> = {};
    const byDifficulty: Partial<Record<DifficultyTag, number>> = {};
    const byScene: Partial<Record<MaterialScene, number>> = {};
    let favorites = 0;

    for (const m of materials.value) {
      byMode[m.mode] = (byMode[m.mode] || 0) + 1;
      byTechniqueCategory[m.techniqueCategory] = (byTechniqueCategory[m.techniqueCategory] || 0) + 1;
      byDifficulty[m.difficulty] = (byDifficulty[m.difficulty] || 0) + 1;
      byScene[m.scene] = (byScene[m.scene] || 0) + 1;
      if (m.isFavorite) favorites++;
    }

    return {
      byMode,
      byTechniqueCategory,
      byDifficulty,
      byScene,
      total: materials.value.length,
      favorites,
    };
  });

  const categoryUsageStats = computed<MaterialCategoryUsageStats>(() => {
    const byMode: Partial<Record<MaterialMode, number>> = {};
    const byTechniqueCategory: Partial<Record<MaterialTechniqueCategory, number>> = {};
    const byDifficulty: Partial<Record<DifficultyTag, number>> = {};
    const byScene: Partial<Record<MaterialScene, number>> = {};
    let totalUsage = 0;

    for (const m of materials.value) {
      byMode[m.mode] = (byMode[m.mode] || 0) + m.usageCount;
      byTechniqueCategory[m.techniqueCategory] = (byTechniqueCategory[m.techniqueCategory] || 0) + m.usageCount;
      byDifficulty[m.difficulty] = (byDifficulty[m.difficulty] || 0) + m.usageCount;
      byScene[m.scene] = (byScene[m.scene] || 0) + m.usageCount;
      totalUsage += m.usageCount;
    }

    return {
      byMode,
      byTechniqueCategory,
      byDifficulty,
      byScene,
      totalUsage,
    };
  });

  const usageStats = computed(() => {
    const stats: Record<string, number> = {};
    for (const m of materials.value) {
      stats[m.id] = m.usageCount;
    }
    return stats;
  });

  const topUsedMaterials = computed(() => {
    return [...materials.value]
      .filter((m) => m.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);
  });

  function validateMaterialFingering(f: MaterialFingering): string[] {
    const errors: string[] = [];
    if (!f.character || f.character.trim() === '') {
      errors.push('谱字不能为空');
    }
    if (f.stringIndex < 1 || f.stringIndex > 7) {
      errors.push('弦位必须在 1-7 之间');
    }
    if (f.huiPosition < 0.5 || f.huiPosition > 13) {
      errors.push('徽位范围不合法');
    }
    if (f.duration <= 0) {
      errors.push('持续时长必须大于 0');
    }
    return errors;
  }

  function addMaterial(
    data: Omit<Material, 'id' | 'isFavorite' | 'usageCount' | 'lastUsedAt' | 'createdAt' | 'updatedAt'>,
  ): { success: boolean; errors?: string[]; material?: Material } {
    const errors: string[] = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('素材名称不能为空');
    }

    if (!data.fingerings || data.fingerings.length === 0) {
      errors.push('素材至少包含一个有效指法');
    } else {
      for (let i = 0; i < data.fingerings.length; i++) {
        const fErrors = validateMaterialFingering(data.fingerings[i]);
        for (const e of fErrors) {
          errors.push(`指法${i + 1}: ${e}`);
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const now = Date.now();
    const material: Material = {
      ...data,
      id: generateId(),
      name: data.name.trim(),
      isFavorite: false,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    materials.value.push(material);
    return { success: true, material };
  }

  function updateMaterial(id: string, updates: Partial<Pick<Material, 'name' | 'fingerings' | 'mode' | 'techniqueCategory' | 'difficulty' | 'scene'>>): { success: boolean; errors?: string[] } {
    const index = materials.value.findIndex((m) => m.id === id);
    if (index === -1) {
      return { success: false, errors: ['素材不存在'] };
    }

    if (updates.name !== undefined && updates.name.trim() === '') {
      return { success: false, errors: ['素材名称不能为空'] };
    }

    if (updates.fingerings !== undefined) {
      if (updates.fingerings.length === 0) {
        return { success: false, errors: ['素材至少包含一个有效指法'] };
      }
      for (let i = 0; i < updates.fingerings.length; i++) {
        const fErrors = validateMaterialFingering(updates.fingerings[i]);
        if (fErrors.length > 0) {
          return { success: false, errors: [`指法${i + 1}: ${fErrors[0]}`] };
        }
      }
    }

    materials.value[index] = {
      ...materials.value[index],
      ...updates,
      updatedAt: Date.now(),
    };

    return { success: true };
  }

  function deleteMaterial(id: string) {
    const index = materials.value.findIndex((m) => m.id === id);
    if (index > -1) {
      materials.value.splice(index, 1);
    }
  }

  function renameMaterial(id: string, newName: string): { success: boolean; errors?: string[] } {
    if (!newName || newName.trim() === '') {
      return { success: false, errors: ['素材名称不能为空'] };
    }
    return updateMaterial(id, { name: newName.trim() });
  }

  function copyMaterial(id: string): { success: boolean; material?: Material; errors?: string[] } {
    const source = materials.value.find((m) => m.id === id);
    if (!source) {
      return { success: false, errors: ['素材不存在'] };
    }

    const now = Date.now();
    const copied: Material = {
      ...JSON.parse(JSON.stringify(source)),
      id: generateId(),
      name: `${source.name} (副本)`,
      isFavorite: false,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    materials.value.push(copied);
    return { success: true, material: copied };
  }

  function toggleFavorite(id: string) {
    const material = materials.value.find((m) => m.id === id);
    if (material) {
      material.isFavorite = !material.isFavorite;
      material.updatedAt = Date.now();
    }
  }

  function recordUsage(id: string) {
    const material = materials.value.find((m) => m.id === id);
    if (material) {
      material.usageCount++;
      material.lastUsedAt = Date.now();
    }
  }

  function setMaterialFilter(filter: Partial<MaterialFilter>) {
    materialFilter.value = {
      keyword: filter.keyword ?? '',
      mode: filter.mode ?? null,
      techniqueCategory: filter.techniqueCategory ?? null,
      difficulty: filter.difficulty ?? null,
      scene: filter.scene ?? null,
      isFavorite: filter.isFavorite ?? null,
    };
  }

  function clearMaterialFilter() {
    materialFilter.value = {
      keyword: '',
      mode: null,
      techniqueCategory: null,
      difficulty: null,
      scene: null,
      isFavorite: null,
    };
  }

  function getMaterialById(id: string): Material | undefined {
    return materials.value.find((m) => m.id === id);
  }

  function recommendMaterials(
    currentBpm: number,
    currentTechniques: RightHandTechnique[],
    currentDifficulty?: DifficultyTag,
    currentMode?: MaterialMode,
    practiceGoal?: PracticeGoal,
    limit: number = 5,
  ): MaterialRecommendation[] {
    const scored: MaterialRecommendation[] = [];

    for (const m of materials.value) {
      let score = 0;
      const reasons: string[] = [];

      if (currentMode && m.mode === currentMode) {
        score += 30;
        reasons.push('调式匹配');
      }

      if (currentDifficulty && m.difficulty === currentDifficulty) {
        score += 20;
        reasons.push('难度匹配');
      }

      const hasMatchingRightHand = m.fingerings.some(
        (f) => currentTechniques.includes(f.rightHand),
      );
      if (hasMatchingRightHand) {
        score += 25;
        reasons.push('技法相似');
      }

      const materialTotalDuration = m.fingerings.reduce((sum, f) => sum + f.duration, 0);
      const materialEstimatedBpm = materialTotalDuration > 0
        ? Math.round(60 / (materialTotalDuration / m.fingerings.length))
        : 60;
      if (Math.abs(currentBpm - materialEstimatedBpm) < 20) {
        score += 10;
        reasons.push('速度适配');
      } else if (Math.abs(currentBpm - materialEstimatedBpm) < 40) {
        score += 5;
      }

      score += Math.min(m.usageCount * 2, 15);
      if (m.usageCount > 0) {
        reasons.push(`常用(${m.usageCount}次)`);
      }

      if (m.isFavorite) {
        score += 5;
        reasons.push('已收藏');
      }

      if (practiceGoal) {
        const goalBonus = computeGoalScore(practiceGoal, m, currentBpm);
        score += goalBonus.score;
        if (goalBonus.reason) reasons.push(goalBonus.reason);
      }

      if (score > 0) {
        scored.push({
          material: m,
          score,
          reason: reasons.join('、'),
        });
      }
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  function computeGoalScore(
    goal: PracticeGoal,
    material: Material,
    currentBpm: number,
  ): { score: number; reason?: string } {
    switch (goal) {
      case 'technique_mastery': {
        const techniqueDiversity = new Set(material.fingerings.map((f) => f.rightHand)).size;
        if (techniqueDiversity >= 3) return { score: 15, reason: '技法多样' };
        if (techniqueDiversity >= 2) return { score: 8, reason: '技法组合' };
        return { score: 3 };
      }
      case 'speed_training': {
        if (material.difficulty === 'hard' || material.difficulty === 'expert') {
          return { score: 15, reason: '高难度适配' };
        }
        if (currentBpm >= 80 && material.difficulty === 'medium') {
          return { score: 10, reason: '渐进提速' };
        }
        return { score: 3 };
      }
      case 'accuracy': {
        if (material.difficulty === 'easy' || material.difficulty === 'medium') {
          return { score: 12, reason: '精度适配' };
        }
        return { score: 5 };
      }
      case 'endurance': {
        const totalDur = material.fingerings.reduce((s, f) => s + f.duration, 0);
        if (totalDur >= 4) return { score: 15, reason: '长段耐力' };
        if (totalDur >= 2) return { score: 8, reason: '中等耐力' };
        return { score: 3 };
      }
      case 'expression': {
        if (material.scene === 'climax' || material.scene === 'ornament' || material.scene === 'sustained') {
          return { score: 15, reason: '表现力适配' };
        }
        return { score: 5 };
      }
      case 'full_run': {
        if (material.scene === 'opening' || material.scene === 'ending') {
          return { score: 10, reason: '完整流程适配' };
        }
        return { score: 5 };
      }
      default:
        return { score: 0 };
    }
  }

  function recommendPracticeSequence(
    currentBpm: number,
    currentTechniques: RightHandTechnique[],
    currentDifficulty?: DifficultyTag,
    currentMode?: MaterialMode,
    practiceGoal?: PracticeGoal,
    limit: number = 5,
  ): PracticeSequenceItem[] {
    const recommendations = recommendMaterials(
      currentBpm,
      currentTechniques,
      currentDifficulty,
      currentMode,
      practiceGoal,
      limit * 2,
    );

    const sequence: PracticeSequenceItem[] = [];
    const difficultyOrder: DifficultyTag[] = ['easy', 'medium', 'hard', 'expert'];
    const sceneOrder: MaterialScene[] = ['opening', 'practice_drill', 'transition', 'climax', 'ornament', 'sustained', 'ending', 'other'];

    const sorted = [...recommendations].sort((a, b) => {
      if (practiceGoal === 'speed_training' || practiceGoal === 'technique_mastery') {
        const diffA = difficultyOrder.indexOf(a.material.difficulty);
        const diffB = difficultyOrder.indexOf(b.material.difficulty);
        if (diffA !== diffB) return diffA - diffB;
      }

      if (practiceGoal === 'full_run' || practiceGoal === 'endurance') {
        const sceneA = sceneOrder.indexOf(a.material.scene);
        const sceneB = sceneOrder.indexOf(b.material.scene);
        if (sceneA !== sceneB) return sceneA - sceneB;
      }

      return b.score - a.score;
    });

    const used = new Set<string>();
    for (const rec of sorted) {
      if (used.has(rec.material.id) || sequence.length >= limit) continue;
      used.add(rec.material.id);

      const estimatedDuration = rec.material.fingerings.reduce((s, f) => s + f.duration, 0);
      const orderReasons: string[] = [];
      if (practiceGoal) {
        const goalLabel = PRACTICE_GOALS.find((g) => g.value === practiceGoal)?.label || '';
        orderReasons.push(`目标: ${goalLabel}`);
      }
      orderReasons.push(rec.reason);

      sequence.push({
        material: rec.material,
        order: sequence.length + 1,
        reason: orderReasons.join(' | '),
        estimatedDuration,
      });
    }

    return sequence;
  }

  function searchMaterials(query: string, limit: number = 10): Material[] {
    if (!query.trim()) return [];
    const kw = query.trim().toLowerCase();
    return materials.value
      .filter(
        (m) =>
          m.name.toLowerCase().includes(kw) ||
          m.fingerings.some((f) => f.character.toLowerCase().includes(kw)),
      )
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  function getModeLabel(mode: MaterialMode): string {
    return MATERIAL_MODES.find((m) => m.value === mode)?.label || mode;
  }

  function getTechniqueCategoryLabel(category: MaterialTechniqueCategory): string {
    return MATERIAL_TECHNIQUE_CATEGORIES.find((c) => c.value === category)?.label || category;
  }

  function getSceneLabel(scene: MaterialScene): string {
    return MATERIAL_SCENES.find((s) => s.value === scene)?.label || scene;
  }

  function getDifficultyLabel(difficulty: DifficultyTag): string {
    return DIFFICULTY_TAGS.find((d) => d.value === difficulty)?.label || difficulty;
  }

  function getGoalLabel(goal: PracticeGoal): string {
    return PRACTICE_GOALS.find((g) => g.value === goal)?.label || goal;
  }

  return {
    materials,
    filteredMaterials,
    materialFilter,
    categoryStats,
    categoryUsageStats,
    usageStats,
    topUsedMaterials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    renameMaterial,
    copyMaterial,
    toggleFavorite,
    recordUsage,
    setMaterialFilter,
    clearMaterialFilter,
    getMaterialById,
    recommendMaterials,
    recommendPracticeSequence,
    searchMaterials,
    getModeLabel,
    getTechniqueCategoryLabel,
    getSceneLabel,
    getDifficultyLabel,
    getGoalLabel,
  };
}
