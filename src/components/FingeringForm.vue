<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  RIGHT_HAND_TECHNIQUES,
  LEFT_HAND_TECHNIQUES,
  HUI_POSITIONS,
  type RightHandTechnique,
  type LeftHandTechnique,
  type Fingering,
} from '@/types/fingering';
import { useFingeringStore } from '@/composables/useFingeringStore';
import { validateFingering } from '@/utils/validation';
import { Volume2 } from 'lucide-vue-next';
import { useAudioPlayer } from '@/composables/useAudioPlayer';

const emit = defineEmits<{
  (e: 'added'): void;
}>();

const { addFingering, totalDuration } = useFingeringStore();
const { playSingleFingering } = useAudioPlayer();

const character = ref('');
const stringIndex = ref(5);
const huiPosition = ref(7);
const rightHand = ref<RightHandTechnique>('tao');
const leftHand = ref<LeftHandTechnique>('none');
const duration = ref(1);
const errors = ref<string[]>([]);

const huiOptions = computed(() => HUI_POSITIONS);
const rightHandOptions = computed(() => RIGHT_HAND_TECHNIQUES);
const leftHandOptions = computed(() => LEFT_HAND_TECHNIQUES);

const formData = computed(() => ({
  character: character.value,
  stringIndex: stringIndex.value,
  huiPosition: huiPosition.value,
  rightHand: rightHand.value,
  leftHand: leftHand.value,
  duration: duration.value,
  startTime: totalDuration.value,
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
