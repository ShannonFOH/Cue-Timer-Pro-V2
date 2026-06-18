(() => {
  const state = {
    data: StorageManager.load(),
    editMode: false,
    editingSlot: null
  };

  const dom = {
    body: document.body,
    app: document.getElementById("app"),
    topRow: document.getElementById("top-row"),
    bottomRow: document.getElementById("bottom-row"),
    leftSide: document.getElementById("left-side"),
    rightSide: document.getElementById("right-side"),
    timerDisplay: document.getElementById("timer-display"),
    activePresetName: document.getElementById("active-preset-name"),
    statusLine: document.getElementById("status-line"),
    btnStart: document.getElementById("btn-start"),
    btnPause: document.getElementById("btn-pause"),
    btnStop: document.getElementById("btn-stop"),
    btnReset: document.getElementById("btn-reset"),
    btnMode: document.getElementById("btn-mode"),
    btnFullscreen: document.getElementById("btn-fullscreen"),
    btnExport: document.getElementById("btn-export"),
    importFile: document.getElementById("import-file"),
    brightnessRange: document.getElementById("brightness-range"),
    brightnessValue: document.getElementById("brightness-value"),
    globalAccent: document.getElementById("global-accent"),
    wakeStatus: document.getElementById("wake-status"),
    modal: document.getElementById("preset-modal"),
    modalTitle: document.getElementById("modal-title"),
    btnCloseModal: document.getElementById("btn-close-modal"),
    btnSavePreset: document.getElementById("btn-save-preset"),
    btnDeletePreset: document.getElementById("btn-delete-preset"),
    btnAddCue: document.getElementById("btn-add-cue"),
    cueList: document.getElementById("cue-list"),
    presetName: document.getElementById("preset-name"),
    presetSlot: document.getElementById("preset-slot"),
    presetMinutes: document.getElementById("preset-minutes"),
    presetSeconds: document.getElementById("preset-seconds"),
    presetColor: document.getElementById("preset-color"),
    cueRowTemplate: document.getElementById("cue-row-template")
  };

  function init() {
    fillSlotOptions();
    applySettings();
    renderAllSlots();
    bindEvents();

    WakeLockManager.bindStatusElement(dom.wakeStatus);

    CueEngine.configure({
      onTick: handleTick,
      onStateChange: handleEngineState,
      onStandby: handleStandby
    });

    renderStandby();
  }

  function bindEvents() {
    dom.btnMode.addEventListener("click", toggleEditMode);
    dom.btnStart.addEventListener("click", handleStart);
    dom.btnPause.addEventListener("click", handlePause);
    dom.btnStop.addEventListener("click", handleStop);
    dom.btnReset.addEventListener("click", handleReset);
    dom.btnFullscreen.addEventListener("click", toggleFullscreen);
    dom.btnExport.addEventListener("click", () => StorageManager.exportToFile(state.data));
    dom.importFile.addEventListener("change", handleImportFile);
    dom.btnCloseModal.addEventListener("click", closeModal);
    dom.btnSavePreset.addEventListener("click", savePresetFromModal);
    dom.btnDeletePreset.addEventListener("click", deletePresetFromModal);
    dom.btnAddCue.addEventListener("click", addCueRow);
    dom.brightnessRange.addEventListener("input", updateBrightness);
    dom.globalAccent.addEventListener("input", updateAccent);
  }

  function toggleEditMode() {
    state.editMode = !state.editMode;
    dom.body.classList.toggle("edit-mode", state.editMode);
    dom.btnMode.textContent = state.editMode ? "SHOW MODE" : "EDIT MODE";
    renderAllSlots();
  }

  function fillSlotOptions() {
    dom.presetSlot.innerHTML = "";
    StorageManager.allSlots().forEach((slot) => {
      const option = document.createElement("option");
      option.value = slot;
      option.textContent = slot;
      dom.presetSlot.appendChild(option);
    });
  }

  function renderAllSlots() {
    dom.topRow.innerHTML = "";
    dom.bottomRow.innerHTML = "";
    dom.leftSide.innerHTML = "";
    dom.rightSide.innerHTML = "";

    const topSlots = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"];
    const leftSlots = ["P17", "P19"];
    const rightSlots = ["P18", "P20"];
    const bottomSlots = ["P9", "P10", "P11", "P12", "P13", "P14", "P15", "P16"];

    topSlots.forEach((slot) => dom.topRow.appendChild(buildSlotElement(slot)));
    leftSlots.forEach((slot) => dom.leftSide.appendChild(buildSlotElement(slot)));
    rightSlots.forEach((slot) => dom.rightSide.appendChild(buildSlotElement(slot)));
    bottomSlots.forEach((slot) => dom.bottomRow.appendChild(buildSlotElement(slot)));

    if (state.editMode) {
      DragDropManager.enablePresetDrag(dom.topRow, movePreset);
      DragDropManager.enablePresetDrag(dom.bottomRow, movePreset);
      DragDropManager.enablePresetDrag(dom.leftSide, movePreset);
      DragDropManager.enablePresetDrag(dom.rightSide, movePreset);
    }
  }

  function buildSlotElement(slot) {
    const wrapper = document.createElement("div");
    wrapper.className = "slot";
    wrapper.dataset.slot = slot;

    const preset = state.data.presetsBySlot[slot];

    if (!preset) {
      if (state.editMode) {
        wrapper.classList.add("edit-empty");
        wrapper.dataset.slot = slot;
        wrapper.addEventListener("click", () => openPresetEditor(slot));
      } else {
        wrapper.classList.add("hidden-show-mode");
      }
      return wrapper;
    }

    const card = document.createElement("button");
    card.className = "preset-card";
    card.style.borderColor = preset.color || state.data.settings.accentColor;
    card.type = "button";

    const engineState = CueEngine.getState();
    if (engineState.currentPreset && engineState.currentPreset.slot === slot) {
      card.classList.add("active");
    }

    const name = document.createElement("div");
    name.className = "preset-name";
    name.textContent = preset.name || slot;

    const time = document.createElement("div");
    time.className = "preset-time";
    time.textContent = formatSeconds(preset.durationSeconds);

    card.appendChild(name);
    card.appendChild(time);

    if (state.editMode) {
      const badge = document.createElement("div");
      badge.className = "edit-badge";
      badge.textContent = slot;
      wrapper.appendChild(card);
      wrapper.appendChild(badge);

      card.addEventListener("click", (event) => {
        event.stopPropagation();
        openPresetEditor(slot);
      });
    } else {
      wrapper.appendChild(card);
      card.addEventListener("click", () => activatePreset(slot));
    }

    return wrapper;
  }

  function activatePreset(slot) {
    const preset = state.data.presetsBySlot[slot];
    if (!preset) return;

    CueEngine.loadPreset(preset);
    CueEngine.start();
    renderRunningPresetName(preset.name);
    dom.statusLine.textContent = "Running";
    WakeLockManager.request();
    renderAllSlots();
  }

  function handleStart() {
    const engineState = CueEngine.getState();
    if (!engineState.currentPreset) return;
    if (engineState.paused) {
      CueEngine.resume();
    } else {
      CueEngine.start();
    }
    WakeLockManager.request();
  }

  function handlePause() {
    CueEngine.pause();
  }

  function handleStop() {
    CueEngine.stop();
    WakeLockManager.release();
    renderStandby();
    renderAllSlots();
  }

  function handleReset() {
    CueEngine.reset();
    const engineState = CueEngine.getState();
    if (engineState.currentPreset) {
      dom.timerDisplay.textContent = formatSeconds(engineState.currentPreset.durationSeconds);
      dom.activePresetName.textContent = engineState.currentPreset.name;
      dom.statusLine.textContent = "Reset";
    } else {
      renderStandby();
    }
  }

  function handleTick({ remainingSeconds, currentPreset }) {
    if (!currentPreset) {
      renderStandby();
      return;
    }

    dom.timerDisplay.textContent = formatSeconds(remainingSeconds);
    dom.activePresetName.textContent = currentPreset.name;
    dom.statusLine.textContent = remainingSeconds === 0 ? "Complete" : "Running";
  }

  function handleEngineState(engineState) {
    if (!engineState.currentPreset) {
      return;
    }

    if (engineState.paused) {
      dom.statusLine.textContent = "Paused";
    } else if (!engineState.running) {
      dom.statusLine.textContent = "Loaded";
    } else {
      dom.statusLine.textContent = "Running";
    }

    renderAllSlots();
  }

  function handleStandby() {
    renderStandby();
    WakeLockManager.release();
    renderAllSlots();
  }

  function renderStandby() {
    dom.timerDisplay.textContent = "STANDBY";
    dom.activePresetName.textContent = "STANDBY";
    dom.statusLine.textContent = "No preset loaded";
  }

  function renderRunningPresetName(name) {
    dom.activePresetName.textContent = name;
  }

  function openPresetEditor(slot) {
    state.editingSlot = slot;
    const preset = state.data.presetsBySlot[slot];

    dom.modal.classList.remove("hidden");
    dom.modal.setAttribute("aria-hidden", "false");
    dom.modalTitle.textContent = preset ? `Edit Preset ${slot}` : `Create Preset ${slot}`;
    dom.btnDeletePreset.style.visibility = preset ? "visible" : "hidden";

    dom.presetName.value = preset?.name || "";
    dom.presetSlot.value = slot;
    dom.presetMinutes.value = preset ? Math.floor(preset.durationSeconds / 60) : 4;
    dom.presetSeconds.value = preset ? preset.durationSeconds % 60 : 0;
    dom.presetColor.value = preset?.color || state.data.settings.accentColor;

    renderCueList(preset?.cues || []);
  }

  function closeModal() {
    dom.modal.classList.add("hidden");
    dom.modal.setAttribute("aria-hidden", "true");
    state.editingSlot = null;
    dom.cueList.innerHTML = "";
  }

  function renderCueList(cues) {
    dom.cueList.innerHTML = "";

    cues.forEach((cue) => {
      const row = buildCueRow(cue);
      dom.cueList.appendChild(row);
    });

    wireCueDrag();
  }

  function buildCueRow(cue = null) {
    const fragment = dom.cueRowTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".cue-row");

    row.dataset.id = cue?.id || StorageManager.uid();
    row.querySelector(".cue-minutes").value = cue ? Math.floor(cue.triggerSeconds / 60) : 0;
    row.querySelector(".cue-seconds").value = cue ? cue.triggerSeconds % 60 : 0;
    row.querySelector(".cue-color").value = cue?.color || "#ffd400";
    row.querySelector(".cue-duration").value = cue?.duration || 5;

    row.querySelector(".cue-delete").addEventListener("click", () => {
      row.remove();
      wireCueDrag();
    });

    row.querySelector(".cue-up").addEventListener("click", () => moveCueRow(row, -1));
    row.querySelector(".cue-down").addEventListener("click", () => moveCueRow(row, 1));

    return row;
  }

  function addCueRow() {
    dom.cueList.appendChild(buildCueRow());
    wireCueDrag();
  }

  function moveCueRow(row, direction) {
    const rows = [...dom.cueList.children];
    const index = rows.indexOf(row);
    if (index < 0) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= rows.length) return;

    if (direction < 0) {
      dom.cueList.insertBefore(row, rows[targetIndex]);
    } else {
      dom.cueList.insertBefore(rows[targetIndex], row);
    }

    wireCueDrag();
  }

  function wireCueDrag() {
    DragDropManager.enableCueDrag(dom.cueList, (fromIndex, toIndex) => {
      const rows = [...dom.cueList.children];
      const moving = rows[fromIndex];
      const target = rows[toIndex];
      if (!moving || !target || moving === target) return;

      const refreshed = [...dom.cueList.children];
      if (fromIndex < toIndex) {
        dom.cueList.insertBefore(target, moving);
      } else {
        dom.cueList.insertBefore(moving, target);
      }

      if (refreshed.length) {
        DragDropManager.enableCueDrag(dom.cueList, arguments.callee);
      }
    });
  }

  function savePresetFromModal() {
    const sourceSlot = state.editingSlot;
    const targetSlot = dom.presetSlot.value;
    const name = dom.presetName.value.trim() || targetSlot;
    const minutes = StorageManager.clampInt(dom.presetMinutes.value, 0, 999, 0);
    const seconds = StorageManager.clampInt(dom.presetSeconds.value, 0, 59, 0);
    const color = dom.presetColor.value || state.data.settings.accentColor;
    const durationSeconds = (minutes * 60) + seconds;

    const existing = sourceSlot ? state.data.presetsBySlot[sourceSlot] : null;
    const preset = {
      id: existing?.id || StorageManager.uid(),
      slot: targetSlot,
      name,
      durationSeconds,
      color,
      cues: readCuesFromModal()
    };

    if (sourceSlot && sourceSlot !== targetSlot) {
      const targetExisting = state.data.presetsBySlot[targetSlot];
      state.data.presetsBySlot[sourceSlot] = targetExisting ? { ...targetExisting, slot: sourceSlot } : null;
    }

    state.data.presetsBySlot[targetSlot] = preset;

    if (sourceSlot && sourceSlot !== targetSlot && existing && !state.data.presetsBySlot[sourceSlot]) {
      state.data.presetsBySlot[sourceSlot] = null;
    }

    persistAndRefresh();
    closeModal();
  }

  function readCuesFromModal() {
    const rows = [...dom.cueList.querySelectorAll(".cue-row")];
    const cues = rows.map((row) => {
      const minutes = StorageManager.clampInt(row.querySelector(".cue-minutes").value, 0, 999, 0);
      const seconds = StorageManager.clampInt(row.querySelector(".cue-seconds").value, 0, 59, 0);
      const color = row.querySelector(".cue-color").value || "#ffd400";
      const duration = StorageManager.clampInt(row.querySelector(".cue-duration").value, 1, 30, 5);

      return {
        id: row.dataset.id || StorageManager.uid(),
        triggerSeconds: (minutes * 60) + seconds,
        color,
        duration
      };
    });

    cues.sort((a, b) => b.triggerSeconds - a.triggerSeconds);
    return cues;
  }

  function deletePresetFromModal() {
    if (!state.editingSlot) return;
    state.data.presetsBySlot[state.editingSlot] = null;
    persistAndRefresh();
    closeModal();
  }

  function movePreset(fromSlot, toSlot) {
    const fromPreset = state.data.presetsBySlot[fromSlot];
    const toPreset = state.data.presetsBySlot[toSlot];

    state.data.presetsBySlot[toSlot] = fromPreset ? { ...fromPreset, slot: toSlot } : null;
    state.data.presetsBySlot[fromSlot] = toPreset ? { ...toPreset, slot: fromSlot } : null;

    persistAndRefresh();
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }

  function updateBrightness() {
    const value = StorageManager.clampInt(dom.brightnessRange.value, 20, 100, 100);
    state.data.settings.brightness = value;
    dom.brightnessValue.textContent = `${value}%`;
    document.documentElement.style.setProperty("--brightness", String(value / 100));
    persist();
  }

  function updateAccent() {
    const color = dom.globalAccent.value || "#2d8cff";
    state.data.settings.accentColor = color;
    document.documentElement.style.setProperty("--accent", color);
    persist();
    renderAllSlots();
  }

  function applySettings() {
    const brightness = StorageManager.clampInt(state.data.settings.brightness, 20, 100, 100);
    const accent = state.data.settings.accentColor || "#2d8cff";

    dom.brightnessRange.value = brightness;
    dom.brightnessValue.textContent = `${brightness}%`;
    dom.globalAccent.value = accent;

    document.documentElement.style.setProperty("--brightness", String(brightness / 100));
    document.documentElement.style.setProperty("--accent", accent);
  }

  function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        state.data = StorageManager.importFromText(String(reader.result));
        applySettings();
        renderAllSlots();
        renderStandby();
      } catch (error) {
        console.error("Import failed:", error);
        alert("Import failed. Please use a valid Cue Timer Pro JSON file.");
      } finally {
        dom.importFile.value = "";
      }
    };
    reader.readAsText(file);
  }

  function persist() {
    StorageManager.save(state.data);
  }

  function persistAndRefresh() {
    persist();
    renderAllSlots();
  }

  function formatSeconds(totalSeconds) {
    const safe = Math.max(0, Number(totalSeconds) || 0);
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  init();
})();
