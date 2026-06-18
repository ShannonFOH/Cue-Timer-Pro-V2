window.CueEngine = (() => {
  let intervalId = null;
  let flashTimeouts = [];
  let running = false;
  let paused = false;
  let currentPreset = null;
  let remainingSeconds = 0;
  let triggeredCueIds = new Set();
  let onTick = null;
  let onStateChange = null;
  let onStandby = null;

  function configure(callbacks = {}) {
    onTick = callbacks.onTick || null;
    onStateChange = callbacks.onStateChange || null;
    onStandby = callbacks.onStandby || null;
  }

  function loadPreset(preset) {
    stop({ silentStandby: true });
    currentPreset = clonePreset(preset);
    remainingSeconds = currentPreset.durationSeconds;
    triggeredCueIds = new Set();
    running = false;
    paused = false;
    emitState();
    emitTick();
  }

  function start() {
    if (!currentPreset) return;
    if (running && !paused) return;

    running = true;
    paused = false;
    clearInterval(intervalId);

    intervalId = setInterval(() => {
      tick();
    }, 1000);

    emitState();
  }

  function pause() {
    if (!currentPreset || !running) return;
    paused = true;
    clearInterval(intervalId);
    emitState();
  }

  function resume() {
    if (!currentPreset) return;
    if (!paused) {
      start();
      return;
    }
    start();
  }

  function stop(options = {}) {
    clearInterval(intervalId);
    intervalId = null;
    cancelAllFlashes();
    running = false;
    paused = false;
    remainingSeconds = currentPreset ? currentPreset.durationSeconds : 0;
    triggeredCueIds = new Set();

    if (!options.silentStandby) {
      currentPreset = null;
      emitState();
      if (onStandby) onStandby();
      return;
    }

    emitState();
    emitTick();
  }

  function reset() {
    if (!currentPreset) return;
    clearInterval(intervalId);
    cancelAllFlashes();
    remainingSeconds = currentPreset.durationSeconds;
    triggeredCueIds = new Set();
    running = false;
    paused = false;
    emitState();
    emitTick();
  }

  function tick() {
    if (!currentPreset || paused) return;

    remainingSeconds -= 1;
    if (remainingSeconds < 0) remainingSeconds = 0;

    checkCues();
    emitTick();

    if (remainingSeconds <= 0) {
      clearInterval(intervalId);
      intervalId = null;
      running = false;
      paused = false;
      emitState();
      finishSequence();
    }
  }

  function checkCues() {
    if (!currentPreset) return;

    currentPreset.cues.forEach((cue) => {
      if (cue.triggerSeconds === remainingSeconds && !triggeredCueIds.has(cue.id)) {
        triggeredCueIds.add(cue.id);
        triggerFlash(cue.color, cue.duration);
      }
    });
  }

  function finishSequence() {
    emitTick();
    setTimeout(() => {
      currentPreset = null;
      remainingSeconds = 0;
      triggeredCueIds = new Set();
      cancelAllFlashes();
      emitState();
      if (onStandby) onStandby();
    }, 1000);
  }

  function triggerFlash(color, durationSeconds) {
    const overlay = document.getElementById("flash-overlay");
    if (!overlay) return;

    cancelAllFlashes();
    overlay.classList.remove("hidden");

    const totalSteps = 6;
    const stepMs = Math.max(120, Math.floor((durationSeconds * 1000) / totalSteps));

    for (let i = 0; i < totalSteps; i += 1) {
      const timeout = setTimeout(() => {
        overlay.style.background = i % 2 === 0 ? color : "#000000";
        overlay.style.opacity = "0.95";
      }, i * stepMs);
      flashTimeouts.push(timeout);
    }

    const endTimeout = setTimeout(() => {
      overlay.style.opacity = "0";
      overlay.classList.add("hidden");
    }, totalSteps * stepMs);

    flashTimeouts.push(endTimeout);
  }

  function cancelAllFlashes() {
    flashTimeouts.forEach((id) => clearTimeout(id));
    flashTimeouts = [];

    const overlay = document.getElementById("flash-overlay");
    if (overlay) {
      overlay.style.opacity = "0";
      overlay.classList.add("hidden");
      overlay.style.background = "#000000";
    }
  }

  function getState() {
    return {
      running,
      paused,
      currentPreset: currentPreset ? clonePreset(currentPreset) : null,
      remainingSeconds
    };
  }

  function emitTick() {
    if (onTick) {
      onTick({
        remainingSeconds,
        currentPreset: currentPreset ? clonePreset(currentPreset) : null
      });
    }
  }

  function emitState() {
    if (onStateChange) {
      onStateChange(getState());
    }
  }

  function clonePreset(preset) {
    return JSON.parse(JSON.stringify(preset));
  }

  return {
    configure,
    loadPreset,
    start,
    pause,
    resume,
    stop,
    reset,
    getState,
    triggerFlash,
    cancelAllFlashes
  };
})();
