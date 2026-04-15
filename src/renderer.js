import { CONFIG } from "./config.js";
import { clamp, roundRect } from "./math.js";

export function createRenderer({ canvas, miniMap, board, viewport, state }) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const miniCtx = miniMap.getContext("2d", { alpha: false });
  let renderQueued = false;

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(render);
  }

  function clearCanvas() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = CONFIG.BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function setWorldTransform() {
    const { canvasSize, view } = viewport;

    ctx.setTransform(
      view.scale * canvasSize.dpr,
      0,
      0,
      view.scale * canvasSize.dpr,
      -view.x * view.scale * canvasSize.dpr,
      -view.y * view.scale * canvasSize.dpr,
    );
  }

  function drawBoardSurface() {
    // The offscreen board is exactly 1000x1000, so drawing it through the
    // viewport transform maps one board pixel to one grid cell.
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(board, 0, 0);
  }

  function drawCellGrid() {
    const { view } = viewport;
    if (view.scale < CONFIG.CELL_GRID_MIN_SCALE) return;

    const bounds = viewport.visibleBounds();
    ctx.beginPath();

    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      ctx.moveTo(x, bounds.minY);
      ctx.lineTo(x, bounds.maxY);
    }

    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      ctx.moveTo(bounds.minX, y);
      ctx.lineTo(bounds.maxX, y);
    }

    ctx.strokeStyle = view.scale >= 18 ? "rgba(21, 21, 21, 0.2)" : "rgba(21, 21, 21, 0.12)";
    ctx.lineWidth = 1 / view.scale;
    ctx.stroke();
  }

  function drawCellOverlay(cell, fill, stroke) {
    if (!cell) return;

    const { view } = viewport;
    ctx.fillStyle = fill;
    ctx.fillRect(cell.x, cell.y, 1, 1);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(2 / view.scale, 0.035);
    ctx.strokeRect(cell.x, cell.y, 1, 1);
  }

  function drawCoordinateLabel() {
    const { canvasSize, view } = viewport;
    const { selectedCell } = state;
    if (!selectedCell || view.scale < CONFIG.LABEL_MIN_SCALE) return;

    const screen = viewport.worldToScreen(selectedCell.x, selectedCell.y);
    const label = `${selectedCell.x}, ${selectedCell.y}`;

    ctx.save();
    ctx.setTransform(canvasSize.dpr, 0, 0, canvasSize.dpr, 0, 0);
    ctx.font = "12px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "middle";

    const width = Math.min(view.scale - 12, Math.max(52, ctx.measureText(label).width + 14));
    if (width >= 52) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.strokeStyle = "rgba(21, 21, 21, 0.18)";
      ctx.lineWidth = 1;
      roundRect(ctx, screen.x + 6, screen.y + 6, width, 24, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#151515";
      ctx.fillText(label, screen.x + 13, screen.y + 18);
    }

    ctx.restore();
  }

  function drawBoard() {
    const { view } = viewport;

    ctx.save();
    setWorldTransform();
    drawBoardSurface();
    drawCellGrid();
    drawCellOverlay(state.hoveredCell, "rgba(41, 121, 199, 0.12)", "rgba(41, 121, 199, 0.82)");
    drawCellOverlay(state.selectedCell, "rgba(233, 79, 55, 0.16)", "rgba(233, 79, 55, 1)");

    ctx.strokeStyle = "rgba(21, 21, 21, 0.7)";
    ctx.lineWidth = Math.max(1.5 / view.scale, 0.02);
    ctx.strokeRect(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
    ctx.restore();

    drawCoordinateLabel();
  }

  function drawMiniMap() {
    const { canvasSize, view } = viewport;
    const rect = miniMap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    if (miniMap.width !== width || miniMap.height !== height) {
      miniMap.width = width;
      miniMap.height = height;
    }

    miniCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    miniCtx.imageSmoothingEnabled = false;
    miniCtx.drawImage(board, 0, 0, rect.width, rect.height);

    // The minimap deliberately has no gridlines. It only shows board content
    // and the current viewport rectangle.
    const scaleX = rect.width / CONFIG.GRID_SIZE;
    const scaleY = rect.height / CONFIG.GRID_SIZE;
    const left = clamp(view.x, 0, CONFIG.GRID_SIZE);
    const top = clamp(view.y, 0, CONFIG.GRID_SIZE);
    const right = clamp(view.x + canvasSize.width / view.scale, 0, CONFIG.GRID_SIZE);
    const bottom = clamp(view.y + canvasSize.height / view.scale, 0, CONFIG.GRID_SIZE);
    const vx = left * scaleX;
    const vy = top * scaleY;
    const vw = Math.max(1, (right - left) * scaleX);
    const vh = Math.max(1, (bottom - top) * scaleY);

    miniCtx.fillStyle = "rgba(233, 79, 55, 0.12)";
    miniCtx.fillRect(vx, vy, vw, vh);
    miniCtx.strokeStyle = "#e94f37";
    miniCtx.lineWidth = 2;
    miniCtx.strokeRect(vx, vy, vw, vh);
  }

  function render() {
    renderQueued = false;
    if (!viewport.canvasSize.width || !viewport.canvasSize.height) return;

    clearCanvas();
    drawBoard();
    drawMiniMap();
  }

  return {
    scheduleRender,
    render,
  };
}
