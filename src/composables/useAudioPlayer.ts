import { ref, computed, onUnmounted } from 'vue';
import type { Fingering, PracticeSection } from '@/types/fingering';
import { guqinAudio, calculateFrequency } from '@/utils/audio';

export function useAudioPlayer() {
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const fingerings = ref<Fingering[]>([]);
  const tempoMultiplier = ref(1);

  const activeSection = ref<PracticeSection | null>(null);
  const loopPlayback = ref(false);
  const loopCount = ref(0);
  const currentLoop = ref(0);
  const loopStartTime = ref(0);
  const loopEndTime = ref(0);

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

  const sectionFingerings = computed(() => {
    if (!activeSection.value) return sortedFingerings.value;
    return sortedFingerings.value.filter((f) =>
      activeSection.value!.fingeringIds.includes(f.id),
    );
  });

  const playDuration = computed(() => {
    if (activeSection.value && sectionFingerings.value.length > 0) {
      const sorted = [...sectionFingerings.value].sort(
        (a, b) => a.startTime - b.startTime,
      );
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      return (last.startTime + last.duration - first.startTime) / tempoMultiplier.value;
    }
    return totalDuration.value / tempoMultiplier.value;
  });

  function setFingerings(fings: Fingering[]) {
    fingerings.value = fings;
    duration.value = totalDuration.value;
    if (!isPlaying.value) {
      currentTime.value = 0;
    } else {
      restartPlayback();
    }
  }

  function setTempoMultiplier(multiplier: number) {
    if (multiplier < 0.25 || multiplier > 2) return;
    tempoMultiplier.value = multiplier;
    if (isPlaying.value) {
      restartPlayback();
    }
  }

  function setActiveSection(section: PracticeSection | null) {
    activeSection.value = section;
    if (section) {
      loopPlayback.value = section.loop;
      loopCount.value = section.loopCount;
      tempoMultiplier.value = section.tempoMultiplier;

      if (sectionFingerings.value.length > 0) {
        const sorted = [...sectionFingerings.value].sort(
          (a, b) => a.startTime - b.startTime,
        );
        loopStartTime.value = sorted[0].startTime;
        loopEndTime.value =
          sorted[sorted.length - 1].startTime + sorted[sorted.length - 1].duration;
      }

      if (isPlaying.value) {
        currentTime.value = loopStartTime.value / tempoMultiplier.value;
        restartPlayback();
      } else {
        currentTime.value = loopStartTime.value / tempoMultiplier.value;
      }
    } else {
      loopPlayback.value = false;
      loopCount.value = 0;
      loopStartTime.value = 0;
      loopEndTime.value = totalDuration.value;
      tempoMultiplier.value = 1;
    }
    currentLoop.value = 0;
  }

  function setLoopRange(start: number, end: number, loops: number = 1) {
    loopPlayback.value = true;
    loopCount.value = loops;
    loopStartTime.value = start;
    loopEndTime.value = end;
    currentLoop.value = 0;
    activeSection.value = null;
  }

  function disableLoop() {
    loopPlayback.value = false;
    loopCount.value = 0;
    currentLoop.value = 0;
  }

  function restartPlayback() {
    if (!isPlaying.value) return;

    guqinAudio.stopAllActive();

    const effectiveTime = currentTime.value * tempoMultiplier.value;
    playbackStartTime = guqinAudio.getCurrentTime() - effectiveTime;
    pausedTime = effectiveTime;

    const fingsToPlay = sectionFingerings.value;
    const actualStartTime = activeSection.value ? loopStartTime.value : 0;

    for (const fing of fingsToPlay) {
      const adjustedStartTime = fing.startTime - actualStartTime;
      const adjustedEndTime = adjustedStartTime + fing.duration;

      if (adjustedEndTime > pausedTime - actualStartTime) {
        const delay = Math.max(0, adjustedStartTime - (pausedTime - actualStartTime)) / tempoMultiplier.value;
        const adjustedDuration = fing.duration / tempoMultiplier.value;
        const freq = calculateFrequency(fing.stringIndex, fing.huiPosition);
        guqinAudio.playNote(freq, delay, adjustedDuration, 'triangle');
      }
    }
  }

  function play() {
    const fingsToPlay = sectionFingerings.value;
    if (fingsToPlay.length === 0) return;
    if (isPlaying.value) return;

    isPlaying.value = true;
    guqinAudio.resume();

    const effectiveTime = currentTime.value * tempoMultiplier.value;
    playbackStartTime = guqinAudio.getCurrentTime() - effectiveTime;

    const actualStartTime = activeSection.value ? loopStartTime.value : 0;

    for (const fing of fingsToPlay) {
      const adjustedStartTime = fing.startTime - actualStartTime;
      const adjustedEndTime = adjustedStartTime + fing.duration;

      if (adjustedEndTime > effectiveTime - actualStartTime) {
        const delay = Math.max(0, adjustedStartTime - (effectiveTime - actualStartTime)) / tempoMultiplier.value;
        const adjustedDuration = fing.duration / tempoMultiplier.value;
        const freq = calculateFrequency(fing.stringIndex, fing.huiPosition);
        guqinAudio.playNote(freq, delay, adjustedDuration, 'triangle');
      }
    }

    updatePlaybackPosition();
  }

  function pause() {
    if (!isPlaying.value) return;

    isPlaying.value = false;
    pausedTime = currentTime.value * tempoMultiplier.value;

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    guqinAudio.stopAllActive();
  }

  function stop() {
    isPlaying.value = false;
    currentTime.value = 0;
    pausedTime = 0;
    currentLoop.value = 0;

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    guqinAudio.stopAll();
  }

  function seek(time: number) {
    const wasPlaying = isPlaying.value;

    guqinAudio.stopAllActive();

    const effectiveTime = Math.max(0, Math.min(time, playDuration.value));
    pausedTime = effectiveTime * tempoMultiplier.value;
    currentTime.value = effectiveTime;

    if (wasPlaying) {
      const actualStartTime = activeSection.value ? loopStartTime.value : 0;
      playbackStartTime = guqinAudio.getCurrentTime() - pausedTime;

      const fingsToPlay = sectionFingerings.value;

      for (const fing of fingsToPlay) {
        const adjustedStartTime = fing.startTime - actualStartTime;
        const adjustedEndTime = adjustedStartTime + fing.duration;

        if (adjustedEndTime > pausedTime - actualStartTime) {
          const delay = Math.max(0, adjustedStartTime - (pausedTime - actualStartTime)) / tempoMultiplier.value;
          const adjustedDuration = fing.duration / tempoMultiplier.value;
          const freq = calculateFrequency(fing.stringIndex, fing.huiPosition);
          guqinAudio.playNote(freq, delay, adjustedDuration, 'triangle');
        }
      }

      if (!animationFrameId) {
        updatePlaybackPosition();
      }
    }
  }

  function updatePlaybackPosition() {
    if (!isPlaying.value) return;

    const elapsed = guqinAudio.getCurrentTime() - playbackStartTime;
    const adjustedElapsed = elapsed * tempoMultiplier.value;

    const actualStartTime = activeSection.value ? loopStartTime.value : 0;
    const effectiveElapsed = adjustedElapsed + actualStartTime;

    if (loopPlayback.value && effectiveElapsed >= loopEndTime.value) {
      currentLoop.value++;

      if (loopCount.value > 0 && currentLoop.value >= loopCount.value) {
        stop();
        return;
      }

      currentTime.value = (loopStartTime.value - actualStartTime) / tempoMultiplier.value;
      pausedTime = loopStartTime.value;

      guqinAudio.stopAllActive();
      playbackStartTime = guqinAudio.getCurrentTime() - pausedTime;

      const fingsToPlay = sectionFingerings.value;

      for (const fing of fingsToPlay) {
        const adjustedStartTime = fing.startTime - actualStartTime;
        if (adjustedStartTime >= 0) {
          const delay = adjustedStartTime / tempoMultiplier.value;
          const adjustedDuration = fing.duration / tempoMultiplier.value;
          const freq = calculateFrequency(fing.stringIndex, fing.huiPosition);
          guqinAudio.playNote(freq, delay, adjustedDuration, 'triangle');
        }
      }
    } else {
      currentTime.value = Math.min(elapsed, playDuration.value);

      if (elapsed >= playDuration.value && !loopPlayback.value) {
        isPlaying.value = false;
        pausedTime = 0;
        currentTime.value = 0;
        currentLoop.value = 0;
        return;
      }
    }

    animationFrameId = requestAnimationFrame(updatePlaybackPosition);
  }

  function playSingleFingering(fingering: Fingering) {
    const freq = calculateFrequency(fingering.stringIndex, fingering.huiPosition);
    guqinAudio.playNote(freq, 0, fingering.duration, 'triangle');
  }

  function playSection(section: PracticeSection, allFingerings: Fingering[]) {
    const sectionFings = allFingerings.filter((f) =>
      section.fingeringIds.includes(f.id),
    );
    if (sectionFings.length === 0) return;

    stop();

    fingerings.value = allFingerings;
    setActiveSection(section);
    play();
  }

  onUnmounted(() => {
    stop();
  });

  return {
    isPlaying,
    currentTime,
    duration,
    totalDuration,
    playDuration,
    tempoMultiplier,
    activeSection,
    loopPlayback,
    loopCount,
    currentLoop,
    loopStartTime,
    loopEndTime,
    sectionFingerings,
    setFingerings,
    setTempoMultiplier,
    setActiveSection,
    setLoopRange,
    disableLoop,
    play,
    pause,
    stop,
    seek,
    playSingleFingering,
    playSection,
  };
}
