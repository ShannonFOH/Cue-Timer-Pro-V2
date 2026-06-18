window.WakeLockManager = (() => {
  let lock = null;
  let statusElement = null;

  async function request() {
    updateStatus("Wake lock: requesting");
    if (!("wakeLock" in navigator)) {
      updateStatus("Wake lock: unsupported");
      return false;
    }

    try {
      lock = await navigator.wakeLock.request("screen");
      updateStatus("Wake lock: active");

      lock.addEventListener("release", () => {
        updateStatus("Wake lock: released");
      });

      return true;
    } catch (error) {
      console.error("Wake lock error:", error);
      updateStatus("Wake lock: blocked");
      return false;
    }
  }

  async function release() {
    if (lock) {
      try {
        await lock.release();
      } catch (error) {
        console.error("Wake lock release error:", error);
      }
      lock = null;
    }
    updateStatus("Wake lock: idle");
  }

  function bindStatusElement(element) {
    statusElement = element;
  }

  function updateStatus(text) {
    if (statusElement) {
      statusElement.textContent = text;
    }
  }

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible" && lock !== null) {
      await request();
    }
  });

  return {
    request,
    release,
    bindStatusElement,
    updateStatus
  };
})();
