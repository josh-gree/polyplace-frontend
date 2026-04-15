import { zoomIdentity } from "d3-zoom";

import { CONFIG } from "./config.js";
import { clamp } from "./math.js";

export function createViewport() {
  // D3's zoom transform is now the source of truth:
  // - transform.x / transform.y are screen-space pixel offsets.
  // - transform.k is CSS pixels per grid cell.
  // - screen = world * k + offset.
  let transform = zoomIdentity;

  // CSS size and device-pixel ratio are kept separate so drawing remains sharp
  // on retina/high-DPI screens while interaction math stays in CSS pixels.
  const canvasSize = {
    width: 0,
    height: 0,
    dpr: 1,
  };

  function fitScale() {
    if (!canvasSize.width || !canvasSize.height) return 1;
    return Math.min(canvasSize.width / CONFIG.GRID_SIZE, canvasSize.height / CONFIG.GRID_SIZE) * 0.94;
  }

  function minScale() {
    return Math.max(CONFIG.MIN_SCALE_FLOOR, fitScale() * 0.45);
  }

  function scaleExtent() {
    return [minScale(), CONFIG.MAX_SCALE];
  }

  function clampScale(scale) {
    const [min, max] = scaleExtent();
    return clamp(scale, min, max);
  }

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    canvasSize.width = rect.width;
    canvasSize.height = rect.height;
    canvasSize.dpr = dpr;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function viewFromTransform(nextTransform = transform) {
    return {
      x: -nextTransform.x / nextTransform.k,
      y: -nextTransform.y / nextTransform.k,
      scale: nextTransform.k,
    };
  }

  function transformFromView(view) {
    return zoomIdentity.translate(-view.x * view.scale, -view.y * view.scale).scale(view.scale);
  }

  // This gives D3 a project-specific boundary rule. D3 handles the gestures;
  // this function only clamps the resulting transform to keep the board nearby.
  function constrainTransform(nextTransform) {
    const scale = clampScale(nextTransform.k);
    const nextView = viewFromTransform({ ...nextTransform, k: scale });
    const worldWidth = canvasSize.width / scale;
    const worldHeight = canvasSize.height / scale;

    // A little overscroll padding keeps the board from feeling glued to the
    // viewport edge while still preventing the user from getting lost.
    const padX = Math.min(100, worldWidth * 0.2);
    const padY = Math.min(100, worldHeight * 0.2);
    const minX = -padX;
    const minY = -padY;
    const maxX = CONFIG.GRID_SIZE - worldWidth + padX;
    const maxY = CONFIG.GRID_SIZE - worldHeight + padY;

    const x = minX > maxX ? (CONFIG.GRID_SIZE - worldWidth) / 2 : clamp(nextView.x, minX, maxX);
    const y = minY > maxY ? (CONFIG.GRID_SIZE - worldHeight) / 2 : clamp(nextView.y, minY, maxY);

    return transformFromView({ x, y, scale });
  }

  function setTransform(nextTransform) {
    transform = constrainTransform(nextTransform);
    return transform;
  }

  function getTransform() {
    return transform;
  }

  function screenToWorld(screenX, screenY) {
    return {
      x: transform.invertX(screenX),
      y: transform.invertY(screenY),
    };
  }

  function worldToScreen(worldX, worldY) {
    return {
      x: transform.applyX(worldX),
      y: transform.applyY(worldY),
    };
  }

  function cellFromPoint(point) {
    const world = screenToWorld(point.x, point.y);
    const x = Math.floor(world.x);
    const y = Math.floor(world.y);

    if (x < 0 || y < 0 || x >= CONFIG.GRID_SIZE || y >= CONFIG.GRID_SIZE) return null;
    return { x, y };
  }

  function visibleBounds() {
    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(canvasSize.width, canvasSize.height);

    return {
      minX: clamp(Math.floor(topLeft.x), 0, CONFIG.GRID_SIZE),
      minY: clamp(Math.floor(topLeft.y), 0, CONFIG.GRID_SIZE),
      maxX: clamp(Math.ceil(bottomRight.x), 0, CONFIG.GRID_SIZE),
      maxY: clamp(Math.ceil(bottomRight.y), 0, CONFIG.GRID_SIZE),
    };
  }

  function fitTransform() {
    const scale = clampScale(fitScale());
    const worldWidth = canvasSize.width / scale;
    const worldHeight = canvasSize.height / scale;

    return transformFromView({
      x: (CONFIG.GRID_SIZE - worldWidth) / 2,
      y: (CONFIG.GRID_SIZE - worldHeight) / 2,
      scale,
    });
  }

  function centerOn(worldX, worldY) {
    const view = viewFromTransform();

    return transformFromView({
      x: worldX - canvasSize.width / view.scale / 2,
      y: worldY - canvasSize.height / view.scale / 2,
      scale: view.scale,
    });
  }

  function panByScreen(dx, dy) {
    const current = getTransform();
    return current.translate(dx / current.k, dy / current.k);
  }

  return {
    get view() {
      return viewFromTransform();
    },
    canvasSize,
    resizeCanvas,
    scaleExtent,
    constrainTransform,
    setTransform,
    getTransform,
    screenToWorld,
    worldToScreen,
    cellFromPoint,
    visibleBounds,
    fitTransform,
    centerOn,
    panByScreen,
  };
}
