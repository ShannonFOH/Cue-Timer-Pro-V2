window.StorageManager = (() => {
  const KEY = "cue_timer_pro_v1";

  function defaultData() {
    return {
      version: 1,
      settings: {
        brightness: 100,
        accentColor: "#2d8cff"
      },
      presetsBySlot: {
        P1: samplePreset("P1", "Scene Change", 4, 0, "#2d8cff", [
          cueAt(2, 0, "#ffd400", 5),
          cueAt(0, 5, "#ff2d2d", 5)
        ]),
        P2: samplePreset("P2", "Intro", 1, 30, "#00b894", [
          cueAt(0, 10, "#ffd400", 3)
        ])
      }
    };
  }

  function samplePreset(slot, name, minutes, seconds, color, cues) {
    return {
      id: uid(),
      slot,
      name,
      durationSeconds: (minutes * 60) + seconds,
      color,
      cues
    };
  }

  function cueAt(minutes, seconds, color, duration) {
    return {
      id: uid(),
      triggerSeconds: (minutes * 60) + seconds,
      color,
      duration
    };
  }

  function uid() {
    return "id_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const fresh = defaultData();
        save(fresh);
        return fresh;
      }

      const parsed = JSON.parse(raw);
      return normalize(parsed);
    } catch (error) {
      console.error("Load failed, using defaults.", error);
      const fresh = defaultData();
      save(fresh);
      return fresh;
    }
  }

  function normalize(data) {
    const base = defaultData();

    const merged = {
      version: 1,
      settings: {
        brightness: Number(data?.settings?.brightness ?? base.settings.brightness),
        accentColor: data?.settings?.accentColor || base.settings.accentColor
      },
      presetsBySlot: {}
    };

    const slots = allSlots();
    slots.forEach((slot) => {
      const preset = data?.presetsBySlot?.[slot];
      if (!preset) {
        merged.presetsBySlot[slot] = null;
        return;
      }

      merged.presetsBySlot[slot] = {
        id: preset.id || uid(),
        slot,
        name: preset.name || slot,
        durationSeconds: clampInt(preset.durationSeconds, 0, 359999, 60),
        color: preset.color || "#2d8cff",
        cues: Array.isArray(preset.cues)
          ? preset.cues.map((cue) => ({
              id: cue.id || uid(),
              triggerSeconds: clampInt(cue.triggerSeconds, 0, 359999, 0),
              color: cue.color || "#ffd400",
              duration: clampInt(cue.duration, 1, 30, 3)
            })).sort((a, b) => b.triggerSeconds - a.triggerSeconds)
          : []
      };
    });

    return merged;
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(normalize(data)));
  }

  function exportToFile(data) {
    const blob = new Blob([JSON.stringify(normalize(data), null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cue-timer-pro-export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importFromText(text) {
    const parsed = JSON.parse(text);
    const normalized = normalize(parsed);
    save(normalized);
    return normalized;
  }

  function allSlots() {
    return Array.from({ length: 20 }, (_, i) => `P${i + 1}`);
  }

  function clampInt(value, min, max, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.min(max, Math.max(min, Math.round(num)));
  }

  return {
    KEY,
    uid,
    load,
    save,
    normalize,
    defaultData,
    exportToFile,
    importFromText,
    allSlots,
    clampInt
  };
})();
