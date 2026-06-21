import { ref, computed, onUnmounted } from 'vue';
import type { Fingering } from '@/types/fingering';
import { guqinAudio, calculateFrequency } from '@/utils/audio';

export function useAudioPlayer() {
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const fingerings = ref<Fingering[]>([]);

  let animationFrameId: number | null = null;
  let playbackStartTime = 0;
  let pausedTime = 0;

  const sortedFingerings = computed(() => {
    return [...fingerings.value].sort((a, b) => a.startTime - b.startTime);
  });

  const totalDuration = computed(() => {
    if (sortedFingerings.value.length === 0) return 0;
    const last = sortedFingerings.value[sortedFingerings.value.length - 1];
    return last.startTime + last.duration;
  });

  function setFingerings(fings: Fingering[]) {
    fingerings.value = fings;
    duration.value = totalDuration.value;
    if (!isPlaying.value) {
      currentTime.value = 0;
    }
  }

  function play() {
    if (sortedFingerings.value.length === 0) return;
    if (isPlaying.value) return;

    isPlaying.value = true;
    guqinAudio.resume();

    playbackStartTime = guqinAudio.getCurrentTime() - pausedTime;

    for (const fing of sortedFingerings.value) {
      if (fing.startTime + fing.duration > pausedTime) {
        const delay = Math.max(0, fing.startTime - pausedTime);
        const freq = calculateFrequency(fing.stringIndex, fing.huiPosition);
        guqinAudio.playNote(freq, delay, fing.duration, 'triangle');
      }
    }

    updatePlaybackPosition();
  }

  function pause() {
    if (!isPlaying.value) return;

    isPlaying.value = false;
    pausedTime = currentTime.value;

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function stop() {
    isPlaying.value = false;
    currentTime.value = 0;
    pausedTime = 0;

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    guqinAudio.stopAll();
  }

  function seek(time: number) {
    const wasPlaying = isPlaying.value;
    if (wasPlaying) {
      pause();
    }

    pausedTime = Math.max(0, Math.min(time, totalDuration.value));
    currentTime.value = pausedTime;

    if (wasPlaying) {
      play();
    }
  }

  function updatePlaybackPosition() {
    if (!isPlaying.value) return;

    const elapsed = guqinAudio.getCurrentTime() - playbackStartTime;
    currentTime.value = Math.min(elapsed, totalDuration.value);

    if (currentTime.value >= totalDuration.value) {
      isPlaying.value = false;
      pausedTime = 0;
      currentTime.value = 0;
      return;
    }

    animationFrameId = requestAnimationFrame(updatePlaybackPosition);
  }

  function playSingleFingering(fingering: Fingering) {
    const freq = calculateFrequency(fingering.stringIndex, fingering.huiPosition);
    guqinAudio.playNote(freq, 0, fingering.duration, 'triangle');
  }

  onUnmounted(() => {
    stop();
  });

  return {
    isPlaying,
    currentTime,
    duration,
    totalDuration,
    setFingerings,
    play,
    pause,
    stop,
    seek,
    playSingleFingering,
  };
}
