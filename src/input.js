import { select } from "d3-selection";
import { zoom } from "d3-zoom";

import { CONFIG } from "./config.js";
import { pointFromEvent } from "./math.js";

export function createInputController({ canvas, miniMap, viewport, renderer, state }) {
  const canvasSelection = select(canvas);

  const zoomBehavior = zoom()
    .scaleExtent(viewport.scaleExtent())
    .constrain((transform) => viewport.constrainTransform(transform))
    .on("start", (event) => {
      if (isPointerLike(event.sourceEvent)) {
        canvas.classList.add("dragging");
      }
    })
    .on("zoom", (event) => {
      viewport.setTransform(event.transform);
      renderer.scheduleRender();
    })
    .on("end", () => {
      canvas.classList.remove("dragging");
    });

  canvas.tabIndex = 0;
  canvasSelection.call(zoomBehavior);
  canvasSelection.on("dblclick.zoom", null);

  function isPointerLike(event) {
    return event && (event.type.startsWith("pointer") || event.type.startsWith("mouse") || event.type.startsWith("touch"));
  }

  function applyTransform(transform) {
    canvasSelection.call(zoomBehavior.transform, viewport.constrainTransform(transform));
  }

  function updateScaleExtent() {
    zoomBehavior.scaleExtent(viewport.scaleExtent());
  }

  function updateHover(event) {
    state.hoveredCell = viewport.cellFromPoint(pointFromEvent(event, canvas));
    renderer.scheduleRender();
  }

  function selectCell(event) {
    state.selectedCell = viewport.cellFromPoint(pointFromEvent(event, canvas));
    renderer.scheduleRender();
  }

  function moveMiniMap(event) {
    const point = pointFromEvent(event, miniMap);
    const rect = miniMap.getBoundingClientRect();
    const worldX = (point.x / rect.width) * CONFIG.GRID_SIZE;
    const worldY = (point.y / rect.height) * CONFIG.GRID_SIZE;

    applyTransform(viewport.centerOn(worldX, worldY));
  }

  function onMiniMapPointerDown(event) {
    event.preventDefault();
    moveMiniMap(event);
    miniMap.setPointerCapture(event.pointerId);
  }

  function onMiniMapPointerMove(event) {
    if (event.buttons === 0) return;
    moveMiniMap(event);
  }

  function onKeyDown(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key === "f" || event.key === "F") {
      applyTransform(viewport.fitTransform());
    } else if (event.key === "=" || event.key === "+") {
      zoomBehavior.scaleBy(canvasSelection, 1.25, [viewport.canvasSize.width / 2, viewport.canvasSize.height / 2]);
    } else if (event.key === "-" || event.key === "_") {
      zoomBehavior.scaleBy(canvasSelection, 0.8, [viewport.canvasSize.width / 2, viewport.canvasSize.height / 2]);
    } else if (event.key === "ArrowLeft") {
      applyTransform(viewport.panByScreen(80, 0));
    } else if (event.key === "ArrowRight") {
      applyTransform(viewport.panByScreen(-80, 0));
    } else if (event.key === "ArrowUp") {
      applyTransform(viewport.panByScreen(0, 80));
    } else if (event.key === "ArrowDown") {
      applyTransform(viewport.panByScreen(0, -80));
    } else {
      return;
    }

    event.preventDefault();
  }

  canvas.addEventListener("pointermove", updateHover);
  canvas.addEventListener("pointerleave", () => {
    state.hoveredCell = null;
    renderer.scheduleRender();
  });
  canvas.addEventListener("click", selectCell);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  miniMap.addEventListener("pointerdown", onMiniMapPointerDown);
  miniMap.addEventListener("pointermove", onMiniMapPointerMove);
  window.addEventListener("keydown", onKeyDown);

  return {
    applyTransform,
    updateScaleExtent,
  };
}
