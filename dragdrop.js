window.DragDropManager = (() => {
  let draggedSlot = null;
  let draggedCueIndex = null;

  function enablePresetDrag(container, onMove) {
    const slots = container.querySelectorAll(".slot");
    slots.forEach((slot) => {
      slot.setAttribute("draggable", "true");

      slot.addEventListener("dragstart", () => {
        draggedSlot = slot.dataset.slot;
      });

      slot.addEventListener("dragover", (event) => {
        event.preventDefault();
        slot.classList.add("drag-over");
      });

      slot.addEventListener("dragleave", () => {
        slot.classList.remove("drag-over");
      });

      slot.addEventListener("drop", (event) => {
        event.preventDefault();
        slot.classList.remove("drag-over");
        const targetSlot = slot.dataset.slot;
        if (!draggedSlot || !targetSlot || draggedSlot === targetSlot) return;
        onMove(draggedSlot, targetSlot);
        draggedSlot = null;
      });

      slot.addEventListener("dragend", () => {
        slot.classList.remove("drag-over");
        draggedSlot = null;
      });
    });
  }

  function enableCueDrag(listElement, onMove) {
    const rows = listElement.querySelectorAll(".cue-row");

    rows.forEach((row, index) => {
      row.setAttribute("draggable", "true");

      row.addEventListener("dragstart", () => {
        draggedCueIndex = index;
      });

      row.addEventListener("dragover", (event) => {
        event.preventDefault();
        row.classList.add("drag-over");
      });

      row.addEventListener("dragleave", () => {
        row.classList.remove("drag-over");
      });

      row.addEventListener("drop", (event) => {
        event.preventDefault();
        row.classList.remove("drag-over");
        if (draggedCueIndex === null) return;
        onMove(draggedCueIndex, index);
        draggedCueIndex = null;
      });

      row.addEventListener("dragend", () => {
        row.classList.remove("drag-over");
        draggedCueIndex = null;
      });
    });
  }

  return {
    enablePresetDrag,
    enableCueDrag
  };
})();
